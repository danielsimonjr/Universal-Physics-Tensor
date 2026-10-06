/**
 * BE-149 filename pin. The catalog-integrity check requires
 * `be-149-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-149', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 149);
    expect(entry?.name).toBe("van 't Hoff slope");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(149)?.kind).toBe('bridge');
    expect(catalogFormalRef(149)?.statement).toBe("PhysJS.VanTHoff.vant_hoff");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
