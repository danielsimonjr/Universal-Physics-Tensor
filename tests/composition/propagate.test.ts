/**
 * `propagate` is the one fixed point behind `dependents` (discovery: an edge
 * fires when ANY source is in the set) and `forwardClosure` (identifiability:
 * an edge fires when ALL sources are in the set). An edge with no sources
 * separates the two rules: `.some` of nothing is false, `.every` of nothing is
 * true. Each caller keeps its own answer.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { forwardClosure, propagate } from '../../src/composition/identifiability.js';
import { dependents } from '../../src/composition/discovery.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

const q = (name: string): Quantity => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });
const edge = (id: string, sourceNames: string[], targetName: string): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: sourceNames.map(q),
  target: q(targetName),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: () => 0,
  citation: 'synthetic',
});

describe('propagate: the shared fixed point', () => {
  const edges = [edge('konst', [], 'k'), edge('e', ['a', 'b'], 't'), edge('f', ['k'], 'u')];
  const idents = [{ from: 'a', to: 'a2' }] as const;

  it('dependents (any source) leaves the target of a source-free edge out', () => {
    expect([...dependents(edges, ['a'], idents)].sort()).toEqual(['a', 'a2', 't']);
  });

  it('forwardClosure (all sources) puts the target of a source-free edge in, and what follows from it', () => {
    expect([...forwardClosure(edges, ['a'], idents)].sort()).toEqual(['a', 'a2', 'k', 'u']);
  });

  it('is the one loop: both callers delegate to it', () => {
    expect([...propagate(edges, ['a'], idents, (e, set) => e.sources.some((s) => set.has(s.name)))].sort()).toEqual([
      'a',
      'a2',
      't',
    ]);
  });

  it('both callers delegate to it and keep no loop of their own', () => {
    const read = (file: string): string => readFileSync(new URL(file, import.meta.url), 'utf8');
    const discovery = read('../../src/composition/discovery.ts');
    expect(discovery).not.toContain('while (changed)');
    expect(discovery).toContain('return propagate(edges, seeds, idents,');
    expect(read('../../src/composition/identifiability.ts')).toContain('return propagate(edges, knownNames, identifications,');
  });
});
