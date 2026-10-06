/**
 * BE-138 filename pin. The catalog-integrity check requires
 * `be-138-*.test.ts`. The formula checks live in `condensed-r8-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-138', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 138);
    expect(entry?.name).toBe('Built-in voltage');
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('F');
    expect(catalogFormalRef(138)?.kind).toBe('bridge');
    expect(catalogFormalRef(138)?.statement).toBe('PhysJS.BuiltinVoltage.builtin_voltage');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
