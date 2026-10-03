// tests/numerical/foreach-multi-index.test.ts
// Note: forEachMultiIndex is not exported. Test via computeChristoffelTensor
// or write a unit test by extracting via a helper export. Since the function
// is private, test indirectly through christoffel results (already in Task 19).
// This task's test focuses on confirming the Christoffel contraction
// produces identical results after the spread removal.
import { describe, it, expect } from 'vitest';
import { computeChristoffelTensor } from '../../src/numerical/connection-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

describe('forEachMultiIndex: spread removal regression', () => {
  it('Christoffel contraction output unchanged after visitor receives idx by reference', () => {
    // Schwarzschild-like: non-trivial metric to ensure contraction uses idx correctly
    const engine = new MathTSEngine();
    const N = 2;
    // g = [[2, 0], [0, 3]], g_inv = [[0.5, 0], [0, 1/3]]
    const gInvFlat = [0.5, 0, 0, 1/3];
    // ∂_0 g = [[1, 0], [0, 0]], ∂_1 g = [[0, 0], [0, 1]]
    const dg = [
      [1, 0, 0, 0],
      [0, 0, 0, 1],
    ];
    const getMetricDeriv = (mu: number): number[] => dg[mu];

    const gamma = computeChristoffelTensor(gInvFlat, getMetricDeriv, N, engine);
    const nested = engine.toNested(gamma) as number[][][];

    // Γ^0_{00} = 0.5 * g^{00} * (∂_0 g_{00} + ∂_0 g_{00} - ∂_0 g_{00})
    //          = 0.5 * 0.5 * 1 = 0.25
    expect(nested[0][0][0]).toBeCloseTo(0.25, 8);

    // Γ^1_{11} = 0.5 * g^{11} * (∂_1 g_{11} + ∂_1 g_{11} - ∂_1 g_{11})
    //          = 0.5 * (1/3) * 1 ≈ 0.1667
    expect(nested[1][1][1]).toBeCloseTo(1/6, 6);

    // Off-diagonal Christoffels should be 0 for diagonal metric with these derivatives
    expect(nested[0][0][1]).toBeCloseTo(0, 10);
    expect(nested[0][1][0]).toBeCloseTo(0, 10);
    expect(nested[1][0][0]).toBeCloseTo(0, 10);
  });
});
