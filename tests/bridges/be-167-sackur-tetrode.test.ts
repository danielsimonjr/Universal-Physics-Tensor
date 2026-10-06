/**
 * BE-167 filename pin. The catalog-integrity check requires
 * `be-167-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-167', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 167);
    expect(entry?.name).toBe("Sackur–Tetrode entropy");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(167)?.kind).toBe('bridge');
    expect(catalogFormalRef(167)?.statement).toBe("PhysJS.SackurTetrode.sackur_tetrode");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
