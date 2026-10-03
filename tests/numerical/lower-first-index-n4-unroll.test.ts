/**
 * Value-identity pins for the N=4 unrolled branch of `lowerFirstIndex`
 * (PR #174). `riemannLowerAt` lowers R^ρ_{σμν} with the unrolled branch when
 * N === 4. These tests rebuild R^ρ_{σμν} through the same exported pipeline
 * (christoffelAt + dGammaAt + buildRiemann) and lower it with an inline copy
 * of the GENERIC loop. The two results must agree to relative 1e-15 on:
 *
 *   1. Schwarzschild at r = 3·r_s (diagonal metric),
 *   2. Painlevé-Gullstrand at r = r_s (non-zero off-diagonal metric),
 *   3. a seeded-random, x-dependent, dense symmetric metric (every g_{aρ}
 *      non-zero, so every term of the contraction is exercised).
 */

import { describe, it, expect } from 'vitest';
import {
  riemannLowerAt,
  christoffelAt,
  dGammaAt,
  buildRiemann,
} from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import {
  schwarzschildRs,
  schwarzschildGFn,
  schwarzschildGInverseFn,
} from '../fixtures/schwarzschild.js';
import {
  painleveGullstrandGFn,
  painleveGullstrandGInverseFn,
} from '../../src/numerical/painleve-gullstrand-metric.js';

const N = 4;
const engine = new MathTSEngine();
const M_SUN = 1.989e30;
const r_s = schwarzschildRs(M_SUN);

type Fn = (x: ReadonlyArray<number>) => number[][];

/** GENERIC reference: verbatim copy of the non-unrolled lowerFirstIndex loop. */
function lowerFirstIndexGeneric(R: number[][][][], gFlat: number[]): number[][][][] {
  const out = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => Array.from({ length: N }, () => new Array(N).fill(0))),
  );
  for (let a = 0; a < N; a++)
    for (let sig = 0; sig < N; sig++)
      for (let mu = 0; mu < N; mu++)
        for (let nu = 0; nu < N; nu++) {
          let sum = 0;
          for (let rho = 0; rho < N; rho++) sum += gFlat[a * N + rho] * R[rho][sig][mu][nu];
          out[a][sig][mu][nu] = sum;
        }
  return out;
}

function toNested(g: unknown): number[][] {
  if (g instanceof Float64Array) return [0, 1, 2, 3].map((i) => Array.from(g.slice(i * 4, i * 4 + 4)));
  return g as number[][];
}

function invert4(m: number[][]): number[][] {
  const a = m.map((row, i) => [...row, ...[0, 1, 2, 3].map((j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let k = 0; k < 8; k++) a[c][k] /= d;
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < 8; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((row) => row.slice(4));
}

/** Seeded, dense, symmetric, x-dependent metric (Lorentzian-ish base + smooth perturbation). */
function randomMetric(seed: number): { gFn: Fn; gInvFn: Fn } {
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
  const base = [-1, 1, 1, 1];
  const A: number[][] = [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => 0.2 * rnd()));
  const B: number[][] = [0, 1, 2, 3].map(() => [0, 1, 2, 3].map(() => rnd()));
  const gFn: Fn = (x) => {
    const g: number[][] = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++)
      for (let j = i; j < 4; j++) {
        const v =
          (i === j ? base[i] : 0) +
          A[i][j] * Math.sin(x[0] * B[i][j] + x[1] * B[j][i] + 0.3 * x[2] - 0.7 * x[3]);
        g[i][j] = v;
        g[j][i] = v;
      }
    return g;
  };
  return { gFn, gInvFn: (x) => invert4(gFn(x)) };
}

function comparePaths(x: ReadonlyArray<number>, gFn: Fn, gInvFn: Fn): number {
  const gamma = christoffelAt(x, gFn as never, gInvFn as never, N, engine);
  const dGamma = dGammaAt(x, gFn as never, gInvFn as never, N, engine);
  const Rup = buildRiemann(gamma, dGamma, N);
  const gFlat = toNested(gFn(x)).flat();
  const expected = lowerFirstIndexGeneric(Rup, gFlat);
  const actual = riemannLowerAt(x, gFn as never, gInvFn as never, N, engine);

  let scale = 0;
  for (const v of expected.flat(3)) scale = Math.max(scale, Math.abs(v));
  expect(scale).toBeGreaterThan(0);
  let maxRel = 0;
  const e = expected.flat(3);
  const a = actual.flat(3);
  expect(a.length).toBe(256);
  for (let i = 0; i < 256; i++) maxRel = Math.max(maxRel, Math.abs(a[i] - e[i]) / scale);
  expect(maxRel).toBeLessThanOrEqual(1e-15);
  return maxRel;
}

describe('lowerFirstIndex N=4 unrolled branch == generic loop', () => {
  it('Schwarzschild at r = 3 r_s', () => {
    comparePaths(
      [0, 3 * r_s, Math.PI / 2, 0],
      schwarzschildGFn(M_SUN) as unknown as Fn,
      schwarzschildGInverseFn(M_SUN) as unknown as Fn,
    );
  });

  it('Painlevé-Gullstrand at r = r_s (off-diagonal metric)', () => {
    comparePaths(
      [0, r_s, Math.PI / 2, 0],
      painleveGullstrandGFn(M_SUN) as unknown as Fn,
      painleveGullstrandGInverseFn(M_SUN) as unknown as Fn,
    );
  });

  it('seeded random dense symmetric x-dependent metrics', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const { gFn, gInvFn } = randomMetric(seed);
      comparePaths([0.3 * seed, 1.1, 0.7, -0.4 * seed], gFn, gInvFn);
    }
  });
});
