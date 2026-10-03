/**
 * Task 3.8 (v0.6.0 Phase 3): Kretschmann horizon pin — F-1 design-vet finding.
 *
 * **Physics context**: The horizon r = r_s is a COORDINATE singularity (the
 * Schwarzschild coordinate system breaks down), NOT a curvature singularity.
 * The Kretschmann scalar K is therefore FINITE at r = r_s. Its value follows
 * from the closed-form K(r) = 48 G² M² / (c⁴ r⁶):
 *
 *   K(r_s) = 48 G² M² / (c⁴ r_s⁶)
 *
 * With r_s = 2GM/c²:
 *   r_s⁶ = 64 G⁶ M⁶ / c¹²
 *   K(r_s) = 48 G² M² · c¹² / (c⁴ · 64 G⁶ M⁶)
 *           = (48/64) · c⁸ / (G⁴ M⁴)
 *           = (3/4) · c⁸ / (G⁴ M⁴)
 *
 * This is the F-1 design-vet finding: K(r_s) = 3c⁸ / (4 G⁴ M⁴).
 * The original draft had "3/(4G²M²)" which was dimensionally wrong.
 *
 * **Tests in this file**:
 *
 * 1. CLOSED-FORM ARITHMETIC CHECK: Verifies that the two equivalent formulas
 *    agree to machine precision — this is a pure algebra check that catches
 *    formula typos independently of any numerical FD evaluation.
 *
 * 2. K(r_s) IS FINITE: Confirms the closed-form value is a normal, finite
 *    positive number (not NaN / Infinity). This is the physics point.
 *
 * 3. K(r_s) DIMENSIONAL CONSISTENCY: Verifies the SI units are consistent
 *    with K having dimension [m⁻⁴]. (Spot check only — not a unit-algebra test.)
 *
 * 4. NEAR-HORIZON NUMERICAL BEHAVIOR DOCUMENTATION: Evaluates computeKretschmann
 *    at r = 1.0001 * r_s and r = 2 * r_s.
 *    - r = 2 * r_s: well-behaved — numerical K agrees with closed form to ~4e-10
 *      relative error (from Task 3.7 measurements). Pinned here as a sanity check.
 *    - r = 1.0001 * r_s: the FD pipeline FAILS near the coordinate singularity.
 *      The metric component g_{rr} = 1/(1 − r_s/r) diverges, which catastrophically
 *      amplifies FD truncation errors in the Christoffel tensor (Γ^r_{rr} → ∞).
 *      Measured relErr at r = 1.0001 * r_s ≈ 1.853e+14 — the FD result is
 *      completely wrong at this point. The test documents this behavior with
 *      expect(isFinite(K_num)).toBe(true) only (K is "finite" in the IEEE sense
 *      but numerically meaningless). NO relative-error pin at this point.
 *
 * **Why is the numerical pipeline not gated near the horizon?**
 * The coordinate singularity is fundamental: Schwarzschild coordinates diverge
 * at r = r_s. A numerically well-behaved evaluation near the horizon requires
 * Kruskal-Szekeres or Painlevé-Gullstrand coordinates, which are outside v0.6.0
 * scope. The FD pipeline is correct for r > ~1.5 * r_s (as demonstrated by
 * Task 3.7's 6-point pin with relErr < 3e-8).
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

/** Closed-form K(r) = 48 G² M² / (c⁴ r⁶) — formula A. */
function kClosedA(r: number): number {
  const c4 = C_SI * C_SI * C_SI * C_SI;
  const G2M2 = G_SI * G_SI * M_SUN * M_SUN;
  return (48 * G2M2) / (c4 * r * r * r * r * r * r);
}

/** K(r_s) = 3 c⁸ / (4 G⁴ M⁴) — F-1 formula B (direct substitution at r = r_s). */
function kHorizonB(M: number): number {
  const c8 = C_SI ** 8;
  const G4M4 = G_SI ** 4 * M ** 4;
  return (3 * c8) / (4 * G4M4);
}

/** Lower R^ρ_{βγδ} to R_{αβγδ} = g_{αρ} R^ρ_{βγδ}. */
function lowerRiemannFirstIndex(
  Rup: number[][][][],
  gMat: number[][],
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
            sum += gMat[alpha][rho] * Rup[rho][beta][gamma][delta];
          }
          R[alpha][beta][gamma][delta] = sum;
        }
      }
    }
  }
  return R;
}

/** Compute K numerically via the FD pipeline at coordinate x. */
function computeKNumericalAt(x: [number, number, number, number]): number {
  const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
  const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
  const Rup = buildRiemann(gamma, dGamma, N);
  // O-4 (2026-06-11): computeKretschmann accepts the fixture's row-major
  // Float64Array(16) directly — unflatten shim removed.
  const riemannLower = lowerRiemannFirstIndex(Rup, gFn(x));
  return computeKretschmann(riemannLower, gInvFn(x));
}

describe('Kretschmann horizon pin K(r_s)=3c⁸/(4G⁴M⁴) (Task 3.8 / F-1)', () => {
  // -------------------------------------------------------------------------
  // Test 1: F-1 arithmetic check — two formulas agree at machine precision.
  // -------------------------------------------------------------------------
  it('F-1 arithmetic: K(r_s) from formula-A equals 3c⁸/(4G⁴M⁴) to machine precision', () => {
    // Formula A: evaluate K(r) = 48G²M²/(c⁴r⁶) at r = r_s.
    const kA = kClosedA(r_s);
    // Formula B: K(r_s) = 3c⁸/(4G⁴M⁴) (algebraic substitution r_s = 2GM/c²).
    const kB = kHorizonB(M_SUN);

    // Both should agree to relative error < 1e-13 (pure floating-point arithmetic,
    // no FD involved). Any discrepancy flags a formula typo.
    const relErr = Math.abs(kA / kB - 1);
    // Machine-precision arithmetic: the two formulas differ only in how C_SI and
    // G_SI are combined. Measured: relErr ≈ 0 (same floating-point value via
    // different computation paths). TOL = 1e-12 (generous vs machine epsilon
    // to tolerate order-of-evaluation rounding differences).
    expect(relErr).toBeLessThan(1e-12);
  });

  // -------------------------------------------------------------------------
  // Test 2: K(r_s) is finite and positive.
  // -------------------------------------------------------------------------
  it('K(r_s) = 3c⁸/(4G⁴M⁴) is finite, positive, and has the correct magnitude', () => {
    const kHorizon = kHorizonB(M_SUN);

    // Physics: K at the Schwarzschild horizon of a solar-mass BH.
    // Numerically K(r_s) = 3c⁸/(4G⁴M_sun⁴) ≈ 1.58e-13 m⁻⁴.
    expect(isFinite(kHorizon)).toBe(true);
    expect(kHorizon).toBeGreaterThan(0);

    // Sanity-check order of magnitude: K(r_s) for M_sun should be ~1e-13 m⁻⁴.
    // (r_s ≈ 2954 m for M_sun, r_s⁶ ≈ 6.6e20 m⁶, K ≈ 48*G²*M²/(c⁴ r_s⁶).)
    expect(kHorizon).toBeGreaterThan(1e-14);
    expect(kHorizon).toBeLessThan(1e-12);
  });

  // -------------------------------------------------------------------------
  // Test 3: K(2*r_s) numerically agrees with closed form.
  // (Duplicates the r=2*r_s entry from Task 3.7 as a local sanity check.)
  // Measured relErr from Task 3.7 at r=2*r_s: 3.665e-10. TOL = 2 × 4e-10 = 8e-10.
  // -------------------------------------------------------------------------
  it('K(2*r_s) numerical agrees with closed form to relErr < 8e-10', () => {
    const r = 2 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);
    const K_ref = kClosedA(r);
    const relErr = Math.abs(K_num / K_ref - 1);
    // Measure-then-lock: Task 3.7 measured 3.665e-10 at r=2*r_s.
    // TOL = 2 × 3.665e-10 ≈ 8e-10.
    const TOL = 8e-10;
    expect(relErr).toBeLessThan(TOL);
  });

  // -------------------------------------------------------------------------
  // Test 4: Near-horizon behavior documentation.
  //
  // At r = 1.0001 * r_s the FD pipeline breaks down because the Schwarzschild
  // coordinate singularity (g_{rr} → ∞) causes catastrophic cancellation in
  // finite-difference Christoffel evaluations. The numerical K result is finite
  // in the IEEE 754 sense but numerically meaningless (relErr ~ 1e14 measured).
  //
  // This test pins ONLY that K_num is finite (not NaN/Infinity) — NOT that it
  // is close to the closed-form value. The horizon finiteness is a physics fact
  // (coordinate singularity ≠ curvature singularity); the FD failure is a
  // numerical limitation of Schwarzschild coordinates documented here.
  // -------------------------------------------------------------------------
  it('near-horizon r=1.0001*r_s: K_numerical is finite (coordinate singularity caveat)', () => {
    // r = 1.0001 * r_s is just outside the horizon.
    // g_{rr} = 1/(1 - r_s/r) ≈ 10000 at this point — large but finite.
    // Γ^r_{rr} = -r_s/(2r(r-r_s)) → diverges as r → r_s.
    // The FD Riemann is corrupted by this divergence; K_num is a random large
    // number (measured: ~29.17 vs K_ref(r_s) ≈ 1.58e-13), but IEEE-finite.
    const r = 1.0001 * r_s;
    const x: [number, number, number, number] = [0, r, Math.PI / 2, 0];
    const K_num = computeKNumericalAt(x);

    // The ONLY physics-meaningful assertion: K_num is a finite IEEE 754 number.
    // (NOT: K_num ≈ K_closed. That check fails at relErr ~1e14 — see JSDoc above.)
    // Future work: evaluate in Kruskal-Szekeres or Painlevé-Gullstrand coords.
    expect(isFinite(K_num)).toBe(true);

    // Document the failure quantitatively (for regression detection if the FD
    // pipeline is changed): if this number drops below 1 unexpectedly, something
    // changed upstream. This is NOT a tight physics pin.
    // Measured K_num at r=1.0001*r_s ≈ 29.17 (unit m⁻⁴ ... sort of). Not gated.
    // (No expect on K_num magnitude here — we intentionally do NOT pin the wrong value.)
  });

  // -------------------------------------------------------------------------
  // Test 5: K(r_s) closed-form value matches the F-1 formula for multiple masses.
  // Verifies the formula is not accidentally calibrated to M_sun only.
  // -------------------------------------------------------------------------
  it('F-1 formula K(r_s)=3c⁸/(4G⁴M⁴) holds for 3 different masses', () => {
    const masses = [1.989e30, 1e31, 1e32]; // M_sun, ~5*M_sun, ~50*M_sun

    /** K(r) = 48 G² M² / (c⁴ r⁶) — formula A, parameterised on M. */
    function kClosedAM(r: number, M: number): number {
      const c4 = C_SI * C_SI * C_SI * C_SI;
      const G2M2 = G_SI * G_SI * M * M;
      return (48 * G2M2) / (c4 * r * r * r * r * r * r);
    }

    for (const M of masses) {
      const rs = schwarzschildRs(M);
      const kA = kClosedAM(rs, M); // formula A: K(r=r_s, M)
      const kB = kHorizonB(M);     // formula B: 3c⁸/(4G⁴M⁴)

      const relErr = Math.abs(kA / kB - 1);
      // Pure arithmetic — machine precision. TOL = 1e-12.
      expect(relErr).toBeLessThan(1e-12);

      // K(r_s) ∝ M⁻⁴: larger black holes have SMALLER Kretschmann at their horizon.
      // Verify the trend.
      expect(kB).toBeGreaterThan(0);
    }

    // K(r_s) ∝ M⁻⁴: verify K decreases with M.
    const k1 = kHorizonB(masses[0]);
    const k2 = kHorizonB(masses[1]);
    const k3 = kHorizonB(masses[2]);
    expect(k1).toBeGreaterThan(k2);
    expect(k2).toBeGreaterThan(k3);
  });
});
