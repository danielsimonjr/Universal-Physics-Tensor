/**
 * Derive and map share one known-relation report. A catalog edge is named
 * when the formula's target and sources are that edge, including when no
 * canonical equation has that target. A shared quantity is not that report.
 * A canonical mismatch stays exit 3.
 */
import { runText } from '../helpers/cli-run.js';
import { describe, expect, it } from 'vitest';

describe('one known-relation report for derive and map', () => {
  it('names be-66 for the radiation-pressure monomial, and the canonical prefactor stays unchecked', async () => {
    const r = await runText([
      'derive',
      'radiation-pressure:pressure',
      'poynting_flux:power/area',
      'c:velocity',
      '--formula',
      'poynting_flux/c',
    ]);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/recovered prefactor ≈ 1\.0000e\+0/);
    expect(r.text).toMatch(/no canonical equation has this target and these variables, so the prefactor is NOT checked/);
    expect(r.text).toMatch(/be-66 \(Radiation pressure/);
    expect(r.text).toMatch(/the target and the dimensionful sources are this catalog edge/);
  });

  it('does not name be-66 for a pressure monomial that is not that edge', async () => {
    const r = await runText([
      'derive',
      'pressure:pressure',
      'intensity:power/area',
      'c:velocity',
      '--formula',
      'intensity/c',
    ]);
    expect(r.code).toBe(0);
    expect(r.text).toMatch(/recovered prefactor ≈ 1\.0000e\+0/);
    expect(r.text).not.toMatch(/be-66/);
  });

  it('names be-66 on the map of the same quantities, and a canonical factor still exits 3', async () => {
    const mapped = await runText([
      'map',
      '--equation-only',
      '--equation',
      'radiation_pressure = poynting_flux/c',
    ]);
    expect(mapped.code).toBe(0);
    expect(mapped.text).toMatch(/be-66 \(Radiation pressure/);
    expect(mapped.text).toMatch(/the target and the dimensionful sources are this catalog edge/);

    const full = await runText([
      'map',
      '--equation-only',
      '--equation',
      'radiation_pressure = poynting_flux*(1+reflectance)*cos(incidence_angle)^2/c',
    ]);
    expect(full.code).toBe(0);
    expect(full.text).toMatch(/be-66 \(Radiation pressure/);
    expect(full.text).toMatch(/the target and the sources are this catalog edge/);

    const mismatch = await runText([
      'derive',
      'hawking_temperature:temperature',
      'mass:mass',
      'hbar:hbar',
      'c:c',
      'G:G',
      'k_B:k_B',
      '--formula',
      'hbar*c^3/(4*pi*G*mass*k_B)',
    ]);
    expect(mismatch.code).toBe(3);
    expect(mismatch.text).toMatch(/differs from CE-hawking-temperature/);
    expect(mismatch.text).toMatch(/be-42 \(Hawking temperature/);
  });
});
