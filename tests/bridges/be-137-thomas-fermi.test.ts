/**
 * BE-137 filename pin. The catalog-integrity check requires
 * `be-137-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-137', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 137);
    expect(entry?.name).toBe('Thomas–Fermi wavevector squared');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(137)?.kind).toBe('bridge');
    expect(catalogFormalRef(137)?.statement).toBe('PhysJS.ThomasFermi.thomas_fermi');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
