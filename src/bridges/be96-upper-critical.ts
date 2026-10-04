/**
 * BE-96 — upper critical field of charge q = 2e,
 *   B_c2 = ℏ / (2 e ξ²) = Φ₀ / (2 π ξ²).
 *
 * The linearized GL instability sets the Landau-level ground energy
 * ℏ q B/(2 m*) of charge q = 2e equal to |α| = ℏ²/(2 m* ξ²). That
 * level is a hypothesis, not the spectrum of the covariant Laplacian.
 * Φ₀ = h/(2e) and h = 2 π ℏ. Charge e instead of 2e is a different field.
 *
 * The overlay formalRef is `PhysJS.UpperCritical.critical_field`.
 *
 * @module bridges/be96-upper-critical
 */
import { E_SI, HBAR_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateUpperCritical}.
 * @public
 */
export interface UpperCriticalInputs {
  /** Coherence length, metres. */
  readonly xi_m: number;
}

/**
 * Result of {@link evaluateUpperCritical}.
 * @public
 */
export interface UpperCriticalResult {
  readonly xi_m: number;
  /** Upper critical field, tesla. */
  readonly B_c2_T: number;
}

/**
 * Evaluate B_c2 = ℏ / (2 e ξ²). e is the elementary charge.
 *
 * @public
 */
export function evaluateUpperCritical({ xi_m }: UpperCriticalInputs): UpperCriticalResult {
  if (!Number.isFinite(xi_m) || xi_m <= 0) {
    throw new Error('evaluateUpperCritical: xi_m must be finite and > 0');
  }
  const B_c2_T = HBAR_SI / (2 * E_SI * xi_m ** 2);
  return { xi_m, B_c2_T };
}
