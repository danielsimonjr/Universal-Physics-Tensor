/**
 * BE-120 filename pin. The catalog-integrity check requires
 * `be-120-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-120', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 120);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(120)?.kind).toBe('bridge');
    expect(catalogFormalRef(120)?.statement).toBe("PhysJS.ChapmanFerraro.standoff_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
