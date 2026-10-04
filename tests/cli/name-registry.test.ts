/**
 * One alias registry for evaluate, explain, search, and derive.
 *
 * `upt explain debye-length` used to suggest `planck-length` (a shared
 * token) and exit 1. `upt explain` of the keys `upt evaluate` prints used
 * to exit 0 and say there is no derivation path. `mu_0` as a dimension
 * term used to exit 2.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { formatQuantity } from '../../src/composition/explain.js';
import { analyzeUserEquation } from '../../src/composition/user-equation.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

async function run(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('name registry — explain, search, derive', () => {
  it('explain debye-length names the Debye frequency and does not suggest planck-length', async () => {
    const r = await run(['explain', 'debye-length']);
    expect(r.code).toBe(1);
    expect(r.text).not.toMatch(/planck-length/);
    expect(r.text).toMatch(/CE-debye-frequency/);
    const search = await run(['search', 'debye']);
    expect(search.code).toBe(0);
    expect(search.text).toMatch(/CE-debye-frequency/);
  });

  it('a one-edit token resolves to that quantity', async () => {
    const r = await run(['explain', 'temperatur']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/temperature/);
    expect(r.text).not.toMatch(/NOT COVERED/);
  });

  it('evaluate keys recover radiation pressure, Alfvén speed, and the Tolman invariant', async () => {
    const pressure = await run(['explain', 'radiation-pressure', 'I=1e6', 'R=0', 'theta=0']);
    expect(pressure.code).toBe(0);
    expect(pressure.text).not.toMatch(/cannot be determined/);
    const pressureJson = await run(['explain', 'radiation-pressure', 'I=1e6', 'R=0', 'theta=0', '--json']);
    const pressureValue = (JSON.parse(pressureJson.text) as { result: { recoveredValue: number } }).result.recoveredValue;
    expect(Math.abs(pressureValue - 3.3356e-3) / 3.3356e-3).toBeLessThan(1e-4);
    expect(pressure.text).toContain(`Recovered value: ${formatQuantity(pressureValue)}.`);
    expect(pressure.text).not.toMatch(/3\.3356e-3/);

    const listed = await run(['explain', 'radiation-pressure', 'I_W_per_m2=1e6', 'R=0', 'theta_rad=0']);
    expect(listed.code).toBe(0);
    expect(listed.text).toContain(`Recovered value: ${formatQuantity(pressureValue)}.`);

    const alfven = await run(['explain', 'alfven-speed', 'B_T=12e-9', 'rho_kg_per_m3=2.34e-20']);
    expect(alfven.code).toBe(0);
    expect(alfven.text).not.toMatch(/cannot be determined/);
    expect(alfven.text).toMatch(/Recovered value:/);

    const tolman = await run(['explain', 'tolman-invariant', 'T_K=5800', 'g_00=-1']);
    expect(tolman.code).toBe(0);
    expect(tolman.text).not.toMatch(/cannot be determined/);
    expect(tolman.text).toContain(`Recovered value: ${formatQuantity(5800)}.`);
    expect(tolman.text).not.toMatch(/5\.8000e\+3/);
  });

  it('a name that does not resolve exits 1 and does not claim there is no derivation path', async () => {
    const r = await run(['explain', 'hawking-temperature', 'nope=1']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/did not resolve/);
    expect(r.text).not.toMatch(/no derivation path/);
  });

  it('search finds a quantity by the evaluate key', async () => {
    const r = await run(['search', 'I_W_per_m2']);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/poynting-flux/);
  });

  it('map reads an evaluate key as that target\'s graph quantity, and not as another edge\'s', async () => {
    const dims = new Map(
      ['radiation-pressure', 'poynting-flux', 'alfven-speed', 'plasma-mass-density', 'mass-density'].map(
        (name) => [name, DIMENSIONLESS] as const,
      ),
    );
    const pressure = await analyzeUserEquation('radiation_pressure = I_W_per_m2 / c', dims);
    expect(pressure.junction.sources).toContain('poynting-flux');
    expect(pressure.placeholders).not.toContain('I_W_per_m2');
    const alfven = await analyzeUserEquation('alfven_speed = rho_kg_per_m3', dims);
    expect(alfven.junction.sources).toContain('plasma-mass-density');
    const density = await analyzeUserEquation('mass_density = rho_kg_per_m3', dims);
    expect(density.junction.sources).not.toContain('plasma-mass-density');
    expect(density.placeholders).toContain('rho_kg_per_m3');
  });

  it('mu_0 as a dimension term is permeability', async () => {
    const r = await run([
      'derive',
      'velocity:velocity',
      'B:magnetic_field',
      'mu_0:mu_0',
      'rho:mass/length^3',
      '--formula',
      'B/sqrt(mu_0*rho)',
    ]);
    expect(r.code).toBe(0);
    expect(r.text).not.toMatch(/unrecognized dimension term/);
    expect(r.text).toMatch(/1\.0000e\+0/);
  });
});
