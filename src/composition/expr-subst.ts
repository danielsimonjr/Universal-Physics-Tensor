/**
 * Scalar `ExprNode` substitution (v0.12 symbolic composition).
 *
 * `substitute(expr, name, replacement)` replaces every `{kind:'symbol', name}`
 * leaf with `replacement`, recursing the scalar arms (`op` / `integral` /
 * `derivative` / `transcendental` / `abs` / `dirac-delta`). It returns the new
 * tree AND the occurrence count — the count
 * is load-bearing: `composeSymbolic` rejects a ZERO-occurrence substitution
 * (a silent no-op that would yield a dimensionally-valid but physics-wrong
 * composition ignoring the first operand — Adam A-3). Tensor arms are out of
 * scope and throw (symbolic composition targets scalar closed forms).
 *
 * INTERNAL — not on the public surface.
 *
 * @module composition/expr-subst
 */

import type { ExprNode } from '../dimensional/validator.js';
import { SymbolicEvalError } from './expr-eval.js';

/** The substituted tree and how many leaves were replaced. */
interface SubstitutionResult {
  readonly expr: ExprNode;
  readonly count: number;
}

/**
 * Replace every leaf `symbol` named `name` with `replacement`. See module
 * docs. Returns `{ expr, count }`.
 *
 * @internal
 */
export function substitute(
  expr: ExprNode,
  name: string,
  replacement: ExprNode,
): SubstitutionResult {
  switch (expr.kind) {
    case 'symbol':
      return expr.name === name
        ? { expr: replacement, count: 1 }
        : { expr, count: 0 };

    case 'op': {
      let count = 0;
      const args = expr.args.map((a) => {
        const r = substitute(a, name, replacement);
        count += r.count;
        return r.expr;
      });
      return { expr: { ...expr, args }, count };
    }

    case 'integral': {
      const over = substitute(expr.over, name, replacement);
      const integrand = substitute(expr.integrand, name, replacement);
      return {
        expr: { ...expr, over: over.expr, integrand: integrand.expr },
        count: over.count + integrand.count,
      };
    }

    case 'derivative': {
      const of = substitute(expr.of, name, replacement);
      const wrt = substitute(expr.wrt, name, replacement);
      return {
        expr: { ...expr, of: of.expr, wrt: wrt.expr },
        count: of.count + wrt.count,
      };
    }

    case 'transcendental':
    case 'abs':
    case 'dirac-delta': {
      const inner = substitute(expr.arg, name, replacement);
      return { expr: { ...expr, arg: inner.expr }, count: inner.count };
    }

    default:
      throw new SymbolicEvalError(
        `substitute: node kind '${expr.kind}' is out of scope (scalar ` +
          `symbol/op/integral/derivative/transcendental/abs/dirac-delta only; tensor nodes are not ` +
          `substitutable here).`,
      );
  }
}
