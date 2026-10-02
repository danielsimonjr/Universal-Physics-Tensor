import { describe, it, expect } from 'vitest';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';

const e = new MathTSEngine();
const rand2x2 = () => e.fromNested(
  [[Math.random(), Math.random()], [Math.random(), Math.random()]], [2, 2],
);

describe('einsum algebraic properties (engine-level — MathTSEngine, not the AST pipeline)', () => {
  it('tr(AB) = tr(BA) for random 2×2 matrices', () => {
    const A = rand2x2();
    const B = rand2x2();
    const traceSpec = { contractions: [{ pair: [[0, 0], [0, 1]] as const }], free: [] };
    const trAB = e.toNested(e.einsum(traceSpec, e.matMul(A, B))) as number;
    const trBA = e.toNested(e.einsum(traceSpec, e.matMul(B, A))) as number;
    expect(trAB).toBeCloseTo(trBA, 12);
  });

  it('matMul is associative for random 2×2 matrices', () => {
    const A = rand2x2(); const B = rand2x2(); const C = rand2x2();
    const left = e.toNested(e.matMul(e.matMul(A, B), C)) as number[][];
    const right = e.toNested(e.matMul(A, e.matMul(B, C))) as number[][];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(left[i][j]).toBeCloseTo(right[i][j], 10);
    }
  });

  it('g^{ij} g_{jk} = δ^i_k for a random invertible diagonal metric', () => {
    const a = 1 + Math.random();
    const b = 1 + Math.random();
    const g = e.fromNested([[a, 0], [0, b]], [2, 2]);
    const gInv = e.fromNested([[1 / a, 0], [0, 1 / b]], [2, 2]);
    const spec = {
      contractions: [{ pair: [[0, 1], [1, 0]] as const }],
      free: [{ operand: 0, axis: 0 }, { operand: 1, axis: 1 }],
    };
    const delta = e.toNested(e.einsum(spec, gInv, g)) as number[][];
    expect(delta[0][0]).toBeCloseTo(1, 12);
    expect(delta[1][1]).toBeCloseTo(1, 12);
    expect(delta[0][1]).toBeCloseTo(0, 12);
    expect(delta[1][0]).toBeCloseTo(0, 12);
  });
});
