/**
 * Gauge-field AST primitives for Wheeler-Feynman absorber-theory
 * time-symmetric electrodynamics.
 *
 * Wheeler-Feynman absorber theory (Wheeler & Feynman 1945
 * Rev. Mod. Phys. 17:157; Wheeler & Feynman 1949
 * Rev. Mod. Phys. 21:425) uses TIME-SYMMETRIC electrodynamics:
 * radiation reaction arises from the half-retarded +
 * half-advanced potential combination
 *
 *   A_μ(x) = (1/2) [A_μ^ret(x) + A_μ^adv(x)].
 *
 * Under the absorber boundary condition (every emitted disturbance
 * is fully absorbed by future matter), this symmetric form is
 * physically equivalent to retarded-only Maxwell.
 *
 * Two primitives are provided:
 *
 *   1. `GaugeFieldNode` — tags an EM gauge field with its
 *      "arrow of time": retarded (Liénard-Wiechert advanced
 *      Green's function), advanced (retarded Green's function
 *      — past-directed), or symmetric (half-half combination).
 *      The consumer supplies the dimension (SI: V·s/m =
 *      { L:1, M:1, T:-2, I:-1 }) or works with the ratio which
 *      is dimensionless.
 *
 *   2. `TimeSymmetryPredicateNode` — asserts that the
 *      dimensionless time-symmetry residual
 *      |A_ret − A_adv| / |A_ret + A_adv| is bounded by ε.
 *      Identically 0 under the absorber boundary condition.
 *      This is a PREDICATE node (like `EinsteinFieldEquationNode`)
 *      — not a value-producing expression.
 *
 * Phase 1 demonstrator pattern: follows
 * `src/dimensional/klein-gordon-equation.ts` (field-equation-helpers
 * pattern, Phase 1 of TensorEquationNode generalization).
 *
 * @see docs/architecture/archive/v0.7-be-x-reencoding-design-note.md §BE-50
 * @module dimensional/gauge-field
 */

import type { Dimension } from './types.js';
import { validateComponentDimension } from './field-equation-helpers.js';

// ---------------------------------------------------------------------------
// GaugeFieldNode
// ---------------------------------------------------------------------------

/**
 * Arrow-of-time tag for an electromagnetic gauge potential.
 *
 * - `'retarded'`  — propagator uses the retarded Green's function
 *   (∝ Liénard-Wiechert advanced solution); causal, future-directed.
 * - `'advanced'`  — propagator uses the advanced Green's function
 *   (∝ Liénard-Wiechert retarded solution); anti-causal, past-directed.
 * - `'symmetric'` — half-retarded + half-advanced combination
 *   (Wheeler-Feynman's A_μ = (1/2)[A_μ^ret + A_μ^adv]).
 *
 * @public
 */
export type ArrowOfTime = 'retarded' | 'advanced' | 'symmetric';

/**
 * AST node for an electromagnetic gauge potential A_μ with an explicit
 * arrow-of-time tag.
 *
 * The `dim` field carries the SI dimension of the gauge field. For the
 * Wheeler-Feynman time-symmetry ratio, the dimension of the numerator
 * and denominator cancel, yielding a dimensionless result — but the
 * `dim` field is required so the validator can confirm that both the
 * retarded and advanced fields in a `TimeSymmetryPredicateNode` share
 * the same dimension (the ratio is well-defined only if they do).
 *
 * Canonical SI dim of the magnetic vector potential A_μ:
 *   [A] = V·s/m = kg·m/(A·s²) = { L: 1, M: 1, T: -2, I: -1 }
 *
 * @public
 */
export interface GaugeFieldNode {
  /** Discriminator: `'gauge-field'`. */
  readonly kind: 'gauge-field';
  /** Human-readable field name (e.g., `'A_ret'`, `'A_adv'`, `'A_mu'`). */
  readonly name: string;
  /**
   * Arrow-of-time tag. Documents whether this field was computed using
   * the retarded Green's function, the advanced Green's function, or
   * the symmetric half-half combination.
   */
  readonly arrowOfTime: ArrowOfTime;
  /**
   * SI dimension of the gauge field. Both retarded and advanced fields
   * must share the same dimension for the time-symmetry ratio to be
   * well-defined (dimensionless by cancellation).
   */
  readonly dim: Dimension;
}

// ---------------------------------------------------------------------------
// TimeSymmetryPredicateNode
// ---------------------------------------------------------------------------

/**
 * AST predicate node for the Wheeler-Feynman time-symmetry condition.
 *
 * Asserts that the dimensionless time-symmetry residual
 *
 *   |A_ret − A_adv| / |A_ret + A_adv| ≤ ε
 *
 * is bounded by `epsilon`. Under the absorber boundary condition
 * (Wheeler & Feynman 1945), this residual is identically 0 on
 * physical states. A non-zero `epsilon` documents the allowable
 * deviation (e.g., a Cramer 1986 experimental bound of 10⁻²).
 *
 * This is a PREDICATE node (like `EinsteinFieldEquationNode`) —
 * not a value-producing expression. Numerical evaluation of the
 * residual for specific field amplitudes is out of scope; the catalog
 * relation be-50 that consumes this node has no numerical evaluator.
 *
 * @public
 */
export interface TimeSymmetryPredicateNode {
  /** Discriminator: `'time-symmetry-predicate'`. */
  readonly kind: 'time-symmetry-predicate';
  /**
   * The retarded gauge potential A_μ^ret.
   * Must have `arrowOfTime: 'retarded'`.
   */
  readonly retarded: GaugeFieldNode;
  /**
   * The advanced gauge potential A_μ^adv.
   * Must have `arrowOfTime: 'advanced'`.
   */
  readonly advanced: GaugeFieldNode;
  /**
   * Bound on the time-symmetry residual: |A_ret − A_adv| / |A_ret + A_adv| ≤ epsilon.
   * Must be strictly positive and finite.
   * Set to a small value (e.g., 1e-3) to encode an experimental bound,
   * or to `Number.EPSILON` to assert near-exact absorber-theory symmetry.
   */
  readonly epsilon: number;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validate a `GaugeFieldNode`.
 *
 * Three predicates:
 *   1. `name` must be a non-empty string.
 *   2. `arrowOfTime` must be one of `'retarded'`, `'advanced'`, `'symmetric'`.
 *   3. `dim` must be a valid `Dimension` object (all 7 SI exponents present
 *      as finite numbers).
 *
 * Throws `Error` with `'gauge-field'` in the message on any failure.
 *
 * @public
 */
export function validateGaugeField(node: GaugeFieldNode): void {
  if (typeof node.name !== 'string' || node.name.trim().length === 0) {
    throw new Error(
      `GaugeFieldNode: gauge-field name must be a non-empty string ` +
      `(got ${JSON.stringify(node.name)}).`,
    );
  }

  const validArrows: ReadonlyArray<ArrowOfTime> = ['retarded', 'advanced', 'symmetric'];
  if (!validArrows.includes(node.arrowOfTime)) {
    throw new Error(
      `GaugeFieldNode: gauge-field arrowOfTime must be 'retarded', 'advanced', ` +
      `or 'symmetric' (got ${JSON.stringify(node.arrowOfTime)}).`,
    );
  }

  const dim = node.dim;
  const axes: ReadonlyArray<keyof Dimension> = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'];
  for (const ax of axes) {
    if (typeof dim[ax] !== 'number' || !Number.isFinite(dim[ax])) {
      throw new Error(
        `GaugeFieldNode: gauge-field dim.${ax} must be a finite number ` +
        `(got ${JSON.stringify(dim[ax])} for field '${node.name}').`,
      );
    }
  }
}

/**
 * Result of validating a `TimeSymmetryPredicateNode`.
 *
 * @public
 */
export interface TimeSymmetryPredicateValidationResult {
  /**
   * The shared dimension of the retarded and advanced gauge fields.
   * The ratio |A_ret − A_adv| / |A_ret + A_adv| is dimensionless
   * because this dimension cancels.
   */
  readonly fieldDim: Dimension;
  /** The validated epsilon bound (> 0, finite). */
  readonly epsilon: number;
}

/**
 * Validate a `TimeSymmetryPredicateNode`.
 *
 * Four predicates (following the field-equation-helpers pattern):
 *
 *   1. **Arrow-of-time tags** — `retarded.arrowOfTime` must be
 *      `'retarded'`; `advanced.arrowOfTime` must be `'advanced'`.
 *   2. **Per-field validity** — both `GaugeFieldNode`s pass
 *      `validateGaugeField`.
 *   3. **Dimension equality** — `retarded.dim` and `advanced.dim`
 *      must match (so the ratio is dimensionless by cancellation).
 *      Uses `validateComponentDimension` from field-equation-helpers.
 *   4. **Epsilon bound** — `epsilon` must be strictly positive and
 *      finite (`epsilon > 0` and `Number.isFinite(epsilon)`).
 *
 * Error messages contain `'symmetry'` for arrow-of-time mismatches
 * and `'dimension'` for dim-equality failures (error-keyword
 * discipline shared with EinsteinFieldEquationNode and
 * KleinGordonEquationNode).
 *
 * @public
 */
export function validateTimeSymmetryPredicate(
  node: TimeSymmetryPredicateNode,
): TimeSymmetryPredicateValidationResult {
  // Predicate 1a: retarded field's arrow-of-time must be 'retarded'.
  if (node.retarded.arrowOfTime !== 'retarded') {
    throw new Error(
      `TimeSymmetryPredicateNode: symmetry mismatch — retarded field ` +
      `'${node.retarded.name}' must have arrowOfTime: 'retarded' ` +
      `(got '${node.retarded.arrowOfTime}'). The time-symmetry predicate ` +
      `requires A_ret to carry the retarded arrow-of-time tag.`,
    );
  }

  // Predicate 1b: advanced field's arrow-of-time must be 'advanced'.
  if (node.advanced.arrowOfTime !== 'advanced') {
    throw new Error(
      `TimeSymmetryPredicateNode: symmetry mismatch — advanced field ` +
      `'${node.advanced.name}' must have arrowOfTime: 'advanced' ` +
      `(got '${node.advanced.arrowOfTime}'). The time-symmetry predicate ` +
      `requires A_adv to carry the advanced arrow-of-time tag.`,
    );
  }

  // Predicate 2: both GaugeFieldNodes pass individual validation.
  validateGaugeField(node.retarded);
  validateGaugeField(node.advanced);

  // Predicate 3: retarded.dim and advanced.dim must match.
  // Uses validateComponentDimension from field-equation-helpers — same
  // helper used by KleinGordonEquationNode and EinsteinFieldEquationNode.
  validateComponentDimension(
    'TimeSymmetryPredicateNode',
    `advanced field '${node.advanced.name}' dim`,
    node.advanced.dim,
    node.retarded.dim,
    `A_ret and A_adv must share the same dimension so that the ratio ` +
    `|A_ret − A_adv| / |A_ret + A_adv| is dimensionless by cancellation.`,
  );

  // Predicate 4: epsilon must be strictly positive and finite.
  if (!Number.isFinite(node.epsilon) || node.epsilon <= 0) {
    throw new Error(
      `TimeSymmetryPredicateNode: epsilon must be a strictly positive finite ` +
      `number (got ${node.epsilon}). epsilon bounds the time-symmetry residual ` +
      `|A_ret − A_adv| / |A_ret + A_adv| ≤ epsilon.`,
    );
  }

  return {
    fieldDim: node.retarded.dim,
    epsilon: node.epsilon,
  };
}
