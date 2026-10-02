/**
 * The pipe's dimension check has a name. Behavior is the `equals` check
 * `composeEdges` already applied. `CompositionDimensionError` stays the failure.
 *
 * A body that returned the negation of `equals` failed the control: a matching
 * pair came back false, and a matching pipe threw `CompositionDimensionError`.
 */

import { describe, expect, it } from 'vitest';
import { composeEdges, junctionDimensionsMatch } from '../../src/composition/compose.js';
import { CompositionDimensionError } from '../../src/composition/edge.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { DIMENSIONLESS, LENGTH, TEMPERATURE } from '../../src/dimensional/types.js';

const q = (name: string, dim: Dimension = DIMENSIONLESS): Quantity => ({
  name,
  symbol: name,
  dim,
  attributes: {},
});

const edge = (
  over: Partial<BridgeEdge> & Pick<BridgeEdge, 'id' | 'sources' | 'target' | 'evaluate'>,
): BridgeEdge => ({
  beId: null,
  kind: 'bridge',
  label: over.id,
  confidence: 'established',
  domain: { description: 'any', predicate: () => true },
  citation: 'synthetic',
  ...over,
});

describe('junctionDimensionsMatch', () => {
  const first = edge({
    id: 'first',
    sources: [q('x', LENGTH)],
    target: q('intermediate', LENGTH),
    evaluate: (i) => i['x']!,
  });

  it('a matching pair returns true', () => {
    expect(junctionDimensionsMatch(LENGTH, { ...LENGTH })).toBe(true);
    const almost: Dimension = { ...LENGTH, L: LENGTH.L + 1e-12 };
    expect(junctionDimensionsMatch(LENGTH, almost)).toBe(true);
  });

  it('a mismatched pair returns false, and composeEdges still throws', () => {
    expect(junctionDimensionsMatch(LENGTH, TEMPERATURE)).toBe(false);
    const wrong = edge({
      id: 'wrong-dim',
      sources: [q('intermediate', TEMPERATURE)],
      target: q('out'),
      evaluate: () => 0,
    });
    expect(() => composeEdges(first, wrong)).toThrow(CompositionDimensionError);
  });

  it('a matching pipe still composes', () => {
    const second = edge({
      id: 'second',
      sources: [q('intermediate', LENGTH)],
      target: q('out', DIMENSIONLESS),
      evaluate: (i) => i['intermediate']! + 1,
    });
    expect(composeEdges(first, second).evaluate({ x: 2 })).toBe(3);
  });

  it('CONTROL: swapping the true and false results fails', () => {
    expect(junctionDimensionsMatch(LENGTH, LENGTH)).toBe(true);
    expect(junctionDimensionsMatch(LENGTH, TEMPERATURE)).toBe(false);
  });
});
