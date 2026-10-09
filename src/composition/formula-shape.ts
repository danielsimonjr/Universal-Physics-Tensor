/**
 * Whether an encoded formula is a product of powers, or a sum of dimensionful terms.
 *
 * Buckingham-π returns a monomial. A formula that adds dimensionful terms is
 * not that monomial, even when a unique monomial exists in the same variables
 * (fast magnetosonic speed: the monomial is the sound speed; the formula is
 * √(c_s² + v_A²)). A sum whose every addend is dimensionless is still a
 * factor in a monomial: (1+R), (1−e²), (1 + E/(kT)).
 *
 * @module composition/formula-shape
 */

import type { ExprNode } from '../dimensional/ast-types.js';
import { divide, equals, multiply, power } from '../dimensional/algebra.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';

/** `monomial` is a product of powers. `dimensional-sum` adds dimensionful terms. */
type FormulaShape = 'monomial' | 'dimensional-sum';

const NUMERIC_NAME = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

/**
 * Exponents of every symbol in a product, quotient, or literal integer power.
 * Undefined for a sum or any node that is not that monomial. The one reader
 * of a monomial's exponents: the canonical graph reads a count's exponent
 * from it, and a composed edge reads the junction's exponent from it.
 *
 * @internal
 */
export function monomialExponents(node: ExprNode | undefined): Map<string, number> | undefined {
  if (node === undefined) return undefined;
  if (node.kind === 'symbol') return new Map([[node.name, 1]]);
  if (node.kind !== 'op') return undefined;
  if (node.op === '*') {
    const acc = new Map<string, number>();
    for (const arg of node.args) {
      const part = monomialExponents(arg);
      if (part === undefined) return undefined;
      for (const [name, exp] of part) acc.set(name, (acc.get(name) ?? 0) + exp);
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const numerator = monomialExponents(node.args[0]);
    const denominator = monomialExponents(node.args[1]);
    if (numerator === undefined || denominator === undefined) return undefined;
    for (const [name, exp] of denominator) numerator.set(name, (numerator.get(name) ?? 0) - exp);
    return numerator;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const expNode = node.args[1];
    if (base === undefined || expNode === undefined || expNode.kind !== 'symbol') return undefined;
    const exp = Number(expNode.name);
    if (!Number.isFinite(exp)) return undefined;
    const inner = monomialExponents(base);
    if (inner === undefined) return undefined;
    for (const [name, innerExp] of inner) inner.set(name, innerExp * exp);
    return inner;
  }
  return undefined;
}

/** A dimensionless symbol whose name is a number, the way a literal exponent is written. */
function numericExponent(node: ExprNode): number | undefined {
  if (node.kind !== 'symbol' || !NUMERIC_NAME.test(node.name)) return undefined;
  if (!equals(node.dim, DIMENSIONLESS)) return undefined;
  const n = Number(node.name);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Dimension of a scalar node this classifier understands. `undefined` means
 * the node is not a product of powers of dimensioned symbols. A sum that
 * cannot be dimensioned is treated as dimensionful.
 */
function dimOf(node: ExprNode): Dimension | undefined {
  if (node.kind === 'symbol') return node.dim;
  if (node.kind === 'abs') return dimOf(node.arg);
  if (node.kind === 'transcendental') {
    const arg = dimOf(node.arg);
    if (arg === undefined || !equals(arg, DIMENSIONLESS)) return undefined;
    return DIMENSIONLESS;
  }
  if (node.kind !== 'op') return undefined;
  if (node.op === '+' || node.op === '-') {
    if (node.args.length === 0) return undefined;
    const dims = node.args.map(dimOf);
    if (dims.some((d) => d === undefined)) return undefined;
    const first = dims[0]!;
    if (!dims.every((d) => equals(d!, first))) return undefined;
    return first;
  }
  if (node.op === '*') {
    let acc: Dimension = DIMENSIONLESS;
    for (const arg of node.args) {
      const d = dimOf(arg);
      if (d === undefined) return undefined;
      acc = multiply(acc, d);
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const num = dimOf(node.args[0]!);
    const den = dimOf(node.args[1]!);
    if (num === undefined || den === undefined) return undefined;
    return divide(num, den);
  }
  if (node.op === '^') {
    if (node.args.length !== 2) return undefined;
    const base = dimOf(node.args[0]!);
    const exp = numericExponent(node.args[1]!);
    if (base === undefined || exp === undefined) return undefined;
    return power(base, exp);
  }
  return undefined;
}

/** Scalar children. A tensor node this walker does not understand contributes none. */
function children(node: ExprNode): readonly ExprNode[] {
  if (node.kind === 'op') return node.args;
  if (node.kind === 'abs' || node.kind === 'transcendental' || node.kind === 'dirac-delta') return [node.arg];
  if (node.kind === 'integral') {
    return [node.over, node.integrand, ...(node.lower === undefined ? [] : [node.lower]), ...(node.upper === undefined ? [] : [node.upper])];
  }
  if (node.kind === 'derivative') return [node.of, node.wrt];
  if (node.kind === 'variational-derivative') return [node.functional, node.field, node.over];
  return [];
}

/**
 * True when `node` adds terms that are not all dimensionless. An addend whose
 * dimension cannot be read counts as dimensionful: a sum we cannot see is not
 * reported as a monomial.
 */
function isDimensionalSum(node: ExprNode): boolean {
  if (node.kind !== 'op' || (node.op !== '+' && node.op !== '-')) return false;
  const dims = node.args.map(dimOf);
  if (dims.some((d) => d === undefined)) return true;
  return dims.some((d) => !equals(d!, DIMENSIONLESS));
}

function hasDimensionalSum(node: ExprNode): boolean {
  if (isDimensionalSum(node)) return true;
  return children(node).some(hasDimensionalSum);
}

/**
 * Classify `expr`. A node this walker does not understand, and that is not
 * itself a sum, stays a monomial so an unread tensor equation is not
 * reclassified.
 */
export function formulaShape(expr: ExprNode): FormulaShape {
  return hasDimensionalSum(expr) ? 'dimensional-sum' : 'monomial';
}
