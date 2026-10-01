/**
 * Self-contained scalar-formula parser/evaluator (Path B).
 *
 * A small, dependency-free recursive-descent parser for closed-form
 * scalar physics expressions — `hbar*c^3/(8*pi*G*M*k_B)` and the like —
 * so non-TypeScript users can supply their OWN equation to the CLI
 * without UPT shipping a code evaluator. It is SAFE: there is no `eval`,
 * no function constructor, no property access — only arithmetic over
 * numbers, a fixed whitelist of math functions, and the variables the
 * caller explicitly supplies. An unknown symbol is an error, never an
 * implicit global.
 *
 * It sits behind the {@link FormulaParser} interface so a MathTS-backed
 * parser (Path A) can be dropped in later by implementing the same
 * contract — the inference/CLI code depends only on the interface.
 *
 * Grammar (standard precedence; `^` is right-associative; unary minus
 * binds looser than `^`, so `-2^2 = -4` and `2^-2` parses):
 *   expr  → term (('+'|'-') term)*
 *   term  → unary (('*'|'/') unary)*
 *   unary → ('+'|'-') unary | power
 *   power → atom ('^' unary)?
 *   atom  → NUMBER | NAME | NAME '(' args ')' | '(' expr ')'
 *
 * @module numerical/formula
 */

import { E_SI } from '../core/constants.js';

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

/** The swap point for Path A (a MathTS-backed parser implements this). */
export interface FormulaParser {
  parse(expr: string): CompiledFormula;
}

// --- built-ins ------------------------------------------------------------

/**
 * Baked numeric constants. `e` is the elementary charge (CODATA / ISO 80000),
 * not Euler's number. Euler's number is `euler` or `exp(1)`. `pi` and `tau`
 * ignore a scope value. `e` and `euler` do not: an explicit `name=` replaces
 * the baked value, the same way a filled CODATA name does.
 */
const CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  tau: 2 * Math.PI,
  e: E_SI,
  euler: Math.E,
};

/** Scope replaces the baked value for these names only. */
const SCOPE_WINS: ReadonlySet<string> = new Set(['e', 'euler']);

type Fn = (args: number[]) => number;
const arity1 = (f: (x: number) => number): Fn => (a) => {
  if (a.length !== 1) throw new FormulaError('expected 1 argument');
  return f(a[0]);
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
    return Math.pow(a[0], a[1]);
  },
  atan2: (a) => {
    if (a.length !== 2) throw new FormulaError('atan2 expects 2 arguments');
    return Math.atan2(a[0], a[1]);
  },
};

/** Names of the built-in functions this parser documents. @internal */
export const BUILTIN_FUNCTION_NAMES: readonly string[] = Object.keys(FUNCTIONS);

/**
 * Function names from other conventions, each with the documented function that computes the same
 * value (audit I4). An unknown name still fails: the equivalent is only named in the message, so a
 * formula never means something its author did not write. Every `use` is in
 * {@link BUILTIN_FUNCTION_NAMES}, and the conformance suite checks each against the value the
 * foreign name means, under both parsers.
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
 * The diagnostic for a function neither parser documents: the documented equivalent when the name
 * is a known alias or differs only in case, then the documented list. @internal
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
      : ` For ${meaning ?? `the function ${use}`} use ${use}(…), which both formula parsers evaluate.`;
  return `unknown function '${name}'.${hint} Documented functions: ${BUILTIN_FUNCTION_LIST}.`;
}

/**
 * Call a built-in function by name, with this parser's arity checks. Lets
 * another parser supply a documented function it does not define itself.
 * @internal
 */
export function callBuiltinFunction(name: string, args: number[]): number {
  const fn = FUNCTIONS[name];
  if (fn === undefined) throw new FormulaError(unknownFunctionMessage(name));
  return fn(args);
}

// --- AST ------------------------------------------------------------------

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'sym'; name: string }
  | { kind: 'unary'; op: '+' | '-'; arg: Node }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node }
  | { kind: 'call'; fn: string; args: Node[] };

// --- tokenizer ------------------------------------------------------------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string };

const NUM_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/;

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let s = src;
  while (s.length) {
    const ch = s[0];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      s = s.slice(1);
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      toks.push({ t: 'op', v: ch });
      s = s.slice(1);
      continue;
    }
    const num = NUM_RE.exec(s);
    if (num) {
      toks.push({ t: 'num', v: Number(num[0]) });
      s = s.slice(num[0].length);
      continue;
    }
    const name = NAME_RE.exec(s);
    if (name) {
      toks.push({ t: 'name', v: name[0] });
      s = s.slice(name[0].length);
      continue;
    }
    throw new FormulaError(`unexpected character '${ch}' in formula`);
  }
  return toks;
}

// --- parser (recursive descent) ------------------------------------------

function parseToAst(src: string): Node {
  const toks = tokenize(src);
  let i = 0;
  const peek = (): Tok | undefined => toks[i];
  const eat = (v?: string): Tok => {
    const tk = toks[i];
    if (!tk) throw new FormulaError('unexpected end of formula');
    if (v !== undefined && !(tk.t === 'op' && tk.v === v)) {
      throw new FormulaError(`expected '${v}'`);
    }
    i++;
    return tk;
  };
  const isOp = (v: string): boolean => {
    const tk = peek();
    return !!tk && tk.t === 'op' && tk.v === v;
  };

  function expr(): Node {
    let node = term();
    while (isOp('+') || isOp('-')) {
      const op = (eat() as { v: '+' | '-' }).v;
      node = { kind: 'bin', op, left: node, right: term() };
    }
    return node;
  }
  function term(): Node {
    let node = unary();
    while (isOp('*') || isOp('/')) {
      const op = (eat() as { v: '*' | '/' }).v;
      node = { kind: 'bin', op, left: node, right: unary() };
    }
    return node;
  }
  function unary(): Node {
    if (isOp('+') || isOp('-')) {
      const op = (eat() as { v: '+' | '-' }).v;
      return { kind: 'unary', op, arg: unary() };
    }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (isOp('^')) {
      eat('^');
      return { kind: 'bin', op: '^', left: base, right: unary() };
    }
    return base;
  }
  function atom(): Node {
    const tk = peek();
    if (!tk) throw new FormulaError('unexpected end of formula');
    if (tk.t === 'num') {
      eat();
      return { kind: 'num', value: tk.v };
    }
    if (tk.t === 'name') {
      eat();
      if (isOp('(')) {
        eat('(');
        const args: Node[] = [];
        if (!isOp(')')) {
          args.push(expr());
          while (isOp(',')) {
            eat(',');
            args.push(expr());
          }
        }
        eat(')');
        return { kind: 'call', fn: tk.v, args };
      }
      return { kind: 'sym', name: tk.v };
    }
    if (tk.t === 'op' && tk.v === '(') {
      eat('(');
      const node = expr();
      eat(')');
      return node;
    }
    throw new FormulaError(`unexpected token '${(tk as { v: unknown }).v}'`);
  }

  const node = expr();
  if (i !== toks.length) {
    throw new FormulaError(`unexpected trailing input in formula`);
  }
  return node;
}

function collectSymbols(node: Node, out: Set<string>): void {
  switch (node.kind) {
    case 'num':
      return;
    case 'sym':
      if (!(node.name in CONSTANTS)) out.add(node.name);
      return;
    case 'unary':
      collectSymbols(node.arg, out);
      return;
    case 'bin':
      collectSymbols(node.left, out);
      collectSymbols(node.right, out);
      return;
    case 'call':
      for (const a of node.args) collectSymbols(a, out);
      return;
  }
}

function evalNode(node: Node, scope: Record<string, number>): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'sym': {
      const baked = CONSTANTS[node.name];
      const fromScope = scope[node.name];
      if (baked !== undefined && !(SCOPE_WINS.has(node.name) && fromScope !== undefined)) return baked;
      if (fromScope === undefined) throw new FormulaError(`unknown variable '${node.name}'`);
      return fromScope;
    }
    case 'unary': {
      const a = evalNode(node.arg, scope);
      return node.op === '-' ? -a : a;
    }
    case 'bin': {
      const l = evalNode(node.left, scope);
      const r = evalNode(node.right, scope);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case 'call': {
      const fn = FUNCTIONS[node.fn];
      if (!fn) throw new FormulaError(unknownFunctionMessage(node.fn));
      return fn(node.args.map((a) => evalNode(a, scope)));
    }
  }
}

/** The self-contained Path B parser. @internal */
export const defaultFormulaParser: FormulaParser = {
  parse(expr: string): CompiledFormula {
    if (!expr || !expr.trim()) throw new FormulaError('empty formula');
    const ast = parseToAst(expr);
    const syms = new Set<string>();
    collectSymbols(ast, syms);
    const variables = [...syms].sort();
    return {
      source: expr,
      variables,
      evaluate: (scope) => {
        const v = evalNode(ast, scope);
        if (!Number.isFinite(v)) {
          throw new FormulaError(
            `formula '${expr}' evaluated to a non-finite value (${v}).`,
          );
        }
        return v;
      },
    };
  },
};

/** Parse a scalar formula with the default (self-contained) parser. @internal */
export function parseFormula(expr: string): CompiledFormula {
  return defaultFormulaParser.parse(expr);
}

// --- AST access for the dimensional checker (Phase 2) ---------------------
// The Path B parser keeps its AST internal (CompiledFormula is opaque to
// external users); these exports let the in-tree dimensional checker
// transpile the same AST to UPT's `ExprNode`, so the check works WITHOUT
// the MathTS peer. @internal

/** The Path B formula AST node. @internal */
export type FormulaAstNode = Node;
/** Parse a formula to its Path B AST. @internal */
export const parseFormulaToAst: (expr: string) => FormulaAstNode = parseToAst;

