/**
 * BE-77 through BE-87.
 *
 * Each factor is the one the Lean theorem states. A nearby constant
 * (Fanning 16, the cantilever 4, ideality 2, two-sided shot noise,
 * (3/2) k_B T/C) is a different equation. BE-83 does not compose into
 * BE-73: the quantities do not meet.
 */
import { describe, expect, it } from 'vitest';
import { evaluateHagenPoiseuille } from '../../src/bridges/be77-hagen-poiseuille.js';
import { evaluateEulerBuckling } from '../../src/bridges/be78-euler-buckling.js';
import { evaluatePullIn } from '../../src/bridges/be79-pull-in.js';
import { evaluateMottGurney } from '../../src/bridges/be80-mott-gurney.js';
import { evaluateChildLangmuir } from '../../src/bridges/be81-child-langmuir.js';
import { evaluateShockleyDiode } from '../../src/bridges/be82-shockley-diode.js';
import { evaluateThomsonCoefficient } from '../../src/bridges/be83-thomson.js';
import { evaluateFourPointSheet } from '../../src/bridges/be84-four-point.js';
import { evaluateShotNoise } from '../../src/bridges/be85-shot-noise.js';
import { evaluateReynoldsAnalogy } from '../../src/bridges/be86-reynolds-analogy.js';
import { evaluateCapacitorNoise } from '../../src/bridges/be87-capacitor-noise.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { EPS0_SI } from '../../src/dimensional/formula-names.js';
import { composeEdges } from '../../src/composition/compose.js';
import { CompositionJunctionError } from '../../src/composition/edge.js';
import {
  be73Edge,
  be77Edge,
  be78Edge,
  be83Edge,
  be85Edge,
  be86Edge,
} from '../../src/composition/edges/applied-physicist.js';
import { explainQuantity } from '../../src/composition/explain.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { PHYSJS_COMMIT } from '../../src/atlas/physjs-ref.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const SHA = '03e8bb77c952f720bdd2730af2afc6a7f2d36243';

describe('BE-77 Hagen–Poiseuille', () => {
  const inputs = { R_m: 0.01, deltaP_Pa: 1000, mu_Pa_s: 0.001, L_m: 1 };
  const flux = (Math.PI * 0.01 ** 4 * 1000) / (8 * 0.001 * 1);

  it('is π R⁴ ΔP / (8 μ L), not the Fanning factor', () => {
    const q = evaluateHagenPoiseuille(inputs).Q_m3_per_s;
    expect(q).toBeCloseTo(flux, 12);
    expect(q).not.toBeCloseTo((Math.PI * 0.01 ** 4 * 1000) / (16 * 0.001 * 1), 8);
    const explained = explainQuantity(CATALOG_GRAPH, 'poiseuille-flow', {
      'pipe-radius': inputs.R_m,
      'pipe-pressure-drop': inputs.deltaP_Pa,
      'dynamic-viscosity': inputs.mu_Pa_s,
      'pipe-length': inputs.L_m,
    });
    expect(explained.recoveredValue).toBeCloseTo(flux, 10);
    expect(explained.summary).toContain('be-77');
  });
});

describe('BE-78 Euler buckling', () => {
  it('is the pinned load π² E I / L², not the cantilever load', () => {
    const pinned = (Math.PI ** 2 * 2e11 * 1e-8) / 1 ** 2;
    const cantilever = pinned / 4;
    const p = evaluateEulerBuckling({ E_Pa: 2e11, I_m4: 1e-8, L_m: 1 }).P_N;
    expect(p).toBeCloseTo(pinned, 8);
    expect(p).not.toBeCloseTo(cantilever, 6);
    expect(be78Edge.kind).toBe('law');
  });
});

describe('BE-79 pull-in', () => {
  it('is the fold at 2 g0/3, and g0/2 is a different voltage', () => {
    const k = 1;
    const g0 = 1e-6;
    const A = 1e-6;
    const fold = Math.sqrt((8 * k * g0 ** 3) / (27 * EPS0_SI * A));
    const halfGap = Math.sqrt((k * (g0 - g0 / 2) * 2 * (g0 / 2) ** 2) / (EPS0_SI * A));
    const v = evaluatePullIn({ k_N_per_m: k, g0_m: g0, A_m2: A }).V_pi_V;
    expect(v).toBeCloseTo(fold, 10);
    expect(v).not.toBeCloseTo(halfGap, 4);
  });
});

describe('BE-80 Mott–Gurney', () => {
  it('is (9/8) ε μ V² / d³, not a factor of 1', () => {
    const eps = 1e-11;
    const mu = 1e-8;
    const V = 1;
    const d = 1e-6;
    const j = evaluateMottGurney({ eps, mu_m2_per_Vs: mu, V_volts: V, d_m: d }).J_A_per_m2;
    const law = (9 / 8) * eps * mu * V * V / d ** 3;
    expect(j).toBeCloseTo(law, 6);
    expect(j / (eps * mu * V * V / d ** 3)).toBeCloseTo(9 / 8, 8);
  });
});

describe('BE-81 Child–Langmuir', () => {
  it('uses the elementary charge and the 4/3 profile, not Mott–Gurney', () => {
    const m = 9.1093837015e-31;
    const V = 1;
    const d = 1e-3;
    const j = evaluateChildLangmuir({ m_kg: m, V_volts: V, d_m: d }).J_A_per_m2;
    const law = ((4 * EPS0_SI) / 9) * Math.sqrt((2 * E_SI) / m) * V ** 1.5 / d ** 2;
    expect(j).toBeCloseTo(law, 4);
    expect(j).toBeGreaterThan(0);
  });
});

describe('BE-82 Shockley', () => {
  it('is ideality 1, and zero bias carries zero current', () => {
    const Is = 1e-12;
    const T = 300;
    const V = 0.2;
    const thermal = (E_SI * V) / (K_B_SI * T);
    const i = evaluateShockleyDiode({ I_s_A: Is, V_volts: V, T_K: T }).I_A;
    expect(i).toBeCloseTo(Is * (Math.exp(thermal) - 1), 8);
    expect(evaluateShockleyDiode({ I_s_A: Is, V_volts: 0, T_K: T }).I_A).toBe(0);
    const ideality2 = Is * (Math.exp(thermal / 2) - 1);
    expect(Math.abs(i - ideality2) / Math.abs(i)).toBeGreaterThan(0.1);
  });
});

describe('BE-83 Thomson coefficient', () => {
  it('is T dS/dT, and it does not compose with the Kelvin edge', () => {
    const mu = evaluateThomsonCoefficient({ T_K: 300, dS_dT_V_per_K2: 1e-6 }).mu_V_per_K;
    expect(mu).toBeCloseTo(300 * 1e-6, 12);
    expect(() => composeEdges(be73Edge, be83Edge)).toThrow(CompositionJunctionError);
    expect(() => composeEdges(be83Edge, be73Edge)).toThrow(CompositionJunctionError);
    const explained = explainQuantity(CATALOG_GRAPH, 'thomson-coefficient', {
      'thomson-temperature': 300,
      'seebeck-slope': 1e-6,
    });
    expect(explained.recoveredValue).toBeCloseTo(mu, 12);
    expect(explained.summary).toContain('be-83');
    expect(explained.summary).not.toContain('be-73');
  });
});

describe('BE-84 four-point sheet', () => {
  it('is (π / ln 2) (V/I), and a sink at 4s is 2π / ln 3', () => {
    const rs = evaluateFourPointSheet({ V_volts: 1e-3, I_A: 1e-3 }).R_s_ohm;
    expect(rs).toBeCloseTo((Math.PI / Math.log(2)) * (1e-3 / 1e-3), 10);
    const other = (2 * Math.PI) / Math.log(3);
    expect(rs).not.toBeCloseTo(other, 4);
  });
});

describe('BE-85 shot noise', () => {
  it('is the one-sided 2 e I, not e I and not Johnson–Nyquist', () => {
    const s = evaluateShotNoise({ I_A: 1e-3 }).S_I_A2_per_Hz;
    expect(s).toBeCloseTo(2 * E_SI * 1e-3, 18);
    expect(s / (E_SI * 1e-3)).toBeCloseTo(2, 8);
    expect(be85Edge.kind).toBe('law');
  });
});

describe('BE-86 Reynolds analogy', () => {
  it('is St = C_f / 2 under the Pr = 1 hypothesis', () => {
    expect(evaluateReynoldsAnalogy({ C_f: 0.004 }).St).toBe(0.002);
    expect(be86Edge.evaluate({ 'skin-friction': 0.004 })).toBe(0.002);
    expect(be86Edge.sources.map((q) => q.name)).toEqual(['skin-friction']);
  });
});

describe('BE-87 capacitor noise', () => {
  it('is k_B T / C, not (3/2) k_B T / C and not k_B T / (2 C)', () => {
    const v2 = evaluateCapacitorNoise({ T_K: 300, C_F: 1e-12 }).v2_V2;
    const law = (K_B_SI * 300) / 1e-12;
    expect(v2).toBeCloseTo(law, 8);
    expect(v2 / law).toBeCloseTo(1, 8);
    expect(Math.abs(v2 / (1.5 * law) - 1)).toBeGreaterThan(0.1);
    expect(Math.abs(v2 / (law / 2) - 1)).toBeGreaterThan(0.1);
  });
});

describe('catalog evidence for BE-77 through BE-87', () => {
  it('each id is formally-proved through the PhysJS #64 file', () => {
    expect(PHYSJS_COMMIT).toBe(SHA);
    const files = [
      'HagenPoiseuille.lean',
      'EulerBuckling.lean',
      'PullIn.lean',
      'MottGurney.lean',
      'ChildLangmuir.lean',
      'ShockleyDiode.lean',
      'Thomson.lean',
      'FourPoint.lean',
      'ShotNoise.lean',
      'ReynoldsAnalogy.lean',
      'CapacitorNoise.lean',
    ];
    for (let id = 77; id <= 87; id++) {
      const ref = catalogFormalRef(id);
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.url).toBe(`https://github.com/danielsimonjr/PhysJS/blob/${SHA}/lean/${files[id - 77]}`);
      expect(ref?.url).not.toContain('/lean/PhysJS/');
      expect(deriveEdgeEvidence(id).has('formally-proved')).toBe(true);
    }
    expect(be77Edge.kind).toBe('law');
  });
});
