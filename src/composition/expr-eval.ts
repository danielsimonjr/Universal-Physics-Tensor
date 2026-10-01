/**
 * Scalar `ExprNode` value evaluator (v0.12 symbolic composition).
 *
 * Numerically evaluates a SCALAR `ExprNode` (the `symbol` / `op` / `integral`
 * / `derivative` arms) given leaf values. The dimensional validator infers
 * dimensions but never computes values, and the formula parser evaluates a
 * DIFFERENT AST — so this is the missing primitive that makes a bridge's
 * `symbolic` form executable.
 *
 * Leaf resolution order (Adam A-1, A-5): caller `values` win, then the
 * `CONSTANTS` registry, then a base-10 numeric-literal symbol (`'2'`, `'3'`);
 * an unresolved or non-finite leaf throws. `^` reads its exponent from the
 * second arg's `name` via `Number(...)` (matching validator.ts) and uses
 * `Math.pow`. Tensor / integral / derivative arms are out of scope and throw.
 *
 * INTERNAL — not on the public surface.
 *
 * @module composition/expr-eval
 */

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

/** Resolve a leaf symbol's numeric value: values → CONSTANTS → literal. */
function resolveLeaf(name: string, values: Readonly<Record<string, number>>): number {
  if (Object.prototype.hasOwnProperty.call(values, name)) return values[name];
  const constant = CONSTANTS[name];
  if (constant !== undefined) return constant.value;
  const pi = piMultipleValue(name);
  if (pi !== undefined) return pi;
  const literal = Number(name);
  if (Number.isFinite(literal)) return literal;
  throw new SymbolicEvalError(
    `evalExpr: leaf symbol '${name}' has no value (not in inputs, not a ` +
      `registered constant, not a numeric literal).`,
  );
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
  switch (node.kind) {
    case 'symbol':
      return resolveLeaf(node.name, values);

    case 'op': {
      if (node.op === '^') {
        if (node.args.length !== 2) {
          throw new SymbolicEvalError(
            `evalExpr: '^' needs exactly 2 args, got ${node.args.length}.`,
          );
        }
        // The exponent may be a numeric-literal symbol (resolveLeaf returns its
        // value) OR a general input-dependent expression (v0.13 — e.g. −1/z).
        // `finite()` still catches a non-finite result (NaN/Inf).
        const base = evalExpr(node.args[0], values);
        const exp = evalExpr(node.args[1], values);
        return finite(Math.pow(base, exp), node);
      }
      if (node.args.length === 0) {
        // Mirrors the validator's empty-op convention: * / → 1, + - → 0.
        return node.op === '*' || node.op === '/' ? 1 : 0;
      }
      let acc = evalExpr(node.args[0], values);
      for (let i = 1; i < node.args.length; i++) {
        const v = evalExpr(node.args[i], values);
        if (node.op === '+') acc += v;
        else if (node.op === '-') acc -= v;
        else if (node.op === '*') acc *= v;
        else acc /= v;
      }
      return finite(acc, node);
    }

    default:
      throw new SymbolicEvalError(
        `evalExpr: node kind '${node.kind}' is out of scope (scalar ` +
          `symbol/op only; integral/derivative/tensor nodes are not ` +
          `numerically evaluable here).`,
      );
  }
}

function finite(value: number, node: ExprNode): number {
  if (!Number.isFinite(value)) {
    throw new SymbolicEvalError(
      `evalExpr: '${(node as { op?: string }).op ?? node.kind}' produced a ` +
        `non-finite value (${value}).`,
    );
  }
  return value;
}
