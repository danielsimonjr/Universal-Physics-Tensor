/**
 * BE-52 Mercury Perihelion Precession — Einstein 1915.
 *
 * Closed-form advance of the perihelion per orbit under GR weak-field:
 *
 *   Δφ = 6π G M / (a (1−e²) c²)   [radians per orbit]
 *
 * where
 *   G  = 6.6743 × 10⁻¹¹ m³ kg⁻¹ s⁻²  (CODATA 2018)
 *   c  = 299792458 m s⁻¹               (exact SI)
 *   M  = central mass (kg)
 *   a  = semi-major axis (m)
 *   e  = orbital eccentricity (dimensionless, 0 ≤ e < 1)
 *   T  = orbital period (years, used only for the per-century conversion)
 *
 * Einstein's 1915 calculation predicts ~43 arcsec/century for Mercury,
 * matching the observed anomalous precession (beyond Newtonian + other-planet
 * perturbations) that had puzzled astronomers since Le Verrier 1859.
 *
 * Domain: bound elliptical orbits only (0 ≤ e < 1, a > 0, T > 0).
 * For sub-Schwarzschild perihelion distances the full geodesic integrator
 * (src/numerical/geodesic-integrator.ts) is required.
 *
 * @module bridges/perihelion-precession
 */

// Numerical SI constants — canonical CODATA 2018 / exact-SI values from
// src/core/constants.ts (v0.5.1 PC-1 canonicalization). NOT the dimensional
// Dimension objects from src/dimensional/constants.ts.
import { C_SI as c_SI, G_SI } from '../core/constants.js';

/**
 * Inputs to `evaluatePerihelionPrecession` (BE-52).
 *
 * @public
 */
export interface PerihelionPrecessionInputs {
  /** Central mass in kilograms (e.g. solar mass 1.989e30 kg). */
  readonly M_kg: number;
  /** Orbital semi-major axis in metres. Must be strictly positive. */
  readonly a_m: number;
  /** Orbital eccentricity. Must satisfy 0 ≤ e < 1 (bound elliptical orbit). */
  readonly e: number;
  /** Orbital period in years. Used only for the per-century conversion. Must be strictly positive. */
  readonly T_yr: number;
}

/**
 * Result of `evaluatePerihelionPrecession` (BE-52).
 *
 * @public
 */
export interface PerihelionPrecessionResult {
  /** GR perihelion advance per orbit in radians: Δφ = 6πGM/(a(1−e²)c²). */
  readonly dphi_rad_per_orbit: number;
  /** GR perihelion advance per orbit in arc-seconds. */
  readonly dphi_arcsec_per_orbit: number;
  /** GR perihelion advance per century in arc-seconds. */
  readonly dphi_arcsec_per_century: number;
  /** Echo of the input central mass (kg). */
  readonly M_kg: number;
  /** Echo of the input semi-major axis (m). */
  readonly a_m: number;
  /** Echo of the input eccentricity. */
  readonly e: number;
}

/**
 * Evaluate the Einstein 1915 GR perihelion precession for a bound elliptical
 * orbit around a central mass M.
 *
 * Closed-form formula: `Δφ = 6π G M / (a (1 − e²) c²)`.
 *
 * @param inputs - `{ M_kg, a_m, e, T_yr }`:
 *   - `M_kg` — central gravitating mass in **kilograms** (SI). E.g. solar
 *     mass 1.989 × 10³⁰ kg.
 *   - `a_m` — orbital semi-major axis in **metres** (SI). Must be strictly
 *     positive.
 *   - `e` — orbital eccentricity (dimensionless). Must satisfy 0 ≤ e < 1
 *     (bound elliptical orbits only; e = 0 gives a circle, e → 1 a
 *     parabolic escape limit).
 *   - `T_yr` — orbital period in **Julian years** (1 yr = 365.25 d).
 *     Used only for the per-century conversion. Must be strictly positive.
 * @returns `{ dphi_rad_per_orbit, dphi_arcsec_per_orbit, dphi_arcsec_per_century, M_kg, a_m, e }`:
 *   - `dphi_rad_per_orbit` — GR perihelion advance per orbit in **radians**.
 *   - `dphi_arcsec_per_orbit` — same, in **arc-seconds**.
 *   - `dphi_arcsec_per_century` — secular advance in **arc-seconds per
 *     Julian century** (×100/T_yr).
 *   - `M_kg`, `a_m`, `e` — input echoes (same units as above).
 * @throws {RangeError} if `a_m ≤ 0`, `T_yr ≤ 0`, or `e` is outside [0, 1).
 *
 * @public
 */
export function evaluatePerihelionPrecession(
  inputs: PerihelionPrecessionInputs,
): PerihelionPrecessionResult {
  const { M_kg, a_m, e, T_yr } = inputs;

  if (!(a_m > 0)) {
    throw new RangeError(
      `evaluatePerihelionPrecession: a_m must be positive (got ${a_m})`,
    );
  }
  if (!(T_yr > 0)) {
    throw new RangeError(
      `evaluatePerihelionPrecession: T_yr must be positive (got ${T_yr})`,
    );
  }
  if (!(e >= 0 && e < 1)) {
    throw new RangeError(
      `evaluatePerihelionPrecession: eccentricity must be in [0, 1) — bound orbits only (got ${e})`,
    );
  }

  // Δφ = 6π G M / (a (1−e²) c²)
  const dphi_rad_per_orbit =
    (6 * Math.PI * G_SI * M_kg) / (a_m * (1 - e * e) * c_SI * c_SI);

  const radToArcsec = (180 / Math.PI) * 3600;           // 206264.806...
  const dphi_arcsec_per_orbit = dphi_rad_per_orbit * radToArcsec;

  const orbits_per_century = 100 / T_yr;
  const dphi_arcsec_per_century = dphi_arcsec_per_orbit * orbits_per_century;

  return {
    dphi_rad_per_orbit,
    dphi_arcsec_per_orbit,
    dphi_arcsec_per_century,
    M_kg,
    a_m,
    e,
  };
}
