/**
 * `upt probe study` inputs and search (audit §14 I19, remaining limits): CSV
 * study files, input-side σ by effective variance, a declared correction
 * family in a dimensionless input, and replication from a separate file.
 *
 * Every fixture is SYNTHETIC and was designed knowing its generating law and,
 * for the correction family, the family that recovers it. A recovery here
 * shows the machinery recovers a law it was built to find; it is not a blind
 * test. The noise fixture's seed was chosen so that admitting every declared
 * term WOULD make pure noise pass: the guard is checked on a case where it can
 * fail, and over 60 seeds where it was not chosen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  attachReplication,
  chiSquareSurvival,
  effectiveSigma,
  formatProbeStudy,
  fSurvival,
  loadStudyFile,
  parseStudy,
  runProbeStudy,
  studyCsvToRaw,
  StudyRefusal,
  type ProbeStudy,
  type ProbeStudyResult,
  type StudyObservation,
} from '../../../src/composition/probe/study.js';
import {
  exactPeriod,
  inputSigmaRows,
  NOISE_AMPLITUDE_SEED,
  noiseAmplitudeRows,
  renderCsv,
} from '../../fixtures/probe-study/generate.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/probe-study');
const path = (file: string) => join(dir, file);
type Raw = { observations: Record<string, unknown>[]; [k: string]: unknown };
const load = (name: string): Raw => JSON.parse(readFileSync(path(`${name}.synthetic.json`), 'utf8')) as Raw;
const csvText = (file: string) => readFileSync(path(file), 'utf8');
const run = (raw: unknown): Promise<ProbeStudyResult> => runProbeStudy(parseStudy(raw, 'test'));
const selectedOf = (r: ProbeStudyResult) => r.candidates.find((c) => c.id === r.selected)!;
const refusal = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(StudyRefusal);
    return (e as Error).message;
  }
  throw new Error('expected a refusal');
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (rand: () => number) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

/** Plain unweighted-by-structure least squares, independent of the engine's solver. */
function lsq(X: number[][], y: number[], sigma: number[]): { coef: number[]; chi2: number } {
  const k = X[0]!.length;
  const A = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  X.forEach((r, i) => {
    const w = 1 / sigma[i]! ** 2;
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) A[a]![b]! += w * r[a]! * r[b]!;
      A[a]![k]! += w * r[a]! * y[i]!;
    }
  });
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const m = A[r]![c]! / A[c]![c]!;
      for (let q = c; q <= k; q++) A[r]![q]! -= m * A[c]![q]!;
    }
  }
  const coef = A.map((r, a) => r[k]! / r[a]!);
  const chi2 = X.reduce((s, r, i) => s + ((y[i]! - r.reduce((t, x, j) => t + x * coef[j]!, 0)) / sigma[i]!) ** 2, 0);
  return { coef, chi2 };
}

describe('fSurvival', () => {
  it('matches the closed forms F(1,1) = Cauchy t² and F(1,2) = t₂²', () => {
    for (const f of [0.3, 1, 4, 25, 400]) {
      expect(fSurvival(f, 1, 1)).toBeCloseTo(1 - (2 / Math.PI) * Math.atan(Math.sqrt(f)), 12);
      expect(fSurvival(f, 1, 2)).toBeCloseTo(1 - Math.sqrt(f) / Math.sqrt(f + 2), 12);
    }
  });

  it('matches tabulated F critical values, and F(d1, ∞) → χ²_d1/d1', () => {
    expect(fSurvival(4.964602743730711, 1, 10)).toBeCloseTo(0.05, 9);
    expect(fSurvival(6.926608140426863, 2, 12)).toBeCloseTo(0.01, 9);
    expect(fSurvival(2.710889837327839, 5, 20)).toBeCloseTo(0.05, 9);
    expect(fSurvival(3.841458820694124, 1, 1e7)).toBeCloseTo(chiSquareSurvival(3.841458820694124, 1), 5);
  });
});

describe('probe study — CSV input', () => {
  it('the CSV and JSON of the same study give identical results, id included', async () => {
    const a = await runProbeStudy(loadStudyFile(path('pendulum-large-amplitude.synthetic.json')));
    const b = await runProbeStudy(loadStudyFile(path('pendulum-large-amplitude.synthetic.csv')));
    expect(b.source).toMatch(/\.csv$/);
    expect({ ...b, source: 'x' }).toEqual({ ...a, source: 'x' });
    expect(b.candidates.length).toBeGreaterThan(1);
  });

  it('the CSV compiles to the parsed study the JSON gives', () => {
    const a = loadStudyFile(path('pendulum-large-amplitude.synthetic.json'));
    const b = loadStudyFile(path('pendulum-large-amplitude.synthetic.csv'));
    expect({ ...b, source: 'x' }).toEqual({ ...a, source: 'x' });
  });

  it('the same defect refuses CSV and JSON with the same message', () => {
    const raw = load('pendulum-large-amplitude');
    const csv = csvText('pendulum-large-amplitude.synthetic.csv');
    const fromCsv = (text: string) => refusal(() => parseStudy(studyCsvToRaw(text, 'f.csv'), 'f'));
    const fromJson = (obj: unknown) => refusal(() => parseStudy(obj, 'f'));
    const withE2 = (patch: Record<string, unknown>) => ({
      ...raw,
      observations: raw.observations.map((o) => (o.id === 'e2' ? { ...o, ...patch } : o)),
    });
    const e2 = csv.split('\n').find((l) => l.startsWith('e2,'))!;
    const cases: [string, string, unknown][] = [
      ['a wrong-dimension observation', csv.replace(e2, e2.replace(/,[^,]+$/, ',2 kg')), withE2({ observed: '2 kg' })],
      ['a missing σ', csv.replace(/^# target\.sigma: .*\n/m, ''), { ...raw, target: { name: 'period', unit: 's' } }],
      ['an undeclared synthetic flag', csv.replace(/^# provenance\.synthetic: .*\n/m, ''), {
        ...raw,
        provenance: { ...(raw.provenance as object), synthetic: undefined },
      }],
      ['a non-boolean synthetic flag', csv.replace('# provenance.synthetic: true', '# provenance.synthetic: yes'), {
        ...raw,
        provenance: { ...(raw.provenance as object), synthetic: 'yes' },
      }],
      ['an unknown role', csv.replace('e2,exploratory', 'e2,training'), withE2({ role: 'training' })],
      ['a duplicate id', csv.replace('e3,exploratory', 'e2,exploratory'), {
        ...raw,
        observations: raw.observations.map((o) => (o.id === 'e3' ? { ...o, id: 'e2' } : o)),
      }],
    ];
    for (const [what, text, obj] of cases) {
      const m = fromJson(obj);
      expect(fromCsv(text), what).toBe(m);
    }
  });

  it('refuses a malformed CSV, naming the line or column', () => {
    const csv = csvText('pendulum-large-amplitude.synthetic.csv');
    const header = csv.split('\n').find((l) => l.startsWith('id,'))!;
    const bad = (text: string) => refusal(() => studyCsvToRaw(text, 'f.csv'));
    expect(bad(csv.replace(header, header.replace('length[m]', 'length')))).toMatch(/header column 'length'.*name\[unit\]/);
    expect(bad(csv.replace('# target: period\n', ''))).toMatch(/'# target: <column>'/);
    expect(bad(csv.replace('e2,exploratory,', 'e2,exploratory,"0.6,'))).toMatch(/unterminated quoted cell/);
    expect(bad(csv.replace('e2,exploratory,', 'e2,exploratory,9,'))).toMatch(/line \d+\): has 7 cells; the header has 6/);
    expect(bad(`${csv}# late: 1\n`)).toMatch(/declarations go above the header/);
    expect(bad(csv.replace('# target: period', '# target: period\n# target: length'))).toMatch(/declared twice/);
    expect(bad(csv.replace('# target: period', '# target.unit: ms\n# target: period'))).toMatch(/only 'target.sigma'/);
  });

  it('reads quoted cells with commas, a unit per cell, and sigma(<input>) columns', () => {
    const raw = studyCsvToRaw(
      [
        '# provenance.synthetic: true',
        '# provenance.source: "hand, written"',
        '# target: y',
        'id,role,note,x[m],y[s],sigma,sigma(x)',
        'a,exploratory,"a note, with a comma ""quoted""",120 cm,2,0.1,1 mm',
        'b,exploratory,,2,3 s,0.2,',
      ].join('\n'),
      'hand.csv',
    );
    expect(raw.provenance).toEqual({ synthetic: true, source: 'hand, written' });
    expect(raw.observations).toEqual([
      { id: 'a', role: 'exploratory', note: 'a note, with a comma "quoted"', sigma: '0.1', values: { x: '120 cm' }, observed: '2', inputSigma: { x: '1 mm' } },
      { id: 'b', role: 'exploratory', sigma: '0.2', values: { x: '2' }, observed: '3 s' },
    ]);
    const s = parseStudy(raw, 'hand.csv');
    expect(s.observations[0]!.inputs.x).toBeCloseTo(1.2, 15);
    expect(s.observations[0]!.inputSigma.x).toBeCloseTo(1e-3, 15);
    expect(s.observations[1]!.inputSigma).toEqual({});
  });
});

describe('probe study — input σ (effective variance)', () => {
  const row = (inputs: Record<string, number>, inputSigma: Record<string, number>, sigma: number): StudyObservation => ({
    id: 'mc', role: 'exploratory', source: 's', inputs, observed: 0, sigma, inputSigma,
  });

  /** Variance of y − f(x_recorded) when x_recorded = x_true + N(0, σ_x) and y = f(x_true) + N(0, σ_y). */
  function monteCarloVariance(f: (x: Record<string, number>) => number, x: Record<string, number>, sx: Record<string, number>, sy: number, n: number, seed: number) {
    const rand = mulberry32(seed);
    let s = 0;
    let s2 = 0;
    for (let i = 0; i < n; i++) {
      const rec = { ...x };
      for (const [k, v] of Object.entries(sx)) rec[k] = x[k]! + v * normal(rand);
      const r = f(x) + sy * normal(rand) - f(rec);
      s += r;
      s2 += r * r;
    }
    return s2 / n - (s / n) ** 2;
  }

  it('σ_eff² agrees with an independent Monte Carlo of the residual variance', () => {
    const smallAngle = (x: Record<string, number>) => 2 * Math.PI * Math.sqrt(x.length! / x.gravity!);
    const finite = (x: Record<string, number>) => exactPeriod(x.length!, x.gravity!, x.amplitude!);
    type Case = { f: (x: Record<string, number>) => number; x: Record<string, number>; sx: Record<string, number>; sy: number };
    const cases: Case[] = [
      { f: smallAngle, x: { length: 1, gravity: 9.81 }, sx: { length: 0.01 }, sy: 0.002 },
      { f: smallAngle, x: { length: 0.4, gravity: 9.81 }, sx: { length: 0.005, gravity: 0.02 }, sy: 0.002 },
      { f: finite, x: { length: 1.5, gravity: 9.81, amplitude: 1.0 }, sx: { amplitude: 0.01 }, sy: 0.002 },
    ];
    for (const [i, c] of cases.entries()) {
      const mc = monteCarloVariance(c.f, c.x, c.sx, c.sy, 400_000, 100 + i);
      const ev = effectiveSigma(row(c.x, c.sx, c.sy), c.f) ** 2;
      expect(Math.abs(ev / mc - 1), `case ${i}`).toBeLessThan(0.015);
      // Paired check: the output σ alone misses the Monte Carlo variance by far more than the tolerance.
      expect(Math.abs((c.sy * c.sy) / mc - 1), `case ${i} output-only`).toBeGreaterThan(0.5);
    }
  });

  it('with the input σ declared the true law passes; with it removed the same rows refute it', async () => {
    const raw = load('pendulum-input-sigma');
    const withSigma = await run(raw);
    expect(withSigma.uncertainty).toEqual({ method: 'effective-variance', inputs: ['length'] });
    expect(withSigma.verdict).toBe('survives-holdout');
    expect(withSigma.baselines[0]!.exploratory!.pass).toBe(true);

    const governing = (raw.governing as Record<string, unknown>[]).map(({ sigma: _s, ...g }) => g);
    const observations = raw.observations.map(({ inputSigma: _i, ...o }) => o);
    const without = await run({ ...raw, governing, observations });
    expect(without.uncertainty.method).toBe('output-only');
    expect(without.baselines[0]!.exploratory!.pass).toBe(false);
    expect(without.verdict).toBe('no-credible-candidate');
  });

  it('the fitted prefactor is the fixed point of its own σ_eff weights, not the σ_y-weighted fit', async () => {
    const raw = load('pendulum-input-sigma');
    const r = await run(raw);
    const c = selectedOf(r).prefactor!;
    const ex = parseStudy(raw).observations.filter((o) => o.role === 'exploratory');
    const f = (x: Record<string, number>) => Math.sqrt(x.length! / x.gravity!);
    const weighted = (w: (o: StudyObservation) => number) =>
      ex.reduce((s, o) => s + w(o) * f(o.inputs) * o.observed, 0) / ex.reduce((s, o) => s + w(o) * f(o.inputs) ** 2, 0);
    const fixedPoint = weighted((o) => 1 / effectiveSigma(o, (x) => c * f(x)) ** 2);
    expect(Math.abs(fixedPoint / c - 1)).toBeLessThan(1e-10);
    // Paired check: weighting by σ_y alone lands measurably elsewhere.
    expect(Math.abs(weighted((o) => 1 / o.sigma ** 2) / c - 1)).toBeGreaterThan(1e-4);
  });

  it('over 200 independent draws the true law has mean χ²/ν ≈ 1 under σ_eff, and ≫ 1 without it', async () => {
    const raw = load('pendulum-input-sigma');
    let withEv = 0;
    let without = 0;
    const draws = 200;
    const stripped = (raw.governing as Record<string, unknown>[]).map(({ sigma: _s, ...g }) => g);
    for (let seed = 1000; seed < 1000 + draws; seed++) {
      const observations = inputSigmaRows('e', 'exploratory', seed);
      const a = await run({ ...raw, observations });
      withEv += a.baselines[0]!.exploratory!.chi2 / a.baselines[0]!.exploratory!.n;
      const b = await run({ ...raw, governing: stripped, observations: observations.map(({ inputSigma: _i, ...o }) => o) });
      without += b.baselines[0]!.exploratory!.chi2 / b.baselines[0]!.exploratory!.n;
    }
    // sd of the mean of χ²₁₂/12 over 200 draws ≈ 0.029.
    expect(Math.abs(withEv / draws - 1)).toBeLessThan(0.1);
    expect(without / draws).toBeGreaterThan(5);
  }, 60_000);

  it('the report states the method and the inputs that carry σ', async () => {
    const text = formatProbeStudy(await run(load('pendulum-input-sigma')));
    expect(text).toMatch(/uncertainty: σ_eff² = σ_y² \+ Σ_i \(∂f\/∂x_i · σ_x_i\)² over \{length\}/);
    expect(text).toMatch(/Input σ is propagated to first order/);
    const plain = formatProbeStudy(await run(load('pendulum-small-angle')));
    expect(plain).toMatch(/uncertainty: σ on the target only; the inputs are taken as exact/);
  });

  it('refuses an input σ on an undeclared input, a non-positive one, or one of the wrong dimension', () => {
    const raw = load('pendulum-input-sigma');
    const withE1 = (patch: Record<string, unknown>) => ({
      ...raw,
      observations: raw.observations.map((o) => (o.id === 'e1' ? { ...o, ...patch } : o)),
    });
    expect(refusal(() => parseStudy(withE1({ inputSigma: { mass: 1 } })))).toMatch(/inputSigma\.mass.*not a declared governing input/);
    expect(refusal(() => parseStudy(withE1({ inputSigma: { length: 0 } })))).toMatch(/inputSigma\.length\): must be positive/);
    expect(refusal(() => parseStudy(withE1({ inputSigma: { length: '1 kg' } })))).toMatch(/inputSigma\.length.*'kg' is \[mass\]/);
    const governing = [{ name: 'length', unit: 'm', sigma: '1 s' }, { name: 'gravity', unit: 'm/s^2' }];
    expect(refusal(() => parseStudy({ ...raw, governing }))).toMatch(/governing\[0\]\.sigma/);
  });
});

describe('probe study — declared correction family', () => {
  it('finds the finite-amplitude correction on exploratory rows spanning amplitudes, and it survives the holdout', async () => {
    const r = await run(load('pendulum-large-amplitude'));
    const base = r.candidates.find((c) => !c.correction)!;
    expect(base.credible).toBe(false);
    expect(base.exploratory!.pass).toBe(false);
    const c = selectedOf(r);
    expect(c.correction!.input).toBe('amplitude');
    expect(c.correction!.terms.map((t) => t.power)).toEqual([2]);
    expect(c.fittedParameters).toBe(2);
    expect(r.verdict).toBe('survives-holdout');
    expect(c.holdout!.pass).toBe(true);
    expect(r.correction!.perCandidate[0]!.steps.map((s) => s.admitted)).toEqual([true, false]);

    // Independent check: the same one-term family fit to the noise-free generating law on the same design.
    const rows = load('pendulum-large-amplitude').observations.filter((o) => o.role === 'exploratory');
    const study = parseStudy(load('pendulum-large-amplitude'));
    const ex = study.observations.filter((o) => o.role === 'exploratory');
    expect(ex).toHaveLength(rows.length);
    const T0 = (o: StudyObservation) => 2 * Math.PI * Math.sqrt(o.inputs.length! / o.inputs.gravity!);
    const X = ex.map((o) => [T0(o), T0(o) * o.inputs.amplitude! ** 2]);
    const exact = lsq(X, ex.map((o) => exactPeriod(o.inputs.length!, o.inputs.gravity!, o.inputs.amplitude!)), ex.map(() => 0.002));
    const c1 = exact.coef[1]! / exact.coef[0]!;
    expect(c.correction!.terms[0]!.coefficient).toBeCloseTo(c1, 2);
    expect(Math.abs(c.correction!.terms[0]!.coefficient - c1)).toBeLessThan(0.003);
    expect(Math.abs(c.prefactor! / (2 * Math.PI) - 1)).toBeLessThan(2e-3);
  });

  it('paired check: without the declared family the same rows give no credible candidate', async () => {
    const { correction: _c, ...raw } = load('pendulum-large-amplitude');
    const r = await run(raw);
    expect(r.verdict).toBe('no-credible-candidate');
    expect(r.correction).toBeNull();
  });

  it('on pure noise the family admits no term and nothing is credible', async () => {
    const r = await run(load('noise-amplitude'));
    expect(r.nullModel.exploratory!.pass).toBe(false);
    expect(r.verdict).toBe('no-credible-candidate');
    expect(r.candidates.every((c) => !c.correction && !c.credible)).toBe(true);
    expect(r.correction!.perCandidate[0]!.steps.every((s) => !s.admitted)).toBe(true);
    const pure = await run(load('pure-noise'));
    expect(pure.verdict).toBe('no-credible-candidate');
  });

  it('paired check: admitting every declared term WOULD make that noise pass with the constant rejected', () => {
    const study = parseStudy(load('noise-amplitude'));
    expect(study.provenance.source).toContain(`seed ${NOISE_AMPLITUDE_SEED}`);
    const ex = study.observations.filter((o) => o.role === 'exploratory');
    const powers = study.correction!.powers;
    const y = ex.map((o) => o.observed);
    const s = ex.map((o) => o.sigma);
    const constant = lsq(ex.map(() => [1]), y, s);
    const full = lsq(ex.map((o) => [1, ...powers.map((p) => o.inputs.amplitude! ** p)]), y, s);
    expect(chiSquareSurvival(constant.chi2, ex.length - 1)).toBeLessThan(study.alpha);
    expect(chiSquareSurvival(full.chi2, ex.length - 1 - powers.length)).toBeGreaterThanOrEqual(study.alpha);
  });

  it('over 60 noise seeds not chosen by outcome: no credible candidate, though the full family would pass on some', async () => {
    const raw = load('noise-amplitude');
    const powers = (raw.correction as { powers: number[] }).powers;
    let credible = 0;
    let wouldPass = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const observations = noiseAmplitudeRows(seed);
      const r = await run({ ...raw, observations });
      if (r.verdict !== 'no-credible-candidate') credible++;
      const ex = parseStudy({ ...raw, observations }).observations.filter((o) => o.role === 'exploratory');
      const y = ex.map((o) => o.observed);
      const s = ex.map((o) => o.sigma);
      const c0 = chiSquareSurvival(lsq(ex.map(() => [1]), y, s).chi2, ex.length - 1);
      const cf = chiSquareSurvival(lsq(ex.map((o) => [1, ...powers.map((p) => o.inputs.amplitude! ** p)]), y, s).chi2, ex.length - 1 - powers.length);
      if (c0 < 0.001 && cf >= 0.001) wouldPass++;
    }
    expect(credible).toBe(0);
    expect(wouldPass).toBeGreaterThan(5);
  }, 60_000);

  it('the family is searched only when declared: the regime-change control is unchanged', async () => {
    const r = await run(load('pendulum-regime-change'));
    expect(r.correction).toBeNull();
    expect(r.verdict).toBe('refuted-on-holdout');
  });

  it('refuses a dimensioned or undeclared input and bad powers', () => {
    const raw = load('pendulum-large-amplitude');
    const bad = (correction: unknown) => refusal(() => parseStudy({ ...raw, correction }));
    expect(bad({ input: 'length', powers: [2] })).toMatch(/'length' is \[length\]; a correction family needs a dimensionless input/);
    expect(bad({ input: 'mass', powers: [2] })).toMatch(/not a declared governing input/);
    expect(bad({ input: 'amplitude', powers: [] })).toMatch(/1 to 6 powers/);
    expect(bad({ input: 'amplitude', powers: [2, 2] })).toMatch(/distinct/);
    expect(bad({ input: 'amplitude', powers: [-2] })).toMatch(/positive/);
    expect(bad({ input: 'amplitude', powers: [2], extra: 1 })).toMatch(/undeclared key 'extra'/);
  });

  it('the report states the family, the admission criterion and each F step', async () => {
    const text = formatProbeStudy(await run(load('pendulum-large-amplitude')));
    expect(text).toMatch(/declared correction family: m\(x\)·\(1 \+ Σ c_k·amplitude\^p_k\).*extra-sum-of-squares F test at p < α = 0.001/);
    expect(text).toMatch(/amplitude\^2 admitted: F = .* on \(1, 12\)/);
    expect(text).toMatch(/amplitude\^4 not admitted/);
    expect(text).toMatch(/c₁ = 0\.06\d+ \(fit on exploratory rows\)/);
    expect(text).toMatch(/correction family in 'amplitude' was declared by the file/);
  });
});

describe('probe study — replication from a separate file', () => {
  const studyJson = path('pendulum-large-amplitude.synthetic.json');
  const repCsv = path('pendulum-large-amplitude.replication.synthetic.csv');
  const study = (): ProbeStudy => loadStudyFile(studyJson);
  const repRaw = () => studyCsvToRaw(csvText('pendulum-large-amplitude.replication.synthetic.csv'), 'rep.csv');

  it('tests the selected candidate on the replication file, in its own units and with its own provenance', async () => {
    const r = await runProbeStudy(loadStudyFile(studyJson, repCsv));
    expect(r.counts.replication).toBe(4);
    expect(r.replicationFile!.source).toBe(repCsv);
    expect(r.replicationFile!.provenance.synthetic).toBe(true);
    expect(r.replication).toBe('survives-replication');
    const text = formatProbeStudy(r);
    expect(text).toMatch(/replication file: .*replication\.synthetic\.csv — ⚠ SYNTHETIC DATA/);
    expect(text).toMatch(/UPT checked only that its source and acquisition differ/);
  });

  it('the replication file never touches the fit', async () => {
    const alone = await runProbeStudy(study());
    const joined = await runProbeStudy(loadStudyFile(studyJson, repCsv));
    const fit = (r: ProbeStudyResult) => r.candidates.map((c) => ({ id: c.id, prefactor: c.prefactor, exploratory: c.exploratory, correction: c.correction }));
    expect(fit(joined)).toEqual(fit(alone));
    expect(joined.selected).toBe(alone.selected);
  });

  it('refuses a replication file whose source or acquisition is the study\'s', () => {
    const s = study();
    const raw = repRaw();
    const prov = raw.provenance as Record<string, unknown>;
    expect(refusal(() => attachReplication(s, { ...raw, provenance: { ...prov, source: s.provenance.source } }, 'rep'))).toMatch(
      /rep provenance\.source.*the study's own source/,
    );
    expect(refusal(() => attachReplication(s, { ...raw, provenance: { ...prov, acquisition: s.provenance.acquisition } }, 'rep'))).toMatch(
      /rep provenance\.acquisition.*the study's own acquisition/,
    );
  });

  it('negative control: the study\'s own rows under a new source name are detected as the same data', () => {
    const s = study();
    const raw = load('pendulum-large-amplitude');
    for (const role of ['exploratory', 'holdout']) {
      const copied = raw.observations
        .filter((o) => o.role === role)
        .map((o) => ({ ...o, id: `copy-${o.id as string}`, role: 'replication' }));
      const renamed = {
        provenance: { synthetic: true, source: 'a brand-new lab', acquisition: 'a brand-new acquisition' },
        target: raw.target,
        governing: raw.governing,
        observations: copied,
      };
      expect(refusal(() => attachReplication(s, renamed, 'renamed.json')), role).toMatch(
        new RegExp(`replication row is identical \\(inputs, observed, σ\\) to ${role} row \\w+ .*same data under another source name`),
      );
    }
  });

  it('paired check: the same holdout inputs re-measured (values differ) are accepted as replication', () => {
    const s = study();
    const raw = load('pendulum-large-amplitude');
    const remeasured = raw.observations
      .filter((o) => o.role === 'holdout')
      .map((o) => ({ ...o, id: `re-${o.id as string}`, role: 'replication', observed: `${parseFloat(String(o.observed)) + 0.001} s` }));
    const file = { provenance: { synthetic: true, source: 'a second lab' }, target: raw.target, governing: raw.governing, observations: remeasured };
    expect(attachReplication(s, file, 'rep.json').observations.filter((o) => o.role === 'replication')).toHaveLength(5);
  });

  it('refuses study-only keys, other roles, a different target or inputs, clashing ids, and a second replication source', () => {
    const s = study();
    const raw = repRaw();
    const rows = raw.observations as Record<string, unknown>[];
    expect(refusal(() => attachReplication(s, { ...raw, baselines: [] }, 'rep'))).toMatch(/'baselines' belongs in the study file/);
    expect(refusal(() => attachReplication(s, { ...raw, observations: [{ ...rows[0]!, role: 'holdout' }] }, 'rep'))).toMatch(
      /replication rows only \(got 'holdout'\)/,
    );
    expect(refusal(() => attachReplication(s, { ...raw, target: { name: 'time', unit: 's', sigma: '2 ms' } }, 'rep'))).toMatch(
      /rep target.*must be 'period'/,
    );
    const gov = (raw.governing as Record<string, unknown>[]).filter((g) => g.name !== 'amplitude');
    const noAmp = rows.map((o) => ({ ...o, values: { length: (o.values as Record<string, unknown>).length, gravity: 9.81 } }));
    expect(refusal(() => attachReplication(s, { ...raw, governing: gov, observations: noAmp }, 'rep'))).toMatch(/rep governing.*same dimensions/);
    expect(refusal(() => attachReplication(s, { ...raw, observations: [{ ...rows[0]!, id: 'e1' }] }, 'rep'))).toMatch(/id is also used in the study/);
    const withRep = attachReplication(s, raw, 'rep');
    expect(refusal(() => attachReplication(withRep, raw, 'rep2'))).toMatch(/already has replication rows/);
  });
});

describe('probe study — new synthetic fixtures', () => {
  it('each declares itself synthetic; the CSV twin renders from the same object as its JSON', () => {
    for (const f of ['pendulum-large-amplitude', 'pendulum-input-sigma', 'noise-amplitude']) {
      const raw = load(f);
      expect(raw.description).toMatch(/^SYNTHETIC/);
      expect((raw.provenance as { synthetic: boolean }).synthetic).toBe(true);
    }
    for (const f of ['pendulum-large-amplitude.synthetic.csv', 'pendulum-large-amplitude.replication.synthetic.csv']) {
      const raw = studyCsvToRaw(csvText(f), f);
      expect(raw.description).toMatch(/^SYNTHETIC/);
      expect(raw.provenance).toMatchObject({ synthetic: true });
    }
    expect(renderCsv(load('pendulum-large-amplitude'))).toBe(csvText('pendulum-large-amplitude.synthetic.csv'));
  });
});
