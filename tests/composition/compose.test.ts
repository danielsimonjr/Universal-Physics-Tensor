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
  CATALOG_GRAPH,
  REGISTERED_COMPOSITION_IDS,
  SOURCE_ALIAS_DISPOSITIONS,
} from '../../src/composition/index.js';
import type {
  BridgeEdge,
  Quantity,
} from '../../src/composition/index.js';
import { CoefficientUnsetError, UndefinedCompositionError } from '../../src/composition/edge.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import type { Regime } from '../../src/relations/types.js';
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

describe('composeEdges carries the operands\' claims (9.0.0 audit §4 C5)', () => {
  const inter = q('intermediate', LENGTH);
  const first = edge({ id: 'first', sources: [q('x', MASS)], target: inter, evaluate: (i) => i['x'] * 2 });
  const second = edge({
    id: 'second',
    sources: [q('intermediate', LENGTH), q('w')],
    target: q('out', DIMENSIONLESS),
    evaluate: (i) => i['intermediate'] * i['w'],
  });
  const regime = (family: string, group: string): Regime => ({
    family,
    inequalities: [{ group, op: '<', bound: 1 }],
    groupDefinitions: {},
  });

  it('carries the one regime an operand states, and intersects two of one family', () => {
    const one = composeEdges({ ...first, regime: regime('f', 'g1') }, second);
    expect(one.regime).toEqual(regime('f', 'g1'));
    const both = composeEdges({ ...first, regime: regime('f', 'g1') }, { ...second, regime: regime('f', 'g2') });
    expect(both.regime?.family).toBe('f');
    expect(both.regime?.inequalities.map((i) => i.group)).toEqual(['g1', 'g2']);
  });

  it('refuses two regimes of different families: this layer does not state where a cross-family chain applies', () => {
    expect(() => composeEdges({ ...first, regime: regime('f', 'g1') }, { ...second, regime: regime('h', 'g2') })).toThrow(
      UndefinedCompositionError,
    );
  });

  it('an unset coefficient on either operand is unset on the composite, and evaluateEdge refuses instead of returning a number', () => {
    const composed = composeEdges({ ...first, coefficientUnset: true }, second);
    expect(composed.coefficientUnset).toBe(true);
    expect(() => evaluateEdge(composed, { x: 1, w: 1 })).toThrow(CoefficientUnsetError);
    expect(() => composed.evaluate({ x: 1, w: 1 })).toThrow(CoefficientUnsetError);
    expect(composeEdges(first, second).coefficientUnset).toBeUndefined();
  });

  it('carries the even inputs, the count exponents of the remaining sources, and the aliases', () => {
    const composed = composeEdges(
      { ...first, evenInputs: ['x'], aliases: { x: ['X'] } },
      { ...second, evenInputs: ['intermediate', 'w'], formulaFactors: { w: 1 }, aliases: { w: ['W'], intermediate: ['I'] } },
    );
    expect(composed.evenInputs).toEqual(['x', 'w']);
    expect(composed.formulaFactors).toEqual({ w: 1 });
    expect(composed.aliases).toEqual({ x: ['X'], w: ['W'] });
    expect(evaluateEdge(composed, { X: 3, W: 5 })).toBe(30);
  });

  it('carries a symbolic form when both operands have one, equal to the numeric evaluator', () => {
    // A dimensionally consistent pair: x [mass] → doubled [mass] → doubled·w [mass].
    const doubled = q('doubled', MASS);
    const firstS = edge({
      id: 'firstS',
      sources: [q('x', MASS)],
      target: doubled,
      evaluate: (i) => i['x'] * 2,
      symbolic: { kind: 'op', op: '*', args: [sym('2', DIMENSIONLESS), sym('x', MASS)] },
    });
    const secondS = edge({
      id: 'secondS',
      sources: [doubled, q('w')],
      target: q('scaled', MASS),
      evaluate: (i) => i['doubled'] * i['w'],
      symbolic: { kind: 'op', op: '*', args: [sym('doubled', MASS), sym('w', DIMENSIONLESS)] },
    });
    const composed = composeEdges(firstS, secondS);
    expect(composed.symbolic).toBeDefined();
    expect(evalExpr(composed.symbolic!, { x: 3, w: 5 })).toBe(composed.evaluate({ x: 3, w: 5 }));
    // A numeric-only operand leaves the composite numeric-only.
    expect(composeEdges({ ...firstS, symbolic: undefined }, secondS).symbolic).toBeUndefined();
  });

  it('removes the junction by position, so a source object listed twice loses one slot, not both', () => {
    // After a 'shared' disposition the same Quantity object can sit twice in `sources`.
    const twice = edge({ ...second, id: 'twice', sources: [inter, inter], evaluate: (i) => i['intermediate'] });
    const composed = composeEdges(first, twice);
    expect(composed.sources.map((s) => s.name)).toEqual(['x', 'intermediate']);
  });
});

describe('SOURCE_ALIAS_DISPOSITIONS (9.0.0 audit §4 C8)', () => {
  it('every registered disposition keys a composition that reaches the alias gate', () => {
    // A key no composition can reach is a recorded judgment that is never applied.
    const edges = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];
    for (const key of Object.keys(SOURCE_ALIAS_DISPOSITIONS)) {
      const [firstId, secondId] = key.split('>>');
      const a = edges.find((e) => e.id === firstId);
      const b = edges.find((e) => e.id === secondId);
      expect(a, key).toBeDefined();
      expect(b, key).toBeDefined();
      expect(() => composeEdges(a!, b!), key).not.toThrow(CompositionJunctionError);
    }
  });
});

describe('REGISTERED_COMPOSITION_IDS is checked against the graph it describes (9.0.0 audit §4 Low)', () => {
  // The CT-* set is a pre-registration (v0.10.0) with no data home to derive it from, so the
  // literal stays, and this guard binds every id to a composition the catalog graph can form.
  it('each registered id composes over CATALOG_GRAPH', () => {
    for (const key of REGISTERED_COMPOSITION_IDS) {
      const [firstId, secondId] = key.split('>>');
      const a = CATALOG_GRAPH.find((e) => e.id === firstId);
      const b = CATALOG_GRAPH.find((e) => e.id === secondId);
      expect(a, key).toBeDefined();
      expect(b, key).toBeDefined();
      expect(composeEdges(a!, b!).id, key).toBe(key);
    }
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
