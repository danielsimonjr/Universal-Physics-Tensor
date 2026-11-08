/**
 * `renderGensym` writes a one-argument minus as a negation. Before the fix it
 * joined one part with the operator and dropped the sign, so `-x` rendered as
 * `x`. Once `evalExpr` read `-x` correctly, Guard 3 refused the result.
 */
import { describe, expect, it } from 'vitest';
import { simplifyExpr } from '../../src/composition/expr-simplify.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const x: ExprNode = { kind: 'symbol', name: 'x', dim: { ...DIMENSIONLESS } };

describe('simplifyExpr keeps the sign of a one-argument minus', () => {
  it('simplifies -x to a tree that evaluates to -x', async () => {
    const r = await simplifyExpr({ kind: 'op', op: '-', args: [x] });
    expect(evalExpr(r.expr, { x: 3 })).toBe(-3);
  });

  it('simplifies 2 - (-x) to a tree that evaluates to 2 + x', async () => {
    const two: ExprNode = { kind: 'symbol', name: '2', dim: { ...DIMENSIONLESS } };
    const r = await simplifyExpr({ kind: 'op', op: '-', args: [two, { kind: 'op', op: '-', args: [x] }] });
    expect(evalExpr(r.expr, { x: 3 })).toBe(5);
  });
});
