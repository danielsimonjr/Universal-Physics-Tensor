/**
 * A carrier value that is not a finite number has no sign, so the sign
 * policy refuses it instead of passing it. Before 9.0.1 a NaN charge passed
 * the opposite-sign check (NaN * x < 0 is false) and reached the formula.
 */
import { describe, expect, it } from 'vitest';
import { applyCarrierSignPolicy, CarrierSignError } from '../../src/bridges/carrier-sign.js';

const pair = (a: number, b: number) => ({ a, b, left: 'charge', right: 'carrier-mobility' });

describe('the carrier-sign policy on a value with no sign', () => {
  it('refuses NaN and an infinity on either side, as a range error and not as opposite signs', () => {
    for (const [a, b] of [
      [Number.NaN, 1],
      [1, Number.NaN],
      [Number.POSITIVE_INFINITY, 1],
      [-1, Number.NEGATIVE_INFINITY],
    ] as const) {
      let thrown: unknown;
      try {
        applyCarrierSignPolicy(null, {}, new Set(), pair(a, b));
      } catch (error) {
        thrown = error;
      }
      expect(thrown, `${a}, ${b}`).toBeInstanceOf(RangeError);
      expect(thrown, `${a}, ${b}`).not.toBeInstanceOf(CarrierSignError);
    }
  });

  it('still refuses opposite finite signs and accepts a zero (controls)', () => {
    expect(() => applyCarrierSignPolicy(null, {}, new Set(), pair(-1, 1))).toThrow(CarrierSignError);
    expect(() => applyCarrierSignPolicy(null, {}, new Set(), pair(0, 1))).not.toThrow();
    expect(() => applyCarrierSignPolicy(null, {}, new Set(), pair(-2, -3))).not.toThrow();
  });
});
