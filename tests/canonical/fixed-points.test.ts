/**
 * One owner for "a constant times that one" (proposal 6): the sample points,
 * the ratio statistic and the tolerance that the derivation audit, the
 * canonical comparison, the linkage recovery, explain's monomial check and
 * `upt derive` each carried in their own copy. Each caller still passes its
 * own base, step, exponent schedule, statistic and tolerance, so no verdict
 * moved (tests/canonical/fixed-point-verdicts.test.ts is the pin).
 */
import { describe, expect, it } from 'vitest';
import {
  FIXED_POINT_EXPONENTS,
  constantRatio,
  fixedPoint,
  recoverMonomialPrefactor,
} from '../../src/canonical/fixed-points.js';

describe('fixedPoint', () => {
  it('variable i takes (base + step·i)^p, in the order the names are given', () => {
    expect(fixedPoint(['a', 'b', 'c'], 1, { base: 1.7, step: 1 })).toEqual({ a: 1.7, b: 2.7, c: 3.7 });
    expect(fixedPoint(['x', 'y'], 1.3, { base: 1.3, step: 0.7 })).toEqual({ x: Math.pow(1.3, 1.3), y: Math.pow(2, 1.3) });
    expect(fixedPoint(['m'], 1 + 0.27 * 2, { base: 1.6, step: 1 })).toEqual({ m: Math.pow(1.6, 1.54) });
    expect(fixedPoint([], 1, { base: 1.7, step: 1 })).toEqual({});
  });

  it('the three exponents the canonical comparison and the linkage recovery share', () => {
    expect([...FIXED_POINT_EXPONENTS]).toEqual([1, 1.3, 1.6]);
  });
});

describe('constantRatio', () => {
  it('max-rel-err: constant when every ratio is within tol of the first, value is the first', () => {
    const r = constantRatio([2, 2 * (1 + 5e-10), 2 * (1 - 5e-10)], 1e-9);
    expect(r.constant).toBe(true);
    expect(r.value).toBe(2);
    expect(r.maxRelErr).toBeCloseTo(5e-10, 15);
  });
  it('max-rel-err: not constant past the tolerance, and the spread is reported', () => {
    const r = constantRatio([1, 1.5, 1], 1e-9);
    expect(r.constant).toBe(false);
    expect(r.maxRelErr).toBe(0.5);
  });
  it('cv: the coefficient of variation against the mean, value is the mean', () => {
    const r = constantRatio([2, 2, 2], 1e-9, { statistic: 'cv' });
    expect(r).toEqual({ constant: true, value: 2, maxRelErr: 0 });
    const spread = constantRatio([1, 3], 1e-9, { statistic: 'cv' });
    expect(spread.constant).toBe(false);
    expect(spread.value).toBe(2);
    expect(spread.maxRelErr).toBe(0.5); // population std 1 over mean 2
  });
  it('a zero or non-finite ratio is never constant', () => {
    expect(constantRatio([0, 0], 1e-9).constant).toBe(false);
    expect(constantRatio([1, Number.NaN], 1e-9).constant).toBe(false);
    expect(constantRatio([], 1e-9).constant).toBe(false);
  });
});

describe('recoverMonomialPrefactor (the upt derive statistic)', () => {
  const monomial = { a: 2, b: -1 };
  const scheme = { base: 1.7, step: 1, exponents: [1, 1.3, 1.6], tolerance: 1e-9, statistic: 'cv' as const };
  it('recovers the constant in front of a matching monomial', () => {
    const r = recoverMonomialPrefactor((v) => (3 * v['a']! * v['a']!) / v['b']!, monomial, ['a', 'b'], scheme);
    expect(r.matches).toBe(true);
    expect(r.prefactor).toBeCloseTo(3, 12);
  });
  it('refuses a formula whose input dependence is not the monomial', () => {
    const r = recoverMonomialPrefactor((v) => v['a']! / v['b']!, monomial, ['a', 'b'], scheme);
    expect(r.matches).toBe(false);
    expect(r.prefactor).toBeUndefined();
  });
});
