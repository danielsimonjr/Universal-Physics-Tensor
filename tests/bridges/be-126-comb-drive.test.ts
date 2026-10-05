/**
 * BE-126 filename pin. The catalog-integrity check requires
 * `be-126-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-126', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 126);
    expect(entry?.name).toBe('Comb-drive lateral force');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(126)?.kind).toBe('bridge');
    expect(catalogFormalRef(126)?.statement).toBe('PhysJS.CombDrive.force_eq');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
