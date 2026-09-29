/**
 * Expression gaps a `upt probe scan` can hand to Product B.
 *
 * Product A wrappers (relation-link, connectors, regime-transition) stay
 * `searchable: false`. These gaps are a separate list, concatenated by the
 * CLI, so `scanFrontier`'s length is unchanged.
 *
 * @module composition/probe/expression-gaps
 * @internal
 */

import { APPLIED_CASES } from '../../cases/index.js';
import { scanFrontier } from './frontier.js';
import { makeResidualGap } from './problem.js';
import type { FrontierGap } from './types.js';
import type { BridgeEdge } from '../edge.js';

/** One searchable prediction-residual gap per applied case. @internal */
export function expressionSearchGaps(): FrontierGap[] {
  return [...APPLIED_CASES.values()]
    .map((c) => makeResidualGap(`fg-expr-${c.id}`, `${c.id}: ${c.title}`, 'prediction-residual'))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Product A wrappers plus the expression gaps. Relation-link gaps stay
 * not-searchable; the expression gaps are searchable.
 * @internal
 */
export function scanWithExpressionGaps(edges: readonly BridgeEdge[]): FrontierGap[] {
  return [...scanFrontier(edges), ...expressionSearchGaps()];
}
