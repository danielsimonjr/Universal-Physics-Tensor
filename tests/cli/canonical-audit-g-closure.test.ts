/**
 * A G-closure of an atomic law is not a derived prefactor.
 *
 * `upt audit --source=canonical` listed CE-rydberg-energy, the Bohr radius,
 * the classical electron radius, and the Bohr magneton as DERIVED with
 * ℏ, c, G and factors from 10^-25 to 10^23. CE-field-energy-density was
 * the same shape at ×1.090e+1 with ℏ, c, e. Stefan–Boltzmann and Wien stay
 * empirical/tuned. Planck–Einstein and de Broglie stay ×2π.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const SPURIOUS = [
  'CE-rydberg-energy',
  'CE-classical-electron-radius',
  'CE-bohr-magneton',
  'CE-bohr-radius',
  'CE-field-energy-density',
] as const;

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

async function audit(args: string[]) {
  const cap = capture();
  const code = await runCli(['audit', '--source=canonical', ...args], cap.io);
  return { code, stdout: cap.lines.join(''), stderr: cap.err.join('') };
}

describe('canonical audit G-closures', () => {
  it('does not list a G-closure or the field-energy stand-in as DERIVED', async () => {
    const text = await audit([]);
    expect(text.code).toBe(0);
    const derived = text.stdout.split('DIMENSIONAL-RECONSTRUCTION')[0] ?? '';
    for (const id of SPURIOUS) expect(derived, id).not.toContain(id);
    expect(text.stdout).toMatch(/CE-stefan-boltzmann\s+\+\[ℏ,c,k_B\]\s+×1\.645e-1\s+\(empirical\/tuned constant\)/);
    expect(text.stdout).toMatch(/CE-wien\s+\+\[ℏ,c,k_B\]\s+×1\.265e\+0\s+\(empirical\/tuned constant\)/);
    expect(text.stdout).toMatch(/CE-planck-einstein\s+\+\[ℏ\]\s+×6\.283e\+0$/m);
    expect(text.stdout).toMatch(/CE-de-broglie\s+\+\[ℏ\]\s+×6\.283e\+0$/m);
    expect(text.stdout).toMatch(/DERIVED \(73\)/);
    expect(text.stdout).toMatch(/COEFFICIENT UNSET \(6\)/);
    // Hawking, light deflection, perihelion, and Bekenstein–Hawking were OPEN
    // because a null monomial evaluated to NaN, so the audit had no samples.
    // The evaluator is the AST. The only closure the search accepts does not
    // reproduce it, so those four are DECOY and OPEN is 19.
    expect(text.stdout).toMatch(/DECOY, 11\)/);
    expect(text.stdout).toMatch(
      /CE-hawking-temperature, CE-light-deflection, CE-perihelion-precession, CE-bekenstein-hawking/,
    );
    expect(text.stdout).toMatch(/OPEN \(19\)/);
    const decoy = text.stdout.split('OPEN (')[0] ?? '';
    for (const id of SPURIOUS) expect(decoy, id).toContain(id);
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
