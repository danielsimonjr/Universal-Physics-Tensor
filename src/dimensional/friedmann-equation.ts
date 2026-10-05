/**
 * Friedmann equation AST node — modified-cosmology predicate.
 *
 * Per `docs/architecture/archive/v0.7-be-x-reencoding-design-note.md`
 * §"BE-19 — `FriedmannEquationNode` for modified-Friedmann
 * predicates". Fourth of four BE-X structural re-encodings in the
 * v0.7-series follow-up to the v0.6.0 deferred-bridges list.
 *
 * Represents the predicate
 *
 *     H² = (8πG/3) · ρ · [correction]
 *
 * where H is the Hubble parameter, ρ the cosmic energy/mass-density,
 * and `[correction]` is a variant-tagged extension term. The classical
 * FRW form takes `correction = null`; modified-cosmology variants
 * (LQC bounce, Randall-Sundrum brane, DGP, dRGT massive gravity)
 * tag their correction with a `variant` discriminator so consumers
 * can pattern-match on which cosmological regime the equation
 * occupies.
 *
 * Discriminator vocabulary:
 *
 *   - `'classical'` — canonical FRW `H² = (8πG/3) ρ` (the [-k/a²]
 *     and [Λ/3] terms ride along as additive scalars, not the
 *     `correction` slot). `correction` MUST be `null`.
 *   - `'lqc'` — Loop Quantum Cosmology bounce `(1 − ρ/ρ_crit)`. The
 *     correction is a DIMENSIONLESS multiplicative factor.
 *   - `'brane'` — Randall-Sundrum brane-tension `(1 + ρ/(2σ))`. Also
 *     dimensionless multiplicative.
 *   - `'dgp'` — Dvali-Gabadadze-Porrati 5D-crossover `±H/r_c`. The
 *     `correction` slot holds a stub for the additional scale; this
 *     variant signals "5D structure present" — fine-grained dim
 *     discipline left for future BE-NN landing.
 *   - `'massive'` — dRGT massive-gravity graviton-mass term. The
 *     `correction` slot holds the graviton-mass^2 contribution; dim
 *     discipline left for future BE-NN landing.
 *
 * The variant discriminator is the load-bearing structural fact:
 * future modified-cosmology bridges (brane, DGP, dRGT) land as new
 * `BridgeEquation` entries that produce `FriedmannEquationNode`s
 * with the appropriate variant tag, instead of each inventing a
 * separate AST primitive.
 *
 * References:
 *   - Mukhanov, *Physical Foundations of Cosmology* (2005), §2.1
 *     for the canonical FRW Friedmann equation derivation.
 *   - Ashtekar & Singh, *Loop Quantum Cosmology: A Status Report*
 *     (2011), arXiv:1108.0893 — for the LQC `(1 − ρ/ρ_crit)` bounce
 *     factor; the canonical reference for the `'lqc'` variant
 *     consumed by BE-19.
 *
 * Status: PREDICATE node like `EinsteinFieldEquationNode` and
 * `KleinGordonEquationNode` — not a value-producing expression.
 * Numerical evaluation of a specific FRW history is out of scope
 * (numerical evaluators live alongside per-bridge encodings — e.g.
 * `evaluateQuantumBounce` in `src/bridges/equations/be-19-quantum-bounce.ts`).
 *
 * @module dimensional/friedmann-equation
 */

import type { Dimension } from './types.js';
import { MASS_DENSITY } from './types.js';
import type { ScalarFieldNode } from './klein-gordon-equation.js';
import { equals } from './algebra.js';
import {
  validateFreeIndexLabelMatch,
  validateComponentDimension,
  validateTensorSymmetry,
} from './field-equation-helpers.js';

// ---------------------------------------------------------------------------
// Variant discriminator
// ---------------------------------------------------------------------------

/**
 * Tag for the cosmological regime a `FriedmannEquationNode`
 * represents. Each variant identifies a structural pattern of
 * deviation from canonical FRW; consumers pattern-match on this
 * discriminator to select regime-specific downstream logic.
 *
 * See the module docstring for the per-variant semantics.
 *
 * @public
 */
export type FriedmannVariant =
  | 'classical'
  | 'lqc'
  | 'brane'
  | 'dgp'
  | 'massive';

const KNOWN_VARIANTS: ReadonlySet<FriedmannVariant> = new Set([
  'classical',
  'lqc',
  'brane',
  'dgp',
  'massive',
]);

// ---------------------------------------------------------------------------
// Node interface
// ---------------------------------------------------------------------------

/**
 * AST node for the modified Friedmann equation
 *
 *     H² = (8πG/3) · ρ · [variant-specific correction]
 *
 * Fields:
 *   - `hubble`      — H or H² as a `ScalarFieldNode`. Accepted dims
 *                     are `[T^-1]` (H) or `[T^-2]` (H²); the validator
 *                     does NOT square the field for you, it only
 *                     checks the stated dim is one of the two.
 *   - `density`     — ρ as a `ScalarFieldNode`, dim `[M·L^-3]`
 *                     (mass-density convention, aligning with BE-19's
 *                     existing `QUANTUM_BOUNCE_RHS` encoding).
 *   - `correction`  — the variant-specific extension. `null` IFF
 *                     `variant === 'classical'`. For `'lqc'`, the
 *                     correction's dim is constrained to be
 *                     dimensionless (the `(1 − ρ/ρ_crit)` factor).
 *                     Other non-classical variants accept any dim
 *                     (refinement deferred to per-bridge landing).
 *   - `variant`     — the regime discriminator. See `FriedmannVariant`.
 *   - `coupling`    — tag `'friedmann'` representing the symbolic
 *                     `(8πG/3)` prefactor (no inline numeric).
 *
 * @public
 */
export interface FriedmannEquationNode {
  readonly kind: 'friedmann-equation';
  readonly hubble: ScalarFieldNode;
  readonly density: ScalarFieldNode;
  readonly correction: ScalarFieldNode | null;
  readonly variant: FriedmannVariant;
  readonly coupling: 'friedmann';
}

/**
 * Result of validating a `FriedmannEquationNode`. Mirrors
 * `KleinGordonEquationValidationResult` shape.
 *
 * @public
 */
export interface FriedmannEquationValidationResult {
  /** Per-component dim of the equation — `[T^-2]` (H² shape). */
  readonly dim: Dimension;
  /** Empty free-indices map (rank-0 equation). */
  readonly freeIndices: Map<string, { upper: number; lower: number }>;
  /** Echo of the variant tag for downstream pattern-matching. */
  readonly variant: FriedmannVariant;
}

// ---------------------------------------------------------------------------
// Expected dims
// ---------------------------------------------------------------------------

/** `[T^-2]`: dim of H² and of (8πG/3)·ρ in the canonical Friedmann form. */
const T_INV2: Dimension = { L: 0, M: 0, T: -2, I: 0, Theta: 0, N: 0, J: 0 };

/** `[T^-1]`: dim of the un-squared Hubble parameter H. */
const T_INV1: Dimension = { L: 0, M: 0, T: -1, I: 0, Theta: 0, N: 0, J: 0 };

/** `[]`: dimensionless (the LQC `(1 − ρ/ρ_crit)` correction factor). */
const DIMLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate a `friedmann-equation` node.
 *
 * Predicates (mirroring the field-equation-helpers pattern):
 *
 *   1. **Variant discriminator** — `variant` must be one of the
 *      known tags. Throws with `"variant"` keyword on unknown values.
 *   2. **Classical–correction consistency** — `variant === 'classical'`
 *      requires `correction === null`; any other variant requires
 *      `correction !== null`. Throws with `"variant"` keyword.
 *   3. **Free-index agreement** — trivially passes (rank-0 equation).
 *   4. **Per-component dim equality** — `hubble.dim` must be `[T^-2]`
 *      (H²) or `[T^-1]` (H); `density.dim` must be `[M·L^-3]`. For
 *      `variant === 'lqc'`, `correction.dim` must be dimensionless
 *      (the `(1 − ρ/ρ_crit)` bounce factor).
 *   5. **Symmetry agreement** — all participants carry the trivial
 *      `'scalar'` marker.
 *
 * Errors carry the keywords `"dimension"` / `"symmetry"` (from the
 * field-equation-helpers) and `"variant"` (for discriminator /
 * classical-consistency violations).
 *
 * @public
 */
export function validateFriedmannEquation(
  node: FriedmannEquationNode,
): FriedmannEquationValidationResult {
  // Predicate 1: variant discriminator membership.
  if (!KNOWN_VARIANTS.has(node.variant)) {
    throw new Error(
      `FriedmannEquationNode: unknown variant '${node.variant}' — ` +
      `must be one of 'classical' | 'lqc' | 'brane' | 'dgp' | 'massive'.`,
    );
  }

  // Predicate 2: classical/correction consistency.
  if (node.variant === 'classical' && node.correction !== null) {
    throw new Error(
      `FriedmannEquationNode: variant 'classical' must carry ` +
      `correction === null (the canonical FRW form has no ` +
      `variant-specific correction term).`,
    );
  }
  if (node.variant !== 'classical' && node.correction === null) {
    throw new Error(
      `FriedmannEquationNode: variant '${node.variant}' requires a ` +
      `non-null correction term (only the 'classical' variant accepts ` +
      `correction === null).`,
    );
  }

  // Predicate 3: free-index agreement (trivially: both rank-0).
  validateFreeIndexLabelMatch(
    'FriedmannEquationNode',
    'H²',
    [],
    '(8πG/3)·ρ·correction',
    [],
  );

  // Predicate 4a: hubble dim must be [T^-2] or [T^-1].
  if (!equals(node.hubble.dim, T_INV2) && !equals(node.hubble.dim, T_INV1)) {
    throw new Error(
      `FriedmannEquationNode: dimension mismatch — hubble.dim must be ` +
      `${JSON.stringify(T_INV2)} (H²) or ${JSON.stringify(T_INV1)} (H), ` +
      `got ${JSON.stringify(node.hubble.dim)}.`,
    );
  }

  // Predicate 4b: density dim must be [M·L^-3] (mass-density convention).
  validateComponentDimension(
    'FriedmannEquationNode',
    'density ρ.dim',
    node.density.dim,
    MASS_DENSITY,
    'ρ is the cosmic mass-density; Friedmann uses [M·L^-3] (so (8πG/3)·ρ ~ [T^-2]).',
  );

  // Predicate 4c: LQC correction must be dimensionless.
  if (node.variant === 'lqc' && node.correction !== null) {
    validateComponentDimension(
      'FriedmannEquationNode',
      "lqc correction.dim",
      node.correction.dim,
      DIMLESS,
      'LQC bounce factor (1 − ρ/ρ_crit) is dimensionless.',
    );
  }

  // Predicate 5: symmetry agreement — all 'scalar'.
  validateTensorSymmetry(
    'FriedmannEquationNode',
    'hubble',
    node.hubble.symmetry,
    'scalar',
    'Friedmann is a cosmological scalar equation.',
  );
  validateTensorSymmetry(
    'FriedmannEquationNode',
    'density',
    node.density.symmetry,
    'scalar',
    'ρ is a cosmological scalar.',
  );
  if (node.correction !== null) {
    validateTensorSymmetry(
      'FriedmannEquationNode',
      'correction',
      node.correction.symmetry,
      'scalar',
      'Friedmann correction terms are encoded as scalar factors.',
    );
  }

  return {
    dim: T_INV2,
    freeIndices: new Map(),
    variant: node.variant,
  };
}
