/**
 * One expression parser for a catalog formula.
 *
 * Numeric evaluation is MathTS `parseFormula` on the hyphen-rewritten string.
 * The `ExprNode` keeps hyphenated quantity names and unary minus, so symbolic
 * composition and dimensional checks see the same formula.
 *
 * @module bridges/expr-parse
 */

import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import type { ExprNode, TranscendentalFn } from '../dimensional/ast-types.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import { FORMULA_NAMED } from '../dimensional/formula-names.js';
import { rewriteCatalogHyphens } from '../dimensional/hyphen-names.js';
import { allQuantityRecords } from '../dimensional/quantity-registry.js';
import { parseFormula } from '../numerical/formula-mathts.js';

const TRANSCENDENTAL = new Set<TranscendentalFn>([
  'exp', 'ln', 'log2', 'log10', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh',
]);

const quantityNames = new Set(allQuantityRecords().map((row) => row.id));

const DIM_BY_NAME = new Map<string, Dimension>();
for (const row of allQuantityRecords()) DIM_BY_NAME.set(row.id, row.dimension);
for (const [name, constant] of Object.entries(CONSTANTS)) DIM_BY_NAME.set(name, constant.dim);
for (const named of FORMULA_NAMED) DIM_BY_NAME.set(named.name, named.dim);

function dimOf(name: string): Dimension {
  return DIM_BY_NAME.get(name) ?? DIMENSIONLESS;
}

function symbol(name: string): ExprNode {
  return { kind: 'symbol', name, dim: dimOf(name) };
}

function numberSymbol(text: string): ExprNode {
  return { kind: 'symbol', name: text, dim: DIMENSIONLESS };
}

/** Names a formula may mention: quantities, constants, and formula overlays. */
export function formulaNames(): ReadonlySet<string> {
  const names = new Set<string>(quantityNames);
  for (const name of Object.keys(CONSTANTS)) names.add(name);
  for (const named of FORMULA_NAMED) names.add(named.name);
  names.add('pi');
  return names;
}

/** Numeric scope: constants, formula overlays, and π. Caller inputs overwrite. */
export function formulaScope(inputs: Readonly<Record<string, number>> = {}): Record<string, number> {
  const scope: Record<string, number> = { pi: Math.PI };
  for (const [name, constant] of Object.entries(CONSTANTS)) scope[name] = constant.value;
  for (const named of FORMULA_NAMED) scope[named.name] = named.value;
  for (const [key, value] of Object.entries(inputs)) scope[key.replace(/-/g, '_')] = value;
  return scope;
}

/** Evaluate a catalog expression with MathTS. Inputs are quantity names. */
export function evaluateFormula(
  expression: string,
  inputs: Readonly<Record<string, number>>,
): number {
  const rewritten = rewriteCatalogHyphens(expression, formulaNames());
  return parseFormula(rewritten).evaluate(formulaScope(inputs));
}

type Tok =
  | { kind: 'num'; text: string }
  | { kind: 'id'; text: string }
  | { kind: 'op'; op: string }
  | { kind: 'lp' }
  | { kind: 'rp' };

function tokenize(source: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
      i += 1;
      continue;
    }
    if (c === '(') {
      out.push({ kind: 'lp' });
      i += 1;
      continue;
    }
    if (c === ')') {
      out.push({ kind: 'rp' });
      i += 1;
      continue;
    }
    const op = source.startsWith('^', i)
      ? '^'
      : source.startsWith('+', i) || source.startsWith('-', i) || source.startsWith('*', i) || source.startsWith('/', i)
        ? source[i]!
        : null;
    if (op !== null && !(op === '-' && /[eE]/.test(source[i - 1] ?? '') && /\d/.test(source[i - 2] ?? ''))) {
      out.push({ kind: 'op', op });
      i += 1;
      continue;
    }
    const num = /^(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i));
    if (num !== null) {
      out.push({ kind: 'num', text: num[0] });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
    if (id !== null) {
      out.push({ kind: 'id', text: id[0] });
      i += id[0].length;
      continue;
    }
    throw new Error(`expression has an unexpected '${c}'`);
  }
  return out;
}

class Parser {
  private at = 0;
  constructor(private readonly tokens: readonly Tok[]) {}

  parse(): ExprNode {
    const node = this.parseSum();
    if (this.at < this.tokens.length) throw new Error('expression has trailing input');
    return node;
  }

  private peek(): Tok | undefined {
    return this.tokens[this.at];
  }

  private parseSum(): ExprNode {
    let left = this.parseProduct();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind !== 'op' || (tok.op !== '+' && tok.op !== '-')) break;
      this.at += 1;
      const right = this.parseProduct();
      left = { kind: 'op', op: tok.op, args: [left, right] };
    }
    return left;
  }

  private parseProduct(): ExprNode {
    let left = this.parsePower();
    for (;;) {
      const tok = this.peek();
      if (tok?.kind === 'num' || tok?.kind === 'id' || tok?.kind === 'lp') {
        left = { kind: 'op', op: '*', args: [left, this.parsePower()] };
        continue;
      }
      if (tok?.kind !== 'op' || (tok.op !== '*' && tok.op !== '/')) break;
      this.at += 1;
      const right = this.parsePower();
      left = { kind: 'op', op: tok.op, args: [left, right] };
    }
    return left;
  }

  private parsePower(): ExprNode {
    const base = this.parseUnary();
    const tok = this.peek();
    if (tok?.kind === 'op' && tok.op === '^') {
      this.at += 1;
      return { kind: 'op', op: '^', args: [base, this.parsePower()] };
    }
    return base;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok?.kind === 'op' && tok.op === '-') {
      this.at += 1;
      return { kind: 'op', op: '*', args: [numberSymbol('-1'), this.parseUnary()] };
    }
    if (tok?.kind === 'op' && tok.op === '+') {
      this.at += 1;
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();
    if (tok === undefined) throw new Error('expression ended early');
    if (tok.kind === 'num') {
      this.at += 1;
      return numberSymbol(tok.text);
    }
    if (tok.kind === 'id') {
      this.at += 1;
      const next = this.peek();
      if (next?.kind === 'lp' && (TRANSCENDENTAL.has(tok.text as TranscendentalFn) || tok.text === 'sqrt' || tok.text === 'abs')) {
        this.at += 1;
        const arg = this.parseSum();
        const close = this.peek();
        if (close?.kind !== 'rp') throw new Error(`expression expected ')' after ${tok.text}`);
        this.at += 1;
        if (tok.text === 'sqrt') return { kind: 'op', op: '^', args: [arg, numberSymbol('0.5')] };
        if (tok.text === 'abs') return { kind: 'abs', arg };
        return { kind: 'transcendental', fn: tok.text as TranscendentalFn, arg };
      }
      return symbol(this.hyphenName(tok.text));
    }
    if (tok.kind === 'lp') {
      this.at += 1;
      const inner = this.parseSum();
      const close = this.peek();
      if (close?.kind !== 'rp') throw new Error("expression expected ')'");
      this.at += 1;
      return inner;
    }
    throw new Error('expression expected a value');
  }

  private hyphenName(underscored: string): string {
    const hyphen = underscored.replace(/_/g, '-');
    if (quantityNames.has(hyphen)) return hyphen;
    return underscored;
  }
}

/**
 * `8*pi` is the constant `8pi`, and `ln(2)` is the constant `ln2`. A product
 * flattens so the tree matches a flat canonical product of the same factors.
 */
function foldKnownConstants(node: ExprNode): ExprNode {
  if (node.kind === 'transcendental') {
    const arg = foldKnownConstants(node.arg);
    if (node.fn === 'ln' && arg.kind === 'symbol' && arg.name === '2') return symbol('ln2');
    return { kind: 'transcendental', fn: node.fn, arg };
  }
  if (node.kind === 'abs') return { kind: 'abs', arg: foldKnownConstants(node.arg) };
  if (node.kind !== 'op') return node;
  const args = node.args.map(foldKnownConstants);
  if (node.op !== '*') return { kind: 'op', op: node.op, args };
  const factors: ExprNode[] = [];
  const push = (factor: ExprNode): void => {
    if (factor.kind === 'op' && factor.op === '*') {
      for (const inner of factor.args) push(inner);
    } else {
      factors.push(factor);
    }
  };
  for (const arg of args) push(arg);
  const merged: ExprNode[] = [];
  for (let i = 0; i < factors.length; i++) {
    const left = factors[i]!;
    const right = factors[i + 1];
    if (
      right?.kind === 'symbol' &&
      right.name === 'pi' &&
      left.kind === 'symbol' &&
      /^(?:2|4|8)$/.test(left.name) &&
      `${left.name}pi` in CONSTANTS
    ) {
      merged.push(symbol(`${left.name}pi`));
      i += 1;
      continue;
    }
    merged.push(left);
  }
  if (merged.length === 1) return merged[0]!;
  return { kind: 'op', op: '*', args: merged };
}

/** Parse a catalog expression into a sign-preserving `ExprNode`. */
export function parseCatalogExpression(expression: string): ExprNode {
  const rewritten = rewriteCatalogHyphens(expression, formulaNames());
  return foldKnownConstants(new Parser(tokenize(rewritten)).parse());
}
