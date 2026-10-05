/**
 * Bridge Equation 54 — Randall-Sundrum Brane Cosmology (modified Friedmann).
 *
 *   H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3
 *
 * H is the Hubble parameter [T⁻¹], ρ is the mass density on the brane
 * [M L⁻³], σ is the brane tension [M L⁻³] (same dimensions as energy
 * density), and Λ is the effective 4D cosmological constant in [T⁻²] form
 * (i.e. c² · Λ_[L⁻²], the same c²-rescaled convention used by BE-19).
 *
 * Physics — Randall-Sundrum II model (single brane in 5D AdS bulk):
 * The correction factor (1 + ρ/(2σ)) is the brane-tension modification
 * that appears at high energy densities. When ρ ≪ σ the factor approaches
 * 1 and the classical Friedmann equation is recovered; when ρ ~ σ (Planck-
 * scale densities) the ρ² term dominates and expansion is faster than in
 * standard cosmology. This ρ² enhancement can affect primordial inflation
 * and BBN but leaves today's low-density cosmology unaffected.
 *
 * The correction (1 + ρ/(2σ)) is DIMENSIONLESS: the ratio ρ/σ has matching
 * dimensions [M L⁻³]/[M L⁻³] = [1].
 *
 * Dimensional conventions follow BE-19 exactly:
 *   - ρ and σ in mass-density units [kg m⁻³]
 *   - Λ in [T⁻²] (= c² Λ_[L⁻²], Ryden "Introduction to Cosmology" 2nd ed §6)
 *   - H² in [s⁻²]
 *
 * `evaluateRandallSundrumH2` drops Λ and the dark-radiation term (Weyl-
 * tensor contribution ∝ a⁻⁴) for the structural minimum; the omission is
 * documented in the function's JSDoc. The AST encodes the full Λ/3 form.
 *
 * References:
 *   - Randall-Sundrum 1999 *Phys. Rev. Lett.* 83:4690 ("An Alternative to
 *     Compactification"; arXiv:hep-th/9906064; the RS-II single-brane model
 *     that BE-54 encodes)
 *   - Binétruy-Deffayet-Ellwanger-Langlois 2000 *Phys. Lett.* B 477:285
 *     (arXiv:hep-th/9910219; the BDEL cosmological equations on the brane)
 *   - Maartens-Koyama 2010 *Living Rev. Relativity* 13:5
 *     (arXiv:1004.3962; comprehensive brane-world cosmology review)
 *
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 54)
 * @module bridges/equations/be-54-randall-sundrum-brane
 */

import type { ExprNode, DimensionValidationReport } from '../../dimensional/validator.js';
import {
  Dimension,
  DIMENSIONLESS,
  MASS_DENSITY,
} from '../../dimensional/types.js';
import { G as DIM_G } from '../../dimensional/constants.js';
import { PhysicalConstants } from '../../core/types.js';
import { sym, validateFiniteInputs, validateBEDimensions } from './_be-helpers.js';

// ---------------------------------------------------------------------------
// Dimension primitives
// ---------------------------------------------------------------------------

/** [T⁻²] — for H² and the c²-rescaled cosmological constant. */
const T_INV2: Dimension = {
  L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0,
};

// ---------------------------------------------------------------------------
// Symbolic AST
// ---------------------------------------------------------------------------

/**
 * RHS of `H² = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3` as a typed ExprNode tree.
 *
 * Encoding notes:
 *   - The brane-tension correction `(1 + ρ/(2σ))` is DIMENSIONLESS:
 *     the symbol `1` is [1] and ρ/σ is [M L⁻³]/[M L⁻³] = [1].
 *   - The prefactor `8π/3` is folded into a dimensionless symbol (same
 *     pattern as BE-19).
 *   - Λ is in [T⁻²] form (c²-rescaled; Ryden §6 convention).
 *
 * @public
 */
export const BRANE_FRIEDMANN_RHS: ExprNode = {
  kind: 'op', op: '+',
  args: [
    {
      // (8πG/3) · ρ · (1 + ρ/(2σ))
      kind: 'op', op: '*',
      args: [
        {
          // 8π/3 — dimensionless prefactor
          kind: 'op', op: '/',
          args: [
            sym('8pi', DIMENSIONLESS),
            sym('3', DIMENSIONLESS),
          ],
        },
        sym('G', DIM_G),
        sym('rho', MASS_DENSITY),
        {
          // (1 + ρ/(2σ)) — dimensionless brane-tension correction
          kind: 'op', op: '+',
          args: [
            sym('1', DIMENSIONLESS),
            {
              // ρ / (2σ) — dimensionless
              kind: 'op', op: '/',
              args: [
                sym('rho', MASS_DENSITY),
                {
                  // 2σ — brane tension times 2 (dimensionless 2 × [M L⁻³])
                  kind: 'op', op: '*',
                  args: [
                    sym('2', DIMENSIONLESS),
                    sym('sigma', MASS_DENSITY),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // Λ / 3
      kind: 'op', op: '/',
      args: [
        sym('Lambda', T_INV2),
        sym('3', DIMENSIONLESS),
      ],
    },
  ],
};

/** LHS: H² has dimension [T⁻²]. */
const BRANE_FRIEDMANN_LHS: ExprNode = {
  kind: 'op', op: '^',
  args: [
    sym('H', { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 }),
    sym('2', DIMENSIONLESS),
  ],
};

// ---------------------------------------------------------------------------
// Numerical evaluator
// ---------------------------------------------------------------------------

/**
 * Typed-arg shape for `evaluateRandallSundrumH2`.
 *
 * Uses mass-density units [kg m⁻³] throughout (consistent with BE-19).
 *
 * @public
 */
interface RandallSundrumInputs {
  /** Mass-energy density ρ on the brane in kg/m³. Must be ≥ 0. */
  rho_kg_per_m3: number;
  /**
   * Brane tension σ in kg/m³. Must be > 0.
   *
   * In the RS II model σ is a fixed bulk parameter; it is related to the
   * 5D Planck mass and the AdS curvature scale. For the present structural
   * evaluator it is treated as a free numerical input.
   */
  sigma_kg_per_m3: number;
}

/**
 * Evaluate the Randall-Sundrum modified Friedmann equation:
 *
 *   H² = (8πG/3) · ρ · (1 + ρ/(2σ))
 *
 * Omissions (documented):
 *   1. Λ/3 — cosmological-constant term dropped for the structural
 *      minimum; the AST (`BRANE_FRIEDMANN_RHS`) encodes the full form.
 *   2. Dark-radiation term C/a⁴ — the Weyl-tensor (bulk Kaluza-Klein)
 *      contribution is time-dependent and requires knowledge of the
 *      scale factor a(t); it is structurally distinct from the brane-
 *      tension correction and deferred to a future evaluator.
 *
 * @returns H² in [s⁻²].
 * @public
 */
export function evaluateRandallSundrumH2(input: RandallSundrumInputs): number {
  validateFiniteInputs(
    input,
    [
      { name: 'rho_kg_per_m3', min: 0 },
      { name: 'sigma_kg_per_m3', min: 0, excludeMin: true },
    ],
    'evaluateRandallSundrumH2',
  );
  const { rho_kg_per_m3: rho, sigma_kg_per_m3: sigma } = input;
  const { G } = PhysicalConstants;
  const correction = 1 + rho / (2 * sigma);
  return ((8 * Math.PI * G) / 3) * rho * correction;
}

// ---------------------------------------------------------------------------
// Self-validation
// ---------------------------------------------------------------------------

/**
 * Run the AST through the dimensional analyzer; both LHS (H²) and RHS
 * should infer [T⁻²].
 *
 * @public
 */
/** @internal */
export function validateBraneFriedmannDimensions(): DimensionValidationReport {
  return validateBEDimensions(BRANE_FRIEDMANN_LHS, BRANE_FRIEDMANN_RHS, 'BE54');
}

// ---------------------------------------------------------------------------
// v0.7 follow-up: structural FriedmannEquationNode encoding (variant='brane')
// ---------------------------------------------------------------------------
// Wires BE-54 through the FriedmannEquationNode primitive shipped by the BE-19
// agent (`src/dimensional/friedmann-equation.ts`). Exercises the variant-
// discriminator design payoff — the BE-19 agent recommended brane cosmology
// specifically because the 'brane' variant slot was already typed + tested
// and brane-tension correction `(1 + ρ/(2σ))` lands as a pure structural
// addition without extending the primitive.
//
// This export is ADDITIVE; the raw-AST `BRANE_FRIEDMANN_RHS` and
// `evaluateRandallSundrumH2` above stay untouched (existing tests remain
// green; consumers can use either form).

import type {
  FriedmannEquationNode,
} from '../../dimensional/friedmann-equation.js';
import type { ScalarFieldNode } from '../../dimensional/klein-gordon-equation.js';

const BE54_HUBBLE_SQUARED: ScalarFieldNode = {
  kind: 'scalar-field',
  name: 'H_squared',
  dim: { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 },
  symmetry: 'scalar',
};

const BE54_DENSITY: ScalarFieldNode = {
  kind: 'scalar-field',
  name: 'rho',
  // Mass-density per BE-19 convention (the BE-19 agent's FriedmannEquationNode
  // pins density to [M L⁻³] mass-density, not energy-density [M L⁻¹ T⁻²]).
  dim: MASS_DENSITY,
  symmetry: 'scalar',
};

const BE54_BRANE_CORRECTION: ScalarFieldNode = {
  kind: 'scalar-field',
  name: 'brane_correction_1_plus_rho_over_2sigma',
  // Dimensionless: ρ/σ has matching numerator + denominator dimensions.
  dim: { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
  symmetry: 'scalar',
};

/**
 * Structural BE-54 encoding using `FriedmannEquationNode` with
 * `variant: 'brane'`. The brane-tension correction `(1 + ρ/(2σ))` is the
 * dimensionless multiplicative factor specific to Randall-Sundrum II
 * cosmology; the variant discriminator records that this is brane physics
 * (not classical FRW, not LQC bounce, not DGP, not dRGT).
 *
 * Validates via `validateFriedmannEquation` — the BE-19 primitive's
 * variant-cross-check pattern: `variant === 'brane'` requires
 * `correction !== null`.
 *
 * @public
 */
export const BE54_BRANE_FRIEDMANN_STRUCTURAL: FriedmannEquationNode = {
  kind: 'friedmann-equation',
  hubble: BE54_HUBBLE_SQUARED,
  density: BE54_DENSITY,
  correction: BE54_BRANE_CORRECTION,
  variant: 'brane',
  coupling: 'friedmann',
};
