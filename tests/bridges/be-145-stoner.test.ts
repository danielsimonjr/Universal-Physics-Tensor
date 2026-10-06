/**
 * BE-145 filename pin. The catalog-integrity check requires
 * `be-145-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-145', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 145);
    expect(entry?.name).toBe('Stoner susceptibility');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(145)?.kind).toBe('bridge');
    expect(catalogFormalRef(145)?.statement).toBe('PhysJS.Stoner.stoner');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
