/**
 * BE-140 filename pin. The catalog-integrity check requires
 * `be-140-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-140', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 140);
    expect(entry?.name).toBe('Onsager frequency');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(140)?.kind).toBe('bridge');
    expect(catalogFormalRef(140)?.statement).toBe('PhysJS.OnsagerFrequency.onsager_frequency');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
