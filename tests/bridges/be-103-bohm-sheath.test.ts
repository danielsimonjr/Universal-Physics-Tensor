/**
 * BE-103 filename pin. The catalog-integrity check requires
 * `be-103-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-103', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 103);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(103)?.kind).toBe('bridge');
    expect(catalogFormalRef(103)?.statement).toBe("PhysJS.BohmSheath.cold_bohm_threshold");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
