/**
 * BE-76 — plasma beta,
 *   β = p_gas / p_B = n k_B T / p_B,
 * where `p_B` is {@link evaluateMagneticPressure} (`B²/(2 μ0)`).
 *
 * The ideal-gas closure `p_gas = n k_B T` is a hypothesis. Substituting
 * the magnetic pressure gives `β = 2 μ0 n k_B T / B²`. Using `B²/μ0` in
 * place of `p_B` is half of this beta. This is not a plasma-β inequality
 * and not a unique monomial of `{n, T, B, μ0}`.
 *
 * The overlay formalRef is `PhysJS.PlasmaBeta.beta_eq`.
 *
 * @module bridges/be76-plasma-beta
 */
import { K_B_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluatePlasmaBeta}.
 * @internal
 */
export interface PlasmaBetaInputs {
  /** Number density, m⁻³. */
  readonly n_per_m3: number;
  /** Temperature, kelvin. */
  readonly T_K: number;
  /**
   * Magnetic pressure, pascal. This is `B²/(2 μ0)`, not `B²/μ0`.
   */
  readonly p_B_Pa: number;
}

/**
 * Result of {@link evaluatePlasmaBeta}.
 * @internal
 */
export interface PlasmaBetaResult {
  readonly n_per_m3: number;
  readonly T_K: number;
  readonly p_B_Pa: number;
  /** Dimensionless pressure ratio. */
  readonly beta: number;
}

/**
 * Evaluate `β = n k_B T / p_B`.
 *
 * @internal
 */
export function evaluatePlasmaBeta({ n_per_m3, T_K, p_B_Pa }: PlasmaBetaInputs): PlasmaBetaResult {
  if (!Number.isFinite(n_per_m3)) {
    throw new Error('evaluatePlasmaBeta: n_per_m3 must be finite');
  }
  if (!Number.isFinite(T_K)) {
    throw new Error('evaluatePlasmaBeta: T_K must be finite');
  }
  if (!Number.isFinite(p_B_Pa) || p_B_Pa === 0) {
    throw new Error('evaluatePlasmaBeta: p_B_Pa must be finite and nonzero');
  }
  const beta = (n_per_m3 * K_B_SI * T_K) / p_B_Pa;
  return { n_per_m3, T_K, p_B_Pa, beta };
}
