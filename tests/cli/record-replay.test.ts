/**
 * `upt --record=FILE` / `--show-record=FILE` (audit I17): a session record that keeps failures.
 *
 * The audit needed an external wrapper to keep its invocations, outputs, errors and hashes, and a
 * record that dropped the failed `ln` and the invalid input would present a cleaner history than
 * the one that happened. Design: `docs/planning/Experiment-Record-Replay-Design-Note.md`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
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
      expect(e.schema).toBe('upt-record/1');
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
    expect(e.environment.constants.K_B_SI).toBe(1.380649e-23);
    const sorted = Object.fromEntries(Object.keys(e.environment.constants).sort().map((k) => [k, e.environment.constants[k]]));
    expect(e.environment.constantsSha256).toBe(createHash('sha256').update(JSON.stringify(sorted)).digest('hex'));
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
