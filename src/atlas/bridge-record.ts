/**
 * One catalog bridge, joined to the canonical foreign key and the generated
 * formal reference.
 *
 * The catalog row, the right-hand side, the edges, and the evaluator are
 * projections of `data/bridge-catalog.json`. This function reads them. It
 * does not store a second copy.
 *
 * @module atlas/bridge-record
 */

import { BRIDGE_EVALUATORS } from '../bridges/evaluators.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import { getBridge as joinBridge } from '../composition/descriptor.js';
import { catalogFormalRef } from './catalog-formal-ref.js';

/**
 * The joined catalog record, plus the canonical id that restates it and the
 * generated formal reference.
 *
 * @internal
 */
export function getBridge(bridgeId: number | string) {
  const joined = joinBridge(bridgeId);
  const canonicalId = CANONICAL_EQUATIONS.find(
    (equation) => equation.restatesBridge === String(joined.id),
  )?.id;
  return {
    ...joined,
    canonicalId,
    formalRef: catalogFormalRef(joined.id),
    evaluator: BRIDGE_EVALUATORS.get(joined.id),
  };
}
