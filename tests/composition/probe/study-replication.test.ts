/**
 * `upt probe study`, the I19 limits (audit §14): replication rows that are
 * near-duplicates or affine copies of study rows, shared provenance, and
 * correction families in more than one dimensionless input.
 *
 * The copy test is Fisher's test of agreement too good to be true: rows of
 * an independent acquisition at the same inputs differ by about the declared
 * σ, so Σz² far below its χ² distribution means the rows are not
 * independent, or σ is overstated. Every threshold here is checked against a
 * Monte Carlo of honest re-measurements, where it can fail.
 *
 * The physical-pendulum fixture is SYNTHETIC and both families were declared
 * knowing its generating law. A recovery shows the machinery recovers a law it
 * was built to find; it is not a blind test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  attachReplication,
  chiSquareCdf,
  chiSquareSurvival,
  formatProbeStudy,
  loadStudyFile,
  parseStudy,
  replicationIndependence,
  runProbeStudy,
  StudyRefusal,
  type ProbeStudyResult,
  type StudyObservation,
} from '../../../src/composition/probe/study.js';
import { exactPeriod, physicalPeriod } from '../../fixtures/probe-study/generate.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/probe-study');
const path = (file: string) => join(dir, file);
type Raw = { observations: Record<string, unknown>[]; [k: string]: unknown };
const load = (name: string): Raw => JSON.parse(readFileSync(path(`${name}.synthetic.json`), 'utf8')) as Raw;
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

const obs = (id: string, role: StudyObservation['role'], x: number, observed: number, sigma = 0.002, source = role === 'replication' ? 'lab B' : 'lab A'): StudyObservation => ({
  id, role, source, inputs: { x }, observed, sigma, inputSigma: {},
});

/** Six holdout rows y = f(x) + noise and six replication rows at the same x from `rep`. */
function pairedRows(rep: (y: number, i: number) => number, seed = 1): StudyObservation[] {
  const rand = mulberry32(seed);
  const xs = [1, 1.4, 1.8, 2.2, 2.6, 3.0];
  const study = xs.map((x, i) => obs(`h${i + 1}`, 'holdout', x, x + 0.002 * normal(rand)));
  return [...study, ...study.map((s, i) => obs(`r${i + 1}`, 'replication', s.inputs.x!, rep(s.observed, i)))];
}

describe('chiSquareCdf', () => {
  it('matches the closed forms for ν = 2 and ν = 4, in the lower tail where 1 − Q would lose it', () => {
    for (const x of [1e-14, 1e-9, 1e-4, 0.5, 3, 20]) {
      const closed = -Math.expm1(-x / 2);
      expect(Math.abs(chiSquareCdf(x, 2) / closed - 1), `ν=2 x=${x}`).toBeLessThan(1e-10);
    }
    for (const x of [0.5, 3, 20]) {
      expect(chiSquareCdf(x, 4)).toBeCloseTo(1 - Math.exp(-x / 2) * (1 + x / 2), 12);
    }
    // ν = 4, small x: P = (x/2)²/2 − (x/2)³/3 + …
    expect(Math.abs(chiSquareCdf(1e-6, 4) / (0.5 * (5e-7) ** 2 - (5e-7) ** 3 / 3) - 1)).toBeLessThan(1e-9);
    expect(Math.abs(chiSquareCdf(1e-9, 4) / (0.5 * (5e-10) ** 2) - 1)).toBeLessThan(1e-9);
    // Paired check: 1 − Q, the naive lower tail, cannot resolve P ≈ 1e-19; it rounds to a multiple of 2⁻⁵³ (here 0).
    // (At x = 1e-6 it is only 9e-5 off in relative terms, so that point would not show the difference.)
    expect(Math.abs((1 - chiSquareSurvival(1e-9, 4)) / chiSquareCdf(1e-9, 4) - 1)).toBeGreaterThan(0.5);
    for (const [x, nu] of [[0.3, 1], [7, 5], [40, 30]] as const) {
      expect(chiSquareCdf(x, nu) + chiSquareSurvival(x, nu)).toBeCloseTo(1, 12);
    }
    expect(chiSquareCdf(0, 3)).toBe(0);
  });
});

describe('replication rows that copy study rows', () => {
  it('a copy shifted by 1e-7 s is too close; independent re-measurement at the same inputs is not', () => {
    const copy = replicationIndependence(pairedRows((y) => y + 1e-7), 0.001);
    expect(copy.pairs).toBe(6);
    expect(copy.identity!.flagged).toBe(true);
    expect(copy.identity!.pLower).toBeLessThan(1e-20);
    expect(copy.tooClose).toBe(true);
    expect(copy.reason).toMatch(/6 replication rows share their inputs with study rows/);
    expect(copy.reason).toMatch(/not independent, or σ is overstated/);

    const rand = mulberry32(77);
    const honest = replicationIndependence(pairedRows((_y, i) => [1, 1.4, 1.8, 2.2, 2.6, 3.0][i]! + 0.002 * normal(rand)), 0.001);
    expect(honest.pairs).toBe(6);
    expect(honest.tooClose).toBe(false);
  });

  it('an affine copy (y × 1.01) escapes the identity test and is caught by the affine one', () => {
    const r = replicationIndependence(pairedRows((y) => 1.01 * y), 0.001);
    // Each row differs by ~7σ, so the identity test sees disagreement, not closeness: it alone would pass this copy.
    expect(r.identity!.flagged).toBe(false);
    expect(r.identity!.pLower).toBeGreaterThan(0.999);
    expect(r.affine!.flagged).toBe(true);
    expect(r.affine!.slope).toBeCloseTo(1.01, 9);
    expect(r.affine!.offset).toBeCloseTo(0, 9);
    expect(r.affine!.dof).toBe(4);
    expect(r.tooClose).toBe(true);
    expect(r.reason).toMatch(/affine: y_rep = .* \+ 1\.01\d* · y_study/);

    const shifted = replicationIndependence(pairedRows((y) => y + 0.05), 0.001);
    expect(shifted.identity!.flagged).toBe(false);
    expect(shifted.affine!.flagged).toBe(true);
    expect(shifted.affine!.offset).toBeCloseTo(0.05, 9);
  });

  it('over 2000 honest re-measurements each test flags at its stated rate α/2 (here α = 0.2)', () => {
    const rand = mulberry32(2024);
    let identity = 0;
    let affine = 0;
    let either = 0;
    const n = 2000;
    for (let k = 0; k < n; k++) {
      const xs = [1, 1.3, 1.7, 2.0, 2.4, 2.9, 3.3];
      const rows = xs.flatMap((x, i) => [
        obs(`h${i}`, 'holdout', x, x + 0.002 * normal(rand)),
        obs(`r${i}`, 'replication', x, x + 0.002 * normal(rand)),
      ]);
      const r = replicationIndependence(rows, 0.2);
      if (r.identity!.flagged) identity++;
      if (r.affine!.flagged) affine++;
      if (r.tooClose) either++;
    }
    // Binomial sd at p = 0.1, n = 2000 is 0.0067; the bands are ±3 sd.
    expect(identity / n).toBeGreaterThan(0.08);
    expect(identity / n).toBeLessThan(0.12);
    expect(affine / n).toBeGreaterThan(0.08);
    expect(affine / n).toBeLessThan(0.12);
    expect(either / n).toBeLessThan(0.2 + 0.02);
  });

  it('pairs only rows at the same inputs (within the declared input σ); the rest are not tested', () => {
    const far = [obs('h1', 'holdout', 1, 1), obs('h2', 'holdout', 2, 2), obs('r1', 'replication', 1.5, 1.5), obs('r2', 'replication', 2.5, 2.5)];
    const r = replicationIndependence(far, 0.001);
    expect(r.pairs).toBe(0);
    expect(r.identity).toBeNull();
    expect(r.tooClose).toBe(false);
    expect(r.reason).toMatch(/no replication row shares its inputs with a study row/);

    // With an input σ, a re-measured input within 3σ pairs, and a copy of its row is caught.
    const withSigma = (o: StudyObservation): StudyObservation => ({ ...o, inputSigma: { x: 0.01 } });
    const near = [obs('h1', 'holdout', 1, 1), obs('r1', 'replication', 1.015, 1 + 1e-9)].map(withSigma);
    const s = replicationIndependence(near, 0.001);
    expect(s.pairs).toBe(1);
    expect(s.tooClose).toBe(true);
    // Paired check: without the input σ the same rows do not pair.
    expect(replicationIndependence(near.map((o) => ({ ...o, inputSigma: {} })), 0.001).pairs).toBe(0);
  });

  it('in a study: a near-copy of the holdout from a "new lab" makes replication too-close; re-measured it survives', async () => {
    const studyJson = path('pendulum-large-amplitude.synthetic.json');
    const raw = load('pendulum-large-amplitude');
    const holdout = raw.observations.filter((o) => o.role === 'holdout');
    const file = (observations: Record<string, unknown>[]) => ({
      provenance: { synthetic: true, source: 'a brand-new lab', acquisition: 'a brand-new acquisition' },
      target: raw.target,
      governing: raw.governing,
      observations,
    });
    const nearCopy = holdout.map((o) => ({ ...o, id: `c-${o.id as string}`, role: 'replication', observed: `${parseFloat(String(o.observed)) + 1e-6} s` }));
    const s = loadStudyFile(studyJson);
    const copied = await runProbeStudy(attachReplication(s, file(nearCopy), 'copy.json'));
    expect(copied.replication).toBe('too-close');
    expect(copied.replicationIndependence.tooClose).toBe(true);
    expect(copied.verdict).toBe('survives-holdout');
    const text = formatProbeStudy(copied);
    expect(text).toMatch(/replication: too-close/);
    expect(text).toMatch(/5 replication rows share their inputs with study rows/);

    const rand = mulberry32(99);
    const inputsOf = parseStudy(raw).observations.filter((o) => o.role === 'holdout').map((o) => o.inputs);
    const remeasured = holdout.map((o, i) => ({
      ...o,
      id: `m-${o.id as string}`,
      role: 'replication',
      observed: `${(exactPeriod(inputsOf[i]!.length!, inputsOf[i]!.gravity!, inputsOf[i]!.amplitude!) + 0.002 * normal(rand)).toPrecision(6)} s`,
    }));
    const fresh = await runProbeStudy(attachReplication(s, file(remeasured), 'fresh.json'));
    expect(fresh.replicationIndependence.pairs).toBe(5);
    expect(fresh.replicationIndependence.tooClose).toBe(false);
    expect(fresh.replication).toBe('survives-replication');
  });
});

describe('shared provenance', () => {
  const studyJson = path('pendulum-large-amplitude.synthetic.json');
  const repCsv = path('pendulum-large-amplitude.replication.synthetic.csv');

  it("refuses a replication file whose source or acquisition is the study's up to case, spacing and punctuation", () => {
    const s = loadStudyFile(studyJson);
    const raw = load('pendulum-large-amplitude');
    const file = (provenance: Record<string, unknown>) => ({
      provenance,
      target: raw.target,
      governing: raw.governing,
      observations: [{ id: 'r1', role: 'replication', values: { length: 3, gravity: 9.81, amplitude: 0.3 }, observed: '3.5 s' }],
    });
    const source = s.provenance.source;
    expect(refusal(() => attachReplication(s, file({ synthetic: true, source: source.toUpperCase() }), 'rep'))).toMatch(/the study's own source/);
    expect(refusal(() => attachReplication(s, file({ synthetic: true, source: ` ${source.replace(/[/()]/g, ' - ')} ` }), 'rep'))).toMatch(
      /the study's own source/,
    );
    const acquisition = s.provenance.acquisition!;
    expect(refusal(() => attachReplication(s, file({ synthetic: true, source: 'lab B', acquisition: acquisition.toLowerCase() }), 'rep'))).toMatch(
      /the study's own acquisition/,
    );
    // Paired check: a different source and acquisition are accepted.
    expect(attachReplication(s, file({ synthetic: true, source: 'lab B', acquisition: 'another run' }), 'rep').observations.at(-1)!.id).toBe('r1');
  });

  it("refuses an inline replication row whose source is a fit row's up to case and spacing", () => {
    const raw = load('pendulum-regime-change');
    const fitSource = (raw.provenance as { source: string }).source;
    const observations = raw.observations.map((o) => (o.role === 'replication' ? { ...o, source: `  ${fitSource.toUpperCase()}` } : o));
    expect(refusal(() => parseStudy({ ...raw, observations }))).toMatch(/replication row has source .* which also supplied exploratory rows/);
    expect(parseStudy(raw).observations.some((o) => o.role === 'replication')).toBe(true);
  });

  it('a replication file that declares the study calibration is reported: the calibration is not tested', async () => {
    const s = loadStudyFile(studyJson);
    const raw = load('pendulum-large-amplitude');
    const file = (calibration?: string) => ({
      provenance: { synthetic: true, source: 'lab B', ...(calibration ? { calibration } : {}) },
      target: raw.target,
      governing: raw.governing,
      observations: [{ id: 'r1', role: 'replication', values: { length: 3, gravity: 9.81, amplitude: 0.3 }, observed: `${exactPeriod(3, 9.81, 0.3).toPrecision(6)} s` }],
    });
    const shared = await runProbeStudy(attachReplication(s, file(s.provenance.calibration!.toUpperCase()), 'rep'));
    expect(shared.caveats.join('\n')).toMatch(/declares the study's own calibration/);
    const other = await runProbeStudy(attachReplication(s, file('a second instrument, calibrated separately'), 'rep'));
    expect(other.caveats.join('\n')).not.toMatch(/declares the study's own calibration/);
  });

  it('inline replication rows are reported as sharing the study provenance block', async () => {
    const inline = await run(load('pendulum-regime-change'));
    expect(inline.caveats.join('\n')).toMatch(/replication rows are in the study file and share its provenance block/);
    const separate = await runProbeStudy(loadStudyFile(studyJson, repCsv));
    expect(separate.caveats.join('\n')).not.toMatch(/replication rows are in the study file/);
  });
});

describe('correction families in several dimensionless inputs', () => {
  it("the fixture's physical-pendulum period agrees with RK4 on I θ'' = −mgL sin θ", () => {
    for (const [L, theta0, rho] of [[1, 0.3, 0.35], [2, 1.0, 0.1], [0.5, 0.05, 0.25]] as const) {
      const w2 = 9.81 / (L * (1 + 0.4 * rho * rho));
      const f = (th: number) => -w2 * Math.sin(th);
      let th: number = theta0;
      let om = 0;
      let t = 0;
      const dt = 1e-5;
      for (;;) {
        const k1t = om, k1o = f(th);
        const k2t = om + (dt / 2) * k1o, k2o = f(th + (dt / 2) * k1t);
        const k3t = om + (dt / 2) * k2o, k3o = f(th + (dt / 2) * k2t);
        const k4t = om + dt * k3o, k4o = f(th + dt * k3t);
        const nth = th + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
        const nom = om + (dt / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
        if (nth <= 0) {
          // Linear interpolation of θ over the last step to its zero; the error is O(dt²·θ'').
          t += dt * (th / (th - nth));
          break;
        }
        th = nth;
        om = nom;
        t += dt;
      }
      expect(Math.abs((4 * t) / physicalPeriod(L, 9.81, theta0, rho) - 1), `L=${L} θ0=${theta0} ρ=${rho}`).toBeLessThan(1e-7);
    }
  });

  it('parses a list of families and refuses an empty list, a repeated input and more than 6 powers in all', () => {
    const raw = load('pendulum-physical');
    const s = parseStudy(raw);
    expect(s.correction).toEqual([
      { input: 'amplitude', powers: [2, 4] },
      { input: 'bob_ratio', powers: [2, 4] },
    ]);
    expect(parseStudy(load('pendulum-large-amplitude')).correction).toEqual([{ input: 'amplitude', powers: [2, 4] }]);
    const bad = (correction: unknown) => refusal(() => parseStudy({ ...raw, correction }));
    expect(bad([])).toMatch(/\(correction\): must list at least one family/);
    expect(bad([{ input: 'amplitude', powers: [2] }, { input: 'amplitude', powers: [4] }])).toMatch(
      /\(correction\[1\]\.input\): 'amplitude' already has a family/,
    );
    expect(bad([{ input: 'amplitude', powers: [2, 4, 6, 8] }, { input: 'bob_ratio', powers: [2, 4, 6] }])).toMatch(
      /\(correction\): lists 7 powers across its families; at most 6/,
    );
    expect(bad([{ input: 'amplitude', powers: [2] }, { input: 'length', powers: [2] }])).toMatch(
      /\(correction\[1\]\.input\): 'length' is .*; a correction family needs a dimensionless input/,
    );
  });

  it('recovers terms in both inputs, the recovery survives the holdout, and each one-family study finds nothing', async () => {
    const raw = load('pendulum-physical');
    const r = await run(raw);
    expect(r.verdict).toBe('survives-holdout');
    const c = selectedOf(r);
    const inputs = c.correction!.terms.map((t) => t.input);
    expect(inputs).toContain('amplitude');
    expect(inputs).toContain('bob_ratio');
    expect(c.holdout!.pass).toBe(true);

    // Independent check: the same admitted basis fit by the test's own least squares to the noise-free law.
    const ex = parseStudy(raw).observations.filter((o) => o.role === 'exploratory');
    const T0 = (o: StudyObservation) => 2 * Math.PI * Math.sqrt(o.inputs.length! / o.inputs.gravity!);
    const basis = (o: StudyObservation) => [T0(o), ...c.correction!.terms.map((t) => T0(o) * o.inputs[t.input]! ** t.power)];
    const exact = ex.map((o) => physicalPeriod(o.inputs.length!, o.inputs.gravity!, o.inputs.amplitude!, o.inputs.bob_ratio!));
    const coef = lsq(ex.map(basis), exact, ex.map(() => 0.005));
    for (const [j, t] of c.correction!.terms.entries()) {
      expect(Math.abs(t.coefficient - coef[j + 1]! / coef[0]!), `${t.input}^${t.power}`).toBeLessThan(0.03);
    }
    // √(1 + (2/5)ρ²) = 1 + ρ²/5 − ρ⁴/50 + …: the fitted ρ² coefficient is near 1/5.
    const rho2 = c.correction!.terms.find((t) => t.input === 'bob_ratio' && t.power === 2)!;
    expect(Math.abs(rho2.coefficient - 0.2)).toBeLessThan(0.05);

    // Paired checks: either family alone leaves the other effect in the residuals.
    for (const one of [{ input: 'amplitude', powers: [2, 4] }, { input: 'bob_ratio', powers: [2, 4] }]) {
      const alone = await run({ ...raw, correction: one });
      expect(alone.verdict, one.input).toBe('no-credible-candidate');
    }
  });

  it('the report names every family, the order they are admitted in, and that they are additive', async () => {
    const r = await run(load('pendulum-physical'));
    const text = formatProbeStudy(r);
    expect(text).toMatch(/declared correction families: m\(x\)·\(1 \+ Σ c_k·amplitude\^p_k \+ Σ c_k·bob_ratio\^p_k\)/);
    expect(text).toMatch(/family by family/);
    expect(text).toMatch(/bob_ratio\^2 admitted: F = /);
    expect(r.caveats.join('\n')).toMatch(/correction families in 'amplitude', 'bob_ratio' were declared by the file/);
    expect(r.caveats.join('\n')).toMatch(/additive: a cross term .* is not in them/);
    // Paired check: a one-family study keeps its one-family wording.
    const single = formatProbeStudy(await run(load('pendulum-large-amplitude')));
    expect(single).toMatch(/declared correction family: m\(x\)·\(1 \+ Σ c_k·amplitude\^p_k\) for each/);
    expect(single).not.toMatch(/family by family/);
  });
});

/** Weighted least squares by the normal equations, independent of the engine's solver. */
function lsq(X: number[][], y: number[], sigma: number[]): number[] {
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
  return A.map((r, a) => r[k]! / r[a]!);
}
