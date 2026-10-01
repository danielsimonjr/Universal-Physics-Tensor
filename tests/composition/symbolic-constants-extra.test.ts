/**
 * Extension constants needed by the canonical L1 entries (Task 3):
 * vacuum permittivity ε₀ and the (derived) Stefan–Boltzmann σ. Pins their SI
 * value and dimension so the canonical Coulomb/Bohr/Stefan–Boltzmann ASTs
 * resolve and validate.
 *
 * @module tests/composition/symbolic-constants-extra
 */
import { describe, it, expect } from 'vitest';
import { CONSTANTS } from '../../src/dimensional/symbolic-constants.js';

describe('extension constants ε₀ and σ_sb', () => {
  it('epsilon_0 — vacuum permittivity [I² T⁴ M⁻¹ L⁻³]', () => {
    const e = CONSTANTS['epsilon_0'];
    expect(e).toBeDefined();
    expect(e.value).toBeCloseTo(8.8541878128e-12, 22);
    expect(e.dim).toEqual({ L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 });
  });

  it('sigma_sb — Stefan–Boltzmann constant [M T⁻³ Θ⁻⁴]', () => {
    const s = CONSTANTS['sigma_sb'];
    expect(s).toBeDefined();
    expect(s.value).toBeCloseTo(5.670374419e-8, 16);
    expect(s.dim).toEqual({ L: 0, M: 1, T: -3, I: 0, Theta: -4, N: 0, J: 0 });
  });
});
