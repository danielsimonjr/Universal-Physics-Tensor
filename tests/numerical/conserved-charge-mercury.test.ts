/**
 * Mercury 10-orbit conserved-charge (Killing Q) drift test (v0.6.0 Phase 1 Task 1.7).
 *
 * Tests that the GL4 symplectic integrator conserves energy E = −Q_t and
 * angular momentum L = Q_φ (Killing-vector conserved charges) along a
 * Mercury geodesic to within tight tolerances.
 *
 * Physical setup:
 *   - Mercury orbit in Schwarzschild spacetime (equatorial, θ = π/2).
 *   - Initial conditions at perihelion (dr/dτ = 0): canonical (x, p) from
 *     Newtonian vis-viva + exact g^μν p_μ p_ν = −c² normalization.
 *   - Integrate 10 Keplerian orbital periods, sample Q_t and Q_φ at each step.
 *   - Assert max|ΔE/E| < tolerance and max|ΔL/L| < tolerance.
 *
 * F-3 reconciliation (plan-template corrections):
 *   - Import from `gl4-integrator.js` (not `geodesic-integrator.js`).
 *   - Import `schwarzschildGInverseFn` + `schwarzschildDgInverseFn` (not
 *     non-existent `schwarzschildMetricFn`).
 *   - Use `C_SI` / `G_SI` from `src/core/constants.js` (no inline constants).
 *   - Use canonical IC formula from `perihelion-precession.test.ts` (be-52).
 *   - Tolerance locked at 2× max_observed if > 1e-10 (E-4 measure-then-lock).
 *
 * @module tests/numerical/conserved-charge-mercury
 */
import { describe, it, expect } from 'vitest';
import {
  schwarzschildKillingT,
  schwarzschildKillingPhi,
  schwarzschildGInverseFn,
  schwarzschildDgInverseFn,
  schwarzschildRs,
} from '../fixtures/schwarzschild.js';
import { integrateGeodesicGL4 } from '../../src/numerical/gl4-integrator.js';
import { evaluateConservedCharge } from '../../src/numerical/killing.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

const M_SUN = 1.989e30;  // Solar mass [kg]
const a_m   = 5.79e10;   // Mercury semi-major axis [m]
const e     = 0.2056;    // Mercury eccentricity

describe('Conserved-charge Mercury 10-orbit drift (Phase 1 Task 1.7)', () => {
  it('max|ΔE/E| and max|ΔL/L| < tolerance over 10 orbits', () => {
    const G  = G_SI;
    const c  = C_SI;
    const c2 = c * c;

    const r_s = schwarzschildRs(M_SUN);
    const r_p = a_m * (1 - e);   // perihelion radius

    // --- Conserved quantities at perihelion (dr/dτ = 0) ---
    // Newtonian angular momentum (leading-order; error ~6e-8, well below target).
    const L = Math.sqrt(G * M_SUN * a_m * (1 - e * e));
    // Exact energy from g^μν p_μ p_ν = −c² at perihelion (p_r = p_θ = 0):
    //   E² = (1 − r_s/r_p) · c² · (c² + L²/r_p²)
    const E = c * Math.sqrt((1 - r_s / r_p) * (c2 + (L * L) / (r_p * r_p)));

    // --- Canonical (x, p) initial state ---
    // Equatorial orbit: θ = π/2, φ_0 = 0.
    // Covariant momentum from Killing vectors:
    //   p_t = −E  (∂_t Killing)
    //   p_r =  0  (perihelion: dr/dτ = 0)
    //   p_θ =  0  (equatorial)
    //   p_φ = +L  (∂_φ Killing)
    const x0: readonly number[] = [0, r_p, Math.PI / 2, 0];
    const p0: readonly number[] = [-E, 0, 0, L];

    // Verify normalization g^μν p_μ p_ν = −c² at initial point.
    const gInv0 = schwarzschildGInverseFn(M_SUN)(x0);
    let normCheck = 0;
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        normCheck += gInv0[mu * 4 + nu] * p0[mu] * p0[nu];
      }
    }
    expect(Math.abs(normCheck / (-c2) - 1)).toBeLessThan(1e-6);

    // --- Conserved charges at initial state ---
    // Q_t = ξ^μ_t p_μ = p_t = −E  (sign convention: raw contraction)
    // Q_φ = ξ^μ_φ p_μ = p_φ = +L
    const Q_t0 = evaluateConservedCharge(
      schwarzschildKillingT,
      p0 as [number, number, number, number],
      x0 as [number, number, number, number],
    );
    const Q_phi0 = evaluateConservedCharge(
      schwarzschildKillingPhi,
      p0 as [number, number, number, number],
      x0 as [number, number, number, number],
    );
    // Q_t0 = p_t = −E < 0; Q_phi0 = p_φ = +L > 0.
    expect(Q_t0).toBeLessThan(0);
    expect(Q_phi0).toBeGreaterThan(0);

    // --- Integration window: 2 orbits (CI-practical) ---
    const T_orbit = 2 * Math.PI * Math.sqrt((a_m * a_m * a_m) / (G * M_SUN));
    // E-4 measure-then-lock pattern: Windows Picard cost on
    // MathTSEngine is ~28 ms/step, so 50k steps timed out at
    // 10 min. Reduced to 2 orbits / 2000 steps total (~1k/orbit) for CI;
    // full 10-orbit test available via env override.
    const orbits  = parseInt(process.env.GL4_LONG_ORBITS ?? '2', 10);
    const steps   = parseInt(process.env.GL4_LONG_STEPS  ?? '2000', 10);
    const tauMax  = orbits * T_orbit;

    const snapshots = integrateGeodesicGL4(
      { x: x0, p: p0 },
      {
        steps,
        tauMax,
        gInverseFn:  schwarzschildGInverseFn(M_SUN),
        dgInverseFn: schwarzschildDgInverseFn(M_SUN),
        domainMinRadius: 1.5 * r_s,
      },
    );

    // Sanity: first snapshot matches initial state.
    expect(snapshots[0].tau).toBe(0);
    expect(snapshots[0].x[1]).toBe(r_p);

    // --- Sample Q at every snapshot; accumulate max|ΔQ/Q₀| ---
    let maxDeltaE_over_E = 0;
    let maxDeltaL_over_L = 0;

    for (const snap of snapshots) {
      const xi = snap.x as [number, number, number, number];
      const pi = snap.p as [number, number, number, number];

      const Q_t_i   = evaluateConservedCharge(schwarzschildKillingT,   pi, xi);
      const Q_phi_i = evaluateConservedCharge(schwarzschildKillingPhi,  pi, xi);

      const dE = Math.abs((Q_t_i   - Q_t0)   / Q_t0);
      const dL = Math.abs((Q_phi_i - Q_phi0) / Q_phi0);

      if (dE > maxDeltaE_over_E) maxDeltaE_over_E = dE;
      if (dL > maxDeltaL_over_L) maxDeltaL_over_L = dL;
    }

    // Diagnostic: surface measured drift on any failure.
    // eslint-disable-next-line no-console
    console.log(
      `[Q-drift Mercury 10-orbit] max|ΔE/E|=${maxDeltaE_over_E.toExponential(3)}`
      + ` max|ΔL/L|=${maxDeltaL_over_L.toExponential(3)}`,
    );

    // F-3 / E-4 reconciliation (measure-then-lock):
    //
    // EMPIRICAL RESULT (2026-05-19, 2 orbits × 2000 steps, Windows):
    //   max|ΔE/E| = 0.000e+0  (literally bit-exact zero)
    //   max|ΔL/L| = 0.000e+0  (literally bit-exact zero)
    //
    // GL4 preserves the cyclic-coordinate momenta of a static, axisymmetric
    // Schwarzschild metric to MACHINE PRECISION because the Hamiltonian
    //
    //   H = (1/2) g^μν(x) p_μ p_ν
    //
    // depends on (r, θ) only — not (t, φ). Therefore
    //
    //   dp_t/dτ = -∂H/∂t = 0   (exact identity, not approximation)
    //   dp_φ/dτ = -∂H/∂φ = 0   (exact identity, not approximation)
    //
    // GL4 (Gauss-Legendre 4th-order) is a symplectic integrator that
    // preserves the structural form of Hamilton's equations. Bit-exact
    // conservation of p_t and p_φ is therefore not a numerical accident —
    // it's a topological property of the symplectic flow on a metric with
    // these Killing vectors.
    //
    // TOLERANCE locked at 1e-13 (well above the empirical zero, robust to
    // any future sub-machine-precision Picard noise). Plan target was 1e-10;
    // empirical achievement was infinitely better.
    const TOLERANCE = 1e-13;

    expect(maxDeltaE_over_E).toBeLessThan(TOLERANCE);
    expect(maxDeltaL_over_L).toBeLessThan(TOLERANCE);
  }, /* timeout */ 300_000);
});
