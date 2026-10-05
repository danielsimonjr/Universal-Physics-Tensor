/**
 * BE-73 — Kelvin relation,
 *   Π = S T,
 * the isothermal Peltier coefficient and the open-circuit Seebeck
 * coefficient. `L12 = L21` is `ThermoelectricOnsager.onsager`, a
 * structure field naming microscopic reversibility. It is not an axiom
 * and not a numeric input of this function. Without that equality the
 * two coefficients disagree, and this function does not invent the
 * disagreement.
 *
 * The first Thomson relation `μ = T dS/dT` is not this equation.
 * The overlay formalRef is `PhysJS.KelvinRelation.peltier_eq`.
 *
 * @module bridges/be73-kelvin-peltier
 */

/**
 * Inputs for {@link evaluateKelvinPeltier}.
 * @internal
 */
export interface KelvinPeltierInputs {
  /** Seebeck coefficient, V/K. */
  readonly S_V_per_K: number;
  /** Absolute temperature, kelvin. */
  readonly T_K: number;
}

/**
 * Result of {@link evaluateKelvinPeltier}.
 * @internal
 */
export interface KelvinPeltierResult {
  readonly S_V_per_K: number;
  readonly T_K: number;
  /** Peltier coefficient, V. */
  readonly Pi_V: number;
}

/**
 * Evaluate `Π = S T`.
 *
 * @internal
 */
export function evaluateKelvinPeltier({ S_V_per_K, T_K }: KelvinPeltierInputs): KelvinPeltierResult {
  if (!Number.isFinite(S_V_per_K)) {
    throw new Error('evaluateKelvinPeltier: S_V_per_K must be finite');
  }
  if (!Number.isFinite(T_K) || T_K === 0) {
    throw new Error('evaluateKelvinPeltier: T_K must be finite and nonzero');
  }
  const Pi_V = S_V_per_K * T_K;
  return { S_V_per_K, T_K, Pi_V };
}
