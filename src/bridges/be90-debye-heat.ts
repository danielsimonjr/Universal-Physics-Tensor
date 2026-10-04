/**
 * BE-90 — Debye heat capacity at low temperature,
 *   C_V = (12 π⁴ / 5) N k_B (T / θ_D)³.
 *
 * The mode integral ∫₀^{ω_D} 9 N ω²/ω_D³ dω = 3 N. The energy with the
 * Bose integral extended to infinity is the hypothesis
 * U = 9 N k_B T (T/θ_D)³ I, and I = π⁴/15 is a hypothesis, not an
 * evaluation of ∫ x³/(exp(x)−1) dx. Nine times π⁴/15 is 3 π⁴/5, and
 * U = A T⁴ differentiates to the heat capacity above. The energy
 * prefactor 3 π⁴/5 is not this heat capacity.
 *
 * The overlay formalRef is `PhysJS.DebyeHeat.debye_heat`.
 *
 * @module bridges/be90-debye-heat
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateDebyeHeat}.
 * @public
 */
export interface DebyeHeatInputs {
  /** Number of atoms. */
  readonly N: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /** Debye temperature, kelvin. */
  readonly thetaD_K: number;
}

/**
 * Result of {@link evaluateDebyeHeat}.
 * @public
 */
export interface DebyeHeatResult {
  readonly N: number;
  readonly T_K: number;
  readonly thetaD_K: number;
  /** Heat capacity, joules per kelvin. */
  readonly C_V_J_per_K: number;
}

/**
 * Evaluate the low-temperature Debye heat capacity. π⁴/15 is assumed.
 *
 * @public
 */
export function evaluateDebyeHeat({ N, T_K, thetaD_K }: DebyeHeatInputs): DebyeHeatResult {
  if (!Number.isFinite(N) || N <= 0) {
    throw new Error('evaluateDebyeHeat: N must be finite and > 0');
  }
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateDebyeHeat: T_K must be finite and > 0');
  }
  if (!Number.isFinite(thetaD_K) || thetaD_K <= 0) {
    throw new Error('evaluateDebyeHeat: thetaD_K must be finite and > 0');
  }
  const C_V_J_per_K = ((12 * Math.PI ** 4) / 5) * N * K_B_SI * (T_K / thetaD_K) ** 3;
  return { N, T_K, thetaD_K, C_V_J_per_K };
}
