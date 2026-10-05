/**
 * BE-131 filename pin. The catalog-integrity check requires
 * `be-131-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-131', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 131);
    expect(entry?.name).toBe('Joukowsky pressure');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(131)?.kind).toBe('bridge');
    expect(catalogFormalRef(131)?.statement).toBe('PhysJS.Joukowsky.joukowsky_eq');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
