/**
 * Formula dimensional check (MathTS Phase 2 — see
 * docs/planning/Formula-Dimensional-Check-Design-Note.md).
 *
 * Transpiles a parsed formula AST into UPT's own dimensional `ExprNode` and
 * runs `validate()`, so the CLI can report whether a user's formula is
 * dimensionally HOMOGENEOUS and what dimension it has — unifying string→AST
 * with AST→dimension.
 *
 * The MathTS AST is the only front-end. It adapts to a normalized `PNode`,
 * and the dimensional transpilation lives on that node.
 *
 * @module numerical/formula-dimension
 */

import { parse as parseMathTs } from '@danielsimonjr/mathts-functions';
import type { Dimension } from '../dimensional/types.js';
import { CHARGE, DIMENSIONLESS, ENERGY } from '../dimensional/types.js';
import { equals, format, multiply } from '../dimensional/algebra.js';
import type { ExprNode, TranscendentalFn } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import { sym } from '../dimensional/ast-builders.js';
import { EULER_NUMBER_ERROR, EulerNumberError, FormulaError } from './formula-contract.js';

/** A formula cannot be dimensionally analyzed (undeclared symbol, variable
 *  exponent, transcendental of a dimensional argument, unsupported node).
 *  @public */
export class FormulaDimensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaDimensionError';
  }
}

/** The parse tree holds a node the normalized form has no shape for (`a.b`, `[1, 2]`, `x > 2`). @internal */
export class UnsupportedSyntaxError extends FormulaDimensionError {
  constructor(readonly nodeType: string, detail: string) {
    super(detail);
    this.name = 'UnsupportedSyntaxError';
  }
}

/**
 * A sum is not homogeneous because a bare `e`, read as the elementary charge,
 * meets a dimensionless term (`1 - e^2`). @internal
 */
class ElementaryChargeMixError extends FormulaDimensionError {
  constructor(note: string) {
    super(`${ELEMENTARY_CHARGE_MIX_MESSAGE} ${note}`);
    this.name = 'ElementaryChargeMixError';
  }
}

/** Dimensionless math constants both parsers recognize. Bare `e` is not here:
 *  ISO 80000 names that symbol the elementary charge. Euler's number is `exp(x)`. */
const MATH_CONSTANTS = new Set(['pi', 'tau', 'phi', 'Infinity', 'NaN']);

/**
 * Dimension of a symbol the physics parser knows when the caller did not
 * declare one. A caller-supplied dimension still wins. `e` is the elementary
 * charge. `E` is energy. The name `euler` is not a constant.
 * @internal
 */
export function formulaSymbolDimension(name: string): Dimension | undefined {
  if (name === 'e') return CHARGE;
  if (name === 'E') return ENERGY;
  if (name === 'euler') return undefined;
  if (MATH_CONSTANTS.has(name)) return DIMENSIONLESS;
  return undefined;
}

/** Parser function names → the dimensional grammar's `transcendental` node fn
 *  (dimensionless → dimensionless). `log` is natural log (mathjs convention). */
const TRANSCENDENTAL_FN: Readonly<Record<string, TranscendentalFn>> = {
  exp: 'exp', ln: 'ln', log: 'ln', log10: 'log10', log2: 'log2',
  sin: 'sin', cos: 'cos', tan: 'tan', sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
};

/** Transcendentals WITHOUT a grammar node — kept as dimensionless stubs (still
 *  dimensionless→dimensionless, just not a faithful node). */
const TRANSCENDENTAL_STUB = new Set(['asin', 'acos', 'atan', 'sec', 'csc', 'cot']);

const op = (o: '+' | '-' | '*' | '/' | '^', args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });
const powExpr = (base: ExprNode, exp: number): ExprNode => op('^', [base, sym(String(exp), DIMENSIONLESS)]);
const transcendental = (fn: TranscendentalFn, arg: ExprNode): ExprNode => ({ kind: 'transcendental', fn, arg });
const absNode = (arg: ExprNode): ExprNode => ({ kind: 'abs', arg });

/** Dispatch a parsed function name to its `ExprNode`. Shared by both transpilers. */
function transpileFunction(fn: string, argExpr: ExprNode): ExprNode | null {
  if (fn === 'abs') return absNode(argExpr);
  if (fn in TRANSCENDENTAL_FN) return transcendental(TRANSCENDENTAL_FN[fn], argExpr);
  if (TRANSCENDENTAL_STUB.has(fn)) return transcendentalStub(fn, argExpr);
  return null;
}

/** Resolve a symbol to a dimensioned `ExprNode` (declared dim, or a
 *  dimensionless math constant, else an error). */
function resolveSymbol(name: string, dims: Readonly<Record<string, Dimension>>): ExprNode {
  if (name === 'euler' && !(name in dims)) throw new FormulaDimensionError(EULER_NUMBER_ERROR);
  if (name in dims) return sym(name, dims[name]);
  const known = formulaSymbolDimension(name);
  if (known !== undefined) return sym(name, known);
  throw new FormulaDimensionError(
    `undeclared symbol '${name}' — declare its dimension (a separate name:dimension argument, for example x:length)`,
  );
}

const CHARGE_SQUARED = multiply(CHARGE, CHARGE);

/** A bare `e`, not `exp`, `e_charge`, `eps0`, or the exponent in `1e-19`. */
function formulaHasBareE(expr: string): boolean {
  return /(?<![A-Za-z0-9_])e(?![A-Za-z0-9_])/.test(expr);
}

/**
 * `e` is the elementary charge when the caller did not give it another
 * dimension. A declared dimensionless `e` is not this case.
 */
function eIsElementaryCharge(dims: Readonly<Record<string, Dimension>>): boolean {
  return !('e' in dims) || equals(dims.e, CHARGE);
}

function dimensionIsCharge(dim: Dimension): boolean {
  return equals(dim, CHARGE) || equals(dim, CHARGE_SQUARED);
}

/**
 * What to say when a bare `e` was the elementary charge inside a sum that is
 * not homogeneous. Declaring or binding `e` keeps a different quantity.
 * Euler's number is `exp(x)`.
 * @internal
 */
export const ELEMENTARY_CHARGE_MIX_MESSAGE =
  'e is the elementary charge and is not dimensionless here. Declare it or bind a value (e=<number>) if you mean a different quantity, or write Euler\'s number as exp(x). The catalog writes the eccentricity factor as one_minus_e_sq.';

/** Inferred dimension of an `ExprNode`, or throw if not homogeneous. */
function dimensionOf(node: ExprNode): Dimension {
  const r = validate(node);
  if (!r.ok || r.inferredDimension === null) {
    throw new FormulaDimensionError(
      r.violations[0]?.note ?? 'expression is not dimensionally consistent',
    );
  }
  return r.inferredDimension;
}

/** Transcendental typed-stub: assert the argument is dimensionless, collapse
 *  to a dimensionless symbol (keeps the `ExprNode` grammar unchanged). */
function transcendentalStub(fn: string, argExprNode: ExprNode): ExprNode {
  const argDim = dimensionOf(argExprNode);
  if (!equals(argDim, DIMENSIONLESS)) {
    throw new FormulaDimensionError(
      `${fn}() requires a dimensionless argument, got ${format(argDim)}`,
    );
  }
  return sym(`${fn}(...)`, DIMENSIONLESS);
}

// --- one transpiler over a normalized parse node (Phase 2) ----------------
//
// The two front-ends (MathTS AST, built-in `FormulaAstNode`) are each adapted to
// a tiny normalized `PNode`; the dimensional transpilation (`normToExpr`) and the
// constant-exponent folding (`pnodeConstant`) then live in ONE place. `ExprNode`
// is the single semantic IR; the parse-trees are transient.

/** Structural shape of a MathTS AST node (the bits the adapter reads). */
interface MathNode {
  readonly type: string;
  readonly value?: number;
  readonly name?: string;
  readonly op?: string;
  readonly args?: MathNode[];
  readonly content?: MathNode;
  readonly fn?: { readonly name?: string };
}

/** Normalized parse node — the shape the MathTS AST adapts to. @internal */
type PNode =
  | { kind: 'num'; value: number }
  | { kind: 'sym'; name: string }
  | { kind: 'neg'; arg: PNode } // unary minus (dimension-neutral)
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; args: PNode[] }
  | { kind: 'pow'; base: PNode; exp: PNode } // exp must fold to a constant
  | { kind: 'call'; fn: string; args: PNode[] };

/** The normalized node {@link parseFormulaPNode} returns. @internal */
export type FormulaPNode = PNode;

/** Adapt a MathTS AST node to a `PNode` (pure shape map; no dimensions). */
function mathtsToPNode(node: MathNode): PNode {
  switch (node.type) {
    case 'ConstantNode':
      return { kind: 'num', value: Number(node.value) };
    case 'SymbolNode':
      return { kind: 'sym', name: node.name! };
    case 'ParenthesisNode':
      return mathtsToPNode(node.content!);
    case 'OperatorNode': {
      const args = (node.args ?? []).map(mathtsToPNode);
      if (node.op === '-' && args.length === 1) return { kind: 'neg', arg: args[0] };
      if (node.op === '^') return { kind: 'pow', base: args[0], exp: args[1] };
      if (node.op === '+' || node.op === '-' || node.op === '*' || node.op === '/') {
        return { kind: 'op', op: node.op, args };
      }
      throw new UnsupportedSyntaxError(node.type, `unsupported operator '${node.op}'`);
    }
    case 'FunctionNode':
      return { kind: 'call', fn: node.fn?.name ?? node.name ?? '', args: (node.args ?? []).map(mathtsToPNode) };
    default:
      throw new UnsupportedSyntaxError(node.type, `unsupported node '${node.type}'`);
  }
}

/** Fold a (presumed constant) `PNode` to a finite number, else throw. */
function pnodeConstant(node: PNode): number {
  const v = evalConstPNode(node);
  if (!Number.isFinite(v)) throw new FormulaDimensionError('exponent must be a finite numeric constant');
  return v;
}
function evalConstPNode(node: PNode): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'neg':
      return -evalConstPNode(node.arg);
    case 'pow':
      return Math.pow(evalConstPNode(node.base), evalConstPNode(node.exp));
    case 'op': {
      const v = node.args.map(evalConstPNode);
      switch (node.op) {
        case '+': return v.reduce((a, b) => a + b, 0);
        case '-': return v.length === 1 ? -v[0] : v.reduce((a, b) => a - b);
        case '*': return v.reduce((a, b) => a * b, 1);
        case '/': return v.reduce((a, b) => a / b);
      }
    }
    // falls through: a 'sym' or 'call' is not a numeric constant
    default:
      throw new FormulaDimensionError('exponent must be a numeric constant');
  }
}

/**
 * `base ^ exponent`. A numeric-constant exponent is the dimensional power. An
 * input-dependent exponent is built as a `^` node and the validator decides:
 * it is legal only on a dimensionless base, with a dimensionless exponent.
 */
function powOf(base: ExprNode, exponent: PNode, dims: Readonly<Record<string, Dimension>>): ExprNode {
  let constant: number | undefined;
  try {
    constant = pnodeConstant(exponent);
  } catch (error) {
    if (!(error instanceof FormulaDimensionError)) throw error;
  }
  if (constant !== undefined) return powExpr(base, constant);
  return op('^', [base, normToExpr(exponent, dims)]);
}

/** The ONE transpiler: normalized parse node → dimensional `ExprNode`. */
function normToExpr(node: PNode, dims: Readonly<Record<string, Dimension>>): ExprNode {
  switch (node.kind) {
    case 'num':
      return sym(String(node.value), DIMENSIONLESS);
    case 'sym':
      return resolveSymbol(node.name, dims);
    case 'neg':
      return normToExpr(node.arg, dims); // sign is dimension-neutral
    case 'op':
      return op(node.op, node.args.map((a) => normToExpr(a, dims)));
    case 'pow':
      return powOf(normToExpr(node.base, dims), node.exp, dims);
    case 'call': {
      const fn = node.fn;
      if (fn === 'sqrt') return powExpr(normToExpr(node.args[0], dims), 0.5);
      if (fn === 'cbrt') return powExpr(normToExpr(node.args[0], dims), 1 / 3);
      if (fn === 'pow') return powOf(normToExpr(node.args[0], dims), node.args[1], dims);
      const fnNode = transpileFunction(fn, normToExpr(node.args[0], dims));
      if (fnNode) return fnNode;
      throw new FormulaDimensionError(`unsupported function '${fn}'`);
    }
  }
}

// --- the shared checker ---------------------------------------------------

/** The result of a formula dimensional check. */
interface FormulaDimensionResult {
  /** True iff the formula is dimensionally homogeneous and well-formed. */
  readonly ok: boolean;
  /** The inferred dimension when `ok`. */
  readonly dim?: Dimension;
  /** Human-readable reason when `!ok`. */
  readonly error?: string;
  /** Set when `!ok` because a bare `e` (the elementary charge) met a dimensionless term. */
  readonly elementaryChargeMixed?: true;
}

/** A parsed physics expression: its dimensional `ExprNode` + inferred dimension. */
export interface ParsedPhysics {
  readonly expr: ExprNode;
  readonly dimension: Dimension;
}

/** A bound checker: non-throwing `check`, and throwing `parse` (the ExprNode). */
export interface FormulaDimensionChecker {
  check(expr: string, dims: Readonly<Record<string, Dimension>>): FormulaDimensionResult;
  /** Parse + transpile + validate → `{ expr, dimension }`.
   *  @throws {FormulaDimensionError} on a parse error or non-homogeneity. */
  parse(expr: string, dims: Readonly<Record<string, Dimension>>): ParsedPhysics;
}

/** Build a checker from an `(expr, dims) → ExprNode` transpile (parse +
 *  transpile, which may throw a parse error or `FormulaDimensionError`). */
function createFormulaDimensionChecker(
  toExprNode: (expr: string, dims: Readonly<Record<string, Dimension>>) => ExprNode,
): FormulaDimensionChecker {
  const parse = (expr: string, dims: Readonly<Record<string, Dimension>>): ParsedPhysics => {
    let exprNode: ExprNode;
    try {
      exprNode = toExprNode(expr, dims);
    } catch (e) {
      if (e instanceof FormulaDimensionError) throw e;
      throw new FormulaDimensionError(`parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
    const r = validate(exprNode);
    if (!r.ok || r.inferredDimension === null) {
      const note = r.violations[0]?.note ?? 'not dimensionally homogeneous';
      const chargeMixed =
        formulaHasBareE(expr) &&
        eIsElementaryCharge(dims) &&
        r.violations.some((v) => dimensionIsCharge(v.expected) || dimensionIsCharge(v.actual));
      throw chargeMixed ? new ElementaryChargeMixError(note) : new FormulaDimensionError(note);
    }
    return { expr: exprNode, dimension: r.inferredDimension };
  };
  return {
    parse,
    check(expr, dims) {
      try {
        return { ok: true, dim: parse(expr, dims).dimension };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          ...(e instanceof ElementaryChargeMixError ? { elementaryChargeMixed: true as const } : {}),
        };
      }
    },
  };
}

function parsedMathNode(expr: string): MathNode {
  try {
    return parseMathTs(expr) as unknown as MathNode;
  } catch (e) {
    throw new FormulaError(`parse error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Parse a formula to the normalized node the binding reader evaluates.
 * `euler` is refused here so a binding never becomes Math.E.
 * @internal
 */
export function parseFormulaPNode(expr: string): PNode {
  const node = mathtsToPNode(parsedMathNode(expr));
  refuseEuler(node);
  return node;
}

function refuseEuler(node: PNode): void {
  switch (node.kind) {
    case 'sym':
      if (node.name === 'euler') throw new EulerNumberError();
      return;
    case 'neg':
      refuseEuler(node.arg);
      return;
    case 'op':
      for (const a of node.args) refuseEuler(a);
      return;
    case 'pow':
      refuseEuler(node.base);
      refuseEuler(node.exp);
      return;
    case 'call':
      if (node.fn === 'euler') throw new EulerNumberError();
      for (const a of node.args) refuseEuler(a);
      return;
    case 'num':
      return;
  }
}

/** The dimensional checker over the MathTS AST. The historical name stays. */
export function builtinFormulaDimensionChecker(): FormulaDimensionChecker {
  return createFormulaDimensionChecker((expr, dims) => normToExpr(mathtsToPNode(parsedMathNode(expr)), dims));
}
