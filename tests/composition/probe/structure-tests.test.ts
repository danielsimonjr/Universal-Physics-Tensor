/**
 * Structure probes as tests (proposal 10 of docs/planning/2026-10-15-map-maker-discoverer-proposals.md).
 *
 * Before this change the changepoint score was |μ_L − μ_R| against an absolute 0.5 and the
 * conservation probe |ΔQ/Δt| < 1e-6, both in the units of y, so a signal and its copy scaled by
 * 1e6 or 1e-6 got different verdicts. The changepoint is now a Welch t-test (MathTS `studentTTest`,
 * whose p-value is computed directly) at the best split with a seeded permutation null for the
 * maximum over splits; conservation is the slope of MathTS `linearRegression(t, q)` against k times
 * its standard error, with the second-order rate from MathTS `gradient` reported beside it.
 */
import { describe, it, expect } from 'vitest';
import { studentTTest } from '@danielsimonjr/mathts-functions';
import {
  detectMeanChangepoint,
  estimateScaleExponent,
  probeConservation,
} from '../../../src/composition/probe/structure.js';
import { studentTwoSidedP } from '../../../src/composition/probe/t-tail.js';

/** Deterministic noise: mulberry32, then Box–Muller. */
function noise(seed: number): () => number {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

const x = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('changepoint: a Welch t at the best split, a seeded permutation null for the maximum over splits', () => {
  const g = noise(7);
  // A step of 4σ at index 20 in unit noise, n = 40.
  const step = Array.from({ length: 40 }, (_, i) => (i < 20 ? 0 : 4) + g());
  const flatG = noise(11);
  const flat = Array.from({ length: 40 }, () => flatG());

  it('a scale-free signal and its copies scaled by 1e6 and 1e-6 get the same verdict', () => {
    const base = detectMeanChangepoint({ x: x(40), y: step });
    const up = detectMeanChangepoint({ x: x(40), y: step.map((v) => v * 1e6) });
    const down = detectMeanChangepoint({ x: x(40), y: step.map((v) => v * 1e-6) });
    for (const r of [up, down]) {
      expect(r.abstained).toBe(base.abstained);
      expect(r.index).toBe(base.index);
      expect(r.score).toBeCloseTo(base.score, 6);
      expect(r.pPermutation).toBeCloseTo(base.pPermutation!, 12);
    }
    const flatBase = detectMeanChangepoint({ x: x(40), y: flat });
    const flatDown = detectMeanChangepoint({ x: x(40), y: flat.map((v) => v * 1e-6) });
    expect(flatDown.abstained).toBe(flatBase.abstained);
    expect(flatDown.pPermutation).toBeCloseTo(flatBase.pPermutation!, 12);
  });

  it('a real step is flagged at its index with p below 0.01, by both the permutation null and the direct Welch tail', () => {
    const r = detectMeanChangepoint({ x: x(40), y: step });
    expect(r.abstained).toBe(false);
    expect(r.index).toBe(20);
    expect(r.pPermutation).toBeLessThan(0.01);
    expect(r.pWelch).toBeLessThan(0.01);
    expect(r.score).toBeGreaterThan(5);
    expect(r.meanDifference).toBeCloseTo(4, 0);
  });

  it('a flat noisy signal is not flagged (seed 11, fixed before the run)', () => {
    const r = detectMeanChangepoint({ x: x(40), y: flat });
    expect(r.abstained).toBe(true);
    expect(r.index).toBeNull();
    expect(r.pPermutation).toBeGreaterThanOrEqual(0.01);
    expect(r.reason).toMatch(/permutation p = .* ≥ α = 0\.01/);
  });

  it('the statistic at the best split is MathTS studentTTest\'s Welch t, and pWelch its direct p-value', () => {
    const r = detectMeanChangepoint({ x: x(40), y: step });
    const welch = studentTTest(step.slice(0, r.index!), step.slice(r.index!));
    expect(r.tStatistic).toBeCloseTo(welch.statistic, 9);
    expect(Math.abs(r.score - Math.abs(welch.statistic))).toBeLessThan(1e-9);
    expect(r.degreesOfFreedom).toBeCloseTo(welch.degreesOfFreedom, 9);
    expect(r.pWelch).toBe(welch.pValue);
  });

  it('the permutation null is seeded: the same seed repeats the p-value; a perfect step has p at the floor', () => {
    const a = detectMeanChangepoint({ x: x(40), y: step, seed: 3 });
    const b = detectMeanChangepoint({ x: x(40), y: step, seed: 3 });
    expect(a.pPermutation).toBe(b.pPermutation);
    // A perfect 8-point step: |t| is infinite, but 2 of the 70 arrangements of the pool separate it as
    // perfectly, so the permutation null of the maximum cannot fall below about 2/70 ≈ 0.029. At the
    // default α = 0.01 the honest verdict is "not shown"; at α = 0.05 the step is flagged at index 4.
    const perfect = [0, 0, 0, 0, 5, 5, 5, 5];
    const p = detectMeanChangepoint({ x: x(8), y: perfect });
    expect(p.score).toBe(Number.POSITIVE_INFINITY);
    expect(p.pPermutation).toBeGreaterThan(0.015);
    expect(p.pPermutation).toBeLessThan(0.05);
    expect(p.abstained).toBe(true);
    expect(p.index).toBeNull();
    const p5 = detectMeanChangepoint({ x: x(8), y: perfect, alpha: 0.05 });
    expect(p5.abstained).toBe(false);
    expect(p5.index).toBe(4);
  });

  it('a short series abstains and says so', () => {
    const r = detectMeanChangepoint({ x: [0, 1, 2], y: [1, 2, 3] });
    expect(r.abstained).toBe(true);
    expect(r.reason).toMatch(/series too short/);
    expect(r.pPermutation).toBeNull();
  });
});

describe('conservation: the slope of linearRegression(t, q) against k·stdErr, with the gradient rate beside it', () => {
  const t = x(30).map((i) => i * 0.1);
  const g = noise(5);
  const flat = t.map(() => 1 + 1e-7 * g());
  const drift = t.map((ti) => 1 + 1e-7 * g() + 1e-6 * ti);

  it('a flat noisy quantity and its copies scaled by 1e6 and 1e-6 get the same verdict: conserved', () => {
    for (const k of [1, 1e6, 1e-6]) {
      const r = probeConservation(flat.map((v) => v * k), t);
      expect(r.abstained).toBe(false);
      expect(r.conserved, `scale ${k}`).toBe(true);
      expect(r.k).toBe(3);
      expect(Math.abs(r.slope!)).toBeLessThanOrEqual(3 * r.stdErr!);
    }
  });

  it('a drifting quantity is not conserved at any scale, and the reported rate is the second-order gradient', () => {
    for (const k of [1, 1e6, 1e-6]) {
      const r = probeConservation(drift.map((v) => v * k), t);
      expect(r.conserved, `scale ${k}`).toBe(false);
      expect(r.slope! / k).toBeCloseTo(1e-6, 7);
      expect(r.meanAbsRate / k).toBeCloseTo(1e-6, 6);
    }
  });

  it('keeps the old abstentions: too few samples and a non-increasing t', () => {
    expect(probeConservation([1], [0]).abstained).toBe(true);
    expect(probeConservation([1, 2], [5, 5]).abstained).toBe(true);
    expect(probeConservation([1, 2, 3], [0, 1, 1]).abstained).toBe(true);
    expect(probeConservation([1, 1, 1], [0, 1, 2]).conserved).toBe(true);
  });
});

describe('scale exponent: the slope with its standard error and a direct two-sided p', () => {
  it('an exact power law has a vanishing standard error; a noisy one reports it with a p from betainc', () => {
    const exact = estimateScaleExponent({ x: [1, 2, 4, 8], y: [3, 12, 48, 192] });
    expect(exact.exponent).toBeCloseTo(2, 12);
    expect(exact.stdErr).toBeLessThan(1e-12);
    const g = noise(2);
    const xs = x(12).map((i) => 1 + i);
    const ys = xs.map((v) => 2 * v ** 1.5 * Math.exp(0.05 * g()));
    const r = estimateScaleExponent({ x: xs, y: ys });
    expect(r.abstained).toBe(false);
    expect(r.stdErr).toBeGreaterThan(0);
    expect(Math.abs(r.exponent! - 1.5)).toBeLessThan(3 * r.stdErr!);
    expect(r.pValue).toBe(studentTwoSidedP(r.exponent! / r.stdErr!, 10));
    expect(r.n).toBe(12);
  });

  it('studentTwoSidedP is the regularized incomplete beta I_{ν/(ν+t²)}(ν/2, 1/2): the Cauchy closed form at ν = 1', () => {
    expect(studentTwoSidedP(1, 1)).toBeCloseTo(0.5, 12);
    expect(studentTwoSidedP(-Math.sqrt(3), 1)).toBeCloseTo(1 / 3, 12);
    expect(studentTwoSidedP(0, 7)).toBe(1);
    expect(studentTwoSidedP(Number.POSITIVE_INFINITY, 7)).toBe(0);
    // A far tail resolves (1 − CDF would round it away): t = 40 on ν = 10.
    expect(studentTwoSidedP(40, 10)).toBeGreaterThan(0);
    expect(studentTwoSidedP(40, 10)).toBeLessThan(1e-10);
  });
});
