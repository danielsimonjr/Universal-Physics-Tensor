/**
 * Expression gaps a `upt probe scan` can hand to Product B.
 *
 * Product A wrappers (relation-link, connectors, regime-transition) stay
 * `searchable: false`. These gaps are a separate list, concatenated by the
 * CLI, so `scanFrontier`'s length is unchanged.
 *
 * `searchable: true` here is the Tier 8 scan-list flag. Each record is built
 * from an applied-case id and title. Observations are empty. There is no
 * named baseline and no dataset. Scientific-Bridge-Discovery-v1 admits a
 * prediction-residual scanner only when both exist, so this list is not a
 * detected prediction residual and not a problem file.
 *
 * @module composition/probe/expression-gaps
 * @internal
 */

import { APPLIED_CASES } from '../../cases/index.js';
import { scanFrontier } from './frontier.js';
import { makeResidualGap } from './problem.js';
import type { FrontierGap } from './types.js';
import type { BridgeEdge } from '../edge.js';

/**
 * Why an expression gap is listed as searchable.
 * The flag stays true because the Tier 8 contract lists these handles.
 * The sentence states the inputs a detected residual would have required.
 */
const EXPRESSION_GAP_SEARCH_REASON =
  'listed as searchable by the Tier 8 expression-gap contract; observations are empty, and this record has no named baseline and no dataset, so it is not a detected prediction residual and not a problem file';

/** One searchable prediction-residual gap per applied case. @internal */
export function expressionSearchGaps(): FrontierGap[] {
  return [...APPLIED_CASES.values()]
    .map((c) => {
      const gap = makeResidualGap(`fg-expr-${c.id}`, `${c.id}: ${c.title}`, 'prediction-residual');
      return {
        ...gap,
        observations: [] as const,
        searchability: { searchable: true, reasons: [EXPRESSION_GAP_SEARCH_REASON] },
      };
    })
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
