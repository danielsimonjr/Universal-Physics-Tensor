/**
 * Expression gaps are a separate searchable list. Product A wrappers stay
 * not-searchable, and `scanFrontier`'s own length is unchanged.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG_GRAPH } from '../../../src/composition/catalog-graph.js';
import { expressionSearchGaps, scanFrontier, scanWithExpressionGaps } from '../../../src/composition/probe/index.js';

describe('expression search gaps', () => {
  it('adds one searchable prediction-residual gap per applied case', () => {
    const wrappers = scanFrontier(CATALOG_GRAPH);
    const extra = expressionSearchGaps();
    expect(wrappers.every((g) => g.searchability.searchable === false)).toBe(true);
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.every((g) => g.searchability.searchable && g.kind === 'prediction-residual')).toBe(true);
    expect(extra.some((g) => g.id === 'fg-expr-case-skin-depth')).toBe(true);
    const combined = scanWithExpressionGaps(CATALOG_GRAPH);
    expect(combined).toHaveLength(wrappers.length + extra.length);
    expect(combined.filter((g) => g.searchability.searchable)).toHaveLength(extra.length);
  });
});
