/**
 * BE-108 filename pin. The catalog-integrity check requires
 * `be-108-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-108', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 108);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(108)?.kind).toBe('bridge');
    expect(catalogFormalRef(108)?.statement).toBe("PhysJS.ObliqueMagnetosonic.phase_speed_eq");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
