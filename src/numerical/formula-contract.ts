/**
 * Scalar-formula contract: the parser types, the refusal of `euler`, and THE
 * ONE TABLE of documented scalar functions.
 *
 * `SCALAR_FUNCTIONS` carries, for each documented function, its arity, its
 * numeric body, and its dimension rule (how the arguments' dimensions map to
 * the result's). Three readers consume it and none keeps a table of its
 * own: the MathTS formula parser supplies the bodies MathTS does not define
 * (`ln`) and names the documented list in its diagnostics; the lowering pass
 * evaluates a `transcendental`, `abs` or `^` node through it; the dimension
 * checker and the binding reader apply the dimension rule. Path B, the
 * recursive-descent parser that used to live in `formula.ts`, is gone.
 *
 * @module numerical/formula-contract
 */

import type { TranscendentalFn } from '../dimensional/ast-types.js';

/** A parse or evaluation failure (bad syntax, unknown symbol, arity). */
export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

/**
 * A formula that parsed and evaluated, whose value is not a finite real number (`ln(-1)`,
 * `1/0`, `sqrt(-1)`). A bad value at the point, not a malformed formula: the CLI exits 1 on
 * it where a `FormulaError` is exit 2 (Tom's review, second round).
 */
export class FormulaValueError extends FormulaError {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaValueError';
  }
}

/** A parsed formula: its free variables and a safe evaluator. @internal */
export interface CompiledFormula {
  /** The original source string. */
  readonly source: string;
  /** Free variable names (excludes built-in constants and functions). */
  readonly variables: readonly string[];
  /** Evaluate against a `name → value` scope. Throws on a missing var. */
  evaluate(scope: Record<string, number>): number;
}

/** The MathTS-backed parser implements this. @internal */
export interface FormulaParser {
  parse(expr: string): CompiledFormula;
}

/**
 * The name `euler` is not Euler's number. Write `exp(x)`, for example `exp(1)`.
 * A bare `e` is the elementary charge. `E` is energy.
 * @internal
 */
export const EULER_NUMBER_ERROR =
  "euler is not Euler's number. Write it as exp(x), for example exp(1). A bare e is the elementary charge. E is energy.";

/** The name `euler` was written for Euler's number. @internal */
export class EulerNumberError extends FormulaError {
  constructor() {
    super(EULER_NUMBER_ERROR);
    this.name = 'EulerNumberError';
  }
}

/**
 * How a documented function maps its arguments' dimensions to its result's.
 *
 * - `transcendental`: the argument must be dimensionless and so is the result.
 *   `node` is the dimensional grammar's `transcendental` node when the grammar
 *   has one for this function; without it the checker keeps a dimensionless stub.
 * - `same`: the result has the argument's dimension (`abs`).
 * - `root`: the result is the argument's dimension to `power` (`sqrt`, `cbrt`).
 * - `power`: `pow(base, exp)`; the exponent is a dimensionless constant and
 *   the result is the base's dimension to that constant.
 * - `ratio`: `atan2(y, x)`; both arguments share a dimension and the result is
 *   dimensionless.
 * @internal
 */
export type ScalarFunctionDimension =
  | { readonly kind: 'transcendental'; readonly node?: TranscendentalFn }
  | { readonly kind: 'same' }
  | { readonly kind: 'root'; readonly power: number }
  | { readonly kind: 'power' }
  | { readonly kind: 'ratio' };

/** One documented scalar function: arity, numeric body, dimension rule. @internal */
export interface ScalarFunction {
  readonly arity: number;
  readonly dimension: ScalarFunctionDimension;
  /** The numeric body. Arity is checked by {@link callBuiltinFunction}, not here. */
  readonly apply: (args: readonly number[]) => number;
}

const transcendental = (node: TranscendentalFn | undefined, f: (x: number) => number): ScalarFunction => ({
  arity: 1,
  dimension: node === undefined ? { kind: 'transcendental' } : { kind: 'transcendental', node },
  apply: (a) => f(a[0]!),
});

/**
 * The documented scalar functions, in the order help lists them. `log` is the
 * natural logarithm (physics convention) and lowers to the grammar's `ln` node.
 * @internal
 */
export const SCALAR_FUNCTIONS: Readonly<Record<string, ScalarFunction>> = {
  sqrt: { arity: 1, dimension: { kind: 'root', power: 0.5 }, apply: (a) => Math.sqrt(a[0]!) },
  cbrt: { arity: 1, dimension: { kind: 'root', power: 1 / 3 }, apply: (a) => Math.cbrt(a[0]!) },
  exp: transcendental('exp', Math.exp),
  ln: transcendental('ln', Math.log),
  log: transcendental('ln', Math.log),
  log10: transcendental('log10', Math.log10),
  log2: transcendental('log2', Math.log2),
  abs: { arity: 1, dimension: { kind: 'same' }, apply: (a) => Math.abs(a[0]!) },
  sin: transcendental('sin', Math.sin),
  cos: transcendental('cos', Math.cos),
  tan: transcendental('tan', Math.tan),
  asin: transcendental(undefined, Math.asin),
  acos: transcendental(undefined, Math.acos),
  atan: transcendental(undefined, Math.atan),
  sinh: transcendental('sinh', Math.sinh),
  cosh: transcendental('cosh', Math.cosh),
  tanh: transcendental('tanh', Math.tanh),
  pow: { arity: 2, dimension: { kind: 'power' }, apply: (a) => Math.pow(a[0]!, a[1]!) },
  atan2: { arity: 2, dimension: { kind: 'ratio' }, apply: (a) => Math.atan2(a[0]!, a[1]!) },
};

/** Names of the built-in functions this parser documents. @internal */
export const BUILTIN_FUNCTION_NAMES: readonly string[] = Object.keys(SCALAR_FUNCTIONS);

/** `${name} expects ${arity} argument(s)`, the one arity sentence. @internal */
export function arityMessage(name: string, arity: number): string {
  return `${name} expects ${arity} argument${arity === 1 ? '' : 's'}`;
}

/**
 * Function names from other conventions, each with the documented function that computes the same
 * value (audit I4). An unknown name still fails: the equivalent is only named in the message, so a
 * formula never means something its author did not write. Every `use` is in
 * {@link BUILTIN_FUNCTION_NAMES}.
 * @internal
 */
export const FUNCTION_EQUIVALENTS: Readonly<Record<string, { readonly use: string; readonly meaning: string }>> = {
  lg: { use: 'log10', meaning: 'the base-10 logarithm' },
  lb: { use: 'log2', meaning: 'the base-2 logarithm' },
  ld: { use: 'log2', meaning: 'the base-2 logarithm' },
  arcsin: { use: 'asin', meaning: 'the inverse sine' },
  arccos: { use: 'acos', meaning: 'the inverse cosine' },
  arctan: { use: 'atan', meaning: 'the inverse tangent' },
  arctg: { use: 'atan', meaning: 'the inverse tangent' },
  tg: { use: 'tan', meaning: 'the tangent' },
  fabs: { use: 'abs', meaning: 'the absolute value' },
  power: { use: 'pow', meaning: 'a power' },
  arctan2: { use: 'atan2', meaning: 'the two-argument inverse tangent' },
};

/** The documented functions as help and diagnostics list them, with the base of `log` stated. @internal */
export const BUILTIN_FUNCTION_LIST: string = BUILTIN_FUNCTION_NAMES.map((n) =>
  n === 'log' ? 'log (natural, = ln)' : n,
).join(', ');

/**
 * The diagnostic for a function this parser does not document: the documented equivalent when the
 * name is a known alias or differs only in case, then the documented list. @internal
 */
export function unknownFunctionMessage(name: string): string {
  const alias = FUNCTION_EQUIVALENTS[name];
  const lower = name.toLowerCase();
  const use =
    alias?.use ?? (lower !== name && BUILTIN_FUNCTION_NAMES.includes(lower) ? lower : FUNCTION_EQUIVALENTS[lower]?.use);
  const meaning = alias?.meaning ?? FUNCTION_EQUIVALENTS[lower]?.meaning;
  const hint =
    use === undefined
      ? ''
      : ` For ${meaning ?? `the function ${use}`} use ${use}(…), which the formula parser evaluates.`;
  return `unknown function '${name}'.${hint} Documented functions: ${BUILTIN_FUNCTION_LIST}.`;
}

/**
 * Call a documented function by name, with the table's arity check. Supplies
 * a function MathTS does not define (`ln`).
 * @internal
 */
export function callBuiltinFunction(name: string, args: readonly number[]): number {
  const fn = SCALAR_FUNCTIONS[name];
  if (fn === undefined) throw new FormulaError(unknownFunctionMessage(name));
  if (args.length !== fn.arity) throw new FormulaError(arityMessage(name, fn.arity));
  return fn.apply(args);
}
