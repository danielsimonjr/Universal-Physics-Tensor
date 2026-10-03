/**
 * BE-66 radiation pressure. The absorber and reflector are endpoints of
 * P_n = (I/c)(1+R) cos²θ. A single-cosine factor is not that pressure.
 * @module tests/bridges/be-66-radiation-pressure
 */
import { describe, expect, it } from 'vitest';
import { evaluateRadiationPressure } from '../../src/bridges/be66-radiation-pressure.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { C_SI } from '../../src/core/constants.js';
import { be66Edge } from '../../src/composition/edges/applied-physicist.js';
import { regimesDiffer } from '../../src/composition/quantity.js';

const I = 1e6;

describe('BE-66 radiation pressure', () => {
  it('R = 0, θ = 0 is I/c and R = 1, θ = 0 is 2I/c', () => {
    const absorber = evaluateRadiationPressure({ I_W_per_m2: I, R: 0, theta_rad: 0 });
    const reflector = evaluateRadiationPressure({ I_W_per_m2: I, R: 1, theta_rad: 0 });
    expect(absorber.P_Pa).toBeCloseTo(I / C_SI, 12);
    expect(reflector.P_Pa).toBeCloseTo((2 * I) / C_SI, 12);
    expect(absorber.P_Pa).toBeCloseTo(0.0033356409519815205, 12);
    expect(reflector.P_Pa).not.toBeCloseTo(absorber.P_Pa, 8);
  });

  it('a single cosine is not the normal pressure when cos θ is neither 0 nor 1', () => {
    const theta = Math.PI / 3;
    const general = evaluateRadiationPressure({ I_W_per_m2: I, R: 1, theta_rad: theta });
    const singleCosine = (I / C_SI) * (1 + 1) * Math.cos(theta);
    expect(Math.cos(theta)).not.toBeCloseTo(0, 6);
    expect(Math.cos(theta)).not.toBeCloseTo(1, 6);
    expect(general.P_Pa).toBeCloseTo((I / C_SI) * 2 * Math.cos(theta) ** 2, 12);
    expect(general.P_Pa).not.toBeCloseTo(singleCosine, 6);
  });

  it('rejects a negative intensity, a reflectance outside [0, 1], and a non-finite angle', () => {
    expect(() => evaluateRadiationPressure({ I_W_per_m2: -1, R: 0, theta_rad: 0 })).toThrow(/I_W_per_m2/);
    expect(() => evaluateRadiationPressure({ I_W_per_m2: I, R: 1.1, theta_rad: 0 })).toThrow(/R/);
    expect(() => evaluateRadiationPressure({ I_W_per_m2: I, R: 0, theta_rad: Number.NaN })).toThrow(/theta_rad/);
  });

  it('catalog row is established, the edge is a law, and confidence stays established', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 66)!;
    expect(entry.status).toBe('established');
    expect(entry.category).toBe('D');
    expect(entry.bridges).toEqual(['optics', 'continuum']);
    expect(entry.dimensional_signature).toBe('[L^-1 M T^-2]');
    expect(entry.counterexamples ?? []).toEqual([]);
    expect(catalogFormalRef(66)?.statement).toBe('PhysJS.RadiationPressure.pressure_eq');
    expect(catalogFormalRef(66)?.kind).toBe('bridge');
    expect(be66Edge.kind).toBe('law');
    expect(be66Edge.confidence).toBe('established');
    expect(be66Edge.symbolic).toBeDefined();
    expect(regimesDiffer(be66Edge.sources[0].attributes, be66Edge.target.attributes)).toBe(false);
    expect(
      regimesDiffer(be66Edge.sources[0].attributes, { scale: 'classical', force: 'gravitational' }),
    ).toBe(true);
  });
});
