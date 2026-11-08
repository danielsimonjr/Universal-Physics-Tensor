/**
 * The one lowering of a UPT scalar `ExprNode` to a MathTS `ScalarNode`.
 *
 * MathTS `evaluateScalar` and `compileScalarGradient` read a one-argument `-`
 * as the identity: `op('-', [x])` at x = 3 evaluates to 3. This module writes
 * `−x` as `(−1)·x` and `+x` as `x` before the MathTS scalar builder reads the
 * tree. Every other node goes to the builder unchanged. `composition/expr-eval`
 * and `diff/bridge-ast-gradient` both call this function.
 *
 * @module dimensional/scalar-lowering
 */

import { createScalarBuilder, type ScalarNode } from '@danielsimonjr/mathts-expression';
import type { ExprNode } from './validator.js';
import { DIMENSIONLESS } from './types.js';

const builder = createScalarBuilder();

const MINUS_ONE: ExprNode = { kind: 'symbol', name: '-1', dim: DIMENSIONLESS };

/** Rewrite every one-argument sign on the scalar arms. Return every other node unchanged. */
function rewriteSigns(node: ExprNode): ExprNode {
  switch (node.kind) {
    case 'op': {
      const args = node.args.map(rewriteSigns);
      if (args.length === 1) {
        if (node.op === '-') return { kind: 'op', op: '*', args: [MINUS_ONE, args[0]!] };
        if (node.op === '+') return args[0]!;
      }
      return { ...node, args };
    }
    case 'transcendental':
    case 'abs':
      return { ...node, arg: rewriteSigns(node.arg) };
    default:
      return node;
  }
}

/**
 * A scalar `ExprNode` as a MathTS `ScalarNode`, with each one-argument sign
 * rewritten first.
 * @throws ScalarBuildError (MathTS) on a node kind outside symbol, op, transcendental and abs.
 * @internal
 */
export function toScalarNode(node: ExprNode): ScalarNode {
  return builder.from(rewriteSigns(node));
}
