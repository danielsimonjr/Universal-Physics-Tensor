/** Textbook catalog additions execute the expressions advertised in their registry records. */
import { describe, expect, it } from 'vitest';
import { C_SI, G_SI, H_SI, HBAR_SI, K_B_SI } from '../../src/core/constants.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';
import { explainQuantity } from '../../src/composition/explain.js';

function evaluate(id: string, inputs: Record<string, number>): number {
  return evaluateEdge(CANONICAL_GRAPH.find((edge) => edge.id === id)!, inputs);
}

describe('textbook coverage', () => {
  it('evaluates Doppler, imaging, induction, projectile and slit relations', () => {
    expect(evaluate('CE-acoustic-doppler', {
      'source-frequency': 440, 'sound-speed': 343, 'source-approach-speed': 20,
    })).toBeCloseTo(440 * 343 / 323, 10);
    expect(evaluate('CE-thin-lens-mirror', { 'object-distance': 0.5, 'image-distance': 0.5 })).toBe(0.25);
    expect(evaluate('CE-faraday-induction', { 'flux-linkage-change': 0.1, 'time-interval': 0.02 })).toBe(-5);
    expect(evaluate('CE-level-projectile-range', { 'launch-speed': 10, 'launch-angle': Math.PI / 4, gravity: 9.81 })).toBeCloseTo(100 / 9.81, 12);
    expect(evaluate('CE-double-slit-interference', {
      'optical-wavelength': 5e-7, 'screen-distance': 2, 'slit-separation': 0.001,
    })).toBeCloseTo(1e-3, 14);
    expect(evaluate('CE-single-slit-diffraction', { 'optical-wavelength': 5e-7, 'slit-width': 1e-6 })).toBe(0.5);
  });

  it('keeps the Planck spectrum finite and accurate in the low-frequency limit', () => {
    const frequency = 1e-4;
    const temperature = 300;
    const expected = 8 * Math.PI * H_SI * frequency ** 3 /
      (C_SI ** 3 * Math.expm1(H_SI * frequency / (K_B_SI * temperature)));
    expect(evaluate('CE-planck-blackbody-spectrum', { frequency, temperature }) / expected).toBeCloseTo(1, 12);
  });

  it('keeps a representable Planck tail when exp(−x) alone underflows', () => {
    const temperature = 1e8;
    const x = 750;
    const frequency = x * K_B_SI * temperature / H_SI;
    const expected = Math.exp(Math.log(8 * Math.PI * H_SI * (frequency / C_SI) ** 3) - x);
    expect(evaluate('CE-planck-blackbody-spectrum', { frequency, temperature }) / expected).toBeCloseTo(1, 3);
  });

  it('computes the low-energy coupling and the two theoretical bound values', () => {
    expect(evaluate('CE-fine-structure-constant', {})).toBeCloseTo(0.00729735256, 11);
    const E = 1e-19;
    expect(evaluate('CE-bekenstein-bound', { 'system-energy': E, 'enclosing-radius': 1e-8 }) /
      (2 * Math.PI * K_B_SI * 1e-8 * E / (HBAR_SI * C_SI))).toBeCloseTo(1, 12);
    expect(evaluate('CE-margolus-levitin-bound', { 'mean-energy-above-ground': E }) /
      (Math.PI * HBAR_SI / (2 * E))).toBeCloseTo(1, 12);
  });

  it('recovers Schwarzschild entropy through a horizon-area edge', () => {
    const mass = 1.989e30;
    const expected = 4 * Math.PI * K_B_SI * G_SI * mass ** 2 / (HBAR_SI * C_SI);
    expect(explainQuantity(CANONICAL_GRAPH, 'bh-entropy', { mass }).recoveredValue! / expected).toBeCloseTo(1, 12);
  });

  it('recovers the Unruh temperature from a proper acceleration', () => {
    const a = 1e20;
    expect(evaluate('CE-unruh-temperature', { 'proper-acceleration': a }) /
      (HBAR_SI * a / (2 * Math.PI * C_SI * K_B_SI))).toBeCloseTo(1, 12);
  });

  it('uses the relativistic pressure-gradient terms and refuses a point inside the horizon', () => {
    const M = 1.4 * 1.989e30;
    const r = 1e4;
    const P = 4e32;
    const density = 4e17;
    const input = { 'enclosed-mass': M, 'areal-radius': r, 'fluid-pressure': P, 'mass-energy-density': density };
    const expected = -G_SI * (density + P / C_SI ** 2) * (M + 4 * Math.PI * r ** 3 * P / C_SI ** 2) /
      (r ** 2 * (1 - 2 * G_SI * M / (r * C_SI ** 2)));
    expect(evaluate('CE-tolman-oppenheimer-volkoff', input) / expected).toBeCloseTo(1, 12);
    expect(() => evaluate('CE-tolman-oppenheimer-volkoff', { ...input, 'areal-radius': 1e3 })).toThrow();
  });
});
