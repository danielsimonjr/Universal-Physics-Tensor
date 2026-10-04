/**
 * BE-79 — parallel-plate pull-in voltage,
 *   V_pi² = 8 k g0³ / (27 ε0 A).
 *
 * C = ε0 A/g has dC/dg = −ε0 A/g². Equilibrium of a linear spring
 * against the coenergy force is k(g0−g) = ε0 A V²/(2 g²). The fold is
 * g = 2 g0/3. g = g0/2 is not the fold. Not a fringing field.
 *
 * The overlay formalRef is `PhysJS.PullIn.pull_in_eq`.
 *
 * @module bridges/be79-pull-in
 */
import { EPS0_SI } from '../dimensional/formula-names.js';

/**
 * Inputs for {@link evaluatePullIn}.
 * @public
 */
export interface PullInInputs {
  /** Linear spring stiffness, newtons per metre. */
  readonly k_N_per_m: number;
  /** Rest gap, metres. */
  readonly g0_m: number;
  /** Plate area, square metres. */
  readonly A_m2: number;
}

/**
 * Result of {@link evaluatePullIn}.
 * @public
 */
export interface PullInResult {
  readonly k_N_per_m: number;
  readonly g0_m: number;
  readonly A_m2: number;
  /** Pull-in voltage, volts. The positive square root. */
  readonly V_pi_V: number;
}

/**
 * Evaluate `V_pi = √(8 k g0³ / (27 ε0 A))`.
 *
 * `ε0` is the vacuum permittivity. The gap at the fold is `2 g0/3`,
 * not `g0/2`. Fringing is not in the theorem.
 *
 * @public
 */
export function evaluatePullIn({ k_N_per_m, g0_m, A_m2 }: PullInInputs): PullInResult {
  if (!Number.isFinite(k_N_per_m) || k_N_per_m <= 0) {
    throw new Error('evaluatePullIn: k_N_per_m must be finite and > 0');
  }
  if (!Number.isFinite(g0_m) || g0_m <= 0) {
    throw new Error('evaluatePullIn: g0_m must be finite and > 0');
  }
  if (!Number.isFinite(A_m2) || A_m2 <= 0) {
    throw new Error('evaluatePullIn: A_m2 must be finite and > 0');
  }
  const V_pi_V = Math.sqrt((8 * k_N_per_m * g0_m ** 3) / (27 * EPS0_SI * A_m2));
  return { k_N_per_m, g0_m, A_m2, V_pi_V };
}
