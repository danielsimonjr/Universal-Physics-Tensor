/**
 * v0.5.1 Task 7 (PD-7): 4th-order stencil for `pderivNumericalFn`.
 * v0.6.0 Task 2.12: flipped default from 2 to 4 (Decision #7).
 *
 * Default (v0.6.0+): 4th-order centered stencil
 *   f'(x) ≈ (−f(x+2h) + 8 f(x+h) − 8 f(x−h) + f(x−2h)) / (12 h)
 * with adaptive h = 1e-4·max(|x|,1).
 * Explicit `{ order: 2 }`: 2nd-order centered stencil (v0.5.x default),
 * with adaptive h = 1e-6·max(|x|,1).
 */
import { describe, it, expect } from 'vitest';
import { pderivNumericalFn } from '../../src/numerical/pderiv.js';

describe('pderivNumericalFn — order parameter (PD-7)', () => {
  it('defaults to 4th-order as of v0.6.0 (Decision #7 FD-flip)', () => {
    const f = (x: ReadonlyArray<number>) => x[0] ** 3;
    const dfx = pderivNumericalFn(f, [1.0], 0);
    // 4th-order at h≈1e-4: truncation is zero on a cubic; the residual is round-off, ~1e-12.
    // The bound is the discriminating 1e-11 of pderiv-order-default.test.ts: 2nd order at its
    // h = 1e-6 lands near 8e-11, so a bound of 1e-5 (the one here until 2026-10-15) was met by
    // either order and could not fail on the default this title names.
    expect(typeof dfx).toBe('number');
    expect(Math.abs((dfx as number) - 3.0)).toBeLessThan(1e-11);
  });

  it('supports 4th-order opt-in (≤1e-9 on a smooth cubic)', () => {
    const f = (x: ReadonlyArray<number>) => x[0] ** 3;
    const dfx = pderivNumericalFn(f, [1.0], 0, { order: 4 });
    expect(typeof dfx).toBe('number');
    // 4th-order at h≈1e-4: truncation O(h⁴) on a polynomial = 0 modulo round-off.
    expect(Math.abs((dfx as number) - 3.0)).toBeLessThan(1e-9);
  });

  it('supports vector-field arrays (rank-2 components) at order=4', () => {
    // Smooth rank-2 field: g(x) = [[x², 0], [0, x³]]
    const g = (x: ReadonlyArray<number>) => [[x[0] ** 2, 0], [0, x[0] ** 3]];
    const dg = pderivNumericalFn(g, [1.0], 0, { order: 4 });
    // Expected: dg/dx = [[2, 0], [0, 3]] — as flat order [2, 0, 0, 3].
    expect(Array.isArray(dg)).toBe(true);
    const flat = dg as number[];
    expect(flat.length).toBe(4);
    expect(Math.abs(flat[0] - 2.0)).toBeLessThan(1e-9);
    expect(Math.abs(flat[1])).toBeLessThan(1e-12);
    expect(Math.abs(flat[2])).toBeLessThan(1e-12);
    expect(Math.abs(flat[3] - 3.0)).toBeLessThan(1e-9);
  });

  it('rejects unsupported order values', () => {
    const f = (x: ReadonlyArray<number>) => x[0];
    expect(() =>
      pderivNumericalFn(f, [1.0], 0, { order: 3 as unknown as 2 | 4 }),
    ).toThrow(/order/i);
  });

  it('supports explicit h override (load-bearing for inner-FD step in curvature lowering)', () => {
    // h override matters where the default adaptive step doesn't balance
    // truncation vs round-off — e.g. c²-scaled g_tt cancellation noise.
    const f = (x: ReadonlyArray<number>) => x[0] ** 3;
    const dfx = pderivNumericalFn(f, [1.0], 0, { order: 4, h: 1e-3 });
    expect(typeof dfx).toBe('number');
    expect(Math.abs((dfx as number) - 3.0)).toBeLessThan(1e-9);
  });
});
