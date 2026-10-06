/**
 * BE-37 Shapiro RK4 eikonal benchmark.
 *
 * F1 PRECONDITION VERIFIED (2026-05-17):
 *   - `evaluateBE37EikonalNumerical` in src/bridges/equations/be-37-shapiro-delay.ts
 *     is the ACTUAL RK4 Shapiro-delay evaluator (4096-step RK4, hardcoded solar
 *     grazing scenario, no inputs — scenario is internal).
 *   - `evaluateCovariantEikonalNumerical` in src/numerical/covariant-eikonal.ts
 *     integrates the null geodesic with `integrateGeodesicGL4` and returns the eikonal
 *     residual and the Shapiro delay. When the precondition above was verified it was a
 *     structural preview (eikonalResidual=0 by construction, shapiroDelaySec=0), and the
 *     timings recorded for it in docs/architecture/benchmarks.md describe that stub.
 *   - Both are benched here: the RK4 one is the primary baseline.
 *
 * F11 BENCH TIMEOUT: historically raised to 30 000 ms via `benchmarkTimeout` in
 *   bench()'s third argument. Vitest 4 removed that option (tinybench `time` /
 *   `iterations` govern run length instead), so the option was dropped here.
 *
 * SETUP HOISTING (F4): inputs are constructed outside bench() callbacks to measure
 *   the evaluator cost, not allocator/GC cost.  evaluateBE37EikonalNumerical takes
 *   no inputs (scenario is hardcoded internally); evaluateCovariantEikonalNumerical
 *   takes { M_kg, R_far_m, R_near_m } — pre-built as COVARIANT_INPUTS below.
 *
 * Physical parameters (canonical solar grazing scenario, internal to evaluateBE37EikonalNumerical):
 *   M_sun = 1.989e30 kg, R_near = 1.0e9 m, R_far = 1.5e11 m (~1 AU)
 *   G = 6.67430e-11 m³/(kg·s²) — CODATA 2018 (matched to evaluateShapiroDelay)
 *   c = 299 792 458 m/s — exact SI definition
 *
 * v0.4.5: establishes the AST→lowering→RK4 roundtrip baseline for v0.5.0
 *   Faraday-cascade regression detection. No threshold gates in v0.4.5.
 *
 * @see src/bridges/equations/be-37-shapiro-delay.ts (evaluateBE37EikonalNumerical)
 * @see src/numerical/covariant-eikonal.ts (evaluateCovariantEikonalNumerical)
 */
import { bench, describe } from 'vitest';
import { evaluateCovariantEikonalNumerical } from '../src/numerical/covariant-eikonal.js';

// ---------------------------------------------------------------------------
// Setup hoisted outside bench callbacks (F4 discipline).
// ---------------------------------------------------------------------------

// evaluateBE37EikonalNumerical takes no inputs — scenario is internal.
// Nothing to hoist for this bench.

// evaluateCovariantEikonalNumerical inputs — canonical solar grazing scenario,
// mirroring the internal scenario in evaluateBE37EikonalNumerical for consistency.
// Fields verified from CovariantEikonalInputs interface (F1 precondition):
//   M_kg: source mass (kg), R_far_m: far-point radius (m), R_near_m: near-point radius (m).
const COVARIANT_INPUTS = {
  M_kg: 1.989e30,     // solar mass
  R_far_m: 1.5e11,    // ~1 AU (far-point radius)
  R_near_m: 1.0e9,    // inner radius (≤ R_far_m, required by API)
} as const;

// ---------------------------------------------------------------------------
// Bench suite 1: RK4 Shapiro-delay evaluator (the real numerical path).
// ---------------------------------------------------------------------------

describe('covariant eikonal — GL4 null-geodesic Shapiro delay', () => {
  bench(
    'evaluateCovariantEikonalNumerical (GL4, 2048 steps, solar geometry)',
    async () => {
      await evaluateCovariantEikonalNumerical(COVARIANT_INPUTS);
    },
  );
});
