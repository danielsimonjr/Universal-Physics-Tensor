/**
 * BE-78 — Euler buckling load of a pinned–pinned column,
 *   P_cr = π² E I / L².
 *
 * The Euler–Bernoulli balance y'' = −ω² y with ω² = P/(E I) and pinned
 * ends y(0) = y(L) = 0 has the eigenfunction sin(π x/L) at that load.
 * Every nontrivial solution has ω L = n π for a nonzero integer n, so
 * the load is at least this value. The clamped-free column is
 * π² E I/(4 L²). That factor is not this load.
 *
 * The overlay formalRef is `PhysJS.EulerBuckling.critical_load`.
 *
 * @module bridges/be78-euler-buckling
 */

/**
 * Inputs for {@link evaluateEulerBuckling}.
 * @public
 */
export interface EulerBucklingInputs {
  /** Young's modulus, pascal. */
  readonly E_Pa: number;
  /** Second moment of area, metres⁴. */
  readonly I_m4: number;
  /** Column length between pinned ends, metres. */
  readonly L_m: number;
}

/**
 * Result of {@link evaluateEulerBuckling}.
 * @public
 */
export interface EulerBucklingResult {
  readonly E_Pa: number;
  readonly I_m4: number;
  readonly L_m: number;
  /** Lowest pinned–pinned critical load, newtons. */
  readonly P_N: number;
}

/**
 * Evaluate `P_cr = π² E I / L²` for pinned ends.
 *
 * @public
 */
export function evaluateEulerBuckling({ E_Pa, I_m4, L_m }: EulerBucklingInputs): EulerBucklingResult {
  if (!Number.isFinite(E_Pa) || E_Pa <= 0) {
    throw new Error('evaluateEulerBuckling: E_Pa must be finite and > 0');
  }
  if (!Number.isFinite(I_m4) || I_m4 <= 0) {
    throw new Error('evaluateEulerBuckling: I_m4 must be finite and > 0');
  }
  if (!Number.isFinite(L_m) || L_m <= 0) {
    throw new Error('evaluateEulerBuckling: L_m must be finite and > 0');
  }
  const P_N = (Math.PI ** 2 * E_Pa * I_m4) / (L_m * L_m);
  return { E_Pa, I_m4, L_m, P_N };
}
