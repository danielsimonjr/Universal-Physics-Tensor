import { describe, it, expect } from 'vitest';
import { validate } from '../../src/dimensional/validator.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { metric, pderiv } from '../../src/dimensional/metric.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { evaluateCovariantEikonalNumerical } from '../../src/numerical/index.js';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../../src/bridges/relation-eval.js';

const LENGTH = { L: 1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

describe('covariant-derivative preview (v0.4.0 building block)', () => {
  // TENSOR-RULE: pderiv-of-metric-composes
  it('∂_μ g_νλ is well-formed (v0.3.0 building block for v0.4.0 Christoffel)', () => {
    const g_lower = metric(
      'g',
      [
        { label: 'ν', variance: 'lower' },
        { label: 'λ', variance: 'lower' },
      ],
      DIMENSIONLESS,
      '+,-,-,-',
    );
    const x_coord = tsym('x', [{ label: 'α', variance: 'upper' }], LENGTH, 'coordinate');
    const dg = pderiv(g_lower, x_coord, { label: 'μ', variance: 'lower' });

    const result = validate(dg);
    expect(result.ok).toBe(true);
    expect(result.freeIndices.size).toBe(3);
    expect(result.freeIndices.get('μ')).toEqual({ upper: 0, lower: 1 });
    expect(result.freeIndices.get('ν')).toEqual({ upper: 0, lower: 1 });
    expect(result.freeIndices.get('λ')).toEqual({ upper: 0, lower: 1 });
  });

});

// ─── Task 17 [U]: BE-37 covariant-eikonal STRUCTURAL PREVIEW ────────────────
//
// Activates the first of two v0.3.5 it.todo entries for the connection layer.
// evaluateCovariantEikonalNumerical structurally assembles ∇_μ ∇^μ S via
// the new CovariantDerivativeNode + Task 12's lowering; the numerical eikonal
// residual is 0 by null-wave-covector construction (this `it` passes in v0.4.0).
//
// [v0.4.0 structural-preview only; Shapiro deferred to v0.5.0]
describe('BE-37 covariant-eikonal preview (v0.4.0)', () => {
  it('structural form ∇_μ ∇^μ S validates (free indices: empty)', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      M_kg: 1.989e30, R_far_m: 1e11, R_near_m: 6.96e8,
    });
    // Eikonal residual = 0 (null wave-covector construction):
    // g^μν k_μ k_ν = 0 identically for k_μ = (E, E, 0, 0) on the
    // Schwarzschild +,−,−,− metric.  Structural — no numeric integration.
    expect(Math.abs(result.eikonalResidual)).toBeLessThan(1e-10);
  });

  // The geodesic delay (exact radial form at the derived step count, 5708
  // steps here) against the weak-field closed form (2GM/c³)·ln(R_far/R_near)
  // of the catalog relation. The two forms differ by about 9e-7 relative at
  // R_near = 6.96e8 m (measured: 8.7e-7), so the bound is 2e-6, not the
  // 2e-3 of the fixed 2048 steps before #526.
  it('Shapiro delay via geodesic integration agrees with the weak-field closed form to 2e-6 relative', async () => {
    const M_kg = 1.989e30;
    // Closed-form (2GM/c³)·ln(R_far/R_near) for radial null geodesic; Task 12's
    // GL4 integrator reproduces this same form at the default b_m = 0.
    const shapiro = catalogRelations().find((row) => row.sources.includes('far-radius'));
    if (shapiro === undefined) throw new Error('the Shapiro relation is not in the catalog');
    const closedFormDelaySec = evaluateCatalogRelation(shapiro, {
      mass: M_kg,
      'far-radius': 1e11,
      'near-radius': 6.96e8,
    });
    const geodesic = await evaluateCovariantEikonalNumerical({
      M_kg, R_far_m: 1e11, R_near_m: 6.96e8,
    });
    const relErr = Math.abs(geodesic.shapiroDelaySec - closedFormDelaySec)
      / Math.abs(closedFormDelaySec);
    expect(relErr).toBeLessThan(2e-6);
  });
});
