/**
 * BE-70 Einstein relation. Dropping the carrier charge is a different diffusivity.
 * @module tests/bridges/be-70-einstein-relation
 */
import { describe, expect, it } from 'vitest';
import { evaluateEinsteinRelation } from '../../src/bridges/be70-einstein-relation.js';
import { K_B_SI } from '../../src/core/constants.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

const Q = 1.602176634e-19;

describe('BE-70 Einstein relation', () => {
  it('is μ k_B T / q, and q = 1 is not that number', () => {
    const row = evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: Q });
    expect(row.D_m2_per_s).toBe((1e-8 * K_B_SI * 300) / Q);
    expect(evaluateEinsteinRelation({ mu_m2_per_Vs: 1e-8, T_K: 300, q_C: 1 }).D_m2_per_s).not.toBe(row.D_m2_per_s);
  });

  it('rejects a zero charge', () => {
    expect(() => evaluateEinsteinRelation({ mu_m2_per_Vs: 1, T_K: 300, q_C: 0 })).toThrow(/q_C/);
  });

  it('the formalRef is diffusion_eq', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 70)!;
    expect(entry.bridges).toEqual(['kinetic', 'electromagnetic']);
    expect(catalogFormalRef(70)?.statement).toBe('PhysJS.EinsteinRelation.diffusion_eq');
    expect(catalogFormalRef(70)?.kind).toBe('bridge');
  });
});
