/**
 * The one lowering of a UPT scalar `ExprNode` to a MathTS `ScalarNode`.
 *
 * The MathTS scalar builder reads the tree without changes. From
 * `@danielsimonjr/mathts-functions` 0.75.1, MathTS `evaluateScalar` and
 * `compileScalarGradient` read a one-argument `-` as a negation (MathTS #624).
 * The tree therefore needs no sign rewrite. `composition/expr-eval` and
 * `diff/bridge-ast-gradient` both call `toScalarNode`.
 *
 * @module dimensional/scalar-lowering
 */

import { createScalarBuilder, type ScalarNode } from '@danielsimonjr/mathts-expression';
import type { ExprNode } from './validator.js';

const builder = createScalarBuilder();

/**
 * A scalar `ExprNode` as a MathTS `ScalarNode`.
 * @throws ScalarBuildError (MathTS) on a node kind outside symbol, op, transcendental and abs.
 * @internal
 */
export function toScalarNode(node: ExprNode): ScalarNode {
  return builder.from(node);
}
