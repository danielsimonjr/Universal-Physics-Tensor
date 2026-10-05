/**
 * BE-128 filename pin. The catalog-integrity check requires
 * `be-128-*.test.ts`. The formula checks live in `engineering-r7-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-128', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 128);
    expect(entry?.name).toBe('Ideal boost ratio');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(128)?.kind).toBe('bridge');
    expect(catalogFormalRef(128)?.statement).toBe('PhysJS.BoostConverter.boost_ratio');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
