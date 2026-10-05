/**
 * Bridge Equation 58 — Johnson-Nyquist noise / fluctuation-dissipation
 * (thermal fluctuation ↔ electrical dissipation).
 *
 * A resistor R in thermal equilibrium at temperature T generates a fluctuating
 * voltage whose one-sided power spectral density is
 *
 *     S_V = 4 k_B T R
 *
 * (frequency-independent in the classical/low-frequency limit). This is the
 * fluctuation-dissipation theorem for an electrical circuit: the equilibrium
 * voltage FLUCTUATIONS are fixed by the DISSIPATION (R). Discovered by Johnson
 * 1928, derived by Nyquist 1928. (The catalog's BE-27 is the *speculative
 * active-matter VIOLATION* of the FDT; BE-58 is the established theorem.)
 *
 * Closed-form evaluator (BE-51/52 pattern). Dimensional signature: S_V in V²/Hz
 * = [L⁴ M² T⁻⁵ I⁻²]. Confronted via `be58-johnson-nyquist-confrontation.ts`
 * (NIST Johnson Noise Thermometry k_B vs CODATA; Adam/Eve vet GREEN/GREEN —
 * factor-of-4 confirmed to < ppm).
 *
 * @module bridges/be58-johnson-nyquist
 */
import { K_B_SI } from '../core/constants.js';

/** Inputs for the Johnson-Nyquist voltage-noise PSD. @internal */
export interface JohnsonNyquistInputs {
  /** Temperature T (K), ≥ 0. */
  readonly T_K: number;
  /** Resistance R (Ω), ≥ 0. */
  readonly R_ohm: number;
}

/** Result of evaluating the Johnson-Nyquist noise. @internal */
export interface JohnsonNyquistResult {
  readonly T_K: number;
  readonly R_ohm: number;
  /** One-sided voltage-noise power spectral density S_V = 4 k_B T R (V²/Hz). */
  readonly S_V_V2_per_Hz: number;
}

/**
 * Evaluate the one-sided Johnson-Nyquist voltage-noise PSD for a resistor R at
 * temperature T.
 *
 * @internal
 */
export function evaluateJohnsonNyquist({
  T_K,
  R_ohm,
}: JohnsonNyquistInputs): JohnsonNyquistResult {
  if (!(T_K >= 0) || !(R_ohm >= 0)) {
    throw new Error('evaluateJohnsonNyquist: T_K and R_ohm must be ≥ 0');
  }
  return { T_K, R_ohm, S_V_V2_per_Hz: 4 * K_B_SI * T_K * R_ohm };
}
