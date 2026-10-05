/**
 * BE-83 — first Thomson relation,
 *   μ_T = T dS/dT.
 *
 * The Kelvin relation Π(t) = S(t) t, which is
 * `PhysJS.KelvinRelation.peltier_eq` read along temperature, and the
 * Thomson split μ = dΠ/dT − S, give μ = T dS/dT by the product rule.
 * dΠ/dT is not μ when S T ≠ 0. Not a second copy of Π = S T.
 *
 * The overlay formalRef is `PhysJS.Thomson.thomson_eq`.
 *
 * @module bridges/be83-thomson
 */

/**
 * Inputs for {@link evaluateThomsonCoefficient}.
 * @internal
 */
export interface ThomsonCoefficientInputs {
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
  /**
   * Temperature derivative of the Seebeck coefficient, volts per
   * kelvin squared. This is S', not a sampled difference of S.
   */
  readonly dS_dT_V_per_K2: number;
}

/**
 * Result of {@link evaluateThomsonCoefficient}.
 * @internal
 */
export interface ThomsonCoefficientResult {
  readonly T_K: number;
  readonly dS_dT_V_per_K2: number;
  /** Thomson coefficient, volts per kelvin. */
  readonly mu_V_per_K: number;
}

/**
 * Evaluate `μ_T = T dS/dT`.
 *
 * The functional Kelvin relation and the Thomson split are hypotheses.
 * This is not Π = S T.
 *
 * @internal
 */
export function evaluateThomsonCoefficient({
  T_K,
  dS_dT_V_per_K2,
}: ThomsonCoefficientInputs): ThomsonCoefficientResult {
  if (!Number.isFinite(T_K)) {
    throw new Error('evaluateThomsonCoefficient: T_K must be finite');
  }
  if (!Number.isFinite(dS_dT_V_per_K2)) {
    throw new Error('evaluateThomsonCoefficient: dS_dT_V_per_K2 must be finite');
  }
  const mu_V_per_K = T_K * dS_dT_V_per_K2;
  return { T_K, dS_dT_V_per_K2, mu_V_per_K };
}
