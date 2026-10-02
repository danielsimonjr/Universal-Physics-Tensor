/**
 * v0.14 — `LabeledTensor.mergeAxes` / `splitAxis` (rank-changing reshape).
 *
 * Built on the explicit `axisOrder` invariant: axes are addressed in ENGINE-AXIS
 * space via `axisOf`, so `mergeAxes` fuses a contiguous run of ENGINE axes (not
 * sorted-key positions) — correct even on a transposed tensor.
 *
 * Design: docs/planning/v0.14-MergeAxes-SplitAxis-Design.md (engine-axis-space,
 * post-prerequisite). Adam MUST-FIX #2/#3/#5/#6 folded.
 */
import { describe, it, expect } from 'vitest';
import {
  LabeledTensor,
  AxisMergeError,
  AxisSplitError,
} from '../../src/core/labeled-tensor.js';
import { Axes } from '../../src/core/axes-registry.js';
import { makeIndex } from '../../src/core/universal-index.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const engine = new MathTSEngine();
const merged = (name: string) => makeIndex('scale', name);

// A 2×2×2 tensor with identifiable row-major data 0..7.
function cube() {
  return new LabeledTensor(
    engine.fromNested([[[0, 1], [2, 3]], [[4, 5], [6, 7]]], [2, 2, 2]),
    engine,
    { i: Axes.force.gravitational, j: Axes.scale.quantum, k: Axes.scale.classical },
  );
}

describe('mergeAxes', () => {
  it('fuses two adjacent engine axes, preserving row-major data', () => {
    const m = cube().mergeAxes(['i', 'j'], { key: 'ij', index: merged('ij') });
    expect(m.tensor.shape).toEqual([4, 2]);
    expect(m.axisOrder).toEqual(['ij', 'k']);
    expect(m.axisOf('ij')).toBe(0);
    expect(m.axisOf('k')).toBe(1);
    expect(Object.keys(m.labels).sort()).toEqual(['ij', 'k']);
    expect(engine.toNested(m.tensor)).toEqual([[0, 1], [2, 3], [4, 5], [6, 7]]);
  });

  it('fuses the trailing pair too (j,k)', () => {
    const m = cube().mergeAxes(['j', 'k'], { key: 'jk', index: merged('jk') });
    expect(m.tensor.shape).toEqual([2, 4]);
    expect(m.axisOrder).toEqual(['i', 'jk']);
    expect(engine.toNested(m.tensor)).toEqual([[0, 1, 2, 3], [4, 5, 6, 7]]);
  });

  it('key order does not matter (set semantics): [j,i] merges the same run as [i,j]', () => {
    const m = cube().mergeAxes(['j', 'i'], { key: 'ij', index: merged('ij') });
    expect(m.tensor.shape).toEqual([4, 2]);
    expect(engine.toNested(m.tensor)).toEqual([[0, 1], [2, 3], [4, 5], [6, 7]]);
  });

  it('works on a TRANSPOSED tensor via engine-axis contiguity (Adam MUST-FIX #3)', () => {
    // 2×3×4, transpose to engine order [k,i,j] (shape 4×2×3); i,j are now engine
    // positions 1,2 — contiguous — so mergeAxes(['i','j']) fuses the 2×3 run.
    const nested: number[][][] = [];
    for (let i = 0; i < 2; i++) {
      nested[i] = [];
      for (let j = 0; j < 3; j++) {
        nested[i][j] = [];
        for (let kk = 0; kk < 4; kk++) nested[i][j][kk] = i * 100 + j * 10 + kk;
      }
    }
    const lt = new LabeledTensor(engine.fromNested(nested, [2, 3, 4]), engine, {
      i: Axes.force.gravitational, j: Axes.scale.quantum, k: Axes.scale.classical,
    });
    const t = lt.transpose(['k', 'i', 'j']); // shape [4,2,3], axisOrder [k,i,j]
    const m = t.mergeAxes(['i', 'j'], { key: 'ij', index: merged('ij') });
    expect(m.tensor.shape).toEqual([4, 6]);
    expect(m.axisOrder).toEqual(['k', 'ij']);
    // and merging non-engine-adjacent keys (k,j → positions 0,2) throws
    expect(() => t.mergeAxes(['k', 'j'], { key: 'kj', index: merged('kj') })).toThrow(AxisMergeError);
  });

  it('rejects malformed requests', () => {
    const c = cube();
    expect(() => c.mergeAxes(['i'], { key: 'x', index: merged('x') })).toThrow(/at least 2 keys/);
    expect(() => c.mergeAxes(['i', 'nope'], { key: 'x', index: merged('x') })).toThrow(/not a label key/);
    // i,k are engine positions 0,2 — non-contiguous (j between).
    expect(() => c.mergeAxes(['i', 'k'], { key: 'x', index: merged('x') })).toThrow(/not a contiguous run/);
    // merged key collides with surviving 'k'.
    expect(() => c.mergeAxes(['i', 'j'], { key: 'k', index: merged('k') })).toThrow(/collides with a surviving label key/);
    // merged id collides with surviving axis k's id.
    expect(() => c.mergeAxes(['i', 'j'], { key: 'ij', index: Axes.scale.classical })).toThrow(/collides with surviving axis/);
  });
});

describe('splitAxis', () => {
  it('splits one engine axis into several, preserving row-major data', () => {
    // Start from the merged 4×2, split the 4-axis back into 2×2.
    const m = cube().mergeAxes(['i', 'j'], { key: 'ij', index: merged('ij') });
    const s = m.splitAxis('ij', [
      { key: 'i', index: Axes.force.gravitational, size: 2 },
      { key: 'j', index: Axes.scale.quantum, size: 2 },
    ]);
    expect(s.tensor.shape).toEqual([2, 2, 2]);
    expect(s.axisOrder).toEqual(['i', 'j', 'k']);
    expect(engine.toNested(s.tensor)).toEqual([[[0, 1], [2, 3]], [[4, 5], [6, 7]]]);
  });

  it('rejects malformed requests', () => {
    const c = cube(); // axes i,j,k each size 2
    expect(() => c.splitAxis('nope', [{ key: 'a', index: merged('a'), size: 2 }, { key: 'b', index: merged('b'), size: 1 }])).toThrow(/not a label key/);
    expect(() => c.splitAxis('i', [{ key: 'a', index: merged('a'), size: 2 }])).toThrow(/at least 2 parts/);
    // product 2*2=4 ≠ axis size 2.
    expect(() => c.splitAxis('i', [{ key: 'a', index: merged('a'), size: 2 }, { key: 'b', index: merged('b'), size: 2 }])).toThrow(/multiply to 4 but axis/);
    // non-integer size.
    expect(() => c.splitAxis('i', [{ key: 'a', index: merged('a'), size: 1.5 }, { key: 'b', index: merged('b'), size: 2 }])).toThrow(/positive integer/);
    // part key collides with surviving 'j'.
    expect(() => c.splitAxis('i', [{ key: 'j', index: merged('a'), size: 2 }, { key: 'b', index: merged('b'), size: 1 }])).toThrow(/collides with a surviving label key/);
    // part id collides with surviving axis k.
    expect(() => c.splitAxis('i', [{ key: 'a', index: Axes.scale.classical, size: 2 }, { key: 'b', index: merged('b'), size: 1 }])).toThrow(/collides with surviving axis/);
  });
});

describe('merge ∘ split round-trips (inverse operations)', () => {
  it('merge then split recovers shape, axisOrder, and data', () => {
    const original = cube();
    const round = original
      .mergeAxes(['i', 'j'], { key: 'ij', index: merged('ij') })
      .splitAxis('ij', [
        { key: 'i', index: Axes.force.gravitational, size: 2 },
        { key: 'j', index: Axes.scale.quantum, size: 2 },
      ]);
    expect(round.tensor.shape).toEqual([2, 2, 2]);
    expect(round.axisOrder).toEqual(['i', 'j', 'k']);
    expect(engine.toNested(round.tensor)).toEqual(engine.toNested(original.tensor));
  });

  it('split then merge recovers the original axis', () => {
    const original = cube();
    const round = original
      .splitAxis('i', [
        { key: 'i0', index: merged('i0'), size: 2 },
        { key: 'i1', index: merged('i1'), size: 1 },
      ])
      .mergeAxes(['i0', 'i1'], { key: 'i', index: Axes.force.gravitational });
    expect(round.tensor.shape).toEqual([2, 2, 2]);
    expect(round.axisOrder).toEqual(['i', 'j', 'k']);
    expect(engine.toNested(round.tensor)).toEqual(engine.toNested(original.tensor));
  });
});

describe('edge cases (Eve gap-coverage)', () => {
  it('Y1: two split parts sharing one id throws AxisSplitError', () => {
    // i (size 2) → parts [2,1], both carrying the SAME id — would build a
    // contract-illegal tensor; must throw at the call site.
    expect(() =>
      cube().splitAxis('i', [
        { key: 'a', index: Axes.force.electromagnetic, size: 2 },
        { key: 'b', index: Axes.force.electromagnetic, size: 1 },
      ]),
    ).toThrow(AxisSplitError);
  });

  it('mergeAxes(["i","i"]) throws a duplicate-key error (not a contiguity error)', () => {
    expect(() => cube().mergeAxes(['i', 'i'], { key: 'x', index: merged('x') })).toThrow(/duplicate/);
  });

  it('merges ALL axes into a rank-1 tensor', () => {
    const m = cube().mergeAxes(['i', 'j', 'k'], { key: 'all', index: merged('all') });
    expect(m.tensor.shape).toEqual([8]);
    expect(m.axisOrder).toEqual(['all']);
    expect(engine.toNested(m.tensor)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('merged key may REUSE a consumed axis name', () => {
    const m = cube().mergeAxes(['i', 'j'], { key: 'i', index: merged('i-merged') });
    expect(m.axisOrder).toEqual(['i', 'k']);
    expect(Object.keys(m.labels).sort()).toEqual(['i', 'k']);
  });

  it('uneven split (6 → [2,3]) preserves row-major data', () => {
    const lt = new LabeledTensor(
      engine.fromNested([0, 1, 2, 3, 4, 5], [6]),
      engine,
      { n: Axes.scale.quantum },
    );
    const s = lt.splitAxis('n', [
      { key: 'p', index: merged('p'), size: 2 },
      { key: 'q', index: merged('q'), size: 3 },
    ]);
    expect(s.tensor.shape).toEqual([2, 3]);
    expect(s.axisOrder).toEqual(['p', 'q']);
    expect(engine.toNested(s.tensor)).toEqual([[0, 1, 2], [3, 4, 5]]);
  });

  it('mergeAxes works on a CONTRACT result with a non-sorted axisOrder', () => {
    // Outer product gives axisOrder ['z','a','m'] (free-emission, non-sorted).
    const a = new LabeledTensor(engine.fromNested([1, 2], [2]), engine, { z: Axes.scale.classical });
    const b = new LabeledTensor(
      engine.fromNested([[1, 0], [0, 1]], [2, 2]),
      engine,
      { a: Axes.force.gravitational, m: Axes.scale.quantum },
    );
    const c = a.contract(b);
    expect(c.axisOrder).toEqual(['z', 'a', 'm']); // non-sorted
    // 'a','m' are engine positions 1,2 — contiguous — so the merge fuses them.
    const m = c.mergeAxes(['a', 'm'], { key: 'am', index: merged('am') });
    expect(m.axisOrder).toEqual(['z', 'am']);
    expect(m.tensor.shape).toEqual([2, 4]);
  });
});
