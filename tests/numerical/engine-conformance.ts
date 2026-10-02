/**
 * Parameterized TensorEngine conformance suite. Both MathTSEngine
 * and MathTSEngine must pass this identical suite — it is the contract that
 * makes the two-repo parallel development safe (v0.3.5-Design.md §9).
 *
 * Not a *.test.ts file: it exports a function that an engine's own
 * *.test.ts wraps. `tier` lets an engine opt into a subset while it is
 * still being built (Task 4 runs 'core'; Task 5 + Task 11 run 'full').
 */
import { describe, it, expect } from 'vitest';
import type { TensorEngine } from '../../src/numerical/tensor-engine.js';

export type ConformanceTier = 'core' | 'full';

export function runEngineConformance(
  makeEngine: () => TensorEngine,
  tier: ConformanceTier = 'full',
): void {
  const e = makeEngine();

  describe(`[${e.name}] core: construction + elementwise`, () => {
    it('fromNested / toNested round-trips a rank-2 tensor', () => {
      const t = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      expect(t.shape).toEqual([2, 2]);
      expect(e.toNested(t)).toEqual([[1, 2], [3, 4]]);
    });

    it('fromNested / toNested round-trips a rank-0 scalar', () => {
      const t = e.fromNested(7, []);
      expect(t.shape).toEqual([]);
      expect(e.toNested(t)).toBe(7);
    });

    it('add / sub / mul are elementwise', () => {
      const a = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      const b = e.fromNested([[5, 6], [7, 8]], [2, 2]);
      expect(e.toNested(e.add(a, b))).toEqual([[6, 8], [10, 12]]);
      expect(e.toNested(e.sub(b, a))).toEqual([[4, 4], [4, 4]]);
      expect(e.toNested(e.mul(a, b))).toEqual([[5, 12], [21, 32]]);
    });

    it('scale multiplies every component', () => {
      const a = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      expect(e.toNested(e.scale(a, 10))).toEqual([[10, 20], [30, 40]]);
    });

    it('identity(3) is the 3×3 identity', () => {
      expect(e.toNested(e.identity(3))).toEqual([
        [1, 0, 0], [0, 1, 0], [0, 0, 1],
      ]);
    });

    it('normInf is the max absolute component', () => {
      const a = e.fromNested([[-1, 2], [3, -9]], [2, 2]);
      expect(e.normInf(a)).toBe(9);
    });
  });

  if (tier === 'core') return;

  describe(`[${e.name}] full: tensor ops`, () => {
    it('matMul multiplies 2×2 matrices', () => {
      const a = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      const b = e.fromNested([[5, 6], [7, 8]], [2, 2]);
      expect(e.toNested(e.matMul(a, b))).toEqual([[19, 22], [43, 50]]);
    });

    it('transpose with default perm reverses axes', () => {
      const a = e.fromNested([[1, 2, 3], [4, 5, 6]], [2, 3]);
      expect(e.toNested(e.transpose(a))).toEqual([[1, 4], [2, 5], [3, 6]]);
    });

    it('reshape preserves row-major order', () => {
      const a = e.fromNested([[1, 2, 3], [4, 5, 6]], [2, 3]);
      expect(e.toNested(e.reshape(a, [3, 2]))).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('einsum contracts a matrix-vector product (A_ij v_j -> w_i)', () => {
      const A = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      const v = e.fromNested([10, 20], [2]);
      const spec = {
        contractions: [{ pair: [[0, 1], [1, 0]] as const }],
        free: [{ operand: 0, axis: 0 }],
      };
      expect(e.toNested(e.einsum(spec, A, v))).toEqual([50, 110]);
    });

    it('einsum traces a matrix (A_ii -> scalar)', () => {
      const A = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      const spec = {
        contractions: [{ pair: [[0, 0], [0, 1]] as const }],
        free: [],
      };
      expect(e.toNested(e.einsum(spec, A))).toBe(5);
    });

    it('einsum identity: g^{ij} g_{jk} = delta^i_k for a diagonal metric', () => {
      const gInv = e.fromNested([[0.5, 0], [0, 0.25]], [2, 2]);
      const g = e.fromNested([[2, 0], [0, 4]], [2, 2]);
      const spec = {
        contractions: [{ pair: [[0, 1], [1, 0]] as const }],
        free: [{ operand: 0, axis: 0 }, { operand: 1, axis: 1 }],
      };
      const delta = e.einsum(spec, gInv, g);
      expect(e.toNested(delta)).toEqual([[1, 0], [0, 1]]);
    });

    it('einsum is associative: (A B) C = A (B C)', () => {
      const A = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      const B = e.fromNested([[2, 0], [1, 2]], [2, 2]);
      const C = e.fromNested([[1, 1], [0, 1]], [2, 2]);
      expect(e.toNested(e.matMul(e.matMul(A, B), C)))
        .toEqual(e.toNested(e.matMul(A, e.matMul(B, C))));
    });

    it('einsum outer product (no contractions): u_i v_j -> M_ij', () => {
      const u = e.fromNested([1, 2], [2]);
      const v = e.fromNested([10, 20, 30], [3]);
      const spec = {
        contractions: [],
        free: [{ operand: 0, axis: 0 }, { operand: 1, axis: 0 }],
      };
      expect(e.toNested(e.einsum(spec, u, v)))
        .toEqual([[10, 20, 30], [20, 40, 60]]);
    });

    it('einsum multi-tensor full contraction A_ij B^jk C_ki -> scalar', () => {
      // Each operand is fully contracted against the OTHERS (no free axes).
      // This is the case finding #2 was concerned about — verify it directly.
      const A = e.fromNested([[1, 0], [0, 1]], [2, 2]); // identity
      const B = e.fromNested([[2, 0], [0, 3]], [2, 2]);
      const C = e.fromNested([[1, 0], [0, 1]], [2, 2]); // identity
      // i: A.axis0 <-> C.axis1 ; j: A.axis1 <-> B.axis0 ; k: B.axis1 <-> C.axis0
      const spec = {
        contractions: [
          { pair: [[0, 0], [2, 1]] as const },
          { pair: [[0, 1], [1, 0]] as const },
          { pair: [[1, 1], [2, 0]] as const },
        ],
        free: [],
      };
      // A_ij B^jk C_ki = tr(A B C) = tr(B) = 2 + 3 = 5
      expect(e.toNested(e.einsum(spec, A, B, C))).toBe(5);
    });

    it('einsum pure permutation (transpose via einsum) M_ij -> M_ji', () => {
      const M = e.fromNested([[1, 2, 3], [4, 5, 6]], [2, 3]);
      const spec = {
        contractions: [],
        free: [{ operand: 0, axis: 1 }, { operand: 0, axis: 0 }],
      };
      expect(e.toNested(e.einsum(spec, M))).toEqual([[1, 4], [2, 5], [3, 6]]);
    });

    it('einsum rejects a spec that leaves a rank-≥1 operand axis unreferenced', () => {
      const A = e.fromNested([[1, 2], [3, 4]], [2, 2]);
      // free references only axis 0; axis 1 is neither free nor contracted.
      const badSpec = { contractions: [], free: [{ operand: 0, axis: 0 }] };
      expect(() => e.einsum(badSpec, A)).toThrow(/not referenced by the spec/);
    });
  });
}
