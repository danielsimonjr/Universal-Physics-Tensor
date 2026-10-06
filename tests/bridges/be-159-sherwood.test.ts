/**
 * BE-159 filename pin. The catalog-integrity check requires
 * `be-159-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-159', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 159);
    expect(entry?.name).toBe("Sherwood number");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(159)?.kind).toBe('bridge');
    expect(catalogFormalRef(159)?.statement).toBe("PhysJS.Sherwood.sherwood_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
