/**
 * Pipeline match for a chain of proved edges.
 *
 * Calls {@link classifyStructure} with the algebraic-equivalence step
 * injected, so a chain that recovers a catalog right-hand side in another
 * spelling (`a/(b/c)` for `a·c/b`) is that confirmation and not a
 * provisional chain. A confirmation reports the catalog id. A restatement
 * reports the pre-declared canonical equation. Anything else is a
 * provisional `chain-` id. This function writes no catalog row, no
 * formal-reference overlay entry, and no evidence tag.
 *
 * @module composition/chain-match
 */
import type { ExprNode } from '../dimensional/validator.js';
import {
  classifyStructure,
  type ChainClassification,
} from '../canonical/structural.js';
import { equalUpToConstant } from './algebraic-equivalence.js';

/** The step `classifyStructure` runs on a normal-form miss: equal up to a constant. */
const ALGEBRAIC_STEP = { equivalent: (left: ExprNode, right: ExprNode): boolean => equalUpToConstant(left, right).equal };

/**
 * Classify one composed chain. `edgeIds` stay in chain order.
 *
 * @internal
 */
export function matchChain(expr: ExprNode, edgeIds: readonly string[]): ChainClassification {
  return classifyStructure(expr, edgeIds, ALGEBRAIC_STEP);
}
