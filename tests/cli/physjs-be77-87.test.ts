/**
 * explain and search for BE-77 through BE-87.
 *
 * A denial sentence is not a search hit. "thomson coefficient" is BE-83.
 * "skin depth" is the applied case, not the London denial. "onsager" and
 * "reversibility" still find BE-73, including the sentence that says the
 * equality is not an axiom.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { EPS0_SI } from '../../src/dimensional/formula-names.js';

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

describe('upt explain for BE-77 through BE-87', () => {
  it('prints the Hagen–Poiseuille flux and the pinned Euler load', async () => {
    const flux = (Math.PI * 0.01 ** 4 * 1000) / (8 * 0.001 * 1);
    const pipe = await run(['explain', 'poiseuille-flow', 'R_m=0.01', 'deltaP_Pa=1000', 'mu_Pa_s=0.001', 'L_m=1']);
    expect(pipe.code, pipe.text).toBe(0);
    expect(recovered(pipe.text)).toBeCloseTo(flux, 10);
    expect(pipe.text).toContain('be-77');
    expect(recovered(pipe.text)).not.toBeCloseTo(flux * 8 / 16, 6);

    const pinned = (Math.PI ** 2 * 2e11 * 1e-8) / 1;
    const column = await run(['explain', 'buckling-load', 'E_Pa=2e11', 'I_m4=1e-8', 'L_m=1']);
    expect(column.code, column.text).toBe(0);
    expect(recovered(column.text)).toBeCloseTo(pinned, 6);
    expect(column.text).toContain('be-78');
    expect(recovered(column.text)).not.toBeCloseTo(pinned / 4, 4);
  });

  it('prints pull-in, Mott–Gurney, and Child–Langmuir', async () => {
    const fold = Math.sqrt((8 * 1 * 1e-18) / (27 * EPS0_SI * 1e-6));
    const pull = await run(['explain', 'pull-in-voltage', 'k_N_per_m=1', 'g0_m=1e-6', 'A_m2=1e-6']);
    expect(pull.code, pull.text).toBe(0);
    expect(recovered(pull.text)).toBeCloseTo(fold, 8);
    expect(pull.text).toContain('be-79');

    const mott = (9 / 8) * 1e-11 * 1e-8 * 1 / 1e-18;
    const film = await run(['explain', 'mott-gurney-current', 'eps=1e-11', 'mu_m2_per_Vs=1e-8', 'V_volts=1', 'd_m=1e-6']);
    expect(film.code, film.text).toBe(0);
    expect(recovered(film.text)).toBeCloseTo(mott, 4);
    expect(film.text).toContain('be-80');

    const m = 9.1093837015e-31;
    const child = ((4 * EPS0_SI) / 9) * Math.sqrt((2 * E_SI) / m) * 1 / 1e-6;
    const vacuum = await run(['explain', 'child-langmuir-current', `m_kg=${m}`, 'V_volts=1', 'd_m=1e-3']);
    expect(vacuum.code, vacuum.text).toBe(0);
    expect(recovered(vacuum.text)).toBeCloseTo(child, 2);
    expect(vacuum.text).toContain('be-81');
  });

  it('prints Shockley, Thomson, four-point, shot noise, Reynolds, and capacitor noise', async () => {
    const shockley = await run(['explain', 'shockley-current', 'I_s_A=1e-12', 'V_volts=0', 'T_K=300']);
    expect(shockley.code, shockley.text).toBe(0);
    expect(recovered(shockley.text)).toBe(0);
    expect(shockley.text).toContain('be-82');

    const thomson = await run(['explain', 'thomson-coefficient', 'T_K=300', 'dS_dT_V_per_K2=1e-6']);
    expect(thomson.code, thomson.text).toBe(0);
    expect(recovered(thomson.text)).toBeCloseTo(3e-4, 12);
    expect(thomson.text).toContain('be-83');
    expect(thomson.text).not.toContain('be-73');

    const sheet = await run(['explain', 'sheet-resistance', 'V_volts=1e-3', 'I_A=1e-3']);
    expect(sheet.code, sheet.text).toBe(0);
    expect(recovered(sheet.text)).toBeCloseTo(Math.PI / Math.log(2), 10);
    expect(sheet.text).toContain('be-84');

    const shot = await run(['explain', 'shot-noise', 'I_A=1e-3']);
    expect(shot.code, shot.text).toBe(0);
    expect(recovered(shot.text)).toBeCloseTo(2 * E_SI * 1e-3, 16);
    expect(shot.text).toContain('be-85');

    const reynolds = await run(['explain', 'stanton-number', 'C_f=0.004']);
    expect(reynolds.code, reynolds.text).toBe(0);
    expect(recovered(reynolds.text)).toBeCloseTo(0.002, 12);
    expect(reynolds.text).toContain('be-86');

    const noise = await run(['explain', 'capacitor-voltage-variance', 'T_K=300', 'C_F=1e-12']);
    expect(noise.code, noise.text).toBe(0);
    expect(recovered(noise.text)).toBeCloseTo((K_B_SI * 300) / 1e-12, 6);
    expect(noise.text).toContain('be-87');
  });
});

describe('search targets for the Thomson coefficient and skin depth', () => {
  it('thomson coefficient is BE-83 and is not the Kelvin denial', async () => {
    const r = await run(['search', 'thomson', 'coefficient']);
    expect(r.code, r.text).toBe(0);
    expect(r.text).toContain('be-83');
    expect(r.text).toContain('Thomson coefficient');
    expect(r.text).not.toContain('be-73');
  });

  it('skin depth is the applied case and is not the London denial', async () => {
    const r = await run(['search', 'skin', 'depth']);
    expect(r.code, r.text).toBe(0);
    expect(r.text).toContain('case-skin-depth');
    expect(r.text).not.toContain('be-75');
  });

  it('onsager and reversibility still find BE-73', async () => {
    const onsager = await run(['search', 'onsager']);
    expect(onsager.code, onsager.text).toBe(0);
    expect(onsager.text).toContain('be-73');
    const reversibility = await run(['search', 'reversibility']);
    expect(reversibility.code, reversibility.text).toBe(0);
    expect(reversibility.text).toContain('be-73');
  });
});
