/**
 * Finiteness-guard uniformity (Round-2 audit, MED).
 *
 * `evalExpr` / `validateFiniteInputs` already throw on a non-finite value, but
 * `integrateGaussLegendre` and the `upt eval` formula evaluator used to return
 * NaN/∞ silently. These guards make the whole numerical layer fail loudly on a
 * non-finite result instead of propagating a silent NaN.
 *
 * (The third spot — `bridgeGradientNumerical`'s typeof-vs-isFinite param check
 * and its relStep guard — is covered in tests/diff/bridge-gradient.test.ts.)
 *
 * @module tests/numerical/finiteness-guards
 */
import { describe, it, expect } from 'vitest';
import { integrateGaussLegendre } from '../../src/numerical/quadrature.js';
import { parseFormula } from '../../src/numerical/formula-mathts.js';

describe('integrateGaussLegendre — finiteness', () => {
  it('integrates a finite integrand normally', () => {
    // ∫₀¹ x dx = 0.5
    expect(integrateGaussLegendre((x) => x, 0, 1)).toBeCloseTo(0.5, 12);
  });

  it('throws on non-finite bounds', () => {
    expect(() => integrateGaussLegendre((x) => x, 0, Infinity)).toThrow(/bounds must be finite/);
    expect(() => integrateGaussLegendre((x) => x, NaN, 1)).toThrow(/bounds must be finite/);
  });

  it('throws when the integrand yields a non-finite result', () => {
    expect(() => integrateGaussLegendre(() => Infinity, 0, 1)).toThrow(/non-finite result/);
  });
});

describe('formula evaluator — finiteness', () => {
  it('evaluates a finite formula normally', () => {
    expect(parseFormula('a + b').evaluate({ a: 2, b: 3 })).toBe(5);
  });

  it('throws on a non-finite result (division by zero)', () => {
    expect(() => parseFormula('1 / 0').evaluate({})).toThrow(/not evaluate to a finite number/);
  });

  it('throws on a NaN result (0^0 is fine, but 0/0 is NaN)', () => {
    expect(() => parseFormula('x / y').evaluate({ x: 0, y: 0 })).toThrow(/not evaluate to a finite number/);
  });
});
