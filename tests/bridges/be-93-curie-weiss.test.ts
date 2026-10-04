/**
 * BE-93 filename pin. The catalog-integrity check requires
 * `be-93-*.test.ts`. The factor checks live in `be-88-102.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';

describe('BE-93', () => {
  it('is in the catalog and its formalRef is kind bridge', () => {
    const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === 93);
    expect(entry?.status).toBe('established');
    expect(catalogFormalRef(93)?.kind).toBe('bridge');
    expect((entry?.formula_latex ?? '').length).toBeGreaterThan(0);
  });
});
