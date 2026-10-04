/**
 * BE-95 — sign of one Ginzburg–Landau trial wall,
 *   (1/κ² − 2) times the gradient integral.
 *
 * In the normalization with gradient coefficient 1/κ², quartic
 * (1/2)(1−f²)², and field B², the density at κ² = 1/2 is
 * (√2 f' − a f)² + (B + (1−f²)/√2)² minus √2 times the derivative
 * of a(1−f²). Vanishing squares and equal endpoints make that wall
 * integral zero. A trial profile with that critical integral has
 * energy (1/κ² − 2) times the gradient integral: negative when
 * κ > 1/√2, zero at κ = 1/√2, and positive when κ < 1/√2. The
 * positive side is this trial, not every minimizer. The GL density
 * and the profile are hypotheses. This evaluator returns the
 * dimensionless factor, not a search over minimizers.
 *
 * The overlay formalRef is `PhysJS.GinzburgLandau.type_boundary`.
 *
 * @module bridges/be95-ginzburg-landau
 */

/**
 * Inputs for {@link evaluateGinzburgLandau}.
 * @public
 */
export interface GinzburgLandauInputs {
  /** Ginzburg–Landau parameter κ. */
  readonly kappa: number;
}

/**
 * Result of {@link evaluateGinzburgLandau}.
 * @public
 */
export interface GinzburgLandauResult {
  readonly kappa: number;
  /**
   * Factor (1/κ² − 2) in front of the positive gradient integral
   * of the trial wall.
   */
  readonly trial_factor: number;
}

/**
 * Evaluate the trial-wall factor (1/κ² − 2). Not the energy of every minimizer.
 *
 * @public
 */
export function evaluateGinzburgLandau({ kappa }: GinzburgLandauInputs): GinzburgLandauResult {
  if (!Number.isFinite(kappa) || kappa <= 0) {
    throw new Error('evaluateGinzburgLandau: kappa must be finite and > 0');
  }
  const trial_factor = 1 / kappa ** 2 - 2;
  return { kappa, trial_factor };
}
