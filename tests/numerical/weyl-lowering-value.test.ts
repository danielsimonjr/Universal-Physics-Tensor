/**
 * Values of the `weyl-tensor` lowering (`lowerWeylTensor`) through `lowerNode`.
 * Schwarzschild is a vacuum, so its Weyl tensor equals its Riemann tensor.
 * De Sitter is conformally flat, so its Weyl tensor is zero. Its Riemann tensor is not zero.
 */
import { describe, expect, it } from 'vitest';
import { lowerNode } from '../../src/numerical/lowering.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { WeylTensorNode } from '../../src/dimensional/weyl-validators.js';
import type { NestedArray } from '../../src/numerical/types.js';
import { schwarzschildGFn, schwarzschildGInverseFn, schwarzschildRiemannFn, schwarzschildRs } from '../fixtures/schwarzschild.js';
import { deSitterGFn, deSitterGInverseFn, deSitterRiemannFn } from '../fixtures/de-sitter.js';

const DIM = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const node: WeylTensorNode = {
  kind: 'weyl-tensor',
  metric: {
    kind: 'metric-tensor',
    name: 'g',
    indices: [
      { label: 'a', variance: 'lower' },
      { label: 'b', variance: 'lower' },
    ],
    signature: '-,+,+,+',
    dim: DIM,
  },
  upperIndex: { label: 'rho', variance: 'upper' },
  lowerIndices: [
    { label: 'sigma', variance: 'lower' },
    { label: 'mu', variance: 'lower' },
    { label: 'nu', variance: 'lower' },
  ],
  componentDim: { L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 },
};

const nest = (flat: ArrayLike<number>): number[][] =>
  Array.from({ length: 4 }, (_, mu) => Array.from({ length: 4 }, (_, nu) => flat[mu * 4 + nu]!));
const asNested = (v: NestedArray): number[][] =>
  Array.isArray((v as readonly unknown[])[0]) ? (v as number[][]) : nest(v as ArrayLike<number>);

function weylAt(
  gFn: (x: ReadonlyArray<number>) => NestedArray,
  gInvFn: (x: ReadonlyArray<number>) => NestedArray,
  x: number[],
): number[][][][] {
  const engine = new MathTSEngine();
  const t = lowerNode(
    node,
    {
      tensors: new Map<string, number[] | number[][]>([
        ['g', asNested(gFn(x))],
        ['g_inv', asNested(gInvFn(x))],
        ['x', x],
      ]),
      fields: new Map([
        ['g', (xs: ReadonlyArray<number>) => asNested(gFn(xs))],
        ['g_inv', (xs: ReadonlyArray<number>) => asNested(gInvFn(xs))],
      ]),
      dimension: 4,
    },
    engine,
  );
  return engine.toNested(t) as number[][][][];
}

const maxAbs = (T: number[][][][]): number => Math.max(...T.flat(3).map(Math.abs));

describe('weyl-tensor lowering values', () => {
  it('Schwarzschild (vacuum): C^ρ_{σμν} equals the closed-form Riemann tensor', () => {
    const M = 1.989e30;
    const x = [0, 5 * schwarzschildRs(M), Math.PI / 3, 0];
    const C = weylAt(schwarzschildGFn(M) as never, schwarzschildGInverseFn(M) as never, x);
    const R = schwarzschildRiemannFn(M)(x);
    const scale = maxAbs(R);
    let worst = 0;
    for (let a = 0; a < 4; a++)
      for (let b = 0; b < 4; b++)
        for (let c = 0; c < 4; c++)
          for (let d = 0; d < 4; d++) worst = Math.max(worst, Math.abs(C[a]![b]![c]![d]! - R[a]![b]![c]![d]!));
    expect(worst / scale).toBeLessThan(1e-3);
    // R^t_{rtr} = r_s / (r² (r − r_s)), the coordinate-basis closed form of the fixture.
    const rs = schwarzschildRs(M);
    const r = x[1]!;
    expect(Math.abs(C[0]![1]![0]![1]! / (rs / (r * r * (r - rs))) - 1)).toBeLessThan(1e-3);
  });

  it('de Sitter (conformally flat): C^ρ_{σμν} vanishes against a Riemann tensor that does not', () => {
    // Λ = 1 at r = 1, the scale of tests/dimensional/ricci.test.ts (inside the horizon r = √3).
    const LAMBDA = 1;
    const x = [0, 1, Math.PI / 4, 0];
    const C = weylAt(deSitterGFn(LAMBDA), deSitterGInverseFn(LAMBDA) as never, x);
    const R = deSitterRiemannFn(LAMBDA)(x);
    expect(maxAbs(R)).toBeGreaterThan(0);
    expect(maxAbs(C) / maxAbs(R)).toBeLessThan(1e-3);
  });
});
