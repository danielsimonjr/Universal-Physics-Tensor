/**
 * Parameterized AD conformance suite. Both MathTSEngine and
 * MathTSEngine must pass this identical suite — it is the cross-repo
 * AD contract (v0.4.0-Implementation-Plan.md Task 11).
 *
 * Not a *.test.ts file: it exports a factory that engine-conformance.test.ts
 * invokes per-engine. Mirrors the pattern of engine-conformance.ts (v0.3.5).
 */
import { describe, it, expect } from 'vitest';
import type { TensorEngine } from '../../src/numerical/tensor-engine.js';
import { hasAutogradSupport } from '../../src/numerical/tensor-engine.js';

export function runADConformance(engine: TensorEngine, engineName: string): void {
  describe(`AD conformance — ${engineName}`, () => {
    it('hasAutogradSupport is true', () => {
      expect(hasAutogradSupport(engine)).toBe(true);
    });

    it('forwardGrad: fn(x)=x·x → Jacobian = diag(2x)', async () => {
      const x = engine.fromNested([2, 3, 4], [3]);
      const fn = (t: typeof x) => engine.mul(t, t);
      const { value, jacobian } = await engine.forwardGrad!(fn, x);
      expect(engine.toNested(value)).toEqual([4, 9, 16]);
      const J = engine.toNested(jacobian) as number[][];
      expect(J[0][0]).toBeCloseTo(4, 10);
      expect(J[1][1]).toBeCloseTo(6, 10);
      expect(J[2][2]).toBeCloseTo(8, 10);
      expect(J[0][1]).toBeCloseTo(0, 10);
    });

    it('reverseGrad: fn(x)=x·x → grad = 2x·cotangent', async () => {
      const x = engine.fromNested([2, 3, 4], [3]);
      const ct = engine.fromNested([1, 1, 1], [3]);
      const fn = (t: typeof x) => engine.mul(t, t);
      const { gradient } = await engine.reverseGrad!(fn, x, ct);
      const g = engine.toNested(gradient) as number[];
      expect(g[0]).toBeCloseTo(4, 10);
      expect(g[2]).toBeCloseTo(8, 10);
    });

    it('reverseGrad: default cotangent for scalar value', async () => {
      const x = engine.fromNested(5, []);
      const fn = (t: typeof x) => engine.mul(t, t);
      const { gradient } = await engine.reverseGrad!(fn, x);
      expect(engine.toNested(gradient)).toBeCloseTo(10, 10);
    });

    it('forwardGrad: rank-2 linear map — Jacobian shape', async () => {
      const A = engine.fromNested([[1, 2], [3, 4]], [2, 2]);
      const fn = (t: typeof A) => engine.scale(t, 2);
      const { value, jacobian } = await engine.forwardGrad!(fn, A);
      expect(engine.toNested(value)).toEqual([[2, 4], [6, 8]]);
      expect(jacobian.shape).toEqual([2, 2, 2, 2]);
    });

    it('reverseGrad: cotangent shape mismatch throws', async () => {
      const x = engine.fromNested([1, 2, 3], [3]);
      const wrongCt = engine.fromNested([[1, 2]], [1, 2]);
      const fn = (t: typeof x) => engine.mul(t, t);
      await expect(engine.reverseGrad!(fn, x, wrongCt)).rejects.toThrow(/shape/);
    });
  });
}
