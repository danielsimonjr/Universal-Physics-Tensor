/**
 * Textbook formulas and weak-field domain notes as `upt` prints them.
 * The comparison rules are pinned in tests/composition/gr-formula-compare.test.ts;
 * this file pins the CLI text, the elementary-charge reading of e, and the be-51/be-52 cut.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { C_SI, E_SI, G_SI, M_SUN_SI } from '../../src/core/constants.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

async function text(args: string[], expected = 0): Promise<string> {
  const cap = capture();
  const code = await runCli(args, cap.io);
  expect(code).toBe(expected);
  return cap.lines.join('');
}

const rsSun = (2 * G_SI * M_SUN_SI) / (C_SI * C_SI);

describe('upt map --equation — GR formulas a student types', () => {
  it('the Einstein perihelion formula agrees when 1-e² is named one_minus_e_sq; half the prefactor exits 3', async () => {
    const agree = await text([
      'map', '--equation-only', '--equation',
      'perihelion_advance = 6*pi*G*mass/(c^2*semi_major_axis*one_minus_e_sq)',
    ]);
    expect(agree).toMatch(/✓ agrees with CE-perihelion-precession/);
    const half = await text(
      [
        'map', '--equation-only', '--equation',
        'perihelion_advance = 3*pi*G*mass/(c^2*semi_major_axis*one_minus_e_sq)',
      ],
      3,
    );
    expect(half).toMatch(/differs from CE-perihelion-precession .* by a constant factor: yours\/canonical = 0\.500000/);
  });

  it("Newton's law with the governing names agrees; twice the force exits 3", async () => {
    const agree = await text([
      'map', '--equation-only', '--equation',
      'gravitational_force = G*mass*secondary_mass/r^2',
    ]);
    expect(agree).toMatch(/✓ agrees with CE-newton-gravitation/);
    const twice = await text(
      ['map', '--equation-only', '--equation', 'gravitational_force = 2*G*mass*secondary_mass/r^2'],
      3,
    );
    expect(twice).toMatch(/differs from CE-newton-gravitation .* by a constant factor: yours\/canonical = 2\.00000/);
  });

  it('schwarzschild-radius reaches the frozen target name radius', async () => {
    const agree = await text([
      'map', '--equation-only', '--equation',
      'schwarzschild_radius = 2*G*mass/c^2',
    ]);
    expect(agree).toMatch(/✓ agrees with CE-schwarzschild-radius/);
    const half = await text(
      ['map', '--equation-only', '--equation', 'schwarzschild_radius = G*mass/c^2'],
      3,
    );
    expect(half).toMatch(/differs from CE-schwarzschild-radius .* by a constant factor: yours\/canonical = 0\.500000/);
  });

  it('a Bohr-radius formula that writes e agrees with the canonical charge', async () => {
    const t = await text([
      'map', '--equation-only', '--equation',
      'bohr_radius = 4*pi*epsilon_0*hbar^2/(m_e*e^2)',
    ]);
    expect(t).toMatch(/agrees with CE-bohr-radius/);
    expect(t).not.toMatch(/Euler/);
    const flagged = await text(['map', '--allow-euler'], 2);
    expect(flagged).toMatch(/unknown flag/);
  });
});

describe('upt eval — bare e', () => {
  it('e^2 is the elementary charge squared, and --allow-euler is not a flag', async () => {
    const t = await text(['eval', 'e^2']);
    expect(t).not.toMatch(/Euler/);
    expect(Number(t.trim())).toBeCloseTo(E_SI ** 2, 30);
    expect(await text(['eval', '--allow-euler', 'e'], 2)).toMatch(/unknown flag/);
  });

  it('a longer name that contains e is not treated as Euler', async () => {
    const t = await text(['eval', 'one_minus_e_sq', 'one_minus_e_sq=1']);
    expect(t).not.toMatch(/Euler/);
    expect(t.trim()).toBe('1');
  });

  it('sqrt(-1) names a complex number instead of "got object"', async () => {
    const cap = capture();
    expect(await runCli(['eval', 'sqrt(-1)'], cap.io)).toBe(2);
    expect(cap.lines.join('')).toMatch(/complex number/);
  });
});

describe('upt evaluate — weak-field cut on be-51 and be-52', () => {
  it('solar-limb deflection and Mercury do not warn; a ray inside 10 r_s does, and the number stays the formula', async () => {
    const limb = await text(['evaluate', 'be-51', 'M_kg=1Msun', 'b_m=6.957e8']);
    expect(limb).not.toMatch(/WARNING: weak-field/);
    expect(limb).toMatch(/alpha_arcsec = 1\.7517/);

    const inside = await text(['evaluate', 'be-51', `M_kg=${M_SUN_SI}`, 'b_m=1000']);
    expect(inside).toMatch(/WARNING: weak-field/);
    expect(inside).toMatch(/b\/r_s/);
    const alpha = Number(inside.match(/alpha_rad = ([0-9.eE+-]+)/)?.[1]);
    expect(alpha).toBeCloseTo((4 * G_SI * M_SUN_SI) / (1000 * C_SI * C_SI), 12);

    const atCut = await text(['evaluate', 'be-51', `M_kg=${M_SUN_SI}`, `b_m=${10 * rsSun}`]);
    expect(atCut).toMatch(/WARNING: weak-field/);
    const outside = await text(['evaluate', 'be-51', `M_kg=${M_SUN_SI}`, `b_m=${11 * rsSun}`]);
    expect(outside).not.toMatch(/WARNING: weak-field/);

    const mercury = await text([
      'evaluate', 'be-52', 'M_kg=1Msun', 'a_m=0.387098au', 'e=0.205630', 'T_yr=87.9691d',
    ]);
    expect(mercury).not.toMatch(/WARNING: weak-field/);
    expect(mercury).toMatch(/dphi_arcsec_per_century = 42\.99/);

    const close = await text([
      'evaluate', 'be-52', `M_kg=${M_SUN_SI}`, 'a_m=1000', 'e=0', 'T_yr=1',
    ]);
    expect(close).toMatch(/WARNING: weak-field/);
    expect(close).toMatch(/a\(1−e\)\/r_s/);
  });

  it('--json carries domainNote only when the cut fires, and still exits 0', async () => {
    const cap = capture();
    expect(await runCli(['evaluate', 'be-51', `M_kg=${M_SUN_SI}`, 'b_m=1000', '--json'], cap.io)).toBe(0);
    const warned = JSON.parse(cap.lines.join(''));
    expect(warned.result.domainNote).toMatch(/weak-field/);
    expect(warned.result.output.alpha_rad).toBeCloseTo((4 * G_SI * M_SUN_SI) / (1000 * C_SI * C_SI), 12);

    const quiet = capture();
    expect(await runCli(['evaluate', 'be-51', 'M_kg=1Msun', 'b_m=6.957e8', '--json'], quiet.io)).toBe(0);
    const limb = JSON.parse(quiet.lines.join(''));
    expect(limb.result.domainNote).toBeUndefined();
  });
});
