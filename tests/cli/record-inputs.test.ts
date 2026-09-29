/**
 * `upt --record` / `--replay` for invocations that write or read files, and for code a constant
 * table does not cover (audit I17 limits).
 *
 * - `map --out=PATH` is replayed into a temporary file, never over PATH, and the file is compared by
 *   its SHA-256 with the recorded artifact.
 * - A `probe` entry hashes every input file it names (and the observations file a problem names).
 *   It is replayed when each still hashes as recorded, and declared not replayable when one changed,
 *   when it ran an external worker, or when either run says it stopped on its wall-clock budget.
 * - `--stored` hashes the witness-results artifact it reads.
 * - Each entry hashes the source of every module its command loads, so a change to a literal a
 *   module keeps private is named even when the output does not change.
 *
 * Design: `docs/planning/Experiment-Record-Replay-Design-Note.md`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../../dist/cli/main.js';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const PROBLEM_FIXTURE = join(repo, 'tests', 'fixtures', 'discovery', 'pendulum-scaling', 'public', 'problem.json');
const STUDY_FIXTURE = join(repo, 'tests', 'fixtures', 'probe-study', 'pendulum-small-angle.synthetic.json');
const STORED = join(repo, 'data', 'atlas', 'witness-results.json');

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  });
  return { code, ...o };
}

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

const readEntries = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l));

/** An independent canonical form: keys sorted at every depth. */
function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted);
  if (typeof v === 'object' && v !== null) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])]));
  }
  return v;
}

/** Re-hash an edited entry as its writer would, so the edit raises no integrity finding. */
function rehash(e: any): void {
  e.result.stdoutSha256 = sha(e.result.stdout);
  e.result.stderrSha256 = sha(e.result.stderr);
  const { entrySha256: _, ...rest } = e;
  e.entrySha256 = sha(JSON.stringify(sorted(rest)));
}

function edited(from: string, to: string, edit: (entries: any[]) => void): string {
  const entries = readEntries(from);
  edit(entries);
  entries.forEach(rehash);
  writeFileSync(to, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return to;
}

async function replay(file: string) {
  const r = await run([`--replay=${file}`, '--json']);
  return { code: r.code, entries: JSON.parse(r.stdout).result.entries, text: (await run([`--replay=${file}`])).stdout };
}

/** Write the fixture problem as a problem file that names a separate observations file. */
function splitProblem(dir: string): { problem: string; observations: string } {
  const raw = JSON.parse(readFileSync(PROBLEM_FIXTURE, 'utf8'));
  const observations = join(dir, 'observations.json');
  writeFileSync(observations, JSON.stringify({ exploratory: raw.exploratory, holdout: raw.holdout }, null, 2));
  delete raw.exploratory;
  delete raw.holdout;
  raw.observationsPath = 'observations.json';
  const problem = join(dir, 'problem.json');
  writeFileSync(problem, JSON.stringify(raw, null, 2));
  return { problem, observations };
}

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'upt-record-inputs-'));
});

describe('map --out is replayed into a temporary file', () => {
  let session: string;
  let dot: string;
  let written: string;
  beforeAll(async () => {
    session = join(dir, 'map.jsonl');
    dot = join(dir, 'map.dot');
    expect((await run([`--record=${session}`, 'map', '--format=dot', `--out=${dot}`])).code).toBe(0);
    written = readFileSync(dot, 'utf8');
    writeFileSync(dot, 'sentinel');
  });

  it('replays and compares the file by hash, without touching the recorded path', async () => {
    const [entry] = readEntries(session);
    expect(entry.artifacts).toEqual([{ path: dot, sha256: sha(written) }]);
    const { code, entries } = await replay(session);
    expect(entries[0].outcome).toBe('reproduced');
    expect(entries[0].artifacts).toEqual([{ path: dot, recorded: sha(written), replayed: sha(written) }]);
    expect(code).toBe(0);
    expect(readFileSync(dot, 'utf8')).toBe('sentinel');
  });

  it('PAIRED CONTROL — a recorded artifact hash that does not match DIFFERS on the artifact and exits 3', async () => {
    const file = edited(session, join(dir, 'map-artifact.jsonl'), (e) => {
      e[0].artifacts[0].sha256 = '0'.repeat(64);
    });
    const { code, entries } = await replay(file);
    expect(entries[0].integrity).toEqual([]);
    expect(entries[0].outcome).toBe('differs');
    expect(entries[0].differences).toEqual([
      { stream: 'artifact', recorded: '0'.repeat(64), replayed: sha(written), path: dot },
    ]);
    expect(code).toBe(3);
    expect(readFileSync(dot, 'utf8')).toBe('sentinel');
  });

  it('an --out entry that wrote no file is not replayable, with the reason', async () => {
    const file = join(dir, 'map-failed.jsonl');
    const target = join(dir, 'no-such-dir', 'x.dot');
    expect((await run([`--record=${file}`, 'map', '--format=dot', `--out=${target}`])).code).toBe(1);
    expect(readEntries(file)[0].artifacts).toEqual([]);
    const { entries } = await replay(file);
    expect(entries[0].outcome).toBe('not-replayable');
    expect(entries[0].reason).toMatch(/--out=.*wrote no file/);
    expect(existsSync(target)).toBe(false);
  });
});

describe('probe entries hash the files they read', () => {
  let session: string;
  let files: { problem: string; observations: string };
  let study: string;
  const absent = () => join(dir, 'absent-problem.json');
  beforeAll(async () => {
    const d = join(dir, 'probe');
    mkdirSync(d);
    files = splitProblem(d);
    study = join(d, 'study.json');
    cpSync(STUDY_FIXTURE, study);
    const worker = join(d, 'worker.mjs');
    writeFileSync(worker, 'process.exit(0);\n');
    session = join(dir, 'probe.jsonl');
    for (const argv of [
      ['probe', 'run', `--problem=${files.problem}`],
      // 1 µs. A 1 ms cap is smaller than Date.now()'s tick, so the same pendulum
      // search stopped on one run and exhausted its space on the next.
      ['probe', 'run', `--problem=${files.problem}`, '--budget-ms=0.001'],
      ['probe', 'study', `--data=${study}`],
      ['probe', 'run', `--problem=${absent()}`],
      ['probe', 'run', `--problem=${files.problem}`, `--worker=${worker}`],
    ]) {
      await run([`--record=${session}`, ...argv]);
    }
  });

  it('records each input with its hash, the observations file a problem names included (checked independently)', () => {
    const [plain, , studied, missing] = readEntries(session);
    expect(plain.inputs).toEqual([
      { flag: '--problem', path: files.problem, sha256: sha(readFileSync(files.problem)) },
      { flag: '--problem observationsPath', path: files.observations, sha256: sha(readFileSync(files.observations)) },
    ]);
    expect(studied.inputs).toEqual([{ flag: '--data', path: study, sha256: sha(readFileSync(study)) }]);
    expect(missing.inputs).toEqual([{ flag: '--problem', path: absent(), sha256: null }]);
  });

  it('PRECONDITION: the 1 ms run says it stopped on its wall-clock budget; the unbounded one does not', () => {
    const [plain, timed] = readEntries(session);
    expect(timed.result.stdout).toMatch(/stop: time-limit/);
    expect(plain.result.stdout).not.toMatch(/time-limit/);
  });

  it('replays what it can: unchanged inputs reproduce, a timed-out run and an external worker are declared', async () => {
    const { entries } = await replay(session);
    const outcomes = entries.map((e: { outcome: string; reason?: string }) => [e.outcome, e.reason ?? '']);
    expect(outcomes[0]).toEqual(['reproduced', '']);
    expect(outcomes[1][0]).toBe('not-replayable');
    expect(outcomes[1][1]).toMatch(/the recorded run stopped on its wall-clock budget/);
    expect(outcomes[2]).toEqual(['reproduced', '']);
    expect(outcomes[3]).toEqual(['reproduced', '']);
    expect(outcomes[4][0]).toBe('not-replayable');
    expect(outcomes[4][1]).toMatch(/external worker \(--worker=/);
  });

  it('a replay that stops on its budget when the recorded run did not is not replayable', async () => {
    const file = edited(session, join(dir, 'probe-untimed.jsonl'), (e) => {
      e.splice(2);
      e.splice(0, 1);
      e[0].result.stdout = e[0].result.stdout.replace('stop: time-limit', 'stop: exhausted-space');
    });
    const { entries } = await replay(file);
    expect(entries[0].integrity).toEqual([]);
    expect(entries[0].outcome).toBe('not-replayable');
    expect(entries[0].reason).toMatch(/the replay stopped on its wall-clock budget/);
  });

  it('an input changed or removed since recording makes the entry not replayable, naming the file', async () => {
    const d = join(dir, 'probe-changed');
    mkdirSync(d);
    const f = splitProblem(d);
    const s = join(d, 'study.json');
    cpSync(STUDY_FIXTURE, s);
    const file = join(dir, 'probe-changed.jsonl');
    await run([`--record=${file}`, 'probe', 'run', `--problem=${f.problem}`]);
    await run([`--record=${file}`, 'probe', 'study', `--data=${s}`]);
    const before = await replay(file);
    expect(before.entries.map((e: { outcome: string }) => e.outcome)).toEqual(['reproduced', 'reproduced']);

    appendFileSync(f.observations, '\n');
    rmSync(s);
    const after = await replay(file);
    expect(after.entries[0].outcome).toBe('not-replayable');
    expect(after.entries[0].reason).toContain(`${f.observations} (--problem observationsPath) changed since recording`);
    expect(after.entries[1].outcome).toBe('not-replayable');
    expect(after.entries[1].reason).toContain(`${s} (--data) is missing now`);
  });
});

describe('--stored hashes the witness-results artifact it reads', () => {
  let session: string;
  beforeAll(async () => {
    session = join(dir, 'stored.jsonl');
    await run([`--record=${session}`, 'atlas', '--evidence', '--stored']);
  });

  it('records the artifact with its hash and replays it', async () => {
    expect(readEntries(session)[0].inputs).toEqual([{ flag: '--stored', path: STORED, sha256: sha(readFileSync(STORED)) }]);
    const { entries } = await replay(session);
    expect(entries[0].outcome).toBe('reproduced');
  });

  it('PAIRED CONTROL — a recorded input hash that does not match makes it not replayable', async () => {
    const file = edited(session, join(dir, 'stored-changed.jsonl'), (e) => {
      e[0].inputs[0].sha256 = '0'.repeat(64);
    });
    const { entries } = await replay(file);
    expect(entries[0].integrity).toEqual([]);
    expect(entries[0].outcome).toBe('not-replayable');
    expect(entries[0].reason).toContain(`${STORED} (--stored) changed since recording`);
  });
});

describe('module sources', () => {
  const BE64 = 'bridges/be64-eddington-luminosity';
  let session: string;
  beforeAll(async () => {
    session = join(dir, 'modules.jsonl');
    await run([`--record=${session}`, 'evaluate', 'be-58', 'T_K=300', 'R_ohm=1000']);
    await run([`--record=${session}`, 'eval', '2*x+1', 'x=3']);
  });

  it('each entry hashes the source of every module its command loads (checked independently)', () => {
    const [thermal, formula] = readEntries(session);
    expect(thermal.attribution.modules['cli/commands/evaluate']).toBe(sha(readFileSync(join(repo, 'dist', 'cli', 'commands', 'evaluate.js'))));
    expect(thermal.attribution.modules[BE64]).toBe(sha(readFileSync(join(repo, 'dist', `${BE64}.js`))));
    expect(formula.attribution.modules['cli/commands/eval']).toBe(sha(readFileSync(join(repo, 'dist', 'cli', 'commands', 'eval.js'))));
    expect(formula.attribution.modules[BE64]).toBeUndefined();
  });

  it('an untouched record compares every module and finds no change', async () => {
    const { code, entries } = await replay(session);
    expect(code).toBe(0);
    for (const e of entries) {
      expect(e.moduleSources).toBe('compared');
      expect(e.environmentChanges).toEqual([]);
    }
  });

  it('PAIRED CONTROL — an edited module hash is named, reachable, beside a reproduced output', async () => {
    const file = edited(session, join(dir, 'modules-edited.jsonl'), (e) => {
      e[0].attribution.modules[BE64] = '0'.repeat(64);
    });
    const { code, entries, text } = await replay(file);
    expect(entries[0].integrity).toEqual([]);
    expect(entries[0].outcome).toBe('reproduced');
    expect(entries[0].environmentChanges).toEqual([
      { fact: `module ${BE64}`, recorded: '0'.repeat(64), current: sha(readFileSync(join(repo, 'dist', `${BE64}.js`))), reach: 'reachable' },
    ]);
    expect(entries[1].environmentChanges).toEqual([]);
    expect(code).toBe(1);
    expect(text).toContain(`      module ${BE64}: "${'0'.repeat(64)}" -> `);
  });

  it('an entry recorded without module hashes says a private literal would go unseen', async () => {
    const file = edited(session, join(dir, 'modules-absent.jsonl'), (e) => {
      delete e[0].attribution.modules;
    });
    const { entries, text } = await replay(file);
    expect(entries[0].moduleSources).toBe('not-recorded');
    expect(entries[1].moduleSources).toBe('compared');
    expect(text).toContain('    module sources: not recorded in this entry, so a changed literal a module keeps private would go unseen');
  });

  it('SECOND METHOD — a real change to a private literal in a copy of dist is named though no table holds it', () => {
    const copy = mkdtempSync(join(tmpdir(), 'upt-private-literal-'));
    cpSync(join(repo, 'dist'), join(copy, 'dist'), { recursive: true, filter: (s) => !/\.(d\.ts|map)$/.test(s) });
    mkdirSync(join(copy, 'bin'));
    cpSync(join(repo, 'bin', 'upt.mjs'), join(copy, 'bin', 'upt.mjs'));
    cpSync(join(repo, 'package.json'), join(copy, 'package.json'));
    symlinkSync(join(repo, 'node_modules'), join(copy, 'node_modules'), 'junction');
    const be64 = join(copy, 'dist', `${BE64}.js`);
    const before = readFileSync(be64, 'utf8');
    const after = before.replace('const L_SUN_SI = 3.828e26;', 'const L_SUN_SI = 3.9e26;');
    expect(after).not.toBe(before);
    expect(before).not.toMatch(/export const L_SUN_SI/);
    writeFileSync(be64, after);

    const r = spawnSync(process.execPath, [join(copy, 'bin', 'upt.mjs'), `--replay=${session}`, '--json'], { encoding: 'utf8' });
    const [thermal, formula] = JSON.parse(r.stdout).result.entries;
    expect(thermal.outcome).toBe('reproduced');
    expect(thermal.environmentChanges).toEqual([
      { fact: `module ${BE64}`, recorded: sha(before), current: sha(after), reach: 'reachable' },
    ]);
    expect(formula.outcome).toBe('reproduced');
    expect(formula.environmentChanges).toEqual([]);
    expect(r.status).toBe(1);
    // A copy of dist plus a real replay process: it timed out at the 60 s default under a parallel
    // run of five test paths (vitest pointed at the test declaration, not at an expect).
  }, 180_000);
});
