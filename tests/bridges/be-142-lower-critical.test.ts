/**
 * BE-142 filename pin. The catalog-integrity check requires
 * `be-142-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-142', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 142);
    expect(entry?.name).toBe('Lower critical field');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(142)?.kind).toBe('bridge');
    expect(catalogFormalRef(142)?.statement).toBe('PhysJS.LowerCritical.lower_critical');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
