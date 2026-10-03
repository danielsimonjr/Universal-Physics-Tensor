/**
 * End-to-end lowering for `kretschmann-scalar` (Task 3.7 completion).
 */
import { describe, it, expect } from 'vitest';
import { lowerNode } from '../../src/numerical/lowering.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { KretschmannScalarNode } from '../../src/dimensional/curvature-invariants.js';
import type { RiemannTensorNode } from '../../src/dimensional/connection-validators.js';
import type { MetricTensorNode } from '../../src/dimensional/metric-validators.js';
import {
  schwarzschildRs,
  schwarzschildGFn,
  schwarzschildGInverseFn,
} from '../fixtures/schwarzschild.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

const DIM = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

function makeRiemann(): RiemannTensorNode {
  return {
    kind: 'riemann-tensor',
    upperIndex: { label: 'rho', variance: 'upper' },
    lowerIndices: [
      { label: 'sigma', variance: 'lower' },
      { label: 'mu', variance: 'lower' },
      { label: 'nu', variance: 'lower' },
    ],
    gLower: {
      kind: 'metric-tensor',
      name: 'g',
      indices: [
        { label: 'a', variance: 'lower' },
        { label: 'b', variance: 'lower' },
      ],
      signature: '-,+,+,+',
      dim: DIM,
    },
    gInverse: {
      kind: 'metric-tensor',
      name: 'g_inv',
      indices: [
        { label: 'c', variance: 'upper' },
        { label: 'd', variance: 'upper' },
      ],
      signature: '-,+,+,+',
      dim: DIM,
    },
    xCoord: {
      kind: 'tensor-symbol',
      name: 'x',
      indices: [{ label: 'e', variance: 'upper' }],
      dim: { L: 1, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
    },
  };
}

function makeMetric(): MetricTensorNode {
  return {
    kind: 'metric-tensor',
    name: 'g',
    indices: [
      { label: 'p', variance: 'lower' },
      { label: 'q', variance: 'lower' },
    ],
    signature: '-,+,+,+',
    dim: DIM,
  };
}

describe('kretschmann-scalar lowering', () => {
  it('matches the Schwarzschild closed form via lowerNode', () => {
    const M = 1.989e30;
    const r_s = schwarzschildRs(M);
    const r = 5 * r_s;
    const x = [0, r, Math.PI / 2, 0];
    const gFn = schwarzschildGFn(M);
    const gInvFn = schwarzschildGInverseFn(M);

    const node: KretschmannScalarNode = {
      kind: 'kretschmann-scalar',
      riemann: makeRiemann(),
      metric: makeMetric(),
    };

    const engine = new MathTSEngine();
    const gInvFlat = gInvFn(x);
    const gInvNested = Array.from({ length: 4 }, (_, mu) =>
      Array.from({ length: 4 }, (_, nu) => gInvFlat[mu * 4 + nu]),
    );

    const t = lowerNode(
      node,
      {
        tensors: new Map<string, number[] | number[][]>([
          ['g', gFn(x) as unknown as number[][]],
          ['g_inv', gInvNested],
          ['x', x],
        ]),
        fields: new Map([
          ['g', (xs: ReadonlyArray<number>) => gFn(xs) as unknown as number[][]],
          ['g_inv', (xs: ReadonlyArray<number>) => {
            const flat = gInvFn(xs);
            return Array.from({ length: 4 }, (_, mu) =>
              Array.from({ length: 4 }, (_, nu) => flat[mu * 4 + nu]),
            );
          }],
        ]),
        dimension: 4,
      },
      engine,
    );

    const K = engine.toNested(t) as number;
    const K_analytic = (48 * G_SI ** 2 * M ** 2) / (C_SI ** 4 * r ** 6);
    expect(Math.abs(K / K_analytic - 1)).toBeLessThan(1e-3);
  });

  it('throws when metric closures are missing from inputs.fields', () => {
    const node: KretschmannScalarNode = {
      kind: 'kretschmann-scalar',
      riemann: makeRiemann(),
      metric: makeMetric(),
    };
    const engine = new MathTSEngine();
    expect(() =>
      lowerNode(node, { tensors: new Map([['x', [0, 1, 0, 0]]]), dimension: 4 }, engine),
    ).toThrow(/kretschmann-scalar requires coordinate-dependent metric closures/);
  });
});
