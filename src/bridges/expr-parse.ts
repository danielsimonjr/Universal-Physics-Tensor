/**
 * One expression parser for a catalog formula: MathTS.
 *
 * Numeric evaluation is MathTS `parseFormula` on the hyphen-rewritten string,
 * and the dimensional `ExprNode` is built from the MathTS parse tree of the
 * same string, so the number and the tree can never disagree on precedence.
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
import { parseFormulaPNode, type FormulaPNode } from '../numerical/formula-dimension.js';

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

/**
 * The free variables of a catalog expression, read from the same MathTS parse
 * {@link evaluateFormula} evaluates: the scope names it reads, a hyphenated
 * quantity written with underscores.
 */
export function formulaVariables(expression: string): readonly string[] {
  return parseFormula(rewriteCatalogHyphens(expression, formulaNames())).variables;
}

/** Evaluate a catalog expression with MathTS. Inputs are quantity names. */
export function evaluateFormula(
  expression: string,
  inputs: Readonly<Record<string, number>>,
): number {
  const rewritten = rewriteCatalogHyphens(expression, formulaNames());
  return parseFormula(rewritten).evaluate(formulaScope(inputs));
}

/**
 * The sign-preserving `ExprNode` of a normalized MathTS parse node. Unary minus
 * is `-1 ×`, `sqrt` is `^0.5`, and a transcendental keeps its name; a quantity
 * name written with underscores is restored to its hyphenated id.
 */
function exprOf(node: FormulaPNode): ExprNode {
  switch (node.kind) {
    case 'num':
      return numberSymbol(String(node.value));
    case 'sym':
      return symbol(hyphenName(node.name));
    case 'neg':
      return { kind: 'op', op: '*', args: [numberSymbol('-1'), exprOf(node.arg)] };
    case 'op':
      return { kind: 'op', op: node.op, args: node.args.map(exprOf) };
    case 'pow':
      return { kind: 'op', op: '^', args: [exprOf(node.base), exprOf(node.exp)] };
    case 'call': {
      const arg = exprOf(node.args[0]!);
      if (node.fn === 'sqrt') return { kind: 'op', op: '^', args: [arg, numberSymbol('0.5')] };
      if (node.fn === 'abs') return { kind: 'abs', arg };
      if (TRANSCENDENTAL.has(node.fn as TranscendentalFn)) return { kind: 'transcendental', fn: node.fn as TranscendentalFn, arg };
      throw new Error(`expression calls an unknown function '${node.fn}'`);
    }
  }
}

function hyphenName(underscored: string): string {
  const hyphen = underscored.replace(/_/g, '-');
  if (quantityNames.has(hyphen)) return hyphen;
  return underscored;
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

/** Parse a catalog expression into a sign-preserving `ExprNode`, through the one MathTS parser. */
export function parseCatalogExpression(expression: string): ExprNode {
  const rewritten = rewriteCatalogHyphens(expression, formulaNames());
  return foldKnownConstants(exprOf(parseFormulaPNode(rewritten)));
}
