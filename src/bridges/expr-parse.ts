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

import { DIMENSIONLESS, type Dimension } from '../dimensional/types.js';
import type { ExprNode, TranscendentalFn } from '../dimensional/ast-types.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import { FORMULA_NAMED } from '../dimensional/formula-names.js';
import { rewriteCatalogHyphens } from '../dimensional/hyphen-names.js';
import { allQuantityRecords } from '../dimensional/quantity-registry.js';
import { parseFormula } from '../numerical/formula-mathts.js';
import { parseFormulaPNode, type FormulaPNode } from '../numerical/formula-dimension.js';
import { ConstantInputError } from './evaluation-errors.js';

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

const RESERVED = new Set<string>(['pi', ...Object.keys(CONSTANTS), ...FORMULA_NAMED.map((named) => named.name)]);

/** π, the registered constants and the formula overlays: names a caller may not bind. */
export function reservedFormulaNames(): ReadonlySet<string> {
  return RESERVED;
}

const underscored = (name: string): string => name.replace(/-/g, '_');

/**
 * Numeric scope: constants, formula overlays, and π, then the caller's inputs.
 * An input whose name is reserved is refused with {@link ConstantInputError}
 * unless `declared` names it: a relation's own source may carry a constant's
 * name as a default the caller overrides (be-63's Lane-Emden ω₃).
 * {@link evaluateFormula} first drops a reserved key its expression does not
 * read; this builder refuses every undeclared one.
 */
export function formulaScope(
  inputs: Readonly<Record<string, number>> = {},
  declared: readonly string[] = [],
): Record<string, number> {
  const scope: Record<string, number> = { pi: Math.PI };
  for (const [name, constant] of Object.entries(CONSTANTS)) scope[name] = constant.value;
  for (const named of FORMULA_NAMED) scope[named.name] = named.value;
  const allowed = new Set(declared.map(underscored));
  for (const [key, value] of Object.entries(inputs)) {
    const name = underscored(key);
    if (RESERVED.has(name) && !allowed.has(name)) throw new ConstantInputError(key);
    scope[name] = value;
  }
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

const VARIABLES = new Map<string, ReadonlySet<string>>();

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;

/** The names an expression mentions (π included, which MathTS does not list as a variable), cached per expression text. */
function readNames(expression: string): ReadonlySet<string> {
  let names = VARIABLES.get(expression);
  if (names === undefined) {
    names = new Set(rewriteCatalogHyphens(expression, formulaNames()).match(IDENTIFIER) ?? []);
    VARIABLES.set(expression, names);
  }
  return names;
}

/**
 * `inputs` without the reserved keys that `reads` does not name. A reserved
 * key the formula reads and `declared` does not name is refused: the caller's
 * number would replace the constant. One the formula does not read is not an
 * input of this formula; it is dropped, as any other extra key is on the
 * graph path (a composed edge forwards every input to each component).
 */
export function withoutUnreadConstants(
  inputs: Readonly<Record<string, number>>,
  reads: ReadonlySet<string>,
  declared: readonly string[],
): Record<string, number> {
  const allowed = new Set(declared.map(underscored));
  const kept: Record<string, number> = {};
  for (const [key, value] of Object.entries(inputs)) {
    const name = underscored(key);
    if (RESERVED.has(name) && !allowed.has(name)) {
      if (reads.has(name)) throw new ConstantInputError(key);
      continue;
    }
    kept[key] = value;
  }
  return kept;
}

/**
 * Evaluate a catalog expression with MathTS. Inputs are quantity names.
 * `declared` are the names the caller may bind although they are reserved
 * (the relation's sources); a reserved key the expression reads and
 * `declared` does not name is a {@link ConstantInputError}, and one it does
 * not read is dropped ({@link withoutUnreadConstants}).
 */
export function evaluateFormula(
  expression: string,
  inputs: Readonly<Record<string, number>>,
  declared: readonly string[] = [],
): number {
  // One grammar: the expression must also build a dimensional tree, so a function the tree
  // does not know (`max`) or a call of the wrong arity is refused here too.
  if (!GRAMMAR_CHECKED.has(expression)) {
    parseCatalogExpression(expression);
    GRAMMAR_CHECKED.add(expression);
  }
  const rewritten = rewriteCatalogHyphens(expression, formulaNames());
  const scope = formulaScope(withoutUnreadConstants(inputs, readNames(expression), declared), declared);
  return parseFormula(rewritten).evaluate(scope);
}

const GRAMMAR_CHECKED = new Set<string>();

/** A literal exponent: a number, or a ratio of two numbers (`1/3`), folded to one literal. */
function literalExponent(node: FormulaPNode): ExprNode | undefined {
  if (node.kind === 'num') return numberSymbol(String(node.value));
  if (node.kind === 'op' && node.op === '/' && node.args.length === 2) {
    const [p, q] = node.args;
    if (p!.kind === 'num' && q!.kind === 'num' && q!.value !== 0) return numberSymbol(String(p!.value / q!.value));
  }
  return undefined;
}

/**
 * The sign-preserving `ExprNode` of a normalized MathTS parse node. Unary minus
 * is `-1 ×`, `sqrt` is `^0.5`, a literal ratio exponent (`^(1/3)`) is one
 * literal, and a transcendental keeps its name; a quantity name written with
 * underscores is restored to its hyphenated id. A call takes exactly one
 * argument: a second one is refused, never dropped.
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
      return { kind: 'op', op: '^', args: [exprOf(node.base), literalExponent(node.exp) ?? exprOf(node.exp)] };
    case 'call': {
      if (node.args.length !== 1) throw new Error(`expression calls '${node.fn}' with ${node.args.length} arguments; one is expected`);
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
