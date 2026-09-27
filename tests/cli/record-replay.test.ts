/**
 * `upt --record=FILE` / `--show-record=FILE` / `--replay=FILE` (audit I17): a session record that
 * keeps failures, and a replay that says which entries reproduce.
 *
 * The audit needed an external wrapper to keep its invocations, outputs, errors and hashes, and a
 * record that dropped the failed `ln` and the invalid input would present a cleaner history than
 * the one that happened. Replay keeps reproduced, differs and not-replayable apart, and names
 * environment changes and edits to the record beside them. Design:
 * `docs/planning/Experiment-Record-Replay-Design-Note.md`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const o = { stdout: '', stderr: '' };
  const io = {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  };
  return { o, io };
}

async function run(argv: string[]) {
  const { o, io } = capture();
  const code = await runCli(argv, io);
  return { code, ...o };
}

const THERMAL = ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000'];
const FAILED_LN = ['eval', 'ln(x)', 'x=-1'];
const INVALID_INPUT = ['evaluate', 'be-58', 'T_K=abc', 'R_ohm=1000'];

const pkgVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const readEntries = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l));

let dir: string;
let session: string;
const plain: Awaited<ReturnType<typeof run>>[] = [];
const recorded: Awaited<ReturnType<typeof run>>[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'upt-record-'));
  session = join(dir, 'session.jsonl');
  for (const argv of [THERMAL, FAILED_LN, INVALID_INPUT]) {
    plain.push(await run(argv));
    recorded.push(await run([`--record=${session}`, ...argv]));
  }
});

describe('upt --record', () => {
  it('PRECONDITION (not a test of recording): the three invocations exit 0, 2, 1 without it', () => {
    expect(plain.map((p) => p.code)).toEqual([0, 2, 1]);
  });

  it('recording changes nothing the caller sees: same exit code, stdout and stderr', () => {
    expect(recorded).toEqual(plain);
  });

  it('keeps every invocation in order, failures included, with their streams', () => {
    const entries = readEntries(session);
    expect(entries.map((e) => e.argv)).toEqual([THERMAL, FAILED_LN, INVALID_INPUT]);
    expect(entries.map((e) => e.result.exitCode)).toEqual([0, 2, 1]);
    entries.forEach((e, i) => {
      expect(e.schema).toBe('upt-record/2');
      expect(e.result.stdout).toBe(plain[i].stdout);
      expect(e.result.stderr).toBe(plain[i].stderr);
      expect(e.result.threw).toBeNull();
    });
    expect(entries[1].result.stderr).toMatch(/finite/);
    expect(entries[2].result.stderr).toMatch(/'abc' is not a number/);
    expect(entries[0].result.stdout).toMatch(/S_V_V2_per_Hz = 1\.6567788e-17/);
  });

  it('hashes each stream (checked here by an independent SHA-256)', () => {
    for (const e of readEntries(session)) {
      expect(e.result.stdoutSha256).toBe(createHash('sha256').update(e.result.stdout).digest('hex'));
      expect(e.result.stderrSha256).toBe(createHash('sha256').update(e.result.stderr).digest('hex'));
    }
  });

  it('records the parsed arguments and the environment: version, node, parser, peers, constants', () => {
    const [e] = readEntries(session);
    expect(e.parsed).toEqual({ command: 'evaluate', flags: {}, positionals: ['be-58', 'T_K=300', 'R_ohm=1000'] });
    expect(e.environment.uptVersion).toBe(pkgVersion);
    expect(e.environment.node).toBe(process.version);
    expect(['mathts', 'builtin']).toContain(e.environment.formulaParser);
    expect(typeof e.environment.simplifier).toBe('boolean');
    expect(Object.keys(e.environment.peers)).toContain('@danielsimonjr/mathts-functions');
    expect(e.environment.constantTables['core/constants'].values.K_B_SI).toBe(1.380649e-23);
    for (const t of Object.values(e.environment.constantTables) as { values: Record<string, unknown>; sha256: string }[]) {
      const sorted = Object.fromEntries(Object.keys(t.values).sort().map((k) => [k, t.values[k]]));
      expect(t.sha256).toBe(createHash('sha256').update(JSON.stringify(sorted)).digest('hex'));
    }
  });

  it('appends: a second session in the same file keeps the first', async () => {
    const file = join(dir, 'append.jsonl');
    await run([`--record=${file}`, ...FAILED_LN]);
    await run([`--record=${file}`, 'version']);
    expect(readEntries(file).map((e) => e.argv)).toEqual([FAILED_LN, ['version']]);
  });

  it('an unwritable record fails with exit 1 BEFORE the command runs', async () => {
    const r = await run([`--record=${join(dir, 'no-such-dir', 'x.jsonl')}`, ...THERMAL]);
    expect(r.code).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toMatch(/cannot append to record/);
  });

  it('usage errors: empty FILE, repeated option, or a global option combined with another', async () => {
    const cases: [string[], RegExp][] = [
      [['--record=', ...THERMAL], /'--record' requires '--record=FILE'/],
      [[`--record=${session}`, `--record=${session}`, 'version'], /'--record' given more than once/],
      [[`--record=${session}`, `--show-record=${session}`], /use one of --record/],
      [[`--show-record=${session}`, 'version'], /'--show-record' takes no command/],
    ];
    for (const [argv, message] of cases) {
      const r = await run(argv);
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(message);
    }
  });

  it('only LEADING options are global: one after the command is the command’s, refused and recorded', async () => {
    const leading = join(dir, 'leading.jsonl');
    const trailing = join(dir, 'trailing.jsonl');
    const r = await run([`--record=${leading}`, 'evaluate', 'be-58', `--record=${trailing}`]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/unknown flag '--record' for 'evaluate'/);
    expect(existsSync(trailing)).toBe(false);
    const [entry] = readEntries(leading);
    expect(entry.argv).toEqual(['evaluate', 'be-58', `--record=${trailing}`]);
    expect(entry.result.exitCode).toBe(2);
    expect(entry.parsed).toBeNull();
  });
});

describe('upt --show-record', () => {
  it('prints a readable transcript with every invocation, failures included', async () => {
    const r = await run([`--show-record=${session}`]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('$ upt evaluate be-58 T_K=300 R_ohm=1000   (exit 0;');
    expect(r.stdout).toContain(`$ upt eval 'ln(x)' x=-1   (exit 2;`);
    expect(r.stdout).toContain('$ upt evaluate be-58 T_K=abc R_ohm=1000   (exit 1;');
    expect(r.stdout).toContain("    ! upt evaluate: be-58: 'abc' is not a number with an optional unit");
    expect(r.stdout).toMatch(new RegExp(`environment: upt ${pkgVersion.replace(/\./g, '\\.')}, node `));
    // one environment line: all three were recorded under the same configuration
    expect(r.stdout.match(/^environment: /gm)).toHaveLength(1);
  });

  it('--json emits the entries in the CLI envelope', async () => {
    const r = await run([`--show-record=${session}`, '--json']);
    const env = JSON.parse(r.stdout);
    expect(env.command).toBe('show-record');
    expect(env.result.map((e: { result: { exitCode: number } }) => e.result.exitCode)).toEqual([0, 2, 1]);
  });

  it('a missing record exits 1', async () => {
    const r = await run([`--show-record=${join(dir, 'absent.jsonl')}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/cannot read record/);
  });
});

/** Copy the session with one entry edited, as a reader who hand-edited the record would. */
function tampered(name: string, edit: (entries: any[]) => void): string {
  const entries = readEntries(session);
  edit(entries);
  const file = join(dir, name);
  writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return file;
}

async function replayJson(file: string) {
  const r = await run([`--replay=${file}`, '--json']);
  return { code: r.code, env: JSON.parse(r.stdout) };
}

describe('upt --replay', () => {
  it('an untouched record reproduces every entry, the failures included, and exits 0', async () => {
    const r = await run([`--replay=${session}`]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain(`$ upt eval 'ln(x)' x=-1\n    reproduced — exit 2, stdout and stderr identical`);
    expect(r.stdout.match(/^ {4}reproduced — /gm)).toHaveLength(3);
    expect(r.stdout).toContain(
      'summary: 3 reproduced, 0 differ, 0 not replayable; environment changed for 0 of 3; 0 integrity findings',
    );
  });

  it('--json keeps the counts separate', async () => {
    const { code, env } = await replayJson(session);
    expect(code).toBe(0);
    expect(env.command).toBe('replay');
    expect(env.result.entries.map((e: { outcome: string }) => e.outcome)).toEqual(['reproduced', 'reproduced', 'reproduced']);
    expect(env.result.summary).toEqual({
      entries: 3,
      reproduced: 3,
      differs: 0,
      notReplayable: 0,
      environmentChanged: 0,
      integrityFindings: 0,
    });
  });

  it('an edited output DIFFERS: names stdout and its first differing line, exits 3, flags the edit', async () => {
    const file = tampered('stdout.jsonl', (e) => {
      e[0].result.stdout = e[0].result.stdout.replace('1.6567788e-17', '1.6567789e-17');
    });
    const line = plain[0].stdout.split('\n').findIndex((l) => l.includes('1.6567788e-17')) + 1;
    expect(line).toBeGreaterThan(0);
    const { code, env } = await replayJson(file);
    expect(code).toBe(3);
    const [first] = env.result.entries;
    expect(first.outcome).toBe('differs');
    expect(first.differences).toHaveLength(1);
    expect(first.differences[0]).toMatchObject({
      stream: 'stdout',
      firstDifferingLine: line,
      recorded: '  S_V_V2_per_Hz = 1.6567789e-17',
      replayed: '  S_V_V2_per_Hz = 1.6567788e-17',
    });
    expect(first.integrity).toEqual([
      'recorded stdout does not match its recorded stdoutSha256',
      'recorded entry does not match its recorded entrySha256',
    ]);
    expect(env.result.summary).toMatchObject({ reproduced: 2, differs: 1, notReplayable: 0 });

    const text = await run([`--replay=${file}`]);
    expect(text.code).toBe(3);
    expect(text.stdout).toContain(`    DIFFERS — stdout\n      stdout: first difference at line ${line}`);
  });

  it('an edited exit code DIFFERS on the exit stream', async () => {
    const file = tampered('exit.jsonl', (e) => {
      e[1].result.exitCode = 0;
    });
    const { code, env } = await replayJson(file);
    expect(code).toBe(3);
    expect(env.result.entries[1].differences).toEqual([{ stream: 'exit', recorded: 'exit 0', replayed: 'exit 2' }]);
  });

  it('a changed constant is NAMED, beside a reproduced output — not folded into either', async () => {
    const file = tampered('constant.jsonl', (e) => {
      e[0].environment.constantTables['core/constants'].values.K_B_SI = 1.38e-23;
    });
    const { code, env } = await replayJson(file);
    expect(code).toBe(1);
    const [first] = env.result.entries;
    expect(first.outcome).toBe('reproduced');
    expect(first.environmentChanges).toEqual([
      { fact: 'constant core/constants K_B_SI', recorded: 1.38e-23, current: 1.380649e-23, reach: 'reachable' },
    ]);
    expect(first.integrity).toEqual([
      'recorded table core/constants does not match its recorded sha256',
      'recorded entry does not match its recorded entrySha256',
    ]);
    expect(env.result.summary).toMatchObject({ reproduced: 3, differs: 0, environmentChanged: 1, integrityFindings: 2 });

    const text = await run([`--replay=${file}`]);
    expect(text.stdout).toContain(
      "      constant core/constants K_B_SI: 1.38e-23 -> 1.380649e-23 — reachable from 'evaluate' (static upper bound, not an observed read)",
    );
  });

  it('an edited table fingerprint is named by its table', async () => {
    const file = tampered('fingerprint.jsonl', (e) => {
      e[2].environment.constantTables['core/constants'].sha256 = '0'.repeat(64);
    });
    const { code, env } = await replayJson(file);
    expect(code).toBe(1);
    const changes = env.result.entries[2].environmentChanges;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ fact: 'table core/constants sha256', recorded: '0'.repeat(64) });
    expect(env.result.entries[2].integrity).toEqual([
      'recorded table core/constants does not match its recorded sha256',
      'recorded entry does not match its recorded entrySha256',
    ]);
  });

  it('a different package version is named', async () => {
    const file = tampered('version.jsonl', (e) => {
      e[0].environment.uptVersion = '0.0.1';
    });
    const { code, env } = await replayJson(file);
    expect(code).toBe(1);
    expect(env.result.entries[0].environmentChanges).toEqual([{ fact: 'uptVersion', recorded: '0.0.1', current: pkgVersion }]);
  });

  it('not replayable by rule — a file-writing map, a timed probe, unreadable lines — counted apart', async () => {
    const file = join(dir, 'mixed.jsonl');
    const dot = join(dir, 'map.dot');
    expect((await run([`--record=${file}`, 'map', '--format=dot', `--out=${dot}`])).code).toBe(0);
    await run([`--record=${file}`, 'probe', 'run', `--problem=${join(dir, 'absent-problem.json')}`]);
    await run([`--record=${file}`, ...FAILED_LN]);
    const [mapEntry] = readEntries(file);
    expect(mapEntry.artifacts).toEqual([{ path: dot, sha256: createHash('sha256').update(readFileSync(dot)).digest('hex') }]);
    rmSync(dot);
    writeFileSync(file, readFileSync(file, 'utf8') + 'not json\n{"schema":"something-else"}\n');

    const { code, env } = await replayJson(file);
    expect(code).toBe(1);
    expect(existsSync(dot)).toBe(false);
    const outcomes = env.result.entries.map((e: { outcome: string; reason?: string }) => [e.outcome, e.reason ?? '']);
    expect(outcomes[0][0]).toBe('not-replayable');
    expect(outcomes[0][1]).toMatch(/wrote a file \(--out=/);
    expect(outcomes[1][0]).toBe('not-replayable');
    expect(outcomes[1][1]).toMatch(/wall-clock budget/);
    expect(outcomes[2]).toEqual(['reproduced', '']);
    expect(outcomes[3]).toEqual(['not-replayable', 'line 4 is not valid JSON']);
    expect(outcomes[4]).toEqual(['not-replayable', 'line 5 is not a upt-record/2 entry']);
    expect(env.result.summary).toMatchObject({ entries: 5, reproduced: 1, differs: 0, notReplayable: 4 });
  });

  it('usage and input errors', async () => {
    const withCommand = await run([`--replay=${session}`, 'version']);
    expect(withCommand.code).toBe(2);
    expect(withCommand.stderr).toMatch(/'--replay' takes no command/);
    const both = await run([`--replay=${session}`, `--show-record=${session}`]);
    expect(both.code).toBe(2);
    expect(both.stderr).toMatch(/use one of --record, --replay and --show-record/);
    const empty = join(dir, 'empty.jsonl');
    writeFileSync(empty, '\n');
    const r = await run([`--replay=${empty}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/holds no entries/);
  });
});
