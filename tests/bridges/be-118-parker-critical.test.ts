/**
 * BE-118 filename pin. The catalog-integrity check requires
 * `be-118-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-118', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 118);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(118)?.kind).toBe('bridge');
    expect(catalogFormalRef(118)?.statement).toBe("PhysJS.ParkerCritical.critical_radius");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
