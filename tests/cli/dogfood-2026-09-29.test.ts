/**
 * Regressions from the 2026-09-29 three-persona CLI dogfood. Each case
 * failed on master before the fix; the reports in docs/dogfood/ record
 * the output that was actually printed.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { E_SI, K_B_SI } from '../../src/core/constants.js';
import { EPS0_SI, MU0_SI } from '../../src/composition/formula-names.js';

function capture() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      out: (s?: string) => stdout.push((s ?? '') + '\n'),
      err: (s?: string) => stderr.push((s ?? '') + '\n'),
      write: (s: string) => stdout.push(s),
    },
  };
}

async function run(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, stdout: cap.stdout.join(''), stderr: cap.stderr.join('') };
}

describe('applied physicist', () => {
  it('bare e is the elementary charge, and the old charge spelling still works', async () => {
    const r = await run(['eval', 'e']);
    expect(r.code).toBe(0);
    expect(Number(r.stdout)).toBeCloseTo(E_SI, 20);
    expect(r.stderr).not.toMatch(/Euler/);
    expect((await run(['eval', 'charge'])).code).toBe(2);
    expect(Number((await run(['eval', 'e_charge'])).stdout)).toBeCloseTo(E_SI, 20);
    expect((await run(['eval', '--allow-euler', 'e'])).code).toBe(2);
  });

  it('eval accepts epsilon_0, mu_0 and kB, the names the catalog uses', async () => {
    expect(Number((await run(['eval', 'epsilon_0'])).stdout)).toBeCloseTo(EPS0_SI, 20);
    expect(Number((await run(['eval', 'mu_0'])).stdout)).toBeCloseTo(MU0_SI, 15);
    expect(Number((await run(['eval', 'kB'])).stdout)).toBeCloseTo(K_B_SI, 30);
  });

  it('eval warns that a bare A is the ampere, and still computes it as one', async () => {
    const coulomb = await run(['eval', 'e_charge^2/(4*pi*eps0*r^2)', 'r=1A']);
    expect(coulomb.stdout).toMatch(/2\.307/);
    expect(coulomb.stdout).toMatch(/e-28/);
    expect(coulomb.stderr).toMatch(/ampere, not the angstrom/);
    const angstrom = await run(['eval', 'e_charge^2/(4*pi*eps0*r^2)', 'r=1angstrom']);
    expect(angstrom.stdout).toMatch(/e-8/);
    expect(angstrom.stderr).not.toMatch(/angstrom/);
  });

  it('eval repeats the unit-convention notes evaluate already prints', async () => {
    expect((await run(['eval', 'M', 'M=1Msun'])).stderr).toMatch(/M_SUN_SI/);
    expect((await run(['eval', 't', 't=1myr'])).stderr).toMatch(/milliyear/);
    expect((await run(['eval', 'B', 'B=1G'])).stderr).toMatch(/gauss/);
    expect((await run(['eval', 'B', 'B=1T'])).stderr).toMatch(/tesla/);
    expect((await run(['eval', 'p', 'p=1GPa'])).stderr).not.toMatch(/gauss/);
    expect((await run(['eval', 't', 't=1Ts'])).stderr).not.toMatch(/tesla/);
  });

  it('puts the ħ truncation note in the JSON envelope as well as on stderr', async () => {
    const r = await run(['eval', 'hbar', '--json']);
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/HBAR_SI/);
    const env = JSON.parse(r.stdout) as { result: { notes?: string[] } };
    expect(env.result.notes?.join(' ')).toMatch(/HBAR_SI/);
  });

  it('mu0 rewrites to mu_0, so a wire field is not called dimensionless', async () => {
    const r = await run([
      'map',
      '--equation-only',
      '--equation',
      'magnetic_field = mu0*current/(2*pi*radius)',
    ]);
    expect(r.stderr).not.toMatch(/mu0.*dimensionless/);
    expect(r.stdout).toMatch(/agrees with CE-magnetic-field-wire/);
    expect(r.code).toBe(0);
  });

  it('an unbound target is not given a dimension, and a declined letter is not a failed match', async () => {
    const r = await run(['map', '--equation-only', '--equation', 'B = mu_0*I/(2*pi*r)']);
    expect(r.stdout).not.toMatch(/RHS dimension/);
    expect(r.stdout).toMatch(/taken as dimensionless/);
    expect(r.stdout).not.toMatch(/'B' did not match/);
    expect(r.stdout).not.toMatch(/'r' did not match/);
    expect(r.stdout).toMatch(/'I' did not match/);
    expect(r.stdout).toMatch(/'B' matches the catalog quantity B/);
    expect(r.stdout).toMatch(/is not bound/);
    expect(r.code).toBe(0);
  });

  it('a Compton formula that matches one catalog entry does not fail on its 2π sibling', async () => {
    const reduced = await run(['map', '--equation-only', '--equation', 'compton_wavelength = hbar/(m_e*c)']);
    expect(reduced.code).toBe(0);
    expect(reduced.stdout).toMatch(/agrees with CE-compton-wavelength\b/);
    expect(reduced.stdout).toMatch(/differs from CE-compton-wavelength-full/);
    expect(reduced.stdout).toMatch(/0\.159155/);
    expect(reduced.stdout).toMatch(/two catalog conventions|CE-compton-wavelength is the reduced/);
    const full = await run(['map', '--equation-only', '--equation', 'compton_wavelength = h/(m_e*c)']);
    expect(full.code).toBe(0);
    expect(full.stdout).toMatch(/agrees with CE-compton-wavelength-full/);
    const wrong = await run(['map', '--equation-only', '--equation', 'compton_wavelength = 2*hbar/(m_e*c)']);
    expect(wrong.code).toBe(3);
  });

  it('--natural compares at c = 1, and a genuine factor of 2 still fails', async () => {
    const natural = await run(['map', '--natural', '--equation-only', '--equation', 'rest_energy = mass']);
    expect(natural.code).toBe(0);
    expect(natural.stdout).toMatch(/agrees with CE-mass-energy/);
    expect(natural.stdout).toMatch(/c = 1/);
    expect(natural.stdout).not.toMatch(/1\.11265e-17/);
    const doubled = await run(['map', '--natural', '--equation-only', '--equation', 'rest_energy = 2*mass']);
    expect(doubled.code).toBe(3);
    expect(doubled.stdout).toMatch(/2\.00000/);
    expect(doubled.stdout).not.toMatch(/1\.11265e-17/);
    const si = await run(['map', '--equation-only', '--equation', 'rest_energy = mass']);
    expect(si.code).toBe(3);
    expect(si.stdout).toMatch(/1\.11265e-17/);
  });

  it('--geometrized compares the Schwarzschild radius at G = c = 1', async () => {
    const r = await run([
      'map',
      '--geometrized',
      '--equation-only',
      '--equation',
      'schwarzschild_radius = 2*mass',
    ]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/agrees with CE-schwarzschild-radius/);
    expect(r.stdout).not.toMatch(/1\.34659e\+27/);
  });
});

describe('engineering physicist', () => {
  it('an unknown path endpoint is named, not filed under the other family', async () => {
    const r = await run(['path', 'model-nope', 'model-spring']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/unknown model 'model-nope'/);
    expect(r.stderr).not.toMatch(/family 'oscillators'/);
    const both = await run(['path', 'model-nope', 'model-also-nope']);
    expect(both.stderr).toMatch(/model-nope/);
    expect(both.stderr).toMatch(/model-also-nope/);
  });

  it('help statuses defines the path refusal reasons the JSON actually emits', async () => {
    const help = await run(['help', 'statuses']);
    for (const word of [
      'cross-family-unmapped',
      'missing-lipschitz',
      'norm-not-stated',
      'norm-mismatch',
      'uniformity-unanalysed',
      'no-composite-claim',
    ]) {
      expect(help.stdout, word).toContain(word);
    }
    expect((await run(['help'])).stdout).toMatch(/cross-family-unmapped, still exit 0/);
  });

  it('cli/README says a failed check stays exit 3 under --json', () => {
    const readme = readFileSync(new URL('../../cli/README.md', import.meta.url), 'utf8');
    expect(readme).toMatch(/The exit code is the text\s+command's exit code/);
    expect(readme).toMatch(/still exit 3 under\s+`--json`/);
    expect(readme).not.toMatch(/--json` flag:[\s\S]{0,200}exits 0/);
  });
});
