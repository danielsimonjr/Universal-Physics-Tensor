/**
 * BE-135 filename pin. The catalog-integrity check requires
 * `be-135-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-135', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 135);
    expect(entry?.name).toBe('Three-dimensional density of states');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(135)?.kind).toBe('bridge');
    expect(catalogFormalRef(135)?.statement).toBe('PhysJS.DensityOfStates3D.dos_3d');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
