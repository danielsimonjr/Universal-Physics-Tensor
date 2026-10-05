/**
 * Bridge Equation 20 — Observed cosmological-constant mass density
 * (canonical FRW form, post Wave Y reformulation).
 *
 *   ρ_Λ = c² Λ / (8π G)
 *
 * The mass density associated with the observed cosmological constant
 * Λ ≈ 1.1×10⁻⁵² m⁻² (Planck 2018; Aghanim et al. 2020). With the
 * canonical FRW prefactor c²/(8π G), Λ ≈ 1.1e-52 m⁻² gives
 * ρ_Λ ≈ 5.9×10⁻²⁷ kg/m³ (recomputed 2026-06-11 from Λ = 1.1056×10⁻⁵² m⁻²;
 * the previous 5.4×10⁻²⁷ figure did not match the formula), in the
 * observed dark-energy density range
 * (≈70% of the critical density at the present epoch).
 *
 * Reference: Carroll 2001 *Living Rev. Relativity* 4:1
 * (arXiv:astro-ph/0004075; canonical cosmological-constant review);
 * Weinberg 1989 *Rev. Mod. Phys.* 61:1 (the cosmological-constant
 * problem). Planck Collaboration (Aghanim et al.) 2020 *A&A* 641:A6
 * (Λ measurement from CMB).
 *
 * Status: speculative (the bridge framing — using the observed CC as
 * a quantum-cosmological bridge — is the speculative element).
 *
 * Honest-claude scope notes:
 *   - This formula sidesteps the formally-divergent ∫d³k vacuum-
 *     fluctuation integral that the original BE-20 carried. The
 *     vacuum-fluctuation problem (the 10¹²⁰ discrepancy between the
 *     QFT estimate and observation) remains the unfixed cosmological-
 *     constant problem, documented in known_issues. The observed
 *     ρ_Λ is the canonical scalar that replaces the divergent integral
 *     as the AST-encodable bridge content.
 *   - Dim: [c² Λ] = L² T⁻² · L⁻² = T⁻²; [1/G] = M T² L⁻³;
 *     [c² Λ / G] = M T² L⁻³ · T⁻² = M L⁻³ ✓ (mass density).
 *   - The energy-density form ρ_Λ c² = c⁴ Λ / (8π G) ≈ 5.30×10⁻¹⁰ J/m³
 *     is the alternate convention; both forms are physically
 *     equivalent. We encode the mass-density form here.
 *   - v0.6.0 re-encoding: the plain `sym('Lambda', [L⁻²])` stub is
 *     replaced with a `CosmologicalConstantNode` (Phase 2 Task 2.3).
 *     `CosmologicalConstantNode` is a first-class ExprNode member whose
 *     validator enforces the [L⁻²] dim constraint and, unlike a plain
 *     symbol, carries the optional `value` field for de Sitter / ΛCDM
 *     evaluations. The dimensional verdict ([M L⁻³]) and bridge status
 *     are unchanged (Decision #9).
 *
 * @see docs/specification/Part-II.md ("Bridge Equation 20")
 * @see src/bridges/index.ts BRIDGE_EQUATIONS.find(e => e.id === 20)
 * @module bridges/equations/be-20-vacuum-energy
 */

import type { ExprNode, DimensionValidationReport } from '../../dimensional/validator.js';
import type { CosmologicalConstantNode } from '../../dimensional/stress-energy-validators.js';
import {
  Dimension,
  DIMENSIONLESS,
  MASS_DENSITY,
} from '../../dimensional/types.js';
import { c as DIM_c, G as DIM_G } from '../../dimensional/constants.js';
import { power } from '../../dimensional/algebra.js';
import { LENGTH } from '../../dimensional/types.js';
import { PhysicalConstants } from '../../core/types.js';
import { sym, validateFiniteInputs, validateBEDimensions } from './_be-helpers.js';

/** [L⁻²] — cosmological-constant Λ has dimension of inverse area. */
const INV_LENGTH_2: Dimension = power(LENGTH, -2);

/**
 * Mass density [M L⁻³] (kg/m³). The dimensional export.
 *
 * @public
 */
export { MASS_DENSITY } from '../../dimensional/types.js';

/**
 * v0.6.0 re-encoding: `CosmologicalConstantNode` for Λ.
 *
 * Replaces the former `sym('Lambda', INV_LENGTH_2)` plain-symbol stub
 * with a first-class `CosmologicalConstantNode`. The new node carries
 * the Planck 2018 observed value as its optional `value` field and
 * participates in `validateCosmologicalConstant` (which enforces [L⁻²]).
 * The dimensional verdict of the enclosing expression is unchanged.
 *
 * Decision #9 (v0.6.0-Design.md): status pin unchanged — structural
 * AST promotion does NOT constitute physics validation.
 */
/** Planck 2018 cosmological constant Λ ≈ 1.1×10⁻⁵² m⁻² — single source of truth. */
const PLANCK_2018_LAMBDA = 1.1e-52;

const BE20_COSMOLOGICAL_CONSTANT: CosmologicalConstantNode = {
  kind: 'cosmological-constant',
  symbol: 'Λ',
  dim: INV_LENGTH_2,
  value: PLANCK_2018_LAMBDA,
};

/**
 * RHS of the cosmological-constant mass density:
 *   ρ_Λ = c² Λ / (8π G)
 *
 * v0.6.0: Λ is now a `CosmologicalConstantNode` (first-class typed
 * node) rather than a plain symbol stub. Dimensional verdict [M L⁻³]
 * is unchanged.
 */
export const BE20_VACUUM_ENERGY_RHS: ExprNode = {
  kind: 'op', op: '/',
  args: [
    {
      // numerator: c² · Λ
      kind: 'op', op: '*',
      args: [
        {
          kind: 'op', op: '^',
          args: [sym('c', DIM_c), sym('2', DIMENSIONLESS)],
        },
        BE20_COSMOLOGICAL_CONSTANT,
      ],
    },
    {
      // denominator: 8π · G
      kind: 'op', op: '*',
      args: [
        sym('8pi', DIMENSIONLESS),
        sym('G', DIM_G),
      ],
    },
  ],
};

/** LHS: ρ_Λ has dimension [M L⁻³] (mass density, kg/m³). */
/** @internal */
export const BE20_VACUUM_ENERGY_LHS: ExprNode = sym('rho_Lambda', MASS_DENSITY);

// --- Numerical evaluator ---

/**
 * @internal — typed-arg shape for the file-local `evaluateCosmologicalConstant` function; not in the v0.7 public surface. See `docs/architecture/archive/v0.7-be-module-exports-audit.md` §4.
 */
interface CosmologicalConstantInputs {
  /**
   * Cosmological constant Λ (m⁻²). Default: 1.1×10⁻⁵² m⁻² (Planck 2018
   * canonical value). Must be ≥ 0 and finite.
   */
  Lambda_per_m2?: number;
}

const DEFAULT_LAMBDA = PLANCK_2018_LAMBDA;

/**
 * Evaluate the mass density associated with the observed cosmological
 * constant
 *
 *   ρ_Λ = c² Λ / (8π G)
 *
 * @returns Mass density in kg/m³.
 */
export function evaluateCosmologicalConstantDensity(
  input: CosmologicalConstantInputs = {},
): number {
  const { Lambda_per_m2 = DEFAULT_LAMBDA } = input;
  validateFiniteInputs(
    { Lambda_per_m2 },
    [{ name: 'Lambda_per_m2', min: 0 }],
    'evaluateCosmologicalConstantDensity',
  );
  const { c, G } = PhysicalConstants;
  return (c * c * Lambda_per_m2) / (8 * Math.PI * G);
}

// --- Self-validation ---

/**
 * Run the AST through the dimensional analyzer; both sides should be
 * [M L⁻³] (mass density).
 */
/** @internal */
export function validateBE20Dimensions(): DimensionValidationReport {
  return validateBEDimensions(BE20_VACUUM_ENERGY_LHS, BE20_VACUUM_ENERGY_RHS, 'BE20');
}
