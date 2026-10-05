/**
 * Expression gaps are a separate searchable list. Product A wrappers stay
 * not-searchable, and `scanFrontier`'s own length is unchanged.
 *
 * The id guard compares the emitted `fg-expr-*` list with `APPLIED_CASES`
 * exactly. A length check and a single example id still pass when one case
 * is omitted and another id is duplicated.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG_GRAPH } from '../../../src/composition/catalog-graph.js';
import { APPLIED_CASES } from '../../../src/cases/index.js';
import { expressionSearchGaps, scanFrontier, scanWithExpressionGaps } from '../../../src/composition/probe/index.js';

/** `fg-expr-<case id>` for every registered case, sorted, with no duplicate. */
function expectedExpressionIds(): string[] {
  const ids = [...APPLIED_CASES.keys()].map((id) => `fg-expr-${id}`);
  expect(new Set(ids).size).toBe(ids.length);
  return [...ids].sort((a, b) => a.localeCompare(b));
}

describe('expression search gaps', () => {
  it('emits fg-expr-<case id> once per applied case, and no other searchable kind', () => {
    const wrappers = scanFrontier(CATALOG_GRAPH);
    const extra = expressionSearchGaps();
    const emitted = extra.map((g) => g.id);
    const expected = expectedExpressionIds();
    expect(emitted).toEqual(expected);
    expect(new Set(emitted).size).toBe(emitted.length);
    expect(wrappers.every((g) => g.searchability.searchable === false)).toBe(true);
    for (const g of extra) {
      const caseId = g.id.slice('fg-expr-'.length);
      const applied = APPLIED_CASES.get(caseId);
      expect(applied, caseId).toBeDefined();
      expect(g.kind).toBe('prediction-residual');
      expect(g.searchability.searchable).toBe(true);
      expect(g.observations).toEqual([]);
      expect(g.evidence.summary).toBe(`${applied!.id}: ${applied!.title}`);
      const why = g.searchability.reasons.join(' ');
      expect(why).toMatch(/no named baseline/);
      expect(why).toMatch(/no dataset/);
      expect(why).toMatch(/not a detected prediction residual/);
    }
    const combined = scanWithExpressionGaps(CATALOG_GRAPH);
    expect(combined.slice(0, wrappers.length)).toEqual(wrappers);
    expect(combined.slice(wrappers.length).map((g) => g.id)).toEqual(emitted);
    const searchable = combined.filter((g) => g.searchability.searchable);
    expect(searchable.map((g) => g.id)).toEqual(emitted);
    expect(searchable.every((g) => g.kind === 'prediction-residual')).toBe(true);
  });

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
    // 344 wrappers and 329 relation-links are the record from before be-74..76.
    // 358 wrappers and 343 relation-links are the record from before be-77..87.
    // 724 wrappers and 709 relation-links are the record from before be-88..102.
    // The fifteen new edges are isolated, so each new quantity opens relation-links.
    // 1364 wrappers and 1349 relation-links are the record from before be-103..125.
    expect(wrappers).toHaveLength(3829);
    // 2974 wrappers and 2959 relation-links are the record from before be-126..133.
    expect(byKind(wrappers)).toEqual({ 'relation-link': 3814, 'regime-transition': 15 });
    expect(wrappers.every((g) => g.searchability.searchable === false)).toBe(true);
    expect(byKind(scanWithExpressionGaps(CATALOG_GRAPH))).toEqual({
      'relation-link': 3814,
      'regime-transition': 15,
      'prediction-residual': 6,
    });
  });
});
