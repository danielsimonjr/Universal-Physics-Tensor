/**
 * BE-141 filename pin. The catalog-integrity check requires
 * `be-141-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-141', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 141);
    expect(entry?.name).toBe('Josephson inductance');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(141)?.kind).toBe('bridge');
    expect(catalogFormalRef(141)?.statement).toBe('PhysJS.JosephsonInductance.inductance_eq');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
