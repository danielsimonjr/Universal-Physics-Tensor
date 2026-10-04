/**
 * BE-80 — Mott–Gurney current,
 *   J = (9/8) ε μ V² / d³.
 *
 * Drift J = q n μ E and Poisson dE/dx = q n/ε give E dE/dx = J/(ε μ).
 * With E(0) = 0 the integral is E²/2 = J x/(ε μ). The nonnegative root
 * from 0 to d is this current. A factor other than 9/8 is not this
 * current. Not Child–Langmuir.
 *
 * The overlay formalRef is `PhysJS.MottGurney.current_eq`.
 *
 * @module bridges/be80-mott-gurney
 */

/**
 * Inputs for {@link evaluateMottGurney}.
 * @public
 */
export interface MottGurneyInputs {
  /**
   * Permittivity of the solid, farads per metre. The key has no unit
   * suffix: the evaluator takes the number in F/m.
   */
  readonly eps: number;
  /** Drift mobility, square metres per volt-second. */
  readonly mu_m2_per_Vs: number;
  /** Applied voltage, volts. The formula uses V². */
  readonly V_volts: number;
  /** Thickness, metres. */
  readonly d_m: number;
}

/**
 * Result of {@link evaluateMottGurney}.
 * @public
 */
export interface MottGurneyResult {
  readonly eps: number;
  readonly mu_m2_per_Vs: number;
  readonly V_volts: number;
  readonly d_m: number;
  /** Current density, amperes per square metre. */
  readonly J_A_per_m2: number;
}

/**
 * Evaluate `J = (9/8) ε μ V² / d³`.
 *
 * Drift, Poisson, and the injecting contact E(0) = 0 are hypotheses.
 * This is not the Child–Langmuir current.
 *
 * @public
 */
export function evaluateMottGurney({
  eps,
  mu_m2_per_Vs,
  V_volts,
  d_m,
}: MottGurneyInputs): MottGurneyResult {
  if (!Number.isFinite(eps) || eps <= 0) {
    throw new Error('evaluateMottGurney: eps must be finite and > 0');
  }
  if (!Number.isFinite(mu_m2_per_Vs) || mu_m2_per_Vs <= 0) {
    throw new Error('evaluateMottGurney: mu_m2_per_Vs must be finite and > 0');
  }
  if (!Number.isFinite(V_volts)) {
    throw new Error('evaluateMottGurney: V_volts must be finite');
  }
  if (!Number.isFinite(d_m) || d_m <= 0) {
    throw new Error('evaluateMottGurney: d_m must be finite and > 0');
  }
  const J_A_per_m2 = ((9 / 8) * eps * mu_m2_per_Vs * V_volts * V_volts) / d_m ** 3;
  return { eps, mu_m2_per_Vs, V_volts, d_m, J_A_per_m2 };
}
