/**
 * BE-91 — Einstein solid heat capacity,
 *   C_V = 3 N k_B (θ_E/T)² exp(θ_E/T) / (exp(θ_E/T) − 1)².
 *
 * Three Planck oscillators per atom, each of energy
 * k_B θ_E / (exp(θ_E/T) − 1), differentiate to that heat capacity.
 * The zero-point k_B θ_E/2 is constant and is not in C_V. The kernel
 * tends to 1 as θ_E/T → 0⁺, so the high-temperature limit is 3 N k_B.
 * One oscillator tends to N k_B. Three oscillators and the Einstein
 * spectrum are hypotheses.
 *
 * The overlay formalRef is `PhysJS.EinsteinSolid.einstein_heat`.
 *
 * @module bridges/be91-einstein-solid
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateEinsteinSolid}.
 * @public
 */
export interface EinsteinSolidInputs {
  /** Number of atoms. */
  readonly N: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Einstein temperature, kelvin. */
  readonly thetaE_K: number;
}

/**
 * Result of {@link evaluateEinsteinSolid}.
 * @public
 */
export interface EinsteinSolidResult {
  readonly N: number;
  readonly T_K: number;
  readonly thetaE_K: number;
  /** Heat capacity, joules per kelvin. */
  readonly C_V_J_per_K: number;
}

/**
 * Evaluate the three-oscillator Einstein heat capacity.
 *
 * @public
 */
export function evaluateEinsteinSolid({ N, T_K, thetaE_K }: EinsteinSolidInputs): EinsteinSolidResult {
  if (!Number.isFinite(N) || N <= 0) {
    throw new Error('evaluateEinsteinSolid: N must be finite and > 0');
  }
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateEinsteinSolid: T_K must be finite and > 0');
  }
  if (!Number.isFinite(thetaE_K) || thetaE_K <= 0) {
    throw new Error('evaluateEinsteinSolid: thetaE_K must be finite and > 0');
  }
  const x = thetaE_K / T_K;
  const ex = Math.exp(x);
  const C_V_J_per_K = 3 * N * K_B_SI * (x * x * ex) / (ex - 1) ** 2;
  return { N, T_K, thetaE_K, C_V_J_per_K };
}
