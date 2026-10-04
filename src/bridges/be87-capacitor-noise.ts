/**
 * BE-87 — mean-square voltage on one capacitor,
 *   ⟨v²⟩ = k_B T / C.
 *
 * dU/dV = C V and U(0) = 0 integrate to U = (C/2) V². The normalized
 * Boltzmann weight of that energy is the Gaussian of mean 0 and
 * variance k_B T/C. The mean square on that law is k_B T/C, and (C/2)
 * of it is (1/2) k_B T. (3/2) k_B T/C is not this variance. Dropping
 * the energy half replaces it by k_B T/(2 C). Not three kinetic
 * degrees of freedom.
 *
 * The overlay formalRef is `PhysJS.CapacitorNoise.noise_eq`.
 *
 * @module bridges/be87-capacitor-noise
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateCapacitorNoise}.
 * @public
 */
export interface CapacitorNoiseInputs {
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Capacitance, farads. */
  readonly C_F: number;
}

/**
 * Result of {@link evaluateCapacitorNoise}.
 * @public
 */
export interface CapacitorNoiseResult {
  readonly T_K: number;
  readonly C_F: number;
  /** Mean square voltage, volts squared. */
  readonly v2_V2: number;
}

/**
 * Evaluate `⟨v²⟩ = k_B T / C` for one quadratic capacitor term.
 *
 * @public
 */
export function evaluateCapacitorNoise({ T_K, C_F }: CapacitorNoiseInputs): CapacitorNoiseResult {
  if (!Number.isFinite(T_K)) {
    throw new Error('evaluateCapacitorNoise: T_K must be finite');
  }
  if (!Number.isFinite(C_F) || C_F <= 0) {
    throw new Error('evaluateCapacitorNoise: C_F must be finite and > 0');
  }
  const v2_V2 = (K_B_SI * T_K) / C_F;
  return { T_K, C_F, v2_V2 };
}
