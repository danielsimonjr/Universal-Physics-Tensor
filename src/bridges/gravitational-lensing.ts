/**
 * BE-?? Gravitational Lensing — Eddington 1919 weak-field deflection.
 *
 * Closed-form deflection of light by a point mass under the weak-field
 * (post-Newtonian) approximation:
 *
 *   α = 4 G M / (b c²)
 *
 * where
 *   G  = 6.6743 × 10⁻¹¹ m³ kg⁻¹ s⁻²  (CODATA 2018)
 *   c  = 299792458 m s⁻¹               (exact SI)
 *   M  = lensing mass (kg)
 *   b  = impact parameter (m)
 *   α  = deflection angle (rad)
 *
 * The 1919 eclipse expedition measured α for grazing solar rays ≈ 1.75 arcsec,
 * confirming GR's prediction (2× the Newtonian value).
 *
 * Domain: b > 0. Weak-field validity: b ≫ r_Schwarzschild = 2GM/c².
 * For sub-Schwarzschild impact parameters the full geodesic integrator
 * (src/numerical/geodesic-integrator.ts) is required.
 *
 * @module bridges/gravitational-lensing
 */

// Numerical SI constants — canonical CODATA 2018 / exact-SI values from
// src/core/constants.ts (v0.5.1 PC-1 canonicalization). NOT the dimensional
// Dimension objects from src/dimensional/constants.ts.
import { C_SI as c_SI, G_SI } from '../core/constants.js';

/**
 * Inputs to `evaluateGravitationalLensing` (BE-51).
 *
 * @public
 */
export interface GravitationalLensingInputs {
  /** Lensing mass in kilograms. */
  readonly M_kg: number;
  /** Impact parameter in metres.  Must be strictly positive. */
  readonly b_m: number;
}

/**
 * Result of `evaluateGravitationalLensing` (BE-51).
 *
 * @public
 */
export interface GravitationalLensingResult {
  /** Deflection angle in radians: α = 4GM/(bc²). */
  readonly alpha_rad: number;
  /** Deflection angle in arc-seconds (α_rad × 180/π × 3600). */
  readonly alpha_arcsec: number;
  /** Echo of the input lensing mass (kg). */
  readonly M_kg: number;
  /** Echo of the input impact parameter (m). */
  readonly b_m: number;
}

/**
 * Evaluate the Eddington 1919 gravitational lensing deflection angle
 * for a point mass M at impact parameter b.
 *
 * Closed-form formula: `α = 4 G M / (b c²)`.
 *
 * @param inputs - `{ M_kg, b_m }`:
 *   - `M_kg` — lensing (point) mass in **kilograms** (SI). Must be finite;
 *     no positivity check (a negative mass yields a negative deflection by
 *     the linear formula, which the caller may exploit for symmetry tests).
 *   - `b_m` — impact parameter (closest approach distance) in **metres**
 *     (SI). Must be strictly positive.
 * @returns `{ alpha_rad, alpha_arcsec, M_kg, b_m }`:
 *   - `alpha_rad` — deflection angle in **radians** (dimensionless SI).
 *   - `alpha_arcsec` — deflection angle in **arc-seconds**
 *     (1 rad = 180/π × 3600 ≈ 206264.806 arcsec).
 *   - `M_kg`, `b_m` — input echoes (same units as above).
 * @throws {RangeError} if `b_m ≤ 0`.
 *
 * @public
 */
export function evaluateGravitationalLensing(
  inputs: GravitationalLensingInputs,
): GravitationalLensingResult {
  const { M_kg, b_m } = inputs;
  if (!(b_m > 0)) {
    throw new RangeError(
      `evaluateGravitationalLensing: b_m must be positive (got ${b_m})`,
    );
  }
  const alpha_rad = (4 * G_SI * M_kg) / (b_m * c_SI * c_SI);
  const alpha_arcsec = alpha_rad * (180 / Math.PI) * 3600;
  return { alpha_rad, alpha_arcsec, M_kg, b_m };
}
