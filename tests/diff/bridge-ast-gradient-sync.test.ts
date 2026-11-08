/**
 * MathTS leverage plan task U9, option D: `bridgeGradientAST` is synchronous
 * and differentiates through MathTS `compileScalarGradient` over the scalar
 * builder. The definite-integral arm is removed (no catalog bridge uses it,
 * and the builder refuses the node kind). The exponent-symbol refusal stays a
 * UPT pre-check in front of MathTS.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  astDifferentiableBridgeIds,
  bridgeGradientAST,
  bridgeGradientASTById,
} from '../../src/diff/bridge-ast-gradient.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../../src/dimensional/ast-leaves.js';
import { constantScope } from '../../src/dimensional/symbolic-constants.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../../src/diff/bridge-ast-gradient.ts'), 'utf8');
const sym = (name: string): ExprNode => ({ kind: 'symbol', name, dim: { ...DIMENSIONLESS } });
const square: ExprNode = { kind: 'op', op: '*', args: [sym('x'), sym('x')] };
const scope = constantScope();

describe('bridgeGradientAST through MathTS compileScalarGradient (U9, option D)', () => {
  it('returns the result synchronously, not a Promise', () => {
    const r = bridgeGradientAST(square, 'x', { x: 3 });
    expect(r).not.toBeInstanceOf(Promise);
    expect(r).toEqual({ value: 9, gradient: 6 });
  });

  it('refuses a definite integral, which the scalar grammar no longer has', () => {
    const integral: ExprNode = { kind: 'integral', integrand: sym('x'), over: sym('x'), lower: sym('0'), upper: sym('theta') } as ExprNode;
    expect(() => bridgeGradientAST(integral, 'theta', { theta: 1 })).toThrow(TypeError);
    expect(() => bridgeGradientAST(integral, 'theta', { theta: 1 })).toThrow(/unsupported node kind.*'integral'/);
  });

  it('keeps the exponent-symbol refusal in front of MathTS', () => {
    const power: ExprNode = { kind: 'op', op: '^', args: [sym('a'), sym('z')] };
    expect(() => bridgeGradientAST(power, 'z', { a: 2, z: 3 })).toThrow(/appears as an exponent/);
    expect(bridgeGradientAST(power, 'a', { a: 2, z: 3 }).gradient).toBeCloseTo(12, 12);
  });

  it('refuses the variable in a nested exponent and in an exponent under exp or abs', () => {
    const nested: ExprNode = { kind: 'op', op: '^', args: [sym('x'), { kind: 'op', op: '^', args: [sym('2'), sym('z')] }] };
    expect(() => bridgeGradientAST(nested, 'z', { x: 2, z: 1 })).toThrow(/appears as an exponent/);
    const underExp: ExprNode = { kind: 'transcendental', fn: 'exp', arg: { kind: 'op', op: '^', args: [sym('x'), sym('z')] } };
    expect(() => bridgeGradientAST(underExp, 'z', { x: 2, z: 1 })).toThrow(/appears as an exponent/);
    const underAbs: ExprNode = { kind: 'abs', arg: { kind: 'op', op: '^', args: [sym('x'), sym('z')] } };
    expect(() => bridgeGradientAST(underAbs, 'z', { x: 2, z: 1 })).toThrow(/appears as an exponent/);
  });

  it('reports NaN, not ±Infinity, for the value and the gradient where the value overflows (BE-82)', () => {
    const bind = { 'shockley-saturation': 1.1, 'shockley-voltage': 1.47, 'shockley-temperature': 1.84 };
    for (const v of Object.keys(bind)) {
      const r = bridgeGradientASTById(82, v, bind);
      expect(Number.isNaN(r.value), v).toBe(true);
      expect(Number.isNaN(r.gradient), v).toBe(true);
    }
    // Control: at a physical point the same bridge is finite.
    const ok = bridgeGradientASTById(82, 'shockley-voltage', { 'shockley-saturation': 1e-12, 'shockley-voltage': 0.6, 'shockley-temperature': 300 });
    expect(Number.isFinite(ok.gradient)).toBe(true);
  });

  it('reads a literal-shaped name from the bindings when the caller binds it', () => {
    const product: ExprNode = { kind: 'op', op: '*', args: [sym('x'), sym('2')] };
    expect(bridgeGradientAST(product, 'x', { x: 3 }).gradient).toBe(2);
    expect(bridgeGradientAST(product, 'x', { x: 3, '2': 5 }).gradient).toBe(5);
  });

  it('names the unsupported kind when it is nested below the root', () => {
    const integral = { kind: 'integral', integrand: sym('x'), over: sym('x'), lower: sym('0'), upper: sym('1') } as ExprNode;
    const wrapped: ExprNode = { kind: 'op', op: '*', args: [sym('y'), integral] };
    expect(() => bridgeGradientAST(wrapped, 'y', { y: 1 })).toThrow(/'integral'/);
    expect(() => bridgeGradientAST(wrapped, 'y', { y: 1 })).not.toThrow(/kind 'op'/);
  });

  it('gives the value evalExpr gives, on every (bridge, variable) pair of the catalog', () => {
    let pairs = 0;
    for (const id of astDifferentiableBridgeIds()) {
      const rhs = BRIDGE_RHS_BY_ID.get(id)!;
      const names = new Set<string>();
      forEachScalarLeaf(rhs, (leaf) => names.add(leaf.name), { transcendental: true, abs: true });
      const vars = [...names].filter((n) => !(n in scope) && !isDecimalLiteral(n));
      const bind: Record<string, number> = {};
      vars.forEach((v, i) => (bind[v] = 1.1 + 0.37 * i));
      // evalExpr throws on a non-finite value (BE-68 at this point); the gradient then reports NaN.
      let expected = Number.NaN;
      try {
        expected = evalExpr(rhs, { ...scope, ...bind });
      } catch {
        /* expected stays NaN */
      }
      for (const v of vars) {
        let r;
        try {
          r = bridgeGradientASTById(id, v, bind);
        } catch (e) {
          expect((e as Error).message, `BE-${id} ${v}`).toMatch(/appears as an exponent/);
          continue;
        }
        pairs++;
        if (!Number.isFinite(expected)) expect(Number.isFinite(r.value), `BE-${id} ${v}`).toBe(false);
        else expect(Math.abs(r.value - expected) / Math.abs(expected || 1), `BE-${id} ${v}`).toBeLessThan(1e-12);
      }
    }
    expect(pairs).toBeGreaterThan(300);
  });

  it('calls MathTS compileScalarGradient and carries no autograd tape or quadrature', () => {
    expect(source).toMatch(/compileScalarGradient\(/);
    expect(source).not.toMatch(/mathts-autograd/);
    expect(source).not.toMatch(/GAUSS_LEGENDRE_16/);
    expect(source).not.toMatch(/export async function/);
  });
});
