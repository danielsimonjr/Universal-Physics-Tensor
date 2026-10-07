import { describe, expect, it } from 'vitest';
import { evaluateBridge } from '../../src/bridges/evaluators.js';
import { catalogEvaluators, primaryRelation } from '../../src/bridges/catalog-load.js';

const MP = 1.67262192369e-27;

/** A point inside every stated domain, then the same point with one input moved out of it. */
interface Case {
  readonly id: number;
  readonly good: Record<string, number>;
  readonly bad: readonly (readonly [string, Record<string, number>])[];
}

const CASES: readonly Case[] = [
  {
    id: 127,
    good: { T_K: 300, Cd_F: 1e-12, Cox_F: 1e-12 },
    bad: [['T<0', { T_K: -300 }], ['Cd<0', { Cd_F: -1e-12 }]],
  },
  { id: 87, good: { T_K: 300, C_F: 1e-12 }, bad: [['T<0', { T_K: -300 }]] },
  {
    id: 82,
    good: { I_s_A: 1e-12, V_volts: 0.7, T_K: 300 },
    bad: [['T<0', { T_K: -300 }], ['Is<0', { I_s_A: -1e-12 }]],
  },
  {
    id: 130,
    good: { Th_K: 500, Tc_K: 300, Z_per_K: 0.003 },
    bad: [['Tc<0', { Tc_K: -300 }], ['cold side hotter', { Th_K: 300, Tc_K: 500 }]],
  },
  { id: 128, good: { D: 0.5 }, bad: [['D>1', { D: 1.5 }], ['D<0', { D: -0.5 }]] },
  {
    id: 131,
    good: { rho_kg_per_m3: 1000, dv_m_per_s: 1, K_Pa: 2.2e9, E_Pa: 200e9, pipe_D_m: 0.5, wall_m: 0.01 },
    bad: [['D<0', { pipe_D_m: -0.5 }]],
  },
  {
    id: 155,
    good: { rho_kg_per_m3: 1000, v_m_per_s: 1, L_m: 0.05, mu_Pa_s: 0.001 },
    bad: [['mu<0', { mu_Pa_s: -0.001 }]],
  },
  {
    id: 161,
    good: {
      rho_kg_per_m3: 8960, c_J_per_kg_K: 385, V_m3: 5.236e-7, h_W_per_m2_K: 25,
      A_m2: 3.1416e-4, t_s: 100, theta_difference_K: 28,
    },
    bad: [['h<0', { h_W_per_m2_K: -25 }], ['t<0', { t_s: -100 }]],
  },
  { id: 162, good: { r: 8, gamma: 1.4 }, bad: [['r<1', { r: 0.5 }]] },
  {
    id: 76,
    good: { n_per_m3: 1e6, T_K: 1e5, p_B_Pa: 1e-12 },
    bad: [['n<0', { n_per_m3: -1e6 }], ['T<0', { T_K: -1e5 }], ['pB<0', { p_B_Pa: -1e-12 }]],
  },
  { id: 110, good: { B0_T: 1, Bm_T: 2 }, bad: [['B0>Bm', { B0_T: 2, Bm_T: 1 }], ['B0<0', { B0_T: -1 }]] },
  { id: 122, good: { m_e_kg: 9.109e-31, m_i_kg: MP }, bad: [['ion lighter', { m_e_kg: MP, m_i_kg: 9.109e-31 }]] },
  { id: 123, good: { alpha: 10 }, bad: [['alpha<0', { alpha: -10 }]] },
  { id: 118, good: { c_s_m_per_s: 1e5, M_kg: 1.989e30 }, bad: [['M<0', { M_kg: -1.989e30 }]] },
  { id: 103, good: { T_e_K: 1e5, m_i_kg: MP }, bad: [['T<0', { T_e_K: -1e5 }]] },
  { id: 66, good: { I_W_per_m2: 1361, R: 1, theta_rad: 0.5 }, bad: [['theta=pi', { theta_rad: Math.PI }]] },
  {
    id: 93,
    good: { n_per_m3: 1e28, g: 2, spin: 0.5, muB_J_per_T: 9.274e-24, T_K: 300, theta_K: 100 },
    bad: [['T<theta', { T_K: 100, theta_K: 200 }], ['T<0', { T_K: -300, theta_K: 0 }]],
  },
  {
    id: 90,
    good: { N: 1, T_K: 10, thetaD_K: 300 },
    bad: [['T=thetaD', { T_K: 300 }], ['T>thetaD', { T_K: 1000 }]],
  },
  {
    id: 92,
    good: { n_per_m3: 8.47e28, T_K: 300, E_F_J: 1.12e-18 },
    bad: [['T far above T_F', { T_K: 1e6 }]],
  },
  { id: 98, good: { zeta: 1 }, bad: [['zeta<0', { zeta: -1 }]] },
  { id: 100, good: { eps_static: 10, eps_inf: 4 }, bad: [['eps_inf<0', { eps_inf: -4 }], ['static<inf', { eps_static: 2 }]] },
  { id: 137, good: { n_per_m3: 8.47e28, EF_J: 1.12e-18 }, bad: [['n<0', { n_per_m3: -8.47e28 }]] },
  { id: 140, good: { A_per_m2: 1e20 }, bad: [['A<0', { A_per_m2: -1e20 }]] },
  { id: 147, good: { A_Hz: 1e13, Ea_J_per_mol: 50000, T_K: 300 }, bad: [['T<0', { T_K: -300 }], ['A<0', { A_Hz: -1e13 }]] },
  { id: 153, good: { x: 0.5, Psat_Pa: 101325 }, bad: [['x>1', { x: 1.4 }]] },
  { id: 154, good: { mu_Pa_s: 1e-3, cp_J_per_kg_K: 4180, k_W_per_m_K: 0.6 }, bad: [['k<0', { k_W_per_m_K: -0.6 }]] },
  { id: 167, good: { N: 1, nQ_per_m3: 1e32, n_per_m3: 1e24 }, bad: [['degenerate', { nQ_per_m3: 1e30, n_per_m3: 1e32 }]] },
  {
    id: 166,
    good: { wien_x: 4.965114231744276 },
    bad: [['non-root 4.5', { wien_x: 4.5 }], ['non-root 4.9', { wien_x: 4.9 }]],
  },
];

describe('catalog validity domains', () => {
  for (const c of CASES) {
    describe(`be-${c.id}`, () => {
      it('evaluates a point inside every domain (control: the rule is not a blanket refusal)', () => {
        expect(() => evaluateBridge(c.id, c.good)).not.toThrow();
      });
      for (const [label, patch] of c.bad) {
        it(`rejects ${label}`, () => {
          expect(() => evaluateBridge(c.id, { ...c.good, ...patch })).toThrow(/validity domain/);
        });
      }
    });
  }

  it('derives the sign clause from the parameter flag, not from a per-bridge hand edit', () => {
    let flagged = 0;
    for (const ev of catalogEvaluators()) {
      const relation = primaryRelation(ev.catalogId);
      if (relation === undefined) continue;
      for (const p of ev.parameters) {
        if (p.sign === undefined && p.temperature === undefined) continue;
        const source = relation.sources.find((s) => s === p.quantity || (relation.aliases[s] ?? []).includes(p.key));
        if (source === undefined) continue;
        flagged += 1;
        const want = p.sign === 'any' ? null : p.sign === 'positive' ? '>' : '>=';
        if (want === null) continue;
        const clause = relation.holds.includes(`${source} ${want}`) || relation.holds.includes(`${source} >`);
        expect(clause, `${relation.id} ${p.key} -> ${source}: ${relation.holds}`).toBe(true);
      }
    }
    expect(flagged).toBeGreaterThan(100);
  });
});
