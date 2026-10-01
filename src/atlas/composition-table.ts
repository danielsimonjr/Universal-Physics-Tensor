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

/** @public */
export const NO_COMPOSITE_CLAIM = noCompositeClaimValue;

/**
 * @public
 */
export const COMPOSITION_TABLE = compositionTableValue;

/** @public */
export const composeRelation = composeRelationValue;

/** @public */
export type NoCompositeClaim = import('../relations/composition-table.js').NoCompositeClaim;

/** @public */
export type CompositionResult = import('../relations/composition-table.js').CompositionResult;
