/**
 * Residual form of a canonical equation: `target − scalarAst`.
 *
 * A canonical entry stores the RIGHT-HAND SIDE of one target (`scalarAst`), for example `m·a` for
 * the target force. A claim, as a user or the benchmark writes it, is a RELATION: `F − m·a`. The
 * structural key of a residual and of a right-hand side can never be equal, so a structural search
 * that compares a claim with `scalarAst` never matches. The criterion 3 study measured this: 0 of
 * 11,125 query × record pairs (pre-registration Amendment 8). Putting the canonical entry in residual
 * form makes both sides the same kind of object.
 *
 * Symbol names are not unified here. The structural key renames every dimensioned symbol to its
 * dimension, so `F` and `force` compare equal there. Symbol overlap still sees the two naming
 * conventions (`k_B` against `boltzmann-constant`), and no alias map bridges them.
 *
 * @module canonical/residual
 * @internal
 */

import type { ExprNode } from '../dimensional/ast-types.js';
import { dim, sym, symbolPower } from '../dimensional/ast-builders.js';
import type { CanonicalEquation } from './canonical-equation.js';

/**
 * The residual `target − scalarAst` of a canonical entry, or `undefined` when the entry has no
 * `scalarAst`. The target becomes a symbol with its name and dimension; the right-hand side is the
 * entry's own `scalarAst`, not a copy.
 *
 * @internal
 */
export function canonicalResidual(e: CanonicalEquation): ExprNode | undefined {
  if (e.scalarAst === undefined) return undefined;
  const target: ExprNode = { kind: 'symbol', name: e.dimensional.target.name, dim: e.dimensional.target.dim };
  return { kind: 'op', op: '-', args: [target, e.scalarAst] };
}

/**
 * The residual `target − (numerator / denominator)` built from the L0 monomial of an entry, or
 * `undefined` when the entry has no monomial. The numerator is the product of `governing^e` for each
 * exponent e > 0, and the denominator is the product of `governing^|e|` for each exponent e < 0.
 * Every exponent is positive, so the record has the form that the parser gives for a claim that a
 * user writes (`sqrt(L)/sqrt(g)` parses as `L^0.5 / g^0.5`, not as `L^0.5 · g^-0.5`). An empty
 * denominator is omitted, and an empty numerator is `1`. It serves an entry that has no
 * `scalarAst`: the monomial fixes every exponent but not the leading constant, so the residual keeps
 * the exponents and claims no constant. Exponents are decimal literals, the form `pow(x, '0.5')` uses.
 *
 * @internal
 */
export function monomialResidual(e: CanonicalEquation): ExprNode | undefined {
  const monomial = e.dimensional.monomial;
  if (monomial === null) return undefined;
  const num: ExprNode[] = [];
  const den: ExprNode[] = [];
  for (const g of e.dimensional.governing) {
    const exponent = monomial[g.name];
    if (exponent === undefined || exponent === 0) continue;
    (exponent > 0 ? num : den).push(symbolPower(sym(g.name, g.dim), Math.abs(exponent)));
  }
  const product = (fs: ExprNode[]): ExprNode =>
    fs.length === 0 ? sym('1', dim()) : fs.length === 1 ? fs[0]! : { kind: 'op', op: '*', args: fs };
  const rhs: ExprNode = den.length === 0 ? product(num) : { kind: 'op', op: '/', args: [product(num), product(den)] };
  const target: ExprNode = { kind: 'symbol', name: e.dimensional.target.name, dim: e.dimensional.target.dim };
  return { kind: 'op', op: '-', args: [target, rhs] };
}
