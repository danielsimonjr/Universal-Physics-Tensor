/**
 * PC-1.5 investigation — BE-37 Shapiro residual floor.
 *
 * Carried from v0.5.1 → v0.6.0 → v0.7 per `docs/planning/
 * v0.6.0-Brainstorm.md` "PC-1.5". v0.6.0 Phase 1 cleared the
 * GL4 integrator as the suspect (bit-exact Killing-charge
 * conservation). Remaining suspects per the brainstorm:
 *   (1) GL4 step count — current default 2048; floor may sit at
 *       O(h⁴) truncation
 *   (2) Null-IC reconstruction noise — initial-state metric eval
 *       at 12-13th digit, compounding across integration
 *   (3) Affine-parameter coverage mismatch with closed-form
 *
 * This file is **measure-and-document** per v0.6.0 Decision #8:
 * the sweep ASSERTS only sanity bounds (residual stays in a
 * documented band); the actual numbers are captured to the
 * findings doc `docs/architecture/archive/v0.7-pc15-shapiro-floor.md`.
 *
 * @module tests/numerical/be37-shapiro-step-sweep
 */

import { describe, it, expect } from 'vitest';
import { evaluateCovariantEikonalNumerical } from '../../src/numerical/index.js';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { evaluateCatalogRelation } from '../../src/bridges/relation-eval.js';

// Earth-Mars solar geometry — matches the existing real.test.ts case.
const PARAMS = {
  M_kg: 1.989e30,
  R_far_m: 2.279e11,  // Mars-Sun
  R_near_m: 1.496e11, // Earth-Sun
};

// Closed-form reference: Δt = (2GM/c³) · ln(R_far/R_near).
// For these inputs ≈ 4.15e-6 s. This is the GROUND TRUTH the
// numerical evaluator is compared against.
const shapiro = catalogRelations().find((row) => row.sources.includes('far-radius'));
if (shapiro === undefined) throw new Error('the Shapiro relation is not in the catalog');
const closedForm = evaluateCatalogRelation(shapiro, {
  mass: PARAMS.M_kg,
  'far-radius': PARAMS.R_far_m,
  'near-radius': PARAMS.R_near_m,
});

function relErr(numerical: number, reference: number): number {
  return Math.abs(numerical - reference) / Math.abs(reference);
}

describe('PC-1.5 — BE-37 Shapiro residual floor: step-count sweep', () => {
  // Long-running: gated behind GL4_LONG to keep the default suite fast.
  const isLong = process.env.GL4_LONG === '1';
  const itIfLong = isLong ? it : it.skip;

  itIfLong('relErr at 2048 steps (current default)', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      ...PARAMS,
      steps: 2048,
    });
    const err = relErr(result.shapiroDelaySec, closedForm);
    // eslint-disable-next-line no-console
    console.log(`[PC-1.5] steps=2048  shapiroDelaySec=${result.shapiroDelaySec.toExponential(6)}  closedForm=${closedForm.toExponential(6)}  relErr=${err.toExponential(3)}`);
    // Sanity: relErr stays under 1e-2 (well above the suspected
    // ~2.5e-4 floor; the actual number lands in the findings doc).
    expect(err).toBeLessThan(1e-2);
  });

  itIfLong('relErr at 4096 steps (2x default)', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      ...PARAMS,
      steps: 4096,
    });
    const err = relErr(result.shapiroDelaySec, closedForm);
    console.log(`[PC-1.5] steps=4096  shapiroDelaySec=${result.shapiroDelaySec.toExponential(6)}  closedForm=${closedForm.toExponential(6)}  relErr=${err.toExponential(3)}`);
    expect(err).toBeLessThan(1e-2);
  });

  itIfLong('relErr at 8192 steps (4x default)', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      ...PARAMS,
      steps: 8192,
    });
    const err = relErr(result.shapiroDelaySec, closedForm);
    console.log(`[PC-1.5] steps=8192  shapiroDelaySec=${result.shapiroDelaySec.toExponential(6)}  closedForm=${closedForm.toExponential(6)}  relErr=${err.toExponential(3)}`);
    expect(err).toBeLessThan(1e-2);
  });

  // SHORT-running smoke test: always runs, asserts the relErr is
  // in the documented band so a regression here surfaces immediately.
  //
  // Empirical band (2026-05-23 measurement, PC-1.5 closure):
  //   relErr at steps=2048 is ~2.3e-8 (FP arithmetic floor — see
  //   findings doc). Band [1e-10, 1e-6] catches both improvements
  //   (lower bound) and regressions (upper bound, 2 OOM above
  //   measured floor).
  it('relErr at default (2048) steps stays in the [1e-10, 1e-6] band (smoke)', async () => {
    const result = await evaluateCovariantEikonalNumerical({
      ...PARAMS,
      steps: 2048,
    });
    const err = relErr(result.shapiroDelaySec, closedForm);
    expect(err).toBeGreaterThan(1e-10);
    expect(err).toBeLessThan(1e-6);
  });
});
