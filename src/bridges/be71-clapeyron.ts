/**
 * BE-71 — Clapeyron slope,
 *   dP/dT = L / (T Δv),
 * with `L = T (s2 − s1)` the specific latent heat already substituted.
 * The companion entropy slope `(s2−s1)/(v2−v1)` is that substitution's
 * premise. It is not a second formalRef and not a second evaluator.
 *
 * Dropping `T`, or replacing `Δv` by one phase volume, is a different
 * slope. The ideal-gas vapor-pressure integral is not this function.
 * The overlay formalRef is `PhysJS.Clapeyron.slope_eq`.
 *
 * @module bridges/be71-clapeyron
 */

/**
 * Inputs for {@link evaluateClapeyron}.
 * @internal
 */
export interface ClapeyronInputs {
  /** Specific latent heat, J/kg. `L = T (s2 − s1)`. */
  readonly L_J_per_kg: number;
  /** Absolute temperature, kelvin. Nonzero. */
  readonly T_K: number;
  /** Specific-volume change `v2 − v1`, m³/kg. Nonzero. */
  readonly delta_v_m3_per_kg: number;
}

/**
 * Result of {@link evaluateClapeyron}.
 * @internal
 */
export interface ClapeyronResult {
  readonly L_J_per_kg: number;
  readonly T_K: number;
  readonly delta_v_m3_per_kg: number;
  /** Coexistence slope, Pa/K. */
  readonly slope_Pa_per_K: number;
}

/**
 * Evaluate `dP/dT = L / (T Δv)`.
 *
 * @internal
 */
export function evaluateClapeyron({
  L_J_per_kg,
  T_K,
  delta_v_m3_per_kg,
}: ClapeyronInputs): ClapeyronResult {
  if (!Number.isFinite(L_J_per_kg)) {
    throw new Error('evaluateClapeyron: L_J_per_kg must be finite');
  }
  if (!Number.isFinite(T_K) || T_K === 0) {
    throw new Error('evaluateClapeyron: T_K must be finite and nonzero');
  }
  if (!Number.isFinite(delta_v_m3_per_kg) || delta_v_m3_per_kg === 0) {
    throw new Error('evaluateClapeyron: delta_v_m3_per_kg must be finite and nonzero');
  }
  const slope_Pa_per_K = L_J_per_kg / (T_K * delta_v_m3_per_kg);
  return { L_J_per_kg, T_K, delta_v_m3_per_kg, slope_Pa_per_K };
}
