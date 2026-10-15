/**
 * The typed MathTS functions return `unknown`; `core/mathts-read` is the one
 * place that turns such a result back into the number, bigint or number
 * matrix it is, and names the MathTS function in the TypeError otherwise.
 * Twelve readers across `src/` carried that check inline before.
 */
import { describe, expect, it } from 'vitest';
import { det, gcd, inv, lgamma } from '@danielsimonjr/mathts-functions';
import { bigintFrom, numberFrom, numberMatrixFrom } from '../../src/core/mathts-read.js';

describe('numberFrom', () => {
  it('returns the number a typed function returned', () => {
    expect(numberFrom('lgamma', lgamma(5))).toBeCloseTo(Math.log(24), 12);
    expect(numberFrom('x', -2.5)).toBe(-2.5);
    // NaN is a number: the reader checks the shape, not the value, as the inline checks did.
    expect(Number.isNaN(numberFrom('x', Number.NaN))).toBe(true);
  });

  it('throws a TypeError naming the function on any other shape', () => {
    expect(() => numberFrom('lgamma', '1')).toThrow(TypeError);
    expect(() => numberFrom('lgamma', undefined)).toThrow(/^lgamma did not return a number/);
    expect(() => numberFrom('mean', [1])).toThrow(/mean/);
    expect(() => numberFrom('gcd', 6n)).toThrow(/gcd did not return a number/);
  });
});

describe('bigintFrom', () => {
  it('returns the bigint MathTS gcd returned for bigint arguments', () => {
    expect(bigintFrom('gcd', gcd(12n, 18n))).toBe(6n);
  });

  it('throws a TypeError naming the function for a number', () => {
    expect(() => bigintFrom('gcd', 6)).toThrow(TypeError);
    expect(() => bigintFrom('gcd', 6)).toThrow(/^gcd did not return a bigint/);
  });
});

describe('numberMatrixFrom', () => {
  it('returns a fresh n×n number array from an inverse', () => {
    const src = [
      [2, 0],
      [0, 4],
    ];
    expect(numberFrom('det', det(src))).toBe(8);
    const out = numberMatrixFrom('inv', inv(src), 2);
    // MathTS inv writes the off-diagonal zeros as -0; the reader passes the numbers through.
    expect(out.map((row) => row.map((v) => v + 0))).toEqual([
      [0.5, 0],
      [0, 0.25],
    ]);
    const direct = inv(src) as number[][];
    expect(out).not.toBe(direct);
    expect(out[0]).not.toBe(direct[0]);
  });

  it('throws a TypeError naming the function on a wrong row count, row length or element', () => {
    expect(() => numberMatrixFrom('inv', [[1, 2]], 2)).toThrow(/^inv did not return a 2×2 number matrix/);
    expect(() => numberMatrixFrom('inv', [[1, 2], [3]], 2)).toThrow(TypeError);
    expect(() => numberMatrixFrom('inv', [[1, 2], [3, 'x']], 2)).toThrow(/inv did not return a 2×2 number matrix/);
    expect(() => numberMatrixFrom('inv', 5, 2)).toThrow(TypeError);
  });
});
