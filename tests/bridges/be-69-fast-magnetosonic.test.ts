/**
 * BE-69 perpendicular fast magnetosonic speed.
 * `c_s = 0` recovers the Alfvén number and is not that speed added to itself.
 * @module tests/bridges/be-69-fast-magnetosonic
 */
import { describe, expect, it } from 'vitest';
import { evaluateFastMagnetosonic } from '../../src/bridges/be69-fast-magnetosonic.js';
import { evaluateAlfvenSpeed } from '../../src/bridges/be67-alfven-speed.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { be69Edge } from '../../src/composition/edges/applied-physicist.js';

describe('BE-69 fast magnetosonic speed', () => {
  it('adds the squared speeds under the square root', () => {
    const cs = 1e5;
    const B = 1e-4;
    const rho = 1e-6;
    const row = evaluateFastMagnetosonic({ cs_m_per_s: cs, B_T: B, rho_kg_per_m3: rho });
    const alfven = evaluateAlfvenSpeed({ B_T: B, rho_kg_per_m3: rho }).v_m_per_s;
    expect(row.v_m_per_s).toBeCloseTo(Math.sqrt(cs * cs + alfven * alfven), 8);
    expect(row.v_m_per_s).not.toBeCloseTo(cs + alfven, 0);
    expect(evaluateFastMagnetosonic({ cs_m_per_s: 0, B_T: B, rho_kg_per_m3: rho }).v_m_per_s).toBeCloseTo(alfven, 8);
  });

  it('rejects a negative sound speed and a non-positive density', () => {
    expect(() => evaluateFastMagnetosonic({ cs_m_per_s: -1, B_T: 1, rho_kg_per_m3: 1 })).toThrow(/cs_m_per_s/);
    expect(() => evaluateFastMagnetosonic({ cs_m_per_s: 1, B_T: 1, rho_kg_per_m3: 0 })).toThrow(/rho_kg_per_m3/);
  });

  it('the formalRef is speed_eq, and the target is not the Alfvén speed', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 69)!;
    expect(entry.bridges).toEqual(['fluid', 'plasma']);
    expect(catalogFormalRef(69)?.statement).toBe('PhysJS.FastMagnetosonic.speed_eq');
    expect(catalogFormalRef(69)?.kind).toBe('bridge');
    expect(be69Edge.target.name).toBe('fast-magnetosonic-speed');
    expect(be69Edge.target.name).not.toBe('alfven-speed');
  });
});
