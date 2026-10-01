/**
 * The composition table for `RelationType` — a literal 8×8 matrix.
 *
 * `composeRelation(first, second)` answers: if one bridge asserts `first` and a
 * second bridge asserts `second`, what relation does the chain assert? The
 * argument order is the `First ∘ Second` column order of design note
 * `docs/planning/Atlas-Phase-1-Design.md` §2.1.
 *
 * **The table is a deliberate UNDER-approximation of Blueprint v2 §4.2.** Every
 * cell not named in §2.1 is `'no-composite-claim'`, because a wrong composite
 * type is a false physical claim while silence is only silence. Nine of the
 * sixty-four cells are defined; the remaining fifty-five are silent, and the
 * reasons for the notable silences are §2.2.
 *
 * The ninth cell, `approximation ∘ exact-equivalence = approximation`, is the
 * reviewed widening of `docs/planning/ADR-transported-norm-composition.md`. The
 * table stays a pure function of relation types: the cell says what a route
 * WOULD assert, and `boundPath` (`./path-bound.ts`) decides whether a given route
 * carries a bound, which it does only when the exact bridge declares a norm
 * transport from the norm the approximation states.
 *
 * Two cells the implementation plan asserts are NOT defined here, on the
 * authority of the design note (§0 and §2.2 item 5):
 *
 * - `exact-equivalence ∘ approximation`. An exact equivalence contributes
 *   `IDENTITY_BOUND` only *in the norm a given bridge states* (see
 *   `./error-algebra.ts`); with the exact edge first, that norm would have to be
 *   pulled back through the map, which the ADR leaves undefined (its §3).
 * - `structural-analogy ∘ structural-analogy`. Analogy is not transitive: the
 *   shared structure can dilute to nothing across a chain.
 *
 * Widening this table is a reviewed act — `tests/atlas/composition-table.test.ts`
 * pins the count of silent cells.
 *
 * Pure: no I/O, no registry reads, and no import from `src/composition/`.
 *
 * @module relations/composition-table
 */

import type { RelationType } from './types.js';

/** What `composeRelation` returns when the chain asserts nothing. @public */
export type NoCompositeClaim = 'no-composite-claim';

/** The result of composing two relations. @public */
export type CompositionResult = RelationType | NoCompositeClaim;

/** @public */
export const NO_COMPOSITE_CLAIM: NoCompositeClaim = 'no-composite-claim';

/**
 * Every row of every column, written out. `Record<RelationType, …>` makes the
 * exhaustiveness structural: a ninth `RelationType` member fails to compile
 * here rather than silently acquiring a row of `'no-composite-claim'`.
 *
 * @public
 */
export const COMPOSITION_TABLE: Readonly<
  Record<RelationType, Readonly<Record<RelationType, CompositionResult>>>
> = {
  derivation: {
    derivation: 'derivation',
    'exact-equivalence': 'derivation',
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  'exact-equivalence': {
    derivation: 'derivation',
    'exact-equivalence': 'exact-equivalence',
    restriction: 'restriction',
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  restriction: {
    derivation: NO_COMPOSITE_CLAIM,
    'exact-equivalence': 'restriction',
    restriction: 'restriction',
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  approximation: {
    derivation: NO_COMPOSITE_CLAIM,
    // Licensed per route by a declared norm transport on the exact bridge; see the module comment.
    'exact-equivalence': 'approximation',
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  'coarse-graining': {
    derivation: NO_COMPOSITE_CLAIM,
    'exact-equivalence': NO_COMPOSITE_CLAIM,
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': 'coarse-graining',
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  'analytic-continuation': {
    derivation: NO_COMPOSITE_CLAIM,
    'exact-equivalence': NO_COMPOSITE_CLAIM,
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  'structural-analogy': {
    derivation: NO_COMPOSITE_CLAIM,
    'exact-equivalence': NO_COMPOSITE_CLAIM,
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
  'deformation-quantization': {
    derivation: NO_COMPOSITE_CLAIM,
    'exact-equivalence': NO_COMPOSITE_CLAIM,
    restriction: NO_COMPOSITE_CLAIM,
    approximation: NO_COMPOSITE_CLAIM,
    'coarse-graining': NO_COMPOSITE_CLAIM,
    'analytic-continuation': NO_COMPOSITE_CLAIM,
    'structural-analogy': NO_COMPOSITE_CLAIM,
    'deformation-quantization': NO_COMPOSITE_CLAIM,
  },
};

/**
 * The relation a chain of two bridges asserts, or `'no-composite-claim'` when
 * this sprint declines to assert one. A table lookup — no rules, no inference.
 *
 * @public
 */
export function composeRelation(
  first: RelationType,
  second: RelationType,
): CompositionResult {
  return COMPOSITION_TABLE[first][second];
}
