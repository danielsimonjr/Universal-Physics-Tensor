/**
 * BE-66 — Radiation pressure of a beam on an opaque surface,
 *   P_n = (I/c) (1+R) cos²θ.
 *
 * `R = 0` and `θ = 0` is the perfect-absorber endpoint `I/c`.
 * `R = 1` and `θ = 0` is the perfect-reflector endpoint `2I/c`.
 * Transmission is zero. The combined factor is this catalog's assembly
 * of the normal-incidence `(1+R)` with the oblique `cos²θ`. It is not a
 * quotation of one source.
 *
 * Unproven. There is no PhysJS key and no `formalRef`. The factor of 2
 * in `PhysJS.Eddington.wrong_dictionary_factor_two` doubles a luminosity
 * and is not this mirror factor. BE-64's encoded force uses factor 1.
 *
 * @module bridges/be66-radiation-pressure
 */
import { C_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateRadiationPressure}.
 * @public
 */
export interface RadiationPressureInputs {
  /** Beam intensity, W/m². The magnitude of the time-averaged Poynting flux. */
  readonly I_W_per_m2: number;
  /** Intensity reflectance, dimensionless, on [0, 1]. Transmission is zero. */
  readonly R: number;
  /** Angle from the outward normal, radians. */
  readonly theta_rad: number;
}

/**
 * Result of {@link evaluateRadiationPressure}.
 * @public
 */
export interface RadiationPressureResult {
  readonly I_W_per_m2: number;
  readonly R: number;
  readonly theta_rad: number;
  /** Normal pressure, pascals. */
  readonly P_Pa: number;
}

/**
 * Evaluate `P_n = (I/c) (1+R) cos²θ`.
 *
 * @public
 */
export function evaluateRadiationPressure({
  I_W_per_m2,
  R,
  theta_rad,
}: RadiationPressureInputs): RadiationPressureResult {
  if (!Number.isFinite(I_W_per_m2) || I_W_per_m2 < 0) {
    throw new Error('evaluateRadiationPressure: I_W_per_m2 must be finite and ≥ 0');
  }
  if (!Number.isFinite(R) || R < 0 || R > 1) {
    throw new Error('evaluateRadiationPressure: R must be finite and on [0, 1]');
  }
  if (!Number.isFinite(theta_rad)) {
    throw new Error('evaluateRadiationPressure: theta_rad must be finite');
  }
  const P_Pa = (I_W_per_m2 / C_SI) * (1 + R) * Math.cos(theta_rad) ** 2;
  return { I_W_per_m2, R, theta_rad, P_Pa };
}
