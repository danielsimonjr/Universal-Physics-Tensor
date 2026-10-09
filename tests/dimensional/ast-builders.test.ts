/**
 * The shared AST builders `sym`/`dim` (single source of truth for what used to
 * be copy-pasted across bridges/canonical/composition/numerical).
 */
import { describe, it, expect } from 'vitest';
import { sym, dim } from '../../src/dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

describe('dimensional/ast-builders', () => {
  it('sym builds a symbol leaf carrying name + dim', () => {
    const node = sym('x', DIMENSIONLESS);
    expect(node).toEqual({ kind: 'symbol', name: 'x', dim: DIMENSIONLESS });
  });

  it('dim places exponents in (L, M, T, I, Θ) order with N=J=0', () => {
    // energy [M L^2 T^-2]
    expect(dim(2, 1, -2)).toEqual({
      L: 2, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
    });
    // charge [I T] — I precedes Θ
    expect(dim(0, 0, 1, 1, 0)).toEqual({
      L: 0, M: 0, T: 1, I: 1, Theta: 0, N: 0, J: 0,
    });
  });

  it('dim defaults every omitted exponent to 0 (dimensionless)', () => {
    expect(dim()).toEqual({ L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 });
  });

  it('dim takes the amount-of-substance and luminous-intensity exponents too', () => {
    // molar entropy [M L^2 T^-2 Θ^-1 N^-1] and luminance [J L^-2]
    expect(dim(2, 1, -2, 0, -1, -1)).toEqual({ L: 2, M: 1, T: -2, I: 0, Theta: -1, N: -1, J: 0 });
    expect(dim(-2, 0, 0, 0, 0, 0, 1)).toEqual({ L: -2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 1 });
  });
});
