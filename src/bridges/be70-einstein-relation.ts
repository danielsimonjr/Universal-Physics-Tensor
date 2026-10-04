/**
 * BE-70 — Einstein relation,
 *   D = μ k_B T / q,
 * where drift cancels diffusion on a Boltzmann profile. Dropping `q`
 * is a different diffusivity. `μ` is the electrical mobility (drift
 * speed per electric field). The force-mobility writing needs
 * `μ_force = μ/q` and is not this function. `μ` and `q` have the
 * same sign: opposite signs are not a negative diffusivity.
 *
 * Onsager reciprocity is not an input. Stokes–Einstein is a different
 * equation. The overlay formalRef is `PhysJS.EinsteinRelation.diffusion_eq`.
 *
 * @module bridges/be70-einstein-relation
 */
import { K_B_SI } from '../core/constants.js';
import { assertSameCarrierSign } from './carrier-sign.js';

/**
 * Inputs for {@link evaluateEinsteinRelation}.
 * @public
 */
export interface EinsteinRelationInputs {
  /** Electrical mobility, m²/(V·s). */
  readonly mu_m2_per_Vs: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Carrier charge, coulomb. Nonzero, and the same sign as `mu_m2_per_Vs`. */
  readonly q_C: number;
}

/**
 * Result of {@link evaluateEinsteinRelation}.
 * @public
 */
export interface EinsteinRelationResult {
  readonly mu_m2_per_Vs: number;
  readonly T_K: number;
  readonly q_C: number;
  /** Diffusivity, m²/s. */
  readonly D_m2_per_s: number;
}

/**
 * Evaluate `D = μ k_B T / q`.
 *
 * @public
 */
export function evaluateEinsteinRelation({
  mu_m2_per_Vs,
  T_K,
  q_C,
}: EinsteinRelationInputs): EinsteinRelationResult {
  if (!Number.isFinite(mu_m2_per_Vs)) {
    throw new Error('evaluateEinsteinRelation: mu_m2_per_Vs must be finite');
  }
  if (!Number.isFinite(T_K) || T_K === 0) {
    throw new Error('evaluateEinsteinRelation: T_K must be finite and nonzero');
  }
  if (!Number.isFinite(q_C) || q_C === 0) {
    throw new Error('evaluateEinsteinRelation: q_C must be finite and nonzero');
  }
  assertSameCarrierSign(mu_m2_per_Vs, q_C, 'evaluateEinsteinRelation: mu_m2_per_Vs', 'q_C');
  const D_m2_per_s = (mu_m2_per_Vs * K_B_SI * T_K) / q_C;
  return { mu_m2_per_Vs, T_K, q_C, D_m2_per_s };
}
