/**
 * One public evaluation of a catalog id or a canonical id.
 *
 * The number is the edge's closed form, which stays that id's single
 * numeric body. A formula string is not parsed. An unset coefficient is
 * `kind: 'unset'` and is not a number.
 *
 * @module composition/evaluate-relation
 */

import { EXPECTED_DIMENSION_BY_BRIDGE } from '../dimensional/bridge-check.js';
import type { Dimension } from '../dimensional/types.js';
import {
  BRIDGE_EVALUATORS,
  sourceOfParameter,
  type EvaluatorSpec,
} from '../bridges/evaluators.js';
import { catalogEdgeKey, parseBridgeId, primaryRelation } from '../bridges/catalog-load.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import { CANONICAL_GROUP_PREFACTORS } from './canonical-prefactors.js';
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

/**
 * The output of a closed-form evaluator: the quantity it computes and that
 * quantity's dimension. An evaluator with no catalog dimension (a closed form
 * with no AST) names no dimension.
 */
export function evaluatorOutput(spec: EvaluatorSpec): { readonly name: string; readonly dimension?: Dimension } {
  const relation = primaryRelation(spec.bridgeId);
  const dimension = EXPECTED_DIMENSION_BY_BRIDGE.get(spec.bridgeId);
  return {
    name: relation?.target ?? 'value',
    ...(dimension === undefined ? {} : { dimension }),
  };
}

/**
 * Names a canonical id may be bound under besides its sources: the equation's
 * governing names (a registered constant may be overridden), its formula
 * factors, and a bound dimensionless group such as `gamma`.
 */
function canonicalNames(id: string): string[] {
  const equation = CANONICAL_EQUATIONS.find((candidate) => candidate.id === id);
  return [
    ...(equation?.dimensional.governing.map((g) => g.name) ?? []),
    ...CANONICAL_GROUP_PREFACTORS.filter((group) => group.id === id).map((group) => group.group),
  ];
}

/** A required input is absent. It is not a physically bad value. */
export class MissingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingInputError';
  }
}

/**
 * Check `bindings` against the id's declared inputs and return the record the
 * evaluation reads: a declared alternate is converted onto its key, an unknown
 * key and a non-number are refused, and an absent input is named before any
 * domain check can blame the physics.
 */
function checkBindings(found: Evaluable, bindings: Readonly<Record<string, number>>): Record<string, number> {
  const parameters = found.evaluator?.parameters ?? [];
  const edge = found.edge;
  const relation = found.evaluator === undefined ? undefined : primaryRelation(found.evaluator.bridgeId);
  const sourceNames = edge?.sources.map((source) => source.name) ?? [];
  const aliasNames = edge === undefined ? [] : Object.values(edge.aliases ?? {}).flat();
  const accepted = new Set<string>([
    ...sourceNames,
    ...(edge === undefined ? [] : Object.keys(edge.formulaFactors ?? {})),
    ...(found.evaluator === undefined ? canonicalNames(found.id) : []),
    ...aliasNames,
    ...parameters.flatMap((p) => [p.key, p.quantity, ...(p.alternates ?? []).map((a) => a.key)]),
  ]);
  const listed = parameters.length > 0 ? parameters.map((p) => p.key) : sourceNames;
  const out: Record<string, number> = { ...bindings };
  for (const [key, value] of Object.entries(bindings)) {
    if (!accepted.has(key)) {
      throw new Error(`${found.id}: '${key}' is not an input; the inputs are: ${listed.join(', ')}`);
    }
    if (typeof value !== 'number') {
      throw new TypeError(`${found.id}: ${key} must be a number, got ${typeof value}`);
    }
  }
  for (const p of parameters) {
    for (const alt of p.alternates ?? []) {
      if (!Object.hasOwn(out, alt.key)) continue;
      if (Object.hasOwn(out, p.key)) {
        throw new Error(`${found.id}: '${p.key}' is given twice (once through the alternate '${alt.key}')`);
      }
      out[p.key] = out[alt.key]! * alt.toKey;
      delete out[alt.key];
    }
  }
  if (edge !== undefined) {
    const missing: string[] = [];
    for (const source of edge.sources) {
      const keys = [source.name, ...(edge.aliases?.[source.name] ?? [])];
      if (keys.some((key) => Object.hasOwn(out, key))) continue;
      const owner =
        relation === undefined ? undefined : parameters.find((p) => sourceOfParameter(relation, p) === source.name);
      if (relation !== undefined && owner === undefined) continue;
      if (owner?.optional === true) continue;
      missing.push(owner?.key ?? source.name);
    }
    if (missing.length > 0) {
      throw new MissingInputError(
        `${found.id}: missing input ${missing.map((key) => `'${key}'`).join(', ')}; the inputs are: ${listed.join(', ')}`,
      );
    }
  }
  return out;
}

/** Every source is present and finite, under its name or an alias. */
function sourcesFinite(edge: BridgeEdge, bindings: Readonly<Record<string, number>>): boolean {
  for (const source of edge.sources) {
    const keys = [source.name, ...(edge.aliases?.[source.name] ?? [])];
    const present = keys.some((key) => {
      const value = bindings[key];
      return value !== undefined && Number.isFinite(value);
    });
    if (!present) return false;
  }
  return true;
}

function idOf(id: string | number): { key: string; numeric: number | undefined } {
  if (typeof id === 'number') return { key: catalogEdgeKey(id), numeric: id };
  try {
    const numeric = parseBridgeId(id);
    return { key: catalogEdgeKey(numeric), numeric };
  } catch {
    return { key: id, numeric: undefined };
  }
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

/**
 * The closed form's primary output. A record's `value` is the catalog
 * signature; any other number it returns is an extra output, named by
 * `spec.outputs`. A record with no finite `value` is not a result.
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
  const primary = (raw as Record<string, unknown>).value;
  if (typeof primary !== 'number' || !Number.isFinite(primary)) {
    throw new Error(`evaluateRelation: be-${spec.bridgeId} returned no finite value`);
  }
  return { kind: 'value', value: primary, dimension: expected };
}

/**
 * Evaluate `id` at `bindings`.
 *
 * A catalog id is `be-70` or `70`. A canonical id is `CE-sound-speed`.
 * Binding keys are the edge's quantity names or its aliases.
 * A missing input, a domain failure, and a sign failure throw.
 * An unset coefficient returns `{ kind: 'unset', formula }` and no number.
 * A complete finite input whose closed form is not finite (a dropped factor,
 * a singularity) is the same unset result, not a missing input.
 *
 * @public
 */
export function evaluateRelation(
  id: string | number,
  bindings: Readonly<Record<string, number>>,
): Evaluation {
  const found = resolveEvaluable(id);
  const checked = checkBindings(found, bindings);
  if (found.edge !== undefined) {
    try {
      const value = evaluateEdge(found.edge, { ...checked });
      if (!Number.isFinite(value)) {
        if (sourcesFinite(found.edge, checked)) return { kind: 'unset', formula: found.edge.label };
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
  return closedFormEvaluation(found.evaluator!, checked);
}
