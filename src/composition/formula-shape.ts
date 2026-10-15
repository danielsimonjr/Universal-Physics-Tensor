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

import { Fraction } from '@danielsimonjr/mathts-core';
import type { ExprNode } from '../dimensional/ast-types.js';
import { isDecimalLiteral } from '../dimensional/ast-leaves.js';
import { divide, equals, multiply, power } from '../dimensional/algebra.js';
import type { Dimension } from '../dimensional/types.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { fractionToNumber, rationalize } from './rational-exponent.js';

/** `monomial` is a product of powers. `dimensional-sum` adds dimensionful terms. */
type FormulaShape = 'monomial' | 'dimensional-sum';

/**
 * The rational a literal exponent stands for: a bounded-denominator scan at
 * the fit's tolerance reads `0.3333333333333333` as `1/3`; a decimal that
 * is no such rational (`0.3333`) is kept as the exact decimal it spells.
 *
 * @internal
 */
export function rationalExponentOf(name: string): Fraction | undefined {
  if (!isDecimalLiteral(name)) return undefined;
  const value = Number(name);
  if (!Number.isFinite(value)) return undefined;
  const scanned = rationalize(value);
  if (scanned !== undefined) return scanned;
  try {
    return Fraction.parse(name);
  } catch {
    return Fraction.fromNumber(value);
  }
}

/**
 * Exact exponents of every symbol in a product, quotient, or literal power,
 * as core `Fraction`s. Undefined for a sum or any node that is not that
 * monomial. A cancellation is an exact zero: `(x^(1/3))^3 / x` carries `x`
 * at `0`, not at `2.2e-16`.
 *
 * @internal
 */
export function monomialExponentsExact(node: ExprNode | undefined): Map<string, Fraction> | undefined {
  if (node === undefined) return undefined;
  if (node.kind === 'symbol') return new Map([[node.name, new Fraction(1)]]);
  if (node.kind !== 'op') return undefined;
  if (node.op === '*') {
    const acc = new Map<string, Fraction>();
    for (const arg of node.args) {
      const part = monomialExponentsExact(arg);
      if (part === undefined) return undefined;
      for (const [name, exp] of part) acc.set(name, (acc.get(name) ?? new Fraction(0)).add(exp));
    }
    return acc;
  }
  if (node.op === '/') {
    if (node.args.length !== 2) return undefined;
    const numerator = monomialExponentsExact(node.args[0]);
    const denominator = monomialExponentsExact(node.args[1]);
    if (numerator === undefined || denominator === undefined) return undefined;
    for (const [name, exp] of denominator) numerator.set(name, (numerator.get(name) ?? new Fraction(0)).sub(exp));
    return numerator;
  }
  if (node.op === '^') {
    const base = node.args[0];
    const expNode = node.args[1];
    if (base === undefined || expNode === undefined || expNode.kind !== 'symbol') return undefined;
    const exp = rationalExponentOf(expNode.name);
    if (exp === undefined) return undefined;
    const inner = monomialExponentsExact(base);
    if (inner === undefined) return undefined;
    for (const [name, innerExp] of inner) inner.set(name, innerExp.multiply(exp));
    return inner;
  }
  return undefined;
}

/**
 * Exponents of every symbol in a product, quotient, or literal power, as
 * numbers: the projection of {@link monomialExponentsExact}. Undefined for a
 * sum or any node that is not that monomial. The canonical graph reads a
 * count's exponent from it, and a composed edge reads the junction's
 * exponent from it.
 *
 * @internal
 */
export function monomialExponents(node: ExprNode | undefined): Map<string, number> | undefined {
  const exact = monomialExponentsExact(node);
  if (exact === undefined) return undefined;
  return new Map([...exact].map(([name, exp]) => [name, fractionToNumber(exp)]));
}

/** A dimensionless symbol whose name is a number, the way a literal exponent is written. */
function numericExponent(node: ExprNode): number | undefined {
  if (node.kind !== 'symbol' || !isDecimalLiteral(node.name)) return undefined;
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
