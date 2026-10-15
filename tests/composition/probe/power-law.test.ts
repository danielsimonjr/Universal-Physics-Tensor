/**
 * Power-law discovery in the probe (proposal 8). When the Buckingham analysis leaves k ≥ 1
 * π-groups among the governing variables, the native generator used to search nothing. It now
 * fits log(y/base) = log C + Σ aₖ log πₖ on the exploratory rows by MathTS `ols` (columns scaled
 * to order one), rationalises each aₖ that lies within 2·stderr of a fraction with denominator ≤ 6,
 * and sends the candidate base·Π πₖ^{aₖ} down the existing fit and holdout path. Generation reads
 * the exploratory rows only. In frontier.ts the identifiability count is the rank of the
 * log-design matrix (MathTS `matrixRank`), not the row count.
 *
 * The synthetic family below is a positive control whose law was chosen knowing the answer; it
 * shows the fit recovers a rational power law it was built to recover, not that it finds unknown ones.
 */
import { describe, it, expect } from 'vitest';
import { buckinghamPi } from '../../../src/dimensional/buckingham.js';
import { dim } from '../../../src/dimensional/ast-builders.js';
import { generateNative, powerLawDetermination, type RawCandidate } from '../../../src/composition/probe/generator.js';
import { openBudget } from '../../../src/composition/probe/search-budget.js';
import { problemFromResidualGap } from '../../../src/composition/probe/frontier.js';
import { makeResidualGap } from '../../../src/composition/probe/problem.js';
import { datasetFromRows } from '../../../src/composition/probe/dataset.js';
import { runProbeSearch } from '../../../src/composition/probe/pipeline.js';
import { estimateScaleExponent } from '../../../src/composition/probe/structure.js';
import type { ObservationRow, SearchProblem } from '../../../src/composition/probe/types.js';

/** Deterministic noise: mulberry32, then Box–Muller. */
function noise(seed: number): { uniform: () => number; normal: () => number } {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  return { uniform, normal };
}

// Two lengths and two times govern a speed: the base monomial is a/c and the π-groups are a/b and c/d.
const speed = { name: 'y', dim: dim(1, 0, -1) };
const governing = [
  { name: 'a', dim: dim(1) },
  { name: 'b', dim: dim(1) },
  { name: 'c', dim: dim(0, 0, 1) },
  { name: 'd', dim: dim(0, 0, 1) },
];
/** The true law: y = C · (a/c) · (a/b)^{1/2} · (c/d)^{-1} = C · a^{3/2} b^{-1/2} c^{-2} d. */
const TRUE_EXPONENTS = { a: 1.5, b: -0.5, c: -2, d: 1 };
const C = 3.7;
const law = (r: Record<string, number>) => C * r.a! ** 1.5 * r.b! ** -0.5 * r.c! ** -2 * r.d!;

function rows(seed: number, n: number, y: (r: Record<string, number>, g: () => number) => number): ObservationRow[] {
  const { uniform, normal } = noise(seed);
  const out: ObservationRow[] = [];
  for (let i = 0; i < n; i++) {
    const r = { a: 0.5 + 3 * uniform(), b: 0.2 + 2 * uniform(), c: 0.1 + 1 * uniform(), d: 0.3 + 2 * uniform() };
    out.push({ ...r, y: y(r, normal) });
  }
  return out;
}

/** 2% multiplicative noise on the true law. */
const family = (seed: number, n: number) => rows(seed, n, (r, g) => law(r) * Math.exp(0.02 * g()));
/** A null family: y is lognormal noise with no dependence on the inputs. */
const nullFamily = (seed: number, n: number) => rows(seed, n, (_r, g) => 2 * Math.exp(0.5 * g()));

function problemOf(exploratory: ObservationRow[], holdout?: ObservationRow[]): SearchProblem {
  return problemFromResidualGap(
    makeResidualGap('fg-power-law', 'a speed from two lengths and two times'),
    speed,
    governing,
    datasetFromRows(exploratory, 'y', 'exploratory-fit', 'e'),
    holdout ? datasetFromRows(holdout, 'y', 'validation-holdout', 'h') : undefined,
  );
}

const monomialOf = (c: RawCandidate) => c.monomial ?? {};

describe('power-law determination from the exploratory rows', () => {
  const problem = problemOf(family(1, 24), family(2, 8));

  it('the Buckingham analysis leaves two π-groups, so the plain monomial path has nothing', () => {
    expect(buckinghamPi(governing).piGroupCount).toBe(2);
  });

  it('recovers y = C π₁^{1/2} π₂^{-1}: each exponent rationalised inside its 2σ interval, the monomial exact', () => {
    const pl = powerLawDetermination(problem);
    expect(pl.kind).toBe('fit');
    if (pl.kind !== 'fit') return;
    expect(pl.nRows).toBe(24);
    expect(pl.r2).toBeGreaterThan(0.99);
    expect(Math.exp(pl.logPrefactor)).toBeCloseTo(C, 0);
    expect(pl.exponents).toHaveLength(2);
    for (const e of pl.exponents) {
      // The true exponent of this π-group: the component of (true − base) along the group's exponent vector.
      const diff = Object.fromEntries(Object.keys(TRUE_EXPONENTS).map((k) => [k, TRUE_EXPONENTS[k as keyof typeof TRUE_EXPONENTS] - (pl.base[k] ?? 0)]));
      const num = Object.entries(e.exponents).reduce((s, [k, v]) => s + v * (diff[k] ?? 0), 0);
      const den = Object.values(e.exponents).reduce((s, v) => s + v * v, 0);
      const truth = num / den;
      expect(e.rational).not.toBeNull();
      expect(e.rational!.numerator / e.rational!.denominator).toBe(truth);
      expect(e.interval[0]).toBeLessThanOrEqual(truth);
      expect(e.interval[1]).toBeGreaterThanOrEqual(truth);
      expect(e.stderr).toBeGreaterThan(0);
      expect(e.stderr).toBeLessThan(0.1);
    }
    for (const [k, v] of Object.entries(TRUE_EXPONENTS)) expect(pl.monomial[k]).toBeCloseTo(v, 12);
  });

  it('the generator emits the power-law candidate beside nothing else, blind to the holdout rows', () => {
    const got = [...generateNative(problem, openBudget())];
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((c) => c.originNote.startsWith('power-law'))).toBe(true);
    const monomial = monomialOf(got[0]!);
    for (const [k, v] of Object.entries(TRUE_EXPONENTS)) expect(monomial[k]).toBeCloseTo(v, 12);
    expect(got[0]!.powerLaw?.kind).toBe('fit');
    // Paired check: scaling every holdout observation by 3 changes nothing the generator emits.
    const other = problemOf(family(1, 24), family(2, 8).map((r) => ({ ...r, y: r.y! * 3 })));
    expect(JSON.stringify([...generateNative(other, openBudget())])).toBe(JSON.stringify(got));
    // And a problem without exploratory rows emits nothing: the fit needs data.
    expect([...generateNative(problemOf([]), openBudget())]).toEqual([]);
  });

  it('the pipeline fits and holds out the candidate like any other: it survives and reaches expert review', async () => {
    const r = await runProbeSearch(problem, { now: '2026-10-15T00:00:00.000Z' });
    const survivors = r.candidates.filter((c) => c.status === 'expert-review-required');
    expect(survivors.length).toBeGreaterThanOrEqual(1);
    const fit = r.fits[survivors[0]!.id]!;
    expect(fit.holdoutSupported).toBe(true);
    expect(Math.abs(fit.prefactor / C - 1)).toBeLessThan(0.02);
    expect(r.wording.some((w) => /power law from the exploratory rows/.test(w))).toBe(true);
  });

  it('a null family is not recovered: no candidate survives the holdout', async () => {
    const r = await runProbeSearch(problemOf(nullFamily(5, 24), nullFamily(6, 8)), { now: '2026-10-15T00:00:00.000Z' });
    expect(r.candidates.every((c) => c.status === 'rejected' || c.status === 'falsified' || c.status === 'insufficient-evidence')).toBe(true);
    expect(r.stopReason).toBe('no-credible-candidate');
  });

  it('abstains, saying why, when an exponent is not a small rational within 2σ, or when a π-group does not vary', () => {
    // y ∝ base · π₁^{0.37}: no fraction with denominator ≤ 6 lies within 2σ of 0.37 at 2% noise on 24 rows.
    const irrational = rows(9, 24, (r, g) => C * (r.a! / r.c!) * (r.a! / r.b!) ** 0.37 * Math.exp(0.02 * g()));
    const pl = powerLawDetermination(problemOf(irrational));
    expect(pl.kind).toBe('abstained');
    if (pl.kind === 'abstained') expect(pl.reason).toMatch(/not within 2σ of a fraction with denominator ≤ 6/);
    // b = a on every row: π₁ is 1 everywhere (up to an ulp, which is not evidence), so its exponent is not identifiable.
    const constant = family(1, 24).map((r) => ({ ...r, b: r.a! }));
    const c = powerLawDetermination(problemOf(constant));
    expect(c.kind).toBe('abstained');
    if (c.kind === 'abstained') expect(c.reason).toMatch(/does not vary/);
    // Five rows at 30% noise: the 2σ interval holds several admissible fractions, so nothing is determined.
    const vague = rows(13, 5, (r, g) => law(r) * Math.exp(0.3 * g()));
    const v = powerLawDetermination(problemOf(vague));
    expect(v.kind).toBe('abstained');
    if (v.kind === 'abstained') expect(v.reason).toMatch(/its 2σ interval holds \d+ fractions .*so the rows do not determine it/);
    // A target the governing set determines has no π-group to fit: not applicable.
    const period = { name: 'period', dim: dim(0, 0, 1) };
    const det = powerLawDetermination(problemFromResidualGap(makeResidualGap('fg-det', 'd'), period, [{ name: 'length', dim: dim(1) }, { name: 'gravity', dim: dim(1, 0, -2) }]));
    expect(det.kind).toBe('not-applicable');
  });
});

describe('frontier identifiability is the rank of the log-design, not the row count', () => {
  const gap = makeResidualGap('fg-rank', 'rank');
  const explore = (list: ObservationRow[]) => datasetFromRows(list, 'y', 'exploratory-fit', 'e');

  it('a rank-deficient design (c/d = (a/b)² on every row) counts 2 independent observations of 6, and says so', () => {
    const deficient = family(3, 6).map((r) => {
      const pi1 = r.a! / r.b!;
      return { ...r, d: r.c! / pi1 ** 2 };
    });
    const p = problemFromResidualGap(gap, speed, governing, explore(deficient));
    const par = p.gap.identifiability.parametric!;
    expect(par.nObservations).toBe(6);
    expect(par.nParameters).toBe(3);
    expect(par.rank).toBe(2);
    expect(par.nIndependentObservations).toBe(2);
    expect(par.status).toBe('partially-identifiable');
    expect(par.reasons.join(' ')).toMatch(/rank 2 of the log-design/);
    expect(p.gap.searchability.searchable).toBe(true);
  });

  it('a full-rank design counts 3 of 6 and is identifiable; with no π-group the count is 1 as before', () => {
    const p = problemFromResidualGap(gap, speed, governing, explore(family(4, 6)));
    const par = p.gap.identifiability.parametric!;
    expect(par.rank).toBe(3);
    expect(par.nIndependentObservations).toBe(3);
    expect(par.nObservations).toBe(6);
    expect(par.status).toBe('identifiable');
    const period = { name: 'period', dim: dim(0, 0, 1) };
    const simple = problemFromResidualGap(
      makeResidualGap('fg-simple', 's'),
      period,
      [{ name: 'length', dim: dim(1) }, { name: 'gravity', dim: dim(1, 0, -2) }],
      datasetFromRows([{ length: 1, gravity: 9.8, period: 2 }, { length: 2, gravity: 9.8, period: 2.8 }], 'period', 'exploratory-fit', 'e'),
    );
    const sp = simple.gap.identifiability.parametric!;
    expect(sp.nParameters).toBe(1);
    expect(sp.rank).toBe(1);
    expect(sp.nIndependentObservations).toBe(1);
    expect(sp.nObservations).toBe(2);
    expect(sp.status).toBe('identifiable');
  });

  it('no observations stay unknown and searchable, as before', () => {
    const p = problemFromResidualGap(gap, speed, governing);
    expect(p.gap.identifiability.parametric!.status).toBe('unknown');
    expect(p.gap.searchability.searchable).toBe(true);
  });
});

describe('the scale-exponent probe keeps its standard error (item 1 of the batch on structure.ts)', () => {
  it('reports stdErr beside the exponent', () => {
    const r = estimateScaleExponent({ x: [1, 2, 4, 8, 16], y: [2, 2.9, 4.1, 5.6, 8.1] });
    expect(r.exponent).toBeCloseTo(0.5, 1);
    expect(r.stdErr).toBeGreaterThan(0);
  });
});
