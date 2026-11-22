/**
 * Part B steps B9–B11: the catalog engine evaluates wired cases from expr, relation, and method fields.
 *
 * The three cases whose whole-case runners were deleted in S5
 * (`case-skin-depth`, `case-kepler-rv`, `case-damped-resonator`) carry pinned
 * numeric reference expectations on `runAppliedCaseEngine` instead of a
 * legacy-runner comparison: every output key at 1e-12 relative, the check ids
 * with their `holds` verdicts, and the `unchecked` count. The pinned values
 * are the runner outputs recorded before deletion, cross-checked against the
 * hand arithmetic in `tests/cases/skin-depth.test.ts` (δ ≈ 65.2 µm),
 * `kepler-rv.test.ts` (K ≈ 12.48 m/s) and `damped-resonator.test.ts`
 * (envelope ≈ 7.304e-7 m, x_th ≈ 6.4358e-11 m).
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import { appliedCaseRecord } from '../../src/cases/catalog.js';
import { runAppliedCaseEngine } from '../../src/cases/engine.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import { catalogSemanticProblems, readAppliedCaseFile } from '../../src/cases/catalog.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';
import type { CaseResult } from '../../src/cases/types.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';

const schema = dataSchema('applied-cases.json');

interface PinnedCase {
  outputs: Record<string, number | null>;
  checks: { id: string; holds: boolean }[];
  uncheckedCount: number;
}

/** Pin the engine's full result for a case on the catalog valid example. */
function pinCase(id: string, expected: PinnedCase) {
  const validArgs = APPLIED_CASES.get(id)!.examples.valid.args;
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(id)!.parameters, validArgs).inputs;
  const got = runAppliedCaseEngine(appliedCaseRecord(id), inputs);
  expect(Object.keys(got.outputs)).toEqual(Object.keys(expected.outputs));
  for (const [key, value] of Object.entries(expected.outputs)) {
    const gotValue = (got.outputs as Record<string, number | null>)[key];
    if (value === null) expect(gotValue, key).toBeNull();
    else if (Math.abs(value) > 1) expect(Math.abs((gotValue as number) / value - 1), key).toBeLessThan(1e-12);
    else expect(gotValue, key).toBeCloseTo(value, 10);
  }
  expect(got.checks.map((c) => ({ id: c.id, holds: c.holds }))).toEqual(expected.checks);
  expect(got.unchecked.length).toBe(expected.uncheckedCount);
}

describe('applied-case engine — skin depth', () => {
  const ID = 'case-skin-depth';
  const validArgs = APPLIED_CASES.get(ID)!.examples.valid.args;

  it('pinned reference: copper at 1 MHz (the deleted runner outputs, on the catalog valid example)', () => {
    pinCase(ID, {
      outputs: {
        omega_per_s: 6283185.307179586,
        displacement_ratio: 9.346260472095563e-13,
        delta_m: 6.523411464521558e-5,
        R_s_ohm: 0.00025753396196712467,
        delta_maxwell_m: 6.523411464524606e-5,
        maxwell_deviation: -4.671818487622659e-13,
        mfp_ratio: 0.0005978466974236822,
        omega_tau: 1.560791254649706e-7,
        thickness_ratio: 15.329402498043136,
        back_field_ratio: 2.2005188047747579e-7,
      },
      checks: [
        { id: 'good-conductor', holds: true },
        { id: 'local', holds: true },
        { id: 'dc-conductivity', holds: true },
        { id: 'thick', holds: true },
      ],
      uncheckedCount: 2,
    });
  });

  it('control: mutating the skin-depth exponent moves delta_m (expression is not inert prose)', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "sqrt(2*rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
      '"expr": "sqrt(rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
    );
    readAppliedCaseFile(mutated, schema);
    const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, validArgs).inputs;
    const baseline = runAppliedCase(ID, inputs).outputs.delta_m!;
    const file = JSON.parse(mutated) as { cases: { id: string; outputs: { key: string; expr?: string }[] }[] };
    const row = file.cases.find((c) => c.id === ID)!;
    const delta = row.outputs.find((o) => o.key === 'delta_m')!;
    expect(delta.expr).toContain('rho_ohm_m');
    const scope = {
      ...inputs,
      rho_ohm_m: inputs.rho_ohm_m!,
      omega_per_s: 2 * Math.PI * inputs.f_Hz!,
      mu_r: inputs.mu_r!,
      mu_0: 1.25663706127e-6,
    };
    const wrong = Math.sqrt(scope.rho_ohm_m! / (scope.omega_per_s * scope.mu_r * scope.mu_0));
    expect(Math.abs(wrong / baseline - 1)).toBeGreaterThan(0.2);
  });
});

describe('applied-case engine — kepler RV', () => {
  it('pinned reference: the Sun and Jupiter, edge-on over one orbit (the deleted runner outputs)', () => {
    pinCase('case-kepler-rv', {
      outputs: {
        q: 0.0009542483660130719,
        a_m: 778405488388.7231,
        a_star_m: 742084032.9146931,
        K_m_per_s: 12.478650981128844,
        K_two_body_m_per_s: 12.47071880031423,
        two_body_deviation: 0.0006360644435678964,
        r_peri_m: 740341460006.5146,
        weak_field: 1.8993606607363173e-9,
        dphi_rad_per_orbit: 3.588792054420453e-8,
        omega_dot_deg_per_yr: 1.7334589385915667e-7,
        apsidal_misfit: 1.7753379285698968e-9,
      },
      checks: [
        { id: 'test-mass', holds: true },
        { id: 'point-mass', holds: true },
        { id: 'weak-field', holds: true },
        { id: 'apsidal', holds: true },
      ],
      uncheckedCount: 2,
    });
  });

  it('refuses an unknown relation id at catalog validation', () => {
    const text = dataText('applied-cases.json');
    type MutableFile = { schemaVersion: number; cases: Array<{ id: string; outputs: Array<{ key: string; relation?: { relation: string; inputs: Record<string, string> } }> }> };
    const file = structuredClone(JSON.parse(text)) as MutableFile;
    const row = file.cases.find((c) => c.id === 'case-kepler-rv')!;
    const dphi = row.outputs.find((o) => o.key === 'dphi_rad_per_orbit')!;
    dphi.relation = { relation: 'be-99999', inputs: dphi.relation!.inputs };
    expect(catalogSemanticProblems(file as unknown as ReturnType<typeof readAppliedCaseFile>, CASE_METHOD_NAMES)).toContainEqual(
      expect.stringMatching(/unknown relation 'be-99999'/),
    );
  });
});

describe('applied-case engine — damped resonator', () => {
  it('pinned reference: 1 kHz, Q = 1000, 1 N/m at 300 K (the deleted runner outputs)', () => {
    pinCase('case-damped-resonator', {
      outputs: {
        alpha_per_s: 3.141592653589793,
        tau_s: 0.3183098861837907,
        linewidth_Hz: 1,
        f_d_Hz: 999.9998749999922,
        x_m: 7.304026601130479e-7,
        envelope_m: 7.30402782348999e-7,
        resolution_Hz: 0.05,
        linewidth_windowed_Hz: 1,
        windowed_excess: 0,
        x_th_rms_m: 6.435795988065501e-11,
        envelope_rms_m: 7.304027880197702e-7,
      },
      checks: [
        { id: 'underdamped', holds: true },
        { id: 'single-lorentzian', holds: true },
        { id: 'resolved', holds: true },
        { id: 'in-record', holds: true },
        { id: 'above-thermal', holds: true },
      ],
      uncheckedCount: 2,
    });
  });

  it('control: mutating the envelope decay moves envelope_m', () => {
    const inputs = resolveEvaluatorInputs(
      APPLIED_CASES.get('case-damped-resonator')!.parameters,
      APPLIED_CASES.get('case-damped-resonator')!.examples.valid.args,
    ).inputs;
    const baseline = runAppliedCase('case-damped-resonator', inputs).outputs.envelope_m!;
    const mutatedExpr = 'abs(x0_m)*exp(-2*alpha_per_s*t_s)/sqrt(1-1/(4*Q*Q))';
    const scope = runAppliedCase('case-damped-resonator', inputs).outputs;
    const wrong = evaluateFormula(mutatedExpr, { ...inputs, ...scope } as Record<string, number>);
    expect(Math.abs(wrong / baseline - 1)).toBeGreaterThan(0.05);
  });
});
