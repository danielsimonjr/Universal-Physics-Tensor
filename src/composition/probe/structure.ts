/**
 * Cheap structure probes: regime changepoint, scale symmetry, conserved dQ/dt.
 *
 * Task-0 style: recover a synthetic signal or honestly abstain. Never flips
 * `axes.ts` `gated`.
 *
 * @internal
 */

import { sumSquaredDeviations } from '@danielsimonjr/mathts-core';
import { linearRegression } from '@danielsimonjr/mathts-functions';
import { meanOf } from '../../numerical/statistics.js';

export interface ChangepointInput {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

export interface ChangepointResult {
  readonly index: number | null;
  readonly score: number;
  readonly abstained: boolean;
  readonly reason?: string;
}

/**
 * Two-mean changepoint: scan split index maximizing |μ_left − μ_right|.
 * Abstains on short series or when the best split is weaker than `minScore`.
 *
 * @internal
 */
export function detectMeanChangepoint(
  input: ChangepointInput,
  minScore = 0.5,
): ChangepointResult {
  const { x, y } = input;
  if (x.length !== y.length || x.length < 6) {
    return { index: null, score: 0, abstained: true, reason: 'series too short' };
  }
  let bestIdx = 1;
  let best = 0;
  for (let i = 2; i < y.length - 2; i++) {
    const score = Math.abs(meanOf(y.slice(0, i)) - meanOf(y.slice(i)));
    if (score > best) {
      best = score;
      bestIdx = i;
    }
  }
  if (best < minScore) {
    return { index: null, score: best, abstained: true, reason: 'no changepoint above threshold' };
  }
  return { index: bestIdx, score: best, abstained: false };
}

export interface ScaleSymmetryInput {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

/**
 * Ordinary-least-squares log-log slope, MathTS `linearRegression` on the
 * logs. Abstains if x or y are non-positive, or when the log-x spread
 * (core `sumSquaredDeviations`, times n: the normal-equation denominator)
 * is degenerate.
 *
 * @internal
 */
export function estimateScaleExponent(input: ScaleSymmetryInput): {
  exponent: number | null;
  abstained: boolean;
  reason?: string;
} {
  const pairs = input.x
    .map((x, i) => [x, input.y[i]!] as const)
    .filter(([x, y]) => x > 0 && y > 0);
  if (pairs.length < 3) {
    return { exponent: null, abstained: true, reason: 'need ≥3 positive (x,y) pairs' };
  }
  const lx = pairs.map(([x]) => Math.log(x));
  const ly = pairs.map(([, y]) => Math.log(y));
  if (pairs.length * sumSquaredDeviations(lx) < 1e-18) {
    return { exponent: null, abstained: true, reason: 'degenerate log-x variance' };
  }
  return { exponent: linearRegression(lx, ly).slope, abstained: false };
}

/**
 * Finite-difference conservation probe: mean |ΔQ/Δt| ≈ 0.
 *
 * @internal
 */
export function probeConservation(
  q: readonly number[],
  t: readonly number[],
  atol = 1e-6,
): { conserved: boolean; meanAbsRate: number; abstained: boolean; reason?: string } {
  if (q.length !== t.length || q.length < 2) {
    return { conserved: false, meanAbsRate: NaN, abstained: true, reason: 'need ≥2 samples' };
  }
  let acc = 0;
  let n = 0;
  for (let i = 1; i < q.length; i++) {
    const dt = t[i]! - t[i - 1]!;
    if (dt === 0) continue;
    acc += Math.abs((q[i]! - q[i - 1]!) / dt);
    n += 1;
  }
  if (n === 0) {
    return { conserved: false, meanAbsRate: NaN, abstained: true, reason: 'zero Δt' };
  }
  const meanAbsRate = acc / n;
  return { conserved: meanAbsRate <= atol, meanAbsRate, abstained: false };
}
