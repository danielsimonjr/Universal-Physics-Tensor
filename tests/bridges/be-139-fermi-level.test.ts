/**
 * BE-139 filename pin. The catalog-integrity check requires
 * `be-139-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-139', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 139);
    expect(entry?.name).toBe('Semiconductor Fermi offset');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(139)?.kind).toBe('bridge');
    expect(catalogFormalRef(139)?.statement).toBe('PhysJS.SemiconductorFermi.fermi_level');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
