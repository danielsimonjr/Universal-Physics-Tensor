/**
 * Cheap structure probes as TESTS: a regime changepoint, a scale symmetry, a
 * conserved dQ/dt. Each verdict is scale-free: the same series scaled by 1e6
 * or by 1e-6 gets the same answer, because every threshold is in units of
 * the series' own scatter, never in the units of y.
 *
 * Task-0 style: recover a synthetic signal or honestly abstain. Never flips
 * `axes.ts` `gated`.
 *
 * @internal
 */

import { pairwiseSum, sumSquaredDeviations } from '@danielsimonjr/mathts-core';
import { gradient, linearRegression, permutationTest, studentTTest } from '@danielsimonjr/mathts-functions';
import { meanOf } from '../../numerical/statistics.js';
import { studentTwoSidedP } from './t-tail.js';

/** A series sampled at `x` with values `y`, scanned for a step in its mean. @internal */
export interface ChangepointInput {
  readonly x: readonly number[];
  readonly y: readonly number[];
  /** Significance level of the permutation test; default 0.01. */
  readonly alpha?: number;
  /** Permutation resamples of the null; default 999. */
  readonly resamples?: number;
  /** Seed of the permutation null (MathTS `permutationTest`); default 20261015, never the clock. */
  readonly seed?: number;
}

/** The best split of {@link detectMeanChangepoint}, its tests, or an abstention with its reason. @internal */
export interface ChangepointResult {
  /** The split index (the right segment starts here) when the step is significant; null otherwise. */
  readonly index: number | null;
  /** |Welch t| at the best split: the step in units of its own standard error (scale-free). */
  readonly score: number;
  /** μ_right − μ_left at the best split, in the units of y; null when nothing was scanned. */
  readonly meanDifference: number | null;
  /** MathTS `studentTTest` at the best split: the Welch t and its degrees of freedom. */
  readonly tStatistic: number | null;
  readonly degreesOfFreedom: number | null;
  /**
   * The direct two-sided Welch p at the best split (one split, as if chosen in advance; not
   * corrected for the scan over splits, which is what `pPermutation` is for).
   */
  readonly pWelch: number | null;
  /** P(max over splits of |t| ≥ observed) under a seeded permutation of the series. */
  readonly pPermutation: number | null;
  readonly abstained: boolean;
  readonly reason?: string;
}

/** The smallest segment a split may leave on either side. */
const MIN_SEGMENT = 2;

/**
 * |Welch t| at every admissible split of a series, from centred prefix sums:
 * O(n) for the scan the permutation null repeats. Two segments with no
 * scatter and different means give +Infinity; equal means give 0.
 */
function welchScan(y: readonly number[]): { best: number; bestIdx: number } {
  const n = y.length;
  const mean = meanOf(y);
  const c = y.map((v) => v - mean);
  const s1 = new Float64Array(n + 1);
  const s2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    s1[i + 1] = s1[i]! + c[i]!;
    s2[i + 1] = s2[i]! + c[i]! * c[i]!;
  }
  let best = -1;
  let bestIdx = MIN_SEGMENT;
  for (let i = MIN_SEGMENT; i <= n - MIN_SEGMENT; i++) {
    const nL = i;
    const nR = n - i;
    const mL = s1[i]! / nL;
    const mR = (s1[n]! - s1[i]!) / nR;
    const vL = Math.max(0, s2[i]! - nL * mL * mL) / (nL - 1);
    const vR = Math.max(0, s2[n]! - s2[i]! - nR * mR * mR) / (nR - 1);
    const se = Math.sqrt(vL / nL + vR / nR);
    const d = Math.abs(mL - mR);
    const t = se > 0 ? d / se : d > 0 ? Number.POSITIVE_INFINITY : 0;
    if (t > best) {
      best = t;
      bestIdx = i;
    }
  }
  return { best, bestIdx };
}

/** The max-|t| statistic of a permuted series, in the two-sample form `permutationTest` shuffles. */
const maxWelch = (a: number[], b: number[]): number => welchScan([...a, ...b]).best;

/**
 * Two-mean changepoint as a test. The best split maximises Welch's t over
 * the splits that leave at least two samples on each side; MathTS
 * `studentTTest` gives the t, the degrees of freedom and the direct p at that
 * split. Because the split was CHOSEN by the scan, that p is not the test:
 * the verdict is the seeded permutation null (MathTS `permutationTest`) of
 * the maximum over splits, flagged when `pPermutation < alpha` (default
 * 0.01). Every quantity is in units of the series' scatter, so a series and
 * its copy scaled by any factor get one verdict. Abstains below six samples.
 *
 * @internal
 */
export function detectMeanChangepoint(input: ChangepointInput): ChangepointResult {
  const { x, y } = input;
  const alpha = input.alpha ?? 0.01;
  const resamples = input.resamples ?? 999;
  const seed = input.seed ?? 20261015;
  const none = { meanDifference: null, tStatistic: null, degreesOfFreedom: null, pWelch: null, pPermutation: null };
  if (x.length !== y.length || x.length < 6) {
    return { index: null, score: 0, ...none, abstained: true, reason: 'series too short' };
  }
  if (!y.every(Number.isFinite)) {
    return { index: null, score: 0, ...none, abstained: true, reason: 'series has a non-finite value' };
  }
  const { best, bestIdx } = welchScan(y);
  const left = y.slice(0, bestIdx);
  const right = y.slice(bestIdx);
  const welch = studentTTest([...left], [...right]);
  const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);
  const perm = permutationTest([...left], [...right], maxWelch, { resamples, seed });
  const pPermutation = num(perm.pValue);
  if (pPermutation === null) {
    return { index: null, score: best, ...none, abstained: true, reason: 'the permutation null did not return a p-value' };
  }
  const tests = {
    meanDifference: meanOf(right) - meanOf(left),
    tStatistic: num(welch.statistic),
    degreesOfFreedom: num(welch.degreesOfFreedom),
    pWelch: num(welch.pValue),
    pPermutation,
  };
  if (pPermutation >= alpha) {
    return {
      index: null,
      score: best,
      ...tests,
      abstained: true,
      reason: `no changepoint: permutation p = ${pPermutation.toPrecision(3)} ≥ α = ${alpha} for the maximum |Welch t| = ${best.toPrecision(3)} over ${y.length - 2 * MIN_SEGMENT + 1} splits`,
    };
  }
  return { index: bestIdx, score: best, ...tests, abstained: false };
}

/** Positive samples `(x, y)` whose log-log slope is the scale exponent. @internal */
export interface ScaleSymmetryInput {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

/** The log-log slope with its standard error and the direct two-sided p of slope = 0. @internal */
export interface ScaleExponentResult {
  readonly exponent: number | null;
  /** Standard error of the slope (MathTS `linearRegression.stdErr`). */
  readonly stdErr: number | null;
  /** P(|T_{n−2}| ≥ |exponent/stdErr|), the direct tail ({@link studentTwoSidedP}); null below n = 3. */
  readonly pValue: number | null;
  /** The positive pairs the fit used. */
  readonly n: number;
  readonly abstained: boolean;
  readonly reason?: string;
}

/**
 * Ordinary-least-squares log-log slope, MathTS `linearRegression` on the
 * logs, with its standard error. The p-value is NOT the one MathTS reports
 * (`2·(1 − CDF)`, which rounds a far tail to 0): it is the direct t tail from
 * `betainc`. Abstains if x or y are non-positive, or when the log-x spread
 * (core `sumSquaredDeviations`, times n: the normal-equation denominator)
 * is degenerate.
 *
 * @internal
 */
export function estimateScaleExponent(input: ScaleSymmetryInput): ScaleExponentResult {
  const pairs = input.x
    .map((x, i) => [x, input.y[i]!] as const)
    .filter(([x, y]) => x > 0 && y > 0);
  if (pairs.length < 3) {
    return { exponent: null, stdErr: null, pValue: null, n: pairs.length, abstained: true, reason: 'need ≥3 positive (x,y) pairs' };
  }
  const lx = pairs.map(([x]) => Math.log(x));
  const ly = pairs.map(([, y]) => Math.log(y));
  if (pairs.length * sumSquaredDeviations(lx) < 1e-18) {
    return { exponent: null, stdErr: null, pValue: null, n: pairs.length, abstained: true, reason: 'degenerate log-x variance' };
  }
  const fit = linearRegression(lx, ly);
  const df = pairs.length - 2;
  const pValue = fit.stdErr > 0 ? studentTwoSidedP(fit.slope / fit.stdErr, df) : fit.slope === 0 ? 1 : 0;
  return { exponent: fit.slope, stdErr: fit.stdErr, pValue, n: pairs.length, abstained: false };
}

/** The verdict of {@link probeConservation}: no drift in q beyond k standard errors of its slope. @internal */
export interface ConservationResult {
  readonly conserved: boolean;
  /** Mean |dq/dt| from MathTS `gradient` (second-order central differences inside, one-sided at the ends). */
  readonly meanAbsRate: number;
  /** The slope of MathTS `linearRegression(t, q)` and its standard error. */
  readonly slope: number | null;
  readonly stdErr: number | null;
  /** The multiple of the standard error a drift must exceed to count. */
  readonly k: number;
  readonly abstained: boolean;
  readonly reason?: string;
}

/**
 * Conservation probe as a test: q is conserved when the linear drift
 * `slope` of `linearRegression(t, q)` satisfies |slope| ≤ k·stdErr. The
 * standard error comes from the residual scatter of the same series, so the
 * verdict is scale-free. k = 3 by default: a drift within three standard
 * errors is not distinguishable from none at the series' own noise (a
 * two-sided 0.27% under Gaussian residuals), the usual working threshold
 * for "no effect seen". The test sees a linear drift only; a quantity that
 * oscillates without drifting passes. The mean |dq/dt| is reported beside
 * the verdict from MathTS `gradient` (second order inside the series), not
 * from first-order forward differences, and never decides it. Abstains below
 * three samples or when t is not strictly increasing.
 *
 * @internal
 */
export function probeConservation(
  q: readonly number[],
  t: readonly number[],
  opts: { readonly k?: number } = {},
): ConservationResult {
  const k = opts.k ?? 3;
  const none = { slope: null, stdErr: null, k };
  if (q.length !== t.length || q.length < 3) {
    return { conserved: false, meanAbsRate: NaN, ...none, abstained: true, reason: 'need ≥3 samples' };
  }
  for (let i = 1; i < t.length; i++) {
    if (!(t[i]! > t[i - 1]!)) {
      return { conserved: false, meanAbsRate: NaN, ...none, abstained: true, reason: 'zero or negative Δt: t must increase strictly' };
    }
  }
  const rate = gradient([...q], [...t]);
  const meanAbsRate = pairwiseSum(rate.map(Math.abs)) / rate.length;
  const fit = linearRegression([...t], [...q]);
  if (!Number.isFinite(fit.slope) || !Number.isFinite(fit.stdErr)) {
    return { conserved: false, meanAbsRate, ...none, abstained: true, reason: 'the drift fit is not finite' };
  }
  return { conserved: Math.abs(fit.slope) <= k * fit.stdErr, meanAbsRate, slope: fit.slope, stdErr: fit.stdErr, k, abstained: false };
}
