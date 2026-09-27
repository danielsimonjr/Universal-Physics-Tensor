/**
 * Experiment record and replay for the UPT CLI — the global options
 * `--record=FILE`, `--replay=FILE` and `--show-record=FILE`
 * (design: `docs/planning/Experiment-Record-Replay-Design-Note.md`).
 *
 * A record is JSON Lines, one `upt-record/1` entry per invocation, appended and
 * never rewritten, so a failed invocation stays next to the ones that
 * succeeded. Replay re-runs each entry in-process and keeps three outcomes
 * apart — reproduced, differs, not replayable — and reports environment
 * changes and record-integrity findings beside them, never folded into them.
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

const TIMED_PROBE_SUBVERBS = new Set(['run', 'candidates', 'falsify', 'rank', 'design', 'reproduce']);

/** Why an invocation must not be re-run, or null. Declared by rule, never inferred from a mismatch. */
function notReplayableReason(argv: string[]): string | null {
  const parsed = parseInvocation(argv);
  if (!parsed) return null;
  if ((parsed.flags.out?.[0] ?? '') !== '') {
    return `it wrote a file (--out=${parsed.flags.out[0]}); replaying would overwrite it — its recorded artifact hash stays in the record`;
  }
  if (parsed.command === 'probe' && TIMED_PROBE_SUBVERBS.has(parsed.positionals[0] ?? '')) {
    return `probe ${parsed.positionals[0]} searches under a wall-clock budget and reads files the record does not capture; use \`upt probe reproduce\``;
  }
  return null;
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

export interface EnvironmentChange {
  fact: string;
  recorded: unknown;
  current: unknown;
}

function environmentChanges(recorded: Partial<RecordEnvironment>, live: RecordEnvironment): EnvironmentChange[] {
  const changes: EnvironmentChange[] = [];
  const cmp = (fact: string, a: unknown, b: unknown): void => {
    if (a !== b) changes.push({ fact, recorded: a ?? null, current: b ?? null });
  };
  cmp('uptVersion', recorded.uptVersion, live.uptVersion);
  cmp('node', recorded.node, live.node);
  cmp('formulaParser', recorded.formulaParser, live.formulaParser);
  cmp('simplifier', recorded.simplifier, live.simplifier);
  const recPeers = recorded.peers ?? {};
  for (const k of [...new Set([...Object.keys(recPeers), ...Object.keys(live.peers)])].sort()) {
    cmp(`peer ${k}`, recPeers[k], live.peers[k]);
  }
  const recConstants = recorded.constants ?? {};
  for (const k of [...new Set([...Object.keys(recConstants), ...Object.keys(live.constants)])].sort()) {
    cmp(`constant ${k}`, recConstants[k], live.constants[k]);
  }
  cmp('constantsSha256', recorded.constantsSha256, live.constantsSha256);
  return changes;
}

function integrityFindings(entry: RecordEntry): string[] {
  const findings: string[] = [];
  const r = entry.result;
  if (sha256(r.stdout) !== r.stdoutSha256) findings.push('recorded stdout does not match its recorded stdoutSha256');
  if (sha256(r.stderr) !== r.stderrSha256) findings.push('recorded stderr does not match its recorded stderrSha256');
  const table = entry.environment.constants;
  if (typeof table !== 'object' || table === null || constantsFingerprint(table) !== entry.environment.constantsSha256) {
    findings.push('recorded constants table does not match its recorded constantsSha256');
  }
  return findings;
}

const clip = (s: string): string => (s.length > 200 ? s.slice(0, 200) + '…' : s);

export interface StreamDifference {
  stream: 'exit' | 'stdout' | 'stderr';
  firstDifferingLine?: number;
  recorded: string;
  replayed: string;
  recordedSha256?: string;
  replayedSha256?: string;
}

function streamDifference(stream: 'stdout' | 'stderr', recorded: string, replayed: string): StreamDifference | null {
  if (recorded === replayed) return null;
  const a = recorded.split('\n');
  const b = replayed.split('\n');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return {
    stream,
    firstDifferingLine: i + 1,
    recorded: i < a.length ? clip(a[i]) : '<end of output>',
    replayed: i < b.length ? clip(b[i]) : '<end of output>',
    recordedSha256: sha256(recorded),
    replayedSha256: sha256(replayed),
  };
}

const exitLabel = (code: number | null, threw: string | null): string =>
  code === null ? `threw: ${threw ?? 'unknown error'}` : `exit ${code}`;

export type ReplayOutcome = 'reproduced' | 'differs' | 'not-replayable';

export interface ReplayEntryReport {
  line: number;
  argv: string[] | null;
  outcome: ReplayOutcome;
  reason?: string;
  exit?: { recorded: string; replayed: string };
  differences: StreamDifference[];
  environmentChanges: EnvironmentChange[];
  integrity: string[];
}

export async function replayRecord(
  file: string,
  json: boolean,
  dispatch: Dispatch,
  io: Io,
  api: typeof cliApi,
): Promise<number> {
  const lines = readRecord(file);
  const live = await captureEnvironment(api);
  const reports: ReplayEntryReport[] = [];
  for (const l of lines) {
    if ('error' in l) {
      reports.push({ line: l.line, argv: null, outcome: 'not-replayable', reason: l.error, differences: [], environmentChanges: [], integrity: [] });
      continue;
    }
    const { entry } = l;
    const base = {
      line: l.line,
      argv: entry.argv,
      environmentChanges: environmentChanges(entry.environment, live),
      integrity: integrityFindings(entry),
    };
    const reason = notReplayableReason(entry.argv);
    if (reason) {
      reports.push({ ...base, outcome: 'not-replayable', reason, differences: [] });
      continue;
    }
    const run = await runCaptured(dispatch, entry.argv);
    const recordedExit = exitLabel(entry.result.exitCode, entry.result.threw ?? null);
    const replayedExit = exitLabel(run.exitCode, run.threw);
    const differences: StreamDifference[] = [];
    if (recordedExit !== replayedExit) differences.push({ stream: 'exit', recorded: recordedExit, replayed: replayedExit });
    for (const d of [
      streamDifference('stdout', entry.result.stdout, run.stdout),
      streamDifference('stderr', entry.result.stderr, run.stderr),
    ]) {
      if (d) differences.push(d);
    }
    reports.push({
      ...base,
      outcome: differences.length === 0 ? 'reproduced' : 'differs',
      exit: { recorded: recordedExit, replayed: replayedExit },
      differences,
    });
  }

  const count = (o: ReplayOutcome): number => reports.filter((r) => r.outcome === o).length;
  const summary = {
    entries: reports.length,
    reproduced: count('reproduced'),
    differs: count('differs'),
    notReplayable: count('not-replayable'),
    environmentChanged: reports.filter((r) => r.environmentChanges.length > 0).length,
    integrityFindings: reports.reduce((n, r) => n + r.integrity.length, 0),
  };
  const status =
    summary.differs > 0 ? 3 : summary.notReplayable + summary.environmentChanged + summary.integrityFindings > 0 ? 1 : 0;

  if (json) {
    emitJson({ command: 'replay', options: { file }, result: { environment: live, entries: reports, summary } }, io.write);
    return status;
  }

  const { out } = io;
  out(`upt replay — ${file}: ${reports.length} ${reports.length === 1 ? 'entry' : 'entries'}`);
  out(`environment now: ${describeEnvironment(live)}`);
  for (const r of reports) {
    out(`[line ${r.line}] ${r.argv ? commandLine(r.argv) : '(unreadable)'}`);
    if (r.outcome === 'not-replayable') {
      out(`    NOT REPLAYABLE — ${r.reason}`);
    } else if (r.outcome === 'reproduced') {
      out(`    reproduced — ${r.exit!.replayed}, stdout and stderr identical`);
    } else {
      out(`    DIFFERS — ${r.differences.map((d) => d.stream).join(', ')}`);
      for (const d of r.differences) {
        if (d.stream === 'exit') {
          out(`      exit: recorded ${d.recorded}, replayed ${d.replayed}`);
        } else {
          out(`      ${d.stream}: first difference at line ${d.firstDifferingLine}`);
          out(`        recorded: ${d.recorded}`);
          out(`        replayed: ${d.replayed}`);
        }
      }
    }
    if (r.environmentChanges.length > 0) {
      out('    environment changed since recording:');
      for (const c of r.environmentChanges) out(`      ${c.fact}: ${JSON.stringify(c.recorded)} -> ${JSON.stringify(c.current)}`);
    }
    for (const f of r.integrity) out(`    record integrity: ${f} (the record was edited after it was written)`);
  }
  out(
    `summary: ${summary.reproduced} reproduced, ${summary.differs} differ, ${summary.notReplayable} not replayable; ` +
      `environment changed for ${summary.environmentChanged} of ${summary.entries}; ` +
      `${summary.integrityFindings} integrity finding${summary.integrityFindings === 1 ? '' : 's'}`,
  );
  return status;
}

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
