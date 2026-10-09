/**
 * Identifiability classifier (docs/planning/Identifiability-Classifier-
 * Design-Note.md). Controlled fixtures pin the over/exactly/under/given
 * boundary, cycle / circular-self-support exclusion, parameter-free
 * edges, identity-only reachability, and the blocking frontier; the
 * real-graph block pins the verified {mass} connectivity (hawking-
 * temperature over-determined via be-42 + be-42-via-rs; landauer-erasure-
 * energy determinable ONLY with the registered identification).
 */
import { describe, it, expect } from 'vitest';
import {
  classifyIdentifiability,
  classifyAll,
  forwardClosure,
} from '../../src/composition/identifiability.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const q = (name: string): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: {},
});

const edge = (
  id: string,
  sourceNames: string[],
  targetName: string,
): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: sourceNames.map(q),
  target: q(targetName),
  confidence: 'established',
  domain: { description: 'any', predicate: () => true },
  evaluate: () => 0,
  citation: 'synthetic',
});

const NO_IDENTS = { identifications: [] as const };

describe('classifyIdentifiability — controlled fixtures', () => {
  it('under-determined: target unreachable from the known set', () => {
    const edges = [edge('e', ['b'], 't')];
    const r = classifyIdentifiability(edges, ['a'], 't', NO_IDENTS);
    expect(r.verdict).toBe('under-determined');
    expect(r.derivations).toEqual([]);
    expect(r.surplusConstraints).toBe(0);
    expect(r.blockingFrontier).toContain('b');
    expect(r.determinable).toEqual(['a']);
  });

  it('exactly-determined: a single derivation from the known set', () => {
    const edges = [edge('e', ['a'], 't')];
    const r = classifyIdentifiability(edges, ['a'], 't', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['e']);
    expect(r.surplusConstraints).toBe(0);
    expect(r.blockingFrontier).toEqual([]);
  });

  it('exactly-determined through a multi-step chain', () => {
    const edges = [edge('e1', ['c'], 'b'), edge('e2', ['b'], 't')];
    const r = classifyIdentifiability(edges, ['c'], 't', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['e2']);
    expect(r.determinable).toEqual(['b', 'c', 't']);
  });

  it('over-determined: two independent derivations, surplus = 1', () => {
    const edges = [edge('e1', ['a'], 't'), edge('e2', ['b'], 't')];
    const r = classifyIdentifiability(edges, ['a', 'b'], 't', NO_IDENTS);
    expect(r.verdict).toBe('over-determined');
    expect(new Set(r.derivations)).toEqual(new Set(['e1', 'e2']));
    expect(r.surplusConstraints).toBe(1);
  });

  it('excludes circular self-support (the design-note counterexample)', () => {
    // K={a}; a->t (e1), t->b (e2), b->t (e3). e3 must NOT count: b came
    // from t, so b->t is no independent check.
    const edges = [
      edge('e1', ['a'], 't'),
      edge('e2', ['t'], 'b'),
      edge('e3', ['b'], 't'),
    ];
    const r = classifyIdentifiability(edges, ['a'], 't', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['e1']);
  });

  it('parameter-free edge (empty sources) fires unconditionally', () => {
    const edges = [edge('konst', [], 't')];
    const r = classifyIdentifiability(edges, [], 't', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['konst']);
  });

  it('given: target is itself known; derivations become cross-checks', () => {
    const edges = [edge('e1', ['a'], 't'), edge('e2', ['b'], 't')];
    const r = classifyIdentifiability(edges, ['a', 'b', 't'], 't', NO_IDENTS);
    expect(r.verdict).toBe('given');
    // both derivations are checks on the supplied value (not k-1)
    expect(r.surplusConstraints).toBe(2);
  });

  it('identity-only reachability: determined by assertion, 0 physical derivations', () => {
    // x is determinable; identification x->t makes t determinable with no
    // edge into t.
    const edges = [edge('e', ['a'], 'x')];
    const r = classifyIdentifiability(edges, ['a'], 't', {
      identifications: [{ from: 'x', to: 't', rationale: 'test' }],
    });
    expect(r.determinable).toContain('t');
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual([]);
    expect(r.surplusConstraints).toBe(0);
  });

  it('blocking frontier reports only the upstream gap, not the whole graph', () => {
    // K={c}; need a AND b for t; a derivable from c, b is the gap.
    const edges = [edge('ea', ['c'], 'a'), edge('et', ['a', 'b'], 't')];
    const r = classifyIdentifiability(edges, ['c'], 't', NO_IDENTS);
    expect(r.verdict).toBe('under-determined');
    expect(r.blockingFrontier).toEqual(['b']);
  });
});

describe('forwardClosure', () => {
  it('is monotone and closes transitively', () => {
    const edges = [edge('e1', ['a'], 'b'), edge('e2', ['b'], 'c')];
    expect([...forwardClosure(edges, ['a'], [])].sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

const FULL_GRAPH = CATALOG_GRAPH;

describe('classifyIdentifiability — the real catalog graph from {mass}', () => {
  it('hawking-temperature is OVER-determined (be-42 and be-42-via-rs)', () => {
    const r = classifyIdentifiability(FULL_GRAPH, ['mass'], 'hawking-temperature');
    expect(r.verdict).toBe('over-determined');
    expect(new Set(r.derivations)).toEqual(new Set(['be-42', 'be-42-via-rs']));
    expect(r.surplusConstraints).toBe(1);
  });

  it('schwarzschild-radius is exactly-determined (law-schwarzschild-radius)', () => {
    const r = classifyIdentifiability(FULL_GRAPH, ['mass'], 'schwarzschild-radius');
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['law-schwarzschild-radius']);
  });

  it('landauer-erasure-energy needs the registered identification', () => {
    // WITH the default identification (hawking-temperature ≡ temperature):
    const withId = classifyIdentifiability(
      FULL_GRAPH,
      ['mass'],
      'landauer-erasure-energy',
    );
    expect(withId.verdict).toBe('exactly-determined');
    expect(withId.derivations).toEqual(['be-16']);

    // WITHOUT it, the name boundary blocks the chain:
    const noId = classifyIdentifiability(
      FULL_GRAPH,
      ['mass'],
      'landauer-erasure-energy',
      NO_IDENTS,
    );
    expect(noId.verdict).toBe('under-determined');
    expect(noId.blockingFrontier).toContain('temperature');
  });

  it('a disconnected target is under-determined from {mass}', () => {
    const r = classifyIdentifiability(FULL_GRAPH, ['mass'], 'fret-efficiency');
    expect(r.verdict).toBe('under-determined');
    expect(r.blockingFrontier).toEqual(
      expect.arrayContaining(['donor-acceptor-distance', 'foerster-radius']),
    );
  });
});

describe('classifyAll', () => {
  it('classifies every target name once, sorted', () => {
    const results = classifyAll(FULL_GRAPH, ['mass']);
    const targets = results.map((r) => r.target);
    expect(targets).toEqual([...targets].sort());
    expect(new Set(targets).size).toBe(targets.length);
    // hawking-temperature is among the targets and over-determined
    const ht = results.find((r) => r.target === 'hawking-temperature');
    expect(ht?.verdict).toBe('over-determined');
  });
});
