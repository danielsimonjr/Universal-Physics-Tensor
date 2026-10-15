/**
 * The nine oscillator models of design note §3, and the dimension constants
 * the atlas families read. Those that `src/dimensional/types.ts` names are
 * that module's objects (one owner); the canonical entry files read the same
 * names (`tests/dimensional/named-shape-owner.test.ts` scans them).
 */
import { describe, it, expect } from 'vitest';
import { ATLAS_MODELS, getAtlasModel } from '../../src/atlas/oscillators/models.js';
import {
  CAPACITANCE,
  CUBIC_STIFFNESS,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from '../../src/atlas/oscillators/dimensions.js';
import * as diffusionDims from '../../src/atlas/diffusion/dimensions.js';
import { VISCOSITY } from '../../src/atlas/diffusion/models.js';
import { LINEAR_DENSITY, PRESSURE, WAVENUMBER } from '../../src/atlas/waves/models.js';
import { dim } from '../../src/dimensional/ast-builders.js';
import * as types from '../../src/dimensional/types.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';

describe('atlas dimension constants', () => {
  it('are the named shapes of dimensional/types.ts, the same objects, not copies', () => {
    expect(CAPACITANCE).toBe(types.CAPACITANCE);
    expect(INDUCTANCE).toBe(types.INDUCTANCE);
    expect(RESISTANCE).toBe(types.RESISTANCE);
    expect(SPRING_CONSTANT).toBe(types.SPRING_CONSTANT);
    expect(diffusionDims.DIFFUSIVITY).toBe(types.DIFFUSIVITY);
    expect(diffusionDims.THERMAL_CONDUCTIVITY).toBe(types.THERMAL_CONDUCTIVITY);
    expect(diffusionDims.SPECIFIC_HEAT).toBe(types.SPECIFIC_HEAT);
    expect(diffusionDims.DENSITY).toBe(types.MASS_DENSITY);
    expect(VISCOSITY).toBe(types.VISCOSITY);
    expect(LINEAR_DENSITY).toBe(types.LINEAR_DENSITY);
    expect(PRESSURE).toBe(types.PRESSURE);
    expect(WAVENUMBER).toBe(types.WAVENUMBER);
  });

  it('CONTROL: an equal copy built by exponents is not the named object, so the identity check can fail', () => {
    const copy = dim(-2, -1, 4, 2);
    expect(copy).toEqual(CAPACITANCE);
    expect(copy).not.toBe(CAPACITANCE);
  });

  it('derives DAMPING as M T^-1 and CUBIC_STIFFNESS as M L^-2 T^-2', () => {
    expect(DAMPING).toEqual(dim(0, 1, -1));
    expect(CUBIC_STIFFNESS).toEqual(dim(-2, 1, -2));
  });
});

describe('ATLAS_MODELS', () => {
  it('registers exactly the nine models of §3', () => {
    expect(ATLAS_MODELS.map((m) => m.id)).toEqual([
      'model-spring',
      'model-lc',
      'model-damped-spring',
      'model-rlc',
      'model-pendulum',
      'model-chain',
      'model-wave-1d',
      'model-cubic-spring',
      'model-first-order',
    ]);
  });

  it('gives every model the oscillators family and a non-empty dynamics', () => {
    for (const m of ATLAS_MODELS) {
      expect(m.family).toBe('oscillators');
      expect(m.dynamics.length).toBeGreaterThan(0);
      expect(m.regime.family).toBe('oscillators');
    }
  });

  it('resolves every canonicalRefs entry in CANONICAL_EQUATIONS', () => {
    const ids = new Set(CANONICAL_EQUATIONS.map((e) => e.id));
    const refs = ATLAS_MODELS.flatMap((m) => m.canonicalRefs);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids.has(ref)).toBe(true);
  });

  it('carries the §3 canonicalRefs for model-spring and model-lc', () => {
    expect(getAtlasModel('model-spring').canonicalRefs).toEqual([
      'CE-simple-harmonic-frequency',
      'CE-spring-potential-energy',
      'CE-oscillator-energy',
    ]);
    expect(getAtlasModel('model-lc').canonicalRefs).toEqual(['CE-lc-resonance', 'CE-capacitor-energy']);
    expect(getAtlasModel('model-wave-1d').canonicalRefs).toEqual(['CE-wave-speed']);
  });

  it('derives model-damped-spring regime groups from {m, b, k}', () => {
    const regime = getAtlasModel('model-damped-spring').regime;
    expect(Object.keys(regime.groupDefinitions)).toEqual(['m · b^-2 · k']);
    expect(regime.groupDefinitions['m · b^-2 · k'].exponents).toEqual({ m: 1, b: -2, k: 1 });
  });

  it('exposes theta0 and qa as groups on the models that declare them', () => {
    expect(getAtlasModel('model-pendulum').dimensionlessInputs).toEqual(['theta0']);
    expect(getAtlasModel('model-pendulum').regime.groupDefinitions['theta0']).toBeDefined();
    expect(getAtlasModel('model-chain').dimensionlessInputs).toEqual(['qa']);
    expect(getAtlasModel('model-chain').regime.groupDefinitions['qa']).toBeDefined();
  });

  it('gives every model unique parameter names', () => {
    for (const m of ATLAS_MODELS) {
      const names = [...m.parameters.map((p) => p.name), ...m.dimensionlessInputs];
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('throws on an unknown model id', () => {
    expect(() => getAtlasModel('model-nope')).toThrow();
  });
});
