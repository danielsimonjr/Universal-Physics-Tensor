/**
 * BE-75 — London penetration depth,
 *   λ_L = √(m / (μ0 n e²)).
 *
 * `e` is the elementary charge. The dimension matrix of `{m, μ0, n, e}`
 * also admits `μ0 e²/m`, so units do not choose this root. Replacing `e`
 * by `2e` is not this depth. This is not the classical skin depth.
 *
 * `μ0` is `1/(ε0 c²)`. The overlay formalRef is
 * `PhysJS.LondonPenetration.depth_eq`.
 *
 * @module bridges/be75-london-penetration
 */
import { E_SI } from '../core/constants.js';
import { MU0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluateLondonPenetration}.
 * @public
 */
export interface LondonPenetrationInputs {
  /** Carrier mass, kg. */
  readonly m_kg: number;
  /** Carrier number density, m⁻³. */
  readonly n_per_m3: number;
}

/**
 * Result of {@link evaluateLondonPenetration}.
 * @public
 */
export interface LondonPenetrationResult {
  readonly m_kg: number;
  readonly n_per_m3: number;
  /** London depth, metres. */
  readonly lambda_m: number;
}

/**
 * Evaluate `λ_L = √(m / (μ0 n e²))` with `e` the elementary charge.
 *
 * @public
 */
export function evaluateLondonPenetration({
  m_kg,
  n_per_m3,
}: LondonPenetrationInputs): LondonPenetrationResult {
  if (!Number.isFinite(m_kg) || m_kg <= 0) {
    throw new Error('evaluateLondonPenetration: m_kg must be finite and > 0');
  }
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluateLondonPenetration: n_per_m3 must be finite and > 0');
  }
  const lambda_m = Math.sqrt(m_kg / (MU0_SI * n_per_m3 * E_SI * E_SI));
  return { m_kg, n_per_m3, lambda_m };
}
