/**
 * BE-126 through BE-133, checked against the formulas written here.
 *
 * A dropped factor is a different number. `evaluateRelation` returns the
 * edge's single numeric body.
 */
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import {
  carnotFactor,
  coaxialWithoutTwoPi,
  combDriveOneSidewall,
  dampingWithoutTwo,
  evaluateBoostConverter,
  evaluateCoaxialCapacitance,
  evaluateCombDrive,
  evaluateDampingRatio,
  evaluateFinEfficiency,
  evaluateJoukowsky,
  evaluateSubthresholdSwing,
  evaluateThermoelectricGenerator,
  finInfiniteEfficiency,
  finOneFaceParameter,
  joukowskyDynamicPressure,
  joukowskyRigidSpeed,
  subthresholdIdealSwing,
} from '../../src/bridges/engineering-r7.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';

const THEOREMS: Readonly<Record<number, string>> = {
  126: 'PhysJS.CombDrive.force_eq',
  127: 'PhysJS.SubthresholdSwing.swing_eq',
  128: 'PhysJS.BoostConverter.boost_ratio',
  129: 'PhysJS.FinEfficiency.efficiency_eq',
  130: 'PhysJS.ThermoelectricGenerator.efficiency_eq',
  131: 'PhysJS.Joukowsky.joukowsky_eq',
  132: 'PhysJS.CoaxialCapacitance.capacitance_per_length',
  133: 'PhysJS.DampingRatio.damping_ratio',
};

describe('engineering formulas BE-126 through BE-133', () => {
  it('each formalRef is kind bridge and names its theorem', () => {
    for (const [id, theorem] of Object.entries(THEOREMS)) {
      const ref = catalogFormalRef(Number(id));
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.statement, `be-${id}`).toBe(theorem);
      expect(ref?.covers.startsWith('derivation-step:'), `be-${id}`).toBe(true);
    }
  });

  it('comb-drive force cancels the sidewall 2 against the coenergy 1/2', () => {
    const input = { n: 10, eps_F_per_m: 1e-11, h_m: 2e-4, V_volts: 20, g_m: 2e-6 };
    const force = (input.n * input.eps_F_per_m * input.h_m * input.V_volts ** 2) / input.g_m;
    expect(evaluateCombDrive(input).F_N).toBeCloseTo(force, 12);
    expect(combDriveOneSidewall(input)).toBeCloseTo(force / 2, 12);
    const related = evaluateRelation('be-126', input);
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(force, 12);
    expect(() => evaluateCombDrive({ ...input, g_m: 0 })).toThrow(/nonzero/);
    expect(() => evaluateRelation(126, { ...input, g_m: 0 })).toThrow(/g ≠ 0/);
  });

  it('subthreshold swing keeps the depletion capacitance', () => {
    const T = 300;
    const Cd = 2e-15;
    const Cox = 1e-15;
    const ideal = Math.log(10) * ((K_B_SI * T) / E_SI);
    const swing = ideal * (1 + Cd / Cox);
    expect(subthresholdIdealSwing(T)).toBeCloseTo(ideal, 12);
    expect(evaluateSubthresholdSwing({ T_K: T, Cd_F: Cd, Cox_F: Cox }).S_V_per_decade).toBeCloseTo(swing, 12);
    expect(swing).not.toBeCloseTo(ideal, 6);
    const related = evaluateRelation('be-127', { T_K: T, Cd_F: Cd, Cox_F: Cox });
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(swing, 12);
    expect(() => evaluateSubthresholdSwing({ T_K: 0, Cd_F: Cd, Cox_F: Cox })).toThrow(/T_K/);
    expect(() => evaluateRelation('be-127', { T_K: T, Cd_F: Cd, Cox_F: 0 })).toThrow(/C_ox/);
  });

  it('boost ratio is 1/(1 − D), and the buck ratio is D', () => {
    const D = 0.6;
    expect(evaluateBoostConverter({ D }).ratio).toBeCloseTo(1 / (1 - D), 12);
    expect(D).not.toBeCloseTo(1 / (1 - D), 6);
    const related = evaluateRelation('be-128', { D });
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(2.5, 12);
    expect(() => evaluateBoostConverter({ D: 1 })).toThrow(/must not be 1/);
    expect(() => evaluateRelation('be-128', { D: 1 })).toThrow(/D ≠ 1/);
  });

  it('fin efficiency is tanh(m L)/(m L) with the two-face m', () => {
    const input = { h_W_per_m2_K: 100, k_W_per_m_K: 200, t_m: 0.002, L_fin_m: 0.05 };
    const m = Math.sqrt((2 * input.h_W_per_m2_K) / (input.k_W_per_m_K * input.t_m));
    const eta = Math.tanh(m * input.L_fin_m) / (m * input.L_fin_m);
    const result = evaluateFinEfficiency(input);
    expect(result.m_per_m).toBeCloseTo(m, 12);
    expect(result.eta).toBeCloseTo(eta, 12);
    expect(finOneFaceParameter(input.h_W_per_m2_K, input.k_W_per_m_K, input.t_m)).not.toBeCloseTo(m, 6);
    expect(finInfiniteEfficiency(input)).not.toBeCloseTo(eta, 6);
    const related = evaluateRelation('be-129', input);
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(eta, 12);
    expect(() => evaluateFinEfficiency({ ...input, t_m: 0 })).toThrow(/t_m/);
  });

  it('thermoelectric efficiency is not the Carnot factor', () => {
    const Th = 600;
    const Tc = 300;
    const Z = 0.001;
    const mean = (Th + Tc) / 2;
    const m = Math.sqrt(1 + Z * mean);
    const eta = (1 - Tc / Th) * (m - 1) / (m + Tc / Th);
    expect(evaluateThermoelectricGenerator({ Th_K: Th, Tc_K: Tc, Z_per_K: Z }).eta).toBeCloseTo(eta, 12);
    expect(carnotFactor(Th, Tc)).toBeCloseTo(1 - Tc / Th, 12);
    expect(carnotFactor(Th, Tc)).not.toBeCloseTo(eta, 6);
    const related = evaluateRelation('be-130', { Th_K: Th, Tc_K: Tc, Z_per_K: Z });
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(eta, 12);
    expect(() => evaluateThermoelectricGenerator({ Th_K: 0, Tc_K: Tc, Z_per_K: Z })).toThrow(/Th_K/);
  });

  it('Joukowsky pressure is ρ c Δv, and ρ (Δv)² is a different pressure', () => {
    const input = {
      rho_kg_per_m3: 1000,
      dv_m_per_s: 1,
      K_Pa: 2.2e9,
      E_Pa: 2e11,
      pipe_D_m: 0.1,
      wall_m: 0.005,
    };
    const wall = (input.K_Pa / input.E_Pa) * (input.pipe_D_m / input.wall_m);
    const c = Math.sqrt(input.K_Pa / input.rho_kg_per_m3) / Math.sqrt(1 + wall);
    const jump = input.rho_kg_per_m3 * c * input.dv_m_per_s;
    const result = evaluateJoukowsky(input);
    expect(result.c_m_per_s).toBeCloseTo(c, 12);
    expect(result.delta_p_Pa).toBeCloseTo(jump, 8);
    expect(joukowskyDynamicPressure(input.rho_kg_per_m3, input.dv_m_per_s)).not.toBeCloseTo(jump, 4);
    expect(joukowskyRigidSpeed(input.K_Pa, input.rho_kg_per_m3)).not.toBeCloseTo(c, 6);
    const related = evaluateRelation('be-131', input);
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(jump, 8);
    expect(() => evaluateJoukowsky({ ...input, rho_kg_per_m3: 0 })).toThrow(/rho/);
  });

  it('coaxial capacitance keeps 2 π', () => {
    const input = { eps_F_per_m: 1e-11, a_m: 1, b_m: Math.E };
    const specific = (2 * Math.PI * input.eps_F_per_m) / Math.log(input.b_m / input.a_m);
    expect(evaluateCoaxialCapacitance(input).C_F_per_m).toBeCloseTo(specific, 12);
    expect(coaxialWithoutTwoPi(input)).toBeCloseTo(specific / (2 * Math.PI), 12);
    expect(Math.abs(coaxialWithoutTwoPi(input) - specific) / Math.abs(specific)).toBeGreaterThan(0.5);
    const related = evaluateRelation('be-132', input);
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(specific, 12);
    expect(() => evaluateCoaxialCapacitance({ ...input, a_m: input.b_m })).toThrow(/differ/);
    expect(() => evaluateRelation('be-132', { ...input, a_m: 0 })).toThrow(/a > 0/);
  });

  it('damping ratio keeps the binomial 2', () => {
    const input = { c_kg_per_s: 2, k_N_per_m: 4, m_kg: 1 };
    const zeta = input.c_kg_per_s / (2 * Math.sqrt(input.k_N_per_m * input.m_kg));
    expect(evaluateDampingRatio(input).zeta).toBeCloseTo(zeta, 12);
    expect(dampingWithoutTwo(input)).toBeCloseTo(zeta * 2, 12);
    expect(Math.sqrt(input.k_N_per_m / input.m_kg)).not.toBeCloseTo(zeta, 6);
    const related = evaluateRelation('be-133', input);
    expect(related.kind).toBe('value');
    if (related.kind === 'value') expect(related.value).toBeCloseTo(0.5, 12);
    expect(evaluateDampingRatio({ ...input, c_kg_per_s: -2 }).zeta).toBeCloseTo(-0.5, 12);
    expect(() => evaluateDampingRatio({ ...input, m_kg: 0 })).toThrow(/m_kg/);
    expect(() => evaluateRelation('be-133', { ...input, k_N_per_m: -1 })).toThrow(/k > 0/);
  });
});
