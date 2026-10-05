/**
 * BE-129 filename pin. The catalog-integrity check requires
 * `be-129-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-129', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 129);
    expect(entry?.name).toBe('Straight-fin efficiency');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(129)?.kind).toBe('bridge');
    expect(catalogFormalRef(129)?.statement).toBe('PhysJS.FinEfficiency.efficiency_eq');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
