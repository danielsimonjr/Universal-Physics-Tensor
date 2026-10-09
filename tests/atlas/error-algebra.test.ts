/**
 * Witness W6 — the error algebra is an associative, non-commutative monoid
 * under outer-after-inner composition.
 *
 * The reversed-order value asserted here is `(30, 32)`, NOT the `(30, 17)`
 * printed in the implementation plan. See design note §9 RED: inner
 * `(3,2)∘(2,1) = (6,5)`, then `(5,7)∘(6,5)` gives `K = 5·6 = 30`,
 * `delta = 5·5 + 7 = 32`. Re-derived here by executing the rule.
 */
import { describe, it, expect } from 'vitest';
import {
  composeBounds,
  composeBoundPath,
  IDENTITY_BOUND,
} from '../../src/atlas/error-algebra.js';
import { MissingLipschitzError } from '../../src/atlas/types.js';

const b = (K: number, delta: number) => ({ K, delta });

describe('composeBounds', () => {
  it('composes outer-after-inner as K_o·K_i, K_o·δ_i + δ_o', () => {
    expect(composeBounds(b(2, 1), b(3, 2))).toEqual({ K: 6, delta: 5 });
  });

  it('is associative on a triple (W6)', () => {
    const left = composeBounds(b(2, 1), composeBounds(b(3, 2), b(5, 7)));
    const right = composeBounds(composeBounds(b(2, 1), b(3, 2)), b(5, 7));
    expect(left).toEqual({ K: 30, delta: 47 });
    expect(right).toEqual({ K: 30, delta: 47 });
    expect(left).toEqual(right);
  });

  it('is NOT commutative — the reversed order gives (30, 32) (W6)', () => {
    const reversed = composeBounds(b(5, 7), composeBounds(b(3, 2), b(2, 1)));
    expect(composeBounds(b(3, 2), b(2, 1))).toEqual({ K: 6, delta: 5 });
    expect(reversed).toEqual({ K: 30, delta: 32 });
    expect(reversed).not.toEqual({ K: 30, delta: 47 });
  });

  it('has IDENTITY_BOUND as a two-sided identity', () => {
    expect(composeBounds(IDENTITY_BOUND, b(3, 2))).toEqual(b(3, 2));
    expect(composeBounds(b(3, 2), IDENTITY_BOUND)).toEqual(b(3, 2));
    expect(IDENTITY_BOUND).toEqual({ K: 1, delta: 0 });
  });
});

describe('composeBoundPath', () => {
  it('throws RangeError on an empty path: a path of nothing has no bound to state', () => {
    expect(() => composeBoundPath([])).toThrow(RangeError);
    expect(() => composeBoundPath([])).toThrow(/empty/);
  });

  it('a single-step path is that step, non-terminal', () => {
    expect(composeBoundPath([b(2, 1)])).toEqual({ bound: b(2, 1), terminal: false });
  });

  it('folds a path outer-after-inner in traversal order', () => {
    // [b1, b2] is b1 then b2, i.e. b2 ∘ b1.
    expect(composeBoundPath([b(2, 1), b(3, 2)])).toEqual({
      bound: { K: 6, delta: 5 },
      terminal: false,
    });
  });

  it('throws MissingLipschitzError when a null is not last', () => {
    expect(() => composeBoundPath([b(2, 1), null, b(3, 2)])).toThrow(MissingLipschitzError);
  });

  it('returns terminal for a trailing null, carrying the prefix bound', () => {
    expect(composeBoundPath([b(2, 1), b(3, 2), null])).toEqual({
      bound: composeBounds(b(3, 2), b(2, 1)),
      terminal: true,
    });
  });

  it('folding (2, 0.1) ten times gives K = 1024 (W6)', () => {
    const path = Array.from({ length: 10 }, () => b(2, 0.1));
    const { bound, terminal } = composeBoundPath(path);
    expect(bound.K).toBe(1024);
    expect(terminal).toBe(false);
    // delta = 0.1 · (2^9 + 2^8 + … + 2^0) = 0.1 · 1023
    expect(bound.delta).toBeCloseTo(102.3, 10);
  });
});

describe('composeBounds — a pair is a finite, non-negative K and delta', () => {
  it.each([
    ['NaN K', { K: Number.NaN, delta: 0 }],
    ['negative delta', { K: 1, delta: -1 }],
    ['negative K', { K: -2, delta: 0 }],
    ['infinite delta', { K: 1, delta: Number.POSITIVE_INFINITY }],
    ['infinite K', { K: Number.POSITIVE_INFINITY, delta: 0 }],
  ] as const)('throws RangeError on %s, in either position', (_label, bad) => {
    expect(() => composeBounds(bad, b(1, 0))).toThrow(RangeError);
    expect(() => composeBounds(b(1, 0), bad)).toThrow(RangeError);
    expect(() => composeBoundPath([b(1, 0), bad])).toThrow(RangeError);
  });

  it('the audit probe {K: NaN, delta: -1} ∘ {K: -2, delta: Infinity} throws rather than returning NaN', () => {
    expect(() => composeBounds({ K: Number.NaN, delta: -1 }, { K: -2, delta: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });

  it('CONTROL: K = 0 and delta = 0 are legal (an exact map that forgets its input)', () => {
    expect(composeBounds(b(0, 0), b(3, 2))).toEqual({ K: 0, delta: 0 });
  });
});
