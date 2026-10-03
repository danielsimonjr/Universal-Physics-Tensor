/**
 * PO-2 curvature-cost diagnostic — Riemann → Ricci → metric-lower pipeline.
 *
 * Carried forward from v0.5.1 (deferred per `todo.md` → "Bench harnesses").
 * Measures the per-call cost of the full curvature-lowering pipeline on
 * a pre-computed Schwarzschild fixture:
 *
 *   1. Compute Riemann R^ρ_{σμν} via christoffelAt + dGammaAt + buildRiemann
 *      (FD pipeline at r = 3·r_s).
 *   2. Contract Ricci R_{μν} = R^λ_{μλν} via contractRiemannJS.
 *
 * Compared against a "Riemann-only" baseline that omits the contractRiemannJS
 * step — isolates the Ricci contraction cost from the FD-Riemann cost.
 *
 * **What this bench is for**: providing a baseline that future contract-
 * optimizations (e.g. moving contractRiemannJS to einsum, or a flat-buffer
 * Riemann representation) can compare against. Per v0.6.1 Design Decision
 * #5, informational-only — no threshold assertions.
 *
 * Schwarzschild test point: r = 3·r_s (where the Adam+Eve F-5 regression
 * test pin lives — Mercury orbit territory).
 *
 * @see src/numerical/curvature-lowering-helpers.ts  (FD pipeline + contractRiemannJS)
 */
import { bench, describe } from 'vitest';
import {
  schwarzschildGFn,
  schwarzschildGInverseFn,
  schwarzschildRs,
} from '../tests/fixtures/schwarzschild.js';
import {
  christoffelAt,
  dGammaAt,
  buildRiemann,
  contractRiemannJS,
} from '../src/numerical/curvature-lowering-helpers.js';
import { MathTSEngine } from '../src/numerical/mathts-engine.js';

// ---------------------------------------------------------------------------
// Schwarzschild fixture — Mercury-orbit point r = 3·r_s (M_sun).
// ---------------------------------------------------------------------------

const M_KG = 1.989e30;
const r_s = schwarzschildRs(M_KG);
const X0: readonly number[] = [0, 3 * r_s, Math.PI / 2, 0];

const G_FN = schwarzschildGFn(M_KG);
const G_INV_FN = schwarzschildGInverseFn(M_KG);
const N = 4;
const ENGINE = new MathTSEngine();

// Helper that runs the FD pipeline + assembles Riemann (used by both benches).
function buildRiemannAtPoint(): number[][][][] {
  const gamma = christoffelAt(X0, G_FN, G_INV_FN, N, ENGINE);
  const dGamma = dGammaAt(X0, G_FN, G_INV_FN, N, ENGINE);
  return buildRiemann(gamma, dGamma, N);
}

// ---------------------------------------------------------------------------
// Bench suite
// ---------------------------------------------------------------------------

describe('PO-2: curvature-lowering pipeline (Schwarzschild r=3·r_s)', () => {
  bench(
    'Riemann FD-pipeline only (christoffelAt + dGammaAt + buildRiemann)',
    () => {
      buildRiemannAtPoint();
    },
    { iterations: 50, time: 5_000 },
  );

  bench(
    'Riemann + Ricci contraction (full pipeline)',
    () => {
      const Rup = buildRiemannAtPoint();
      // Flatten and contract: R^λ_{μλν} → R_{μν} (Carroll Eq. 3.91).
      const flat: number[] = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          for (let k = 0; k < N; k++) {
            for (let l = 0; l < N; l++) {
              flat.push(Rup[i][j][k][l]);
            }
          }
        }
      }
      contractRiemannJS(flat, N, { upperAxis: 0, lowerAxis: 2, outAxes: [1, 3] });
    },
    { iterations: 50, time: 5_000 },
  );
});
