/**
 * BE-100 — Lyddane–Sachs–Teller relation,
 *   ω_LO² / ω_TO² = ε(0) / ε(∞).
 *
 * The undamped oscillator ε(ω) = ε(∞) + S/(ω_TO² − ω²) has a zero at
 * ω_LO, which fixes S, and ε(0) is the same function at zero frequency.
 * The unsquared frequency ratio fails when ω_LO ≠ ω_TO. No damping is
 * a hypothesis. The evaluator takes the two dielectric constants. It
 * does not take frequencies.
 *
 * The overlay formalRef is `PhysJS.LyddaneSachsTeller.lst`.
 *
 * @module bridges/be100-lyddane-sachs-teller
 */

/**
 * Inputs for {@link evaluateLyddaneSachsTeller}.
 * @internal
 */
export interface LyddaneSachsTellerInputs {
  /** Static dielectric constant ε(0). */
  readonly eps_static: number;
  /** High-frequency dielectric constant ε(∞). */
  readonly eps_inf: number;
}

/**
 * Result of {@link evaluateLyddaneSachsTeller}.
 * @internal
 */
export interface LyddaneSachsTellerResult {
  readonly eps_static: number;
  readonly eps_inf: number;
  /** Squared frequency ratio ω_LO²/ω_TO². */
  readonly frequency_ratio_sq: number;
}

/**
 * Evaluate ε(0)/ε(∞). That is the squared frequency ratio.
 *
 * @internal
 */
export function evaluateLyddaneSachsTeller({
  eps_static,
  eps_inf,
}: LyddaneSachsTellerInputs): LyddaneSachsTellerResult {
  if (!Number.isFinite(eps_static)) {
    throw new Error('evaluateLyddaneSachsTeller: eps_static must be finite');
  }
  if (!Number.isFinite(eps_inf) || eps_inf === 0) {
    throw new Error('evaluateLyddaneSachsTeller: eps_inf must be finite and nonzero');
  }
  const frequency_ratio_sq = eps_static / eps_inf;
  return { eps_static, eps_inf, frequency_ratio_sq };
}
