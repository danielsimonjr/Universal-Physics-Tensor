/**
 * Re-export of the composition table. The table lives in
 * `src/relations/composition-table.ts`. These consts are the same bindings.
 *
 * @module atlas/composition-table
 */

/**
 * The composition table, the silent-cell value, and the function that reads a cell.
 *
 * @public
 */
export {
  COMPOSITION_TABLE,
  composeRelation,
  NO_COMPOSITE_CLAIM,
} from '../relations/composition-table.js';

/** What `composeRelation` returns when the chain asserts nothing. @public */
export type NoCompositeClaim = import('../relations/composition-table.js').NoCompositeClaim;

/** The result of composing two relations: a relation type, or no composite claim. @public */
export type CompositionResult = import('../relations/composition-table.js').CompositionResult;
