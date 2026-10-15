/**
 * Proposal 18, second half: a Monte-Carlo second method for the GUM
 * propagation behind `upt evaluate --sigma/--corr`.
 *
 * `propagateEvaluatorUncertainty` folds first-order sensitivities with a
 * correlation table. Here correlated inputs are DRAWN (MathTS `mvnSample`,
 * seeded, so the numbers are reproducible), the evaluator is run on every
 * draw, and the sample standard deviation is compared with the propagated u.
 * A monomial evaluator agrees to the Monte-Carlo error; a singular ρ = 1 is
 * drawn with a jittered covariance; and the quadratic evaluator the
 * curvature check flags shows the first-order u short of the sampled std by
 * the amount the second-order term predicts.
 */
import { describe, expect, it } from 'vitest';
import { mvnSample } from '@danielsimonjr/mathts-functions';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { propagateEvaluatorUncertainty, type CorrelationTable } from '../../src/numerical/evaluator-uncertainty.js';

const SEED = 20261015;
/** Draws for the two monomial checks. Each draw runs the evaluator (about 1 ms each). */
const DRAWS = 5000;
/** Draws for the curvature check, which has a second-order term of a few percent to resolve. */
const CURVATURE_DRAWS = 20000;
/**
 * The standard error of a sample std of a Gaussian output over 5000 draws is about
 * 1/√(2·5000) ≈ 1%; 3% is three of those. Measured on this tree, 2026-10-15, with this seed:
 * sampled/propagated 0.9908 (be-76, correlated) and 0.9906 (be-76, ρ = 1, jittered), at 5000
 * draws; 1.0426 (be-74, σ_B = 0.5 B, 20000 draws) against the second-order prediction 1.0607.
 * A plain Gaussian draw (Math.random, 200 repetitions) gives a mean of 1.0606 and a spread of
 * 0.81% at that size, so this seed's be-74 value is 1.7% (2.2 spreads) under the prediction: the
 * draw resolves the sign of the second-order term, not its size. Every measured ratio here,
 * and the 20000-draw run at σ_B = 0.3 B that was replaced (1.0083 against 1.0223), came out
 * under its expectation. That is sampling, not a biased sampler: `tests/numerical/mvn-sample-bias.test.ts`
 * measures `mvnSample`'s covariance and kurtosis as unbiased, the be-74 ratio over 60 seeds as √1.125, and
 * this seed's first 20000 standard normals as having sample std 0.9917; every check here draws with
 * that one seed, so its readings are not independent and come out low together.
 * MathTS `mvnSample` also drew the exactly singular ρ = 1 covariance without error; the jitter
 * is kept so the draw does not depend on how its factorization treats a zero pivot.
 */
const MC_TOLERANCE = 0.03;

function evaluatorOf(id: number): (inputs: Record<string, number>) => Record<string, unknown> {
  const spec = BRIDGE_EVALUATORS.get(id);
  if (spec === undefined) throw new Error(`no evaluator ${id}`);
  return (inputs) => spec.run(inputs, 'all');
}

function sampleStd(values: readonly number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const ss = values.reduce((s, v) => s + (v - mean) * (v - mean), 0);
  return Math.sqrt(ss / (values.length - 1));
}

function covariance(keys: readonly string[], sigma: Record<string, number>, corr: CorrelationTable, jitter = 0): number[][] {
  const rho = (i: string, j: string): number => (i === j ? 1 : (corr.get(`${i},${j}`) ?? corr.get(`${j},${i}`) ?? 0));
  return keys.map((i) => keys.map((j) => sigma[i]! * sigma[j]! * rho(i, j) + (i === j ? jitter * sigma[i]! * sigma[i]! : 0)));
}

function monteCarloStd(
  f: (inputs: Record<string, number>) => Record<string, unknown>,
  inputs: Record<string, number>,
  sigma: Record<string, number>,
  corr: CorrelationTable,
  jitter = 0,
  count = DRAWS,
): number {
  const keys = Object.keys(sigma);
  const draws = mvnSample(
    keys.map((k) => inputs[k]!),
    covariance(keys, sigma, corr, jitter),
    count,
    { seed: SEED },
  );
  const values = draws.map((row) => {
    const point = { ...inputs };
    keys.forEach((k, i) => {
      point[k] = row[i]!;
    });
    const v = f(point).value;
    if (typeof v !== 'number') throw new TypeError('evaluator value is not a number');
    return v;
  });
  return sampleStd(values);
}

describe('GUM propagation against seeded Monte Carlo', () => {
  it('the plasma beta (be-76, a monomial n k T / p_B) with correlated inputs: sampled std agrees with u to the MC error', () => {
    const f = evaluatorOf(76);
    const inputs = { n_per_m3: 1e20, T_K: 1e7, p_B_Pa: 4000 };
    const sigma = { n_per_m3: 1e18, T_K: 1e5, p_B_Pa: 40 }; // 1% each
    const corr: CorrelationTable = new Map([
      ['n_per_m3,T_K', 0.6],
      ['n_per_m3,p_B_Pa', -0.3],
    ]);
    const out = propagateEvaluatorUncertainty(f, inputs, sigma, corr).value!;
    // For a monomial the first-order relative u is exact: Σσᵢ² + 2ρ_nT σ_n σ_T − 2ρ_np σ_n σ_p, relative.
    const relative = Math.sqrt(1e-4 * (1 + 1 + 1 + 2 * 0.6 - 2 * -0.3));
    expect(out.u! / out.value).toBeCloseTo(relative, 8);
    expect(out.unreliable).toEqual([]);
    const mc = monteCarloStd(f, inputs, sigma, corr);
    const ratio = mc / out.u!;
    expect(Math.abs(ratio - 1), `sampled/propagated = ${ratio.toFixed(4)}`).toBeLessThan(MC_TOLERANCE);
  });

  it('a singular ρ = 1 between two inputs is drawn with a jittered covariance and agrees with the propagated sum', () => {
    const f = evaluatorOf(76);
    const inputs = { n_per_m3: 1e20, T_K: 1e7, p_B_Pa: 4000 };
    const sigma = { n_per_m3: 1e18, T_K: 1e5 };
    const corr: CorrelationTable = new Map([['n_per_m3,T_K', 1]]);
    const out = propagateEvaluatorUncertainty(f, inputs, sigma, corr).value!;
    // Fully correlated: the two 1% contributions add, 2% relative.
    expect(out.u! / out.value).toBeCloseTo(0.02, 8);
    // The exact covariance is singular (rank 1); the Cholesky draw needs a jitter on the diagonal.
    const mc = monteCarloStd(f, inputs, sigma, corr, 1e-10);
    const ratio = mc / out.u!;
    expect(Math.abs(ratio - 1), `sampled/propagated = ${ratio.toFixed(4)}`).toBeLessThan(MC_TOLERANCE);
  });

  it('the magnetic pressure (be-74, B²/2μ₀) at σ_B = 0.5 B: the curvature flag is raised, and the sampled std exceeds u by the second-order term', () => {
    const f = evaluatorOf(74);
    const B = 0.5;
    const inputs = { B_T: B };
    const sigma = { B_T: 0.5 * B };
    const out = propagateEvaluatorUncertainty(f, inputs, sigma, new Map()).value!;
    // The curvature ratio of a quadratic is u/(2B) = 0.25, above the 0.1 flag.
    expect(out.contributions.B_T!.curvatureRatio).toBeCloseTo(0.25, 6);
    expect(out.unreliable).toEqual(['B_T']);
    // Exactly: std(B²) / (2 B σ) = √(1 + σ²/(2B²)) = √1.125 for σ = 0.5 B; the first-order u is 6.1% short.
    const predicted = Math.sqrt(1 + (0.5 * 0.5) / 2);
    const mc = monteCarloStd(f, inputs, sigma, new Map(), 0, CURVATURE_DRAWS);
    const ratio = mc / out.u!;
    expect(ratio, `sampled/propagated = ${ratio.toFixed(4)}, second-order prediction ${predicted.toFixed(4)}`).toBeGreaterThan(1.02);
    expect(Math.abs(ratio - predicted), `sampled/propagated = ${ratio.toFixed(4)}`).toBeLessThan(MC_TOLERANCE);
    // 20000 evaluator runs take about 20 s on one idle core; the suite runs four files at once.
  }, 180_000);
});
