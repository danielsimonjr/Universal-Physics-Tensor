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
    expect(derived).toMatch(/CE-classical-electron-radius\s+\+\[c,e,epsilon_0,m_e\]\s+×0\.0795774715459477$/m);
    expect(derived).toMatch(/CE-bohr-magneton\s+\+\[ℏ,e,m_e\]\s+×0\.5$/m);
    expect(derived).toMatch(/CE-bohr-radius\s+\+\[ℏ,e,epsilon_0,m_e\]\s+×12\.5663706143592$/m);
    expect(derived).toMatch(/CE-field-energy-density\s+\+\[epsilon_0\]\s+×0\.5$/m);
    for (const id of SPURIOUS) expect(derived, id).not.toMatch(new RegExp(`${id}\\s+\\+\\[[^\\]]*\\bG\\b`));
    expect(text.stdout).toMatch(/CE-stefan-boltzmann\s+\+\[ℏ,c,k_B\]\s+×0\.164493406679472\s+\(empirical\/tuned constant\)/);
    expect(text.stdout).toMatch(/CE-wien\s+\+\[ℏ,c,k_B\]\s+×1\.26546641497325\s+\(empirical\/tuned constant\)/);
    expect(text.stdout).toMatch(/CE-planck-einstein\s+\+\[ℏ\]\s+×6\.28318530717959$/m);
    expect(text.stdout).toMatch(/CE-de-broglie\s+\+\[ℏ\]\s+×6\.28318530717959$/m);
    // Hawking, light deflection, perihelion and Bekenstein–Hawking: the only closure the search
    // accepts does not reproduce the evaluator, so they stay DECOY; the Rydberg energy's
    // 1/(32π²) is not a recognized factor and it stays there too.
    const decoy = text.stdout.split('OPEN (')[0]?.split('DIMENSIONAL-RECONSTRUCTION')[1] ?? '';
    expect(decoy).toMatch(/CE-hawking-temperature, CE-light-deflection, CE-perihelion-precession, CE-bekenstein-hawking/);
    expect(decoy).toContain('CE-rydberg-energy');
  });

  it('keeps the catalog empirical scale of be-48', async () => {
    const cap = capture();
    expect(await runCli(['audit', '--json'], cap.io)).toBe(0);
    const env = JSON.parse(cap.lines.join('')) as {
      result: { derived: { id: string; cleanPrefactor: boolean }[] };
    };
    const be48 = env.result.derived.find((d) => d.id === 'be-48');
    expect(be48?.cleanPrefactor).toBe(false);
  });
});
