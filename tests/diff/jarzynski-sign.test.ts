/**
 * BE-29 Jarzynski: the catalog `scalarExpression` must carry the minus sign of the
 * row's own `formula_latex` (`ΔF = -k_B T ln⟨exp(-W/(k_B T))⟩`) and of `CE-jarzynski`.
 * A dimension check cannot see the sign, and the structural compare drops a numeric
 * literal, so the value is pinned here on both paths: the catalog AST and the
 * canonical AST, evaluated at the same point.
 */
import { describe, expect, it } from 'vitest';
import { bridgeGradientAST, bridgeGradientASTById } from '../../src/diff/bridge-ast-gradient.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { normalForm } from '../../src/canonical/normal-form.js';
import { constantScope } from '../../src/dimensional/symbolic-constants.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS, ENTROPY, TEMPERATURE } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const STUB = 'ln_avg_exp_minus_betaW';
const k_B = constantScope().k_B;
const INPUTS = { [STUB]: -2, temperature: 300 };
const EXPECTED = -k_B * 300 * -2;
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b);
const ce = canonicalById('CE-jarzynski')!.scalarAst!;
/** CE-jarzynski with its `-1` leaf replaced by `1`: the sign error on the canonical side. */
const wrongCe: ExprNode = {
  kind: 'op', op: '*',
  args: [sym('1', DIMENSIONLESS), sym('k_B', ENTROPY), sym('temperature', TEMPERATURE), sym(STUB, DIMENSIONLESS)],
} as ExprNode;

describe('BE-29 Jarzynski sign', () => {
  it('ΔF = -k_B·T·ln⟨exp(-βW)⟩ at stub = -2, T = 300 K is +8.28e-21 J', () => {
    const { value, gradient } = bridgeGradientASTById(29, STUB, { ...INPUTS });
    expect(EXPECTED).toBeGreaterThan(8.27e-21);
    expect(EXPECTED).toBeLessThan(8.29e-21);
    expect(rel(value, EXPECTED)).toBeLessThan(1e-12);
    // d(ΔF)/d(stub) = -k_B·T
    expect(rel(gradient, -k_B * 300)).toBeLessThan(1e-12);
  });

  it('CE-jarzynski evaluates to the same value as the catalog row', () => {
    expect(rel(bridgeGradientAST(ce, STUB, { ...INPUTS }).value, EXPECTED)).toBeLessThan(1e-12);
  });

  it('control: the canonical AST without its -1 gives the negated value', () => {
    expect(rel(bridgeGradientAST(wrongCe, STUB, { ...INPUTS }).value, EXPECTED)).toBeCloseTo(2, 12);
  });

  it('the structural compare is sign-blind, so it could not have caught either error', () => {
    const catalog = normalForm(BRIDGE_RHS_BY_ID.get(29)!);
    expect(normalForm(ce)).toBe(catalog);
    expect(normalForm(wrongCe)).toBe(catalog);
  });
});
