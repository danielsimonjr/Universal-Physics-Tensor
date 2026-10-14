/**
 * v0.8.0 Phase 5 (G-10) — property-based tests for composition laws.
 *
 * Pins the algebra the improvement plan claims: min-confidence is a
 * meet-semilattice (associative, commutative, idempotent, demoting),
 * and composeEdges is associative on randomized compatible 3-chains —
 * (a∘b)∘c and a∘(b∘c) agree numerically and in confidence/kind.
 */
import { describe, it } from 'vitest';
import { validityDomain } from '../../src/composition/edge.js';
import fc from 'fast-check';
import {
  composeEdges,
  minConfidence,
} from '../../src/composition/index.js';
import type {
  BridgeEdge,
  EdgeConfidence,
  Quantity,
} from '../../src/composition/index.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const CONFIDENCES: EdgeConfidence[] = [
  'established',
  'speculative',
  'highly-speculative',
];
const RANK: Record<EdgeConfidence, number> = {
  established: 2,
  speculative: 1,
  'highly-speculative': 0,
};
const arbConfidence = fc.constantFrom(...CONFIDENCES);

describe('minConfidence — meet-semilattice laws (property-based)', () => {
  it('associative, commutative, idempotent', () => {
    fc.assert(
      fc.property(arbConfidence, arbConfidence, arbConfidence, (a, b, c) => {
        return (
          minConfidence(minConfidence(a, b), c) ===
            minConfidence(a, minConfidence(b, c)) &&
          minConfidence(a, b) === minConfidence(b, a) &&
          minConfidence(a, a) === a
        );
      }),
    );
  });

  it('demotes: rank(min(a,b)) = min(rank(a), rank(b)) — never promotes', () => {
    fc.assert(
      fc.property(arbConfidence, arbConfidence, (a, b) => {
        return RANK[minConfidence(a, b)] === Math.min(RANK[a], RANK[b]);
      }),
    );
  });
});

describe('composeEdges — associativity on compatible chains (property-based)', () => {
  const q = (name: string): Quantity => ({
    name,
    symbol: name,
    dim: DIMENSIONLESS,
    attributes: {},
  });

  /** A unary affine edge from quantity `inName` to `outName`. */
  const affineEdge = (
    id: string,
    inName: string,
    outName: string,
    scale: number,
    offset: number,
    confidence: EdgeConfidence,
    kind: 'bridge' | 'law',
  ): BridgeEdge => ({
    id,
    beId: null,
    kind,
    label: id,
    sources: [q(inName)],
    target: q(outName),
    confidence,
    domain: validityDomain(`isFinite(${inName})`, [inName]),
    evaluate: (i) => scale * i[inName] + offset,
    citation: 'synthetic',
  });

  const arbAffine = fc.record({
    scale: fc.integer({ min: -5, max: 5 }),
    offset: fc.integer({ min: -10, max: 10 }),
    confidence: arbConfidence,
    kind: fc.constantFrom<'bridge' | 'law'>('bridge', 'law'),
  });

  it('(a∘b)∘c ≡ a∘(b∘c): same values, confidence, kind, and sources', () => {
    fc.assert(
      fc.property(
        arbAffine,
        arbAffine,
        arbAffine,
        fc.integer({ min: -100, max: 100 }),
        (pa, pb, pc, x) => {
          const a = affineEdge('a', 'q0', 'q1', pa.scale, pa.offset, pa.confidence, pa.kind);
          const b = affineEdge('b', 'q1', 'q2', pb.scale, pb.offset, pb.confidence, pb.kind);
          const c = affineEdge('c', 'q2', 'q3', pc.scale, pc.offset, pc.confidence, pc.kind);
          const left = composeEdges(composeEdges(a, b), c);
          const right = composeEdges(a, composeEdges(b, c));
          return (
            left.evaluate({ q0: x }) === right.evaluate({ q0: x }) &&
            left.confidence === right.confidence &&
            left.kind === right.kind &&
            left.target.name === right.target.name &&
            left.sources.map((s) => s.name).join() ===
              right.sources.map((s) => s.name).join()
          );
        },
      ),
    );
  });
});
