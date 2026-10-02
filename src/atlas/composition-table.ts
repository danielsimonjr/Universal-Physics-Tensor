/**
 * Re-export of the composition table. The table lives in
 * `src/relations/composition-table.ts`. These consts are the same bindings.
 *
 * @module atlas/composition-table
 */

import {
  COMPOSITION_TABLE as compositionTableValue,
  composeRelation as composeRelationValue,
  NO_COMPOSITE_CLAIM as noCompositeClaimValue,
} from '../relations/composition-table.js';

/** The `'no-composite-claim'` value returned when a chain of two relations asserts nothing. @public */
export const NO_COMPOSITE_CLAIM = noCompositeClaimValue;

/** Every cell of the relation composition table, including the silent `'no-composite-claim'` cells. @public */
export const COMPOSITION_TABLE = compositionTableValue;

/** The relation a chain of two bridges asserts, read from the composition table. @public */
export const composeRelation = composeRelationValue;

/** What `composeRelation` returns when the chain asserts nothing. @public */
export type NoCompositeClaim = import('../relations/composition-table.js').NoCompositeClaim;

/** The result of composing two relations: a relation type, or no composite claim. @public */
export type CompositionResult = import('../relations/composition-table.js').CompositionResult;
