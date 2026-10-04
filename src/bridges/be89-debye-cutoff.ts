/**
 * BE-89 — Debye cutoff of three acoustic branches,
 *   ω_D = v_s (6 π² n)^{1/3}.
 *
 * Three branches filling 3n states, 3·(4π/3) k_D³/(2π)³ = 3n, give
 * k_D³ = 6 π² n. Equating that three-branch sum to n gives
 * k_D³ = 2 π² n. The branch count and the common speed are hypotheses.
 *
 * The overlay formalRef is `PhysJS.DebyeCutoff.debye_cutoff`.
 *
 * @module bridges/be89-debye-cutoff
 */

/**
 * Inputs for {@link evaluateDebyeCutoff}.
 * @public
 */
export interface DebyeCutoffInputs {
  /** Common acoustic speed, metres per second. */
  readonly v_m_per_s: number;
  /** Number density of atoms, per cubic metre. */
  readonly n_per_m3: number;
}

/**
 * Result of {@link evaluateDebyeCutoff}.
 * @public
 */
export interface DebyeCutoffResult {
  readonly v_m_per_s: number;
  readonly n_per_m3: number;
  /** Debye frequency of one linear branch, radians per second. */
  readonly omega_D_rad_per_s: number;
}

/**
 * Evaluate ω_D = v_s (6 π² n)^{1/3}.
 *
 * @public
 */
export function evaluateDebyeCutoff({ v_m_per_s, n_per_m3 }: DebyeCutoffInputs): DebyeCutoffResult {
  if (!Number.isFinite(v_m_per_s) || v_m_per_s <= 0) {
    throw new Error('evaluateDebyeCutoff: v_m_per_s must be finite and > 0');
  }
  if (!Number.isFinite(n_per_m3) || n_per_m3 <= 0) {
    throw new Error('evaluateDebyeCutoff: n_per_m3 must be finite and > 0');
  }
  const omega_D_rad_per_s = v_m_per_s * (6 * Math.PI ** 2 * n_per_m3) ** (1 / 3);
  return { v_m_per_s, n_per_m3, omega_D_rad_per_s };
}
