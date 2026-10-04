/**
 * explain, derive, and map for magnetic pressure, the London depth, and
 * plasma beta. The 2 in p_B = B²/(2 μ0) is the Lean factor. Dimensional
 * analysis prints the monomial without it.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';
import { formatQuantity } from '../../src/composition/explain.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('explain, derive, and map for be-74, be-75, and be-76', () => {
  it('explain prints the Lean magnetic pressure, not the battery work', async () => {
    const B = 1;
    const half = formatQuantity(1 / (2 * MU0_SI));
    const full = formatQuantity(1 / MU0_SI);
    const r = await run(['explain', 'magnetic-pressure', 'B_T=1']);
    expect(r.code).toBe(0);
    expect(r.text).toContain(`Recovered value: ${half}`);
    expect(r.text).not.toContain(`Recovered value: ${full}`);
    expect(r.text).toContain('be-74');
    expect(r.text).toContain('dimensionful constants');
    expect(r.text).not.toContain('∝');
    expect(B).toBe(1);
  });

  it('explain prints the London root and the substituted plasma beta', async () => {
    const m = 9.1093837015e-31;
    const n = 1e28;
    const london = formatQuantity(Math.sqrt(m / (MU0_SI * n * E_SI * E_SI)));
    const depth = await run(['explain', 'london-penetration-depth', `m_kg=${m}`, `n_per_m3=${n}`]);
    expect(depth.code).toBe(0);
    expect(depth.text).toContain(`Recovered value: ${london}`);
    expect(depth.text).toContain('be-75');
    expect(depth.text).toContain('dimensionful constants');
    expect(depth.text).not.toContain('∝');

    const B = 0.2;
    const T = 1e6;
    const nPlasma = 1e20;
    const beta = (2 * MU0_SI * nPlasma * K_B_SI * T) / (B * B);
    const half = (nPlasma * K_B_SI * T) / ((B * B) / MU0_SI);
    const plasma = await run([
      'explain',
      'plasma-beta',
      `carrier-density=${nPlasma}`,
      `temperature=${T}`,
      `magnetic-flux-density=${B}`,
    ]);
    expect(plasma.code, plasma.text).toBe(0);
    const printed = Number(/Recovered value: ([0-9.eE+-]+)\./.exec(plasma.text)?.[1]);
    expect(printed).toBeCloseTo(beta, 12);
    expect(Math.abs(printed - half)).toBeGreaterThan(Math.abs(printed - beta));
    expect(plasma.text).toContain('be-76');
    expect(plasma.text).toContain('dimensionful constants');
  });

  it('derive and map name be-74, and the dimensional prefactor of the Lean formula is 1/2', async () => {
    const lean = await run([
      'derive',
      'magnetic-pressure:pressure',
      'magnetic_flux_density:magnetic_field',
      'epsilon_0:epsilon_0',
      'c:velocity',
      '--formula',
      'magnetic_flux_density^2*epsilon_0*c^2/2',
    ]);
    expect(lean.code, lean.text).toBe(0);
    expect(lean.text).toMatch(/be-74 \(Magnetic pressure/);
    expect(lean.text).toMatch(/recovered prefactor ≈ 5\.0000e-1/);
    expect(lean.text).toMatch(/prefactor is NOT checked/);
    const battery = await run([
      'derive',
      'magnetic-pressure:pressure',
      'magnetic_flux_density:magnetic_field',
      'epsilon_0:epsilon_0',
      'c:velocity',
      '--formula',
      'magnetic_flux_density^2*epsilon_0*c^2',
    ]);
    expect(battery.text).toMatch(/recovered prefactor ≈ 1\.0000e\+0/);
    expect(battery.text).toMatch(/be-74 \(Magnetic pressure/);
    const mapped = await run([
      'map',
      '--equation-only',
      '--equation',
      'magnetic_pressure = magnetic_flux_density^2*epsilon_0*c^2/2',
    ]);
    expect(mapped.code, mapped.text).toBe(0);
    expect(mapped.text).toMatch(/be-74 \(Magnetic pressure/);
  });

  it('derive names the London depth without a unique monomial, and map names plasma beta', async () => {
    const london = await run([
      'derive',
      'london-penetration-depth:length',
      'effective_mass:mass',
      'carrier_density:L^-3',
      'epsilon_0:epsilon_0',
      'c:velocity',
      'e:charge',
      '--formula',
      'sqrt(effective_mass*epsilon_0*c^2/(carrier_density*e^2))',
    ]);
    expect(london.text).toMatch(/NOT a unique monomial/);
    expect(london.text).toMatch(/be-75 \(London penetration/);
    expect(london.code).toBe(3);
    const beta = await run([
      'derive',
      'plasma-beta:dimensionless',
      'carrier_density:L^-3',
      'temperature:temperature',
      'magnetic_pressure:pressure',
      'k_B:entropy',
      '--formula',
      'carrier_density*k_B*temperature/magnetic_pressure',
    ]);
    expect(beta.code, beta.text).toBe(3);
    expect(beta.text).toMatch(/NOT a unique monomial/);
    expect(beta.text).toMatch(/be-76 \(Plasma beta/);
    const mapped = await run([
      'map',
      '--equation-only',
      '--equation',
      'plasma_beta = carrier_density*k_B*temperature/magnetic_pressure',
    ]);
    expect(mapped.code, mapped.text).toBe(0);
    expect(mapped.text).toMatch(/be-76 \(Plasma beta/);
    const expanded = await run([
      'map',
      '--equation-only',
      '--equation',
      'plasma_beta = 2*epsilon_0*c^2*carrier_density*k_B*temperature/magnetic_flux_density^2',
    ]);
    expect(expanded.text).not.toMatch(/be-76 \(Plasma beta/);
  });
});
