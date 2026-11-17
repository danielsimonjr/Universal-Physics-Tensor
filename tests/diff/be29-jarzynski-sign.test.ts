/**
 * BE-29 Jarzynski: the catalog `scalarExpression` must carry the minus sign of the
 * row's own `formula_latex` (`ΔF = -k_B T ln⟨exp(-W/(k_B T))⟩`) and of `CE-jarzynski`.
 * A dimension check cannot see the sign, so the value is pinned here.
 */
import { describe, expect, it } from 'vitest';
import { bridgeGradientASTById } from '../../src/diff/bridge-ast-gradient.js';
import { constantScope } from '../../src/dimensional/symbolic-constants.js';

const STUB = 'ln_avg_exp_minus_betaW';
const k_B = constantScope().k_B;

describe('BE-29 Jarzynski sign', () => {
  it('ΔF = -k_B·T·ln⟨exp(-βW)⟩ at stub = -2, T = 300 K is +8.28e-21 J', () => {
    const { value, gradient } = bridgeGradientASTById(29, STUB, { [STUB]: -2, temperature: 300 });
    const expected = -k_B * 300 * -2;
    expect(expected).toBeGreaterThan(8.27e-21);
    expect(expected).toBeLessThan(8.29e-21);
    expect(Math.abs(value - expected) / expected).toBeLessThan(1e-12);
    // d(ΔF)/d(stub) = -k_B·T
    expect(Math.abs(gradient - -k_B * 300) / (k_B * 300)).toBeLessThan(1e-12);
  });
});
