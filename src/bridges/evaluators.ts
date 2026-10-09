/**
 * Closed-form evaluators projected from the catalog. `run` evaluates the
 * relation expression. It does not switch on a catalog id.
 *
 * `run` is the one evaluation of a catalog closed form: `evaluateRelation`,
 * the CLI and the uncertainty probes all call it. It checks the bindings
 * against the evaluator's {@link InputContract} before the validity domain,
 * so an absent input is a {@link MissingInputError}, never a domain failure.
 *
 * @module bridges/evaluators
 */

import { FORMULA_NAMED } from '../dimensional/formula-names.js';
import { catalogEvaluators, primaryRelation } from './catalog-load.js';
import type { CatalogEvaluator, CatalogEvaluatorOutput, CatalogEvaluatorParameter, CatalogRelation } from './catalog-types.js';
import { evaluateFormula, formulaVariables, parseCatalogExpression, reservedFormulaNames } from './expr-parse.js';
import type { ExprNode } from '../dimensional/ast-types.js';
import { evaluateCatalogRelation, relationHolds } from './relation-eval.js';
import { DomainViolationError } from './evaluation-errors.js';
import { checkInputs, inputContract, type EvaluationWant, type InputContract, type InputSlot } from './input-contract.js';

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
  /** Every spelling that binds an input, and which inputs are required. `run` checks it first. */
  readonly contract: InputContract;
  /**
   * Evaluate at `inputs`, keyed by parameter key, quantity, relation source,
   * alias or alternate. Throws `UnknownInputError`, `InputTypeError`,
   * `DuplicateInputError` or `MissingInputError` before any
   * `DomainViolationError`. With `want` `'value'` it returns `{ value }`
   * alone, and an input only an extra output reads is not required.
   */
  run(inputs: Readonly<Record<string, number>>, want?: EvaluationWant): Record<string, number>;
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
function sourceOfParameter(relation: CatalogRelation, parameter: EvaluatorParameter): string | undefined {
  for (const source of relation.sources) {
    if (source === parameter.key || (relation.aliases[source] ?? []).includes(parameter.key)) return source;
  }
  return relation.sources.includes(parameter.quantity) ? parameter.quantity : undefined;
}

/** Every symbol name in an expression tree. */
function symbolNames(node: ExprNode): string[] {
  if (node.kind === 'symbol') return [node.name];
  if (node.kind === 'op') return node.args.flatMap(symbolNames);
  if (node.kind === 'abs' || node.kind === 'transcendental') return symbolNames(node.arg);
  return [];
}

/**
 * Keys of the parameters whose source does not appear in the relation's
 * expression. They are checked against the validity domain and do not change
 * the value, so a caller who varies one sees no effect.
 */
export function unusedInputKeys(spec: EvaluatorSpec): string[] {
  const relation = primaryRelation(spec.bridgeId);
  if (relation === undefined) return [];
  const used = new Set(symbolNames(parseCatalogExpression(relation.expression)));
  // An output reads the scope names its parsed expression names, the same parse `run` evaluates.
  const outputReads = new Set(spec.outputs.flatMap((output) => formulaVariables(output.expression)));
  const readByOutput = (key: string): boolean => outputReads.has(key.replaceAll('-', '_'));
  return spec.parameters
    .filter((parameter) => {
      const source = sourceOfParameter(relation, parameter);
      // A parameter that owns no relation source is read only by an extra output.
      return (source === undefined || !used.has(source)) && !readByOutput(parameter.key);
    })
    .map((parameter) => parameter.key);
}

/**
 * The declared inputs of a catalog evaluator: one slot per parameter, spelled
 * by its key, its relation source and that source's aliases, and its quantity
 * when no other slot shares it; then one optional, unlisted slot per relation
 * source no parameter owns, which a named constant fills when not given.
 * Building it throws when one spelling would bind two slots.
 */
function evaluatorContract(catalogId: number, relation: CatalogRelation, parameters: readonly EvaluatorParameter[]): InputContract {
  const quantityCount = new Map<string, number>();
  for (const p of parameters) quantityCount.set(p.quantity, (quantityCount.get(p.quantity) ?? 0) + 1);
  const owned = new Set<string>();
  const slots: InputSlot[] = parameters.map((p) => {
    const source = sourceOfParameter(relation, p);
    if (source !== undefined) owned.add(source);
    const spellings = [
      p.key,
      ...(source === undefined ? [] : [source, ...(relation.aliases[source] ?? [])]),
      ...(quantityCount.get(p.quantity) === 1 ? [p.quantity] : []),
    ];
    return {
      key: p.key,
      spellings: [...new Set(spellings)],
      alternates: (p.alternates ?? []).map((alt) => ({ key: alt.key, toKey: alt.toKey })),
      optional: p.optional === true,
      readBy: source === undefined ? ('outputs' as const) : ('value' as const),
      listed: true,
    };
  });
  for (const source of relation.sources) {
    if (owned.has(source)) continue;
    slots.push({
      key: source,
      spellings: [source, ...(relation.aliases[source] ?? [])],
      alternates: [],
      optional: NAMED_DEFAULT.has(source.replaceAll('-', '_')),
      readBy: 'value',
      listed: false,
    });
  }
  return inputContract(`be-${catalogId}`, slots);
}

/**
 * Checked inputs (keyed by slot key) onto catalog source names. A source no
 * parameter owns takes its given value, else its named constant.
 */
function bindRelationInputs(
  relation: CatalogRelation,
  parameters: readonly EvaluatorParameter[],
  inputs: Readonly<Record<string, number>>,
): Record<string, number> {
  const bound: Record<string, number> = {};
  const owned = new Set<string>();
  for (const parameter of parameters) {
    const source = sourceOfParameter(relation, parameter);
    if (source === undefined) continue;
    owned.add(source);
    const value = inputs[parameter.key];
    if (value !== undefined) bound[source] = value;
  }
  for (const source of relation.sources) {
    if (owned.has(source)) continue;
    const value = inputs[source] ?? NAMED_DEFAULT.get(source.replaceAll('-', '_'));
    if (value !== undefined) bound[source] = value;
  }
  return bound;
}

/**
 * The spec of one catalog evaluator row. An output expression reads the
 * scope by parameter key, so a key that names a registered constant (be-66's
 * reflectance `R`) may bind the relation's source but may not be read by an
 * output: building the spec refuses it.
 * @internal
 */
export function buildEvaluatorSpec(row: CatalogEvaluator): EvaluatorSpec {
  const parameters = row.parameters.map(toParameter);
  return buildSpec(row.catalogId, row.name, parameters, row.outputs ?? []);
}

function buildSpec(
  catalogId: number,
  name: string,
  parameters: readonly EvaluatorParameter[],
  outputs: readonly CatalogEvaluatorOutput[],
): EvaluatorSpec {
  const relation = primaryRelation(catalogId);
  if (relation === undefined) throw new Error(missingEvaluatorMessage(catalogId));
  const contract = evaluatorContract(catalogId, relation, parameters);
  const keys = parameters.map((parameter) => parameter.key);
  const reserved = reservedFormulaNames();
  for (const output of outputs) {
    const shadowed = formulaVariables(output.expression).find((name) => reserved.has(name) && keys.includes(name));
    if (shadowed !== undefined) {
      throw new Error(`be-${catalogId}: output '${output.name}' reads '${shadowed}', which names a registered constant`);
    }
  }
  // An output reads the parameter keys and `value`; a key that shadows a constant is refused above.
  const outputScope = [...keys, 'value'];
  return {
    bridgeId: catalogId,
    name,
    inputKeys: parameters.filter((parameter) => parameter.optional !== true).map((parameter) => parameter.key),
    parameters,
    outputs,
    contract,
    run(inputs, want = 'all') {
      const given = checkInputs(contract, inputs, want);
      const bound = bindRelationInputs(relation, parameters, given);
      if (!relationHolds(relation, bound)) {
        throw new DomainViolationError(`${relation.id}: inputs violate validity domain (${relation.domain})`);
      }
      for (const parameter of parameters) {
        const value = given[parameter.key];
        if (parameter.optional === true && parameter.sign === 'positive' && value !== undefined && !(value > 0)) {
          throw new DomainViolationError(`${relation.id}: ${parameter.key} must be > 0`);
        }
      }
      const value = evaluateCatalogRelation(relation, bound);
      const result: Record<string, number> = { value };
      if (want === 'value') return result;
      for (const output of outputs) {
        if ((output.requires ?? []).some((key) => given[key] === undefined)) continue;
        result[output.name] = evaluateFormula(output.expression, { ...given, value }, outputScope);
      }
      return result;
    },
  };
}

/** Bridge id → evaluator. @internal */
export const BRIDGE_EVALUATORS: ReadonlyMap<number, EvaluatorSpec> = new Map(
  catalogEvaluators().map((row) => [row.catalogId, buildEvaluatorSpec(row)] as const),
);

/** What to say when an id is not in {@link BRIDGE_EVALUATORS}. @internal */
export function missingEvaluatorMessage(bridgeId: number): string {
  return `evaluateBridge: catalog id ${bridgeId} has no evaluator`;
}

/**
 * Evaluate a catalog id with a numeric input record: the evaluator's `run`,
 * which checks the inputs first. Throws on an unknown id.
 *
 * @internal
 */
export function evaluateBridge(
  bridgeId: number,
  inputs: Readonly<Record<string, number>>,
): Record<string, number> {
  const spec = BRIDGE_EVALUATORS.get(bridgeId);
  if (spec === undefined) throw new Error(missingEvaluatorMessage(bridgeId));
  return spec.run(inputs);
}
