/**
 * BE-163 filename pin. The catalog-integrity check requires
 * `be-163-*.test.ts`. The formula checks live in `thermal-r9-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-163', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 163);
    expect(entry?.name).toBe("Joule–Thomson coefficient");
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(163)?.kind).toBe('bridge');
    expect(catalogFormalRef(163)?.statement).toBe("PhysJS.JouleThomson.joule_thomson_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
