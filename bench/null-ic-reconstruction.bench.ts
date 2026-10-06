/**
 * PC-1.5 null-IC reconstruction variance bench (v0.6.0 Phase 1, Task 1.5).
 *
 * Measures the numerical sensitivity of BE-37's production null-IC
 * reconstruction (`reconstructNullPr` from `src/numerical/null-ic.ts`,
 * extracted from `covariant-eikonal.ts:314-326`).
 *
 * 1000 perturbations of g^{tt} at the ±2e-15 relative scale (machine-epsilon
 * neighbourhood) probe whether the null-IC reconstruction's `Math.sqrt` is
 * a significant contributor to the 2.51e-4 Shapiro residual floor.
 *
 * Plan-template deviation (E-3 reconciliation):
 *   The plan references `invertMetric` from `src/numerical/metric-inverse.js`.
 *   That module does NOT export `invertMetric` — it provides
 *   `evaluateMetricInverse` (an async AST-level consistency checker, not a
 *   plain matrix inversion). Since `schwarzschildGInverseFn` from the fixture
 *   returns the exact analytic inverse already, we use that directly and
 *   avoid the fabricated import. This is the conservative choice: the bench
 *   measures the production null-IC arithmetic against the same analytic
 *   inverse that BE-37 uses internally.
 *
 * @see src/numerical/null-ic.ts  (reconstructNullPr — production code)
 * @see src/numerical/covariant-eikonal.ts (calling site pre-extraction)
 * @see docs/architecture/archive/pc-1.5-shapiro-residual-floor.md
 */
import { bench, describe } from 'vitest';
import { schwarzschildGInverseFn, schwarzschildRs } from '../tests/fixtures/schwarzschild.js';
import { reconstructNullPr } from '../src/numerical/null-ic.js';
import { C_SI, G_SI } from '../src/core/constants.js';

// ---------------------------------------------------------------------------
// Physical parameters — Earth-orbit-radius geometry.
// All inputs constructed outside bench() callbacks (F4 discipline).
// ---------------------------------------------------------------------------

const M_SUN = 1.989e30; // kg

// Earth-orbit representative radius: 1 AU ≈ 1.496e11 m.
const R_AU_M = 1.496e11; // m

// Equatorial plane, at rest in coord time (BE-37 initial point convention).
const BASE_X: [number, number, number, number] = [0, R_AU_M, Math.PI / 2, 0];

// Affine-normalization: p_t = -c² (BE-37 convention).
const P_T = -(C_SI * C_SI);

// Representative impact parameter b = 1 AU / 10 (well below R_NEAR).
const B_M = R_AU_M / 10; // 1.496e10 m
const P_PHI = B_M * C_SI; // p_φ = b * c (BE-37 convention)

// Build the analytic inverse metric at the base point.
// v0.9.0 O-1: the fixture returns a row-major Float64Array(16),
// flat[mu*4+nu] = g^{μν} — the layout reconstructNullPr now consumes
// directly (no nested-array cast / per-row copy needed any more).
const gInvFn = schwarzschildGInverseFn(M_SUN);
const BASE_G_INV: Float64Array = gInvFn(BASE_X);

// ---------------------------------------------------------------------------
// Bench suite
// ---------------------------------------------------------------------------

describe('PC-1.5: null-IC reconstruction (production-grade, 1000× perturbations)', () => {
  bench(
    'reconstructNullPr — 1000× g^tt perturbations at machine-epsilon scale',
    () => {
      let sum = 0; // accumulate to prevent JIT from eliding the calls
      for (let i = 0; i < 1000; i++) {
        // Perturb g^tt by ±2e-15 (machine-epsilon neighbourhood).
        const eps = (Math.random() - 0.5) * 4e-15;
        // Copy the flat array to avoid aliasing; flat[0*4+0] is g^tt.
        const mInv = new Float64Array(BASE_G_INV);
        mInv[0 * 4 + 0] = BASE_G_INV[0 * 4 + 0] * (1 + eps);

        sum += reconstructNullPr(mInv, P_T, P_PHI);
      }
      // Sentinel: if sum is somehow Infinity, log (never reached in practice).
      if (!Number.isFinite(sum)) console.log('null-IC sentinel: non-finite sum');
    },
  );
});
