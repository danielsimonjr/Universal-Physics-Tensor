/**
 * BE-132 filename pin. The catalog-integrity check requires
 * `be-132-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-132', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 132);
    expect(entry?.name).toBe('Coaxial capacitance per length');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(132)?.kind).toBe('bridge');
    expect(catalogFormalRef(132)?.statement).toBe('PhysJS.CoaxialCapacitance.capacitance_per_length');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
