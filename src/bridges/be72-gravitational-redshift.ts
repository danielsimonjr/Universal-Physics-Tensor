/**
 * BE-72 — gravitational frequency ratio of two static observers,
 *   ν1/ν2 = √(g2/g1),
 * both `g_00` negative, so `√(−g2)/√(−g1) = √(g2/g1)`.
 *
 * This is not BE-68. Equal temperatures on `g_00 = −1` and `g_00 = −4`
 * are not a Tolman equilibrium, while this ratio is 2. The nested
 * `tolman_same_ratio` theorem says the temperature ratio equals the
 * frequency ratio only when the Tolman products also agree. Neither
 * factor is derived from the other, and this module does not identify
 * them.
 *
 * The overlay formalRef is `PhysJS.GravitationalRedshift.frequency_ratio`.
 *
 * @module bridges/be72-gravitational-redshift
 */

/**
 * Inputs for {@link evaluateGravitationalRedshift}.
 * @internal
 */
export interface GravitationalRedshiftInputs {
  /** Static `g_00` at observer 1. Must be negative. */
  readonly g1: number;
  /** Static `g_00` at observer 2. Must be negative. */
  readonly g2: number;
}

/**
 * Result of {@link evaluateGravitationalRedshift}.
 * @internal
 */
export interface GravitationalRedshiftResult {
  readonly g1: number;
  readonly g2: number;
  /** `ν1/ν2`. */
  readonly frequency_ratio: number;
}

/**
 * Evaluate `ν1/ν2 = √(g2/g1)` for two negative metric components.
 *
 * @internal
 */
export function evaluateGravitationalRedshift({
  g1,
  g2,
}: GravitationalRedshiftInputs): GravitationalRedshiftResult {
  if (!Number.isFinite(g1) || g1 >= 0) {
    throw new Error('evaluateGravitationalRedshift: g1 must be finite and < 0');
  }
  if (!Number.isFinite(g2) || g2 >= 0) {
    throw new Error('evaluateGravitationalRedshift: g2 must be finite and < 0');
  }
  const frequency_ratio = Math.sqrt(g2 / g1);
  return { g1, g2, frequency_ratio };
}
