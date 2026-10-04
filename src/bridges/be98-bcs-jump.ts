/**
 * BE-98 — BCS heat-capacity jump,
 *   ΔC / C_n = 12 / (7 ζ).
 *
 * The weak-coupling excess free energy
 * F = N(0) (T−T_c)/T_c · Δ² + 7 ζ N(0)/(16 π² T_c²) · Δ⁴
 * is a hypothesis, with k_B = 1. Its minimum is −α₀² (T−T_c)²/(4 β),
 * and −T ∂²F/∂T² at T_c is ΔC = T_c α₀²/(2 β) = 8 π² N(0) T_c/(7 ζ).
 * The normal heat capacity C_n = (2 π²/3) N(0) T_c is the both-spin
 * Sommerfeld value, a hypothesis. ζ is the quartic coefficient, not a
 * series evaluation. One spin in C_n misses the ratio. Not 2π exp(−γ).
 *
 * The overlay formalRef is `PhysJS.BcsJump.heat_jump`.
 *
 * @module bridges/be98-bcs-jump
 */

/**
 * Inputs for {@link evaluateBcsJump}.
 * @public
 */
export interface BcsJumpInputs {
  /** GL quartic coefficient ζ. Not a zeta-function value. */
  readonly zeta: number;
}

/**
 * Result of {@link evaluateBcsJump}.
 * @public
 */
export interface BcsJumpResult {
  readonly zeta: number;
  /** Ratio ΔC / C_n. */
  readonly ratio: number;
}

/**
 * Evaluate ΔC/C_n = 12/(7 ζ). ζ is supplied, not summed.
 *
 * @public
 */
export function evaluateBcsJump({ zeta }: BcsJumpInputs): BcsJumpResult {
  if (!Number.isFinite(zeta) || zeta === 0) {
    throw new Error('evaluateBcsJump: zeta must be finite and nonzero');
  }
  const ratio = 12 / (7 * zeta);
  return { zeta, ratio };
}
