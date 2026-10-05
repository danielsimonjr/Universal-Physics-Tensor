/**
 * BE-97 — Ambegaokar–Baratoff product at zero temperature,
 *   I_c R_n = π Δ / (2 e).
 *
 * The chain rule along E = Δ cosh t pulls the coherence-factor
 * integrand back to sech t for t > 0. ∫₀^T sech = arctan(sinh T),
 * and the limit T → ∞ is π/2. The tunnel Hamiltonian at zero
 * temperature and identical gaps is the hypothesis that e I_c R_n
 * is Δ times that improper integral. A coefficient other than π/2
 * fails. Not the finite-temperature tanh factor. There is no
 * temperature input.
 *
 * The overlay formalRef is `PhysJS.AmbegaokarBaratoff.ambegaokar_baratoff`.
 *
 * @module bridges/be97-ambegaokar-baratoff
 */
import { E_SI } from '../core/constants.js';

/**
 * Inputs for {@link evaluateAmbegaokarBaratoff}.
 * @internal
 */
export interface AmbegaokarBaratoffInputs {
  /** Gap, joules. Identical on the two sides, at T = 0. */
  readonly Delta_J: number;
}

/**
 * Result of {@link evaluateAmbegaokarBaratoff}.
 * @internal
 */
export interface AmbegaokarBaratoffResult {
  readonly Delta_J: number;
  /** Product I_c R_n, volts. */
  readonly IcRn_V: number;
}

/**
 * Evaluate the T = 0 Ambegaokar–Baratoff product. Not the tanh factor.
 *
 * @internal
 */
export function evaluateAmbegaokarBaratoff({ Delta_J }: AmbegaokarBaratoffInputs): AmbegaokarBaratoffResult {
  if (!Number.isFinite(Delta_J) || Delta_J <= 0) {
    throw new Error('evaluateAmbegaokarBaratoff: Delta_J must be finite and > 0');
  }
  const IcRn_V = (Math.PI * Delta_J) / (2 * E_SI);
  return { Delta_J, IcRn_V };
}
