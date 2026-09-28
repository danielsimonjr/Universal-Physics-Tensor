/**
 * Experiment record and replay for the UPT CLI — the global options
 * `--record=FILE`, `--replay=FILE` and `--show-record=FILE`
 * (design: `docs/planning/Experiment-Record-Replay-Design-Note.md`).
 *
 * A record is JSON Lines, one `upt-record/2` entry per invocation, appended and
 * never rewritten, so a failed invocation stays next to the ones that
 * succeeded. Replay re-runs each entry in-process and keeps three outcomes
 * apart — reproduced, differs, not replayable — and reports environment
 * changes and record-integrity findings beside them, never folded into them.
 *
 * `main.ts` passes its dispatcher and the `cli-api` barrel in, so this module
 * neither imports the barrel nor re-enters the global-option parser.
 */

import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type * as cliApi from '../cli-api.js';
import { parseArgs } from './args.js';
import { resolveCommand } from './command.js';
import { storedResultsFile } from './commands/_atlas-map.js';
import { CliError } from './errors.js';
import { emitJson } from './output.js';
import { moduleSources, staticReach, type Attribution } from './record-reach.js';
import { constantTables, tableFingerprint, type ConstantTable } from './record-tables.js';
import { packageVersion, peerVersions } from './version.js';

export type Io = {
  out: (line?: string) => void;
  err: (line?: string) => void;
  write: (s: string) => void;
};

export type Dispatch = (argv: string[], io: Io) => Promise<number>;

export const RECORD_SCHEMA = 'upt-record/2';
const SUPERSEDED_SCHEMA = 'upt-record/1';

export interface RecordEnvironment {
  uptVersion: string;
  node: string;
  formulaParser: string;
  simplifier: boolean;
  peers: Record<string, string | null>;
  constantTables: Record<string, ConstantTable>;
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
  argvSha256: string;
  parsed: { command: string; flags: Record<string, string[]>; positionals: string[] } | null;
  attribution: Attribution | null;
  environment: RecordEnvironment;
  result: RecordResult;
  artifacts: { path: string; sha256: string }[];
  /**
   * Files the invocation read, hashed before it ran (`null`: absent or unreadable then). Absent
   * from entries written before input files were hashed.
   */
  inputs?: RecordInput[];
  /** SHA-256 of every other field, serialised by {@link canonicalJson}. */
  entrySha256: string;
}

export interface RecordInput {
  /** The flag that named the file, or `--problem observationsPath` for the file a problem names. */
  flag: string;
  path: string;
  sha256: string | null;
}

export const sha256 = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

/** JSON with object keys sorted at every depth, so a hash does not depend on key order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

export const argvFingerprint = (argv: unknown): string => sha256(canonicalJson(argv));

export function entryFingerprint(entry: Partial<RecordEntry>): string {
  const { entrySha256: _, ...rest } = entry;
  return sha256(canonicalJson(rest));
}


export async function captureEnvironment(api: typeof cliApi): Promise<RecordEnvironment> {
  return {
    uptVersion: packageVersion(),
    node: process.version,
    formulaParser: await api.getFormulaParserKind(),
    simplifier: await api.isSimplifierAvailable(),
    peers: peerVersions(),
    constantTables: (await constantTables()).tables,
  };
}

async function attribute(argv: string[]): Promise<Attribution | null> {
  const command = argv[0] === undefined ? undefined : resolveCommand(argv[0]);
  if (!command) return null;
  const { tables, kinds } = await constantTables();
  const reach = staticReach(command.name, tables, kinds);
  return reach && { ...reach, modules: moduleSources(command.name) ?? {} };
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

/** The `probe` flags that name a file the invocation reads. */
const PROBE_INPUT_FLAGS = ['problem', 'h1', 'h2', 'bounds', 'data', 'replication'] as const;

/** The stop reason a probe search reports when its wall-clock budget ran out, in text or JSON. */
const TIME_LIMIT_STATED = /(?:\bstop: |"stopReason": ")time-limit\b/;

function hashFile(path: string): string | null {
  try {
    return sha256(readFileSync(path));
  } catch {
    return null;
  }
}

/** The observations file a problem file names, or null (also when the problem cannot be read). */
function observationsOf(problem: string, api: typeof cliApi): string | null {
  try {
    const raw = JSON.parse(readFileSync(problem, 'utf8')) as { observationsPath?: unknown } | null;
    return raw !== null && typeof raw.observationsPath === 'string'
      ? api.resolveObservationsPath({ observationsPath: raw.observationsPath }, problem)
      : null;
  } catch {
    return null;
  }
}

/** The files an invocation reads, by rule from its parsed arguments; hashed as they are now. */
function readInputs(parsed: RecordEntry['parsed'], api: typeof cliApi): RecordInput[] {
  if (!parsed) return [];
  const files: { flag: string; path: string }[] = [];
  if (parsed.command === 'probe') {
    for (const name of PROBE_INPUT_FLAGS) {
      const path = parsed.flags[name]?.[0] ?? '';
      if (path === '') continue;
      files.push({ flag: `--${name}`, path });
      const observations = name === 'problem' ? observationsOf(path, api) : null;
      if (observations !== null) files.push({ flag: '--problem observationsPath', path: observations });
    }
  }
  if ((parsed.command === 'atlas' || parsed.command === 'map') && parsed.flags.stored !== undefined) {
    files.push({ flag: '--stored', path: storedResultsFile() });
  }
  return files.map((f) => ({ ...f, sha256: hashFile(f.path) }));
}

const short = (h: string): string => `${h.slice(0, 12)}…`;

/**
 * Why an entry must not be re-run, or null. Declared by rule from the record and the files as
 * they are now, never inferred from a mismatch of the outputs.
 */
function notReplayableReason(entry: RecordEntry, api: typeof cliApi): string | null {
  const parsed = parseInvocation(entry.argv);
  if (!parsed) return null;
  const out = parsed.flags.out?.[0] ?? '';
  if (out !== '' && (entry.artifacts ?? []).length === 0) {
    return `it was to write a file (--out=${out}) and wrote no file, so there is no artifact to compare a replay with`;
  }
  const worker = parsed.flags.worker?.[0] ?? '';
  if (parsed.command === 'probe' && worker !== '') {
    return `it ran an external worker (--worker=${worker}), whose output the record does not capture`;
  }
  const reads = entry.inputs;
  if (!Array.isArray(reads)) {
    const names = readInputs(parsed, api);
    if (names.length > 0) {
      return `it reads ${names.map((n) => `${n.path} (${n.flag})`).join(', ')} and was recorded before input files were hashed; record it again`;
    }
  } else {
    const changed: string[] = [];
    for (const i of reads) {
      const now = hashFile(i.path);
      if (now === i.sha256) continue;
      if (now === null) changed.push(`${i.path} (${i.flag}) is missing now`);
      else if (i.sha256 === null) changed.push(`${i.path} (${i.flag}) exists now and was absent at recording`);
      else changed.push(`${i.path} (${i.flag}) changed since recording (sha256 ${short(i.sha256)} -> ${short(now)})`);
    }
    if (changed.length > 0) return `an input it read differs from the recorded one: ${changed.join('; ')}`;
  }
  if (parsed.command === 'probe' && TIME_LIMIT_STATED.test(entry.result.stdout)) {
    return 'the recorded run stopped on its wall-clock budget (time-limit), so what it searched depends on the speed of the machine';
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
  const parsed = parseInvocation(argv);
  const inputs = readInputs(parsed, api);
  const run = await runCaptured(dispatch, argv, io);
  const artifacts: RecordEntry['artifacts'] = [];
  const outPath = parsed?.flags.out?.[0] ?? '';
  if (outPath !== '' && existsSync(outPath)) artifacts.push({ path: outPath, sha256: sha256(readFileSync(outPath)) });
  const entry: Omit<RecordEntry, 'entrySha256'> = {
    schema: RECORD_SCHEMA,
    recordedAt,
    argv,
    argvSha256: argvFingerprint(argv),
    parsed,
    attribution: await attribute(argv),
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
    inputs,
  };
  appendFileSync(file, JSON.stringify({ ...entry, entrySha256: entryFingerprint(entry) }) + '\n');
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
    else if ((v as { schema?: unknown } | null)?.schema === SUPERSEDED_SCHEMA) {
      lines.push({
        line: i + 1,
        error: `line ${i + 1} is a ${SUPERSEDED_SCHEMA} entry, written before its arguments, the entry and each constant table were hashed; record it again`,
      });
    } else lines.push({ line: i + 1, error: `line ${i + 1} is not a ${RECORD_SCHEMA} entry` });
  });
  if (lines.length === 0) throw new CliError(`upt: record '${file}' holds no entries`);
  return lines;
}

const SAFE_TOKEN = /^[A-Za-z0-9_\-=.,:/+@%]+$/;
const shellQuote = (t: string): string => (SAFE_TOKEN.test(t) ? t : `'${t.replace(/'/g, `'\\''`)}'`);
const commandLine = (argv: string[]): string => ['$ upt', ...argv.map(shellQuote)].join(' ');

/**
 * Whether the recorded command's code could read a changed constant, by the entry's static
 * attribution: an upper bound derived from the import graph at recording, not an observed read.
 */
export type Reach = 'reachable' | 'not-reachable' | 'unattributed';

export interface EnvironmentChange {
  fact: string;
  recorded: unknown;
  current: unknown;
  reach?: Reach;
}

function reachOf(attribution: Attribution | null | undefined, table: string, key?: string): Reach {
  if (!attribution || typeof attribution.tables !== 'object' || attribution.tables === null) return 'unattributed';
  const keys = attribution.tables[table];
  if (!Array.isArray(keys)) return 'not-reachable';
  return key === undefined || keys.includes('*') || keys.includes(key) ? 'reachable' : 'not-reachable';
}

function environmentChanges(
  recorded: Partial<RecordEnvironment>,
  live: RecordEnvironment,
  attribution: Attribution | null | undefined,
): EnvironmentChange[] {
  const changes: EnvironmentChange[] = [];
  const cmp = (fact: string, a: unknown, b: unknown, reach?: Reach): void => {
    if (a !== b) changes.push({ fact, recorded: a ?? null, current: b ?? null, ...(reach ? { reach } : {}) });
  };
  cmp('uptVersion', recorded.uptVersion, live.uptVersion);
  cmp('node', recorded.node, live.node);
  cmp('formulaParser', recorded.formulaParser, live.formulaParser);
  cmp('simplifier', recorded.simplifier, live.simplifier);
  const recPeers = recorded.peers ?? {};
  for (const k of [...new Set([...Object.keys(recPeers), ...Object.keys(live.peers)])].sort()) {
    cmp(`peer ${k}`, recPeers[k], live.peers[k]);
  }
  const recTables = (typeof recorded.constantTables === 'object' && recorded.constantTables) || {};
  for (const name of [...new Set([...Object.keys(recTables), ...Object.keys(live.constantTables)])].sort()) {
    const a = recTables[name];
    const b = live.constantTables[name];
    if (!a || !b) {
      cmp(`table ${name}`, a ? 'present' : null, b ? 'present' : null, reachOf(attribution, name));
      continue;
    }
    const av = (typeof a.values === 'object' && a.values) || {};
    const changedReach: Reach[] = [];
    for (const k of [...new Set([...Object.keys(av), ...Object.keys(b.values)])].sort()) {
      if (av[k] === b.values[k]) continue;
      changedReach.push(reachOf(attribution, name, k));
      cmp(`constant ${name} ${k}`, av[k], b.values[k], changedReach[changedReach.length - 1]);
    }
    // A fingerprint change is reachable when a changed value is; with no changed value it is the table's.
    const tableReach =
      changedReach.length === 0 ? reachOf(attribution, name) : changedReach.includes('reachable') ? 'reachable' : changedReach[0];
    cmp(`table ${name} sha256`, a.sha256, b.sha256, tableReach);
  }
  return changes;
}

function integrityFindings(entry: RecordEntry): string[] {
  const findings: string[] = [];
  const hashOf = (field: string, recordedHash: unknown, actual: string): void => {
    if (typeof recordedHash !== 'string') findings.push(`entry has no ${field}`);
    else if (recordedHash !== actual) findings.push(`recorded ${field.replace(/Sha256$/, '')} does not match its recorded ${field}`);
  };
  hashOf('argvSha256', entry.argvSha256, argvFingerprint(entry.argv));
  const r = entry.result;
  if (sha256(r.stdout) !== r.stdoutSha256) findings.push('recorded stdout does not match its recorded stdoutSha256');
  if (sha256(r.stderr) !== r.stderrSha256) findings.push('recorded stderr does not match its recorded stderrSha256');
  const tables = entry.environment.constantTables;
  if (typeof tables !== 'object' || tables === null) findings.push('entry has no constantTables');
  else {
    for (const [name, t] of Object.entries(tables)) {
      const values = (t as Partial<ConstantTable> | null)?.values;
      if (typeof values !== 'object' || values === null || tableFingerprint(values) !== t.sha256) {
        findings.push(`recorded table ${name} does not match its recorded sha256`);
      }
    }
  }
  hashOf('entrySha256', entry.entrySha256, entryFingerprint(entry));
  return findings;
}

const clip = (s: string): string => (s.length > 200 ? s.slice(0, 200) + '…' : s);

export interface StreamDifference {
  stream: 'exit' | 'stdout' | 'stderr' | 'artifact';
  /** The recorded path of a written file (`artifact` only). */
  path?: string;
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
  /** Each file the entry wrote: its recorded hash and the hash of the replay's temporary copy. */
  artifacts?: { path: string; recorded: string; replayed: string | null }[];
  attribution: Attribution | null;
  /** Whether the sources of the modules the command loads were compared (entries with a command). */
  moduleSources?: 'compared' | 'not-recorded';
  environmentChanges: EnvironmentChange[];
  integrity: string[];
}

/** Each module the command loads whose source hash differs from the recorded one. */
function moduleChanges(attribution: Attribution | null | undefined): {
  changes: EnvironmentChange[];
  moduleSources?: 'compared' | 'not-recorded';
} {
  if (!attribution || typeof attribution.command !== 'string') return { changes: [] };
  const recorded = attribution.modules;
  if (typeof recorded !== 'object' || recorded === null) return { changes: [], moduleSources: 'not-recorded' };
  const live = moduleSources(attribution.command) ?? {};
  const changes: EnvironmentChange[] = [];
  for (const name of [...new Set([...Object.keys(recorded), ...Object.keys(live)])].sort()) {
    if (recorded[name] !== live[name]) {
      changes.push({ fact: `module ${name}`, recorded: recorded[name] ?? null, current: live[name] ?? null, reach: 'reachable' });
    }
  }
  return { changes, moduleSources: 'compared' };
}

/**
 * Re-run an entry that wrote a file with `--out` pointed at a temporary path instead, so the
 * recorded path is never overwritten; the temporary path is written back as the recorded one in
 * the replayed streams, and the file is returned by hash.
 */
async function runRedirected(
  dispatch: Dispatch,
  entry: RecordEntry,
): Promise<{ run: Awaited<ReturnType<typeof runCaptured>>; artifact: { path: string; recorded: string; replayed: string | null } }> {
  const recorded = entry.artifacts[0];
  const dir = mkdtempSync(join(tmpdir(), 'upt-replay-'));
  const temp = join(dir, basename(recorded.path) || 'artifact');
  try {
    const argv = entry.argv.map((t) => (t.startsWith('--out=') ? `--out=${temp}` : t));
    const run = await runCaptured(dispatch, argv);
    const back = (s: string): string => s.split(temp).join(recorded.path);
    return {
      run: { ...run, stdout: back(run.stdout), stderr: back(run.stderr), threw: run.threw === null ? null : back(run.threw) },
      artifact: { path: recorded.path, recorded: recorded.sha256, replayed: hashFile(temp) },
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
      reports.push({
        line: l.line,
        argv: null,
        outcome: 'not-replayable',
        reason: l.error,
        differences: [],
        attribution: null,
        environmentChanges: [],
        integrity: [],
      });
      continue;
    }
    const { entry } = l;
    const modules = moduleChanges(entry.attribution);
    const base = {
      line: l.line,
      argv: entry.argv,
      attribution: entry.attribution ?? null,
      ...(modules.moduleSources ? { moduleSources: modules.moduleSources } : {}),
      environmentChanges: [...environmentChanges(entry.environment, live, entry.attribution), ...modules.changes],
      integrity: integrityFindings(entry),
    };
    const reason = notReplayableReason(entry, api);
    if (reason) {
      reports.push({ ...base, outcome: 'not-replayable', reason, differences: [] });
      continue;
    }
    const writes = (entry.artifacts ?? []).length > 0 && (parseInvocation(entry.argv)?.flags.out?.[0] ?? '') !== '';
    const { run, artifact } = writes
      ? await runRedirected(dispatch, entry)
      : { run: await runCaptured(dispatch, entry.argv), artifact: null };
    if (parseInvocation(entry.argv)?.command === 'probe' && TIME_LIMIT_STATED.test(run.stdout)) {
      reports.push({
        ...base,
        outcome: 'not-replayable',
        reason:
          'the replay stopped on its wall-clock budget (time-limit) and the recorded run did not, so the two ran ' +
          'different searches; nothing was compared',
        differences: [],
      });
      continue;
    }
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
    if (artifact && artifact.recorded !== artifact.replayed) {
      differences.push({ stream: 'artifact', path: artifact.path, recorded: artifact.recorded, replayed: artifact.replayed ?? '<no file>' });
    }
    reports.push({
      ...base,
      outcome: differences.length === 0 ? 'reproduced' : 'differs',
      exit: { recorded: recordedExit, replayed: replayedExit },
      differences,
      ...(artifact ? { artifacts: [artifact] } : {}),
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
      out(
        `    reproduced — ${r.exit!.replayed}, stdout and stderr identical` +
          (r.artifacts ? `, and the file it wrote (written to a temporary path, not over ${r.artifacts[0].path})` : ''),
      );
    } else {
      out(`    DIFFERS — ${r.differences.map((d) => d.stream).join(', ')}`);
      for (const d of r.differences) {
        if (d.stream === 'exit') {
          out(`      exit: recorded ${d.recorded}, replayed ${d.replayed}`);
        } else if (d.stream === 'artifact') {
          out(`      artifact ${d.path}: recorded sha256 ${d.recorded}, replayed ${d.replayed} (written to a temporary path)`);
        } else {
          out(`      ${d.stream}: first difference at line ${d.firstDifferingLine}`);
          out(`        recorded: ${d.recorded}`);
          out(`        replayed: ${d.replayed}`);
        }
      }
    }
    if (r.environmentChanges.length > 0) {
      out('    environment changed since recording:');
      for (const c of r.environmentChanges) {
        out(`      ${c.fact}: ${JSON.stringify(c.recorded)} -> ${JSON.stringify(c.current)}${reachNote(c.reach, r.attribution?.command)}`);
      }
    }
    if (r.moduleSources === 'not-recorded') {
      out('    module sources: not recorded in this entry, so a changed literal a module keeps private would go unseen');
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

function reachNote(reach: Reach | undefined, command: string | undefined): string {
  if (reach === 'reachable') return ` — reachable from '${command}' (static upper bound, not an observed read)`;
  if (reach === 'not-reachable') return ` — not reachable from '${command}' by static import analysis`;
  if (reach === 'unattributed') return ' — no attribution (the entry ran no command module)';
  return '';
}

function describeEnvironment(env: Partial<RecordEnvironment>): string {
  const peers = Object.entries(env.peers ?? {})
    .map(([k, v]) => `${k} ${v ?? 'absent'}`)
    .join(', ');
  const tables = (typeof env.constantTables === 'object' && env.constantTables) || {};
  const combined = sha256(canonicalJson(Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, t?.sha256]))));
  return (
    `upt ${env.uptVersion}, node ${env.node}, formula parser ${env.formulaParser}, ` +
    `simplifier ${env.simplifier ? 'available' : 'unavailable'}, ` +
    `${Object.keys(tables).length} constant tables (sha256 of their fingerprints ${combined.slice(0, 12)}…)` +
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
    for (const i of entry.inputs ?? []) out(`    read ${i.path} (${i.flag}; ${i.sha256 === null ? 'absent' : `sha256 ${i.sha256}`})`);
    for (const a of entry.artifacts ?? []) out(`    wrote ${a.path} (sha256 ${a.sha256})`);
  }
  return 0;
}
