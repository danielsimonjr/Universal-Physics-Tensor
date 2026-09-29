/**
 * Dogfood comparison behavior that lives outside the frozen canonical tree:
 * the sound-speed group, the Friedmann curvature extension, the eccentricity
 * spelling, the electron-mass overlay, and natural units.
 */
import { describe, expect, it } from 'vitest';
import { C_SI } from '../../src/core/constants.js';
import { compareWithCanonical } from '../../src/composition/canonical-compare.js';
import { analyzeUserEquation, parseUserEquation } from '../../src/composition/user-equation.js';
import { ENERGY, MASS } from '../../src/dimensional/types.js';

describe('sound speed binds gamma only when the user wrote it', () => {
  it('√(γ p/ρ) agrees, a bare √(p/ρ) leaves the prefactor unchecked, and γ¹ is a form difference', () => {
    const right = compareWithCanonical('speed', ['pressure', 'density', 'gamma'], (v) =>
      Math.sqrt((v.gamma! * v.pressure!) / v.density!),
    ).find((c) => c.id === 'CE-sound-speed');
    const bare = compareWithCanonical('speed', ['pressure', 'density'], (v) =>
      Math.sqrt(v.pressure! / v.density!),
    ).find((c) => c.id === 'CE-sound-speed');
    const wrong = compareWithCanonical('speed', ['pressure', 'density', 'gamma'], (v) =>
      v.gamma! * Math.sqrt(v.pressure! / v.density!),
    ).find((c) => c.id === 'CE-sound-speed');
    expect(right?.kind).toBe('agrees');
    expect(bare?.kind).toBe('prefactor-unchecked');
    expect(wrong?.kind).toBe('form');
  });
});

describe('Friedmann curvature extension', () => {
  it('the flat equation still agrees, and curvature_k with scale_factor is checked against −k c²/a²', () => {
    const flat = compareWithCanonical('hubble-rate-squared', ['rho', 'G'], (v) => (8 * Math.PI * v.G! * v.rho!) / 3).find(
      (c) => c.id === 'CE-friedmann',
    );
    const curved = compareWithCanonical(
      'hubble-rate-squared',
      ['rho', 'G', 'curvature-k', 'scale-factor'],
      (v) => (8 * Math.PI * v.G! * v.rho!) / 3 - (v['curvature-k']! * C_SI * C_SI) / v['scale-factor']! ** 2,
    ).find((c) => c.id === 'CE-friedmann');
    const missing = compareWithCanonical(
      'hubble-rate-squared',
      ['rho', 'G', 'curvature-k', 'scale-factor'],
      (v) => (8 * Math.PI * v.G! * v.rho!) / 3,
    ).find((c) => c.id === 'CE-friedmann');
    expect(flat?.kind).toBe('agrees');
    expect(flat?.detail).toBeUndefined();
    expect(curved?.kind).toBe('agrees');
    expect(curved?.detail).toMatch(/curvature_k/);
    expect(missing?.kind).not.toBe('agrees');
  });
});

describe('spellings that are not a bare e', () => {
  it('rewrites 1-eccentricity^2 to one_minus_e_sq', async () => {
    const eq = await parseUserEquation('delta_phi = 6*pi*G*M/(a*(1-eccentricity^2)*c^2)');
    expect(eq.text).toContain('one_minus_e_sq');
    expect(eq.sources).toContain('one_minus_e_sq');
    expect(eq.sources).not.toContain('eccentricity');
    expect(eq.sources).not.toContain('e');
  });
});

describe('formula-name overlay', () => {
  it('m_e and e_charge carry mass and charge, so a Rydberg monomial is an energy', async () => {
    const a = await analyzeUserEquation(
      'rydberg_energy = m_e*e_charge^4/(epsilon_0^2*hbar^2)',
      new Map([['rydberg-energy', ENERGY]]),
    );
    expect(a.parseError).toBeNull();
    expect(a.consistent).toBe(true);
    expect(a.rhsDimension).toEqual(ENERGY);
  });
});

describe('natural units', () => {
  it('rest energy = mass stays a mismatch in SI and agrees under --natural by c^2', async () => {
    const dims = new Map<string, typeof ENERGY>([
      ['rest-energy', ENERGY],
      ['mass', MASS],
    ]);
    const si = await analyzeUserEquation('rest_energy = mass', dims);
    const nat = await analyzeUserEquation('rest_energy = mass', dims, { units: 'natural' });
    expect(si.consistent).toBe(false);
    expect(si.naturalNote).toBeUndefined();
    expect(nat.consistent).toBe(true);
    expect(nat.naturalNote).toMatch(/c\^2/);
  });
});
