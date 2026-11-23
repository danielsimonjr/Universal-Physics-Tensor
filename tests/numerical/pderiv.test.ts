import { describe, it, expect } from 'vitest';
import { pderivGrid, pderivNumericalFn, pderivSymbolic } from '../../src/numerical/pderiv.js';
import { evaluateNumerical } from '../../src/numerical/index.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { DIMENSIONLESS, LENGTH } from '../../src/dimensional/types.js';
import type { GridField } from '../../src/numerical/grid-field.js';

describe('numerical partial derivative', () => {
  it('pderivGrid: centered finite-difference of f(x)=x^2 on a 1-D grid', () => {
    // samples of x^2 at x = 0,1,2,3,4 ; spacing 1. d/dx ~ 2x at interior points.
    const grid: GridField = {
      shape: [5], spacing: [1], boundary: 'clamp',
      data: [0, 1, 4, 9, 16],
    };
    const d = pderivGrid(grid, 0); // derivative along axis 0
    expect(d[1]).toBeCloseTo(2, 10);  // 2*1
    expect(d[2]).toBeCloseTo(4, 10);  // 2*2
    expect(d[3]).toBeCloseTo(6, 10);  // 2*3
  });

  it('pderivNumericalFn: centered finite-difference of a supplied scalar field', () => {
    const f = (coords: ReadonlyArray<number>) => coords[0] ** 3; // f(x) = x^3
    const d = pderivNumericalFn(f, [2], 0);   // df/dx at x=2 ~ 3x^2 = 12
    expect(d).toBeCloseTo(12, 5);
  });

  it('pderivSymbolic: returns the explicit pre-supplied derivative', () => {
    const derivs = new Map<string, number | number[]>([['S/t', [1, 2, 3, 4]]]);
    expect(pderivSymbolic('S', 't', derivs)).toEqual([1, 2, 3, 4]);
  });

  it('pderivSymbolic: throws a clear error when the derivative is absent', () => {
    expect(() => pderivSymbolic('S', 't', new Map()))
      .toThrow(/no explicit derivative supplied for "S\/t"/);
  });
});

describe('pderivNumericalFn: a component that does not move differentiates to exactly 0', () => {
  // g_tt = −c² is the same number at every stencil point. The stencil cancels
  // it only up to the roundoff of 8·c², and that roundoff divided by h was a
  // fake Christoffel of order 10 in an SI Minkowski report (the curvature
  // report once carried this rule itself; it belongs in the one primitive).
  const cSquared = 299792458 * 299792458;
  const field = (coords: ReadonlyArray<number>): number[] => [-cSquared, coords[0]! * 2, 5];

  it.each([2, 4] as const)('order %d', (order) => {
    const d = pderivNumericalFn(field, [3, 1, 1, 1], 0, { order }) as number[];
    expect(d[0]).toBe(0);
    expect(Object.is(d[0], -0)).toBe(false);
    expect(d[1]).toBeCloseTo(2, 6);
    expect(d[2]).toBe(0);
  });

  it('a moving component of the same size is still differentiated (control)', () => {
    const moving = (coords: ReadonlyArray<number>): number[] => [-cSquared * (1 + coords[0]! * 1e-3)];
    const d = pderivNumericalFn(moving, [3, 0, 0, 0], 0, { order: 4 }) as number;
    expect(d).toBeCloseTo(-cSquared * 1e-3, -6);
  });
});

describe('finite differences require usable sample geometry', () => {
  it('rejects a clamped singleton axis and non-finite spacing', () => {
    expect(() => pderivGrid({shape: [1, 3], spacing: [1, 1], data: [[1, 2, 3]], boundary: 'clamp'}, 0)).toThrow(/samples/);
    expect(() => pderivGrid({shape: [2], spacing: [Infinity], data: [0, 1], boundary: 'clamp'}, 0)).toThrow(/spacing/);
  });

  it.each([2, 4] as const)('refuses a collapsed stencil (order %d)', (order) => {
    expect(() => pderivNumericalFn(([x]) => x!, [1e20], 0, {order, h: 1})).toThrow(/representable/);
  });
});

it.each([
  ['x', [[3, 3, 3], [3, 3, 3]]],
  ['y', [[2, 2, 2], [2, 2, 2]]],
] as const)('lowers a non-square grid derivative along %s through the numerical API', async (axis, expected) => {
  const grid: GridField = { shape: [2, 3], spacing: [2, 1], data: [[0, 2, 4], [6, 8, 10]], boundary: 'clamp' };
  const result = await evaluateNumerical({
    kind: 'tensor-partial-derivative',
    of: tsym('S', [], DIMENSIONLESS, undefined, 'grid'),
    wrt: tsym(axis, [], LENGTH, 'coordinate'),
    wrtIndex: { label: axis, variance: 'lower' },
  }, { dimension: 2, tensors: new Map(), grids: new Map([['S', grid]]), coords: new Map([['x', 0], ['y', 0]]) });
  expect(result.value).toEqual(expected);
});
