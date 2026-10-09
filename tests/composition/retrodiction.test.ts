/**
 * Retrodiction harness (docs/planning/Retrodiction-Harness-Design-Note.md).
 * Controlled fixtures pin the consistent / inconsistent / single /
 * unrecoverable outcomes, masking (circular self-support), parameter-free
 * edges, and reference scoring; the real-graph block is the PRE-REGISTERED
 * first-run anchor: from {mass: M_sun}, hawking-temperature is over-
 * determined and CONSISTENT (be-42 vs be-42-via-rs agree to float
 * precision), with the solar-mass T_H ≈ 6.17e-8 K external reference.
 */
import { describe, it, expect } from 'vitest';
import {
  retrodict,
  retrodictNode,
  forwardEvaluate,
} from '../../src/composition/retrodiction.js';
import { QUANTITY_IDENTIFICATIONS } from '../../src/composition/compose.js';
import { conventionFactor } from '../../src/dimensional/unit-convention.js';
import { CATALOG_GRAPH, M_SUN_KG } from '../../src/composition/index.js';
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
  evaluate: (i: Record<string, number>) => number,
): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: sourceNames.map(q),
  target: q(targetName),
  confidence: 'established',
  domain: { description: 'any', predicate: () => true },
  evaluate,
  citation: 'synthetic',
});

const NO_IDENTS = { identifications: [] as const };

describe('retrodictNode — relativeSpread is robust to sign cancellation', () => {
  it('opposite-sign predictions give a finite spread (not Infinity from a ~0 mean)', () => {
    // Two derivations of t disagree in sign: +6 and -6. Normalizing the spread
    // by |mean| would divide by ~0 → Infinity; normalizing by max|v| gives the
    // meaningful 12/6 = 2. Either way the verdict is 'inconsistent'.
    const edges = [
      edge('e1', ['x'], 't', (i) => i['x'] * 2),
      edge('e2', ['x'], 't', (i) => i['x'] * -2),
    ];
    const r = retrodictNode(edges, { x: 3 }, 't', NO_IDENTS); // +6 and -6
    expect(Number.isFinite(r.relativeSpread)).toBe(true);
    expect(r.relativeSpread).toBeCloseTo(2, 12);
    expect(r.outcome).toBe('inconsistent');
  });
});

describe('unit-convention copy', () => {
  it('scales a bit into nats and leaves a same-convention identification at 1', () => {
    const scaled = forwardEvaluate([], { 'intrinsic-information': 1 }, [
      { from: 'intrinsic-information', to: 'subsystem-entanglement-entropy', rationale: 'bits to nats' },
    ]);
    expect(scaled.get('subsystem-entanglement-entropy')).toBeCloseTo(Math.LN2, 12);
    const same = forwardEvaluate([], { 'hawking-temperature': 5 }, [
      { from: 'hawking-temperature', to: 'temperature', rationale: 'same kelvin' },
    ]);
    expect(same.get('temperature')).toBe(5);
    for (const id of QUANTITY_IDENTIFICATIONS) expect(conventionFactor(id.from, id.to)).toBe(1);
  });

  it('refuses to copy a bit onto an entropy in J/K', () => {
    expect(() =>
      forwardEvaluate([], { 'intrinsic-information': 1 }, [
        { from: 'intrinsic-information', to: 'wormhole-entanglement-entropy', rationale: 'different dimension' },
      ]),
    ).toThrow(/dimensions differ/);
  });

  it('does not copy an identification whose unit conversion overflows', () => {
    const values = forwardEvaluate(
      [],
      { 'subsystem-entanglement-entropy': Number.MAX_VALUE },
      [
        {
          from: 'subsystem-entanglement-entropy',
          to: 'intrinsic-information',
          rationale: 'nats to bits',
        },
      ],
    );
    expect(values.has('intrinsic-information')).toBe(false);
  });
});

describe('forwardEvaluate — seed validation', () => {
  it('throws on a non-finite ground-truth seed (NaN / ∞)', () => {
    const edges = [edge('e1', ['a'], 't', (i) => i['a'] * 2)];
    expect(() => forwardEvaluate(edges, { a: NaN }, [])).toThrow(/finite/i);
    expect(() => forwardEvaluate(edges, { a: Infinity }, [])).toThrow(/finite/i);
  });

  it('accepts a finite seed and propagates it through the graph', () => {
    const edges = [edge('e1', ['a'], 't', (i) => i['a'] * 2)];
    const values = forwardEvaluate(edges, { a: 3 }, []);
    expect(values.get('t')).toBe(6);
  });
});

describe('retrodictNode — controlled fixtures', () => {
  it('consistent: two derivations agree within tolerance', () => {
    const edges = [
      edge('e1', ['a'], 't', (i) => i['a'] * 2),
      edge('e2', ['b'], 't', (i) => i['b'] * 3),
    ];
    const r = retrodictNode(edges, { a: 3, b: 2 }, 't', NO_IDENTS); // 6 and 6
    expect(r.outcome).toBe('consistent');
    expect(r.predictions.map((p) => p.value)).toEqual([6, 6]);
    expect(r.relativeSpread).toBeCloseTo(0, 12);
    expect(r.pass).toBe(true);
  });

  it('inconsistent: two derivations disagree — the falsification signal', () => {
    const edges = [
      edge('e1', ['a'], 't', (i) => i['a'] * 2), // 6
      edge('e2', ['b'], 't', (i) => i['b'] * 1), // 2
    ];
    const r = retrodictNode(edges, { a: 3, b: 2 }, 't', NO_IDENTS);
    expect(r.outcome).toBe('inconsistent');
    expect(r.relativeSpread).toBeGreaterThan(0.5);
    expect(r.pass).toBe(false);
  });

  it('single: one derivation fired — recovered, no cross-check', () => {
    const edges = [edge('e1', ['a'], 't', (i) => i['a'] * 2)];
    const r = retrodictNode(edges, { a: 3 }, 't', NO_IDENTS);
    expect(r.outcome).toBe('single');
    expect(r.predictions).toHaveLength(1);
    expect(r.pass).toBe(true);
  });

  it('unrecoverable: no derivation fires from the ground truth', () => {
    const edges = [edge('e1', ['c'], 't', (i) => i['c'] * 2)];
    const r = retrodictNode(edges, { a: 3 }, 't', NO_IDENTS);
    expect(r.outcome).toBe('unrecoverable');
    expect(r.predictions).toEqual([]);
  });

  it('masks the target: a circular derivation cannot read it back', () => {
    // a->t (e1) and t->b->t (e2,e3). e3 would "agree" trivially if t were
    // read back; masking removes both edges into t, so b is unavailable
    // and only e1 fires → single, not a fake consistent.
    const edges = [
      edge('e1', ['a'], 't', (i) => i['a'] * 2),
      edge('e2', ['t'], 'b', (i) => i['t']),
      edge('e3', ['b'], 't', (i) => i['b']),
    ];
    const r = retrodictNode(edges, { a: 3 }, 't', NO_IDENTS);
    expect(r.outcome).toBe('single');
    expect(r.predictions.map((p) => p.edge)).toEqual(['e1']);
  });

  it('parameter-free edge fires unconditionally', () => {
    const edges = [
      edge('konst', [], 't', () => 42),
      edge('e2', ['b'], 't', (i) => i['b']),
    ];
    const r = retrodictNode(edges, { b: 42 }, 't', NO_IDENTS);
    expect(r.outcome).toBe('consistent');
    expect(r.predictions.map((p) => p.value)).toEqual([42, 42]);
  });

  it('reference scoring against an external value', () => {
    const edges = [edge('e1', ['a'], 't', (i) => i['a'] * 2)];
    const r = retrodictNode(edges, { a: 3 }, 't', {
      identifications: [],
      references: { t: 6.0 },
      referenceTolerance: 1e-3,
    });
    expect(r.referenceValue).toBe(6.0);
    expect(r.referenceRelError).toBeCloseTo(0, 12);
    expect(r.referencePass).toBe(true);
  });
});

const FULL_GRAPH = CATALOG_GRAPH;

describe('retrodiction — pre-registered {mass: M_sun} anchor', () => {
  it('hawking-temperature is over-determined and CONSISTENT (be-42 vs be-42-via-rs)', () => {
    const r = retrodictNode(FULL_GRAPH, { mass: M_SUN_KG }, 'hawking-temperature');
    expect(r.outcome).toBe('consistent');
    expect(new Set(r.predictions.map((p) => p.edge))).toEqual(
      new Set(['be-42', 'be-42-via-rs']),
    );
    // the two independent encodings agree far tighter than the 1e-6 bar
    expect(r.relativeSpread).toBeLessThan(1e-9);
    expect(r.pass).toBe(true);
  });

  it('recovers the solar-mass Hawking temperature against the textbook value', () => {
    const r = retrodictNode(
      FULL_GRAPH,
      { mass: M_SUN_KG },
      'hawking-temperature',
      { references: { 'hawking-temperature': 6.17e-8 } },
    );
    expect(r.referencePass).toBe(true);
    expect(r.referenceValue).toBe(6.17e-8);
    expect(r.referenceRelError).toBeLessThan(1e-3);
  });

  it('the sweep reports allConsistent over the full graph from {mass}', () => {
    const report = retrodict(FULL_GRAPH, { mass: M_SUN_KG });
    expect(report.allConsistent).toBe(true);
    expect(report.inconsistent).toBe(0);
    expect(report.checked).toBeGreaterThanOrEqual(1);
    const ht = report.results.find((x) => x.target === 'hawking-temperature');
    expect(ht?.outcome).toBe('consistent');
  });
});

describe('an evaluator error keeps its kind (9.0.0 audit §4 C6)', () => {
  // `forwardEvaluate` once swallowed every error as "the edge did not fire",
  // so a programming error (a TypeError in an evaluator) read as a quiet
  // non-derivation, and an unset coefficient read the same as a domain miss.
  const q = (name: string): Quantity => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });
  const mk = (id: string, sources: string[], target: string, evaluate: (i: Record<string, number>) => number, over: Partial<BridgeEdge> = {}): BridgeEdge => ({
    id,
    beId: null,
    kind: 'bridge',
    label: id,
    sources: sources.map(q),
    target: q(target),
    confidence: 'speculative',
    domain: { description: 'any', predicate: () => true },
    evaluate,
    citation: 'synthetic',
    ...over,
  });

  it('forwardEvaluate rethrows a TypeError from an evaluator instead of reporting the edge as not fired', () => {
    const edges = [mk('broken', ['x'], 'y', () => { throw new TypeError('evaluator bug'); })];
    expect(() => forwardEvaluate(edges, { x: 1 }, [])).toThrow(TypeError);
  });

  it('forwardEvaluate skips a domain miss and an unset coefficient: the edge does not fire, nothing else is said', () => {
    const edges = [
      mk('outside', ['x'], 'y', (i) => i['x'] * 2, { domain: { description: 'x < 0', predicate: (i) => i['x'] < 0 } }),
      mk('unset', ['x'], 'z', (i) => i['x'] * 3, { coefficientUnset: true }),
    ];
    const values = forwardEvaluate(edges, { x: 1 }, []);
    expect(values.has('y')).toBe(false);
    expect(values.has('z')).toBe(false);
  });

  it('retrodictNode rethrows a TypeError and records a domain miss or an unset coefficient as a refusal', () => {
    const broken = [mk('a', ['x'], 't', (i) => i['x']), mk('b', ['x'], 't', () => { throw new TypeError('evaluator bug'); })];
    expect(() => retrodictNode(broken, { x: 1 }, 't', { identifications: [] })).toThrow(TypeError);
    const unset = [mk('a', ['x'], 't', (i) => i['x']), mk('b', ['x'], 't', (i) => i['x'], { coefficientUnset: true })];
    const r = retrodictNode(unset, { x: 1 }, 't', { identifications: [] });
    expect(r.predictions.map((p) => p.edge)).toEqual(['a']);
    expect(r.refusals).toBeDefined();
    expect(r.refusals!.map((f) => f.edge)).toEqual(['b']);
  });
});
