import { describe, it, expect } from 'vitest';
import { decidingMeasurement } from '../../src/bridges/sensitivity.js';

describe('decidingMeasurement (elasticity)', () => {
  it('ranks be-52 Mercury inputs by |dP/dx|·x/P, descending', () => {
    const ranked = decidingMeasurement(52);
    expect(ranked.length).toBeGreaterThan(0);
    // sorted descending by elasticity
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].elasticity).toBeGreaterThanOrEqual(ranked[i].elasticity);
    }
    // perihelion advance ∝ M / (a (1-e²)): elasticity wrt M is ~1
    const m = ranked.find((r) => r.input === 'mass');
    expect(m?.elasticity).toBeCloseTo(1, 1);
  });

  it('returns [] for a non-value-kind confrontation (be-48 upper-bound)', () => {
    expect(decidingMeasurement(48)).toEqual([]);
  });

  it('returns [] for an unregistered id', () => {
    expect(decidingMeasurement(99)).toEqual([]);
  });
});
