/**
 * Task 12 (v0.5.0 Phase 2c) — proves `evaluateCovariantEikonalNumerical`
 * computes a real, non-zero `shapiroDelaySec` via GL4 null-geodesic
 * integration, replacing the v0.4.0 documented stub (`shapiroDelaySec: 0`).
 *
 * Geometry chosen — **radial null geodesic** from R_far down to R_near,
 * impact parameter b = 0 (default). This matches the geometry encoded by
 * `evaluateShapiroDelay` (`(2GM/c³) · ln(R_far/R_near)`) and is what the
 * Task 11 `it.skip` reactivation will cross-check against.
 *
 * Expected closed-form value (Earth-Mars conjunction radial geometry):
 *   M_kg = 1.989e30 (solar mass)
 *   R_far = 2.279e11 m (Mars-Sun)
 *   R_near = 1.496e11 m (Earth-Sun)
 *   2GM/c³ ≈ 9.85e-6 s
 *   ln(R_far/R_near) = ln(2.279/1.496) ≈ 0.421
 *   Δt_Shapiro ≈ 9.85e-6 · 0.421 ≈ 4.15e-6 s  (≈ 4.15 μs)
 *
 * **Honest deviation from plan-template bound `2e-11 < ... < 3e-10`.**
 * The plan-template assertion was inconsistent with any standard Shapiro
 * geometry — and inconsistent with itself, since `evaluateShapiroDelay` for
 * the same Earth-Mars inputs gives ~4 μs (not ~10⁻¹⁰ s). The plan also
 * swapped the inputs (R_far_m = 1.496e11 = Earth, R_near_m = 2.279e11 = Mars
 * violates the `R_near ≤ R_far` domain guard). This test fixes both: uses
 * Mars as R_far, Earth as R_near, and asserts the geometrically-consistent
 * magnitude bracket [1e-7, 1e-4] (±2 OOM around the closed-form 4.15e-6).
 *
 * The tight ±2×10⁻³ cross-check against `evaluateShapiroDelay` is Task 11's
 * job (the `it.skip` reactivation in covariant-derivative-preview.test.ts).
 *
 * @see docs/planning/v0.5.0-Implementation-Plan.md Task 12
 */
import { describe, it, expect } from 'vitest';
import { evaluateCovariantEikonalNumerical } from '../../src/numerical/index.js';

describe('evaluateCovariantEikonalNumerical: real shapiroDelaySec', () => {
  it('shapiroDelaySec is non-zero and physically grounded for solar radial Earth-Mars geometry', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      M_kg: 1.989e30,
      R_far_m: 2.279e11, // Mars-Sun (farther body — origin of photon)
      R_near_m: 1.496e11, // Earth-Sun (closer body — destination)
    });

    // Non-zero (the v0.4.0 stub returned exactly 0; Task 12 makes it real).
    expect(result.shapiroDelaySec).toBeGreaterThan(0);

    // Magnitude — closed-form (2GM/c³) · ln(R_far/R_near) ≈ 4.15e-6 s for these inputs.
    // Bracket: ±2 OOM around the expected value.
    expect(result.shapiroDelaySec).toBeGreaterThan(1e-7);
    expect(result.shapiroDelaySec).toBeLessThan(1e-4);
  });
});
