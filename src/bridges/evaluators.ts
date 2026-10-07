/**
 * Closed-form evaluators projected from the catalog. `run` evaluates the
 * relation expression. It does not switch on a catalog id.
 *
 * @module bridges/evaluators
 */

import { FORMULA_NAMED } from '../dimensional/formula-names.js';
import { primaryRelation } from './catalog-load.js';
import { catalogEvaluators } from './catalog-load.js';
import type { CatalogEvaluatorOutput, CatalogEvaluatorParameter, CatalogRelation } from './catalog-types.js';
import { evaluateFormula } from './expr-parse.js';
import { evaluateCatalogRelation, relationHolds } from './relation-eval.js';

/** How a length input is read: radius, diameter, separation, impact parameter, or semi-major axis. @public */
export type GeometryRole = 'radius' | 'diameter' | 'separation' | 'impact-parameter' | 'semi-major-axis';

/** A second key that converts into the parameter's key. @public */
export interface ParameterAlternate {
  readonly key: string;
  readonly meaning: string;
  readonly toKey: number;
}

/** One named input of an evaluator. @public */
export interface EvaluatorParameter {
  readonly key: string;
  readonly quantity: string;
  readonly symbol: string;
  readonly unit: string;
  readonly meaning: string;
  readonly geometry?: GeometryRole;
  readonly temperature?: 'absolute';
  /** The sign this input must have; the catalog loader turns it into a validity clause. */
  readonly sign?: 'positive' | 'nonnegative' | 'any';
  /** An angular frequency in rad/s. A cycle unit (Hz, rpm) given to it is multiplied by 2π. */
  readonly angular?: true;
  readonly alternates?: readonly ParameterAlternate[];
  readonly optional?: true;
}

/** A callable bridge evaluator with its input contract. @public */
export interface EvaluatorSpec {
  readonly bridgeId: number;
  readonly name: string;
  readonly inputKeys: readonly string[];
  readonly parameters: readonly EvaluatorParameter[];
  /** Further numbers `run` returns beside `value`, keyed by `name`. */
  readonly outputs: readonly CatalogEvaluatorOutput[];
  run(inputs: Readonly<Record<string, number>>): unknown;
}

function toParameter(row: CatalogEvaluatorParameter): EvaluatorParameter {
  return {
    key: row.key,
    quantity: row.quantity,
    symbol: row.symbol,
    unit: row.unit,
    meaning: row.meaning,
    ...(row.geometry !== undefined ? { geometry: row.geometry } : {}),
    ...(row.temperature !== undefined ? { temperature: row.temperature } : {}),
    ...(row.sign !== undefined ? { sign: row.sign } : {}),
    ...(row.angular === true ? { angular: true as const } : {}),
    ...(row.alternates !== undefined ? { alternates: row.alternates } : {}),
    ...(row.optional === true ? { optional: true as const } : {}),
  };
}

const NAMED_DEFAULT = new Map(FORMULA_NAMED.map((named) => [named.name, named.value]));

/** The relation source a parameter is the input for, or undefined when it owns none. */
export function sourceOfParameter(relation: CatalogRelation, parameter: EvaluatorParameter): string | undefined {
  for (const source of relation.sources) {
    if (source === parameter.key || (relation.aliases[source] ?? []).includes(parameter.key)) return source;
  }
  return relation.sources.includes(parameter.quantity) ? parameter.quantity : undefined;
}

/**
 * Keys of the parameters whose source does not appear in the relation's
 * expression. They are checked against the validity domain and do not change
 * the value, so a caller who varies one sees no effect.
 */
export function unusedInputKeys(spec: EvaluatorSpec): string[] {
  const relation = primaryRelation(spec.bridgeId);
  if (relation === undefined) return [];
  // Names carry hyphens, and a hyphen is also a minus. Blank out each source
  // name longest first, so `a-b` inside `a-b-c` is not read as `a-b`.
  let rest = relation.expression;
  const used = new Set<string>();
  for (const source of [...relation.sources].sort((x, y) => y.length - x.length)) {
    if (rest.includes(source)) used.add(source);
    rest = rest.split(source).join(' ');
  }
  const readByOutput = (key: string): boolean =>
    spec.outputs.some((output) => new RegExp(`(^|[^A-Za-z0-9_])${key}($|[^A-Za-z0-9_])`).test(output.expression));
  return spec.parameters
    .filter((parameter) => {
      const source = sourceOfParameter(relation, parameter);
      // A parameter that owns no relation source is read only by an extra output.
      return (source === undefined || !used.has(source)) && !readByOutput(parameter.key);
    })
    .map((parameter) => parameter.key);
}

/** Map evaluator keys onto catalog quantity names. A named constant fills a source no parameter owns. */
export function bindRelationInputs(
  relation: CatalogRelation,
  parameters: readonly EvaluatorParameter[],
  inputs: Readonly<Record<string, number>>,
): Record<string, number> {
  const sourceOfKey = new Map<string, string>();
  for (const source of relation.sources) {
    sourceOfKey.set(source, source);
    for (const alias of relation.aliases[source] ?? []) sourceOfKey.set(alias, source);
  }
  const bound: Record<string, number> = {};
  const owned = new Set<string>();
  for (const parameter of parameters) {
    const source =
      sourceOfKey.get(parameter.key) ??
      (relation.sources.includes(parameter.quantity) ? parameter.quantity : undefined);
    if (source === undefined) continue;
    owned.add(source);
    const value = inputs[parameter.key];
    if (value === undefined || !Number.isFinite(value)) continue;
    bound[source] = value;
  }
  for (const source of relation.sources) {
    if (bound[source] !== undefined || owned.has(source)) continue;
    const value = NAMED_DEFAULT.get(source.replaceAll('-', '_'));
    if (value !== undefined) bound[source] = value;
  }
  return bound;
}

function buildSpec(
  catalogId: number,
  name: string,
  parameters: readonly EvaluatorParameter[],
  outputs: readonly CatalogEvaluatorOutput[],
): EvaluatorSpec {
  return {
    bridgeId: catalogId,
    name,
    inputKeys: parameters.filter((parameter) => parameter.optional !== true).map((parameter) => parameter.key),
    parameters,
    outputs,
    run(inputs) {
      const relation = primaryRelation(catalogId);
      if (relation === undefined) {
        throw new Error(missingEvaluatorMessage(catalogId));
      }
      const bound = bindRelationInputs(relation, parameters, inputs);
      if (!relationHolds(relation, bound)) {
        throw new Error(`${relation.id}: inputs violate validity domain (${relation.domain})`);
      }
      for (const parameter of parameters) {
        const given = inputs[parameter.key];
        if (parameter.optional === true && parameter.sign === 'positive' && given !== undefined && !(given > 0)) {
          throw new Error(`${relation.id}: ${parameter.key} must be > 0`);
        }
      }
      const value = evaluateCatalogRelation(relation, bound);
      const result: Record<string, number> = { value };
      for (const output of outputs) {
        if ((output.requires ?? []).some((key) => !Number.isFinite(inputs[key]))) continue;
        result[output.name] = evaluateFormula(output.expression, { ...inputs, value });
      }
      return result;
    },
  };
}

/** Bridge id → evaluator. @internal */
export const BRIDGE_EVALUATORS: ReadonlyMap<number, EvaluatorSpec> = new Map(
  catalogEvaluators().map((row) => {
    const parameters = row.parameters.map(toParameter);
    return [row.catalogId, buildSpec(row.catalogId, row.name, parameters, row.outputs ?? [])] as const;
  }),
);

/** What to say when an id is not in {@link BRIDGE_EVALUATORS}. @internal */
export function missingEvaluatorMessage(bridgeId: number): string {
  return `evaluateBridge: catalog id ${bridgeId} has no evaluator`;
}

/**
 * Evaluate a catalog id with a numeric input record. Throws on an unknown id
 * or a missing required input.
 *
 * @internal
 */
export function evaluateBridge(
  bridgeId: number,
  inputs: Readonly<Record<string, number>>,
): unknown {
  const spec = BRIDGE_EVALUATORS.get(bridgeId);
  if (spec === undefined) throw new Error(missingEvaluatorMessage(bridgeId));
  const missing = spec.inputKeys.filter((key) => !(key in inputs) || !Number.isFinite(inputs[key]));
  if (missing.length > 0) {
    throw new Error(
      `evaluateBridge: catalog id ${bridgeId} (${spec.name}) needs {${spec.inputKeys.join(', ')}}; missing/non-finite: ${missing.join(', ')}`,
    );
  }
  return spec.run(inputs);
}
