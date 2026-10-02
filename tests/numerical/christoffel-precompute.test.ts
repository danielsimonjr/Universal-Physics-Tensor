import { describe, it, expect } from 'vitest';
import { computeChristoffelTensor } from '../../src/numerical/connection-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

describe('computeChristoffelTensor: precompute regression', () => {
  it('flat metric (g_μν = η_μν) produces zero Christoffel symbols', () => {
    const engine = new MathTSEngine();
    const N = 4;
    // Minkowski metric: diag(1, -1, -1, -1), inverse: diag(1, -1, -1, -1)
    const eta = [1, 0, 0, 0,  0, -1, 0, 0,  0, 0, -1, 0,  0, 0, 0, -1];
    // Flat metric → all derivatives zero
    const getMetricDeriv = (_mu: number): number[] => new Array(N * N).fill(0);

    const gamma = computeChristoffelTensor(eta, getMetricDeriv, N, engine);

    // All Christoffel symbols must be zero for a flat metric
    const nested = engine.toNested(gamma) as number[][][];
    for (let a = 0; a < N; a++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          expect(nested[a][mu][nu]).toBeCloseTo(0, 10);
        }
      }
    }
  });

  it('Christoffel is symmetric in lower indices: Γ^α_{μν} = Γ^α_{νμ}', () => {
    const engine = new MathTSEngine();
    const N = 2;
    // 2D toy metric: g = [[1+x, 0], [0, 1]] with constant ∂_0 g = [[1, 0], [0, 0]]
    const gInvFlat = [1, 0, 0, 1]; // simplified inverse (not exact but fine for symmetry test)
    const dg0 = [1, 0, 0, 0]; // ∂_0 g
    const dg1 = [0, 0, 0, 0]; // ∂_1 g = 0
    const getMetricDeriv = (mu: number): number[] => (mu === 0 ? dg0 : dg1);

    const gamma = computeChristoffelTensor(gInvFlat, getMetricDeriv, N, engine);
    const nested = engine.toNested(gamma) as number[][][];

    // Symmetry: Γ^α_{μν} = Γ^α_{νμ}
    for (let a = 0; a < N; a++) {
      for (let mu = 0; mu < N; mu++) {
        for (let nu = 0; nu < N; nu++) {
          expect(nested[a][mu][nu]).toBeCloseTo(nested[a][nu][mu], 10);
        }
      }
    }
  });
});
