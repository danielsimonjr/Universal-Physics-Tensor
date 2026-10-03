/**
 * v0.14 — `LabeledTensor` explicit axis-order invariant.
 *
 * Fixes the latent desync between engine-axis order and sorted-key order that
 * `transpose` (returned unchanged labels after permuting engine axes) and
 * `contract` (built the result in einsum-free order but mapped via sorted keys)
 * could introduce. The fix is an explicit `axisOrder` field maintained by every
 * operation, with `axisOf(key)` as the safe label→position accessor.
 *
 * Design + Adam (GREEN) + Eve (YELLOW→resolved):
 * docs/planning/v0.14-LabeledTensor-AxisOrder-Design.md.
 *
 * MathTS engine free-axis order is verified only in the gated optional-dep
 * suite; these run against MathTSEngine (the default, verifiable
 * engine). The current `contract` already depends on `spec.free` ordering for
 * both engines, so the fix introduces no new cross-engine assumption.
 */
import { describe, it, expect } from 'vitest';
import { LabeledTensor, AxisOrderError } from '../../src/core/labeled-tensor.js';
import { Axes } from '../../src/core/axes-registry.js';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const engine = new MathTSEngine();

describe('axisOrder — default and explicit', () => {
  it('defaults to sorted key order (backward-compatible)', () => {
    const lt = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { j: Axes.scale.quantum, i: Axes.force.gravitational },
    );
    expect(lt.axisOrder).toEqual(['i', 'j']); // sorted, not insertion order
    expect(lt.axisOf('i')).toBe(0);
    expect(lt.axisOf('j')).toBe(1);
  });

  it('accepts an explicit non-sorted axisOrder', () => {
    const lt = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { i: Axes.force.gravitational, j: Axes.scale.quantum },
      ['j', 'i'],
    );
    expect(lt.axisOrder).toEqual(['j', 'i']);
    expect(lt.axisOf('j')).toBe(0);
    expect(lt.axisOf('i')).toBe(1);
  });

  it('throws AxisOrderError on a non-permutation axisOrder (duplicate / foreign / wrong length)', () => {
    const t = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
    const labels = { i: Axes.force.gravitational, j: Axes.scale.quantum };
    expect(() => new LabeledTensor(t, engine, labels, ['i', 'i'])).toThrow(AxisOrderError);
    expect(() => new LabeledTensor(t, engine, labels, ['i', 'x'])).toThrow(AxisOrderError);
    expect(() => new LabeledTensor(t, engine, labels, ['i'])).toThrow(AxisOrderError);
  });

  it('axisOf throws on an unknown key', () => {
    const lt = new LabeledTensor(engine.fromNested([1, 2], [2]), engine, { i: Axes.scale.quantum });
    expect(() => lt.axisOf('nope')).toThrow(/not a label key/);
  });
});

describe('transpose — maintains a correct non-sorted axisOrder', () => {
  it('reorders axisOrder and the engine tensor consistently (rank-3)', () => {
    // value = i*100 + j*10 + k so each element is identifiable.
    const nested: number[][][] = [];
    for (let i = 0; i < 2; i++) {
      nested[i] = [];
      for (let j = 0; j < 3; j++) {
        nested[i][j] = [];
        for (let k = 0; k < 4; k++) nested[i][j][k] = i * 100 + j * 10 + k;
      }
    }
    const lt = new LabeledTensor(engine.fromNested(nested, [2, 3, 4]), engine, {
      i: Axes.force.gravitational,
      j: Axes.scale.quantum,
      k: Axes.scale.classical,
    });
    const t = lt.transpose(['k', 'i', 'j']);
    expect(t.axisOrder).toEqual(['k', 'i', 'j']);
    expect(t.tensor.shape).toEqual([4, 2, 3]);
    expect(t.axisOf('k')).toBe(0);
    expect(t.axisOf('i')).toBe(1);
    expect(t.axisOf('j')).toBe(2);
    // spot-check data: new[k][i][j] === old[i][j][k]
    const out = engine.toNested(t.tensor) as number[][][];
    expect(out[3][1][2]).toBe(1 * 100 + 2 * 10 + 3); // i=1,j=2,k=3
  });

  it('round-trips: transpose then transpose-back recovers axisOrder + data', () => {
    const lt = new LabeledTensor(engine.fromNested([[1, 2], [3, 4]], [2, 2]), engine, {
      i: Axes.force.gravitational,
      j: Axes.scale.quantum,
    });
    const back = lt.transpose(['j', 'i']).transpose(['i', 'j']);
    expect(back.axisOrder).toEqual(['i', 'j']);
    expect(back.axisOf('i')).toBe(0);
    expect(engine.toNested(back.tensor)).toEqual([[1, 2], [3, 4]]);
  });
});

describe('reshape — passes axisOrder through (MUST-FIX 2)', () => {
  it('preserves a non-sorted axisOrder across a same-rank reshape', () => {
    const lt = new LabeledTensor(
      engine.fromNested([[1, 2], [3, 4]], [2, 2]),
      engine,
      { i: Axes.force.gravitational, j: Axes.scale.quantum },
      ['j', 'i'],
    );
    const r = lt.reshape([4, 1]);
    expect(r.axisOrder).toEqual(['j', 'i']);
  });
});

describe('contract — reads axes via axisOrder, not sorted keys', () => {
  it('KILLER: result axisOrder reflects einsum free-emission order, not sorted keys', () => {
    // a has key 'b' (size 2); b has key 'a' (size 3); distinct ids → outer
    // product. Free-emission order is [b, a]; sorted order would be [a, b].
    const a = new LabeledTensor(engine.fromNested([10, 20], [2]), engine, { b: Axes.scale.quantum });
    const bb = new LabeledTensor(engine.fromNested([1, 2, 3], [3]), engine, { a: Axes.force.gravitational });
    const c = a.contract(bb);
    expect(c.axisOrder).toEqual(['b', 'a']); // NOT sorted ['a','b']
    // axisOf must agree with the actual engine axis sizes.
    expect(c.tensor.shape[c.axisOf('b')]).toBe(2);
    expect(c.tensor.shape[c.axisOf('a')]).toBe(3);
    expect(engine.toNested(c.tensor)).toEqual([[10, 20, 30], [20, 40, 60]]);
  });

  it('transpose-then-contract gives the SAME result as contract without the transpose', () => {
    // This FAILS on the pre-fix code: the old contract mapped a-transposed's
    // labels via sorted keys, reading the wrong (un-transposed) engine axis.
    const a = new LabeledTensor(engine.fromNested([[1, 2], [3, 4]], [2, 2]), engine, {
      i: Axes.force.gravitational,
      j: Axes.scale.quantum,
    });
    const b = new LabeledTensor(engine.fromNested([[5, 6], [7, 8]], [2, 2]), engine, {
      j: Axes.scale.quantum,
      k: Axes.force.electromagnetic,
    });
    const direct = a.contract(b);
    const viaTranspose = a.transpose(['j', 'i']).contract(b);
    expect(engine.toNested(viaTranspose.tensor)).toEqual(engine.toNested(direct.tensor));
    expect(viaTranspose.axisOrder).toEqual(direct.axisOrder);
    // sanity: it really is the matrix product
    expect(engine.toNested(direct.tensor)).toEqual([[19, 22], [43, 50]]);
  });

  it('Y1: key collision suffixes until unique — result keys + axisOrder stay a valid permutation', () => {
    // Both operands use string key 'x' for DIFFERENT ids; a also has 'x_1'.
    const a = new LabeledTensor(engine.fromNested([[1, 2], [3, 4]], [2, 2]), engine, {
      x: Axes.scale.quantum,
      x_1: Axes.scale.classical,
    });
    const b = new LabeledTensor(engine.fromNested([5, 6], [2]), engine, {
      x: Axes.force.gravitational,
    });
    const c = a.contract(b); // all distinct ids → rank-3 outer product
    expect(c.tensor.shape.length).toBe(3);
    const keys = Object.keys(c.labels);
    expect(keys.length).toBe(3);
    expect(new Set(c.axisOrder).size).toBe(3); // no duplicate
    expect([...c.axisOrder].sort()).toEqual([...keys].sort()); // valid permutation
  });
});
