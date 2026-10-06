/**
 * BE-147 through BE-170, checked against the formulas written here.
 *
 * A dropped factor is a different number. `evaluateRelation` returns the
 * edge's single numeric body. Quantity names and evaluator keys are the
 * same call. `evalExpr` is the scalar lowering `makeEvaluate` uses for a
 * sum or an exponential.
 */
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { THERMAL_R9_CATALOG_ROWS } from '../../src/bridges/thermal-r9-catalog.js';
import {
  arrheniusWithoutExp,
  biotFromVolume,
  biotLumpedThreshold,
  clapeyronSlopeNotIntegral,
  evaluateArrhenius,
  evaluateBiot,
  evaluateClausiusClapeyron,
  evaluateEyring,
  evaluateFourierConduction,
  evaluateGibbsIsotherm,
  evaluateJouleThomson,
  evaluateNernstGibbs,
  evaluateNewtonCooling,
  evaluateNusselt,
  evaluateOnsagerReciprocity,
  evaluateOtto,
  evaluatePlanckSpectrum,
  evaluatePrandtl,
  evaluateRaoult,
  evaluateReynoldsNumber,
  evaluateRichardsonDushman,
  evaluateSackurTetrode,
  evaluateSaha,
  evaluateSchmidt,
  evaluateSherwood,
  evaluateStefanBoltzmann,
  evaluateVanTHoff,
  evaluateWienDisplacement,
  eyringArrheniusMismatch,
  fourierWithoutMinus,
  gibbsWithoutLog,
  jouleThomsonBracket,
  nernstMolecular,
  nernstWithoutLog,
  newtonFlux,
  nusseltWithoutLength,
  onsagerAntisymmetric,
  ottoWrongExponent,
  planckOnePolarization,
  prandtlWithoutCp,
  raoultWithoutMole,
  reynoldsPipeFactor,
  richardsonReflected,
  sackurWithoutFiveHalves,
  sahaTimesTwo,
  schmidtLewis,
  sherwoodWithoutLength,
  stefanFromH,
  stefanWithout60,
  vantHoffWithoutT2,
} from '../../src/bridges/thermal-r9.js';
import { C_SI, E_SI, H_SI, HBAR_SI, K_B_SI, N_A_SI } from '../../src/core/constants.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { evaluateRelation, resolveEvaluable } from '../../src/composition/evaluate-relation.js';
import { equals, format } from '../../src/dimensional/algebra.js';
import { EXPECTED_DIMENSION_BY_BRIDGE } from '../../src/dimensional/bridge-check.js';
import { CONSTANTS } from '../../src/dimensional/symbolic-constants.js';
import { resolveQuantityName } from '../../src/dimensional/formula-names.js';
import { convertValue } from '../../src/dimensional/units.js';
import { validate } from '../../src/dimensional/validator.js';

const R_SI = N_A_SI * K_B_SI;
const F_SI = N_A_SI * E_SI;
const PIN = '10e48f140c0e9fad3c50e5e5538124c52b3e732c';

const THEOREMS: Readonly<Record<number, string>> = {
  147: 'PhysJS.Arrhenius.arrhenius_eq',
  148: 'PhysJS.Eyring.eyring_eq',
  149: 'PhysJS.VanTHoff.vant_hoff',
  150: 'PhysJS.GibbsIsotherm.gibbs_eq',
  151: 'PhysJS.NernstGibbs.nernst_eq',
  152: 'PhysJS.ClausiusClapeyron.integrated_eq',
  153: 'PhysJS.Raoult.raoult_eq',
  154: 'PhysJS.Prandtl.prandtl_eq',
  155: 'PhysJS.ReynoldsNumber.reynolds_eq',
  156: 'PhysJS.Biot.biot_eq',
  157: 'PhysJS.Nusselt.nusselt_eq',
  158: 'PhysJS.Schmidt.schmidt_eq',
  159: 'PhysJS.Sherwood.sherwood_eq',
  160: 'PhysJS.FourierConduction.fourier_eq',
  161: 'PhysJS.NewtonCooling.newton_eq',
  162: 'PhysJS.Otto.otto_eq',
  163: 'PhysJS.JouleThomson.joule_thomson_eq',
  164: 'PhysJS.PlanckSpectrum.planck_eq',
  165: 'PhysJS.StefanBoltzmann.stefan_boltzmann_eq',
  166: 'PhysJS.WienDisplacement.wien_eq',
  167: 'PhysJS.SackurTetrode.sackur_tetrode',
  168: 'PhysJS.Saha.saha_eq',
  169: 'PhysJS.RichardsonDushman.richardson_eq',
  170: 'PhysJS.OnsagerReciprocity.onsager_eq',
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
  expect(report.ok, `be-${id} ${report.ok ? '' : JSON.stringify(report)}`).toBe(true);
  expect(equals(report.inferredDimension!, found.edge!.target.dim)).toBe(true);
  const symbolic = evalExpr(found.edge!.symbolic!, quantityBindings);
  const scale = Math.abs(byName.value);
  expect(scale, `be-${id} probe is zero`).toBeGreaterThan(0);
  expect(Math.abs(symbolic - byName.value) / scale).toBeLessThan(1e-9);
  for (const name of Object.keys(quantityBindings)) {
    expect(resolveQuantityName(name, quantityNames)).toBe(name);
    expect(resolveQuantityName(name.replaceAll('-', '_'), quantityNames)).toBe(name);
  }
  return byKey.value;
}

describe('thermal and chemical formulas BE-147 through BE-170', () => {
  it('the catalog rows are the twenty-four established ids', () => {
    expect(THERMAL_R9_CATALOG_ROWS.map((entry) => entry.id)).toEqual([
      147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170,
    ]);
    expect(THERMAL_R9_CATALOG_ROWS.every((entry) => entry.status === 'established')).toBe(true);
    expect(THERMAL_R9_CATALOG_ROWS.every((entry) => entry.category === 'D')).toBe(true);
    for (const entry of THERMAL_R9_CATALOG_ROWS) {
      const kind = entry.id <= 163 ? 'standard' : 'cross-domain';
      expect(entry.notes, `be-${entry.id}`).toContain(`Type ${kind}`);
      expect(entry.dimensional_signature).toBe(format(EXPECTED_DIMENSION_BY_BRIDGE.get(entry.id)!));
    }
  });

  it('each formalRef is kind bridge and names its theorem', () => {
    for (const [id, theorem] of Object.entries(THEOREMS)) {
      const ref = catalogFormalRef(Number(id));
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.statement, `be-${id}`).toBe(theorem);
      expect(ref?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
      expect(ref?.url, `be-${id}`).toContain(PIN);
    }
  });

  it('Arrhenius uses R = N_A k_B and a temperature-independent prefactor', () => {
    const A = 1e13;
    const Ea = convertValue('50kcal/mol', 'J/mol').value;
    const T = convertValue('25degC', 'K', 'absolute').value;
    const value = related(147, { A_Hz: A, Ea_J_per_mol: Ea, T_K: T }, { arrhprefac: A, arrhbarrier: Ea, arrhwarmth: T });
    expect(value).toBeCloseTo(A * Math.exp(-Ea / (R_SI * T)), 8);
    expect(T).toBeCloseTo(298.15, 10);
    expect(arrheniusWithoutExp(A)).not.toBeCloseTo(value, 6);
    expect(() => evaluateArrhenius({ A_per_s: A, Ea_J_per_mol: Ea, T_K: 0 })).toThrow(/nonzero/);
  });

  it('Eyring calls the molar Arrhenius form and that substitution differs by exp(−1)', () => {
    const dH = convertValue('20kcal/mol', 'J/mol').value;
    const dS = 10;
    const T = 350;
    const dG = (dH - T * dS) / N_A_SI;
    const value = related(148, { dG_J: dG, T_K: T }, { eyringbarrier: dG, eyringwarmth: T });
    expect(value).toBeCloseTo(((K_B_SI * T) / H_SI) * Math.exp(-dG / (K_B_SI * T)), 8);
    const mismatched = eyringArrheniusMismatch(dH, dS, T);
    expect(mismatched / value).toBeCloseTo(Math.exp(-1), 8);
    expect(mismatched).not.toBeCloseTo(value, 6);
  });

  it("van 't Hoff is the Gibbs slope and not ΔH/(R T)", () => {
    const dH = convertValue('10kcal/mol', 'J/mol').value;
    const T = convertValue('100degC', 'K', 'absolute').value;
    const value = related(149, { dH_J_per_mol: dH, T_K: T }, { vanthoffenthalpy: dH, vanthoffwarmth: T });
    expect(value).toBeCloseTo(dH / (R_SI * T * T), 8);
    expect(vantHoffWithoutT2(dH, T)).not.toBeCloseTo(value, 6);
  });

  it('Gibbs is −R T ln K', () => {
    const K = 10;
    const T = 298.15;
    const value = related(150, { K, T_K: T }, { gibbsisok: K, gibbsisowarmth: T });
    expect(value).toBeCloseTo(-R_SI * T * Math.log(K), 8);
    expect(gibbsWithoutLog(T)).not.toBeCloseTo(value, 6);
  });

  it('Nernst is the Gibbs standard state with F = N_A e', () => {
    const T = convertValue('25degC', 'K', 'absolute').value;
    const value = related(151, { E0_volts: 0, n: 2, Q: 10, T_K: T }, { nernstge0: 0, nernstgn: 2, nernstgq: 10, nernstgwarmth: T });
    const independent = -((R_SI * T) / (2 * F_SI)) * Math.log(10);
    expect(value).toBeCloseTo(independent, 8);
    expect(nernstMolecular({ E0_V: 0, n: 2, Q: 10, T_K: T })).toBeCloseTo(value, 8);
    const cell = evaluateNernstGibbs({ E0_V: 0.2, n: 2, Q: 10, T_K: T });
    expect(cell.dG_J_per_mol).toBeCloseTo(-2 * F_SI * cell.E_V, 6);
    expect(nernstWithoutLog(0.2)).not.toBeCloseTo(cell.E_V, 6);
  });

  it('the integrated Clausius–Clapeyron is not the Clapeyron slope', () => {
    const dH = convertValue('1BTU', 'J').value;
    const T1 = 300;
    const T2 = 373.15;
    const value = related(
      152,
      { dH_J_per_mol: dH, T1_K: T1, T2_K: T2 },
      { clapintlatent: dH, clapintwarm1: T1, clapintwarm2: T2 },
    );
    expect(value).toBeCloseTo(-(dH / R_SI) * (1 / T2 - 1 / T1), 8);
    expect(clapeyronSlopeNotIntegral(dH, T1, 0.001)).not.toBeCloseTo(value, 0);
    expect(() => evaluateClausiusClapeyron({ dH_J_per_mol: dH, T1_K: -1, T2_K: T2 })).toThrow(/positive/);
  });

  it('Raoult keeps torr and mmHg apart', () => {
    const torr = convertValue('760torr', 'Pa').value;
    const mmHg = convertValue('760mmHg', 'Pa').value;
    expect(torr).not.toBeCloseTo(mmHg, 6);
    const psi = convertValue('14.7psi', 'Pa').value;
    const value = related(153, { x: 0.25, Psat_Pa: torr }, { raoultmole: 0.25, raoultsat: torr });
    expect(value).toBeCloseTo(0.25 * torr, 8);
    expect(evaluateRaoult({ x: 1, Psat_Pa: psi }).P_Pa).toBeCloseTo(psi, 8);
    expect(raoultWithoutMole(torr)).not.toBeCloseTo(value, 6);
  });

  it('Prandtl is μ c_p/k and not the Reynolds analogy', () => {
    const mu = convertValue('1cP', 'Pa*s').value;
    const cp = 4180;
    const k = 0.6;
    const value = related(154, { mu_Pa_s: mu, cp_J_per_kg_K: cp, k_W_per_m_K: k }, { prandtlmu: mu, prandtlcp: cp, prandtlk: k });
    expect(value).toBeCloseTo((mu * cp) / k, 8);
    expect(prandtlWithoutCp(mu, k)).not.toBeCloseTo(value, 6);
  });

  it('Reynolds number is ρ v L/μ and not 64/Re', () => {
    const mu = convertValue('1cP', 'Pa*s').value;
    const input = { rho_kg_per_m3: 1000, v_m_per_s: 2, L_m: 0.05, mu_Pa_s: mu };
    const value = related(155, input, { reynumrho: 1000, reynumvel: 2, reynumlen: 0.05, reynummu: mu });
    expect(value).toBeCloseTo((1000 * 2 * 0.05) / mu, 8);
    expect(reynoldsPipeFactor(input)).not.toBeCloseTo(value, 0);
  });

  it('Biot is h L_c/k and the volume form is the same number', () => {
    const V = convertValue('1L', 'm^3').value;
    const A = 0.05;
    const Lc = V / A;
    const h = 25;
    const k = 16;
    const value = related(156, { h_W_per_m2_K: h, Lc_m: Lc, k_W_per_m_K: k }, { biotfilm: h, biotlength: Lc, biotk: k });
    expect(value).toBeCloseTo((h * Lc) / k, 8);
    expect(biotFromVolume(h, V, k, A)).toBeCloseTo(value, 10);
    expect(biotLumpedThreshold()).not.toBeCloseTo(value, 2);
  });

  it('Nusselt is h L/k', () => {
    const value = related(157, { h_W_per_m2_K: 40, L_m: 0.2, k_W_per_m_K: 0.026 }, { nusseltfilm: 40, nusseltlen: 0.2, nusseltk: 0.026 });
    expect(value).toBeCloseTo((40 * 0.2) / 0.026, 8);
    expect(nusseltWithoutLength(40, 0.026)).not.toBeCloseTo(value, 2);
  });

  it('Schmidt is μ/(ρ D) and Lewis is Sc/Pr', () => {
    const mu = convertValue('0.89cP', 'Pa*s').value;
    const value = related(
      158,
      { mu_Pa_s: mu, rho_kg_per_m3: 997, D_m2_per_s: 2.3e-9 },
      { schmidtmu: mu, schmidtrho: 997, schmidtdiff: 2.3e-9 },
    );
    expect(value).toBeCloseTo(mu / (997 * 2.3e-9), 6);
    const Pr = evaluatePrandtl({ mu_Pa_s: mu, cp_J_per_kg_K: 4180, k_W_per_m_K: 0.6 }).Pr;
    expect(schmidtLewis(value, Pr)).toBeCloseTo(value / Pr, 10);
    expect(schmidtLewis(value, Pr)).not.toBeCloseTo(value, 2);
  });

  it('Sherwood is k_m L/D', () => {
    const value = related(159, { km_m_per_s: 0.01, L_m: 0.2, D_m2_per_s: 2e-5 }, { sherwoodkm: 0.01, sherwoodlen: 0.2, sherwooddiff: 2e-5 });
    expect(value).toBeCloseTo((0.01 * 0.2) / 2e-5, 8);
    expect(sherwoodWithoutLength(0.01, 2e-5)).not.toBeCloseTo(value, 2);
  });

  it('Fourier is the integrated slab, sign included', () => {
    const hot = convertValue('100degC', 'K', 'absolute').value;
    const cold = convertValue('20degC', 'K', 'absolute').value;
    const k = 401;
    const L = 0.01;
    const value = related(
      160,
      { k_W_per_m_K: k, T_L_K: hot, T_0_K: cold, L_m: L },
      { fourierslabk: k, fourierslabend: hot, fourierslabstart: cold, fourierslablen: L },
    );
    expect(hot - cold).toBeCloseTo(80, 10);
    expect(value).toBeCloseTo((-k * (hot - cold)) / L, 6);
    expect(value).toBeLessThan(0);
    expect(fourierWithoutMinus({ k_W_per_m_K: k, T_L_K: hot, T_0_K: cold, L_m: L })).toBeCloseTo(-value, 8);
  });

  it('Newton cooling is the exponential, and the excess is an interval', () => {
    const theta0 = convertValue('18degF', 'K', 'difference').value;
    expect(theta0).toBeCloseTo(10, 10);
    const input = {
      rho_kg_per_m3: 1000,
      c_J_per_kg_K: 4180,
      V_m3: convertValue('2L', 'm^3').value,
      h_W_per_m2_K: 20,
      A_m2: 0.05,
      t_s: 8000,
      theta_difference_K: theta0,
    };
    const value = related(161, input, {
      newtonrho: input.rho_kg_per_m3,
      newtoncp: input.c_J_per_kg_K,
      newtonvol: input.V_m3,
      newtonfilm: input.h_W_per_m2_K,
      newtonarea: input.A_m2,
      newtontime: input.t_s,
      newtontheta0: input.theta_difference_K,
    });
    const tau = (input.rho_kg_per_m3 * input.c_J_per_kg_K * input.V_m3) / (input.h_W_per_m2_K * input.A_m2);
    expect(value).toBeCloseTo(theta0 * Math.exp(-input.t_s / tau), 8);
    expect(evaluateNewtonCooling(input).tau_s).toBeCloseTo(tau, 8);
    const flux = newtonFlux(input.h_W_per_m2_K, input.A_m2, theta0);
    expect(Math.abs(flux - value) / Math.abs(value)).toBeGreaterThan(0.5);
  });

  it('Otto uses the exponent 1−γ', () => {
    const value = related(162, { r: 8, gamma: 1.4 }, { ottoratio: 8, ottogamma: 1.4 });
    expect(value).toBeCloseTo(1 - 8 ** (1 - 1.4), 10);
    expect(ottoWrongExponent(8, 1.4)).not.toBeCloseTo(value, 4);
    expect(() => evaluateOtto({ r: 8, gamma: 1 })).toThrow(/greater than 1/);
  });

  it('Joule–Thomson is the general coefficient, and the ideal-gas bracket vanishes', () => {
    const T = 300;
    const dvdT = 0.002;
    const v = 0.2;
    const cp = 1000;
    const value = related(
      163,
      { T_K: T, dv_dT_m3_per_kg_K: dvdT, v_m3_per_kg: v, cp_J_per_kg_K: cp },
      { jtcwarmth: T, jtcdvdt: dvdT, jtcvolume: v, jtcp: cp },
    );
    expect(value).toBeCloseTo((T * dvdT - v) / cp, 10);
    expect(value).not.toBe(0);
    const P = 1e5;
    const specificR = 287;
    const idealSlope = specificR / P;
    const idealV = T * idealSlope;
    expect(jouleThomsonBracket(T, idealSlope, idealV)).toBe(0);
    expect(
      evaluateJouleThomson({ T_K: T, dv_dT_m3_per_kg_K: idealSlope, v_m3_per_kg: idealV, cp_J_per_kg_K: cp }).mu_K_per_Pa,
    ).toBe(0);
    const rounded = jouleThomsonBracket(T, specificR / P, (specificR * T) / P);
    expect(Math.abs(rounded)).toBeLessThan(1e-12);
  });

  it('Planck uses two polarizations', () => {
    const nu = 1e14;
    const T = convertValue('2000degC', 'K', 'absolute').value;
    const value = related(164, { nu_Hz: nu, T_K: T }, { planckfreq: nu, planckwarmth: T });
    const x = (H_SI * nu) / (K_B_SI * T);
    const mode = (8 * Math.PI * H_SI * nu ** 3) / C_SI ** 3;
    expect(value).toBeCloseTo(mode / (Math.exp(x) - 1), 6);
    expect(planckOnePolarization({ nu_Hz: nu, T_K: T })).toBeCloseTo(value / 2, 6);
  });

  it('Stefan–Boltzmann is the exact quotient in both writings', () => {
    const value = related(165, {}, {});
    const fromHbar = (Math.PI ** 2 * K_B_SI ** 4) / (60 * HBAR_SI ** 3 * C_SI ** 2);
    expect(value).toBeCloseTo(fromHbar, 12);
    expect(stefanFromH()).toBeCloseTo(value, 8);
    expect(stefanWithout60() / value).toBeCloseTo(60, 8);
    expect(value).not.toBe(CONSTANTS.sigma_sb.value);
  });

  it('Wien takes the root as an input in (4, 5) and does not bake the decimal', () => {
    const low = related(166, { wien_x: 4.5 }, { wienroot: 4.5 });
    const high = evaluateWienDisplacement({ x: 4.9 }).b_m_K;
    expect(low).toBeCloseTo((H_SI * C_SI) / (K_B_SI * 4.5), 8);
    expect(high).not.toBeCloseTo(low, 4);
    expect(() => evaluateWienDisplacement({ x: 0 })).toThrow(/\(4, 5\)/);
    expect(() => evaluateWienDisplacement({ x: 4 })).toThrow(/\(4, 5\)/);
    expect(() => evaluateWienDisplacement({ x: 5 })).toThrow(/\(4, 5\)/);
  });

  it('Sackur–Tetrode adds 5/2 and takes n_Q as an input', () => {
    const input = { N: 1000, nQ_per_m3: 1e30, n_per_m3: 1e27 };
    const value = related(167, input, { sackurcount: 1000, sackurquantum: 1e30, sackurdensity: 1e27 });
    expect(value).toBeCloseTo(1000 * K_B_SI * (Math.log(1e3) + 2.5), 8);
    expect(Math.abs(sackurWithoutFiveHalves(input) - value) / Math.abs(value)).toBeGreaterThan(0.2);
  });

  it('Saha omits the electron weight 2', () => {
    const m = 9.1093837015e-31;
    const T = 1e4;
    const I = convertValue('1BTU', 'J').value * 1e-20;
    const value = related(168, { m_kg: m, T_K: T, I_J: I }, { sahamass: m, sahawarmth: T, sahaion: I });
    const thermal = ((2 * Math.PI * m * K_B_SI * T) / H_SI ** 2) ** 1.5;
    expect(value).toBeCloseTo(thermal * Math.exp(-I / (K_B_SI * T)), 6);
    expect(sahaTimesTwo({ m_kg: m, T_K: T, I_J: I })).toBeCloseTo(value * 2, 6);
  });

  it('Richardson–Dushman uses the elementary charge and reflection 1', () => {
    const m = 9.1093837015e-31;
    const T = 1000;
    const phi = convertValue('1BTU', 'J').value * 1e-23;
    const value = related(169, { m_kg: m, T_K: T, phi_J: phi }, { richardsmass: m, richardswarmth: T, richardsphi: phi });
    const pref = (4 * Math.PI * m * E_SI * K_B_SI ** 2) / H_SI ** 3;
    expect(value).toBeCloseTo(pref * T ** 2 * Math.exp(-phi / (K_B_SI * T)), 6);
    expect(richardsonReflected({ m_kg: m, T_K: T, phi_J: phi }, 0.5)).toBeCloseTo(value * 0.5, 6);
  });

  it('Onsager equates the cross coefficients only at zero field', () => {
    const value = related(170, { L12: 3, onsager_B_T: 0 }, { onsagerl12: 3, onsagerb0: 0 });
    expect(value).toBe(3);
    expect(onsagerAntisymmetric(3)).toBe(-3);
    expect(onsagerAntisymmetric(3)).not.toBe(value);
    expect(() => evaluateOnsagerReciprocity({ L12: 3, B_T: 0.1 })).toThrow(/zero/);
  });
});
