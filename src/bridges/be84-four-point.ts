/**
 * BE-84 — collinear four-point sheet resistance,
 *   R_s = (π / ln 2) (V / I).
 *
 * On an infinite sheet the radial field of a point current is
 * (I R_s)/(2 π r), and the potential drop is the integral of 1/r.
 * Probes at 0, s, 2s, and 3s, with current in at 0 and out at 3s,
 * each contribute (I R_s/(2 π)) ln 2 on the inner pair. Superposition
 * gives this factor. A sink at 4s gives 2π/ln 3 instead. Not
 * `PhysJS.Crossing.antisymmetry`.
 *
 * The overlay formalRef is `PhysJS.FourPoint.sheet_eq`.
 *
 * @module bridges/be84-four-point
 */

/**
 * Inputs for {@link evaluateFourPointSheet}.
 * @internal
 */
export interface FourPointSheetInputs {
  /** Inner-pair voltage, volts. */
  readonly V_volts: number;
  /** Probe current, amperes. Nonzero. */
  readonly I_A: number;
}

/**
 * Result of {@link evaluateFourPointSheet}.
 * @internal
 */
export interface FourPointSheetResult {
  readonly V_volts: number;
  readonly I_A: number;
  /** Sheet resistance, ohms per square. */
  readonly R_s_ohm: number;
}

/**
 * Evaluate `R_s = (π / ln 2) (V / I)` for equally spaced collinear probes.
 *
 * The radial 1/r field and linear superposition are hypotheses. The
 * spacing s cancels and is not an input. A sink at 4s is not this factor.
 *
 * @internal
 */
export function evaluateFourPointSheet({ V_volts, I_A }: FourPointSheetInputs): FourPointSheetResult {
  if (!Number.isFinite(V_volts)) {
    throw new Error('evaluateFourPointSheet: V_volts must be finite');
  }
  if (!Number.isFinite(I_A) || I_A === 0) {
    throw new Error('evaluateFourPointSheet: I_A must be finite and nonzero');
  }
  const R_s_ohm = (Math.PI / Math.log(2)) * (V_volts / I_A);
  return { V_volts, I_A, R_s_ohm };
}
