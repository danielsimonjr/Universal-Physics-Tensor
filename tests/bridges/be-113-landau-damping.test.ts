/**
 * BE-113 filename pin. The catalog-integrity check requires
 * `be-113-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-113', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 113);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(113)?.kind).toBe('bridge');
    expect(catalogFormalRef(113)?.statement).toBe("PhysJS.LandauDamping.damping_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
