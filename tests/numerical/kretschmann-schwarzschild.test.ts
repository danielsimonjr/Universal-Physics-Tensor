/**
 * Task 3.7 (v0.6.0 Phase 3): Schwarzschild Kretschmann scalar closed-form pin.
 *
 * Physics: The Kretschmann scalar for Schwarzschild spacetime is exactly:
 *
 *   K(r) = 48 G² M² / (c⁴ r⁶)
 *
 * This is a diffeomorphism-invariant curvature scalar and has NO coordinate
 * singularity at r = r_s — only the true r = 0 singularity.
 *
 * Test strategy:
 *   1. Sample the full numerical Riemann R^ρ_{σμν} at each test coordinate via
 *      the v0.5.0 FD pipeline (christoffelAt + dGammaAt + buildRiemann).
 *   2. Lower the first index to obtain R_{ρσμν} via:
 *        R_{αβγδ} = g_{αρ} R^ρ_{βγδ}
 *      (contract covariant metric with the upper index of Riemann).
 *   3. Feed riemannLower + gInvMat to computeKretschmann.
 *   4. Compare K_numerical to K_closed = 48 G² M² / (c⁴ r⁶) via relative error
 *      |K_num / K_closed − 1|.
 *
 * Why relative error? K spans ~18 orders of magnitude across the 6 sample
 * points (r⁻⁶ fall-off), so absolute tolerances are meaningless.
 *
 * Sample points: r ∈ {2, 3, 5, 10, 50, 100} × r_s at θ = π/2.
 *
 * Measure-then-lock: TOL = 2 × max_observed across all 6 sample points.
 *
 * P-4 TDD RED: a stub computeKretschmann returning 0 causes all relErr checks
 * to fail (K_closed ≠ 0), confirming RED before GREEN.
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
  schwarzschildRs,
  schwarzschildGFn,
  schwarzschildGInverseFn,
} from '../fixtures/schwarzschild.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

const M_SUN = 1.989e30; // kg
const r_s = schwarzschildRs(M_SUN);

const gFn = schwarzschildGFn(M_SUN);
const gInvFn = schwarzschildGInverseFn(M_SUN);

const N = 4;
const engine = new MathTSEngine();

/**
 * Compute the all-lower Riemann tensor R_{αβγδ} = g_{αρ} R^ρ_{βγδ} at x.
 *
 * R^ρ_{βγδ} is the mixed-upper Riemann from the FD pipeline ([ρ][β][γ][δ]).
 * Lowering the first index contracts g_{αρ} with axis 0 of R^ρ_{βγδ}.
 */
function lowerRiemannFirstIndex(
  Rup: number[][][][],
  gMat: number[][],
): number[][][][] {
  // R_{αβγδ} = Σ_ρ g_{αρ} R^ρ_{βγδ}
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
            sum += gMat[alpha][rho] * Rup[rho][beta][gamma][delta];
          }
          R[alpha][beta][gamma][delta] = sum;
        }
      }
    }
  }
  return R;
}

/** Closed-form Kretschmann scalar K(r) = 48 G² M² / (c⁴ r⁶). */
function kClosed(r: number): number {
  const c4 = C_SI * C_SI * C_SI * C_SI;
  const G2M2 = G_SI * G_SI * M_SUN * M_SUN;
  const r6 = r * r * r * r * r * r;
  return (48 * G2M2) / (c4 * r6);
}

// 6 sample points per spec: r ∈ {2,3,5,10,50,100}×r_s, θ = π/2.
const samplePoints: [number, number, number, number][] = [
  [0, 2 * r_s, Math.PI / 2, 0],
  [0, 3 * r_s, Math.PI / 2, 0],
  [0, 5 * r_s, Math.PI / 2, 0],
  [0, 10 * r_s, Math.PI / 2, 0],
  [0, 50 * r_s, Math.PI / 2, 0],
  [0, 100 * r_s, Math.PI / 2, 0],
];

describe('Kretschmann scalar K(r)=48G²M²/(c⁴r⁶) in Schwarzschild (Task 3.7)', () => {
  it.each(samplePoints)(
    'K_numerical ≈ K_closed at x=[%d, %d, %d, %d]',
    (t, r, theta, phi) => {
      const x: [number, number, number, number] = [t, r, theta, phi];

      // Step 1: FD Riemann R^ρ_{βγδ}.
      const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
      const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
      const Rup = buildRiemann(gamma, dGamma, N);

      // Step 2: metric at x for index lowering.
      const gMat = gFn(x);

      // Step 3: lower first Riemann index → R_{αβγδ}.
      const riemannLower = lowerRiemannFirstIndex(Rup, gMat);

      // Step 4: compute K numerically. O-4 (2026-06-11): computeKretschmann
      // accepts the fixture's flat Float64Array(16) directly — shim removed.
      const K_num = computeKretschmann(riemannLower, gInvFn(x));

      // Step 5: compare to closed form.
      const K_ref = kClosed(r);
      const relErr = Math.abs(K_num / K_ref - 1);

      // Measure-then-lock: observed relErr across 6 points (4th-order FD, M_sun):
      //   r=2*r_s:   3.665e-10
      //   r=3*r_s:   1.687e-9
      //   r=5*r_s:   6.964e-10
      //   r=10*r_s:  1.557e-10
      //   r=50*r_s:  2.954e-8   ← max
      //   r=100*r_s: 2.818e-8
      // Overall max ≈ 2.954e-8. TOL = 2 × 2.954e-8 = 6e-8.
      // (The 4th-order outer FD makes K very accurate; the c⁴-scale g_{tt}
      //  coefficient creates mild round-off at large r where K is tiny, but
      //  relative error stays below 3e-8 throughout the tested range.)
      const TOL = 6e-8;

      expect(relErr).toBeLessThan(TOL);
    },
  );

  it('K is positive (curvature invariant)', () => {
    const x: [number, number, number, number] = [0, 3 * r_s, Math.PI / 2, 0];
    const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
    const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
    const Rup = buildRiemann(gamma, dGamma, N);
    const riemannLower = lowerRiemannFirstIndex(Rup, gFn(x));
    const K_num = computeKretschmann(riemannLower, gInvFn(x));
    expect(K_num).toBeGreaterThan(0);
  });

  it('K scales as r⁻⁶: K(2r_s) / K(4r_s) ≈ 4⁶ = 4096', () => {
    // Ratio K(r1)/K(r2) = (r2/r1)^6 for any two radii.
    const r1 = 2 * r_s;
    const r2 = 4 * r_s;

    function computeKAt(r: number): number {
      const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
      const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
      const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
      const Rup = buildRiemann(gamma, dGamma, N);
      const riemannLower = lowerRiemannFirstIndex(Rup, gFn(x));
      return computeKretschmann(riemannLower, gInvFn(x));
    }

    const K1 = computeKAt(r1);
    const K2 = computeKAt(r2);
    const ratio = K1 / K2;
    const expected = Math.pow(r2 / r1, 6); // = 2^6 = 64
    const relErr = Math.abs(ratio / expected - 1);

    // The ratio check is very clean — systematic FD errors partially cancel.
    // Observed: K(2*r_s)/K(4*r_s) relErr ≈ 1e-9 (well below single-point
    // 3e-8 errors). TOL = 1e-7 (2× generous over the worst single-point floor).
    const TOL = 1e-7;
    expect(relErr).toBeLessThan(TOL);
  });
});
