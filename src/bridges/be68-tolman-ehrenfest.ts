/**
 * BE-68 — Tolman–Ehrenfest invariant in the repository signature,
 *   T √(−g_00) = const,
 * for a static spacetime with `g_00 < 0`. The 1930 form `T0 √g_44` is
 * the mostly-minus reference for the sign translation. `T ‖ξ‖ = const`
 * is out of scope.
 *
 * `Math.sqrt(g_00)` is not this formula: for `g_00 < 0` that square root
 * is `NaN`. Units give two invariants and do not identify them.
 *
 * Unproven. There is no PhysJS key and no `formalRef`. Not a horizon
 * temperature, and not a chain through be-42.
 *
 * @module bridges/be68-tolman-ehrenfest
 */

/** @public */
export interface TolmanInputs {
  /** Proper temperature, kelvin. */
  readonly T_K: number;
  /** Metric component `g_00`. Must be negative. */
  readonly g_00: number;
}

/** @public */
export interface TolmanResult {
  readonly T_K: number;
  readonly g_00: number;
  /** `T √(−g_00)`, kelvin. */
  readonly invariant_K: number;
}

/**
 * Evaluate `T √(−g_00)`.
 *
 * @public
 */
export function evaluateTolmanEhrenfest({ T_K, g_00 }: TolmanInputs): TolmanResult {
  if (!Number.isFinite(T_K) || T_K <= 0) {
    throw new Error('evaluateTolmanEhrenfest: T_K must be finite and > 0');
  }
  if (!Number.isFinite(g_00) || g_00 >= 0) {
    throw new Error('evaluateTolmanEhrenfest: g_00 must be finite and < 0');
  }
  const invariant_K = T_K * Math.sqrt(-g_00);
  return { T_K, g_00, invariant_K };
}

/**
 * Proper temperature at a metric component, given a constant invariant:
 * `T = invariant / √(−g_00)`.
 *
 * @public
 */
export function tolmanTemperatureAt(invariant_K: number, g_00: number): number {
  if (!Number.isFinite(invariant_K) || invariant_K <= 0) {
    throw new Error('tolmanTemperatureAt: invariant_K must be finite and > 0');
  }
  if (!Number.isFinite(g_00) || g_00 >= 0) {
    throw new Error('tolmanTemperatureAt: g_00 must be finite and < 0');
  }
  return invariant_K / Math.sqrt(-g_00);
}
