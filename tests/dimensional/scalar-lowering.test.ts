/**
 * `toScalarNode`, the one lowering of a UPT scalar `ExprNode` to a MathTS
 * `ScalarNode`. MathTS `evaluateScalar` and `compileScalarGradient` read a
 * one-argument `-` as the identity (measured: `op('-', [x])` at x = 3 gives 3),
 * so the lowering writes `−x` as `(−1)·x` and `+x` as `x` before the builder
 * sees the tree. `evalExpr` and `bridgeGradientAST` both read it.
 */
import { describe, expect, it } from 'vitest';
import { evaluateScalar } from '@danielsimonjr/mathts-functions';
import { createScalarBuilder } from '@danielsimonjr/mathts-expression';
import { toScalarNode } from '../../src/dimensional/scalar-lowering.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { bridgeGradientAST } from '../../src/diff/bridge-ast-gradient.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: { ...DIMENSIONLESS } });
const neg = (arg: ExprNode): ExprNode => ({ kind: 'op', op: '-', args: [arg] });
const pos = (arg: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [arg] });

describe('toScalarNode lowers a one-argument sign correctly', () => {
  it('negates a one-argument minus and keeps a one-argument plus', () => {
    expect(evaluateScalar(toScalarNode(neg(sym('x'))), { x: 3 })).toBe(-3);
    expect(evaluateScalar(toScalarNode(pos(sym('x'))), { x: 3 })).toBe(3);
    expect(evaluateScalar(toScalarNode(neg(neg(sym('x')))), { x: 3 })).toBe(3);
  });

  it('reaches a sign under a transcendental, an abs and an exponent', () => {
    const t: ExprNode = { kind: 'transcendental', fn: 'exp', arg: neg(sym('x')) };
    expect(evaluateScalar(toScalarNode(t), { x: 1 })).toBeCloseTo(Math.exp(-1), 15);
    const a: ExprNode = { kind: 'abs', arg: neg(sym('x')) };
    expect(evaluateScalar(toScalarNode(a), { x: -2 })).toBe(2);
    const p: ExprNode = { kind: 'op', op: '^', args: [sym('a'), neg(sym('z'))] };
    expect(evaluateScalar(toScalarNode(p), { a: 2, z: 3 })).toBe(0.125);
  });

  it('control: the raw MathTS builder still reads a one-argument minus as the identity', () => {
    // If MathTS fixes this, the row fails and the rewrite can go (a MathTS issue is filed).
    expect(evaluateScalar(createScalarBuilder().from(neg(sym('x'))), { x: 3 })).toBe(3);
  });

  it('evalExpr and bridgeGradientAST read the lowering', () => {
    expect(evalExpr(neg(sym('x')), { x: 3 })).toBe(-3);
    expect(bridgeGradientAST(neg(sym('x')), 'x', { x: 3 })).toEqual({ value: -3, gradient: -1 });
    const p: ExprNode = { kind: 'op', op: '^', args: [sym('a'), neg(sym('z'))] };
    const g = bridgeGradientAST(p, 'a', { a: 2, z: 3 });
    expect(g.value).toBe(0.125);
    expect(g.gradient).toBeCloseTo(-3 * 2 ** -4, 15);
  });
});
