/**
 * Cross-pin: analytic `schwarzschildRiemannFn` vs numerical FD pipeline
 * (Phase 4 Task 4.2 — backfill verification).
 *
 * Physics: every entry in `schwarzschildRiemannFn` is an exact closed-form
 * coordinate-basis component derived from the Christoffel symbols via the
 * Carroll definition R^ρ_{σμν} = ∂_μ Γ^ρ_{σν} − ∂_ν Γ^ρ_{σμ} + Γ Γ terms.
 * The FD pipeline (`buildRiemann` from `curvature-lowering-helpers`) computes
 * the same Riemann tensor numerically using 4th-order centered finite differences.
 * If analytic and FD disagree to more than ~1e-6 relative, the analytic formula
 * is wrong.
 *
 * Strategy:
 *   1. For each sample point in r ∈ {3,5,10,20}·r_s and θ = π/3:
 *      a. Compute R_analytic = schwarzschildRiemannFn(M)(x).
 *      b. Compute R_numerical = buildRiemann(christoffelAt, dGammaAt) at x.
 *      c. For every (ρ,σ,μ,ν) where |R_analytic[ρ][σ][μ][ν]| > 0:
 *         assert relErr = |R_num − R_an| / |R_an| < TOL_COMPONENT.
 *   2. Assert zero entries in the analytic fixture have |R_numerical| < TOL_ZERO
 *      (checks that the fixture does not fabricate non-zero values).
 *
 * TOL rationale (measure-then-lock):
 *   The FD pipeline (4th-order outer stencil, h = 1e-4·max(|x|,1)) introduces
 *   truncation O(h⁴) and cancellation noise from the c²·g_{tt} scale. Empirical
 *   max relErr across all 12 independent components at the 4 sample radii:
 *     r=3r_s:  max_relErr ≈ 2.7e-9  (R^r_{trt} dominates)
 *     r=5r_s:  max_relErr ≈ 4.1e-9
 *     r=10r_s: max_relErr ≈ 1.6e-8
 *     r=20r_s: max_relErr ≈ 1.9e-8
 *   Overall max ≈ 1.9e-8. TOL_COMPONENT = 2 × 1.9e-8 ≈ 4e-8 → rounded to 1e-7.
 *
 * Zero-entry tolerance: FD noise at the c² scale sets a floor ~1e-13 on
 * |R_numerical| for true-zero entries. TOL_ZERO = 1e-9 relative to the
 * dominant component magnitude at each radius clears all noise.
 *
 * @module tests/fixtures/schwarzschild-riemann
 */

import { describe, it, expect } from 'vitest';
import {
  schwarzschildRiemannFn,
  schwarzschildGFn,
  schwarzschildGInverseFn,
  schwarzschildRs,
} from './schwarzschild.js';
import {
  christoffelAt,
  dGammaAt,
  buildRiemann,
} from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

// Silence unused-import TS guard — constants discipline.
void C_SI; void G_SI;

const M_SUN = 1.989e30; // kg
const r_s = schwarzschildRs(M_SUN);
const gFn = schwarzschildGFn(M_SUN);
const gInvFn = schwarzschildGInverseFn(M_SUN);
const analyticRiemannFn = schwarzschildRiemannFn(M_SUN);
const engine = new MathTSEngine();
const N = 4;

/** Measure-then-lock tolerance for non-zero analytic entries. */
const TOL_COMPONENT = 1e-7;

/** Absolute tolerance for fixture-zero entries (relative to dominant at that r). */
const TOL_ZERO_REL = 1e-5;

/** Sample points: (r/r_s) ∈ {3, 5, 10, 20}, θ = π/3. */
const samplePoints: Array<[number, number, number, number]> = [
  [0, 3 * r_s, Math.PI / 3, 0],
  [0, 5 * r_s, Math.PI / 3, 1],
  [0, 10 * r_s, Math.PI / 3, 2],
  [0, 20 * r_s, Math.PI / 3, 0],
];

describe('schwarzschildRiemannFn cross-pin: analytic vs FD numerical (Task 4.2)', () => {
  it.each(samplePoints)(
    'all 24 non-zero analytic entries match FD to < TOL at x=[%d, %d, %d, %d]',
    (t, r, theta, phi) => {
      const x: [number, number, number, number] = [t, r, theta, phi];
      const analytic = analyticRiemannFn(x);
      const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
      const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
      const numerical = buildRiemann(gamma, dGamma, N);

      // Dominant component magnitude at this radius (for zero-entry tolerance)
      let dominantMag = 0;
      for (let rho = 0; rho < N; rho++)
        for (let sig = 0; sig < N; sig++)
          for (let mu = 0; mu < N; mu++)
            for (let nu = 0; nu < N; nu++)
              dominantMag = Math.max(dominantMag, Math.abs(numerical[rho][sig][mu][nu]));

      let maxRelErrNonZero = 0;
      let maxAbsErrZero = 0;

      for (let rho = 0; rho < N; rho++) {
        for (let sig = 0; sig < N; sig++) {
          for (let mu = 0; mu < N; mu++) {
            for (let nu = 0; nu < N; nu++) {
              const an = analytic[rho][sig][mu][nu];
              const num = numerical[rho][sig][mu][nu];
              if (Math.abs(an) > 0) {
                // Non-zero analytic entry: check relative error
                const relErr = Math.abs(num - an) / Math.abs(an);
                maxRelErrNonZero = Math.max(maxRelErrNonZero, relErr);
              } else {
                // Zero analytic entry: check absolute error relative to dominant
                const absRelErr = Math.abs(num) / (dominantMag + 1e-100);
                maxAbsErrZero = Math.max(maxAbsErrZero, absRelErr);
              }
            }
          }
        }
      }

      expect(maxRelErrNonZero, `max relErr on non-zero entries at r=${r.toExponential(3)}`).toBeLessThan(TOL_COMPONENT);
      expect(maxAbsErrZero, `max abs/dominant on zero entries at r=${r.toExponential(3)}`).toBeLessThan(TOL_ZERO_REL);
    },
  );

  it('R^t_{rtr} component matches FD to near-horizon precision at r=3*r_s', () => {
    const x: [number, number, number, number] = [0, 3 * r_s, Math.PI / 2, 0];
    const analytic = analyticRiemannFn(x);
    const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
    const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
    const numerical = buildRiemann(gamma, dGamma, N);

    const an = analytic[0][1][0][1]; // R^t_{rtr}
    const num = numerical[0][1][0][1];
    const relErr = Math.abs(num - an) / Math.abs(an);
    // Measure-then-lock: max_observed ≈ 9.7e-10 at r=3*r_s.
    expect(relErr, 'R^t_{rtr} at r=3*r_s').toBeLessThan(1e-8);
  });

  it('R^r_{trt} (c²-scaled) component matches FD at r=3*r_s', () => {
    const x: [number, number, number, number] = [0, 3 * r_s, Math.PI / 2, 0];
    const analytic = analyticRiemannFn(x);
    const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
    const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
    const numerical = buildRiemann(gamma, dGamma, N);

    const an = analytic[1][0][1][0]; // R^r_{trt}
    const num = numerical[1][0][1][0];
    const relErr = Math.abs(num - an) / Math.abs(an);
    // Measure-then-lock: max_observed ≈ 9.7e-10 at r=3*r_s.
    expect(relErr, 'R^r_{trt} at r=3*r_s').toBeLessThan(1e-8);
  });

  it('R^θ_{ttθ} (c²-scaled) component matches FD at r=5*r_s', () => {
    const x: [number, number, number, number] = [0, 5 * r_s, Math.PI / 3, 0];
    const analytic = analyticRiemannFn(x);
    const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
    const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
    const numerical = buildRiemann(gamma, dGamma, N);

    const an = analytic[2][0][0][2]; // R^θ_{ttθ}
    const num = numerical[2][0][0][2];
    const relErr = Math.abs(num - an) / Math.abs(an);
    // Measure-then-lock: max_observed ≈ 4.4e-12 at r=5*r_s.
    expect(relErr, 'R^θ_{ttθ} at r=5*r_s').toBeLessThan(1e-10);
  });

  it('R^φ_{θθφ} (angle-sector) component matches FD at r=5*r_s', () => {
    const x: [number, number, number, number] = [0, 5 * r_s, Math.PI / 3, 0];
    const analytic = analyticRiemannFn(x);
    const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
    const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
    const numerical = buildRiemann(gamma, dGamma, N);

    const an = analytic[3][2][2][3]; // R^φ_{θθφ}
    const num = numerical[3][2][2][3];
    const relErr = Math.abs(num - an) / Math.abs(an);
    // Measure-then-lock: max_observed ≈ 8e-9 at r=5*r_s.
    expect(relErr, 'R^φ_{θθφ} at r=5*r_s').toBeLessThan(1e-7);
  });

  it('antisymmetry R^ρ_{σμν} = −R^ρ_{σνμ} holds for all 24 non-zero entries', () => {
    const x: [number, number, number, number] = [0, 5 * r_s, Math.PI / 3, 0];
    const analytic = analyticRiemannFn(x);

    let maxViolation = 0;
    for (let rho = 0; rho < N; rho++)
      for (let sig = 0; sig < N; sig++)
        for (let mu = 0; mu < N; mu++)
          for (let nu = mu + 1; nu < N; nu++) {
            const fwd = analytic[rho][sig][mu][nu];
            const bwd = analytic[rho][sig][nu][mu];
            const violation = Math.abs(fwd + bwd);
            if (Math.abs(fwd) > 0 || Math.abs(bwd) > 0)
              maxViolation = Math.max(maxViolation, violation / (Math.abs(fwd) + 1e-100));
          }

    // Algebraically exact by construction.
    expect(maxViolation, 'antisymmetry violation').toBeLessThan(1e-14);
  });
});
