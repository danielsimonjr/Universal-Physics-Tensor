/**
 * Formula dimensional check (MathTS Phase 2 — see
 * docs/planning/Formula-Dimensional-Check-Design-Note.md).
 *
 * Transpiles a parsed formula AST into UPT's own dimensional `ExprNode` and
 * runs `validate()`, so the CLI can report whether a user's formula is
 * dimensionally HOMOGENEOUS and what dimension it has — unifying string→AST
 * with AST→dimension.
 *
 * Works with BOTH parsers: the MathTS AST (Path A) and the self-contained
 * Path B AST. Each has its own small transpiler over a shared core
 * (`createFormulaDimensionChecker` + the dimensional helpers), so the check
 * is available WITHOUT the MathTS peer (`builtinFormulaDimensionChecker`).
 *
 * @module numerical/formula-dimension
 */

import type { Dimension } from '../dimensional/types.js';
import { CHARGE, DIMENSIONLESS, ENERGY } from '../dimensional/types.js';
import { equals, format } from '../dimensional/algebra.js';
import type { ExprNode, TranscendentalFn } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import { sym } from '../dimensional/ast-builders.js';
import type { FormulaAstNode } from './formula.js';
import { parseFormulaToAst } from './formula.js';

/** A formula cannot be dimensionally analyzed (undeclared symbol, variable
 *  exponent, transcendental of a dimensional argument, unsupported node).
 *  @public */
export class FormulaDimensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaDimensionError';
  }
}

/** Dimensionless math constants both parsers recognize. Bare `e` is not here:
 *  ISO 80000 names that symbol the elementary charge. Euler's number is `euler`. */
const MATH_CONSTANTS = new Set(['pi', 'tau', 'euler', 'phi', 'Infinity', 'NaN']);

/**
 * Dimension of a symbol the physics parser knows when the caller did not
 * declare one. A caller-supplied dimension still wins. `e` is the elementary
 * charge. `E` is energy. `euler` is Euler's number.
 * @internal
 */
export function formulaSymbolDimension(name: string): Dimension | undefined {
  if (name === 'e') return CHARGE;
  if (name === 'E') return ENERGY;
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
  if (name in dims) return sym(name, dims[name]);
  const known = formulaSymbolDimension(name);
  if (known !== undefined) return sym(name, known);
  throw new FormulaDimensionError(
    `undeclared symbol '${name}' — declare its dimension (a separate name:dimension argument, for example x:length)`,
  );
}

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

/** Normalized parse node — the common shape both front-ends adapt to. */
type PNode =
  | { kind: 'num'; value: number }
  | { kind: 'sym'; name: string }
  | { kind: 'neg'; arg: PNode } // unary minus (dimension-neutral)
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; args: PNode[] }
  | { kind: 'pow'; base: PNode; exp: PNode } // exp must fold to a constant
  | { kind: 'call'; fn: string; args: PNode[] };

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
      throw new FormulaDimensionError(`unsupported operator '${node.op}'`);
    }
    case 'FunctionNode':
      return { kind: 'call', fn: node.fn?.name ?? node.name ?? '', args: (node.args ?? []).map(mathtsToPNode) };
    default:
      throw new FormulaDimensionError(`unsupported node '${node.type}'`);
  }
}

/** Adapt a built-in `FormulaAstNode` to a `PNode` (pure shape map). */
function pathBToPNode(node: FormulaAstNode): PNode {
  switch (node.kind) {
    case 'num':
      return { kind: 'num', value: node.value };
    case 'sym':
      return { kind: 'sym', name: node.name };
    case 'unary':
      return node.op === '-'
        ? { kind: 'neg', arg: pathBToPNode(node.arg) }
        : pathBToPNode(node.arg); // unary '+' is identity
    case 'bin':
      return node.op === '^'
        ? { kind: 'pow', base: pathBToPNode(node.left), exp: pathBToPNode(node.right) }
        : { kind: 'op', op: node.op, args: [pathBToPNode(node.left), pathBToPNode(node.right)] };
    case 'call':
      return { kind: 'call', fn: node.fn, args: node.args.map(pathBToPNode) };
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
      return powExpr(normToExpr(node.base, dims), pnodeConstant(node.exp));
    case 'call': {
      const fn = node.fn;
      if (fn === 'sqrt') return powExpr(normToExpr(node.args[0], dims), 0.5);
      if (fn === 'cbrt') return powExpr(normToExpr(node.args[0], dims), 1 / 3);
      if (fn === 'pow') return powExpr(normToExpr(node.args[0], dims), pnodeConstant(node.args[1]));
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
      throw new FormulaDimensionError(r.violations[0]?.note ?? 'not dimensionally homogeneous');
    }
    return { expr: exprNode, dimension: r.inferredDimension };
  };
  return {
    parse,
    check(expr, dims) {
      try {
        return { ok: true, dim: parse(expr, dims).dimension };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  };
}

/** The built-in (Path B) dimensional checker — always available, no peer. */
export function builtinFormulaDimensionChecker(): FormulaDimensionChecker {
  return createFormulaDimensionChecker((expr, dims) => normToExpr(pathBToPNode(parseFormulaToAst(expr)), dims));
}

interface MathtsFunctionsModule {
  parse(expr: string): MathNode;
}

/**
 * Dynamically load the optional MathTS peer and build a dimensional checker
 * over its AST. Throws if the peer is absent — the registry catches and
 * falls back to {@link builtinFormulaDimensionChecker}.
 */
export async function loadFormulaDimensionChecker(): Promise<FormulaDimensionChecker> {
  const mod = (await import(
    '@danielsimonjr/mathts-functions'
  )) as unknown as MathtsFunctionsModule;
  if (typeof mod.parse !== 'function') {
    throw new FormulaDimensionError('mathts-functions: no parse() export');
  }
  return createFormulaDimensionChecker((expr, dims) => normToExpr(mathtsToPNode(mod.parse(expr)), dims));
}
