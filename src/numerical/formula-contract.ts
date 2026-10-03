/**
 * Scalar-formula contract shared by the MathTS parser.
 *
 * Path B, the recursive-descent parser that used to live in `formula.ts`, is
 * gone. These types and the documented function table stay: the MathTS
 * adapter still returns a `number`, still refuses `euler`, and still supplies
 * `ln` when MathTS does not define it.
 *
 * @module numerical/formula-contract
 */

/** A parse or evaluation failure (bad syntax, unknown symbol, arity). */
export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
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

type Fn = (args: number[]) => number;
const arity1 = (f: (x: number) => number): Fn => (a) => {
  if (a.length !== 1) throw new FormulaError('expected 1 argument');
  return f(a[0]!);
};
const FUNCTIONS: Readonly<Record<string, Fn>> = {
  sqrt: arity1(Math.sqrt),
  cbrt: arity1(Math.cbrt),
  exp: arity1(Math.exp),
  ln: arity1(Math.log),
  log: arity1(Math.log), // natural log (physics convention)
  log10: arity1(Math.log10),
  log2: arity1(Math.log2),
  abs: arity1(Math.abs),
  sin: arity1(Math.sin),
  cos: arity1(Math.cos),
  tan: arity1(Math.tan),
  asin: arity1(Math.asin),
  acos: arity1(Math.acos),
  atan: arity1(Math.atan),
  sinh: arity1(Math.sinh),
  cosh: arity1(Math.cosh),
  tanh: arity1(Math.tanh),
  pow: (a) => {
    if (a.length !== 2) throw new FormulaError('pow expects 2 arguments');
    return Math.pow(a[0]!, a[1]!);
  },
  atan2: (a) => {
    if (a.length !== 2) throw new FormulaError('atan2 expects 2 arguments');
    return Math.atan2(a[0]!, a[1]!);
  },
};

/** Names of the built-in functions this parser documents. @internal */
export const BUILTIN_FUNCTION_NAMES: readonly string[] = Object.keys(FUNCTIONS);

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
 * Call a documented function by name, with this parser's arity checks. Supplies
 * a function MathTS does not define (`ln`).
 * @internal
 */
export function callBuiltinFunction(name: string, args: number[]): number {
  const fn = FUNCTIONS[name];
  if (fn === undefined) throw new FormulaError(unknownFunctionMessage(name));
  return fn(args);
}
