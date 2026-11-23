/**
 * A G-closure of an atomic law is not a derived prefactor.
 *
 * `upt audit --source=canonical` once listed CE-rydberg-energy, the Bohr radius,
 * the classical electron radius, and the Bohr magneton as DERIVED with
 * ℏ, c, G and factors from 10^-25 to 10^23, and CE-field-energy-density at
 * ×1.090e+1 with ℏ, c, e. With ε₀ and m_e in the closure search each derives on
 * the constants it bakes, with a clean factor; a closure through G stays
 * spurious. Stefan–Boltzmann and Wien stay empirical/tuned. Planck–Einstein
 * and de Broglie stay ×2π.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const SPURIOUS = [
  'CE-rydberg-energy',
  'CE-classical-electron-radius',
  'CE-bohr-magneton',
  'CE-bohr-radius',
  'CE-field-energy-density',
] as const;

async function audit(args: string[]) {
  const cap = capture();
  const code = await runCli(['audit', '--source=canonical', ...args], cap.io);
  return { code, stdout: cap.lines.join(''), stderr: cap.err.join('') };
}

describe('canonical audit G-closures', () => {
  it('derives the atomic laws on the constants they bake, never through G', async () => {
    // Before 2026-10-09 the closure search knew only ℏ, c, G, k_B and e, so these entries
    // closed on G with factors from 10^-25 to 10^23 and were listed as reconstruction
    // mismatches (decoys). ε₀ and m_e now join the search, and each derives on its own
    // constants with its own clean factor. A closure that names G is still spurious.
    const text = await audit([]);
    expect(text.code).toBe(0);
    const derived = text.stdout.split('DIMENSIONAL-RECONSTRUCTION')[0] ?? '';
    expect(derived).toMatch(/CE-classical-electron-radius\s+\+\[c,e,epsilon_0,m_e\]\s+×0\.0795774715459477 \(= 1\/\(4π\)\)$/m);
    expect(derived).toMatch(/CE-bohr-magneton\s+\+\[ℏ,e,m_e\]\s+×0\.5 \(= 1\/2\)$/m);
    expect(derived).toMatch(/CE-bohr-radius\s+\+\[ℏ,e,epsilon_0,m_e\]\s+×12\.5663706143592 \(= 4π\)$/m);
    expect(derived).toMatch(/CE-field-energy-density\s+\+\[epsilon_0\]\s+×0\.5 \(= 1\/2\)$/m);
    // The two closed forms the retired list could not name (header): derived, no G.
    expect(derived).toMatch(/CE-stefan-boltzmann\s+\+\[ℏ,c,k_B\]\s+×0\.164493406684823 \(= π²\/60\)$/m);
    expect(derived).toMatch(/CE-rydberg-energy\s+\+\[ℏ,e,epsilon_0,m_e\]\s+×0\.00316628698882306 \(= 1\/\(32π²\)\)$/m);
    // A closure that names G is never derived.
    for (const id of SPURIOUS) expect(derived, id).not.toMatch(new RegExp(`${id}\\s+\\+\\[[^\\]]*\\bG\\b`));
    expect(text.stdout).toMatch(/CE-wien\s+\+\[ℏ,c,k_B\]\s+×1\.26546641505411\s+\(prefactor without a recognized exact form\)/);
    expect(text.stdout).toMatch(/CE-planck-einstein\s+\+\[ℏ\]\s+×6\.28318530717959 \(= 2π\)$/m);
    expect(text.stdout).toMatch(/CE-de-broglie\s+\+\[ℏ\]\s+×6\.28318530717959 \(= 2π\)$/m);
    const groups = JSON.parse((await audit(['--json'])).stdout).result;
    expect(groups.notUnique.map((row: { id: string }) => row.id)).toEqual(expect.arrayContaining([
      'CE-hawking-temperature', 'CE-light-deflection', 'CE-perihelion-precession', 'CE-bekenstein-hawking',
      'CE-lorentz-factor', 'CE-capacitance-parallel-plate',
    ]));
    expect(groups.notAMonomial.map((row: { id: string }) => row.id)).toContain('CE-boltzmann-factor');
    expect(groups.decoy).toEqual([]);
  });

  it('keeps the catalog empirical scale of be-48', async () => {
    const cap = capture();
    expect(await runCli(['audit', '--json'], cap.io)).toBe(0);
    const env = JSON.parse(cap.lines.join('')) as {
      result: { derived: { id: string; cleanPrefactor: boolean }[] };
    };
    expect(env).toMatchObject({
      coverage: {
        total: 160,
        withoutRoutes: ['be-28', 'be-29', 'be-32', 'be-35', 'be-44'],
        nonBridgeLaws: ['law-schwarzschild-radius'],
      },
    });
    const be48 = env.result.derived.find((d) => d.id === 'be-48');
    expect(be48?.cleanPrefactor).toBe(false);
  });
});
