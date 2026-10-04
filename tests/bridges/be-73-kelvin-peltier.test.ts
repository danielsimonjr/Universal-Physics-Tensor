/**
 * BE-73 Kelvin relation. Onsager reciprocity is not an input.
 * @module tests/bridges/be-73-kelvin-peltier
 */
import { describe, expect, it } from 'vitest';
import { evaluateKelvinPeltier } from '../../src/bridges/be73-kelvin-peltier.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-73 Kelvin relation', () => {
  it('is Π = S T', () => {
    expect(evaluateKelvinPeltier({ S_V_per_K: 2e-4, T_K: 300 }).Pi_V).toBeCloseTo(0.06, 12);
  });

  it('rejects a zero temperature, and Onsager is not a parameter', () => {
    expect(() => evaluateKelvinPeltier({ S_V_per_K: 1, T_K: 0 })).toThrow(/T_K/);
    expect(BRIDGE_EVALUATORS.get(73)?.inputKeys).toEqual(['S_V_per_K', 'T_K']);
  });

  it('the formalRef is peltier_eq', () => {
    const entry = BRIDGE_EQUATIONS.find((e) => e.id === 73)!;
    expect(entry.bridges).toEqual(['thermal', 'electrical']);
    expect(catalogFormalRef(73)?.statement).toBe('PhysJS.KelvinRelation.peltier_eq');
    expect(catalogFormalRef(73)?.kind).toBe('bridge');
  });
});