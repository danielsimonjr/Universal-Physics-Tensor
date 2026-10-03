/**
 * BE-67 Alfvén speed. The default density is the total mass density.
 * Proton-only is a named helper. A number density in the density slot
 * is not that special case. A Gaussian prefactor on SI inputs is not
 * the SI speed.
 * @module tests/bridges/be-67-alfven-speed
 */
import { describe, expect, it } from 'vitest';
import {
  alfvenProtonOnlyDensity,
  evaluateAlfvenSpeed,
  M_PROTON_SI,
} from '../../src/bridges/be67-alfven-speed.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';
import { be67Edge } from '../../src/composition/edges/applied-physicist.js';
import { regimesDiffer } from '../../src/composition/quantity.js';

const B = 12e-9;
const N = 14e6;

describe('BE-67 Alfvén speed', () => {
  it('uses the supplied mass density, and proton-only is the named special case', () => {
    const rho = alfvenProtonOnlyDensity(N);
    expect(rho).toBeCloseTo(N * M_PROTON_SI, 20);
    const special = evaluateAlfvenSpeed({ B_T: B, rho_kg_per_m3: rho });
    expect(special.v_m_per_s).toBeCloseTo(B / Math.sqrt(MU0_SI * rho), 8);
    expect(special.v_m_per_s).toBeCloseTo(69954.13706220593, 4);
  });

  it('a number density passed as ρ is not the proton-only speed', () => {
    const special = evaluateAlfvenSpeed({
      B_T: B,
      rho_kg_per_m3: alfvenProtonOnlyDensity(N),
    }).v_m_per_s;
    const asNumberDensity = evaluateAlfvenSpeed({ B_T: B, rho_kg_per_m3: N }).v_m_per_s;
    expect(asNumberDensity).not.toBeCloseTo(special, 0);
    expect(asNumberDensity).toBeLessThan(1);
  });

  it('SI inputs with a Gaussian 1/√(4π) prefactor are not the SI speed', () => {
    const rho = alfvenProtonOnlyDensity(N);
    const si = evaluateAlfvenSpeed({ B_T: B, rho_kg_per_m3: rho }).v_m_per_s;
    const mixed = B / Math.sqrt(4 * Math.PI * rho);
    expect(mixed).not.toBeCloseTo(si, 0);
    expect(mixed).toBeLessThan(si / 1000);
  });

  it('rejects a negative field and a non-positive density', () => {
    expect(() => evaluateAlfvenSpeed({ B_T: -1, rho_kg_per_m3: 1 })).toThrow(/B_T/);
    expect(() => evaluateAlfvenSpeed({ B_T: 1, rho_kg_per_m3: 0 })).toThrow(/rho_kg_per_m3/);
    expect(() => alfvenProtonOnlyDensity(-1)).toThrow(/n_per_m3/);
  });

  it('catalog row is established, the edge is a law, and confidence stays established', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 67)!;
    expect(entry.status).toBe('established');
    expect(entry.category).toBe('D');
    expect(entry.bridges).toEqual(['fluid', 'plasma']);
    expect(entry.dimensional_signature).toBe('[velocity]');
    expect(entry.counterexamples ?? []).toEqual([]);
    expect(catalogFormalRef(67)?.statement).toBe('PhysJS.AlfvenSpeed.speed_eq');
    expect(catalogFormalRef(67)?.kind).toBe('bridge');
    expect(be67Edge.kind).toBe('law');
    expect(be67Edge.confidence).toBe('established');
    expect(be67Edge.symbolic).toBeDefined();
    expect(regimesDiffer(be67Edge.sources[0].attributes, be67Edge.target.attributes)).toBe(false);
  });
});
