/**
 * `upt map --equation` and `upt derive --formula` report how a user formula compares with the
 * canonical equation it restates (persona finding L2, 2026-09-25). In-process against the built
 * CLI (dist/cli/main.js). The comparison itself is pinned in
 * tests/composition/canonical-compare.test.ts; this file pins what the user sees.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

/** Runs the CLI and checks the exit code: 3 when the formula's check fails (0.47.0), else 0. */
async function text(args: string[], expected = 0): Promise<string> {
  const cap = capture();
  const code = await runCli(args, cap.io);
  expect(code).toBe(expected);
  return cap.lines.join('');
}

describe('upt map --equation — the canonical comparison', () => {
  it('a Hawking temperature with 4π for 8π differs from CE-hawking-temperature by the factor 2', async () => {
    const t = await text(['map', '--equation', 'hawking_temperature = hbar*c^3/(4*pi*G*mass*k_B)'], 3);
    expect(t).toMatch(
      /⚠ differs from CE-hawking-temperature \(Hawking temperature\) by a constant factor: yours\/canonical = 2\.00000 at 3 fixed points/,
    );
  });

  it('the exact Hawking temperature agrees, prefactor included', async () => {
    const t = await text(['map', '--equation', 'hawking_temperature = hbar*c^3/(8*pi*G*mass*k_B)']);
    expect(t).toMatch(/✓ agrees with CE-hawking-temperature \(Hawking temperature\), prefactor included/);
  });

  it('the persona example T = π√(ℓ/g) differs from CE-pendulum-period by the factor 0.5', async () => {
    const t = await text(['map', '--equation', 'period = pi*sqrt(length/gravity)'], 3);
    expect(t).toMatch(
      /⚠ differs from CE-pendulum-period \(Pendulum period\) by a constant factor: yours\/canonical = 0\.500000 at 3 fixed points/,
    );
  });

  it('--json carries the comparisons', async () => {
    const cap = capture();
    await runCli(['map', '--equation', 'hawking_temperature = hbar*c^3/(4*pi*G*mass*k_B)', '--json'], cap.io);
    const parsed = JSON.parse(cap.lines.join(''));
    const cmp = JSON.stringify(parsed);
    expect(cmp).toMatch(/"canonicalComparisons":\[\{"id":"CE-hawking-temperature","name":"Hawking temperature","kind":"factor","ratio":2/);
  });
});

describe('upt derive --formula — the canonical comparison', () => {
  it('derive reports the same comparison for a pendulum formula', async () => {
    const t = await text([
      'derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', 'pi*sqrt(length/gravity)',
    ], 3);
    expect(t).toMatch(/formula MATCHES the dimensional form — recovered prefactor ≈ 3\.1416e\+0/);
    expect(t).toMatch(/⚠ differs from CE-pendulum-period \(Pendulum period\) by a constant factor: yours\/canonical = 0\.500000/);
  });
});

describe('upt derive / map — the prefactor is never silently unchecked', () => {
  it('with no matching canonical entry, derive says dimensions cannot check the prefactor', async () => {
    const t = await text(['derive', 'energy:energy', 'mass:mass', 'velocity:velocity', '--formula', 'mass*velocity^2']);
    expect(t).toMatch(/· no canonical equation has this target and these variables, so the prefactor is NOT checked/);
  });

  it('derive compares even when the monomial is not unique (constants passed as variables)', async () => {
    const t = await text([
      'derive', 'hawking_temperature:temperature', 'mass:mass', 'hbar:hbar', 'c:c', 'G:G', 'k_B:k_B',
      '--formula', 'hbar*c^3/(4*pi*G*mass*k_B)',
    ], 3);
    expect(t).toMatch(/⚠ differs from CE-hawking-temperature \(Hawking temperature\) by a constant factor: yours\/canonical = 2\.00000/);
  });

  it('map --equation with a catalog target and no canonical match says the same', async () => {
    // This used `mass*velocity^2`, the N1 defect itself: velocity now pairs with CE-kinetic-energy's
    // speed by dimension (see the N1 block below). Three variables match no kinetic-energy entry.
    const t = await text(['map', '--equation', 'kinetic_energy = mass*acceleration*displacement']);
    expect(t).toMatch(/· no canonical equation has this target and these variables, so the prefactor is NOT checked/);
  });
});

describe('upt derive — a variable is a constant only when its name AND dimension match', () => {
  it('c:length is a length called c, not the speed of light', async () => {
    const cap = capture();
    await runCli(
      ['derive', 'period:time', 'length:length', 'gravity:acceleration', 'c:length', '--formula', 'pi*sqrt(c/gravity)', '--json'],
      cap.io,
    );
    const result = JSON.parse(cap.lines.join('')).result;
    // As a length, c is a third variable, and no canonical entry has {length, gravity, c}.
    // Taken by name alone for the speed of light, c would drop out, the variables would match
    // CE-pendulum-period, and the formula would be evaluated with c = 299792458 m/s.
    expect(result.canonicalComparisons).toEqual([]);
  });
});

// 0.47.1 persona finding L4: Wien's latex uses T, but typing T was an unknown
// dimensionless placeholder while `temperature` matched CE-wien.
describe('L4: latex T resolves to temperature for Wien', () => {
  it('map: peak-wavelength = b/T agrees with CE-wien', async () => {
    const t = await text(['map', '--equation', 'peak-wavelength = b/T']);
    expect(t).toMatch(/✓ agrees with CE-wien/);
    expect(t).not.toMatch(/UNKNOWN/);
  });

  it('map: peak-wavelength = 2*b/T differs by the factor 2', async () => {
    const t = await text(['map', '--equation', 'peak-wavelength = 2*b/T'], 3);
    expect(t).toMatch(/⚠ differs from CE-wien .* yours\/canonical = 2\.00000/);
  });
});

// 0.47.1 persona finding W2: catalog kebabs on the RHS were parsed as subtraction
// (`planck-length` → planck − length → "Cannot subtract…").
describe('W2: catalog kebabs on the RHS are identifiers', () => {
  it('map: length = 2*planck-length is dimensionally consistent (exit 0)', async () => {
    const t = await text(['map', '--equation', 'length = 2*planck-length']);
    expect(t).toMatch(/✓ dimensionally consistent: \[length\]/);
    expect(t).not.toMatch(/Cannot subtract/);
  });

  it('map: rest-energy = mass*speed-of-light^2 agrees with CE-mass-energy', async () => {
    const t = await text(['map', '--equation', 'rest-energy = mass*speed-of-light^2']);
    expect(t).toMatch(/✓ agrees with CE-mass-energy/);
    expect(t).not.toMatch(/Cannot subtract/);
  });
});

// 0.47.1 persona finding W1: writing the catalog name `speed_of_light` for CE-mass-energy's
// constant `c` skipped the prefactor check (exit 0) while `2*mass*c^2` was caught (exit 3).
describe('W1: speed-of-light must not disable the E=mc² prefactor check', () => {
  it('map: E = 2 m speed_of_light² differs by the factor 2 and exits 3', async () => {
    const t = await text(['map', '--equation', 'rest_energy = 2*mass*speed_of_light^2'], 3);
    expect(t).toMatch(
      /⚠ differs from CE-mass-energy \(Mass–energy equivalence; your speed-of-light as its c, paired by dimension\) by a constant factor: yours\/canonical = 2\.00000/,
    );
  });

  it('map: E = m speed_of_light² agrees', async () => {
    const t = await text(['map', '--equation', 'rest_energy = mass*speed_of_light^2']);
    expect(t).toMatch(
      /✓ agrees with CE-mass-energy \(Mass–energy equivalence; your speed-of-light as its c, paired by dimension\)/,
    );
  });

  it('derive: speed_of_light:velocity is paired the same way', async () => {
    const t = await text(
      ['derive', 'rest-energy:energy', 'mass:mass', 'speed_of_light:velocity', '--formula', '2*mass*speed_of_light^2'],
      3,
    );
    expect(t).toMatch(/differs from CE-mass-energy \(Mass–energy equivalence; your speed-of-light as its c, paired by dimension\)/);
  });
});

// 0.47.0 persona finding N1: CE-kinetic-energy names its variable `speed`, and `velocity` (the
// name CE-lorentz-factor uses) switched the check off with "prefactor NOT checked" and exit 0.
describe('N1: a velocity/speed synonym no longer switches the prefactor check off', () => {
  it('map: K = m·velocity² differs from CE-kinetic-energy by the factor 2, and the pairing is named', async () => {
    const t = await text(['map', '--equation', 'kinetic_energy = mass*velocity^2'], 3);
    expect(t).toMatch(
      /⚠ differs from CE-kinetic-energy \(Kinetic energy; your velocity as its speed, paired by dimension\) by a constant factor: yours\/canonical = 2\.00000/,
    );
  });

  it('map: the true law with velocity agrees', async () => {
    const t = await text(['map', '--equation', 'kinetic_energy = 0.5*mass*velocity^2']);
    expect(t).toMatch(/✓ agrees with CE-kinetic-energy \(Kinetic energy; your velocity as its speed, paired by dimension\)/);
  });

  it('derive: velocity:velocity is paired the same way', async () => {
    const t = await text(['derive', 'kinetic-energy:energy', 'mass:mass', 'velocity:velocity', '--formula', 'mass*velocity^2'], 3);
    expect(t).toMatch(/differs from CE-kinetic-energy \(Kinetic energy; your velocity as its speed, paired by dimension\)/);
  });

  it('map: an unresolved name stays unresolved, and the prefactor is NOT checked', async () => {
    const t = await text(['map', '--equation', 'kinetic_energy = mass*vel^2']);
    expect(t).toMatch(/no canonical equation has this target and these variables, so the prefactor is NOT checked/);
  });
});

// 0.47.0 persona finding N3: an unknown name is checked as a dimensionless placeholder, so its
// "mismatch" is not a real check and exits 0 (F2). The line said "⚠ dimensional MISMATCH" anyway,
// which reads as a failed check with a success exit. It now says UNKNOWN and names the placeholder.
describe('N3: a mismatch caused by an unresolved placeholder is reported as UNKNOWN', () => {
  it('map: `lenght` is named as the placeholder, the line says UNKNOWN, and the exit stays 0', async () => {
    const t = await text(['map', '--equation', 'period = 2*pi*sqrt(lenght/gravity)']);
    expect(t).toMatch(
      /· UNKNOWN: RHS is \[L\^-0\.5 T\] but the target is \[time\]; the mismatch involves the unresolved placeholder 'lenght' \(taken as dimensionless\), so it is not a failed check/,
    );
    expect(t).not.toMatch(/dimensional MISMATCH/);
  });

  it('control: with every name resolved, a mismatch is still a MISMATCH and exits 3', async () => {
    const t = await text(['map', '--equation', 'period = 2*pi*sqrt(gravity/length)'], 3);
    expect(t).toMatch(/⚠ dimensional MISMATCH: RHS is \[frequency\] but the target is \[time\]/);
  });
});

// 0.47.0 persona finding N4: the verdict on the user's equation came after the whole linkage map
// (about 45 lines), so the answer the user asked for was the last thing printed.
describe('N4: map --equation prints the verdict before any linkage map', () => {
  it('the default stops at the verdict; --verbose puts the linkage map after it', async () => {
    const t = await text(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)']);
    expect(t.indexOf('Your equation:')).toBeGreaterThanOrEqual(0);
    expect(t).toMatch(/✓ agrees with CE-pendulum-period/);
    expect(t).not.toMatch(/Linkage map/);
    const verbose = await text(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)', '--verbose']);
    const verdict = verbose.indexOf('Your equation:');
    const map = verbose.indexOf('Linkage map');
    expect(map).toBeGreaterThan(verdict);
    expect(verbose.slice(verdict, map)).toMatch(/✓ agrees with CE-pendulum-period/);
  });
});

// Persona finding W7 (0.47.1 post-fix retest): the comparison evaluated the RHS with `evalExpr`,
// which has no `transcendental` arm, so `ln(2)` was "not compared" while `ln2` agreed; and the
// catalog's BE-16 target `landauer-erasure-energy` never met CE-landauer, whose target is
// `erasure-energy`, though CE-landauer records that it restates BE-16.
describe('W7: map --equation compares through the formula parser and the restated bridge', () => {
  it('erasure_energy = k_B*temperature*ln(2) agrees with CE-landauer', async () => {
    const t = await text(['map', '--equation', 'erasure_energy = k_B*temperature*ln(2)']);
    expect(t).toMatch(/✓ agrees with CE-landauer/);
  });

  it('the catalog target landauer-erasure-energy reaches CE-landauer through BE-16, and says so', async () => {
    for (const rhs of ['k_B*temperature*ln(2)', 'k_B*temperature*ln2']) {
      const t = await text(['map', '--equation', `landauer-erasure-energy = ${rhs}`]);
      expect(t).toMatch(/✓ agrees with CE-landauer \(.*your target as its erasure-energy, the target of be-16, which it restates/);
    }
  });

  it('control: log10(2) for ln(2) differs by the constant factor log10(2)/ln(2) = 0.434294', async () => {
    const t = await text(['map', '--equation', 'landauer-erasure-energy = k_B*temperature*log10(2)'], 3);
    expect(t).toMatch(/⚠ differs from CE-landauer .* by a constant factor: yours\/canonical = 0\.434294/);
    expect(Math.log10(2) / Math.LN2).toBeCloseTo(0.434294, 6);
  });

  it('control: a target that merely shares a dimension is not matched through a restated bridge', async () => {
    const t = await text(['map', '--equation', 'rest-energy = k_B*temperature*ln(2)']);
    const verdict = t.slice(t.indexOf('Your equation:'), t.indexOf('● your equation joins'));
    expect(verdict).toMatch(/no canonical equation has this target and these variables/);
    expect(verdict).not.toMatch(/CE-landauer/);
  });
});

// Persona retest on 0.47.1 after the fix batch: W4, W5, W6, L5, L6, L7 and L8 as the user sees them.
describe('persona retest: what map --equation prints', () => {
  it('W4: Kepler III and the Schwarzschild radius agree, and a halved prefactor exits 3 with the factor 0.5', async () => {
    expect(await text(['map', '--equation', 'period = 2*pi*sqrt(semi_major_axis^3/(G*mass))'])).toMatch(/✓ agrees with CE-kepler-third/);
    expect(await text(['map', '--equation', 'radius = 2*G*mass/c^2'])).toMatch(/✓ agrees with CE-schwarzschild-radius/);
    expect(await text(['map', '--equation', 'period = pi*sqrt(semi_major_axis^3/(G*mass))'], 3)).toMatch(
      /⚠ differs from CE-kepler-third .* by a constant factor: yours\/canonical = 0\.500000 at 3 fixed points/,
    );
  });

  it('W5: the Planck length is compared at the SI constants, and says the form is not tested', async () => {
    const t = await text(['map', '--equation', 'planck_length = sqrt(hbar*G/c^3)']);
    expect(t).toMatch(/✓ agrees with CE-planck-length \(Planck length\), prefactor included: yours\/canonical = 1 at the SI constant values \(no free variable, so only the value is compared, not the form\)/);
    expect(await text(['map', '--equation', 'planck_length = sqrt(2*hbar*G/c^3)'], 3)).toMatch(/yours\/canonical = 1\.41421 at the SI constant values/);
  });

  it('W5 control: an all-constant right-hand side whose target is no catalog quantity is still refused', async () => {
    const cap = capture();
    expect(await runCli(['map', '--equation', 'not_a_quantity = sqrt(hbar*G/c^3)'], cap.io)).toBe(2);
    expect(cap.lines.join('')).toMatch(/no source quantities/);
  });

  it('W6: the one-letter a is disclosed as the catalog a, with its dimension and who uses it', async () => {
    const t = await text(['map', '--equation', 'unruh_temperature = hbar*a/(2*pi*k_B*c)']);
    expect(t).toMatch(/· 'a' matches the catalog quantity a \[length\] \(used by CE-perihelion-precession[^)]*\), a one-letter name, and is not bound\. Pass --bind-short to bind it/);
    const bound = await text(['map', '--equation', 'unruh_temperature = hbar*a/(2*pi*k_B*c)', '--bind-short']);
    expect(bound).toMatch(/· 'a' is bound to the catalog quantity a \[length\], a one-letter name \(used by CE-perihelion-precession[^)]*\); if you meant another quantity, write its full name/);
  });

  it('W6 control: the full name acceleration is not disclosed as a one-letter binding', async () => {
    const t = await text(['map', '--equation', 'unruh_temperature = hbar*acceleration/(2*pi*k_B*c)']);
    expect(t).not.toMatch(/a one-letter name/);
  });

  it('L5: sigma suggests the registered constant sigma_sb by its inferred dimension', async () => {
    const t = await text(['map', '--equation', 'radiative_flux = sigma*temperature^4']);
    expect(t).toMatch(/'sigma' has the inferred dimension of the registered constant sigma_sb; write that name to use its SI value/);
    expect(await text(['map', '--equation', 'radiative_flux = sigma_sb*temperature^4'])).toMatch(/✓ agrees with CE-stefan-boltzmann/);
  });

  it('L6: P = N k_B T / V, the answer key\'s own form, agrees with CE-ideal-gas', async () => {
    expect(await text(['map', '--equation', 'pressure = N*k_B*temperature/V'])).toMatch(/✓ agrees with CE-ideal-gas/);
  });

  it('L7: --equation prints the verdict only; --verbose and the old flag restore the map', async () => {
    const only = await text(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)', '--equation-only']);
    expect(only).toMatch(/✓ agrees with CE-pendulum-period/);
    expect(only).not.toMatch(/Linkage map/);
    const verdict = await text(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)']);
    expect(verdict).toMatch(/✓ agrees with CE-pendulum-period/);
    expect(verdict).not.toMatch(/Linkage map/);
    expect(await text(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)', '--verbose'])).toMatch(/Linkage map/);
  });

  it('L7: --equation-only needs --equation, and its JSON drops the linkage map', async () => {
    const cap = capture();
    expect(await runCli(['map', '--equation-only'], cap.io)).toBe(2);
    expect(cap.lines.join('')).toMatch(/--equation-only needs --equation/);
    const j = capture();
    await runCli(['map', '--equation', 'period = 2*pi*sqrt(length/gravity)', '--equation-only', '--json'], j.io);
    const parsed = JSON.parse(j.lines.join(''));
    expect(parsed.result.linkage).toBeUndefined();
    expect(parsed.result.userEquation.shortBindings).toEqual([]);
  });

  it('L8: probe scan lists searchable expression gaps from applied cases', async () => {
    const t = await text(['probe', 'scan']);
    expect(t).toMatch(/fg-expr-case-brownian-sphere/);
    expect(t).toMatch(/prediction-residual \/ searchable/);
    expect(t).not.toMatch(/0 of \d+ gaps are searchable by Product B/);
  });
});