/**
 * BE-151 filename pin. The catalog-integrity check requires
 * `be-151-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-151', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 151);
    expect(entry?.name).toBe("Nernst voltage");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(151)?.kind).toBe('bridge');
    expect(catalogFormalRef(151)?.statement).toBe("PhysJS.NernstGibbs.nernst_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
