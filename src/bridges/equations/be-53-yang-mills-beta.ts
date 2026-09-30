/**
 * Bridge Equation 53 — Yang-Mills one-loop β-function (asymptotic freedom).
 *
 * For a non-Abelian gauge theory with gauge group G coupled to N_f Dirac
 * fermions in the fundamental representation, the one-loop RG β-function
 * governing the running of the gauge coupling g is:
 *
 *   β(g) = −b₀ g³ / (16π²) + O(g⁵)
 *
 * where the one-loop coefficient b₀ for gauge group SU(N_c) with N_f
 * Dirac fermion flavors in the fundamental representation is:
 *
 *   b₀ = (11/3) C₂(G) − (4/3) T(R) N_f
 *      = (11/3) N_c   − (4/3) (1/2) N_f      [for SU(N_c) fundamental]
 *      = (11/3) N_c   − (2/3) N_f
 *
 * Here:
 *   - C₂(G) = N_c is the quadratic Casimir of the adjoint representation of
 *     SU(N_c) (structure-constant contraction f^{abc} f^{abc} / dim(G)).
 *   - T(R) = 1/2 is the index of the fundamental representation
 *     (Tr(T^a T^b) = T(R) δ^{ab}, T(fund) = 1/2 for SU(N)).
 *
 * **Asymptotic freedom** — the hallmark result of Gross, Wilczek, and Politzer
 * (Nobel Prize in Physics, 2004):
 *   - When b₀ > 0 the β-function is negative for g > 0, so the coupling
 *     decreases as the RG scale k rises: g → 0 in the UV.
 *   - The UV fixed point is g* = 0 (the Gaussian / free-theory fixed point).
 *   - QCD (SU(3), N_f = 6): b₀ = (11/3)·3 − (2/3)·6 = 11 − 4 = 7 > 0 ✓
 *   - The asymptotic-freedom boundary is b₀ = 0, reached at
 *     N_f = (11/2) N_c (≈ 16.5 for SU(3)). For N_f > (11/2) N_c the coupling
 *     runs in the infrared-free direction (analogous to QED).
 *
 * **Structural dual of BE-39** — the `BetaFunctionNode` encoding here is
 * deliberately structurally identical to BE-39's `BE39_BETA_G_STRUCTURAL`
 * (single-coupling flow, polynomial expansion, fixed-point pin) but the
 * physics is the opposite: BE-39 seeks a non-Gaussian fixed point at
 * (g*, λ*) ≠ (0, 0), whereas BE-53 has the UV fixed point at g* = 0. Both
 * are representable with identical AST shape — demonstrating the
 * `BetaFunctionNode` primitives are flow-direction-agnostic.
 *
 * @see src/dimensional/rg-flow.ts (BetaFunctionNode + RGCouplingNode)
 * @see src/bridges/equations/be-39-asymptotic-safety.ts (two-coupling NGFP dual)
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 53)
 *
 * @references
 *   - Gross & Wilczek 1973 *Phys. Rev. Lett.* 30:1343
 *     ("Ultraviolet Behavior of Non-Abelian Gauge Theories")
 *   - Politzer 1973 *Phys. Rev. Lett.* 30:1346
 *     ("Reliable Perturbative Results for Strong Interactions?")
 *   - Peskin & Schroeder 1995 "An Introduction to Quantum Field Theory" §16
 *     (canonical textbook derivation of one-loop non-Abelian β-function)
 *
 * @module bridges/equations/be-53-yang-mills-beta
 */

import type { ExprNode } from '../../dimensional/validator.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import type { BetaFunctionNode, RGCouplingNode } from '../../dimensional/rg-flow.js';
import { rgCoupling } from '../../dimensional/rg-flow.js';
import { sym, validateFiniteInputs } from './_be-helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Coupling node
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `RGCouplingNode` for the Yang-Mills gauge coupling g.
 *
 * In the RG sense, g is the dimensionless gauge coupling of the non-Abelian
 * Yang-Mills theory (or QCD for SU(3)). At one-loop the flow is governed by
 * the single-coupling β-function β(g) = −b₀ g³/(16π²).
 *
 * @public
 */
export const BE53_COUPLING_G: RGCouplingNode = rgCoupling('g');

// ─────────────────────────────────────────────────────────────────────────────
// β-function polynomial expression: −b₀ g³ / (16π²)
//
// Encoded as a single product of dimensionless symbols, following the
// BE-39 signed-stub pattern: the overall minus sign and the denominator
// 16π² are folded into a single stub symbol 'minus_b0_over_16pi2' rather
// than requiring a fractional AST subtree. The three-power g³ is encoded
// explicitly as g^3 to preserve the polynomial structure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RHS of the one-loop Yang-Mills β-function:
 *
 *   β(g) = −b₀ g³ / (16π²)
 *
 * Encoded as:
 *
 *   (−b₀/(16π²)) · g³
 *
 * where `−b₀_over_16pi2` is a dimensionless signed coefficient stub and
 * `g^3` is the explicit polynomial factor. All symbols are dimensionless;
 * the result is dimensionless per RG-discipline.
 *
 * The stub name `minus_b0_over_16pi2` is a typed-stub absorbing the
 * combined coefficient −b₀/(16π²) — consistent with the Bridge-encoding
 * patterns documented in CLAUDE.md (Wave Z). At numerical evaluation time
 * this coefficient is replaced by the concrete QCD or SU(N_c) value.
 */
export const BE53_BETA_G_RHS: ExprNode = {
  kind: 'op', op: '*',
  args: [
    sym('minus_b0_over_16pi2', DIMENSIONLESS),     // −b₀/(16π²): signed dimensionless coefficient stub
    {
      kind: 'op', op: '^',
      args: [sym('g', DIMENSIONLESS), sym('3', DIMENSIONLESS)],  // g³
    },
  ],
};

/** LHS: β(g) is dimensionless. */
/** @internal */
export const BE53_BETA_G_LHS: ExprNode = sym('beta_g', DIMENSIONLESS);

// ─────────────────────────────────────────────────────────────────────────────
// Structural BetaFunctionNode — single-coupling asymptotically-free flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structural β-function for the Yang-Mills gauge coupling.
 *
 * `BetaFunctionNode` with a single-coupling flow direction `(g)` and UV
 * fixed point pinned at g* = 0 (asymptotic freedom). The polynomial
 * expansion is the one-loop RHS `−b₀ g³/(16π²)` encoded as an explicit
 * product AST.
 *
 * This is the structural dual of `BE39_BETA_G_STRUCTURAL` (two-coupling
 * asymptotic-safety flow with NGFP at (g*, λ*) ≠ (0, 0)). The `couplings`
 * array has length 1 here, demonstrating the primitives work for
 * single-coupling flows as well as multi-coupling ones.
 *
 * @public
 */
export const BE53_BETA_G_STRUCTURAL: BetaFunctionNode = {
  kind: 'beta-function',
  couplings: [BE53_COUPLING_G],
  target: BE53_COUPLING_G,
  polynomialExpansion: BE53_BETA_G_RHS,
  fixedPoint: [0],   // UV fixed point at g* = 0 (asymptotic freedom)
};

// ─────────────────────────────────────────────────────────────────────────────
// Numerical evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input parameters for `evaluateYangMillsBeta`.
 *
 * @public
 */
interface YangMillsBetaInputs {
  /**
   * Gauge coupling g at the RG scale of interest. Must be finite.
   * The physical interpretation is the strong-coupling constant
   * g_s (related to αs = g_s² / (4π)).
   */
  g: number;
  /**
   * Number of colors N_c (gauge-group rank). For QCD, N_c = 3. Must be a
   * positive finite integer.
   */
  N_c: number;
  /**
   * Number of active Dirac fermion flavors N_f in the fundamental
   * representation. For QCD at high energy (above all quark thresholds),
   * N_f = 6. Must be a non-negative finite number.
   */
  N_f: number;
}

/**
 * Evaluate the one-loop Yang-Mills β-function for SU(N_c) with N_f
 * fundamental Dirac flavors:
 *
 *   b₀ = (11/3) N_c − (2/3) N_f
 *   β(g) = −b₀ g³ / (16π²)
 *
 * The UV fixed point is at g* = 0 when b₀ > 0 (asymptotic freedom). For
 * QCD (N_c = 3, N_f = 6): b₀ = 11 − 4 = 7, β(g) = −7 g³/(16π²).
 *
 * @returns Dimensionless β(g) value (k ∂_k g at one loop).
 * @throws `RangeError` if any input is non-finite, or N_c ≤ 0, or N_f < 0.
 *
 * @public
 */
export function evaluateYangMillsBeta(input: YangMillsBetaInputs): number {
  validateFiniteInputs(
    input,
    [
      { name: 'g' },
      { name: 'N_c', min: 0, excludeMin: true },
      { name: 'N_f', min: 0 },
    ],
    'evaluateYangMillsBeta',
  );
  const { g, N_c, N_f } = input;
  const b0 = (11 / 3) * N_c - (2 / 3) * N_f;
  return -(b0 * g * g * g) / (16 * Math.PI * Math.PI);
}

/**
 * Compute the one-loop coefficient b₀ for SU(N_c) with N_f fundamental
 * Dirac flavors:
 *
 *   b₀ = (11/3) N_c − (2/3) N_f
 *
 * When b₀ > 0 the theory is asymptotically free; the asymptotic-freedom
 * boundary is at N_f = (11/2) N_c.
 *
 * @public
 */
export function computeB0(N_c: number, N_f: number): number {
  return (11 / 3) * N_c - (2 / 3) * N_f;
}

/** Sign of the one-loop coefficient. Not a confrontation. @public */
export type OneLoopCoefficientSign = 'positive' | 'zero' | 'negative';

/**
 * Whether `b₀` is positive, zero, or negative for a stated `(N_c, N_f)`.
 * The label is the one-loop coefficient. This is not a data test.
 *
 * @public
 */
export interface OneLoopCoefficientStatement {
  readonly label: 'one-loop coefficient';
  readonly sign: OneLoopCoefficientSign;
  readonly b0: number;
}

/**
 * State the sign of `b₀ = (11/3) N_c − (2/3) N_f`. Positive is asymptotic
 * freedom in this one-loop truncation. The statement is the coefficient,
 * not a residual against a measurement.
 *
 * @public
 */
export function oneLoopCoefficientStatement(N_c: number, N_f: number): OneLoopCoefficientStatement {
  const b0 = computeB0(N_c, N_f);
  const sign: OneLoopCoefficientSign = b0 > 0 ? 'positive' : b0 < 0 ? 'negative' : 'zero';
  return { label: 'one-loop coefficient', sign, b0 };
}
