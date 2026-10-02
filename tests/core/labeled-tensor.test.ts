/**
 * Tests for `src/core/labeled-tensor.ts` — v0.7-p1 Phase 2 + Phase 3.
 *
 * Covers:
 *   - Construction guard (rank vs label count)
 *   - Identity contraction (shared id → contracted)
 *   - Non-identity contraction (distinct names → outer product)
 *   - Same name and unequal ids → IndexNameMismatchError naming both ids
 *   - transpose passthrough (key-permutation drives engine.transpose)
 *   - reshape rank-preservation guard
 *   - AxisMismatchError, IdentityConflictError, RankPreservationError
 *   - Triple-contraction rejection (Eve red-team carry-forward)
 *
 * Engine-agnostic conformance: runs against Float64ReferenceEngine.
 * MathTSEngine is gated on the optional dep and tested separately
 * (skipped here if @danielsimonjr/mathts-tensor is unavailable).
 *
 * @module tests/core/labeled-tensor
 */

import { describe, it, expect } from 'vitest';
import {
  LabeledTensor,
  LabeledTensorConstructionError,
  AxisMismatchError,
  IdentityConflictError,
  IndexNameMismatchError,
  RankPreservationError,
  canonicalLabelOrder,
} from '../../src/core/labeled-tensor.js';
import { Axes } from '../../src/core/axes-registry.js';
import { makeIndex } from '../../src/core/universal-index.js';
import { Float64ReferenceEngine } from '../../src/numerical/float64-engine.js';

const engine = new Float64ReferenceEngine();

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe('LabeledTensor construction', () => {
  it('builds a wrapper when label count matches rank', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,
      j: Axes.scale.classical,
    });
    expect(lt.tensor).toBe(t);
    expect(lt.engine).toBe(engine);
    expect(Object.keys(lt.labels)).toHaveLength(2);
  });

  it('throws LabeledTensorConstructionError when label count != rank', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    expect(() => new LabeledTensor(t, engine, { i: Axes.scale.quantum })).toThrow(
      LabeledTensorConstructionError,
    );
  });

  it('throws with both counts in the error message', () => {
    const t = engine.fromNested([1, 2], [2]);
    try {
      new LabeledTensor(t, engine, {
        i: Axes.scale.quantum,
        j: Axes.scale.classical,
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LabeledTensorConstructionError);
      if (e instanceof LabeledTensorConstructionError) {
        expect(e.labelCount).toBe(2);
        expect(e.tensorRank).toBe(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Identity contraction (the highest-stakes commit, mid-cycle review)
// ---------------------------------------------------------------------------

describe('LabeledTensor.contract — identity match', () => {
  it('contracts two rank-2 tensors sharing one axis identity', () => {
    // a[i,j] @ b[j,k] = c[i,k]  where j carries Axes.scale.quantum
    const a = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { i: Axes.force.gravitational, j: Axes.scale.quantum },
    );
    const b = new LabeledTensor(
      engine.fromNested([[5, 6], [7, 8]], [2, 2]),
      engine,
      { j: Axes.scale.quantum, k: Axes.force.electromagnetic },
    );
    const c = a.contract(b);
    expect(c.tensor.shape).toEqual([2, 2]);
    // Result should be the matrix product:
    // [[1*5+2*7, 1*6+2*8], [3*5+4*7, 3*6+4*8]] = [[19,22],[43,50]]
    const nested = engine.toNested(c.tensor) as number[][];
    expect(nested[0][0]).toBeCloseTo(19);
    expect(nested[0][1]).toBeCloseTo(22);
    expect(nested[1][0]).toBeCloseTo(43);
    expect(nested[1][1]).toBeCloseTo(50);
  });

  it('drops the contracted label from the result', () => {
    const a = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { i: Axes.force.gravitational, j: Axes.scale.quantum },
    );
    const b = new LabeledTensor(
      engine.fromNested([[5, 6], [7, 8]], [2, 2]),
      engine,
      { j: Axes.scale.quantum, k: Axes.force.electromagnetic },
    );
    const c = a.contract(b);
    // j was the contracted axis; should NOT appear in result labels.
    const ids = Object.values(c.labels).map((l) => l.id);
    expect(ids).not.toContain(Axes.scale.quantum.id);
    expect(ids).toContain(Axes.force.gravitational.id);
    expect(ids).toContain(Axes.force.electromagnetic.id);
  });

  it('preserves both free axes when nothing is shared (outer product)', () => {
    const a = new LabeledTensor(
      engine.fromNested([1, 2], [2]),
      engine,
      { i: Axes.scale.quantum },
    );
    const b = new LabeledTensor(
      engine.fromNested([3, 4, 5], [3]),
      engine,
      { j: Axes.scale.classical }, // DIFFERENT id from a's i
    );
    const c = a.contract(b);
    // Outer product: 2 × 3 = 6 elements; rank 2.
    expect(c.tensor.shape).toEqual([2, 3]);
    expect(Object.keys(c.labels)).toHaveLength(2);
  });

  it('two distinct makeIndex calls with the same name throw and name both ids', () => {
    const i1 = makeIndex('scale', 'quantum');
    const i2 = makeIndex('scale', 'quantum');
    expect(i1.id).not.toBe(i2.id);
    const a = new LabeledTensor(
      engine.fromNested([1, 2], [2]),
      engine,
      { i: i1 },
    );
    const b = new LabeledTensor(
      engine.fromNested([3, 4], [2]),
      engine,
      { j: i2 },
    );
    expect(() => a.contract(b)).toThrow(IndexNameMismatchError);
    try {
      a.contract(b);
      expect.fail('same name and unequal id must throw');
    } catch (e) {
      expect(e).toBeInstanceOf(IndexNameMismatchError);
      if (e instanceof IndexNameMismatchError) {
        expect(e.message).toContain(i1.id);
        expect(e.message).toContain(i2.id);
        expect(e.indexName).toBe('quantum');
      }
    }
  });

  it('a matrix–vector product on two makeIndex calls named j names both ids and does not outer-product', () => {
    const jLeft = makeIndex('dimension', 'j');
    const jRight = makeIndex('dimension', 'j');
    const matrix = new LabeledTensor(
      engine.fromNested([[100, 20], [30, 40]], [2, 2]),
      engine,
      { i: makeIndex('dimension', 'i'), j: jLeft },
    );
    const vector = new LabeledTensor(
      engine.fromNested([10, -5], [2]),
      engine,
      { j: jRight },
    );
    expect(() => matrix.contract(vector)).toThrow(IndexNameMismatchError);
    try {
      matrix.contract(vector);
    } catch (e) {
      expect(e).toBeInstanceOf(IndexNameMismatchError);
      if (e instanceof IndexNameMismatchError) {
        expect(e.ids).toEqual(expect.arrayContaining([jLeft.id, jRight.id]));
        expect(e.message).toContain(jLeft.id);
        expect(e.message).toContain(jRight.id);
      }
    }
    const contracted = matrix.contract(new LabeledTensor(
      engine.fromNested([10, -5], [2]),
      engine,
      { j: jLeft },
    ));
    expect([...contracted.axisOrder]).toEqual(['i']);
    expect(engine.toNested(contracted.tensor)).toEqual([900, 100]);
  });
});

// ---------------------------------------------------------------------------
// transpose passthrough
// ---------------------------------------------------------------------------

describe('LabeledTensor.transpose', () => {
  it('reorders axes per the given key permutation', () => {
    const t = engine.fromNested([[1, 2, 3], [4, 5, 6]], [2, 3]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,    // axis 0 in canonical (sorted) order: 'i' before 'j'
      j: Axes.scale.classical,  // axis 1
    });
    // Canonical order: ['i', 'j']. Transpose to ['j', 'i']: shape [3, 2].
    const transposed = lt.transpose(['j', 'i']);
    expect(transposed.tensor.shape).toEqual([3, 2]);
  });

  it('throws when the key list size mismatches rank', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,
      j: Axes.scale.classical,
    });
    expect(() => lt.transpose(['i'])).toThrow();
  });

  it('throws when a key is not in labels', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,
      j: Axes.scale.classical,
    });
    expect(() => lt.transpose(['i', 'unknown'] as unknown as ['i', 'j'])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// reshape rank-preservation
// ---------------------------------------------------------------------------

describe('LabeledTensor.reshape', () => {
  it('allows same-rank size change', () => {
    const t = engine.fromNested([[1, 2, 3], [4, 5, 6]], [2, 3]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,
      j: Axes.scale.classical,
    });
    const reshaped = lt.reshape([3, 2]);
    expect(reshaped.tensor.shape).toEqual([3, 2]);
  });

  it('throws RankPreservationError on rank-changing reshape', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    const lt = new LabeledTensor(t, engine, {
      i: Axes.scale.quantum,
      j: Axes.scale.classical,
    });
    expect(() => lt.reshape([4])).toThrow(RankPreservationError);
    expect(() => lt.reshape([2, 2, 1])).toThrow(RankPreservationError);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — error surface
// ---------------------------------------------------------------------------

describe('LabeledTensor.contract — Phase 3 error surface', () => {
  it('throws IdentityConflictError when the same id appears free on both sides', () => {
    // Both operands have a FREE label with Axes.scale.quantum (no contraction).
    // Wait — if both operands list Axes.scale.quantum, that's a SHARED id and
    // contraction fires. To trigger IdentityConflictError, we need a 3+ way
    // collision. Easiest: same id on 3 sites total (2 in one operand, 1 in
    // the other). But labels record uses unique keys, so two label keys
    // in ONE operand pointing to the same UniversalIndex object is what we want.
    const a = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { i: Axes.scale.quantum, j: Axes.scale.quantum }, // SAME id, twice
    );
    const b = new LabeledTensor(
      engine.fromNested([5, 6], [2]),
      engine,
      { k: Axes.scale.quantum },
    );
    // 3 occurrences of Axes.scale.quantum across the two operands; rejected.
    expect(() => a.contract(b)).toThrow(IdentityConflictError);
  });

  it('throws AxisMismatchError when a shared id has different axis discriminators', () => {
    // Forge two off-registry indices with the same id but different axes.
    // We can't reach the brand cast normally — use makeIndex twice and
    // then patch the second's id to match. This is the kind of mis-use
    // the guard defends against.
    const scaleIdx = makeIndex('scale', 'quantum');
    const forceIdx = makeIndex('force', 'electromagnetic');
    // Force same id on both:
    const forceIdxPatched = { ...forceIdx, id: scaleIdx.id };
    const a = new LabeledTensor(
      engine.fromNested([1, 2], [2]),
      engine,
      { i: scaleIdx },
    );
    const b = new LabeledTensor(
      engine.fromNested([3, 4], [2]),
      engine,
      { j: forceIdxPatched },
    );
    expect(() => a.contract(b)).toThrow(AxisMismatchError);
  });

  it('throws on engine mismatch', () => {
    const other = new Float64ReferenceEngine();
    const a = new LabeledTensor(
      engine.fromNested([1, 2], [2]),
      engine,
      { i: Axes.scale.quantum },
    );
    const b = new LabeledTensor(
      other.fromNested([3, 4], [2]),
      other,
      { j: Axes.scale.classical },
    );
    expect(() => a.contract(b)).toThrow(/engine mismatch/);
  });
});

// ---------------------------------------------------------------------------
// canonicalLabelOrder
// ---------------------------------------------------------------------------

describe('canonicalLabelOrder', () => {
  it('returns keys in lexicographic order regardless of insertion order', () => {
    const labels = {
      zeta: Axes.scale.quantum,
      alpha: Axes.scale.classical,
      mu: Axes.scale.mesoscopic,
    };
    expect(canonicalLabelOrder(labels)).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('returns the same order across two equivalent input objects', () => {
    const a = { i: Axes.scale.quantum, j: Axes.force.weak };
    const b = { j: Axes.force.weak, i: Axes.scale.quantum };
    expect(canonicalLabelOrder(a)).toEqual(canonicalLabelOrder(b));
  });
});
