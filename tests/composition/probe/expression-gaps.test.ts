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

  it('pins the catalog split the Tier 8 measurement recorded', () => {
    const wrappers = scanFrontier(CATALOG_GRAPH);
    const extra = expressionSearchGaps();
    const byKind = (gaps: readonly { kind: string }[]) => {
      const counts: Record<string, number> = {};
      for (const g of gaps) counts[g.kind] = (counts[g.kind] ?? 0) + 1;
      return counts;
    };
    expect(extra).toHaveLength(6);
    expect(wrappers).toHaveLength(232);
    expect(byKind(wrappers)).toEqual({ 'relation-link': 216, 'regime-transition': 16 });
    expect(wrappers.every((g) => g.searchability.searchable === false)).toBe(true);
    expect(byKind(scanWithExpressionGaps(CATALOG_GRAPH))).toEqual({
      'relation-link': 216,
      'regime-transition': 16,
      'prediction-residual': 6,
    });
  });
});
