/**
 * Regression guard: DIMENSIONFUL fractional powers are fully supported — at the
 * dimensional level (the `Dimension` exponents are `number`, so `power(D, n)`
 * handles any rational n) and through `^` with a NUMERIC-LITERAL exponent
 * (validator.ts: a literal exponent works on any base, dimensionful included),
 * AND through reverse-mode AD (`TapedTensor.pow(k)` handles fractional k).
 *
 * This was at one point mistakenly described as "deferred / needing
 * rational-exponent Dimension algebra" — it is not. This test pins the
 * capability so it cannot be silently broken or re-deferred. No dedicated
 * `sqrt`/`cbrt` node exists (it would be redundant with `^0.5` / `^(1/3)`).
 *
 * Gated on the optional mathts-autograd peer for the AD assertions.
 *
 * @module tests/dimensional/dimensionful-power-ad
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';
import { power } from '../../src/dimensional/algebra.js';
import { MASS, DIMENSIONLESS } from '../../src/dimensional/types.js';
import { bridgeGradientAST, bridgeGradientASTById } from '../../src/diff/bridge-ast-gradient.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const peerPresent = hasAutogradSupport(new MathTSEngine());
const relErr = (a: number, b: number) => Math.abs((a - b) / b);

// m^0.5 via `^` with a literal exponent on a DIMENSIONFUL base.
const sqrtMass: ExprNode = {
  kind: 'op',
  op: '^',
  args: [
    { kind: 'symbol', name: 'm', dim: MASS },
    { kind: 'symbol', name: '0.5', dim: DIMENSIONLESS },
  ],
};

describe('dimensionful fractional powers — dimensional level', () => {
  it('power(MASS, 1/2) gives a half-integer exponent', () => {
    expect(power(MASS, 0.5).M).toBe(0.5);
  });

  it('(m)^0.5 validates and infers [M^0.5]', () => {
    const r = validate(sqrtMass);
    expect(r.ok).toBe(true);
    expect(format(r.inferredDimension!)).toBe('[M^0.5]');
  });
});

describe('dimensionful fractional powers — reverse-mode AD', () => {
  it.runIf(peerPresent)('d/dm (m^0.5) = 0.5·m^(-0.5)', async () => {
    const { gradient } = await bridgeGradientAST(sqrtMass, 'm', { m: 4 });
    expect(gradient).toBeCloseTo(0.5 * Math.pow(4, -0.5), 12);
  });

  it.runIf(peerPresent)('BE-12 thermal de Broglie λ_T ∝ T^(−1/2): ∂λ/∂T = −0.5·λ/T (exact)', async () => {
    const m = 1e-26;
    const T = 300;
    const { value, gradient } = await bridgeGradientASTById('BE-12', 'temperature', {
      mass: m,
      temperature: T,
    });
    expect(relErr(gradient, (-0.5 * value) / T)).toBeLessThan(1e-9);
  });
});
