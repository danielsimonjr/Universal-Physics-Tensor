/**
 * Experiment record for the UPT CLI — the global options `--record=FILE` and
 * `--show-record=FILE` (design: `docs/planning/Experiment-Record-Replay-Design-Note.md`).
 *
 * A record is JSON Lines, one `upt-record/1` entry per invocation, appended and
 * never rewritten, so a failed invocation stays next to the ones that
 * succeeded.
 *
 * `main.ts` passes its dispatcher and the `cli-api` barrel in, so this module
 * neither imports the barrel nor re-enters the global-option parser.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, openSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type * as cliApi from '../cli-api.js';
import * as coreConstants from '../core/constants.js';
import { parseArgs } from './args.js';
import { resolveCommand } from './command.js';
import { CliError } from './errors.js';
import { emitJson } from './output.js';
import { packageVersion } from './version.js';

export type Io = {
  out: (line?: string) => void;
  err: (line?: string) => void;
  write: (s: string) => void;
};

export type Dispatch = (argv: string[], io: Io) => Promise<number>;

export const RECORD_SCHEMA = 'upt-record/1';

export interface RecordEnvironment {
  uptVersion: string;
  node: string;
  formulaParser: string;
  simplifier: boolean;
  peers: Record<string, string | null>;
  constants: Record<string, number>;
  constantsSha256: string;
}

export interface RecordResult {
  exitCode: number | null;
  threw: string | null;
  stdout: string;
  stderr: string;
  stdoutSha256: string;
  stderrSha256: string;
}

export interface RecordEntry {
  schema: typeof RECORD_SCHEMA;
  recordedAt: string;
  argv: string[];
  parsed: { command: string; flags: Record<string, string[]>; positionals: string[] } | null;
  environment: RecordEnvironment;
  result: RecordResult;
  artifacts: { path: string; sha256: string }[];
}

export const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

/** Flat numeric table, serialised with sorted keys so the fingerprint does not depend on export order. */
function canonicalJson(table: Record<string, number>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(table).sort().map((k) => [k, table[k]])));
}

export function constantsTable(): Record<string, number> {
  const table: Record<string, number> = {};
  for (const [k, v] of Object.entries(coreConstants)) if (typeof v === 'number') table[k] = v;
  return table;
}

export const constantsFingerprint = (table: Record<string, number>): string => sha256(canonicalJson(table));

/** Installed version of each optional peer the package declares, `null` when absent. Reads the
 * peer's own package.json from the resolution paths, because a peer's `exports` may not expose it. */
function peerVersions(): Record<string, string | null> {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    peerDependencies?: Record<string, string>;
  };
  const require = createRequire(import.meta.url);
  const peers: Record<string, string | null> = {};
  for (const name of Object.keys(pkg.peerDependencies ?? {}).sort()) {
    peers[name] = null;
    for (const dir of require.resolve.paths(name) ?? []) {
      const manifest = join(dir, name, 'package.json');
      if (existsSync(manifest)) {
        peers[name] = (JSON.parse(readFileSync(manifest, 'utf8')) as { version?: string }).version ?? null;
        break;
      }
    }
  }
  return peers;
}

export async function captureEnvironment(api: typeof cliApi): Promise<RecordEnvironment> {
  const constants = constantsTable();
  return {
    uptVersion: packageVersion(),
    node: process.version,
    formulaParser: await api.getFormulaParserKind(),
    simplifier: await api.isSimplifierAvailable(),
    peers: peerVersions(),
    constants,
    constantsSha256: constantsFingerprint(constants),
  };
}

function parseInvocation(argv: string[]): RecordEntry['parsed'] {
  const [cmd, ...rest] = argv;
  const command = cmd === undefined ? undefined : resolveCommand(cmd);
  if (!command) return null;
  try {
    const { flags, positionals } = parseArgs(command.name, rest, command.flags);
    return { command: command.name, flags: Object.fromEntries(flags), positionals };
  } catch {
    return null;
  }
}

async function runCaptured(
  dispatch: Dispatch,
  argv: string[],
  tee?: Io,
): Promise<{ exitCode: number | null; threw: string | null; stdout: string; stderr: string; error?: unknown }> {
  let stdout = '';
  let stderr = '';
  const io: Io = {
    out: (line) => {
      stdout += (line ?? '') + '\n';
      tee?.out(line);
    },
    err: (line) => {
      stderr += (line ?? '') + '\n';
      tee?.err(line);
    },
    write: (s) => {
      stdout += s;
      tee?.write(s);
    },
  };
  try {
    return { exitCode: await dispatch(argv, io), threw: null, stdout, stderr };
  } catch (e) {
    return { exitCode: null, threw: e instanceof Error ? e.message : String(e), stdout, stderr, error: e };
  }
}

function assertAppendable(file: string): void {
  try {
    closeSync(openSync(file, 'a'));
  } catch (e) {
    throw new CliError(`upt: cannot append to record '${file}': ${(e as Error).message}`);
  }
}

/** Run `argv` exactly as without `--record`, then append its entry. An unexpected exception is
 * recorded and rethrown, so recording never changes what the caller sees. */
export async function recordInvocation(
  file: string,
  argv: string[],
  dispatch: Dispatch,
  io: Io,
  api: typeof cliApi,
): Promise<number> {
  assertAppendable(file);
  const recordedAt = new Date().toISOString();
  const run = await runCaptured(dispatch, argv, io);
  const parsed = parseInvocation(argv);
  const artifacts: RecordEntry['artifacts'] = [];
  const outPath = parsed?.flags.out?.[0] ?? '';
  if (outPath !== '' && existsSync(outPath)) artifacts.push({ path: outPath, sha256: sha256(readFileSync(outPath)) });
  const entry: RecordEntry = {
    schema: RECORD_SCHEMA,
    recordedAt,
    argv,
    parsed,
    environment: await captureEnvironment(api),
    result: {
      exitCode: run.exitCode,
      threw: run.threw,
      stdout: run.stdout,
      stderr: run.stderr,
      stdoutSha256: sha256(run.stdout),
      stderrSha256: sha256(run.stderr),
    },
    artifacts,
  };
  appendFileSync(file, JSON.stringify(entry) + '\n');
  if (run.error !== undefined) throw run.error;
  return run.exitCode as number;
}

type Line = { line: number; entry: RecordEntry } | { line: number; error: string };

function isEntry(v: unknown): v is RecordEntry {
  const e = v as RecordEntry;
  return (
    typeof e === 'object' &&
    e !== null &&
    e.schema === RECORD_SCHEMA &&
    Array.isArray(e.argv) &&
    e.argv.every((a) => typeof a === 'string') &&
    typeof e.environment === 'object' &&
    e.environment !== null &&
    typeof e.result === 'object' &&
    e.result !== null &&
    typeof e.result.stdout === 'string' &&
    typeof e.result.stderr === 'string' &&
    (typeof e.result.exitCode === 'number' || e.result.exitCode === null)
  );
}

function readRecord(file: string): Line[] {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    throw new CliError(`upt: cannot read record '${file}': ${(e as Error).message}`);
  }
  const lines: Line[] = [];
  text.split('\n').forEach((raw, i) => {
    if (raw.trim() === '') return;
    let v: unknown;
    try {
      v = JSON.parse(raw);
    } catch {
      lines.push({ line: i + 1, error: `line ${i + 1} is not valid JSON` });
      return;
    }
    if (isEntry(v)) lines.push({ line: i + 1, entry: v });
    else lines.push({ line: i + 1, error: `line ${i + 1} is not a ${RECORD_SCHEMA} entry` });
  });
  if (lines.length === 0) throw new CliError(`upt: record '${file}' holds no entries`);
  return lines;
}

const SAFE_TOKEN = /^[A-Za-z0-9_\-=.,:/+@%]+$/;
const shellQuote = (t: string): string => (SAFE_TOKEN.test(t) ? t : `'${t.replace(/'/g, `'\\''`)}'`);
const commandLine = (argv: string[]): string => ['$ upt', ...argv.map(shellQuote)].join(' ');

const exitLabel = (code: number | null, threw: string | null): string =>
  code === null ? `threw: ${threw ?? 'unknown error'}` : `exit ${code}`;

function describeEnvironment(env: Partial<RecordEnvironment>): string {
  const peers = Object.entries(env.peers ?? {})
    .map(([k, v]) => `${k} ${v ?? 'absent'}`)
    .join(', ');
  return (
    `upt ${env.uptVersion}, node ${env.node}, formula parser ${env.formulaParser}, ` +
    `simplifier ${env.simplifier ? 'available' : 'unavailable'}, constants sha256 ${String(env.constantsSha256).slice(0, 12)}…` +
    (peers ? `\n  peers: ${peers}` : '')
  );
}

export function showRecord(file: string, json: boolean, io: Io): number {
  const lines = readRecord(file);
  if (json) {
    emitJson(
      {
        command: 'show-record',
        options: { file },
        result: lines.map((l) => ('error' in l ? { line: l.line, error: l.error } : { line: l.line, ...l.entry })),
      },
      io.write,
    );
    return 0;
  }
  const { out } = io;
  const block = (text: string, mark: string): void => {
    if (text !== '') for (const s of text.replace(/\n$/, '').split('\n')) out(`    ${mark} ${s}`);
  };
  out(`upt record — ${file}: ${lines.length} ${lines.length === 1 ? 'entry' : 'entries'}`);
  let lastEnv = '';
  for (const l of lines) {
    if ('error' in l) {
      out(`[line ${l.line}] unreadable: ${l.error}`);
      continue;
    }
    const { entry } = l;
    const env = JSON.stringify(entry.environment);
    if (env !== lastEnv) {
      out(`environment: ${describeEnvironment(entry.environment)}`);
      lastEnv = env;
    }
    out(`[line ${l.line}] ${commandLine(entry.argv)}   (${exitLabel(entry.result.exitCode, entry.result.threw ?? null)}; recorded ${entry.recordedAt})`);
    block(entry.result.stdout, '|');
    block(entry.result.stderr, '!');
    for (const a of entry.artifacts ?? []) out(`    wrote ${a.path} (sha256 ${a.sha256})`);
  }
  return 0;
}
