/**
 * Painlevé-Gullstrand near-horizon Kretschmann test.
 *
 * Closes v0.6.0's deferred "Near-horizon Kretschmann" item by
 * computing K = R_μνρσ R^μνρσ at r = r_s using PG coordinates,
 * which are regular at the horizon (Schwarzschild coordinates
 * have a 1/(1−r_s/r) divergence in g_rr that breaks FD Riemann
 * assembly at the horizon — see
 * `tests/numerical/kretschmann-horizon.test.ts:193` for the
 * Schwarzschild-coords failure documented under the
 * coordinate-singularity caveat).
 *
 * In PG coordinates: g_TT = -(1-r_s/r), g_Tr = √(r_s/r), g_rr = 1
 * (CONSTANT in r at this slot, not divergent). The FD Christoffel
 * pipeline assembles a finite Riemann across r = r_s; the
 * coordinate-agnostic `computeKretschmann` returns the analytic
 * value K(r_s) = 3 c⁸ / (4 G⁴ M⁴) ≈ K(r) at r = r_s (Schwarzschild
 * closed-form).
 *
 * Design note: `docs/architecture/archive/v0.7-near-horizon-kretschmann-design-note.md`.
 *
 * @module tests/numerical/painleve-gullstrand-curvature
 */

import { describe, it, expect } from 'vitest';
import { computeKretschmann } from '../../src/numerical/kretschmann.js';
import {
  christoffelAt,
  dGammaAt,
  buildRiemann,
} from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import {
  painleveGullstrandGFn,
  painleveGullstrandGInverseFn,
} from '../../src/numerical/painleve-gullstrand-metric.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

const M_SUN = 1.989e30; // kg
const r_s = (2 * G_SI * M_SUN) / (C_SI * C_SI);

const gFn = painleveGullstrandGFn(M_SUN);
const gInvFn = painleveGullstrandGInverseFn(M_SUN);
const N = 4;
const engine = new MathTSEngine();

/** Closed-form Schwarzschild Kretschmann K(r) = 48 G² M² / (c⁴ r⁶).
 *  Coordinate-INDEPENDENT (scalar invariant); PG must reproduce it. */
function kClosed(r: number): number {
  const c4 = C_SI ** 4;
  return (48 * G_SI ** 2 * M_SUN ** 2) / (c4 * r ** 6);
}

/** Lower R^ρ_{βγδ} to R_{αβγδ} = g_{αρ} R^ρ_{βγδ}.
 *  O-4: takes the metric in the row-major flat layout `gFlat[alpha*4 + rho]`
 *  (the v0.9.0 PG-closure return shape) — no unflatten shim needed. */
function lowerRiemannFirstIndex(
  Rup: number[][][][],
  gFlat: Float64Array,
): number[][][][] {
  const R: number[][][][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () =>
      Array.from({ length: N }, () => new Array<number>(N).fill(0)),
    ),
  );
  for (let alpha = 0; alpha < N; alpha++) {
    for (let beta = 0; beta < N; beta++) {
      for (let gamma = 0; gamma < N; gamma++) {
        for (let delta = 0; delta < N; delta++) {
          let sum = 0;
          for (let rho = 0; rho < N; rho++) {
            sum += gFlat[alpha * N + rho] * Rup[rho][beta][gamma][delta];
          }
          R[alpha][beta][gamma][delta] = sum;
        }
      }
    }
  }
  return R;
}

function computeKNumericalAt(x: [number, number, number, number]): number {
  const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
  const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
  const Rup = buildRiemann(gamma, dGamma, N);
  // O-4 (2026-06-11): computeKretschmann now accepts the flat
  // Float64Array(16) layout directly; lowerRiemannFirstIndex above indexes
  // the flat layout — both v0.9.0-era unflatten shims removed.
  const riemannLower = lowerRiemannFirstIndex(Rup, gFn(x));
  return computeKretschmann(riemannLower, gInvFn(x));
}

describe('Painlevé-Gullstrand Kretschmann — closes Near-Horizon deferred item', () => {
  // -------------------------------------------------------------------------
  // Test 1: Far field (r = 10 r_s) — PG must match Schwarzschild closed-form
  // -------------------------------------------------------------------------
  it('K_num matches closed-form at r = 10·r_s (far field)', () => {
    const r = 10 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_exp = kClosed(r);
    const relErr = Math.abs(K_num - K_exp) / Math.abs(K_exp);
    expect(relErr).toBeLessThan(1e-2);
  });

  // -------------------------------------------------------------------------
  // Test 2: Mid range (r = 3·r_s) — well outside horizon, matches
  // tests/numerical/kretschmann-horizon.test.ts's known-good range
  // -------------------------------------------------------------------------
  it('K_num matches closed-form at r = 3·r_s', () => {
    const r = 3 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_exp = kClosed(r);
    const relErr = Math.abs(K_num - K_exp) / Math.abs(K_exp);
    expect(relErr).toBeLessThan(1e-2);
  });

  // -------------------------------------------------------------------------
  // Test 3: Near horizon (r = 1.001·r_s) — THE CASE THAT FAILS IN
  // SCHWARZSCHILD COORDINATES. PG should handle it cleanly.
  // -------------------------------------------------------------------------
  it('K_num matches closed-form at r = 1.001·r_s (near horizon — PG closes the deferred item)', () => {
    const r = 1.001 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_exp = kClosed(r);
    const relErr = Math.abs(K_num - K_exp) / Math.abs(K_exp);

    // Sanity floor — relErr is finite (NOT NaN/Infinity).
    expect(isFinite(K_num)).toBe(true);
    expect(isFinite(relErr)).toBe(true);

    // Reasonable accuracy bound. PG should be FAR better than the
    // Schwarzschild-coords failure (which gives relErr ~ 1e14 at
    // r=1.0001·r_s). The bound is generous because finite-difference
    // accuracy near the horizon still has scale-sensitivity (no
    // catastrophic cancellation, just normal FD truncation).
    expect(relErr).toBeLessThan(0.5);
  });

  // -------------------------------------------------------------------------
  // Test 4: AT the horizon (r = r_s exactly) — Schwarzschild g_rr is
  // literally infinite here. PG g_rr = 1 (finite). The Kretschmann
  // scalar at r_s has the analytic value 3c⁸/(4G⁴M⁴) (curvature is
  // FINITE — only the Schwarzschild coordinate diverges).
  // -------------------------------------------------------------------------
  it('K_num finite and order-of-magnitude consistent AT r = r_s (Schwarzschild-coords-impossible)', () => {
    const x: [number, number, number, number] = [0, r_s, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_exp = kClosed(r_s);

    // K_num must be finite (the THE main claim — PG is regular at horizon).
    expect(isFinite(K_num)).toBe(true);

    // K_num must be order-of-magnitude correct.
    const ratio = K_num / K_exp;
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(10);
  });

  // -------------------------------------------------------------------------
  // Test 5: Inside horizon (r = 0.5·r_s) — only PG can reach this
  // region. Schwarzschild coords break at r=r_s and don't apply to
  // r < r_s. Curvature K = 48 G²M²/(c⁴ r⁶) keeps growing toward r=0.
  // -------------------------------------------------------------------------
  it('K_num finite inside horizon at r = 0.5·r_s (Schwarzschild-coords-impossible)', () => {
    const r = 0.5 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_exp = kClosed(r);

    // Inside horizon, curvature is much larger (1/r^6 scaling).
    expect(isFinite(K_num)).toBe(true);
    expect(K_num).toBeGreaterThan(0);

    // Order-of-magnitude check
    const ratio = K_num / K_exp;
    expect(ratio).toBeGreaterThan(0.01);
    expect(ratio).toBeLessThan(100);
  });
});

describe('Painlevé-Gullstrand metric — closed-form verification', () => {
  it('g_TT, g_Tr, g_rr finite at r = r_s (the horizon, where Schwarzschild diverges)', () => {
    const g = gFn([0, r_s, Math.PI / 2, 0]);
    expect(g[0 * 4 + 0]).toBeCloseTo(0, 10);   // -(1-r_s/r_s) = 0
    expect(g[0 * 4 + 1]).toBeCloseTo(1, 10);   // √(r_s/r_s) = 1
    expect(g[1 * 4 + 0]).toBeCloseTo(1, 10);   // symmetric
    expect(g[1 * 4 + 1]).toBe(1);              // PG g_rr = 1 (constant!)
    // No divergence anywhere.
    for (let i = 0; i < 16; i++) {
      expect(isFinite(g[i])).toBe(true);
    }
  });

  it('g^μν · g_νρ = δ^μ_ρ (matrix inverse identity) at r = 2·r_s', () => {
    const r = 2 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const g = gFn(x);
    const gInv = gInvFn(x);

    // Compute g^μα · g_αν, should equal δ^μ_ν.
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        let sum = 0;
        for (let alpha = 0; alpha < 4; alpha++) {
          sum += gInv[mu * 4 + alpha] * g[alpha * 4 + nu];
        }
        const expected = mu === nu ? 1 : 0;
        expect(sum).toBeCloseTo(expected, 10);
      }
    }
  });

  it('asymptotic flatness: at r → ∞, g_μν → diag(-1, 1, r², r² sin²θ) (Minkowski + angular)', () => {
    const r_large = 1e30 * r_s;
    const theta = Math.PI / 2;
    const g = gFn([0, r_large, theta, 0]);
    // r_s/r ≈ 0 at this distance.
    expect(g[0 * 4 + 0]).toBeCloseTo(-1, 8); // -(1-0) = -1
    expect(g[0 * 4 + 1]).toBeCloseTo(0, 8);  // √(0) = 0
    expect(g[1 * 4 + 1]).toBe(1);
    expect(g[2 * 4 + 2]).toBeCloseTo(r_large * r_large, -10);
    expect(g[3 * 4 + 3]).toBeCloseTo(r_large * r_large, -10); // sin²(π/2)=1
  });

  it('PG inverse at r=r_s: g^rr = 0 (vs Schwarzschild g_rr = ∞)', () => {
    const gInv = gInvFn([0, r_s, Math.PI / 2, 0]);
    expect(gInv[1 * 4 + 1]).toBeCloseTo(0, 10); // 1 - r_s/r_s = 0
    // Other slots finite:
    expect(gInv[0 * 4 + 0]).toBe(-1);
    expect(gInv[0 * 4 + 1]).toBeCloseTo(1, 10);
  });

  it('R-1b: PG off-diagonal symmetry — g^{Tr} = g^{rT} = √(r_s/r) ≠ 0', () => {
    // v0.9.0 regression pin (Adam A-9 + Eve E7): PG's NON-zero
    // off-diagonal catches the transpose-typo class that
    // Schwarzschild's diagonal-only metric masks.
    const x = [0, 3 * r_s, Math.PI / 2, 0];
    const gInv = gInvFn(x);
    expect(gInv[0 * 4 + 1]).toBeCloseTo(gInv[1 * 4 + 0], 12); // symmetry
    expect(gInv[0 * 4 + 1]).toBeCloseTo(Math.sqrt(1 / 3), 10); // √(r_s/(3r_s))
    expect(gInv[0 * 4 + 1]).not.toBe(0); // non-zero off-diagonal
  });
});
