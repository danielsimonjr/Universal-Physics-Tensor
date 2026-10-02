/**
 * Pipeline match for a chain of proved edges.
 *
 * Calls {@link classifyStructure}. A confirmation reports the catalog id.
 * A restatement reports the pre-declared canonical equation. Anything else
 * is a provisional `chain-` id. This function writes no catalog row, no
 * formal-reference overlay entry, and no evidence tag.
 *
 * @module composition/chain-match
 */
import type { ExprNode } from '../dimensional/validator.js';
import {
  classifyStructure,
  type ChainClassification,
} from '../canonical/structural.js';

/**
 * Classify one composed chain. `edgeIds` stay in chain order.
 *
 * @internal
 */
export function matchChain(expr: ExprNode, edgeIds: readonly string[]): ChainClassification {
  return classifyStructure(expr, edgeIds);
}
