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

  // v0.5.0 Task 11 [U]: BE-37 covariant-eikonal Shapiro cross-check ACTIVATED.
  // Task 12 wired evaluateCovariantEikonalNumerical to drive GL4 null-
  // geodesic integration on the canonical (x, p) state; shapiroDelaySec now
  // returns the real coord-time delay vs the flat-space straight-line ray.
  // I5 re-relaxation: original v0.4.0 tolerance ±1×10⁻⁴ relative on the
  // Earth-Mars 2×10⁻¹⁰ s baseline = 2×10⁻¹⁴ s absolute, BELOW the
  // ~3×10⁻¹³ s double-precision floor on a 1500 s coord-time accumulation.
  // Relaxed to ±2×10⁻³ relative (4×10⁻¹³ s absolute, above the floor).
  // Best-effort numeric — Earth-Mars Shapiro ≈ 2e-10 s is near double-precision floor.
  it('Shapiro delay via geodesic integration agrees with closed form to ±2×10⁻³ relative', async () => {
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
    // v0.5.1 Task 1 PC-1 (constants canonicalization): empirical relErr
    // = 2.51×10⁻⁴ post-migration to canonical `C_SI = 299792458` exact (was
    // 1.76×10⁻⁴ pre-migration with the local truncated `c_SI = 2.998e8`).
    // PC-1 hypothesis (c_SI drift dominates residual) is REFUTED: residual
    // is unchanged-or-worse after canonicalization. Dominant residual source
    // is elsewhere (likely Schwarzschild fixture c_SI mismatch — pending
    // Task 4, or GL4 step-count floor / null IC reconstruction).
    expect(relErr).toBeLessThan(2e-3);
  });
});
