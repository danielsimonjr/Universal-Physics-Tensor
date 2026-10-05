/**
 * One public evaluation of a catalog id or a canonical id.
 *
 * The number is the edge's closed form, which stays that id's single
 * numeric body. A formula string is not parsed. An unset coefficient is
 * `kind: 'unset'` and is not a number.
 *
 * @module composition/evaluate-relation
 */

import type { Dimension } from '../dimensional/types.js';
import { CANONICAL_GRAPH } from './canonical-graph.js';
import { CATALOG_GRAPH } from './catalog-graph.js';
import { CoefficientUnsetError, evaluateEdge, type BridgeEdge } from './edge.js';

/**
 * A sourced number, or an unset coefficient.
 *
 * `dimension` is the edge target. `formula` is the edge label.
 *
 * @public
 */
export type Evaluation =
  | { readonly kind: 'value'; readonly value: number; readonly dimension: Dimension }
  | { readonly kind: 'unset'; readonly formula: string };

function resolveEdge(id: string | number): BridgeEdge {
  const key = typeof id === 'number' ? `be-${id}` : id;
  const edges = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];
  const exact = edges.find((edge) => edge.id === key);
  if (exact !== undefined) return exact;
  throw new Error(`evaluateRelation: unknown id '${key}'`);
}

/**
 * Evaluate `id` at `bindings`.
 *
 * A catalog id is `be-70` or `70`. A canonical id is `CE-sound-speed`.
 * Binding keys are the edge's quantity names or its aliases.
 * A missing input, a domain failure, and a sign failure throw.
 * An unset coefficient returns `{ kind: 'unset', formula }` and no number.
 *
 * @public
 */
export function evaluateRelation(
  id: string | number,
  bindings: Readonly<Record<string, number>>,
): Evaluation {
  const edge = resolveEdge(id);
  try {
    const value = evaluateEdge(edge, { ...bindings });
    if (!Number.isFinite(value)) {
      throw new Error(`evaluateRelation: ${edge.id} is missing a finite input`);
    }
    return { kind: 'value', value, dimension: edge.target.dim };
  } catch (error) {
    if (error instanceof CoefficientUnsetError) {
      return { kind: 'unset', formula: error.formula };
    }
    throw error;
  }
}
