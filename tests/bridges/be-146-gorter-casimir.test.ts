/**
 * BE-146 filename pin. The catalog-integrity check requires
 * `be-146-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-146', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 146);
    expect(entry?.name).toBe('Gorter–Casimir fraction');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(146)?.kind).toBe('bridge');
    expect(catalogFormalRef(146)?.statement).toBe('PhysJS.GorterCasimir.gorter_casimir');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
