/**
 * Bridge Equation 57 — Unruh effect (acceleration/kinematics ↔ quantum-thermal).
 *
 * A uniformly accelerated observer in the Minkowski vacuum perceives a thermal
 * bath at the Unruh temperature
 *
 *     T = ℏ a / (2π c k_B),
 *
 * a = proper acceleration. This bridges KINEMATICS (acceleration) to a
 * QUANTUM-THERMAL observable — the kinematic sibling of Hawking radiation
 * (BE-42: horizon surface gravity κ → temperature via the same 2π factor,
 * a → κ). Predicted by Fulling 1973 / Davies 1975 / Unruh 1976.
 *
 * Closed-form evaluator (BE-51/52 pattern). Dimensional signature: temperature.
 *
 * CONFRONTATION DEFERRED: lab accelerations give T ≈ 4×10⁻²⁰ K per 1g —
 * unmeasurable; analog-gravity results are indirect. Encoded as an established
 * bridge with NO data test (Adam/Eve vet 2026-07-05: DEFER/DEFER). There is no
 * `be57-*-confrontation.ts`; BE-57 is not in DATA_CONFRONTED_IDS.
 *
 * @module bridges/be57-unruh
 */
import { HBAR_SI, C_SI, K_B_SI } from '../core/constants.js';

/** Inputs for the Unruh temperature. @internal */
export interface UnruhInputs {
  /** Proper acceleration a (m/s²), ≥ 0. */
  readonly a_m_s2: number;
}

/** Result of evaluating the Unruh temperature. @internal */
export interface UnruhResult {
  readonly a_m_s2: number;
  /** Unruh temperature T = ℏa/(2π c k_B) (K). */
  readonly T_K: number;
}

/**
 * Evaluate the Unruh temperature for proper acceleration a.
 *
 * @internal
 */
export function evaluateUnruh({ a_m_s2 }: UnruhInputs): UnruhResult {
  if (!(a_m_s2 >= 0)) {
    throw new Error('evaluateUnruh: a_m_s2 (proper acceleration) must be ≥ 0');
  }
  return {
    a_m_s2,
    T_K: (HBAR_SI * a_m_s2) / (2 * Math.PI * C_SI * K_B_SI),
  };
}
