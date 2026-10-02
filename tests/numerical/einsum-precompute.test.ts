import { describe, it, expect } from 'vitest';
import { MathTSEngine } from '../../src/numerical/mathts-engine.js';
import type { EinsumSpec } from '../../src/numerical/tensor-engine.js';

describe('MathTSEngine.einsum: precompute regression', () => {
  const engine = new MathTSEngine();

  it('matrix multiply [2,3] x [3,2] via einsum', () => {
    // A[i,k] * B[k,j] → C[i,j]
    // A = [[1,2,3],[4,5,6]], B = [[1,2],[3,4],[5,6]]
    // C = [[1*1+2*3+3*5, 1*2+2*4+3*6], [4*1+5*3+6*5, 4*2+5*4+6*6]]
    //   = [[22, 28], [49, 64]]
    const A = engine.fromNested([[1,2,3],[4,5,6]], [2,3]);
    const B = engine.fromNested([[1,2],[3,4],[5,6]], [3,2]);
    const spec: EinsumSpec = {
      free: [
        { operand: 0, axis: 0 },  // i (free of A)
        { operand: 1, axis: 1 },  // j (free of B)
      ],
      contractions: [
        { pair: [[0, 1], [1, 0]] },  // k contracts A axis 1 with B axis 0
      ],
    };
    const C = engine.einsum(spec, A, B);
    expect(engine.toNested(C)).toEqual([[22, 28], [49, 64]]);
  });

  it('trace of 3x3 matrix (pure contraction)', () => {
    // A[i,i] → scalar
    const A = engine.fromNested([[1,0,0],[0,2,0],[0,0,3]], [3,3]);
    const spec: EinsumSpec = {
      free: [],
      contractions: [{ pair: [[0, 0], [0, 1]] }],
    };
    const result = engine.einsum(spec, A);
    expect(engine.toNested(result)).toBeCloseTo(6, 10);
  });
});
