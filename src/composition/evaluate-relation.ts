/**
 * One public evaluation of a catalog id or a canonical id.
 *
 * A catalog id with a closed-form evaluator is that evaluator's `run`, the
 * same call `upt evaluate` makes, so the library and the CLI check the
 * bindings, the domain and the value in one place. A canonical id is its
 * graph edge, checked against the same {@link checkInputs} contract first.
 * A formula string is not parsed. An unset coefficient is `kind: 'unset'` and
 * is not a number.
 *
 * @module composition/evaluate-relation
 */

import { EXPECTED_DIMENSION_BY_BRIDGE } from '../dimensional/bridge-check.js';
import type { Dimension } from '../dimensional/types.js';
import { BRIDGE_EVALUATORS, type EvaluatorSpec } from '../bridges/evaluators.js';
import { checkInputs, inputContract, type InputContract } from '../bridges/input-contract.js';
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

/**
 * The declared inputs of an edge with no evaluator: each source under its name
 * and aliases, required; and, optional, its formula factors, the canonical
 * equation's governing names and a bound dimensionless group. A name that
 * already spells a source binds that source, so it is not a second slot.
 */
function edgeContract(id: string, edge: BridgeEdge): InputContract {
  const sourceSlots = edge.sources.map((source) => ({
    key: source.name,
    spellings: [source.name, ...(edge.aliases?.[source.name] ?? [])],
    alternates: [],
    optional: false,
    readBy: 'value' as const,
    listed: true,
  }));
  const spelled = new Set(sourceSlots.flatMap((slot) => slot.spellings));
  const optional = [...Object.keys(edge.formulaFactors ?? {}), ...canonicalNames(id)].filter((name) => !spelled.has(name));
  return inputContract(id, [
    ...sourceSlots,
    ...[...new Set(optional)].map((name) => ({ key: name, spellings: [name], alternates: [], optional: true, readBy: 'value' as const, listed: false })),
  ]);
}

/**
 * The declared inputs of an evaluable id: the closed-form evaluator's contract
 * when it has one, else its edge's. {@link evaluateRelation} checks bindings
 * against exactly this contract.
 * @internal
 */
export function evaluableContract(found: Evaluable): InputContract {
  if (found.evaluator !== undefined) return found.evaluator.contract;
  return edgeContract(found.id, found.edge!);
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
 * The closed form's primary output, through the evaluator's `run`. A record's
 * `value` is the catalog signature; any other number it returns is an extra
 * output, named by `spec.outputs`. A non-finite value at finite inputs is an
 * unset result (a dropped factor, a singularity).
 */
function closedFormEvaluation(
  spec: EvaluatorSpec,
  edge: BridgeEdge | undefined,
  bindings: Readonly<Record<string, number>>,
): Evaluation {
  const { value } = spec.run(bindings, 'value');
  const dimension = edge?.target.dim ?? EXPECTED_DIMENSION_BY_BRIDGE.get(spec.bridgeId);
  if (dimension === undefined) {
    throw new Error(`evaluateRelation: be-${spec.bridgeId} has no catalog dimension`);
  }
  if (Number.isFinite(value)) return { kind: 'value', value, dimension };
  // `run` refused a non-finite input, so a non-finite value here comes from the closed form.
  return { kind: 'unset', formula: edge?.label ?? primaryRelation(spec.bridgeId)?.label ?? spec.name };
}

/**
 * Evaluate `id` at `bindings`.
 *
 * A catalog id is `be-70` or `70`. A canonical id is `CE-sound-speed`.
 * Binding keys are the inputs' keys, quantity names or aliases.
 * The bindings are checked before the domain: an unknown key throws
 * `UnknownInputError`, a non-number `InputTypeError` (a `TypeError`), a
 * `NaN` or an infinity `NonFiniteInputError`, a key given twice
 * `DuplicateInputError`, an absent input `MissingInputError`.
 * A domain failure throws `DomainViolationError`.
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
  if (found.evaluator !== undefined) return closedFormEvaluation(found.evaluator, found.edge, bindings);
  const edge = found.edge!;
  const checked = checkInputs(evaluableContract(found), bindings);
  try {
    const value = evaluateEdge(edge, { ...checked });
    // `checkInputs` refused a non-finite input, so a non-finite value comes from the formula.
    if (!Number.isFinite(value)) return { kind: 'unset', formula: edge.label };
    return { kind: 'value', value, dimension: edge.target.dim };
  } catch (error) {
    if (error instanceof CoefficientUnsetError) return { kind: 'unset', formula: error.formula };
    throw error;
  }
}
