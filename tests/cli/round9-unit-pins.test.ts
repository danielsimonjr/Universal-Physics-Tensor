/**
 * Round-9 unit reports that already pass on master, pinned so they stay fixed.
 * #545 steradian, arcsecond and milliarcsecond. #549 / #534 molar and volume
 * inputs are dimensionful. #551 / #532 evaluate prints the named target, not `value`.
 */
import { runText } from '../helpers/cli-run.js';
import { describe, expect, it } from 'vitest';

const ARCSEC = Math.PI / 180 / 3600;

async function ok(args: string[]): Promise<string> {
  const r = await runText(args);
  expect(r.code, r.text).toBe(0);
  return r.text;
}

function first(text: string): number {
  return Number(text.trim().split('\n')[0]);
}

describe('#545 steradian, arcsecond, milliarcsecond', () => {
  it('reads sr as dimensionless 1 and arcsec / arcsecond as pi/648000', async () => {
    expect(first(await ok(['eval', 'L', 'L=1sr']))).toBe(1);
    expect(first(await ok(['eval', 'A', 'A=1arcsec']))).toBeCloseTo(ARCSEC, 20);
    expect(first(await ok(['eval', 'A', 'A=1arcsecond']))).toBeCloseTo(ARCSEC, 20);
    expect(first(await ok(['eval', 'x', 'x=1W/(m^2*sr)']))).toBe(1);
  });

  it('reads mas as the milliarcsecond, not metre times attosecond, and as stays the attosecond', async () => {
    expect(first(await ok(['eval', 't', 't=1mas']))).toBeCloseTo(ARCSEC / 1000, 22);
    expect(first(await ok(['eval', 't', 't=1as']))).toBe(1e-18);
  });
});

describe('#549 / #534 molar and volume inputs carry their dimension', () => {
  it('converts kJ/mol on be-147, be-149, be-152 and labels it, and 1L on be-161', async () => {
    const be147 = await ok(['evaluate', 'be-147', 'A_Hz=1e13', 'Ea_J_per_mol=50kJ/mol', 'T_K=298.15']);
    const bare = await ok(['evaluate', 'be-147', 'A_Hz=1e13', 'Ea_J_per_mol=50000', 'T_K=298.15']);
    expect(be147).toContain('Ea_J_per_mol=50000');
    expect(be147).not.toMatch(/Ea_J_per_mol \[dimensionless\]/);
    expect(/arrhrate \[s\^-1\] = (\S+)/.exec(be147)?.[1]).toBe(/arrhrate \[s\^-1\] = (\S+)/.exec(bare)?.[1]);
    await ok(['evaluate', 'be-149', 'dH_J_per_mol=40kJ/mol', 'T_K=298.15']);
    await ok(['evaluate', 'be-152', 'dH_J_per_mol=40.66kJ/mol', 'T1_K=373.15', 'T2_K=298.15']);
    const be161 = await ok(['evaluate', 'be-161', 'rho_kg_per_m3=1000', 'c_J_per_kg_K=4180', 'V_m3=1L', 'h_W_per_m2_K=20', 'A_m2=0.01', 't_s=0', 'theta_difference_K=10']);
    expect(be161).toContain('V_m3=0.001');
    expect(be161).not.toMatch(/V_m3 \[dimensionless\]/);
  });
});

describe('#551 / #532 evaluate names its target', () => {
  it('prints the target symbol and unit for be-78, be-131 and be-120, not a bare value line', async () => {
    const be78 = await ok(['evaluate', 'be-78', 'E_Pa=200GPa', 'I_m4=1cm^4', 'L_m=2m']);
    expect(be78).toMatch(/buckling-load \[N\] = 4934\.802200544679/);
    const be131 = await ok(['evaluate', 'be-131', 'rho_kg_per_m3=1000', 'dv_m_per_s=1', 'K_Pa=2.2GPa', 'E_Pa=2GPa', 'pipe_D_m=50mm', 'wall_m=2mm']);
    expect(be131).toMatch(/joukowsky-jump \[Pa\] = 277836\.2511554968/);
    const be120 = await ok(['evaluate', 'be-120', 'B_E_T=3.12e-5', 'rho_kg_per_m3=8.36310961845e-21', 'v_m_per_s=4e5']);
    expect(be120).toMatch(/standoff-sixth \[1\] = /);
    expect(be120).toContain('(R/R_E)');
    for (const text of [be78, be131, be120]) expect(text).not.toMatch(/^\s*value = /m);
  });
});

describe('#550 a degC excess temperature on Newton cooling is a difference', () => {
  const base = ['evaluate', 'be-161', 'rho_kg_per_m3=1000', 'c_J_per_kg_K=4180', 'V_m3=0.001', 'h_W_per_m2_K=20', 'A_m2=0.01', 't_s=0'];
  const value = (text: string): string | undefined => /\] = (\S+) — θ\(t\)/.exec(text)?.[1];

  it('10degC, 10K and a bare 10 give theta(0) = 10, with no absolute offset', async () => {
    const celsius = await ok([...base, 'theta_difference_K=10degC']);
    expect(value(celsius)).toBe('10');
    expect(value(await ok([...base, 'theta_difference_K=10K']))).toBe('10');
    expect(value(await ok([...base, 'theta_difference_K=10']))).toBe('10');
    expect(celsius).toContain('10degC → 10 K (a difference: no offset)');
    expect(celsius).not.toContain('273.15');
  });
});
