/**
 * BE-133 filename pin. The catalog-integrity check requires
 * `be-133-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-133', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 133);
    expect(entry?.name).toBe('Damping ratio');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(133)?.kind).toBe('bridge');
    expect(catalogFormalRef(133)?.statement).toBe('PhysJS.DampingRatio.damping_ratio');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
