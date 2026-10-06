/**
 * BE-144 filename pin. The catalog-integrity check requires
 * `be-144-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-144', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 144);
    expect(entry?.name).toBe('Matthiessen lifetime');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(144)?.kind).toBe('bridge');
    expect(catalogFormalRef(144)?.statement).toBe('PhysJS.Matthiessen.matthiessen');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
