/**
 * `upt probe study --data=FILE` (audit §14 I19), in-process. The fixtures are
 * SYNTHETIC controls (see tests/fixtures/probe-study/generate.mjs).
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

const dir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/probe-study');
const fixture = (name: string) => join(dir, `${name}.synthetic.json`);

async function study(name: string, ...extra: string[]) {
  const c = capture();
  const code = await runCli(['probe', 'study', `--data=${fixture(name)}`, ...extra], c.io);
  return { code, out: text(c) };
}

describe('upt probe study', () => {
  it('each synthetic control gives its own result class, exit 0', async () => {
    const expected = {
      'pendulum-small-angle': 'survives-holdout',
      'pendulum-regime-change': 'refuted-on-holdout',
      'pure-noise': 'no-credible-candidate',
    };
    for (const [name, verdict] of Object.entries(expected)) {
      const { code, out } = await study(name);
      expect(code).toBe(0);
      expect(out).toMatch(new RegExp(`verdict: ${verdict}\\n`));
      expect(out).toMatch(/⚠ SYNTHETIC DATA — generated, not measured/);
      expect(out).toMatch(/A fit is not a mechanism/);
      expect(out).toMatch(/a suggestion, not evidence/);
    }
  });

  it('the regime-change report keeps holdout and replication as separate results', async () => {
    const { out } = await study('pendulum-regime-change');
    expect(out).toMatch(/holdout: .* — FAIL/);
    expect(out).toMatch(/replication: survives-replication/);
    expect(out).toMatch(/differ most at .*amplitude=1\.2 rad/);
  });

  it('--json carries the verdict, the provenance and the caveats', async () => {
    const { code, out } = await study('pure-noise', '--json');
    expect(code).toBe(0);
    const env = JSON.parse(out);
    expect(env.options.subverb).toBe('study');
    expect(env.result.verdict).toBe('no-credible-candidate');
    expect(env.result.provenance.synthetic).toBe(true);
    expect(env.result.caveats.join('\n')).toMatch(/not a mechanism/);
  });

  it('--alpha overrides the file criterion (a stricter level refutes what 0.001 kept)', async () => {
    const loose = await study('pendulum-small-angle', '--json');
    expect(JSON.parse(loose.out).result.verdict).toBe('survives-holdout');
    const strict = await study('pendulum-small-angle', '--json', '--alpha=0.5');
    expect(JSON.parse(strict.out).result.alpha).toBe(0.5);
    expect(JSON.parse(strict.out).result.verdict).not.toBe('survives-holdout');
  });

  it('a unit mismatch refuses the file: exit 1, the row named, no stack trace', async () => {
    const raw = JSON.parse(readFileSync(fixture('pendulum-small-angle'), 'utf8'));
    raw.observations[0].observed = '2 kg';
    const p = join(mkdtempSync(join(tmpdir(), 'upt-study-')), 'bad.json');
    writeFileSync(p, JSON.stringify(raw));
    const c = capture();
    expect(await runCli(['probe', 'study', `--data=${p}`], c.io)).toBe(1);
    expect(text(c)).toMatch(/study refused \(observation e1 observed\): 'kg' is \[mass\]/);
    expect(text(c)).not.toMatch(/at \w+ \(/);
  });

  it('usage errors: no --data, bad --alpha', async () => {
    const c = capture();
    expect(await runCli(['probe', 'study'], c.io)).toBe(2);
    expect(text(c)).toMatch(/--data=FILE is required/);
    const c2 = capture();
    expect(await runCli(['probe', 'study', `--data=${fixture('pure-noise')}`, '--alpha=2'], c2.io)).toBe(2);
  });

  it('help probe documents the study file, the roles and the verdicts', async () => {
    const c = capture();
    expect(await runCli(['help', 'probe'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/STUDY FILE/);
    for (const w of ['exploratory', 'holdout', 'replication', 'no-credible-candidate', 'refuted-on-holdout', 'survives-holdout', 'untested-on-holdout']) {
      expect(t).toContain(w);
    }
    expect(t).toMatch(/"synthetic": true\|false \(required, never inferred\)/);
  });

  it('help probe documents CSV, input σ, the correction family, --replication, and that no control is blind', async () => {
    const c = capture();
    expect(await runCli(['help', 'probe'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/--replication=FILE/);
    expect(t).toMatch(/CSV when FILE ends in \.csv/);
    expect(t).toMatch(/σ_eff² = σ_y² \+\s+Σ \(∂f\/∂x_i · σ_x_i\)²/);
    expect(t).toMatch(/extra-sum-of-squares\s+F test at p < α/);
    expect(t).toMatch(/none is a blind test of finding an\s+unknown one, and UPT ships no blind control/);
  });
});

describe('upt probe study — CSV, replication file', () => {
  const file = (f: string) => join(dir, f);
  const studyJson = file('pendulum-large-amplitude.synthetic.json');
  const repCsv = file('pendulum-large-amplitude.replication.synthetic.csv');
  const runArgs = async (...argv: string[]) => {
    const c = capture();
    const code = await runCli(['probe', 'study', ...argv], c.io);
    return { code, out: text(c) };
  };

  it('--data=FILE.csv gives the report of its JSON twin, source line aside', async () => {
    const a = await runArgs(`--data=${studyJson}`);
    const b = await runArgs(`--data=${file('pendulum-large-amplitude.synthetic.csv')}`);
    expect(b.code).toBe(0);
    expect(b.out).toMatch(/verdict: survives-holdout\n/);
    expect(b.out).toBe(a.out);
  });

  it('--replication=FILE tests the candidate on a separate acquisition and names it', async () => {
    const { code, out } = await runArgs(`--data=${studyJson}`, `--replication=${repCsv}`, '--json');
    expect(code).toBe(0);
    const r = JSON.parse(out).result;
    expect(r.replication).toBe('survives-replication');
    expect(r.replicationFile.provenance).toMatchObject({ synthetic: true });
    const human = await runArgs(`--data=${studyJson}`, `--replication=${repCsv}`);
    expect(human.out).toMatch(/replication file: .* — ⚠ SYNTHETIC DATA/);
    expect(human.out).toMatch(/replication: survives-replication/);
  });

  it('refuses the study\'s own rows under a new source name: exit 1, no stack trace', async () => {
    const raw = JSON.parse(readFileSync(studyJson, 'utf8'));
    const copy = {
      provenance: { synthetic: true, source: 'renamed' },
      target: raw.target,
      governing: raw.governing,
      observations: raw.observations
        .filter((o: { role: string }) => o.role === 'exploratory')
        .map((o: { id: string }) => ({ ...o, id: `c-${o.id}`, role: 'replication' })),
    };
    const p = join(mkdtempSync(join(tmpdir(), 'upt-study-')), 'renamed.json');
    writeFileSync(p, JSON.stringify(copy));
    const { code, out } = await runArgs(`--data=${studyJson}`, `--replication=${p}`);
    expect(code).toBe(1);
    expect(out).toMatch(/is identical \(inputs, observed, σ\) to exploratory row e1 .*same data under another source name/);
    expect(out).not.toMatch(/at \w+ \(/);
  });

  it('a missing replication file or bad JSON in it is named', async () => {
    const missing = await runArgs(`--data=${studyJson}`, '--replication=/nonexistent/rep.json');
    expect(missing.code).toBe(1);
    expect(missing.out).toMatch(/file not found: \/nonexistent\/rep\.json/);
    const p = join(mkdtempSync(join(tmpdir(), 'upt-study-')), 'broken.json');
    writeFileSync(p, '{ not json');
    const broken = await runArgs(`--data=${studyJson}`, `--replication=${p}`);
    expect(broken.code).toBe(1);
    expect(broken.out).toMatch(new RegExp(`invalid JSON: ${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
  });
});
