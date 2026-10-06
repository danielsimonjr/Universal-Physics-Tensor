/**
 * BE-134 through BE-146, checked against the formulas written here.
 *
 * A dropped factor is a different number. `evaluateRelation` returns the
 * edge's single numeric body. Quantity names and evaluator keys are the
 * same call. `evalExpr` is the scalar lowering of the symbolic form.
 */
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { CONDENSED_R8_CATALOG_ROWS } from '../../src/bridges/condensed-r8-catalog.js';
import {
  acDrudeWithoutDc,
  blochLandeMoment,
  builtinWithoutLog,
  dos2dValley,
  dos3dOneSpin,
  evaluateAcDrude,
  evaluateBlochLaw,
  evaluateBuiltinVoltage,
  evaluateDensityOfStates2D,
  evaluateDensityOfStates3D,
  evaluateGorterCasimir,
  evaluateJosephsonInductance,
  evaluateLowerCritical,
  evaluateMatthiessen,
  evaluateOnsagerFrequency,
  evaluateSemiconductorFermi,
  evaluateStoner,
  evaluateThomasFermi,
  fermiHalfOffset,
  gorterExponentTwo,
  josephsonWithoutTwo,
  lowerCriticalWithoutFourPi,
  matthiessenSingle,
  onsagerWithoutTwoPi,
  stonerTwoBubbles,
  thomasFermiFlat,
} from '../../src/bridges/condensed-r8.js';
import { E_SI, H_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { evaluateRelation, resolveEvaluable } from '../../src/composition/evaluate-relation.js';
import { format, equals } from '../../src/dimensional/algebra.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../../src/dimensional/bridge-check.js';
import { EPS0_SI, resolveQuantityName } from '../../src/dimensional/formula-names.js';
import { validate } from '../../src/dimensional/validator.js';

const ZETA_3_2 = 2.612375348685488;

const THEOREMS: Readonly<Record<number, string>> = {
  134: 'PhysJS.BlochLaw.bloch_law',
  135: 'PhysJS.DensityOfStates3D.dos_3d',
  136: 'PhysJS.DensityOfStates2D.dos_2d',
  137: 'PhysJS.ThomasFermi.thomas_fermi',
  138: 'PhysJS.BuiltinVoltage.builtin_voltage',
  139: 'PhysJS.SemiconductorFermi.fermi_level',
  140: 'PhysJS.OnsagerFrequency.onsager_frequency',
  141: 'PhysJS.JosephsonInductance.inductance_eq',
  142: 'PhysJS.LowerCritical.lower_critical',
  143: 'PhysJS.AcDrude.ac_drude',
  144: 'PhysJS.Matthiessen.matthiessen',
  145: 'PhysJS.Stoner.stoner',
  146: 'PhysJS.GorterCasimir.gorter_casimir',
};

const quantityNames = new Set(
  CATALOG_GRAPH.flatMap((edge) => [...edge.sources, edge.target].map((quantity) => quantity.name)),
);

function related(id: number, bindings: Record<string, number>, quantityBindings: Record<string, number>): number {
  const byKey = evaluateRelation(id, bindings);
  const byName = evaluateRelation(`be-${id}`, quantityBindings);
  expect(byKey.kind).toBe('value');
  expect(byName.kind).toBe('value');
  if (byKey.kind !== 'value' || byName.kind !== 'value') throw new Error(`be-${id}`);
  expect(byName.value).toBeCloseTo(byKey.value, 12);
  const expected = EXPECTED_DIMENSION_BY_BRIDGE.get(id);
  expect(expected, `be-${id}`).toBeDefined();
  expect(equals(byKey.dimension, expected!)).toBe(true);
  const found = resolveEvaluable(id);
  expect(found.edge?.id).toBe(`be-${id}`);
  expect(found.evaluator?.bridgeId).toBe(id);
  expect(found.edge?.symbolic).toBeDefined();
  const report = validate(found.edge!.symbolic!);
  expect(report.ok, `be-${id}`).toBe(true);
  expect(report.inferredDimension, `be-${id}`).not.toBeNull();
  expect(equals(report.inferredDimension!, found.edge!.target.dim)).toBe(true);
  const symbolic = evalExpr(found.edge!.symbolic!, quantityBindings);
  expect(Math.abs(symbolic - byName.value) / Math.abs(byName.value)).toBeLessThan(1e-9);
  for (const name of Object.keys(quantityBindings)) {
    expect(resolveQuantityName(name, quantityNames)).toBe(name);
    expect(resolveQuantityName(name.replaceAll('-', '_'), quantityNames)).toBe(name);
  }
  return byKey.value;
}

describe('condensed-matter formulas BE-134 through BE-146', () => {
  it('the catalog rows are the thirteen established ids', () => {
    expect(CONDENSED_R8_CATALOG_ROWS.map((entry) => entry.id)).toEqual([
      134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146,
    ]);
    expect(CONDENSED_R8_CATALOG_ROWS.every((entry) => entry.status === 'established')).toBe(true);
    expect(CONDENSED_R8_CATALOG_ROWS.every((entry) => entry.category === 'F')).toBe(true);
    for (const entry of CONDENSED_R8_CATALOG_ROWS) {
      expect(entry.dimensional_signature).toBe(format(EXPECTED_DIMENSION_BY_BRIDGE.get(entry.id)!));
    }
  });

  it('each formalRef is kind bridge and names its theorem', () => {
    for (const [id, theorem] of Object.entries(THEOREMS)) {
      const ref = catalogFormalRef(Number(id));
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.statement, `be-${id}`).toBe(theorem);
      expect(ref?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
      expect(ref?.url, `be-${id}`).toContain('10cf71e9f1f460780f8620de7ba422df61e0949b');
    }
    expect(catalogFormalRef(134)?.statement).not.toBe('PhysJS.BlochLaw.heisenberg_fraction');
  });

  it('Bloch deficit uses one Bohr magneton and leaves ζ(3/2) as an input', () => {
    const input = { muB_J_per_T: 9.274e-24, zeta_3_2: ZETA_3_2, T_K: 10, D_J_m2: 1e-40 };
    const thermal = (K_B_SI * input.T_K) / (4 * Math.PI * input.D_J_m2);
    const deficit = input.muB_J_per_T * input.zeta_3_2 * thermal ** 1.5;
    expect(evaluateBlochLaw(input).dM_A_per_m).toBeCloseTo(deficit, 8);
    expect(blochLandeMoment(input)).toBeCloseTo(deficit * 2, 8);
    const unity = evaluateBlochLaw({ ...input, zeta_3_2: 1 }).dM_A_per_m;
    expect(unity).not.toBeCloseTo(deficit, 6);
    const value = related(
      134,
      input,
      {
        'blochlaw-mub': input.muB_J_per_T,
        'blochlaw-zeta': input.zeta_3_2,
        'blochlaw-warmth': input.T_K,
        'blochlaw-dstiff': input.D_J_m2,
      },
    );
    expect(value).toBeCloseTo(deficit, 8);
    expect(() => evaluateBlochLaw({ ...input, D_J_m2: 0 })).toThrow(/positive/);
    expect(() => evaluateRelation(134, { ...input, T_K: -1 })).toThrow(/T ≥ 0/);
  });

  it('three-dimensional density of states keeps both spins', () => {
    const input = { m_kg: 9.1e-31, E_J: 1e-19 };
    const g = (1 / (2 * Math.PI ** 2)) * ((2 * input.m_kg) / HBAR_SI ** 2) ** 1.5 * Math.sqrt(input.E_J);
    expect(evaluateDensityOfStates3D(input).g_per_J_m3).toBeCloseTo(g, 6);
    expect(dos3dOneSpin(input)).toBeCloseTo(g / 2, 6);
    const value = related(135, input, { 'dos3d-bandmass': input.m_kg, 'dos3d-abscissa': input.E_J });
    expect(value).toBeCloseTo(g, 6);
    expect(evaluateDensityOfStates3D({ ...input, E_J: 0 }).g_per_J_m3).toBe(0);
    expect(() => evaluateDensityOfStates3D({ ...input, m_kg: 0 })).toThrow(/positive/);
    expect(() => evaluateRelation(135, { ...input, E_J: -1 })).toThrow(/E ≥ 0/);
  });

  it('two-dimensional density of states is one valley', () => {
    const m = 9.1e-31;
    const g = m / (Math.PI * HBAR_SI ** 2);
    expect(evaluateDensityOfStates2D({ m_kg: m }).g_per_J_m2).toBeCloseTo(g, 6);
    expect(dos2dValley(m, 2)).toBeCloseTo(2 * g, 6);
    expect(dos2dValley(m, 2)).not.toBeCloseTo(g, 6);
    const value = related(136, { m_kg: m }, { 'dos2d-bandmass': m });
    expect(value).toBeCloseTo(g, 6);
    expect(() => evaluateDensityOfStates2D({ m_kg: 0 })).toThrow(/nonzero/);
    expect(() => evaluateRelation(136, { m_kg: 0 })).toThrow(/m ≠ 0/);
  });

  it('Thomas–Fermi screening keeps the parabolic 3/2', () => {
    const n = 1e28;
    const EF = 1e-18;
    const k2 = ((E_SI * E_SI) / EPS0_SI) * ((3 * n) / (2 * EF));
    expect(evaluateThomasFermi({ n_per_m3: n, EF_J: EF }).k2_per_m2).toBeCloseTo(k2, 8);
    expect(thomasFermiFlat(n, EF)).toBeCloseTo(((E_SI * E_SI) / EPS0_SI) * (n / EF), 8);
    expect(thomasFermiFlat(n, EF)).not.toBeCloseTo(k2, 6);
    const value = related(137, { n_per_m3: n, EF_J: EF }, { 'tfscreen-n3': n, 'tfscreen-chemical': EF });
    expect(value).toBeCloseTo(k2, 8);
    expect(() => evaluateThomasFermi({ n_per_m3: n, EF_J: 0 })).toThrow(/positive/);
    expect(() => evaluateRelation(137, { n_per_m3: n, EF_J: -1 })).toThrow(/E_F > 0/);
  });

  it('built-in voltage keeps the logarithm', () => {
    const input = { T_K: 300, NA_per_m3: 1e22, ND_per_m3: 1e21, ni_per_m3: 1e16 };
    const voltage = ((K_B_SI * input.T_K) / E_SI) * Math.log((input.NA_per_m3 * input.ND_per_m3) / input.ni_per_m3 ** 2);
    expect(evaluateBuiltinVoltage(input).V_bi_V).toBeCloseTo(voltage, 10);
    expect(builtinWithoutLog(input.T_K)).not.toBeCloseTo(voltage, 4);
    const value = related(138, input, {
      'builtin-warmth': input.T_K,
      'builtin-acceptor': input.NA_per_m3,
      'builtin-donor': input.ND_per_m3,
      'builtin-ni': input.ni_per_m3,
    });
    expect(value).toBeCloseTo(voltage, 10);
    expect(() => evaluateBuiltinVoltage({ ...input, ni_per_m3: 0 })).toThrow(/ni_per_m3/);
    expect(() => evaluateRelation(138, { ...input, NA_per_m3: -1 })).toThrow(/N_A > 0/);
  });

  it('the Fermi edge is the intrinsic 3/4, and the extrinsic energy is the other field', () => {
    const T = 300;
    const mh = 4e-31;
    const me = 1e-31;
    const Nc = 1e25;
    const ND = 1e22;
    const kT = K_B_SI * T;
    const intrinsic = (3 / 4) * kT * Math.log(mh / me);
    const extrinsic = kT * Math.log(Nc / ND);
    const result = evaluateSemiconductorFermi({ T_K: T, mh_kg: mh, me_kg: me, Nc_per_m3: Nc, ND_per_m3: ND });
    expect(result.intrinsic_offset_J).toBeCloseTo(intrinsic, 10);
    expect(result.extrinsic_offset_J).toBeCloseTo(extrinsic, 10);
    expect(fermiHalfOffset(T, mh, me)).toBeCloseTo((1 / 2) * kT * Math.log(mh / me), 10);
    expect(Math.abs(fermiHalfOffset(T, mh, me) - intrinsic) / Math.abs(intrinsic)).toBeGreaterThan(0.2);
    const value = related(
      139,
      { T_K: T, mh_kg: mh, me_kg: me },
      { 'fermioffset-warmth': T, 'fermioffset-holemass': mh, 'fermioffset-elecmass': me },
    );
    expect(value).toBeCloseTo(intrinsic, 10);
    expect(() => evaluateSemiconductorFermi({ T_K: 0, mh_kg: mh, me_kg: me, Nc_per_m3: Nc, ND_per_m3: ND })).toThrow(/T_K/);
    expect(() => evaluateRelation(139, { T_K: 0, mh_kg: mh, me_kg: me })).toThrow(/T ≠ 0/);
  });

  it('Onsager frequency keeps 2 π and has the dimension of a magnetic field', () => {
    const A = 1e18;
    const field = (HBAR_SI * A) / (2 * Math.PI * E_SI);
    expect(evaluateOnsagerFrequency({ A_per_m2: A }).F_T).toBeCloseTo(field, 8);
    expect(onsagerWithoutTwoPi(A)).not.toBeCloseTo(field, 4);
    const value = related(140, { A_per_m2: A }, { 'onsagerk-karea': A });
    expect(value).toBeCloseTo(field, 8);
    expect(format(EXPECTED_DIMENSION_BY_BRIDGE.get(140)!)).toBe('[M T^-2 I^-1]');
  });

  it('Josephson inductance keeps the Cooper-pair 2', () => {
    const Ic = 1e-3;
    const inductance = HBAR_SI / (2 * E_SI * Ic);
    expect(evaluateJosephsonInductance({ Ic_A: Ic }).L_H).toBeCloseTo(inductance, 8);
    expect(josephsonWithoutTwo(Ic)).toBeCloseTo(inductance * 2, 8);
    const value = related(141, { Ic_A: Ic }, { 'josephsonl-ic': Ic });
    expect(value).toBeCloseTo(inductance, 8);
    expect(() => evaluateJosephsonInductance({ Ic_A: 0 })).toThrow(/nonzero/);
    expect(() => evaluateRelation(141, { Ic_A: 0 })).toThrow(/I_c ≠ 0/);
  });

  it('lower critical field keeps 4 π and Φ₀ = h/(2 e)', () => {
    const input = { lambda_m: 1e-7, xi_m: 1e-8 };
    const phi0 = H_SI / (2 * E_SI);
    const field = (phi0 / (4 * Math.PI * input.lambda_m ** 2)) * Math.log(input.lambda_m / input.xi_m);
    expect(evaluateLowerCritical(input).B_c1_T).toBeCloseTo(field, 8);
    expect(lowerCriticalWithoutFourPi(input)).not.toBeCloseTo(field, 4);
    const value = related(142, input, { 'lowercrit-pen': input.lambda_m, 'lowercrit-xi': input.xi_m });
    expect(value).toBeCloseTo(field, 8);
    expect(() => evaluateLowerCritical({ lambda_m: 1, xi_m: 1 })).toThrow(/exceed/);
    expect(() => evaluateRelation(142, { lambda_m: 1, xi_m: 2 })).toThrow(/ξ < λ/);
  });

  it('AC Drude conductivity keeps the DC 1', () => {
    const input = { n_per_m3: 1e28, m_kg: 9.1e-31, tau_s: 1e-14, omega_rad_s: 1e14 };
    const sigma0 = (input.n_per_m3 * E_SI * E_SI * input.tau_s) / input.m_kg;
    const real = sigma0 / (1 + input.omega_rad_s ** 2 * input.tau_s ** 2);
    expect(evaluateAcDrude(input).sigma_S_per_m).toBeCloseTo(real, 6);
    expect(acDrudeWithoutDc(input)).not.toBeCloseTo(real, 4);
    const value = related(143, input, {
      'acdrude-n3': input.n_per_m3,
      'acdrude-bandmass': input.m_kg,
      'acdrude-scatter': input.tau_s,
      'acdrude-radian': input.omega_rad_s,
    });
    expect(value).toBeCloseTo(real, 6);
    expect(() => evaluateAcDrude({ ...input, tau_s: 0 })).toThrow(/positive/);
    expect(() => evaluateRelation(143, { ...input, m_kg: 0 })).toThrow(/m ≠ 0/);
  });

  it('Matthiessen lifetime is the parallel sum, and the resistivity uses the same rate', () => {
    const tau1 = 1e-14;
    const tau2 = 2e-14;
    const C = 1e-15;
    const rate = 1 / tau1 + 1 / tau2;
    const result = evaluateMatthiessen({ tau1_s: tau1, tau2_s: tau2, C_ohm_m_s: C });
    expect(result.tau_s).toBeCloseTo(1 / rate, 12);
    expect(result.rho_ohm_m).toBeCloseTo(C * rate, 12);
    expect(matthiessenSingle(tau1)).toBeCloseTo(tau1, 12);
    expect(Math.abs(matthiessenSingle(tau1) - 1 / rate) / Math.abs(1 / rate)).toBeGreaterThan(0.2);
    const value = related(
      144,
      { tau1_s: tau1, tau2_s: tau2 },
      { 'matthsum-scatter1': tau1, 'matthsum-scatter2': tau2 },
    );
    expect(value).toBeCloseTo(1 / rate, 12);
    expect(() => evaluateMatthiessen({ tau1_s: 0, tau2_s: tau2, C_ohm_m_s: C })).toThrow(/tau1/);
    expect(() => evaluateRelation(144, { tau1_s: tau1, tau2_s: 0 })).toThrow(/τ₂ ≠ 0/);
  });

  it('Stoner susceptibility is the closed geometric series', () => {
    const chiP = 2;
    const x = 0.25;
    expect(evaluateStoner({ chi_P: chiP, x }).chi).toBeCloseTo(chiP / (1 - x), 12);
    expect(stonerTwoBubbles(chiP, x)).toBeCloseTo(chiP * (1 + x), 12);
    expect(stonerTwoBubbles(chiP, x)).not.toBeCloseTo(chiP / (1 - x), 6);
    const value = related(145, { chi_P: chiP, x }, { 'stonerchi-pauli': chiP, 'stonerchi-ig': x });
    expect(value).toBeCloseTo(chiP / (1 - x), 12);
    expect(() => evaluateStoner({ chi_P: chiP, x: 1 })).toThrow(/\|x\|/);
    expect(() => evaluateRelation(145, { chi_P: chiP, x: 1 })).toThrow(/\|x\| < 1/);
  });

  it('Gorter–Casimir fraction uses exponent 4, and the depth is the other field', () => {
    const T = 2;
    const Tc = 4;
    const lambda0 = 5e-8;
    const fraction = 1 - (T / Tc) ** 4;
    const result = evaluateGorterCasimir({ T_K: T, Tc_K: Tc, lambda0_m: lambda0 });
    expect(result.ns_over_n).toBeCloseTo(fraction, 12);
    expect(result.lambda_m).toBeCloseTo(lambda0 / Math.sqrt(fraction), 12);
    expect(gorterExponentTwo(T, Tc)).toBeCloseTo(1 - (T / Tc) ** 2, 12);
    expect(gorterExponentTwo(T, Tc)).not.toBeCloseTo(fraction, 6);
    const value = related(146, { T_K: T, Tc_K: Tc }, { 'gortercas-warmth': T, 'gortercas-tc': Tc });
    expect(value).toBeCloseTo(fraction, 12);
    expect(() => evaluateGorterCasimir({ T_K: Tc, Tc_K: Tc, lambda0_m: lambda0 })).toThrow(/below/);
    expect(() => evaluateRelation(146, { T_K: -1, Tc_K: Tc })).toThrow(/0 ≤ T < T_c/);
  });
});
