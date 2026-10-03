/**
 * Direct unit coverage for `lowerTensorPartialDerivative` (derivative-lowering).
 * The covariant-derivative arm is already exercised through the dispatcher
 * (covariant-derivative-lowering.test.ts); this pins the tensor-partial arm's
 * metric strategies and operand guards at the unit level.
 */
import { describe, it, expect } from 'vitest';
import { lowerTensorPartialDerivative } from '../../src/numerical/derivative-lowering.js';
import { pderiv, metric } from '../../src/dimensional/metric.js';
import { tsym } from '../../src/dimensional/tensor.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { NumericalInputs } from '../../src/numerical/types.js';
import { DIMENSIONLESS, LENGTH } from '../../src/dimensional/types.js';

const engine = new MathTSEngine();
const xCoord = tsym('x', [{ label: 'α', variance: 'upper' }], LENGTH, 'coordinate');
const wrt = { label: 'μ', variance: 'lower' } as const;
const lowerIdx = [
  { label: 'a', variance: 'lower' as const },
  { label: 'b', variance: 'lower' as const },
];

describe('lowerTensorPartialDerivative — metric arm', () => {
  it("strategy='zero' returns a zero tensor of shape [...g, N]", () => {
    const g = metric('g', lowerIdx, DIMENSIONLESS, '+,-,-,-', 'zero');
    const node = pderiv(g, xCoord, wrt);
    const inputs: NumericalInputs = { tensors: new Map(), dimension: 2 };
    const out = lowerTensorPartialDerivative(node, inputs, engine);
    expect([...out.shape]).toEqual([2, 2, 2]);
    expect(engine.normInf(out)).toBe(0);
  });

  it("strategy='computed' on a constant metric is also zero (Γ=0 ⟹ ∂g=0)", () => {
    const g = metric('g', lowerIdx, DIMENSIONLESS, '+,-,-,-', 'computed');
    const node = pderiv(g, xCoord, wrt);
    const out = lowerTensorPartialDerivative(node, { tensors: new Map(), dimension: 2 }, engine);
    expect(engine.normInf(out)).toBe(0);
  });

  it("strategy='supplied' throws when a ∂g slice is missing", () => {
    const g = metric('g', lowerIdx, DIMENSIONLESS, '+,-,-,-', 'supplied');
    const node = pderiv(g, xCoord, wrt);
    const inputs: NumericalInputs = { tensors: new Map(), dimension: 2 };
    expect(() => lowerTensorPartialDerivative(node, inputs, engine)).toThrow(
      /no metricDerivatives entry/,
    );
  });

  it('throws on an unsupported operand kind (not tensor-symbol / metric-tensor)', () => {
    const badOf = { kind: 'symbol', name: 's', dim: DIMENSIONLESS } as const;
    const node = pderiv(badOf, xCoord, wrt);
    expect(() => lowerTensorPartialDerivative(node, { tensors: new Map(), dimension: 2 }, engine))
      .toThrow(/tensor-symbol or metric-tensor/);
  });
});
