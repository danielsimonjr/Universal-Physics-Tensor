/**
 * Part B steps B9–B11: the catalog engine evaluates wired cases from expr, relation, and method fields.
 *
 * The three cases whose whole-case runners were deleted in S5
 * (`case-skin-depth`, `case-kepler-rv`, `case-damped-resonator`) carry pinned
 * numeric reference expectations on `runAppliedCaseEngine` instead of a
 * legacy-runner comparison. The output keys are engine outputs on the catalog
 * valid example; check quantities are pinned from catalog `expr`s / hand
 * arithmetic as cited; both are compared at 1e-12 relative (absolute 1e-15
 * floor only for true zeros). Cross-checked against `skin-depth.test.ts`
 * (δ ≈ 65.2 µm), `kepler-rv.test.ts` (K ≈ 12.48 m/s) and
 * `damped-resonator.test.ts` (envelope ≈ 7.304e-7 m, x_th ≈ 6.4358e-11 m).
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import {
  appliedCaseRecord,
  catalogSemanticProblems,
  readAppliedCaseFile,
  type AppliedCaseRecord,
} from '../../src/cases/catalog.js';
import { runAppliedCaseEngine } from '../../src/cases/engine.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';
import type { CaseResult } from '../../src/cases/types.js';
import { C_SI, EPS0_SI, G_SI, K_B_SI, M_SUN_SI, MU0_SI } from '../../src/core/constants.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';

const schema = dataSchema('applied-cases.json');

interface PinnedCase {
  outputs: Record<string, number | null>;
  checks: { id: string; holds: boolean; value: number }[];
  uncheckedCount: number;
}

/**
 * Relative 1e-12 when |expected| > 0; absolute 1e-15 floor only when expected
 * is a true zero. Not `toBeCloseTo(..., 10)`: that matcher is an absolute
 * 5e-11 window, which is blind at magnitudes such as good-conductor (~9.35e-13).
 */
function expectPinNumber(got: number, expected: number, label?: string): void {
  if (expected === 0) {
    expect(Math.abs(got), label).toBeLessThanOrEqual(1e-15);
    return;
  }
  expect(Math.abs(got / expected - 1), label).toBeLessThan(1e-12);
}

/** Pin the engine's full result for a case on the catalog valid example. */
function pinCase(id: string, expected: PinnedCase, record: AppliedCaseRecord = appliedCaseRecord(id)): CaseResult {
  const validArgs = APPLIED_CASES.get(id)!.examples.valid.args;
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(id)!.parameters, validArgs).inputs;
  const got = runAppliedCaseEngine(record, inputs);
  expect(Object.keys(got.outputs)).toEqual(Object.keys(expected.outputs));
  for (const [key, value] of Object.entries(expected.outputs)) {
    const gotValue = (got.outputs as Record<string, number | null>)[key];
    if (value === null) expect(gotValue, key).toBeNull();
    else {
      expect(gotValue, key).not.toBeNull();
      expectPinNumber(gotValue as number, value, key);
    }
  }
  expect(got.checks.map((c) => ({ id: c.id, holds: c.holds }))).toEqual(
    expected.checks.map((c) => ({ id: c.id, holds: c.holds })),
  );
  expect(got.checks).toHaveLength(expected.checks.length);
  for (let i = 0; i < expected.checks.length; i++) {
    expectPinNumber(got.checks[i]!.value, expected.checks[i]!.value, expected.checks[i]!.id);
  }
  expect(got.unchecked.length).toBe(expected.uncheckedCount);
  return got;
}

describe('applied-case engine — skin depth', () => {
  const ID = 'case-skin-depth';
  const validArgs = APPLIED_CASES.get(ID)!.examples.valid.args;
  // skin-depth.test.ts:105–108 writes √(2ρ/(ω·4π×10⁻⁷)). That pre-2019 μ0
  // differs from MU0_SI by ~1.3e-10 relative, so it cannot pin at 1e-12.
  // The 1e-12 pin uses MU0_SI, the same μ0 the engine binds as mu_0.
  const handDelta = Math.sqrt((2 * 1.68e-8) / (2 * Math.PI * 1e6 * MU0_SI));
  // Catalog check exprs on the valid example (skin-depth.test.ts:12).
  const goodConductor = 2 * Math.PI * 1e6 * EPS0_SI * 1.68e-8; // 2π·f·ε_r·ε_0·ρ
  const local = 39e-9 / handDelta; // l/δ
  const dcConductivity = (2 * Math.PI * 1e6 * 39e-9) / 1.57e6; // 2π·f·l/v
  const thick = 1e-3 / handDelta; // d/δ

  const skinPinned: PinnedCase = {
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
      { id: 'good-conductor', holds: true, value: goodConductor },
      { id: 'local', holds: true, value: local },
      { id: 'dc-conductivity', holds: true, value: dcConductivity },
      { id: 'thick', holds: true, value: thick },
    ],
    uncheckedCount: 2,
  };

  it('pinned reference: copper at 1 MHz (engine outputs on the catalog valid example)', () => {
    const got = pinCase(ID, skinPinned);
    expectPinNumber(got.outputs.delta_m as number, handDelta, 'delta_m');
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

  it('control: a 2× change of good-conductor (~9.35e-13) fails the pins', () => {
    // toBeCloseTo(..., 10) is an absolute 5e-11 window; 2× of ~9.35e-13 sat inside it.
    expect(Math.abs(goodConductor)).toBeLessThan(5e-11);
    expect(() => expectPinNumber(2 * goodConductor, goodConductor, 'good-conductor')).toThrow();
    const text = dataText('applied-cases.json');
    type MutableFile = { schemaVersion: number; cases: Array<{ id: string; checks: Array<{ id: string; expr: string }> }> };
    const file = structuredClone(JSON.parse(text)) as MutableFile;
    const row = file.cases.find((c) => c.id === ID)!;
    const check = row.checks.find((c) => c.id === 'good-conductor')!;
    check.expr = `2*(${check.expr})`;
    const mutated = readAppliedCaseFile(JSON.stringify(file), schema);
    const record = mutated.cases.find((c) => c.id === ID)!;
    expect(() => pinCase(ID, skinPinned, record)).toThrow();
  });
});

describe('applied-case engine — kepler RV', () => {
  // kepler-rv.test.ts:15 valid args. Catalog 1Msun is M_SUN_SI.
  const P_s = 4332.59 * 86400;
  const m_p = 1.898e27;
  const eccentricity = 0.0489;
  const handK =
    (Math.cbrt((2 * Math.PI * G_SI) / P_s) * m_p) / Math.cbrt(M_SUN_SI ** 2) / Math.sqrt(1 - eccentricity ** 2);
  const handA = ((G_SI * (M_SUN_SI + m_p) * P_s * P_s) / (4 * Math.PI * Math.PI)) ** (1 / 3);
  const testMass = m_p / M_SUN_SI; // catalog expr m_p_kg/M_star_kg
  // Catalog point-mass expr is R_star_m/r_peri_m, not m_p/(M_☉+m_p) (that is q/(1+q)).
  const pointMass = 6.957e8 / (handA * (1 - eccentricity));
  const weakField = (G_SI * (M_SUN_SI + m_p)) / (C_SI ** 2 * handA);
  const dphi = (6 * Math.PI * G_SI * (M_SUN_SI + m_p)) / (C_SI ** 2 * handA * (1 - eccentricity ** 2));
  const apsidal = (eccentricity * dphi * (12 * 365.25 * 86400)) / P_s;

  it('pinned reference: the Sun and Jupiter, edge-on over one orbit (engine outputs on the catalog valid example)', () => {
    const got = pinCase('case-kepler-rv', {
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
        { id: 'test-mass', holds: true, value: testMass },
        { id: 'point-mass', holds: true, value: pointMass },
        { id: 'weak-field', holds: true, value: weakField },
        { id: 'apsidal', holds: true, value: apsidal },
      ],
      uncheckedCount: 2,
    });
    expectPinNumber(got.outputs.K_m_per_s as number, handK, 'K_m_per_s');
  });

  it('refuses an unknown relation id at catalog validation', () => {
    const text = dataText('applied-cases.json');
    type MutableFile = { schemaVersion: number; cases: Array<{ id: string; outputs: Array<{ key: string; relation?: { relation: string; inputs: Record<string, string> } }> }> };
    const file = structuredClone(JSON.parse(text)) as MutableFile;
    const row = file.cases.find((c) => c.id === 'case-kepler-rv')!;
    const dphiOut = row.outputs.find((o) => o.key === 'dphi_rad_per_orbit')!;
    dphiOut.relation = { relation: 'be-99999', inputs: dphiOut.relation!.inputs };
    expect(catalogSemanticProblems(file as unknown as ReturnType<typeof readAppliedCaseFile>, CASE_METHOD_NAMES)).toContainEqual(
      expect.stringMatching(/unknown relation 'be-99999'/),
    );
  });
});

describe('applied-case engine — damped resonator', () => {
  // damped-resonator.test.ts:64–67 envelope; :176–178 x_th; in-record = 0.1/20 exactly.
  const handEnv = (1e-6 * Math.exp((-Math.PI * 1000 * 0.1) / 1000)) / Math.sqrt(1 - 1 / 4e6);
  const xTh = Math.sqrt((K_B_SI * 300) / 1);
  const inRecord = 0.1 / 20;
  const resolved = (1 / 20) / (1000 / 1000);

  const dampedPinned: PinnedCase = {
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
      { id: 'underdamped', holds: true, value: 1000 },
      { id: 'single-lorentzian', holds: true, value: 1000 },
      { id: 'resolved', holds: true, value: resolved },
      { id: 'in-record', holds: true, value: inRecord },
      { id: 'above-thermal', holds: true, value: xTh / handEnv },
    ],
    uncheckedCount: 2,
  };

  it('pinned reference: 1 kHz, Q = 1000, 1 N/m at 300 K (engine outputs on the catalog valid example)', () => {
    const got = pinCase('case-damped-resonator', dampedPinned);
    expectPinNumber(got.outputs.envelope_m as number, handEnv, 'envelope_m');
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

  it('control: doubling the in-record catalog expr fails the pinned 0.005', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace('"expr": "t_s/t_obs_s"', '"expr": "2*t_s/t_obs_s"');
    expect(mutated, 'the in-record expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === 'case-damped-resonator')!;
    expect(record.checks.find((c) => c.id === 'in-record')!.expr).toBe('2*t_s/t_obs_s');
    const inputs = resolveEvaluatorInputs(
      APPLIED_CASES.get('case-damped-resonator')!.parameters,
      APPLIED_CASES.get('case-damped-resonator')!.examples.valid.args,
    ).inputs;
    const got = runAppliedCaseEngine(record, inputs);
    const inRecordCheck = got.checks.find((c) => c.id === 'in-record')!;
    expect(inRecordCheck.holds).toBe(true);
    expectPinNumber(inRecordCheck.value, 0.01, 'mutated in-record');
    expect(() => expectPinNumber(inRecordCheck.value, inRecord, 'in-record')).toThrow();
    expect(() => pinCase('case-damped-resonator', dampedPinned, record)).toThrow();
  });
});
