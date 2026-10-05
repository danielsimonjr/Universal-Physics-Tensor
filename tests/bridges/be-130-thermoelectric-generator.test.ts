/**
 * BE-130 filename pin. The catalog-integrity check requires
 * `be-130-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-130', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 130);
    expect(entry?.name).toBe('Thermoelectric generator efficiency');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(130)?.kind).toBe('bridge');
    expect(catalogFormalRef(130)?.statement).toBe('PhysJS.ThermoelectricGenerator.efficiency_eq');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
