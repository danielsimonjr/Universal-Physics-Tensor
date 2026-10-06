/**
 * BE-134 filename pin. The catalog-integrity check requires
 * `be-134-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-134', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 134);
    expect(entry?.name).toBe('Bloch magnon deficit');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(134)?.kind).toBe('bridge');
    expect(catalogFormalRef(134)?.statement).toBe('PhysJS.BlochLaw.bloch_law');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
