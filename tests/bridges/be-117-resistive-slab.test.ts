/**
 * BE-117 filename pin. The catalog-integrity check requires
 * `be-117-*.test.ts`. The formula checks live in `plasma-formulas.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-117', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 117);
    expect(entry?.status).toBe('established');
    expect(entry?.category).toBe('D');
    expect(catalogFormalRef(117)?.kind).toBe('bridge');
    expect(catalogFormalRef(117)?.statement).toBe("PhysJS.ResistiveSlab.decay_time");
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
