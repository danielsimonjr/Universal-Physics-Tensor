/**
 * BE-143 filename pin. The catalog-integrity check requires
 * `be-143-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-143', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 143);
    expect(entry?.name).toBe('AC Drude conductivity');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(143)?.kind).toBe('bridge');
    expect(catalogFormalRef(143)?.statement).toBe('PhysJS.AcDrude.ac_drude');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
