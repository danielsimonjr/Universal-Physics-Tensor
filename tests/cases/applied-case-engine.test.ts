/**
 * Part B steps B9–B11: the catalog engine evaluates wired cases from expr, relation, and method fields.
 *
 * The three cases whose whole-case runners were deleted in S5
 * (`case-skin-depth`, `case-kepler-rv`, `case-damped-resonator`) and the case
 * migrated in S6 (`case-resistor-noise`) carry pinned numeric reference
 * expectations on `runAppliedCaseEngine` instead of a legacy-runner
 * comparison. The output keys are engine outputs on the catalog
 * valid example; check quantities are pinned from catalog `expr`s / hand
 * arithmetic as cited; both are compared at 1e-12 relative (absolute 1e-15
 * floor only for true zeros). Cross-checked against `skin-depth.test.ts`
 * (δ ≈ 65.2 µm), `kepler-rv.test.ts` (K ≈ 12.48 m/s),
 * `damped-resonator.test.ts` (envelope ≈ 7.304e-7 m, x_th ≈ 6.4358e-11 m) and
 * `resistor-noise.test.ts` (V_rms,0 ≈ 4.0704e-7 V, φ ≈ 0.89229, T_n ≈ 36.2 K).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import { FormulaValueError } from '../../src/numerical/formula-contract.js';
import {
  appliedCaseCatalog,
  appliedCaseRecord,
  catalogSemanticProblems,
  readAppliedCaseFile,
  type AppliedCaseRecord,
} from '../../src/cases/catalog.js';
import { runAppliedCaseEngine } from '../../src/cases/engine.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import {
  CASE_METHOD_NAMES,
  MAX_BIOT,
  SIGMA_SB_SI,
  ballisticDeficit,
  brennerPerpendicular,
  brownianReynolds,
  brownianWallDeviation,
  faxenParallel,
  G_STANDARD,
  hydrodynamicMsdRatio,
  lumpedCoolingQJ,
  lumpedRadiativeConductance,
  lumpedRadiatingTempK,
  lumpedRadiatingTemperature,
  resetSphereSeriesMemo,
  sphereSeries,
  sphereSeriesComputations,
} from '../../src/cases/methods.js';
import { mulberry32 } from '../helpers/mulberry32.js';
import { capture, text } from '../helpers/cli.js';
import { runCli } from '../../src/cli/main.js';
import type { CaseResult } from '../../src/cases/types.js';
import { C_SI, EPS0_SI, G_SI, H_SI, K_B_SI, M_SUN_SI, MU0_SI } from '../../src/core/constants.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';

const schema = dataSchema('applied-cases.json');

interface PinnedCase {
  outputs: Record<string, number | null>;
  checks: { id: string; holds: boolean; value: number }[];
  uncheckedCount: number;
  /**
   * Outputs pinned by an ABSOLUTE window instead of `expectPinNumber`'s
   * relative one: a residual that is itself a difference of two
   * nearly-equal numbers (e.g. resistor-noise's `parent_deviation` ≈ 2.6e-7,
   * (V_rms − V_rms,parent)/V_rms,parent) inherits the reference's own
   * last-ulp quadrature difference as an absolute shift, so 1e-12 relative
   * would demand a quadrature accurate to ~2.6e-19. The absolute window is
   * still far below any real model change (mutating the parent moves the
   * deviation by orders of magnitude).
   */
  absolutePins?: Record<string, { expected: number; tol: number }>;
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
    if (key in (expected.absolutePins ?? {})) continue;
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
  for (const [key, pin] of Object.entries(expected.absolutePins ?? {})) {
    expect(Math.abs((got.outputs[key] as number) - pin.expected), key).toBeLessThan(pin.tol);
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
    expect(() => expectPinNumber(2 * goodConductor, goodConductor, 'good-conductor')).toThrow(
      /to be less (or equal )?than/,
    );
    const text = dataText('applied-cases.json');
    type MutableFile = { schemaVersion: number; cases: Array<{ id: string; checks: Array<{ id: string; expr: string }> }> };
    const file = structuredClone(JSON.parse(text)) as MutableFile;
    const row = file.cases.find((c) => c.id === ID)!;
    const check = row.checks.find((c) => c.id === 'good-conductor')!;
    check.expr = `2*(${check.expr})`;
    const mutated = readAppliedCaseFile(JSON.stringify(file), schema);
    const record = mutated.cases.find((c) => c.id === ID)!;
    expect(() => pinCase(ID, skinPinned, record)).toThrow(/to be less (or equal )?than/);
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
    expect(() => expectPinNumber(inRecordCheck.value, inRecord, 'in-record')).toThrow(
      /to be less (or equal )?than/,
    );
    expect(() => pinCase('case-damped-resonator', dampedPinned, record)).toThrow(
      /to be less (or equal )?than/,
    );
  });
});

describe('applied-case engine — resistor noise', () => {
  // resistor-noise.test.ts:12 valid args (the catalog valid example), with the
  // amplifier noise the example carries; the no-amplifier variant drops them.
  const ID = 'case-resistor-noise';
  const validArgs = APPLIED_CASES.get(ID)!.examples.valid.args;
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, validArgs).inputs;
  // Hand arithmetic on the exact SI constants (resistor-noise.test.ts's K_B/H readings).
  const T = 300;
  const R = 1000;
  const Rin = 1e6;
  const C = 20e-12;
  const fLo = 0;
  const fHi = 1e4;
  const tAvg = 10;
  const en2 = 1e-18;
  const in2 = 1e-24;
  const B = fHi - fLo;
  const rEff = (R * Rin) / (R + Rin);
  const S = 4 * K_B_SI * T * rEff;
  const S0 = 4 * K_B_SI * T * R;
  const excess = en2 + in2 * rEff * rEff;
  const fraction = S / (S + excess);
  // The parent integral, computed here by composite Simpson over 1000 panels —
  // an independent quadrature from the engine's adaptive Gauss–Kronrod. The
  // integrand is the catalog's parent: Nyquist's thermal density through the
  // input RC (resistor-noise.test.ts:37 closed form at planck = 1; the Planck
  // factor x/(eˣ−1) at x = hf/k_BT ≤ 1.6e-9 is kept exactly).
  const parentDensity = (f: number) => {
    const x = (H_SI * f) / (K_B_SI * T);
    const planck = x === 0 ? 1 : x / Math.expm1(x);
    const w = 2 * Math.PI * f * rEff * C;
    return (4 * K_B_SI * T * rEff * planck) / (1 + w * w);
  };
  const simpson = (n: number) => {
    const h = (fHi - fLo) / n;
    let s = parentDensity(fLo) + parentDensity(fHi);
    for (let i = 1; i < n; i++) s += parentDensity(fLo + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  };
  const vParent = Math.sqrt(simpson(1000));
  const resistorPinned: PinnedCase = {
    outputs: {
      B_Hz: B,
      R_eff_ohm: rEff,
      S_V_V2_per_Hz: S,
      V_rms_unloaded_V: Math.sqrt(S0 * B),
      V_rms_V: Math.sqrt(S * B),
      loading_ratio: Math.sqrt(S / S0),
      V_rms_parent_V: vParent,
      parent_deviation: Math.sqrt(S * B) / vParent - 1,
      V_rms_rel_sigma: 1 / (2 * Math.sqrt(B * tAvg)),
      V_rms_total_V: Math.sqrt((S + excess) * B),
      resistor_fraction: fraction,
      T_n_K: excess / (4 * K_B_SI * rEff),
    },
    absolutePins: {
      // Cancellation residual (see PinnedCase.absolutePins): (V_rms − V_parent)/V_parent ≈ 2.6e-7.
      // parent_deviation = V_rms/V_parent − 1, so a relative error δ on V_parent
      // (the independent Simpson vs Gauss–Kronrod agreement, 2.4e-15) shifts the
      // residual by ≈ (V_rms/V_parent)·δ ≈ 2.4e-15 absolute. The 1e-14 window is
      // ~4× that propagated last-ulp shift, not ~40×, and still ~8 decades below
      // any real model change. The 2.4e-15 is already the absolute shift of the
      // residual; dividing 1e-14 by it again as if it were a relative pin on
      // parent_deviation is the 10× miscount.
      parent_deviation: { expected: Math.sqrt(S * B) / vParent - 1, tol: 1e-14 },
    },
    checks: [
      { id: 'classical', holds: true, value: (H_SI * fHi) / (K_B_SI * T) },
      { id: 'flat-band', holds: true, value: ((2 * Math.PI * fHi) * rEff) * C },
      { id: 'amplifier', holds: true, value: 1 / (fraction * Math.sqrt(B * tAvg)) },
    ],
    uncheckedCount: 3,
  };

  it('pinned reference: 1 kΩ at 300 K through a 1 MΩ ∥ 20 pF input (engine outputs on the catalog valid example)', () => {
    const got = pinCase(ID, resistorPinned);
    expectPinNumber(got.outputs.S_V_V2_per_Hz as number, S, 'S_V_V2_per_Hz');
    expectPinNumber(got.outputs.V_rms_parent_V as number, vParent, 'V_rms_parent_V');
  });

  it('pinned reference without the amplifier: the gated outputs are null and the amplifier check is absent', () => {
    const noAmp = { ...inputs };
    delete noAmp.e_n2_V2_per_Hz;
    delete noAmp.i_n2_A2_per_Hz;
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), noAmp);
    expect(got.outputs.V_rms_total_V).toBeNull();
    expect(got.outputs.resistor_fraction).toBeNull();
    expect(got.outputs.T_n_K).toBeNull();
    for (const key of ['B_Hz', 'R_eff_ohm', 'S_V_V2_per_Hz', 'V_rms_unloaded_V', 'V_rms_V', 'loading_ratio', 'V_rms_parent_V', 'V_rms_rel_sigma']) {
      expectPinNumber(got.outputs[key] as number, resistorPinned.outputs[key] as number, key);
    }
    expect(Math.abs((got.outputs.parent_deviation as number) - (resistorPinned.absolutePins!.parent_deviation!.expected))).toBeLessThan(1e-14);
    expect(got.checks.map((c) => c.id)).toEqual(['classical', 'flat-band']);
    expect(got.checks).toHaveLength(2);
    expectPinNumber(got.checks[0]!.value, (H_SI * fHi) / (K_B_SI * T), 'classical');
    expectPinNumber(got.checks[1]!.value, ((2 * Math.PI * fHi) * rEff) * C, 'flat-band');
    expect([...got.unchecked]).toEqual([
      'R_in is a physical resistance at T; an actively synthesized or cold input adds less noise than its resistance would, down to the resistor alone divided by the input: V_rms,0 · R_in/(R + R_in)',
      'no DC current through R, so no 1/f excess noise',
    ]);
  });

  it('the engine routes the case: no runCaseResistorNoise remains', () => {
    expect([...CASE_METHOD_NAMES]).not.toContain('runCaseResistorNoise');
  });

  it('unchecked: the amplifier note names which density was taken as 0', () => {
    const withBoth = runAppliedCaseEngine(appliedCaseRecord(ID), inputs);
    expect(withBoth.unchecked).toContain('e_n and i_n are white over the band and uncorrelated');
    const { i_n2_A2_per_Hz: _in2, ...onlyEnInputs } = inputs;
    const onlyEn = runAppliedCaseEngine(appliedCaseRecord(ID), onlyEnInputs);
    expect(onlyEn.unchecked[2]).toBe('e_n and i_n are white over the band and uncorrelated; i_n was not given and is taken as 0');
    const { e_n2_V2_per_Hz: _en2, ...onlyInInputs } = inputs;
    const onlyIn = runAppliedCaseEngine(appliedCaseRecord(ID), onlyInInputs);
    expect(onlyIn.unchecked[2]).toBe('e_n and i_n are white over the band and uncorrelated; e_n was not given and is taken as 0');
  });

  it('control: mutating the S_V exponent moves S_V_V2_per_Hz by exactly R_eff and fails the pins', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace('"expr": "4*k_B*T_K*R_eff_ohm"', '"expr": "4*k_B*T_K*R_eff_ohm^2"');
    expect(mutated, 'the S_V expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    // S′ = 4 k_B T R_eff² = S · R_eff: the exact factor the mutated exponent predicts.
    expectPinNumber(got.outputs.S_V_V2_per_Hz as number, S * rEff, 'mutated S_V');
    expect(() => pinCase(ID, resistorPinned, record)).toThrow(/to be less (or equal )?than/);
  });

  // Composer review F1: master's JS runner emitted Infinity when the parent
  // integral underflowed to 0. Applied-case expr outputs and checks opt in;
  // every other evaluateFormula caller stays strict, and NaN still throws.
  const PARENT_UNDERFLOW = {
    T_K: 0.02,
    R_ohm: 50,
    R_in_ohm: 1e6,
    C_in_F: 0,
    f_lo_Hz: 1e9,
    f_hi_Hz: 3e18,
    t_avg_s: 1,
  };

  it('parent_deviation is Infinity when the parent integral underflows (f_hi 3e18, matching master)', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), PARENT_UNDERFLOW);
    expect(got.outputs.V_rms_parent_V).toBe(0);
    expect(got.outputs.parent_deviation).toBe(Infinity);
    expect(Number.isFinite(got.outputs.V_rms_V as number)).toBe(true);
    expect((got.outputs.V_rms_V as number) > 0).toBe(true);
  });

  it('NaN still throws on the applied-case output path', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "V_rms_V/V_rms_parent_V - 1"',
      '"expr": "(V_rms_V-V_rms_V)/(V_rms_V-V_rms_V)"',
    );
    expect(mutated, 'the parent_deviation expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    expect(() => runAppliedCaseEngine(record, inputs)).toThrow(FormulaValueError);
    expect(() => runAppliedCaseEngine(record, inputs)).toThrow(/got NaN/);
  });

  it('a check may return Infinity (master parity); NaN on a check still throws', () => {
    const record = structuredClone(appliedCaseRecord(ID));
    const checks = record.checks as Array<(typeof record.checks)[number]>;
    checks.push({
      id: 'parent-nonzero',
      premise: 'control: parent integral underflow yields Infinity, matching master',
      quantity: '1/V_rms,parent',
      expr: '1/V_rms_parent_V',
      op: '>',
      bound: 0,
      threshold: 'CONTROL: checks opt in to Infinity; NaN still throws',
    });
    const got = runAppliedCaseEngine(record, PARENT_UNDERFLOW);
    const overflow = got.checks.find((c) => c.id === 'parent-nonzero')!;
    expect(overflow.value).toBe(Infinity);
    expect(overflow.holds).toBe(true);
    checks.push({
      id: 'nan-check',
      premise: 'control: NaN still throws on checks',
      quantity: '0/0',
      expr: '(V_rms_V-V_rms_V)/(V_rms_V-V_rms_V)',
      op: '<=',
      bound: 1,
      threshold: 'CONTROL: NaN is still refused on checks',
    });
    expect(() => runAppliedCaseEngine(record, inputs)).toThrow(FormulaValueError);
    expect(() => runAppliedCaseEngine(record, inputs)).toThrow(/got NaN/);
  });

  it('CONTROL: renaming the amplifier check id does not re-enable it without amp densities', () => {
    const record = structuredClone(appliedCaseRecord(ID));
    const amp = record.checks.find((c) => c.id === 'amplifier')!;
    expect(amp.needs).toEqual(['e_n2_V2_per_Hz', 'i_n2_A2_per_Hz']);
    (amp as { id: string }).id = 'amp-resolve';
    const noAmp = { ...inputs };
    delete noAmp.e_n2_V2_per_Hz;
    delete noAmp.i_n2_A2_per_Hz;
    const got = runAppliedCaseEngine(record, noAmp);
    expect(got.checks.map((c) => c.id)).toEqual(['classical', 'flat-band']);
    expect(got.outputs.resistor_fraction).toBeNull();
  });

  it('CONTROL: a JSON-only needs-gated output is null when those inputs are absent', () => {
    const text = dataText('applied-cases.json');
    type MutableFile = {
      schemaVersion: number;
      cases: Array<{ id: string; outputs: Array<Record<string, unknown>> }>;
    };
    const file = structuredClone(JSON.parse(text)) as MutableFile;
    const row = file.cases.find((c) => c.id === ID)!;
    row.outputs.push({
      key: 'gated_dummy',
      symbol: 'g',
      unit: '',
      meaning: 'JSON-only needs gate control',
      needs: ['e_n2_V2_per_Hz'],
      expr: 'e_n2_V2_per_Hz*2',
    });
    const mutated = readAppliedCaseFile(JSON.stringify(file), schema);
    const record = mutated.cases.find((c) => c.id === ID)!;
    const noAmp = { ...inputs };
    delete noAmp.e_n2_V2_per_Hz;
    delete noAmp.i_n2_A2_per_Hz;
    const got = runAppliedCaseEngine(record, noAmp);
    expect(got.outputs.gated_dummy).toBeNull();
  });

  it('the resistor runner is gone from DELEGATED_RUN_METHODS and gating is not id-hardcoded', () => {
    const engineSrc = readFileSync(new URL('../../src/cases/engine.ts', import.meta.url), 'utf8');
    expect(engineSrc).not.toMatch(/runCaseResistorNoise/);
    expect(engineSrc).not.toMatch(/AMP_GATED_OUTPUTS/);
    expect(engineSrc).not.toMatch(/row\.id !== 'amplifier'/);
  });

  it('allowInfinity: true is passed from evalOutput and evalCheck; evaluateFormula default stays strict', () => {
    const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const engineSrc = readFileSync(new URL('../../src/cases/engine.ts', import.meta.url), 'utf8');
    expect(stripComments(engineSrc).match(/allowInfinity:\s*true/g)).toEqual([
      'allowInfinity: true',
      'allowInfinity: true',
    ]);
    expect(engineSrc).toMatch(
      /function evalCheck[\s\S]*?evalOutputExpr\(row\.expr!, inputs, outputs, extra, \{ allowInfinity: true \}\)/,
    );
    const exprParse = readFileSync(new URL('../../src/bridges/expr-parse.ts', import.meta.url), 'utf8');
    expect(stripComments(exprParse)).not.toMatch(/allowInfinity:\s*true/);
    expect(exprParse).toMatch(/\.evaluate\(scope, opts\)/);
  });
});

describe('applied-case engine — lumped cooling', () => {
  // lumped-cooling.test.ts:20 valid args (the catalog valid example).
  const ID = 'case-lumped-cooling';
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, APPLIED_CASES.get(ID)!.examples.valid.args).inputs;
  // Hand arithmetic on the exact SI constants (lumped-cooling.test.ts).
  const a = 5e-3;
  const rho = 8933;
  const c = 385;
  const k = 401;
  const h = 20;
  const eps = 0.05;
  const T0 = 373.15;
  const Tinf = 293.15;
  const t = 300;
  const tau = (rho * c * a) / (3 * h);
  const bi = (h * (a / 3)) / k;
  const biRadius = (h * a) / k;
  const alpha = k / (rho * c);
  const fo = (alpha * t) / (a * a);
  const theta = Math.exp(-t / tau);
  const series = sphereSeries(biRadius, fo);
  const hRad = eps * SIGMA_SB_SI * (T0 + Tinf) * (T0 * T0 + Tinf * Tinf);
  const tRad = lumpedRadiatingTemperature({ a, rho, c, h, eps, T0, Tinf, t });
  const lumpedPinned: PinnedCase = {
    outputs: {
      tau_s: tau,
      Bi: bi,
      Bi_radius: biRadius,
      alpha_m2_per_s: alpha,
      Fo: fo,
      theta,
      T_K: Tinf + (T0 - Tinf) * theta,
      Q_J: rho * c * ((4 / 3) * Math.PI * a ** 3) * (T0 - Tinf) * -Math.expm1(-t / tau),
      theta_parent_mean: series.mean,
      parent_deviation: theta / series.mean - 1,
      T_centre_K: Tinf + (T0 - Tinf) * series.centre,
      T_surface_K: Tinf + (T0 - Tinf) * series.surface,
      h_rad_max_W_per_m2_K: hRad,
      Bi_radiating: ((h + hRad) * (a / 3)) / k,
      T_radiating_K: tRad,
    },
    checks: [
      { id: 'lumped', holds: true, value: bi },
      { id: 'linear-loss', holds: true, value: hRad / h },
    ],
    uncheckedCount: 2,
  };

  it('pinned reference: copper 5 mm, h = 20, ε = 0.05, 100 °C → 20 °C at 300 s (engine outputs on the catalog valid example)', () => {
    pinCase(ID, lumpedPinned);
  });

  it('the engine routes the case: no runCaseLumpedCooling remains', () => {
    expect([...CASE_METHOD_NAMES]).not.toContain('runCaseLumpedCooling');
    const engineSrc = readFileSync(new URL('../../src/cases/engine.ts', import.meta.url), 'utf8');
    expect(engineSrc).not.toMatch(/runCaseLumpedCooling/);
  });

  it('validation: the engine carries the domain refusals with the same messages', () => {
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, emissivity: 1.2 })).toThrow(
      /emissivity must be in \[0, 1\] \(got 1\.2\)/,
    );
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, t_s: -1 })).toThrow(/t_s must be a finite number ≥ 0/);
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, a_m: 0 })).toThrow(/a_m must be/);
  });

  it('control: mutating the tau_s prefactor (3 → 4, a coefficient change) moves tau_s by exactly 3/4 and fails the pins', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(3*h_W_per_m2_K)"',
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(4*h_W_per_m2_K)"',
    );
    expect(mutated, 'the tau_s expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    // τ′ = ρca/(4h) = τ · 3/4: the exact factor the mutated coefficient predicts.
    expectPinNumber(got.outputs.tau_s as number, tau * (3 / 4), 'mutated tau_s');
    expect(() => pinCase(ID, lumpedPinned, record)).toThrow(/to be less (or equal )?than/);
  });

  it('tau_s expr mutation moves Q_J and theta together from the same τ', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(3*h_W_per_m2_K)"',
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(4*h_W_per_m2_K)"',
    );
    expect(mutated, 'the tau_s expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    const tauMut = got.outputs.tau_s as number;
    const volume = (4 / 3) * Math.PI * a ** 3;
    expectPinNumber(got.outputs.theta as number, Math.exp(-t / tauMut), 'mutated theta from tau_s');
    expectPinNumber(
      got.outputs.Q_J as number,
      rho * c * volume * (T0 - Tinf) * -Math.expm1(-t / tauMut),
      'mutated Q_J from tau_s',
    );
  });

  it('control: mutating Fo or Bi_radius expr moves the series outputs', () => {
    const text = dataText('applied-cases.json');
    const foMutated = text.replace(
      '"expr": "alpha_m2_per_s*t_s/(a_m*a_m)"',
      '"expr": "alpha_m2_per_s*t_s/a_m"',
    );
    expect(foMutated, 'the Fo expr must occur once to replace').not.toBe(text);
    const foRecord = readAppliedCaseFile(foMutated, schema).cases.find((c) => c.id === ID)!;
    const foGot = runAppliedCaseEngine(foRecord, inputs);
    expect(foGot.outputs.Fo).not.toBe(fo);
    expect(foGot.outputs.theta_parent_mean).not.toBe(series.mean);
    expect(foGot.outputs.T_centre_K).not.toBe(Tinf + (T0 - Tinf) * series.centre);
    expect(foGot.outputs.T_surface_K).not.toBe(Tinf + (T0 - Tinf) * series.surface);
    expect(() => pinCase(ID, lumpedPinned, foRecord)).toThrow(/to be less (or equal )?than/);

    const biMutated = text.replace(
      '"expr": "h_W_per_m2_K*a_m/k_W_per_m_K"',
      '"expr": "h_W_per_m2_K*a_m/(2*k_W_per_m_K)"',
    );
    expect(biMutated, 'the Bi_radius expr must occur once to replace').not.toBe(text);
    const biRecord = readAppliedCaseFile(biMutated, schema).cases.find((c) => c.id === ID)!;
    const biGot = runAppliedCaseEngine(biRecord, inputs);
    expect(biGot.outputs.Bi_radius).not.toBe(biRadius);
    expect(biGot.outputs.theta_parent_mean).not.toBe(series.mean);
    expect(biGot.outputs.T_centre_K).not.toBe(Tinf + (T0 - Tinf) * series.centre);
    expect(biGot.outputs.T_surface_K).not.toBe(Tinf + (T0 - Tinf) * series.surface);
    expect(() => pinCase(ID, lumpedPinned, biRecord)).toThrow(/to be less (or equal )?than/);
  });

  it('Q_J at t_s = 1e-12 matches -expm1(-t/τ); a (1-exp) implementation fails that pin', () => {
    // Direct method: t this small makes Fo too tiny for the series (needs >1e5 terms).
    const tSmall = 1e-12;
    const got = lumpedCoolingQJ({ ...inputs, t_s: tSmall }, { tau_s: tau });
    const volume = (4 / 3) * Math.PI * a ** 3;
    const heatScale = rho * c * volume * (T0 - Tinf);
    const expected = heatScale * -Math.expm1(-tSmall / tau);
    expectPinNumber(got, expected, 'Q_J small-t expm1');
    const naive = heatScale * (1 - Math.exp(-tSmall / tau));
    expect(() => expectPinNumber(naive, expected, '1-exp control')).toThrow(/to be less (or equal )?than/);
  });

  // Master's JS runner emitted Infinity for parent_deviation when theta is
  // subnormal but the series mean has underflowed to 0 (t/tau ≈ 740; measured
  // on master before the deletion). parent_deviation is a named method (see
  // NOTES.md for why it is not an expr), so the value reaches the caller
  // unchanged. Overflowed *intermediates* (T0_K=1e200, h=1e-310) still need
  // mergeBindings to keep Infinity/NaN and evalCheck `{ allowInfinity: true }`.
  it('parent_deviation is Infinity where the master runner produced Infinity (t/tau ≈ 740)', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, t_s: 740 * tau });
    expect(got.outputs.theta_parent_mean).toBe(0);
    expect((got.outputs.theta as number) > 0).toBe(true);
    expect(got.outputs.parent_deviation).toBe(Infinity);
    expect(got.outputs.T_K).toBeCloseTo(Tinf, 10);
  });

  it('parent_deviation is NaN at t/tau ≈ 746 (both underflow) and the run does not throw', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, t_s: 746 * tau });
    expect(Number.isNaN(got.outputs.parent_deviation as number)).toBe(true);
    expect(got.outputs.T_K).toBe(Tinf);
  });

  it('CONTROL: wiring parent_deviation as expr theta/theta_parent_mean - 1 throws on NaN at t/tau ≈ 746', () => {
    const wired = structuredClone(appliedCaseRecord(ID)) as AppliedCaseRecord;
    const row = wired.outputs.find((o) => o.key === 'parent_deviation') as {
      key: string;
      method?: string;
      expr?: string;
    };
    expect(row.method).toBe('lumpedParentDeviation');
    delete row.method;
    row.expr = 'theta/theta_parent_mean - 1';
    expect(() => runAppliedCaseEngine(wired, { ...inputs, t_s: 746 * tau })).toThrow(FormulaValueError);
    expect(() => runAppliedCaseEngine(wired, { ...inputs, t_s: 746 * tau })).toThrow(
      /formula did not evaluate to a finite number \(got NaN\)/,
    );
  });

  it('T_radiating_K is null when Bi_radiating is NaN (master: NaN <= bound is false)', () => {
    expect(lumpedRadiatingTempK(inputs, { Bi_radiating: Number.NaN })).toBeNull();
  });

  it('T_radiating_K gate bound is the catalog lumped check bound, not a second literal', () => {
    const bound = appliedCaseRecord(ID).checks.find((c) => c.id === 'lumped')!.bound;
    expect(MAX_BIOT).toBe(bound);
    expect(lumpedRadiatingTempK(inputs, { Bi_radiating: bound })).not.toBeNull();
    expect(lumpedRadiatingTempK(inputs, { Bi_radiating: bound + Number.EPSILON })).toBeNull();
    const methodsSrc = readFileSync(new URL('../../src/cases/methods.ts', import.meta.url), 'utf8');
    expect(methodsSrc).not.toMatch(/MAX_BIOT\s*=\s*0\.1/);
  });

  it('the three sphere outputs share one sphereSeries computation per run (per-(Bi, Fo) memo)', () => {
    resetSphereSeriesMemo();
    expect(sphereSeriesComputations()).toBe(0);
    runAppliedCaseEngine(appliedCaseRecord(ID), inputs);
    // theta_parent_mean, T_centre_K and T_surface_K read the same (Bi_radius, Fo):
    // one series computation serves all three (was three before the memo).
    expect(sphereSeriesComputations()).toBe(1);
    // An identical repeat run hits the memo: no new computation.
    runAppliedCaseEngine(appliedCaseRecord(ID), inputs);
    expect(sphereSeriesComputations()).toBe(1);
  });

  it('sphereSeries returns a frozen result; mutating it does not poison the memo', () => {
    resetSphereSeriesMemo();
    const first = sphereSeries(2.25, 0.37);
    expect(Object.isFrozen(first)).toBe(true);
    expect(sphereSeriesComputations()).toBe(1);
    expect(() => {
      (first as { mean: number }).mean = 999;
    }).toThrow(/Cannot assign to read only property|read only property|object is not extensible|Cannot set property/i);
    const second = sphereSeries(2.25, 0.37);
    expect(sphereSeriesComputations()).toBe(1);
    expect(second.mean).toBe(first.mean);
    expect(second.mean).not.toBe(999);
  });

  it('h_rad_max is the named method lumpedRadiativeConductance using Math.max', () => {
    const row = appliedCaseRecord(ID).outputs.find((o) => o.key === 'h_rad_max_W_per_m2_K')!;
    expect(row.expr).toBeUndefined();
    expect(row.method).toBe('lumpedRadiativeConductance');
    expect([...CASE_METHOD_NAMES]).toContain('lumpedRadiativeConductance');
  });

  it('lumpedRadiativeConductance is bit-equal to Math.max linearization on a 50k seeded sweep', () => {
    const rand = mulberry32(20261122);
    let compared = 0;
    for (let i = 0; i < 50_000; i++) {
      const T0 = 200 + rand() * 1800;
      const Tinf = 200 + rand() * 1800;
      const eps = rand();
      const inputs = { T0_K: T0, T_inf_K: Tinf, emissivity: eps };
      const tMax = Math.max(T0, Tinf);
      const expected = eps * SIGMA_SB_SI * (tMax + Tinf) * (tMax * tMax + Tinf * Tinf);
      expect(lumpedRadiativeConductance(inputs, {})).toBe(expected);
      compared += 1;
    }
    expect(compared).toBe(50_000);
  });

  // Master values recorded by running `runCaseLumpedCooling` at origin/master
  // dea93eee (the S6 merge, the parent of this PR) on the copper valid-example
  // base with T0_K = 1e200 and with h_W_per_m2_K = 1e-310. The deleted runner
  // returned the record with Infinity/NaN in it; it did not throw.
  it('T0_K = 1e200 matches master: no throw, h_rad and Bi_radiating are Infinity, linear-loss is Infinity', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, T0_K: 1e200 });
    expect(got.outputs.h_rad_max_W_per_m2_K).toBe(Infinity);
    expect(got.outputs.Bi_radiating).toBe(Infinity);
    expect(got.outputs.T_radiating_K).toBeNull();
    const linearLoss = got.checks.find((c) => c.id === 'linear-loss')!;
    expect(linearLoss.value).toBe(Infinity);
    expect(linearLoss.holds).toBe(false);
    expectPinNumber(got.outputs.T_K as number, 3.510756549695627e199, 'T_K at T0=1e200');
  });

  it('h = 1e-310 matches master: no throw, tau_s Infinity, linear-loss Infinity, series NaN', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...inputs, h_W_per_m2_K: 1e-310 });
    expect(got.outputs.tau_s).toBe(Infinity);
    expect(got.outputs.theta).toBe(1);
    expect(got.outputs.T_K).toBe(373.15);
    expect(got.outputs.Q_J).toBe(0);
    expect(Number.isNaN(got.outputs.theta_parent_mean as number)).toBe(true);
    expect(Number.isNaN(got.outputs.parent_deviation as number)).toBe(true);
    expect(Number.isNaN(got.outputs.T_centre_K as number)).toBe(true);
    expect(Number.isNaN(got.outputs.T_surface_K as number)).toBe(true);
    expectPinNumber(got.outputs.h_rad_max_W_per_m2_K as number, 0.4253801428581488, 'h_rad at h=1e-310');
    expectPinNumber(got.outputs.Bi_radiating as number, 0.0000017679972687371106, 'Bi_radiating at h=1e-310');
    expectPinNumber(got.outputs.T_radiating_K as number, 371.39598398588487, 'T_radiating_K at h=1e-310');
    const lumped = got.checks.find((c) => c.id === 'lumped')!;
    expect(lumped.value).toBe(4.15627596e-316);
    expect(lumped.holds).toBe(true);
    const linearLoss = got.checks.find((c) => c.id === 'linear-loss')!;
    expect(linearLoss.value).toBe(Infinity);
    expect(linearLoss.holds).toBe(false);
  });
});

describe('applied-case engine — brownian sphere (S8)', () => {
  // brownian-sphere.test.ts base inputs; the catalog valid example adds h_m.
  const ID = 'case-brownian-sphere';
  const base = { T_K: 293.15, eta_Pa_s: 1e-3, a_m: 1e-6, rho_p_kg_per_m3: 2000, rho_f_kg_per_m3: 998, t_s: 1, d: 2 };
  const inputs = { ...base, h_m: 100e-6 };
  // Hand arithmetic on the exact SI constants (brownian-sphere.test.ts), with
  // the exported helpers the wired methods wrap. The two quadrature-backed
  // numbers (MSD_hydro via hydrodynamicMsdRatio, D_perp via Brenner's series)
  // are cross-checked against Talbot inversion and the as-printed series in
  // brownian-sphere.test.ts, so reading them here is not circular.
  const gamma = 6 * Math.PI * 1e-3 * 1e-6;
  const D = (K_B_SI * 293.15) / gamma;
  const msd = 2 * 2 * D * 1;
  const volume = (4 / 3) * Math.PI * 1e-6 ** 3;
  const m = volume * 2000;
  const tauP = (m + 0.5 * volume * 998) / gamma;
  const tauF = (998 * 1e-6 * 1e-6) / 1e-3;
  const vSed = ((2 / 9) * (2000 - 998) * G_STANDARD * 1e-6 * 1e-6) / 1e-3;
  const vTh = Math.sqrt((K_B_SI * 293.15) / m);
  const re = (998 * 1e-6 * Math.max(vTh, Math.abs(vSed))) / 1e-3;
  const tauBare = m / gamma;
  const msdLangevin = 2 * 2 * D * tauBare * ballisticDeficit(1 / tauBare);
  const msdHydro = msd * hydrodynamicMsdRatio(tauP / 1, tauF / 1);
  const msdAddedMass = 2 * 2 * D * tauP * ballisticDeficit(1 / tauP);
  const memory = msdHydro / msdAddedMass - 1;
  const dPar = D * faxenParallel(1e-6 / 1e-4);
  const dPerp = D / brennerPerpendicular(1e-4 / 1e-6);
  const msdWall = 2 * 1 * (2 * dPar + 0);
  const brownianPinned: PinnedCase = {
    outputs: {
      gamma_kg_per_s: gamma,
      D_m2_per_s: D,
      MSD_m2: msd,
      rms_displacement_m: Math.sqrt(msd),
      m_kg: m,
      tau_p_s: tauP,
      tau_f_s: tauF,
      v_sed_m_per_s: vSed,
      Re: re,
      MSD_langevin_m2: msdLangevin,
      langevin_deviation: msd / msdLangevin - 1,
      MSD_hydro_m2: msdHydro,
      hydro_correction_m2: msdHydro - msd,
      hydro_deviation: msd / msdHydro - 1,
      memory_correction: memory,
      D_parallel_m2_per_s: dPar,
      D_perp_m2_per_s: dPerp,
      MSD_wall_m2: msdWall,
      wall_deviation: msd / msdWall - 1,
    },
    checks: [
      { id: 'creeping-flow', holds: true, value: re },
      { id: 'overdamped', holds: true, value: tauP / 1 },
      { id: 'memory', holds: true, value: Math.abs(memory) },
      { id: 'faxen-range', holds: true, value: (1e-6 / 1e-4) ** 5 / 16 / faxenParallel(1e-6 / 1e-4) },
      { id: 'wall', holds: true, value: Math.abs(msd / msdWall - 1) },
      { id: 'wall-static', holds: true, value: (Math.sqrt(2 * dPerp * 1) + Math.abs(vSed) * 1 / brennerPerpendicular(1e-4 / 1e-6)) / (1e-4 - 1e-6) },
    ],
    uncheckedCount: 3,
  };

  it('pinned reference: 1 µm silica sphere in water, 100 µm above the coverslip, d = 2, t = 1 s', () => {
    pinCase(ID, brownianPinned);
  });

  it('the engine routes the case: no runCaseBrownianSphere remains', () => {
    expect([...CASE_METHOD_NAMES]).not.toContain('runCaseBrownianSphere');
    const engineSrc = readFileSync(new URL('../../src/cases/engine.ts', import.meta.url), 'utf8');
    expect(engineSrc).not.toMatch(/runCaseBrownianSphere/);
    const methodsSrc = readFileSync(new URL('../../src/cases/methods.ts', import.meta.url), 'utf8');
    expect(methodsSrc).not.toMatch(/runCaseBrownianSphere/);
  });

  it('validation: the engine carries the domain refusals with the same messages', () => {
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, d: 4 })).toThrow(/d must be 1, 2 or 3 \(got 4\)/);
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, a_m: 0 })).toThrow(/a_m must be/);
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, eta_Pa_s: 0 })).toThrow(/eta_Pa_s must be/);
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, h_m: 1e-6 })).toThrow(
      /h_m must be a finite distance > a_m, centre to wall \(got 0\.000001\)/,
    );
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, h_m: Number.NaN })).toThrow(
      /h_m must be a finite distance > a_m, centre to wall \(got NaN\)/,
    );
  });

  it('wall outputs and the wall checks are gated by catalog needs on h_m; the drift check by d=3', () => {
    const noWall = runAppliedCaseEngine(appliedCaseRecord(ID), base);
    expect(noWall.outputs.D_parallel_m2_per_s).toBeNull();
    expect(noWall.outputs.D_perp_m2_per_s).toBeNull();
    expect(noWall.outputs.MSD_wall_m2).toBeNull();
    expect(noWall.outputs.wall_deviation).toBeNull();
    expect(noWall.checks.map((c) => c.id)).toEqual(['creeping-flow', 'overdamped', 'memory']);
    expect(noWall.unchecked.join(' ')).toMatch(/tracked axes are horizontal/);
    const d3 = runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, d: 3 });
    expect(d3.checks.map((c) => c.id)).toEqual(['creeping-flow', 'overdamped', 'memory', 'drift']);
    expect(d3.unchecked.join(' ')).not.toMatch(/horizontal/);
    const d1 = runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, d: 1 });
    expect(d1.unchecked.join(' ')).toMatch(/tracked axis is horizontal/);
    expect(d1.checks.map((c) => c.id)).toEqual(['creeping-flow', 'overdamped', 'memory']);
    // The d=3 gate is catalog data ("needs": ["d=3"]), not an engine literal.
    const engineSrc = readFileSync(new URL('../../src/cases/engine.ts', import.meta.url), 'utf8');
    expect(engineSrc).not.toMatch(/'drift'/);
  });

  it('control: mutating the gamma prefactor (6 → 7, a coefficient change) moves gamma by exactly 7/6 and leaves D unchanged', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace('"expr": "6*pi*eta_Pa_s*a_m"', '"expr": "7*pi*eta_Pa_s*a_m"');
    expect(mutated, 'the gamma expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    expectPinNumber(got.outputs.gamma_kg_per_s as number, gamma * (7 / 6), 'mutated gamma');
    // D_m2_per_s is its own catalog expr with its own 6πηa denominator: the
    // gamma mutation does not move it (the exprs are independent, not chained).
    expect(got.outputs.D_m2_per_s).toBe(D);
    expect(() => pinCase(ID, brownianPinned, record)).toThrow(/to be less (or equal )?than/);
  });

  it('mutating tau_f_s (a 2× coefficient) moves the wired MSD_hydro_m2 and memory_correction but not the Langevin pair', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "rho_f_kg_per_m3*a_m*a_m/eta_Pa_s"',
      '"expr": "2*rho_f_kg_per_m3*a_m*a_m/eta_Pa_s"',
    );
    expect(mutated, 'the tau_f_s expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    expect(got.outputs.tau_f_s).toBe(2 * tauF);
    expect(got.outputs.MSD_hydro_m2).not.toBe(msdHydro);
    expect(got.outputs.memory_correction).not.toBe(memory);
    expect(got.outputs.MSD_langevin_m2).toBe(msdLangevin);
    expect(got.outputs.langevin_deviation).toBe(msd / msdLangevin - 1);
  });

  it('mutating m_kg (4/3 → 5/3, a coefficient change) moves the Langevin and memory methods that read it', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "(4/3)*pi*a_m^3*rho_p_kg_per_m3"',
      '"expr": "(5/3)*pi*a_m^3*rho_p_kg_per_m3"',
    );
    expect(mutated, 'the m_kg expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const got = runAppliedCaseEngine(record, inputs);
    expect(got.outputs.m_kg).not.toBe(m);
    expect(got.outputs.tau_p_s).not.toBe(tauP);
    expect(got.outputs.MSD_langevin_m2).not.toBe(msdLangevin);
    expect(got.outputs.langevin_deviation).not.toBe(msd / msdLangevin - 1);
    expect(got.outputs.memory_correction).not.toBe(memory);
    expect(got.outputs.MSD_hydro_m2).not.toBe(msdHydro);
  });

  // Master values recorded by running `runCaseBrownianSphere` at origin/master
  // 8210e97f (the S7 merge, the parent of this PR) before the deletion. The
  // runner returned the record with NaN/Infinity in it; it did not throw.
  it('master parity at rho_p = 1e300: memory_correction is NaN, the deviations Infinity, the memory check NaN', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, rho_p_kg_per_m3: 1e300, d: 3 });
    expect(Number.isNaN(got.outputs.memory_correction as number)).toBe(true);
    expect(got.outputs.langevin_deviation).toBe(Infinity);
    expect(got.outputs.hydro_deviation).toBe(Infinity);
    expect(got.outputs.MSD_hydro_m2).toBe(0);
    expectPinNumber(got.outputs.D_m2_per_s as number, 2.1471978227748074e-13, 'D at rho_p=1e300');
    // (2/9)(ρ_p − ρ_f) g a²/η in master's op order, G_STANDARD shared with the engine's g_std binding.
    expectPinNumber(
      got.outputs.v_sed_m_per_s as number,
      ((2 / 9) * (1e300 - 998) * G_STANDARD * 1e-6 * 1e-6) / 1e-3,
      'v_sed at rho_p=1e300',
    );
    const memoryCheck = got.checks.find((c) => c.id === 'memory')!;
    expect(Number.isNaN(memoryCheck.value)).toBe(true);
    expect(memoryCheck.holds).toBe(false);
    const drift = got.checks.find((c) => c.id === 'drift')!;
    expect(drift.value).toBe(Infinity);
    expect(drift.holds).toBe(false);
  });

  it('master parity at T_K = 1e300: every output stays finite and matches master', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, T_K: 1e300 });
    expectPinNumber(got.outputs.D_m2_per_s as number, 7.324570434162742e284, 'D at T=1e300');
    expectPinNumber(got.outputs.MSD_m2 as number, 2.929828173665097e285, 'MSD at T=1e300');
    expectPinNumber(got.outputs.Re as number, 4.051472357562446e145, 'Re at T=1e300');
    expectPinNumber(got.outputs.langevin_deviation as number, 4.4444464175619203e-7, 'langevin_deviation at T=1e300');
    expectPinNumber(got.outputs.MSD_hydro_m2 as number, 2.926526821325784e285, 'MSD_hydro at T=1e300');
    expectPinNumber(got.outputs.memory_correction as number, -0.001126252785120796, 'memory_correction at T=1e300');
    expect(got.checks.map((c) => c.holds)).toEqual([false, true, true]);
  });

  it('master parity at t_s = 1e20: the Langevin deviation is exactly 0 (bit-equal parents)', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, t_s: 1e20, d: 3 });
    expect(got.outputs.langevin_deviation).toBe(0);
    expectPinNumber(got.outputs.MSD_m2 as number, 128831869.36648846, 'MSD at t=1e20');
    expectPinNumber(got.outputs.hydro_correction_m2 as number, -0.000014901161193847656, 'hydro_correction at t=1e20');
    expectPinNumber(got.outputs.memory_correction as number, -1.155742168634788e-13, 'memory_correction at t=1e20');
    const drift = got.checks.find((c) => c.id === 'drift')!;
    expectPinNumber(drift.value, 1.1103239630670511e21, 'drift at t=1e20');
    expect(drift.holds).toBe(false);
  });

  it('Re is the named method brownianReynolds using Math.max, bit-equal to master on the deterministic repro', () => {
    const row = appliedCaseRecord(ID).outputs.find((o) => o.key === 'Re')!;
    expect(row.expr).toBeUndefined();
    expect(row.method).toBe('brownianReynolds');
    // Challenger's deterministic ulp split vs the abs-form: master's Math.max Re.
    const repro = {
      T_K: 293.15,
      eta_Pa_s: 0.0012328,
      a_m: 0.0000011644,
      rho_p_kg_per_m3: 2591,
      rho_f_kg_per_m3: 998,
      t_s: 1,
      d: 2,
    };
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), repro);
    expect(got.outputs.Re).toBe(0.0004581370306161597);
    const volumeRepro = (4 / 3) * Math.PI * repro.a_m ** 3;
    const mRepro = volumeRepro * repro.rho_p_kg_per_m3;
    const vSedRepro =
      ((2 / 9) * (repro.rho_p_kg_per_m3 - repro.rho_f_kg_per_m3) * G_STANDARD * repro.a_m * repro.a_m) / repro.eta_Pa_s;
    const vThRepro = Math.sqrt((K_B_SI * repro.T_K) / mRepro);
    const absForm =
      (repro.rho_f_kg_per_m3 *
        repro.a_m *
        (vThRepro + Math.abs(vSedRepro) + Math.abs(vThRepro - Math.abs(vSedRepro)))) /
      2 /
      repro.eta_Pa_s;
    expect(absForm).not.toBe(0.0004581370306161597);
    expect(
      brownianReynolds(repro, { m_kg: mRepro, v_sed_m_per_s: vSedRepro }),
    ).toBe(0.0004581370306161597);
  });

  it('brownianReynolds is bit-equal to Math.max on a 10k seeded physical sweep', () => {
    const rand = mulberry32(20261122);
    const logBetween = (lo: number, hi: number) => Math.exp(Math.log(lo) + rand() * (Math.log(hi) - Math.log(lo)));
    let compared = 0;
    for (let i = 0; i < 10_000; i++) {
      const T = 273 + rand() * 100;
      const eta = logBetween(1e-4, 1e-2);
      const a = logBetween(1e-8, 1e-4);
      const rhoP = 500 + rand() * 7500;
      const rhoF = 500 + rand() * 1500;
      const volumeI = (4 / 3) * Math.PI * a ** 3;
      const mI = volumeI * rhoP;
      const vSedI = ((2 / 9) * (rhoP - rhoF) * G_STANDARD * a * a) / eta;
      const vThI = Math.sqrt((K_B_SI * T) / mI);
      const inputs = { T_K: T, eta_Pa_s: eta, a_m: a, rho_f_kg_per_m3: rhoF };
      const expected = (rhoF * a * Math.max(vThI, Math.abs(vSedI))) / eta;
      expect(brownianReynolds(inputs, { m_kg: mI, v_sed_m_per_s: vSedI })).toBe(expected);
      compared += 1;
    }
    expect(compared).toBe(10_000);
  });

  it('master returns NaN in the wired deviations at T_K=1e300, a_m=1e-30 (no throw)', () => {
    const extreme = { ...base, a_m: 1e-30, rho_p_kg_per_m3: 1e4, T_K: 1e300, d: 2 };
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), extreme);
    expect(Number.isNaN(got.outputs.langevin_deviation as number)).toBe(true);
    expect(Number.isNaN(got.outputs.hydro_correction_m2 as number)).toBe(true);
    expect(Number.isNaN(got.outputs.hydro_deviation as number)).toBe(true);
    expect(got.outputs.wall_deviation).toBeNull();
    expect(Number.isNaN(brownianWallDeviation({}, { MSD_m2: Infinity, MSD_wall_m2: Infinity }))).toBe(true);
  });

  it('CONTROL: wiring the three unbounded deviations as exprs throws on those NaNs', () => {
    const extreme = { ...base, a_m: 1e-30, rho_p_kg_per_m3: 1e4, T_K: 1e300, d: 2 };
    const patchOne = (key: string, expr: string) => {
      const wired = structuredClone(appliedCaseRecord(ID)) as AppliedCaseRecord;
      const row = wired.outputs.find((o) => o.key === key) as { key: string; method?: string; expr?: string };
      expect(row.method, key).toBeDefined();
      delete row.method;
      row.expr = expr;
      expect(() => runAppliedCaseEngine(wired, extreme)).toThrow(FormulaValueError);
      expect(() => runAppliedCaseEngine(wired, extreme)).toThrow(
        /formula did not evaluate to a finite number \(got NaN\)/,
      );
    };
    patchOne('langevin_deviation', 'MSD_m2/MSD_langevin_m2 - 1');
    patchOne('hydro_correction_m2', 'MSD_hydro_m2 - MSD_m2');
    patchOne('hydro_deviation', 'MSD_m2/MSD_hydro_m2 - 1');
  });

  // Master values reconstructed from `runCaseBrownianSphere` at origin/master
  // 8210e97f (the helper functions `faxenParallel`, `brennerPerpendicular`,
  // `ballisticDeficit`, `hydrodynamicMsdRatio` are the same source):
  // faxen-range = (a/h)^5/16/faxenParallel(a/h);
  // wall = abs(MSD/MSD_wall − 1);
  // wall-static = (√(2 D_⊥ t) + |v_s| t / brennerPerpendicular(h/a))/(h − a).
  // The deleted runner returned that record; it did not throw.
  const WALL_EXTREME = { T_K: 1e300, eta_Pa_s: 1e-3, a_m: 1e-30, rho_p_kg_per_m3: 1e4, rho_f_kg_per_m3: 998, t_s: 1, d: 2, h_m: 1e-28 };

  it('master parity at T_K=1e300, a_m=1e-30, h_m=1e-28: no throw, wall_deviation NaN, faxen-range finite, wall-static Infinity', () => {
    const got = runAppliedCaseEngine(appliedCaseRecord(ID), WALL_EXTREME);
    expect(got.outputs.D_m2_per_s).toBe(Infinity);
    expect(got.outputs.MSD_m2).toBe(Infinity);
    expect(got.outputs.rms_displacement_m).toBe(Infinity);
    expect(got.outputs.Re).toBe(Infinity);
    expect(got.outputs.MSD_langevin_m2).toBe(Infinity);
    expect(got.outputs.MSD_hydro_m2).toBe(Infinity);
    expect(got.outputs.D_parallel_m2_per_s).toBe(Infinity);
    expect(got.outputs.D_perp_m2_per_s).toBe(Infinity);
    expect(got.outputs.MSD_wall_m2).toBe(Infinity);
    expect(Number.isNaN(got.outputs.langevin_deviation as number)).toBe(true);
    expect(Number.isNaN(got.outputs.hydro_correction_m2 as number)).toBe(true);
    expect(Number.isNaN(got.outputs.hydro_deviation as number)).toBe(true);
    expect(Number.isNaN(got.outputs.memory_correction as number)).toBe(true);
    expect(Number.isNaN(got.outputs.wall_deviation as number)).toBe(true);
    expectPinNumber(got.outputs.gamma_kg_per_s as number, 1.884955592153876e-32, 'gamma');
    expectPinNumber(got.outputs.m_kg as number, 4.188790204786391e-86, 'm');
    expectPinNumber(got.outputs.tau_p_s as number, 2.3331111111111108e-54, 'tau_p');
    expectPinNumber(got.outputs.tau_f_s as number, 9.98e-55, 'tau_f');
    expectPinNumber(got.outputs.v_sed_m_per_s as number, 1.961765851111111e-53, 'v_sed');
    const byId = Object.fromEntries(got.checks.map((c) => [c.id, c]));
    expect(byId['creeping-flow']!.value).toBe(Infinity);
    expect(byId['creeping-flow']!.holds).toBe(false);
    expectPinNumber(byId['overdamped']!.value, 2.3331111111111108e-54, 'overdamped');
    expect(byId['overdamped']!.holds).toBe(true);
    expect(Number.isNaN(byId['memory']!.value)).toBe(true);
    expect(byId['memory']!.holds).toBe(false);
    expect(byId['faxen-range']!.value).toBe(6.285354343601227e-12);
    expect(byId['faxen-range']!.holds).toBe(true);
    expect(Number.isNaN(byId['wall']!.value)).toBe(true);
    expect(byId['wall']!.holds).toBe(false);
    expect(byId['wall-static']!.value).toBe(Infinity);
    expect(byId['wall-static']!.holds).toBe(false);
    expect(got.checks.map((c) => c.id)).toEqual(['creeping-flow', 'overdamped', 'memory', 'faxen-range', 'wall', 'wall-static']);
  });

  it('CONTROL: wiring wall_deviation as an expr throws /got NaN/ on that wall path; the unpatched record succeeds', () => {
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), WALL_EXTREME)).not.toThrow();
    const unpatched = runAppliedCaseEngine(appliedCaseRecord(ID), WALL_EXTREME);
    expect(Number.isNaN(unpatched.outputs.wall_deviation as number)).toBe(true);
    const wired = structuredClone(appliedCaseRecord(ID)) as AppliedCaseRecord;
    const row = wired.outputs.find((o) => o.key === 'wall_deviation') as { key: string; method?: string; expr?: string };
    expect(row.method).toBe('brownianWallDeviation');
    delete row.method;
    row.expr = 'MSD_m2/MSD_wall_m2 - 1';
    expect(() => runAppliedCaseEngine(wired, WALL_EXTREME)).toThrow(FormulaValueError);
    expect(() => runAppliedCaseEngine(wired, WALL_EXTREME)).toThrow(
      /formula did not evaluate to a finite number \(got NaN\)/,
    );
  });

  it('S6–S8 remaining check exprs do not throw on master-returning extremes', () => {
    // Sweep of catalog check exprs on the three migrated cases. Brownian
    // wall Inf/Inf is the defect this review named; resistor and lumped
    // already opt in to Infinity on checks (S6/S7). Each input is a corner
    // where the deleted JS runner returned a record (Infinity/NaN in it,
    // no throw): resistor T/R/f overflow, lumped T0=T∞=1e200, brownian
    // wall path at d=3 (drift = tiny/Inf → 0).
    const resistorId = 'case-resistor-noise';
    const resistorBase = {
      T_K: 300, R_ohm: 1000, R_in_ohm: 1e6, C_in_F: 20e-12, f_lo_Hz: 0, f_hi_Hz: 1e4, t_avg_s: 1,
      e_n2_V2_per_Hz: 1.6e-17, i_n2_A2_per_Hz: 1e-24,
    };
    for (const inputs of [
      { ...resistorBase, T_K: 1e300 },
      { ...resistorBase, R_ohm: 1e40 },
      { ...resistorBase, T_K: 1e300, R_ohm: 1e40 },
      { ...resistorBase, f_hi_Hz: 1e300 },
      { ...resistorBase, T_K: 1e-300 },
    ]) {
      const got = runAppliedCaseEngine(appliedCaseRecord(resistorId), inputs);
      expect(got.checks.length).toBeGreaterThan(0);
      for (const c of got.checks) expect(Number.isNaN(c.value), c.id).toBe(false);
    }
    const lumpedId = 'case-lumped-cooling';
    const lumpedBase = {
      a_m: 0.005, rho_kg_per_m3: 8960, c_J_per_kg_K: 385, k_W_per_m_K: 401, h_W_per_m2_K: 10,
      emissivity: 0.05, T0_K: 373.15, T_inf_K: 293.15, t_s: 60,
    };
    const lumpedHot = runAppliedCaseEngine(appliedCaseRecord(lumpedId), { ...lumpedBase, T0_K: 1e200, T_inf_K: 1e200 });
    expect(lumpedHot.checks.find((c) => c.id === 'linear-loss')!.value).toBe(Infinity);
    expect(lumpedHot.checks.find((c) => c.id === 'linear-loss')!.holds).toBe(false);
    const d3 = runAppliedCaseEngine(appliedCaseRecord(ID), { ...WALL_EXTREME, d: 3 });
    expect(Number.isNaN(d3.outputs.wall_deviation as number)).toBe(true);
    const drift = d3.checks.find((c) => c.id === 'drift')!;
    expect(drift.value).toBe(0);
    expect(drift.holds).toBe(true);
    expect(d3.checks.find((c) => c.id === 'faxen-range')!.holds).toBe(true);
    expect(Number.isNaN(d3.checks.find((c) => c.id === 'wall')!.value)).toBe(true);
    expect(d3.checks.find((c) => c.id === 'wall-static')!.value).toBe(Infinity);
  });

  it('t_s = 1e308 fails fast: the hydrodynamic quadrature domain overflows', () => {
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, t_s: 1e308 })).toThrow(
      /hydrodynamicMsdRatio: α = .*, β = .* overflow the branch-cut quadrature domain/,
    );
    expect(() => runAppliedCaseEngine(appliedCaseRecord(ID), { ...base, t_s: 1e300 })).toThrow(
      /hydrodynamicMsdRatio: α = .*, β = .* overflow the branch-cut quadrature domain/,
    );
    expect(() => hydrodynamicMsdRatio(1e-315, 1e-314)).toThrow(
      /hydrodynamicMsdRatio: α = .*, β = .* overflow the branch-cut quadrature domain/,
    );
  }, 2000);

  it('CONTROL: wiring memory_correction as an expr throws on the NaN master emits at rho_p = 1e300', () => {
    // The master quantity is MSD_hydro/msdAddedMass − 1 with both parents 0
    // there (an expm1 underflow the grammar cannot express), so the control
    // wires the same 0/0 shape through the expr path: it must refuse the NaN.
    const wired = structuredClone(appliedCaseRecord(ID)) as AppliedCaseRecord;
    const row = wired.outputs.find((o) => o.key === 'memory_correction') as {
      key: string;
      method?: string;
      expr?: string;
    };
    expect(row.method).toBe('brownianMemoryCorrection');
    delete row.method;
    row.expr = 'MSD_hydro_m2/MSD_hydro_m2 - 1';
    expect(() => runAppliedCaseEngine(wired, { ...base, rho_p_kg_per_m3: 1e300, d: 3 })).toThrow(FormulaValueError);
    expect(() => runAppliedCaseEngine(wired, { ...base, rho_p_kg_per_m3: 1e300, d: 3 })).toThrow(
      /formula did not evaluate to a finite number \(got NaN\)/,
    );
  });

  const MASTER_REGIME =
    'upt regime diffusion --at Re=0.0006936778535904651 m=8.377580409572781e-15 gamma=1.8849555921538757e-8 t=1';
  const MASTER_REGIME_ARGS = [
    'T_K=293.15',
    'eta_Pa_s=1e-3',
    'a_m=1e-6',
    'rho_p_kg_per_m3=2000',
    'rho_f_kg_per_m3=998',
    't_s=1',
    'd=2',
  ];

  it('regimeAt is a function on every catalog row that names one', () => {
    const named = appliedCaseCatalog().cases.filter((row) => row.regimeAt !== undefined);
    expect(named.map((r) => r.id)).toEqual(['case-brownian-sphere']);
    for (const row of named) {
      const assembled = APPLIED_CASES.get(row.id)!;
      expect(typeof assembled.regimeAt).toBe('function');
      expect(row.regimeAt).toBe('brownianSphereRegimeAt');
    }
    const line = APPLIED_CASES.get(ID)!.regimeAt!(base, runAppliedCaseEngine(appliedCaseRecord(ID), base).outputs);
    expect(line).toBe(MASTER_REGIME);
  });

  it('CLI prints regime coordinates and JSON carries result.regimeAt matching master 8210e97f', async () => {
    const textCap = capture();
    const textCode = await runCli(['evaluate', ID, ...MASTER_REGIME_ARGS], textCap.io);
    expect(textCode).toBe(0);
    expect(text(textCap)).toContain(`regime coordinates: ${MASTER_REGIME}`);
    const jsonCap = capture();
    const jsonCode = await runCli(['evaluate', ID, ...MASTER_REGIME_ARGS, '--json'], jsonCap.io);
    expect(jsonCode).toBe(0);
    const env = JSON.parse(text(jsonCap)) as { result: { regimeAt?: string } };
    expect(env.result.regimeAt).toBe(MASTER_REGIME);
  });
});
