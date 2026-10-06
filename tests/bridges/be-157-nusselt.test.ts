/**
 * BE-157 filename pin. The catalog-integrity check requires
 * `be-157-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-157', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 157);
    expect(entry?.name).toBe("Nusselt number");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(157)?.kind).toBe('bridge');
    expect(catalogFormalRef(157)?.statement).toBe("PhysJS.Nusselt.nusselt_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
