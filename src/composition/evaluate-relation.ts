/**
 * One public evaluation of a catalog id or a canonical id.
 *
 * The number is the edge's closed form, which stays that id's single
 * numeric body. A formula string is not parsed. An unset coefficient is
 * `kind: 'unset'` and is not a number.
 *
 * @module composition/evaluate-relation
 */

import { equals } from '../dimensional/algebra.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../dimensional/bridge-check.js';
import type { Dimension } from '../dimensional/types.js';
import { parseUnit } from '../dimensional/units.js';
import { BRIDGE_EVALUATORS, type EvaluatorSpec } from '../bridges/evaluators.js';
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

/**
 * An id the library can evaluate: a graph edge, a closed-form evaluator, or both.
 * The CLI and {@link evaluateRelation} both call this. Neither looks the id up again.
 */
export interface Evaluable {
  readonly id: string;
  readonly edge?: BridgeEdge;
  readonly evaluator?: EvaluatorSpec;
}

function idOf(id: string | number): { key: string; numeric: number | undefined } {
  if (typeof id === 'number') return { key: `be-${id}`, numeric: id };
  const match = /^be-(\d+)$/.exec(id);
  return { key: id, numeric: match === null ? undefined : Number(match[1]) };
}

/**
 * The edge and the closed-form evaluator for `id`, when either exists.
 * An unknown id throws. An id with an evaluator and no edge is not unknown.
 */
export function resolveEvaluable(id: string | number): Evaluable {
  const { key, numeric } = idOf(id);
  const edge = [...CATALOG_GRAPH, ...CANONICAL_GRAPH].find((candidate) => candidate.id === key);
  const evaluator = numeric === undefined ? undefined : BRIDGE_EVALUATORS.get(numeric);
  if (edge === undefined && evaluator === undefined) {
    throw new Error(`evaluateRelation: unknown id '${key}'`);
  }
  return {
    id: key,
    ...(edge === undefined ? {} : { edge }),
    ...(evaluator === undefined ? {} : { evaluator }),
  };
}

/** Unit dimensions a result key's suffix can be read as. `mK` stays millikelvin. */
function suffixDimensions(key: string): Dimension[] {
  const parts = key.split('_');
  const dims: Dimension[] = [];
  for (let i = 1; i < parts.length; i++) {
    const expr = parts.slice(i).join('_').replace(/_per_/g, '/').replaceAll('_', '*');
    try {
      const parsed = parseUnit(expr);
      if (parsed.affine === undefined) dims.push(parsed.dim);
    } catch {
      // This suffix is not a unit expression.
    }
  }
  return dims;
}

/**
 * The result field whose dimension is the catalog signature.
 * Input keys are echoed and are not candidates. A single remaining number
 * is that output when no suffix parses to the signature.
 */
function closedFormEvaluation(
  spec: EvaluatorSpec,
  bindings: Readonly<Record<string, number>>,
): Evaluation {
  const raw = spec.run({ ...bindings });
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`evaluateRelation: be-${spec.bridgeId} did not return a result`);
  }
  const expected = EXPECTED_DIMENSION_BY_BRIDGE.get(spec.bridgeId);
  if (expected === undefined) {
    throw new Error(`evaluateRelation: be-${spec.bridgeId} has no catalog dimension`);
  }
  const inputs = new Set(spec.inputKeys);
  const numeric = Object.entries(raw as Record<string, unknown>).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === 'number' && Number.isFinite(entry[1]) && !inputs.has(entry[0]),
  );
  const matched = numeric.filter(([key]) => suffixDimensions(key).some((dim) => equals(dim, expected)));
  const chosen = matched.length === 1 ? matched[0] : matched.length === 0 && numeric.length === 1 ? numeric[0] : undefined;
  if (chosen === undefined) {
    throw new Error(`evaluateRelation: be-${spec.bridgeId} has no unique output of the catalog dimension`);
  }
  return { kind: 'value', value: chosen[1], dimension: expected };
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
  const found = resolveEvaluable(id);
  if (found.edge !== undefined) {
    try {
      const value = evaluateEdge(found.edge, { ...bindings });
      if (!Number.isFinite(value)) {
        throw new Error(`evaluateRelation: ${found.edge.id} is missing a finite input`);
      }
      return { kind: 'value', value, dimension: found.edge.target.dim };
    } catch (error) {
    if (error instanceof CoefficientUnsetError) {
      return { kind: 'unset', formula: error.formula };
    }
    throw error;
    }
  }
  return closedFormEvaluation(found.evaluator!, bindings);
}
