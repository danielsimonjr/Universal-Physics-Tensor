/**
 * `upt explain` for BE-88 through BE-102.
 *
 * The recovered value is the edge target. A nearby constant is a
 * different equation, and the text names the catalog id.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, H_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

function recovered(text: string): number {
  const match = /Recovered value: ([0-9.eE+-]+)\./.exec(text);
  if (match === null) throw new Error(`no recovered value in:\n${text}`);
  return Number(match[1]);
}

describe('upt explain for BE-88 through BE-102', () => {
  it('prints the Fermi wavevector and the Debye cutoff', async () => {
    const n = 1e28;
    const kF = (3 * Math.PI ** 2 * n) ** (1 / 3);
    const sea = await run(['explain', 'fermi-wavevector', `n_per_m3=${n}`, 'm_kg=9.109e-31']);
    expect(sea.code, sea.text).toBe(0);
    expect(recovered(sea.text)).toBeCloseTo(kF, 4);
    expect(sea.text).toContain('be-88');
    expect(recovered(sea.text)).not.toBeCloseTo((6 * Math.PI ** 2 * n) ** (1 / 3), 2);

    const v = 3e3;
    const w = v * (6 * Math.PI ** 2 * n) ** (1 / 3);
    const debye = await run(['explain', 'debye-cutoff-frequency', `v_m_per_s=${v}`, `n_per_m3=${n}`]);
    expect(debye.code, debye.text).toBe(0);
    expect(recovered(debye.text)).toBeCloseTo(w, 2);
    expect(debye.text).toContain('be-89');
  });

  it('prints Debye heat, the Einstein solid, and Sommerfeld heat', async () => {
    const heatLaw = ((12 * Math.PI ** 4) / 5) * K_B_SI * (5 / 300) ** 3;
    const heat = await run(['explain', 'debye-heat-capacity', 'N=1', 'T_K=5', 'thetaD_K=300']);
    expect(heat.code, heat.text).toBe(0);
    expect(recovered(heat.text)).toBeCloseTo(heatLaw, 8);
    expect(heat.text).toContain('be-90');

    const x = 2;
    const einsteinLaw = 3 * K_B_SI * (x ** 2 * Math.exp(x)) / (Math.exp(x) - 1) ** 2;
    const solid = await run(['explain', 'einstein-heat-capacity', 'N=1', 'T_K=100', 'thetaE_K=200']);
    expect(solid.code, solid.text).toBe(0);
    expect(recovered(solid.text)).toBeCloseTo(einsteinLaw, 6);
    expect(solid.text).toContain('be-91');

    const sommerfeldLaw = (Math.PI ** 2 / 2) * 1e28 * K_B_SI ** 2 * 10 / 1e-18;
    const electronic = await run([
      'explain', 'sommerfeld-heat-capacity', 'n_per_m3=1e28', 'T_K=10', 'E_F_J=1e-18',
    ]);
    expect(electronic.code, electronic.text).toBe(0);
    expect(recovered(electronic.text)).toBeCloseTo(sommerfeldLaw, 4);
    expect(electronic.text).toContain('be-92');
  });

  it('prints Curie–Weiss, Pauli, and the trial-wall factor', async () => {
    const muB = 9.274e-24;
    const moment = 4 * muB ** 2 * 0.5 * 1.5;
    const chi = (MU0_SI * 1e28 * moment) / (3 * K_B_SI * 300);
    const curie = await run([
      'explain', 'curie-weiss-susceptibility',
      'n_per_m3=1e28', 'g=2', 'spin=0.5', `muB_J_per_T=${muB}`, 'T_K=300', 'theta_K=0',
    ]);
    expect(curie.code, curie.text).toBe(0);
    expect(recovered(curie.text)).toBeCloseTo(chi, 6);
    expect(curie.text).toContain('be-93');

    const pauliLaw = MU0_SI * muB ** 2 * (3 * 1e28) / (2 * 1e-18);
    const pauli = await run([
      'explain', 'pauli-susceptibility', 'n_per_m3=1e28', 'E_F_J=1e-18', `muB_J_per_T=${muB}`,
    ]);
    expect(pauli.code, pauli.text).toBe(0);
    expect(recovered(pauli.text)).toBeCloseTo(pauliLaw, 4);
    expect(pauli.text).toContain('be-94');

    const wall = await run(['explain', 'gl-trial-factor', 'kappa=1']);
    expect(wall.code, wall.text).toBe(0);
    expect(recovered(wall.text)).toBeCloseTo(-1, 12);
    expect(wall.text).toContain('be-95');
  });

  it('prints the upper critical field, Ambegaokar–Baratoff, and the BCS jump', async () => {
    const xi = 4e-8;
    const field = await run(['explain', 'upper-critical-field', `xi_m=${xi}`]);
    expect(field.code, field.text).toBe(0);
    expect(recovered(field.text)).toBeCloseTo(HBAR_SI / (2 * E_SI * xi ** 2), 6);
    expect(field.text).toContain('be-96');

    const product = await run(['explain', 'ambegaokar-product', 'Delta_J=2e-22']);
    expect(product.code, product.text).toBe(0);
    expect(recovered(product.text)).toBeCloseTo((Math.PI * 2e-22) / (2 * E_SI), 8);
    expect(product.text).toContain('be-97');

    const jump = await run(['explain', 'bcs-heat-jump', 'zeta=1']);
    expect(jump.code, jump.text).toBe(0);
    expect(recovered(jump.text)).toBeCloseTo(12 / 7, 12);
    expect(jump.text).toContain('be-98');
  });

  it('prints mass action, the LST ratio, the BKT temperature, and Landauer conductance', async () => {
    const ni = Math.sqrt(1e25 * 4e25) * Math.exp(-1.6e-19 / (2 * K_B_SI * 300));
    const mass = await run([
      'explain', 'mass-action-density',
      'N_c_per_m3=1e25', 'N_v_per_m3=4e25', 'E_g_J=1.6e-19', 'T_K=300',
    ]);
    expect(mass.code, mass.text).toBe(0);
    expect(Math.abs(recovered(mass.text) / ni - 1)).toBeLessThan(1e-12);
    expect(mass.text).toContain('be-99');

    const lst = await run(['explain', 'lst-ratio', 'eps_static=10', 'eps_inf=2']);
    expect(lst.code, lst.text).toBe(0);
    expect(recovered(lst.text)).toBeCloseTo(5, 12);
    expect(lst.text).toContain('be-100');

    const bkt = await run(['explain', 'bkt-temperature', 'J_J=1e-21']);
    expect(bkt.code, bkt.text).toBe(0);
    expect(recovered(bkt.text)).toBeCloseTo((Math.PI * 1e-21) / (2 * K_B_SI), 6);
    expect(bkt.text).toContain('be-101');

    const channel = await run(['explain', 'landauer-channel-conductance', 'sum_Tn=0.4']);
    expect(channel.code, channel.text).toBe(0);
    expect(recovered(channel.text)).toBeCloseTo((2 * E_SI ** 2 / H_SI) * 0.4, 8);
    expect(channel.text).toContain('be-102');
  });
});
