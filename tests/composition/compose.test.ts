/**
 * v0.8.0 Phase 1 — composition-graph core unit tests.
 *
 * Synthetic-edge coverage of `composeEdges` definedness conditions
 * (junction by name / by identification; exact dimension equality),
 * the min-confidence demotion algebra, domain piping (design D-5),
 * 3-edge chaining (design D-2), and the `regimesDiffer` membership
 * primitive. See docs/planning/v0.8.0-Design.md §3.
 */
import { describe, it, expect } from 'vitest';
import {
  composeEdges,
  consistencyRatio,
  evaluateEdge,
  minConfidence,
  regimesDiffer,
  CompositionDimensionError,
  CompositionJunctionError,
  DomainViolationError,
} from '../../src/composition/index.js';
import type {
  BridgeEdge,
  Quantity,
} from '../../src/composition/index.js';
import {
  DIMENSIONLESS,
  LENGTH,
  MASS,
  TEMPERATURE,
} from '../../src/dimensional/types.js';

const q = (
  name: string,
  dim = DIMENSIONLESS,
  attributes: Quantity['attributes'] = {},
): Quantity => ({ name, symbol: name, dim, attributes });

const edge = (over: Partial<BridgeEdge> & Pick<BridgeEdge, 'id' | 'sources' | 'target' | 'evaluate'>): BridgeEdge => ({
  beId: null,
  kind: 'bridge',
  label: over.id,
  confidence: 'established',
  domain: { description: 'any', predicate: () => true },
  citation: 'synthetic',
  ...over,
});

describe('regimesDiffer (graph-native membership primitive)', () => {
  it('differs when an axis is stated on both sides with different values', () => {
    expect(
      regimesDiffer({ scale: 'quantum' }, { scale: 'classical' }),
    ).toBe(true);
  });

  it('does not differ when axes agree or are stated on only one side', () => {
    expect(regimesDiffer({ scale: 'quantum' }, { scale: 'quantum' })).toBe(false);
    expect(regimesDiffer({ scale: 'quantum' }, {})).toBe(false);
    expect(regimesDiffer({}, {})).toBe(false);
    expect(
      regimesDiffer({ scale: 'quantum' }, { force: 'gravitational' }),
    ).toBe(false);
  });

  it('reads every registry axis, not a hand list: a symmetry-only, topology-only or statistics-only difference differs', () => {
    // 9.0.0 audit §4 Low: REGIME_KEYS was ['scale', 'force', 'information'], so the
    // three later axes could never make two attribute sets differ.
    expect(regimesDiffer({ symmetry: 'gauge' }, { symmetry: 'poincare' })).toBe(true);
    expect(regimesDiffer({ topology: 'chern' }, { topology: 'trivial' })).toBe(true);
    expect(regimesDiffer({ statistics: 'bosonic' }, { statistics: 'fermionic' })).toBe(true);
    expect(regimesDiffer({ symmetry: 'gauge' }, { symmetry: 'gauge' })).toBe(false);
  });
});

describe('minConfidence (demotion algebra)', () => {
  it('demotes, never promotes', () => {
    expect(minConfidence('established', 'speculative')).toBe('speculative');
    expect(minConfidence('speculative', 'highly-speculative')).toBe(
      'highly-speculative',
    );
    expect(minConfidence('established', 'highly-speculative')).toBe(
      'highly-speculative',
    );
    expect(minConfidence('established', 'established')).toBe('established');
  });
});

describe('composeEdges', () => {
  const aOut = q('intermediate', LENGTH);
  const first = edge({
    id: 'first',
    sources: [q('x', MASS)],
    target: aOut,
    evaluate: (i) => i['x'] * 2,
  });
  const second = edge({
    id: 'second',
    sources: [q('intermediate', LENGTH)],
    target: q('out', DIMENSIONLESS),
    evaluate: (i) => i['intermediate'] + 1,
    confidence: 'speculative',
  });

  it('composes through a name-matched junction and pipes values', () => {
    const composed = composeEdges(first, second);
    expect(composed.evaluate({ x: 10 })).toBe(21); // (10*2)+1
    expect(composed.target.name).toBe('out');
    expect(composed.sources.map((s) => s.name)).toEqual(['x']);
    expect(composed.id).toBe('first>>second');
  });

  it('demotes confidence to the min of the operands', () => {
    expect(composeEdges(first, second).confidence).toBe('speculative');
  });

  it('throws CompositionJunctionError when no quantity matches', () => {
    const unrelated = edge({
      id: 'unrelated',
      sources: [q('something-else', LENGTH)],
      target: q('out'),
      evaluate: () => 0,
    });
    expect(() => composeEdges(first, unrelated)).toThrow(
      CompositionJunctionError,
    );
  });

  it('accepts an explicit identification (reviewable physics judgment)', () => {
    const namedDifferently = edge({
      id: 'named-differently',
      sources: [q('proper-length', LENGTH)],
      target: q('out'),
      evaluate: (i) => i['proper-length'] * 3,
    });
    const composed = composeEdges(first, namedDifferently, {
      identifications: [
        { from: 'intermediate', to: 'proper-length', rationale: 'test' },
      ],
    });
    expect(composed.evaluate({ x: 5 })).toBe(30);
  });

  it('converts identified junctions before domain checks and evaluation', () => {
    const bits = edge({
      id: 'bits',
      sources: [q('x')],
      target: q('intrinsic-information'),
      evaluate: (i) => i['x']!,
    });
    const nats = edge({
      id: 'nats',
      sources: [q('subsystem-entanglement-entropy')],
      target: q('out'),
      domain: {
        description: 'junction is ln 2 nats',
        predicate: (i) =>
          Math.abs(i['subsystem-entanglement-entropy']! - Math.LN2) < 1e-12,
      },
      evaluate: (i) => i['subsystem-entanglement-entropy']! * 2,
    });
    const composed = composeEdges(bits, nats, {
      identifications: [
        {
          from: 'intrinsic-information',
          to: 'subsystem-entanglement-entropy',
          rationale: 'bits to nats',
        },
      ],
    });

    expect(composed.domain.predicate({ x: 1 })).toBe(true);
    expect(composed.evaluate({ x: 1 })).toBeCloseTo(2 * Math.LN2, 12);
  });

  it('throws CompositionDimensionError on junction dim mismatch (functor check)', () => {
    const wrongDim = edge({
      id: 'wrong-dim',
      sources: [q('intermediate', TEMPERATURE)], // name matches, dim does not
      target: q('out'),
      evaluate: () => 0,
    });
    expect(() => composeEdges(first, wrongDim)).toThrow(
      CompositionDimensionError,
    );
  });

  it("checks second's domain on the PIPED intermediate value (D-5)", () => {
    const positiveOnly = edge({
      id: 'positive-only',
      sources: [q('intermediate', LENGTH)],
      target: q('out'),
      evaluate: (i) => Math.sqrt(i['intermediate']),
      domain: {
        description: 'intermediate ≥ 0',
        predicate: (i) => i['intermediate'] >= 0,
      },
    });
    const composed = composeEdges(first, positiveOnly);
    expect(composed.evaluate({ x: 2 })).toBe(2); // sqrt(4)
    expect(() => composed.evaluate({ x: -2 })).toThrow(DomainViolationError);
  });

  it('chains: compose(compose(a, b), c) (D-2 closure)', () => {
    const third = edge({
      id: 'third',
      sources: [q('out', DIMENSIONLESS)],
      target: q('final', DIMENSIONLESS),
      evaluate: (i) => i['out'] * 10,
      confidence: 'highly-speculative',
    });
    const chain = composeEdges(composeEdges(first, second), third);
    expect(chain.evaluate({ x: 1 })).toBe(30); // ((1*2)+1)*10
    expect(chain.confidence).toBe('highly-speculative');
    expect(chain.id).toBe('first>>second>>third');
  });

  it('law ∘ law stays a law; law ∘ bridge is a bridge', () => {
    const lawA = edge({ ...first, kind: 'law' } as BridgeEdge & { id: string });
    const lawB = edge({ ...second, kind: 'law' } as BridgeEdge & { id: string });
    expect(composeEdges(lawA, lawB).kind).toBe('law');
    expect(composeEdges(lawA, second).kind).toBe('bridge');
  });

  it('keeps the non-junction sources of the second edge as inputs', () => {
    const binary = edge({
      id: 'binary',
      sources: [q('intermediate', LENGTH), q('offset', DIMENSIONLESS)],
      target: q('out'),
      evaluate: (i) => i['intermediate'] + i['offset'],
    });
    const composed = composeEdges(first, binary);
    expect(composed.sources.map((s) => s.name)).toEqual(['x', 'offset']);
    expect(composed.evaluate({ x: 3, offset: 100 })).toBe(106);
  });
});

describe('evaluateEdge / consistencyRatio (domain checking)', () => {
  const bounded = edge({
    id: 'bounded',
    sources: [q('v')],
    target: q('w'),
    evaluate: (i) => i['v'] * 4,
    domain: { description: 'v > 0', predicate: (i) => i['v'] > 0 },
  });

  it('evaluateEdge throws DomainViolationError outside the domain', () => {
    expect(evaluateEdge(bounded, { v: 2 })).toBe(8);
    expect(() => evaluateEdge(bounded, { v: -1 })).toThrow(
      DomainViolationError,
    );
  });

  it('consistencyRatio is the domain-checked quotient', () => {
    const half = edge({
      id: 'half',
      sources: [q('v')],
      target: q('w'),
      evaluate: (i) => i['v'] * 2,
    });
    expect(consistencyRatio(bounded, half, { v: 7 })).toBe(2);
    expect(() => consistencyRatio(bounded, half, { v: 0 })).toThrow(
      DomainViolationError,
    );
  });
});
