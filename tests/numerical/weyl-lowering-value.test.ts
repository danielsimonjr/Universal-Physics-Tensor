/**
 * Values of the `weyl-tensor` lowering (`lowerWeylTensor`) through `lowerNode`.
 * Schwarzschild is a vacuum, so its Weyl tensor equals its Riemann tensor.
 * De Sitter is conformally flat, so its Weyl tensor is zero. Its Riemann tensor is not zero.
 *
 * The comparisons use a scale that does not depend on the coordinate units. A coordinate
 * component of R^ρ_{σμν} carries c² for each t slot and a length for each angular slot, so a
 * maximum over raw components compares numbers in different units. `frameMax` reads each
 * component in the orthonormal frame of the diagonal metric, and `contract` gives the
 * invariant T_{abcd}T^{abcd}.
 */
import { describe, expect, it } from 'vitest';
import { lowerNode } from '../../src/numerical/lowering.js';
import { contractRiemannJS, riemannUpperAt } from '../../src/numerical/curvature-lowering-helpers.js';
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
const square = (v: NestedArray | Float64Array): number[][] =>
  v instanceof Float64Array ? nest(v) : asNested(v as NestedArray);

/** The largest |T^â_{b̂ĉd̂}| in the orthonormal frame of a diagonal metric g. */
function frameMax(T: number[][][][], g: number[][]): number {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) expect(g[i]![j]).toBe(0);
  const n = [0, 1, 2, 3].map((i) => Math.sqrt(Math.abs(g[i]![i]!)));
  let m = 0;
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++)
        for (let d = 0; d < 4; d++) m = Math.max(m, Math.abs((T[a]![b]![c]![d]! * n[a]!) / (n[b]! * n[c]! * n[d]!)));
  return m;
}

/** The invariant T_{abcd} T^{abcd} of a tensor stored as T^a_{bcd}. */
function contract(T: number[][][][], g: number[][], gInv: number[][]): number {
  let s = 0;
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++)
        for (let d = 0; d < 4; d++) {
          let lower = 0;
          for (let p = 0; p < 4; p++) lower += g[a]![p]! * T[p]![b]![c]![d]!;
          let upper = 0;
          for (let q = 0; q < 4; q++)
            for (let r = 0; r < 4; r++)
              for (let w = 0; w < 4; w++) upper += gInv[b]![q]! * gInv[c]![r]! * gInv[d]![w]! * T[a]![q]![r]![w]!;
          s += lower * upper;
        }
  return s;
}

const minus = (A: number[][][][], B: number[][][][]): number[][][][] =>
  A.map((x, a) => x.map((y, b) => y.map((z, c) => z.map((v, d) => v - B[a]![b]![c]![d]!))));

describe('weyl-tensor lowering values', () => {
  it('Schwarzschild (vacuum): C^ρ_{σμν} equals the closed-form Riemann tensor', () => {
    const M = 1.989e30;
    const x = [0, 5 * schwarzschildRs(M), Math.PI / 3, 0];
    const C = weylAt(schwarzschildGFn(M) as never, schwarzschildGInverseFn(M) as never, x);
    const R = schwarzschildRiemannFn(M)(x);
    const g = square(schwarzschildGFn(M)(x) as NestedArray);
    expect(frameMax(minus(C, R), g) / frameMax(R, g)).toBeLessThan(1e-6);
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
    const g = deSitterGFn(LAMBDA)(x);
    expect(frameMax(R, g)).toBeGreaterThan(0);
    expect(frameMax(C, g) / frameMax(R, g)).toBeLessThan(1e-7);
  });

  it('de Sitter at the SI cosmological constant: C^ρ_{σμν} vanishes against R^ρ_{σμν}', () => {
    const LAMBDA = 1.1e-52; // m⁻²
    const x = [0, 5e25, Math.PI / 4, 0];
    const C = weylAt(deSitterGFn(LAMBDA), deSitterGInverseFn(LAMBDA) as never, x);
    const R = deSitterRiemannFn(LAMBDA)(x);
    const g = deSitterGFn(LAMBDA)(x);
    const gInv = square(deSitterGInverseFn(LAMBDA)(x));
    // The raw maximum compares components in different units: it is about 1.4e16 here.
    expect(maxAbs(C) / maxAbs(R)).toBeGreaterThan(1e10);
    expect(frameMax(C, g) / frameMax(R, g)).toBeLessThan(1e-7);
    expect(Math.sqrt(Math.abs(contract(C, g, gInv) / contract(R, g, gInv)))).toBeLessThan(1e-7);
  });

  it('de Sitter at the SI cosmological constant: the shared pipeline gives Riemann and R = 4Λ', () => {
    // riemannUpperAt is the Γ and ∂Γ pipeline that the Riemann, Ricci, Einstein,
    // Kretschmann and Weyl lowerings share.
    const LAMBDA = 1.1e-52;
    const x = [0, 5e25, Math.PI / 4, 0];
    const gFn = deSitterGFn(LAMBDA);
    const g = gFn(x);
    const gInv = square(deSitterGInverseFn(LAMBDA)(x));
    const fd = riemannUpperAt(x, gFn, ((xs: ReadonlyArray<number>) => deSitterGInverseFn(LAMBDA)(xs)) as never, 4, new MathTSEngine());
    const exact = deSitterRiemannFn(LAMBDA)(x);
    expect(frameMax(minus(fd, exact), g) / frameMax(exact, g)).toBeLessThan(1e-7);
    const ric = contractRiemannJS(fd.flat(3), 4, { upperAxis: 0, lowerAxis: 2, outAxes: [1, 3] });
    let scalar = 0;
    for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) scalar += gInv[m]![n]! * ric[m]![n]!;
    expect(Math.abs(scalar / (4 * LAMBDA) - 1)).toBeLessThan(1e-7);
  });
});
