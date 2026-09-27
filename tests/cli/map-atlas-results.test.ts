/**
 * `enumerateRoutes` / `enumerateAtlasRoutes` — every simple route between two
 * models, bounded, and saying when the bound cut the search short. Checked
 * against a plain recursive enumeration written here.
 *
 * @module tests/cli/map-atlas-results
 */
import { describe, it, expect } from 'vitest';
import { enumerateRoutes } from '../../dist/atlas/path-bound.js';
import type { AtlasBridge } from '../../dist/cli-api.js';

/** Every simple route, by plain recursion: a second method, not the enumerator's layered search. */
function naiveRoutes(bridges: readonly AtlasBridge[], from: string, to: string): string[][] {
  const steps = bridges
    .filter((b) => b.premises.length === 1)
    .flatMap((b) => [
      { from: b.premises[0]!, to: b.conclusion, id: b.id },
      ...(b.relation === 'exact-equivalence' ? [{ from: b.conclusion, to: b.premises[0]!, id: b.id }] : []),
    ]);
  const found: string[][] = [];
  const walk = (at: string, seen: Set<string>, ids: string[]): void => {
    if (at === to) return void found.push(ids);
    for (const s of steps.filter((x) => x.from === at && !seen.has(x.to))) walk(s.to, new Set([...seen, s.to]), [...ids, s.id]);
  };
  walk(from, new Set([from]), []);
  return found;
}

const sortRoutes = (rs: string[][]): string[] => rs.map((r) => r.join(' ')).sort();

function synthetic(id: string, from: string, to: string, relation: AtlasBridge['relation'] = 'approximation'): AtlasBridge {
  return { id, premises: [from], conclusion: to, relation } as unknown as AtlasBridge;
}

describe('enumerateRoutes', () => {
  // A→D directly, A→B→D, A→C→D, and B⇄C by an exact equivalence, so A→B→C→D and A→C→B→D too.
  const graph = [
    synthetic('ab', 'A', 'B'),
    synthetic('ac', 'A', 'C'),
    synthetic('bd', 'B', 'D'),
    synthetic('cd', 'C', 'D'),
    synthetic('ad', 'A', 'D'),
    synthetic('bc', 'B', 'C', 'exact-equivalence'),
  ];

  it('finds every simple route, shortest first, and agrees with a recursive enumeration', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 100);
    const ids = r.routes.map((x) => x.map((b) => b.id));
    expect(sortRoutes(ids)).toEqual(sortRoutes(naiveRoutes(graph, 'A', 'D')));
    expect(ids).toHaveLength(5);
    expect(ids.map((x) => x.length)).toEqual([1, 2, 2, 3, 3]);
    expect(r).toMatchObject({ exhausted: true, completeThrough: null, stoppedBy: null });
    // A lossy relation is not walked backwards: nothing reaches A.
    expect(enumerateRoutes(graph, 'D', 'A', 100).routes).toEqual([]);
  });

  it('says when the limit cut the list short, and up to which bridge count it is complete', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 2);
    expect(r.routes.map((x) => x.map((b) => b.id))).toEqual([['ad'], ['ab', 'bd']]);
    expect(r).toMatchObject({ exhausted: false, stoppedBy: 'limit', completeThrough: 1 });
    // Exactly as many routes as exist is not a truncation.
    expect(enumerateRoutes(graph, 'A', 'D', 5)).toMatchObject({ exhausted: true, stoppedBy: null });
    expect(enumerateRoutes(graph, 'A', 'D', 4)).toMatchObject({ exhausted: false, stoppedBy: 'limit', completeThrough: 2 });
  });

  it('says when the work budget stopped it, which is not the same as running out of routes', () => {
    const r = enumerateRoutes(graph, 'A', 'D', 100, 2);
    expect(r.exhausted).toBe(false);
    expect(r.stoppedBy).toBe('budget');
    expect(r.completeThrough).toBe(1);
    expect(() => enumerateRoutes(graph, 'A', 'D', 0)).toThrow(RangeError);
  });
});

