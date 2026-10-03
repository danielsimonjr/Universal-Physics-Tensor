/**
 * Value-identity pins for the 2026-06-11 `computeKretschmann`
 * factored-raising optimization (todo.md "Kretschmann O(4⁸) symmetry
 * optimization" item, resolved as loop-factoring — see the rejected
 * pair-iteration alternative documented in src/numerical/kretschmann.ts).
 *
 * The optimization replaces the naive O(4⁸) four-index raise-inside-the-
 * contraction with FOUR successive single-index raisings (4 × 4⁵ mult-adds).
 * That is a pure reassociation of the quadruple sum, mathematically
 * identical for ARBITRARY input — including non-antisymmetric tensors,
 * which matters because the FD-built Riemann is only approximately
 * antisymmetric. These tests pin K against an inline copy of the ORIGINAL
 * naive implementation (verbatim from the pre-optimization
 * src/numerical/kretschmann.ts) to relative 1e-15 on:
 *
 *   1. Schwarzschild at r = 3·r_s (the Mercury-orbit bench point),
 *   2. Painlevé-Gullstrand at r = r_s (horizon — Schwarzschild-coords-
 *      impossible; exercises a metric with non-zero off-diagonals),
 *   3. a seeded-RANDOM, deliberately NON-symmetric rank-4 tensor with a
 *      random non-symmetric "inverse metric" — proving the optimized path
 *      assumes NO input symmetry whatsoever.
 *
 * Plus an O-4 widening pin: nested number[][] and flat Float64Array(16)
 * metricInverse inputs produce bit-identical K.
 */

import { describe, it, expect } from 'vitest';
import { computeKretschmann } from '../../src/numerical/kretschmann.js';
import { riemannLowerAt } from '../../src/numerical/curvature-lowering-helpers.js';
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

const M_SUN = 1.989e30; // kg
const r_s = schwarzschildRs(M_SUN);
const N = 4;
const engine = new MathTSEngine();

/**
 * REFERENCE: the original naive O(4⁸) implementation, copied verbatim from
 * the pre-optimization src/numerical/kretschmann.ts (v0.6.0 Task 3.6).
 * Kept here as the ground truth the optimized path must reproduce.
 */
function computeKretschmannNaive(
  riemannLower: number[][][][],
  metricInverse: number[][],
): number {
  let K = 0;
  for (let rho = 0; rho < 4; rho++) {
    for (let sigma = 0; sigma < 4; sigma++) {
      for (let mu = 0; mu < 4; mu++) {
        for (let nu = 0; nu < 4; nu++) {
          let raised = 0;
          for (let a = 0; a < 4; a++) {
            for (let b = 0; b < 4; b++) {
              for (let c = 0; c < 4; c++) {
                for (let d = 0; d < 4; d++) {
                  raised += metricInverse[rho][a] * metricInverse[sigma][b]
                          * metricInverse[mu][c] * metricInverse[nu][d]
                          * riemannLower[a][b][c][d];
                }
              }
            }
          }
          K += riemannLower[rho][sigma][mu][nu] * raised;
        }
      }
    }
  }
  return K;
}

/** Unflatten a row-major Float64Array(16) for the naive reference impl. */
function unflatten4x4(flat: Float64Array): number[][] {
  return Array.from({ length: N }, (_, mu) =>
    Array.from({ length: N }, (_, nu) => flat[mu * N + nu]),
  );
}

/** Deterministic LCG (Numerical Recipes constants) for the random pin. */
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296; // [0, 1)
  };
}

describe('computeKretschmann factored-raising value-identity pins', () => {
  it('Schwarzschild @ r=3·r_s: optimized K matches naive K to relative 1e-15', () => {
    const x: readonly number[] = [0, 3 * r_s, Math.PI / 2, 0];
    const gFn = schwarzschildGFn(M_SUN);
    const gInvFn = schwarzschildGInverseFn(M_SUN);
    const rLower = riemannLowerAt(x, gFn, gInvFn, N, engine);
    const gInvFlat = gInvFn(x);

    const K_opt = computeKretschmann(rLower, gInvFlat);
    const K_ref = computeKretschmannNaive(rLower, unflatten4x4(gInvFlat));

    expect(Number.isFinite(K_opt)).toBe(true);
    expect(K_ref).not.toBe(0);
    expect(Math.abs(K_opt / K_ref - 1)).toBeLessThan(1e-15);
  });

  it('Painlevé-Gullstrand @ r=r_s (horizon): optimized K matches naive K to relative 1e-15', () => {
    const x: readonly number[] = [0, r_s, Math.PI / 2, 0];
    const gFn = painleveGullstrandGFn(M_SUN);
    const gInvFn = painleveGullstrandGInverseFn(M_SUN);
    const rLower = riemannLowerAt(x, gFn, gInvFn, N, engine);
    const gInvFlat = gInvFn(x);

    const K_opt = computeKretschmann(rLower, gInvFlat);
    const K_ref = computeKretschmannNaive(rLower, unflatten4x4(gInvFlat));

    expect(Number.isFinite(K_opt)).toBe(true);
    expect(K_ref).not.toBe(0);
    expect(Math.abs(K_opt / K_ref - 1)).toBeLessThan(1e-15);
  });

  it('random NON-symmetric tensor: optimized K matches naive K to relative 1e-15 (no symmetry assumption)', () => {
    // Deliberately non-(anti)symmetric inputs: every component independent.
    // The factored raise is a pure reassociation, so it must agree for
    // arbitrary input — this is the pin that distinguishes loop-factoring
    // from the rejected pair-iteration shortcut (which is ONLY valid under
    // exact Riemann antisymmetry).
    const rand = makeLcg(0xC0FFEE);
    const R: number[][][][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () =>
          Array.from({ length: 4 }, () => rand() * 2 - 1),
        ),
      ),
    );
    // Random non-symmetric "inverse metric" (no symmetry, no positive-
    // definiteness — the algorithm must not care).
    const gInv: number[][] = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => rand() * 2 - 1),
    );

    const K_opt = computeKretschmann(R, gInv);
    const K_ref = computeKretschmannNaive(R, gInv);

    expect(Number.isFinite(K_opt)).toBe(true);
    expect(K_ref).not.toBe(0);
    expect(Math.abs(K_opt / K_ref - 1)).toBeLessThan(1e-15);
  });

  it('O-4 widening: nested number[][] and flat Float64Array(16) metricInverse give bit-identical K', () => {
    const x: readonly number[] = [0, 3 * r_s, Math.PI / 2, 0];
    const gFn = schwarzschildGFn(M_SUN);
    const gInvFn = schwarzschildGInverseFn(M_SUN);
    const rLower = riemannLowerAt(x, gFn, gInvFn, N, engine);
    const gInvFlat = gInvFn(x);

    const K_flat = computeKretschmann(rLower, gInvFlat);
    const K_nested = computeKretschmann(rLower, unflatten4x4(gInvFlat));

    // The entry normalizer reproduces the same flat layout either way —
    // identical arithmetic, identical result.
    expect(K_nested).toBe(K_flat);
  });
});
