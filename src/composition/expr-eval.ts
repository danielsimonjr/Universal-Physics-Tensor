/**
 * Scalar `ExprNode` value evaluator (v0.12 symbolic composition).
 *
 * Numerically evaluates a SCALAR `ExprNode` (the `symbol` / `op` /
 * `transcendental` / `abs` arms) given leaf values. The dimensional validator infers
 * dimensions but never computes values, and the formula parser evaluates a
 * DIFFERENT AST — so this is the missing primitive that makes a bridge's
 * `symbolic` form executable.
 *
 * The tree is lowered with `createScalarBuilder` and evaluated with
 * `evaluateScalar`. This module does not print a formula and does not parse
 * one. Leaf resolution order (Adam A-1, A-5): caller `values` win, then the
 * `CONSTANTS` registry, then a spelled-out multiple of π, then a base-10
 * numeric-literal symbol (`'2'`, `'3'`), which MathTS resolves. An unresolved
 * or non-finite operator result throws. Tensor / integral / derivative arms
 * are out of scope and throw.
 *
 * INTERNAL — not on the public surface.
 *
 * @module composition/expr-eval
 */

import { createScalarBuilder, ScalarBuildError } from '@danielsimonjr/mathts-expression';
import { evaluateScalar, ScalarEvalError } from '@danielsimonjr/mathts-functions';
import type { ExprNode } from '../dimensional/validator.js';
import { CONSTANTS, piMultipleValue } from '../dimensional/symbolic-constants.js';

/** A scalar `ExprNode` could not be evaluated (unsupported arm / unresolved
 *  leaf / non-finite result). @public */
export class SymbolicEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SymbolicEvalError';
  }
}

const builder = createScalarBuilder();

/** Symbol names on the scalar arms. Other kinds are left for the builder to reject. */
function symbolNames(node: ExprNode, out: Set<string>): void {
  if (node.kind === 'symbol') {
    out.add(node.name);
    return;
  }
  if (node.kind === 'op') {
    for (const arg of node.args) symbolNames(arg, out);
    return;
  }
  if (node.kind === 'transcendental' || node.kind === 'abs') symbolNames(node.arg, out);
}

/**
 * Caller bindings, then registered constants and spelled-out π multiples
 * that the caller did not set. Numeric-literal names stay unset so MathTS
 * reads them.
 */
function scopeFor(
  node: ExprNode,
  values: Readonly<Record<string, number>>,
): Record<string, number> {
  const scope: Record<string, number> = { ...values };
  const names = new Set<string>();
  symbolNames(node, names);
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(scope, name)) continue;
    const constant = CONSTANTS[name];
    if (constant !== undefined) {
      scope[name] = constant.value;
      continue;
    }
    const pi = piMultipleValue(name);
    if (pi !== undefined) scope[name] = pi;
  }
  return scope;
}

function asSymbolic(err: unknown): Error {
  if (err instanceof ScalarEvalError || err instanceof ScalarBuildError) {
    return new SymbolicEvalError(err.message.replace(/^(?:evaluateScalar|scalar builder):/, 'evalExpr:'));
  }
  return err instanceof Error ? err : new SymbolicEvalError(String(err));
}

/**
 * Evaluate a scalar `ExprNode` to a number. See module docs for the leaf
 * resolution order and scope.
 *
 * @internal
 */
export function evalExpr(
  node: ExprNode,
  values: Readonly<Record<string, number>> = {},
): number {
  try {
    const lowered = builder.from(node);
    return evaluateScalar(lowered, scopeFor(node, values));
  } catch (err) {
    throw asSymbolic(err);
  }
}
