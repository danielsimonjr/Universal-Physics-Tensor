/**
 * BE-102 — two-spin Landauer conductance,
 *   G = (2 e² / h) Σ T_n.
 *
 * A one-dimensional mode of speed v in a length L has density of
 * states L/(h v) per spin, and the flux times v/L cancels to 1/h.
 * Current is spin · e · (Σ T_n) · (1/h) · Δμ with spin = 2 and
 * Δμ = e V. One spin is e²/h. The transmissions and the bias window
 * are hypotheses. Not the Hall conductance and not Landauer erasure.
 *
 * The overlay formalRef is `PhysJS.LandauerConductance.conductance_eq`.
 *
 * @module bridges/be102-landauer-conductance
 */
import { E_SI, H_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateLandauerConductance}.
 * @internal
 */
export interface LandauerConductanceInputs {
  /** Sum of transmission eigenvalues. */
  readonly sum_Tn: number;
}

/**
 * Result of {@link evaluateLandauerConductance}.
 * @internal
 */
export interface LandauerConductanceResult {
  readonly sum_Tn: number;
  /** Conductance, siemens. */
  readonly G_S: number;
}

/**
 * Evaluate the two-spin Landauer conductance. Not h/(e²) and not erasure.
 *
 * @internal
 */
export function evaluateLandauerConductance({ sum_Tn }: LandauerConductanceInputs): LandauerConductanceResult {
  if (!Number.isFinite(sum_Tn)) {
    throw new Error('evaluateLandauerConductance: sum_Tn must be finite');
  }
  const G_S = ((2 * E_SI ** 2) / H_SI) * sum_Tn;
  return { sum_Tn, G_S };
}
