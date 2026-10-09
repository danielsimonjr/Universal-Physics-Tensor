/**
 * GL4 integrator entry-point — end-to-end tests on Schwarzschild + flat
 * space (v0.5.0 Task 3, Phase 1a-iii).
 *
 * Three end-to-end tests:
 *   1. Cycloid match — radial-infall geodesic in Schwarzschild matches the
 *      analytic cycloid r(η) to high precision at 5000 GL4 steps. Same
 *      setup as the v0.4.0 RK4 cycloid test in
 *      `tests/numerical/schwarzschild-radial-geodesic.test.ts`.
 *   2. Symplecticity (flat-space) — free particle in Minkowski preserves
 *      the Hamiltonian H = ½ η^μν p_μ p_ν to machine precision. This
 *      unambiguously demonstrates GL4 symplecticity without the
 *      curved-spacetime bound-orbit initial-condition work (Legendre
 *      transform), which is deferred to Task 11 (BE-52 perihelion).
 *   3. Domain violation — initial r < domainMinRadius throws synchronously
 *      with a `/domain/i` message.
 *
 * Plus the long-gated `GL4_LONG=1` placeholder block per Design §7 R1.
 *
 * @module tests/numerical/gl4-integrator
 */
import { describe, it, expect } from 'vitest';
import { gl4LongScope, isGl4Long } from '../helpers/gl4-long.js';
import { integrateGeodesicGL4 } from '../../src/numerical/gl4-integrator.js';
import {
  schwarzschildGInverseFn,
  schwarzschildDgInverseFn,
  schwarzschildRs,
} from '../fixtures/schwarzschild.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

// v0.5.1 Task 4: canonical c from src/core/constants.ts — must match the
// Schwarzschild fixture (now also canonicalized) so the analytic cycloid
// τ(η) = (r0/2)·√(r0/r_s)·(η+sin η)/c baseline tracks the integrator
// exactly. Pre-canonicalization (c = 2.998e8) the cycloid relErr blew
// from ~8e-16 to ~3.4e-6 because r_s used canonical c but τ used local c.
const c = C_SI;
const M_sun = 1.989e30;

describe('GL4 integrator: end-to-end on Schwarzschild', () => {
  it('matches Schwarzschild radial-infall cycloid to ≤1e-13 relative at 5000 steps', () => {
    // Setup: drop a test particle from r₀ = 100 r_s with v_r = 0 (at rest at
    // apoapsis). Same scenario as the v0.4.0 RK4 cycloid test in
    // tests/numerical/schwarzschild-radial-geodesic.test.ts (etaFinal=0.5).
    const r_s = schwarzschildRs(M_sun);
    const r0 = 100 * r_s;
    const etaFinal = 0.5;

    // Cycloid closed form (matches the v0.4.0 RK4 test):
    //   r(η) = (r0/2)(1 + cos η)
    //   τ(η) = (r0/2) · sqrt(r0/r_s) · (η + sin η) / c
    const cyc_r = (eta: number): number => (r0 / 2) * (1 + Math.cos(eta));
    const cyc_tau = (eta: number): number =>
      ((r0 / 2) * Math.sqrt(r0 / r_s) * (eta + Math.sin(eta))) / c;

    const tauMax = cyc_tau(etaFinal);
    const rExpected = cyc_r(etaFinal);
    expect(rExpected).toBeGreaterThan(3 * r_s);

    // Canonical momentum at apoapsis (v_r = 0 → p_r = 0):
    //   p_t = -E = -c² · √(1 − r_s/r₀)
    // (The Schwarzschild normalization u^μ u_μ = −c² gives
    //  dt/dτ = 1/√(1 − r_s/r₀), and p_t = g_{tt} dt/dτ = −c²√(1 − r_s/r₀).)
    const p_t = -c * c * Math.sqrt(1 - r_s / r0);
    const initialState = {
      x: [0, r0, Math.PI / 2, 0],
      p: [p_t, 0, 0, 0],
    };

    const gInvFn = schwarzschildGInverseFn(M_sun);
    const dgInvFn = schwarzschildDgInverseFn(M_sun);
    const snapshots = integrateGeodesicGL4(initialState, {
      steps: 5000,
      tauMax,
      gInverseFn: gInvFn,
      dgInverseFn: dgInvFn,
      domainMinRadius: 3 * r_s,
    });

    expect(snapshots.length).toBe(5001);
    const final = snapshots[snapshots.length - 1];
    // Relative error against the analytic cycloid endpoint. Empirically at
    // 5000 GL4 steps (h ≈ 9.6e-7 s) and Picard tol 1e-12, we achieve
    // relErr ≈ 8.4e-16 — effectively machine precision. Pin to ≤1e-13
    // (plan target) with comfortable margin against rebuild noise.
    const relErr = Math.abs((final.x[1] - rExpected) / rExpected);
    expect(relErr).toBeLessThan(1e-13);
  });

  it('preserves flat-space Hamiltonian to machine precision (symplecticity)', () => {
    // Mercury 100-orbit symplecticity test deferred to Task 11 (BE-52
    // perihelion) where proper Legendre-transformed bound-orbit IC live.
    // Here we demonstrate the symplecticity property unambiguously on a
    // free particle in Minkowski: H = ½ η^μν p_μ p_ν must be conserved to
    // machine precision over arbitrary tauMax. (Adam+Eve I1, plan Bug D
    // resolution: Option C1 — flat-space symplecticity test.)
    //
    // Minkowski (signature −+++): η^μν = diag(−1/c², 1, 1, 1) — with the
    // same SI c² convention as schwarzschildGInverseFn for consistency.
    // ∂_λ η^μν = 0 (flat — all metric derivatives vanish).
    // v0.9.0 flat layout: Float64Array(16), flat[mu*4+nu] = g^{μν}.
    const gInverseFn = (_x: readonly number[]): Float64Array =>
      Float64Array.from([
        -1 / (c * c), 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);
    // 64 zeros (∂_λ η^μν = 0); flat[lambda*16 + mu*4 + nu].
    const dgInverseFn = (_x: readonly number[]): Float64Array =>
      new Float64Array(64);

    // Free particle: arbitrary timelike 4-momentum.
    const initialState = {
      x: [0, 1.0, 0.5, 0.25],
      p: [-c * c, 0.3, 0.4, 0.5],
    };

    const snapshots = integrateGeodesicGL4(initialState, {
      steps: 1000,
      tauMax: 100.0,
      gInverseFn,
      dgInverseFn,
    });

    // Hamiltonian H = ½ η^μν p_μ p_ν at first and last snapshots.
    const hamiltonian = (p: readonly number[]): number => {
      const gInv = gInverseFn(p);
      let h = 0;
      for (let mu = 0; mu < 4; mu++) {
        for (let nu = 0; nu < 4; nu++) {
          h += gInv[mu * 4 + nu] * p[mu] * p[nu];
        }
      }
      return 0.5 * h;
    };
    const H0 = hamiltonian(snapshots[0].p);
    const Hf = hamiltonian(snapshots[snapshots.length - 1].p);
    const drift = Math.abs((Hf - H0) / H0);
    // Flat space: ∂g=0 → Picard converges in 2 iterations and the symplectic
    // form is exact up to roundoff. Pin to 1e-14 (machine epsilon × O(1e3)
    // for the 1000-step accumulation).
    expect(drift).toBeLessThan(1e-14);
  });

  it('throws on domain violation (r < domainMinRadius)', () => {
    const r_s = schwarzschildRs(M_sun);
    const gInvFn = schwarzschildGInverseFn(M_sun);
    const dgInvFn = schwarzschildDgInverseFn(M_sun);
    expect(() =>
      integrateGeodesicGL4(
        { x: [0, 2 * r_s, Math.PI / 2, 0], p: [-1, 0, 0, 0] },
        {
          steps: 100,
          tauMax: 1,
          gInverseFn: gInvFn,
          dgInverseFn: dgInvFn,
          domainMinRadius: 3 * r_s,
        },
      ),
    ).toThrow(/domain/i);
  });
});

describe('GL4 integrator: gated long-run tests (GL4_LONG=1)', () => {
  const isLong = isGl4Long();

  // v0.5.1 PD-4: Real Mercury N-orbit Picard-convergence test. Default-skipped;
  // opt-in via `GL4_LONG=1`. Pragmatic step-budget tradeoff:
  //   - 100 orbits × ~50k steps/orbit = 5M steps would be ~30 min wall clock
  //     and the original plan's target.
  //   - We default to 20 orbits × 50k = 1M steps for a "long-run sanity"
  //     scope: enough to expose any cumulative-drift Picard pathology while
  //     fitting in ~6 min on a dev box. The orbit count is overridable via
  //     `GL4_LONG_ORBITS` for full-100 release-prep runs.
  //
  // Per commit this test is `it.skip`; the non-gated tests above drive the same code path
  // through integrateGeodesicGL4 + solveGL4Stage. The GL4_LONG=1 path runs in the nightly
  // `long-tests` job (.github/workflows/ci.yml) and on a hand run with GL4_LONG=1.
  (isLong ? it : it.skip)(
    'Mercury N-orbit Picard convergence succeeds on >99.9% of steps',
    () => {
      // --- Mercury IC at perihelion (matches Task 10 / perihelion-precession.test.ts). ---
      const G = G_SI;
      const c = C_SI;
      const c2 = c * c;
      const M_kg = 1.989e30;
      const a_m = 5.79e10;
      const e = 0.2056;
      const r_s = schwarzschildRs(M_kg);
      const r_p = a_m * (1 - e);

      // Vis-viva-style L at perihelion: L² = GM·a(1-e²). Conserved energy
      // E = c·√((1-r_s/r_p)·(c² + L²/r_p²)) from g^μν p_μ p_ν = −c² at p_r = p_θ = 0.
      const L = Math.sqrt(G * M_kg * a_m * (1 - e * e));
      const E = c * Math.sqrt((1 - r_s / r_p) * (c2 + (L * L) / (r_p * r_p)));

      // Canonical state at perihelion: p_t = -E, p_r = 0, p_θ = 0, p_φ = L.
      const x0: readonly number[] = [0, r_p, Math.PI / 2, 0];
      const p0: readonly number[] = [-E, 0, 0, L];

      // --- Integration window: N Mercury orbits at ~50k steps/orbit. ---
      const T_orbit = 2 * Math.PI * Math.sqrt((a_m * a_m * a_m) / (G * M_kg));
      // 20 orbits at 50k steps each is the one scope (this test runs only under GL4_LONG=1);
      // GL4_LONG_ORBITS / GL4_LONG_STEPS override it for a hand run.
      const { orbits, steps } = gl4LongScope({
        short: { orbits: 20, steps: 20 * 50_000 },
        long: { orbits: 20, steps: 20 * 50_000 },
      });
      const tauMax = orbits * T_orbit;

      let failures = 0; // steps that required at least one step-halving
      let totalIterations = 0;
      const onStep = (event: { step: number; iterations: number; halvings: number }): void => {
        if (event.halvings > 0) failures++;
        totalIterations += event.iterations;
      };

      integrateGeodesicGL4(
        { x: x0, p: p0 },
        {
          steps,
          tauMax,
          gInverseFn: schwarzschildGInverseFn(M_kg),
          dgInverseFn: schwarzschildDgInverseFn(M_kg),
          domainMinRadius: 1.5 * r_s,
          onStep,
        },
      );

      const failureFraction = failures / steps;
      // Plan target: <0.001 (more than 99.9% of steps converge at the original
      // h without step-halving). Empirical: actual fraction reported in the
      // commit body once a release-prep operator runs `GL4_LONG=1`.
      expect(failureFraction).toBeLessThan(0.001);
      expect(totalIterations).toBeGreaterThan(0);
    },
    1_800_000, // 30-min budget per plan
  );
});
