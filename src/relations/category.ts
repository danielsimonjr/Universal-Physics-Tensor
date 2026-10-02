/**
 * Objects and morphisms of the regime category.
 *
 * An object is an id together with a `Regime`. A morphism is the ids of
 * its source and target, plus the `RelationType` it asserts.
 * `composeMorphisms` returns `'no-composite-claim'` when `first.target`
 * is not `second.source`. Otherwise it returns `composeRelation`.
 * Endpoint identity is string equality on the ids the caller stored.
 * There is no second composition table.
 *
 * Identity morphisms and 2-cells are omitted. Part IX §3 leaves identity
 * unspecified, and a non-commuting pair is two chains.
 *
 * @module relations/category
 */

import type { Regime, RelationType } from './types.js';
import { composeRelation, type CompositionResult } from './composition-table.js';

/** An object: an id together with the regime it sits in. @internal */
export interface CategoryObject {
  readonly id: string;
  readonly regime: Regime;
}

/**
 * A morphism from one object to another. The id pair is the source and
 * the target. The relation is what the morphism asserts.
 *
 * @internal
 */
export interface CategoryMorphism {
  readonly source: string;
  readonly target: string;
  readonly relation: RelationType;
}

/**
 * The relation a chain of two morphisms may assert.
 *
 * A pair that does not meet is `'no-composite-claim'`, including when
 * the table cell for the two relation types is defined. Meeting is
 * `first.target === second.source`.
 *
 * @internal
 */
export function composeMorphisms(
  first: CategoryMorphism,
  second: CategoryMorphism,
): CompositionResult {
  if (first.target !== second.source) return 'no-composite-claim';
  return composeRelation(first.relation, second.relation);
}
