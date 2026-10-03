/**
 * Task 3.3 (v0.6.0 Phase 3): Weyl = Riemann in Schwarzschild vacuum.
 *
 * Physics: Schwarzschild is a vacuum spacetime — R_{μν} = 0 and R = 0 exactly.
 * The Weyl decomposition formula:
 *
 *   C^ρ_{σμν} = R^ρ_{σμν}
 *             − (1/2)(δ^ρ_μ R_{σν} − δ^ρ_ν R_{σμ} − g_{σμ} R^ρ_ν + g_{σν} R^ρ_μ)
 *             + (1/6) R (δ^ρ_μ g_{σν} − δ^ρ_ν g_{σμ})
 *
 * reduces EXACTLY to C^ρ_{σμν} = R^ρ_{σμν} when R_{μν} = 0 and R = 0.
 *
 * Test strategy:
 *   - Compute Riemann R^ρ_{σμν} numerically via the v0.5.0 FD pipeline.
 *   - Compute Ricci R_{μν} numerically (FD; approximately zero in vacuum).
 *   - Feed all into computeWeylTensor directly.
 *   - Compare Weyl against the ANALYTIC Schwarzschild Riemann fixture
 *     (`schwarzschildRiemannFn`) for the 8 pinned components
 *     (R^t_{rtr}, R^θ_{φθφ} and their antisymmetric partners).
 *   - Assert relative error < TOL on these analytic-nonzero components.
 *
 * Why analytic reference instead of numerical Riemann:
 *   The numerical Riemann has many small non-zero "noise" entries from FD
 *   truncation. Comparing Weyl against the full numerical Riemann would pick
 *   up those noise entries and make a clean `C ≈ R` check impossible. Comparing
 *   Weyl against the analytic values for the known dominant components is a
 *   direct physics pin: in vacuum, C^t_{rtr} = R^t_{rtr} (analytic) to FD
 *   accuracy.
 *
 * Sample points: 5 per spec (r = 3, 5, 10, 100, 1000 × r_s).
 *
 * Measure-then-lock: TOL set at 2× max_observed across all 5 points on
 * all pinned components.
 *
 * P-4 TDD RED: a stub returning C = 0 was confirmed to FAIL (Weyl ≠ analytic
 * Riemann at the dominant components) before writing against the real implementation.
 */

import { describe, it, expect } from 'vitest';
import { computeWeylTensor } from '../../src/numerical/weyl-lowering.js';
import {
  christoffelAt,
  dGammaAt,
  buildRiemann,
  contractRiemannJS,
} from '../../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import {
  schwarzschildRs,
  schwarzschildGFn,
  schwarzschildGInverseFn,
  schwarzschildRiemannFn,
} from '../fixtures/schwarzschild.js';
import { C_SI, G_SI } from '../../src/core/constants.js';

// Silence unused-import TS guard — constants discipline.
void C_SI; void G_SI;

const M_SUN = 1.989e30; // kg
const r_s = schwarzschildRs(M_SUN);

const gFn = schwarzschildGFn(M_SUN);
const gInvFn = schwarzschildGInverseFn(M_SUN);
const analyticRiemannFn = schwarzschildRiemannFn(M_SUN);

/** Flatten a 4D nested array to 1D row-major (strides [64,16,4,1]). */
function flatten4D(arr: number[][][][]): number[] {
  const out: number[] = [];
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++)
      for (let c = 0; c < 4; c++)
        for (let d = 0; d < 4; d++)
          out.push(arr[a][b][c][d]);
  return out;
}

// 5 sample points per spec.
const samplePoints: [number, number, number, number][] = [
  [0, 3 * r_s, Math.PI / 2, 0],
  [0, 5 * r_s, Math.PI / 3, 1],
  [0, 10 * r_s, Math.PI / 4, 2],
  [0, 100 * r_s, Math.PI / 2, 3],
  [0, 1000 * r_s, Math.PI / 6, 0.5],
];

const N = 4;
const engine = new MathTSEngine();

/** Sample all curvature inputs at coordinate x.
 *  O-4 (2026-06-11): WeylInputs.metricInverse now accepts the fixture's
 *  row-major Float64Array(16) directly — unflatten shim removed; the
 *  Ricci-scalar contraction indexes the flat layout. */
function sampleCurvatureAt(x: [number, number, number, number]) {
  const gamma = christoffelAt(x, gFn, gInvFn, N, engine);
  const dGamma = dGammaAt(x, gFn, gInvFn, N, engine);
  const Rup: number[][][][] = buildRiemann(gamma, dGamma, N);

  const Ric = contractRiemannJS(flatten4D(Rup), N, {
    upperAxis: 0, lowerAxis: 2, outAxes: [1, 3],
  });

  const gInvFlat = gInvFn(x);
  let Rscalar = 0;
  for (let mu = 0; mu < N; mu++)
    for (let nu = 0; nu < N; nu++)
      Rscalar += gInvFlat[mu * N + nu] * Ric[mu][nu];

  const gMat = gFn(x);
  return { Rup, Ric, Rscalar, gMat, gInvFlat };
}

describe('Weyl = Riemann in Schwarzschild vacuum (Task 3.3)', () => {
  it.each(samplePoints)(
    'C^ρ_{σμν} ≈ analytic R^ρ_{σμν} on pinned components at x=[%d, %d, %d, %d]',
    (t, r, theta, phi) => {
      const x: [number, number, number, number] = [t, r, theta, phi];
      const { Rup, Ric, Rscalar, gMat, gInvFlat } = sampleCurvatureAt(x);

      const C = computeWeylTensor({
        riemann: Rup,
        ricci: Ric,
        ricciScalar: Rscalar,
        metric: gMat,
        metricInverse: gInvFlat,
      });

      // Analytic Schwarzschild Riemann (8 pinned entries from Task 0 fixture).
      // Only these entries have a meaningful analytic value — all others are
      // 0 in the fixture (but non-zero at FD level in the full numerical Riemann).
      const analytic = analyticRiemannFn(x);

      // Compare C vs analytic R for the pinned non-zero components only.
      // The fixture pinning convention (Task 0 / riemann-tensor-lowering.test.ts):
      //   R^t_{rtr}  = analytic[0][1][0][1] > 0
      //   R^θ_{φθφ}  = analytic[2][3][2][3] > 0
      //   plus their μ↔ν antisymmetric partners.
      let maxRelErr = 0;
      for (let rho = 0; rho < N; rho++)
        for (let sigma = 0; sigma < N; sigma++)
          for (let mu = 0; mu < N; mu++)
            for (let nu = 0; nu < N; nu++) {
              const expected = analytic[rho][sigma][mu][nu];
              if (Math.abs(expected) < 1e-30) continue; // skip fixture-zero entries
              const relErr = Math.abs(C[rho][sigma][mu][nu] - expected) / Math.abs(expected);
              maxRelErr = Math.max(maxRelErr, relErr);
            }

      // Measure-then-lock: TOL = 2 × max_observed across all 5 sample points.
      // The FD pipeline (4th-order) introduces a Ricci correction ~h⁴ ∂⁵Γ which
      // on the dominant Riemann components gives a relative error:
      //   r=3*r_s:    max_relErr ≈ 2.4e-6
      //   r=5*r_s:    max_relErr ≈ 4.9e-6
      //   r=10*r_s:   max_relErr ≈ 1.5e-5
      //   r=100*r_s:  max_relErr ≈ 1.3e-3
      //   r=1000*r_s: max_relErr ≈ 8.6e-3
      // Overall max ≈ 8.6e-3. TOL = 2 × 8.6e-3 = 0.017, rounded to 2e-2.
      // (Distant points accumulate FD Ricci noise as 1/r³ Riemann falls.)
      const TOL = 2e-2;

      expect(maxRelErr).toBeLessThan(TOL);
    },
  );

  it('dominant component C^t_{rtr} ≈ analytic R^t_{rtr} to FD accuracy at r=3*r_s', () => {
    // Near-horizon physics-meaningful check: the dominant Weyl component in
    // Schwarzschild vacuum equals the dominant Riemann component to FD precision.
    const x: [number, number, number, number] = [0, 3 * r_s, Math.PI / 2, 0];
    const { Rup, Ric, Rscalar, gMat, gInvFlat } = sampleCurvatureAt(x);
    const analytic = analyticRiemannFn(x);

    const C = computeWeylTensor({
      riemann: Rup,
      ricci: Ric,
      ricciScalar: Rscalar,
      metric: gMat,
      metricInverse: gInvFlat,
    });

    // R^t_{rtr} = R[0][1][0][1] = r_s / (r² (r − r_s))
    const analyticRt_rtr = analytic[0][1][0][1];
    const weylRt_rtr     = C[0][1][0][1];
    const relErr = Math.abs(weylRt_rtr - analyticRt_rtr) / Math.abs(analyticRt_rtr);

    // Measure-then-lock: max_observed ≈ 2.4e-6. TOL = 2 × 2.4e-6 = 4.8e-6.
    const TOL = 5e-6;
    expect(relErr).toBeLessThan(TOL);
  });

  it('Weyl antisymmetry C^ρ_{σμν} = −C^ρ_{σνμ} at r=3*r_s', () => {
    const x: [number, number, number, number] = [0, 3 * r_s, Math.PI / 2, 0];
    const { Rup, Ric, Rscalar, gMat, gInvFlat } = sampleCurvatureAt(x);

    const C = computeWeylTensor({
      riemann: Rup,
      ricci: Ric,
      ricciScalar: Rscalar,
      metric: gMat,
      metricInverse: gInvFlat,
    });

    let maxAsymmetry = 0;
    for (let rho = 0; rho < N; rho++)
      for (let sigma = 0; sigma < N; sigma++)
        for (let mu = 0; mu < N; mu++)
          for (let nu = mu + 1; nu < 4; nu++) {
            const sym = C[rho][sigma][mu][nu] + C[rho][sigma][nu][mu];
            maxAsymmetry = Math.max(maxAsymmetry, Math.abs(sym));
          }

    // Algebraically exact antisymmetry from the formula. Measured: ~1e-17.
    expect(maxAsymmetry).toBeLessThan(1e-14);
  });
});
