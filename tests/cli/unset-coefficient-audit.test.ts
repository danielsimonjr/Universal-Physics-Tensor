/**
 * A dimensional entry with no sourced prefactor is not a recovered factor of 1.
 *
 * A missing coefficient is unset. Explain prints no recovered number.
 * Fermi energy, Fermi velocity, and the Debye frequency are proportionalities.
 * The plasma frequency's unit monomial is the angular formula, so that row
 * stays derived. A sourced factor of 1, such as the simple-harmonic frequency,
 * stays derived too.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

const UNSET = ['CE-fermi-energy', 'CE-fermi-velocity', 'CE-debye-frequency', 'CE-sound-speed'] as const;

function capture() {
  const lines: string[] = [];
  return {
    lines,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => lines.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

async function run(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, text: cap.lines.join('') };
}

function section(text: string, heading: string, next: string): string {
  const start = text.indexOf(heading);
  const end = text.indexOf(next, start + heading.length);
  return start < 0 ? '' : text.slice(start, end < 0 ? undefined : end);
}

describe('an unset dimensional coefficient is not a recovered prefactor', () => {
  it('lists the proportionalities apart from DERIVED, and keeps a sourced 1', async () => {
    const audit = await run(['audit', '--source=canonical']);
    expect(audit.code).toBe(0);
    const derived = section(audit.text, 'DERIVED', 'COEFFICIENT UNSET');
    const unset = section(audit.text, 'COEFFICIENT UNSET', 'DIMENSIONAL-RECONSTRUCTION');
    expect(unset.length).toBeGreaterThan(0);
    for (const id of UNSET) {
      expect(derived, id).not.toContain(id);
      expect(unset, id).toContain(id);
    }
    expect(derived).toContain('CE-plasma-frequency');
    expect(derived).toMatch(/CE-plasma-frequency\s+\+\[\]\s+×1\.000e\+0/);
    expect(derived).toContain('CE-simple-harmonic-frequency');
    expect(derived).toContain('CE-electrical-conductivity');
    expect(unset).not.toContain('CE-plasma-frequency');
    expect(unset).not.toContain('CE-simple-harmonic-frequency');
  });

  it('prints no recovered number for Fermi, velocity, and Debye, and names the unset factor', async () => {
    const hbar = 'reduced-planck-constant=1.054571817e-34';
    const m = 'mass=9.1093837015e-31';
    const n = 'carrier-density=8.47e28';
    const fermi = await run(['explain', 'fermi-energy', hbar, m, n, '--source=canonical']);
    expect(fermi.code).toBe(0);
    expect(fermi.text).not.toMatch(/Recovered value:/);
    expect(fermi.text).toMatch(/factor is unset/);
    expect(fermi.text).toMatch(/\(1\/2\)\(3π²\)\^\{2\/3\}/);

    const velocity = await run(['explain', 'fermi-velocity', hbar, m, n, '--source=canonical']);
    expect(velocity.code).toBe(0);
    expect(velocity.text).not.toMatch(/Recovered value:/);
    expect(velocity.text).toMatch(/\(3π²\)\^\{1\/3\}/);
    expect(velocity.text).toMatch(/factor is unset/);

    const debye = await run([
      'explain',
      'debye-frequency',
      'sound-speed=3000',
      'number-density=8.5e28',
      '--source=canonical',
    ]);
    expect(debye.code).toBe(0);
    expect(debye.text).not.toMatch(/Recovered value:/);
    expect(debye.text).toMatch(/\(6π²\)\^\{1\/3\}/);
    expect(debye.text).toMatch(/factor is unset/);
  });
});
