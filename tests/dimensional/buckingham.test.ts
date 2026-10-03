/**
 * Buckingham-π enumerator (docs/planning/Bridge-Inference-Epistemics-
 * Note.md build target 1). Pins the canonical dimensional-analysis
 * results — pendulum period (T = const·√(L/g)), Schwarzschild radius
 * (r_s = const·GM/c²) — the π-count theorem, the rational (√) exponent
 * path, and the honest boundary (mass alone does NOT determine r_s; the
 * constant is never returned).
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { nullspace } from '@danielsimonjr/mathts-functions';
import {
  buckinghamPi,
  dimensionallyDetermines,
  RationalizationError,
} from '../../src/dimensional/buckingham.js';
import type { DimensionalVariable } from '../../src/dimensional/buckingham.js';
import type { Dimension } from '../../src/dimensional/types.js';
import {
  DIMENSIONLESS,
  LENGTH,
  MASS,
  TIME,
  ACCELERATION,
  VELOCITY,
} from '../../src/dimensional/types.js';

const v = (name: string, dim: Dimension): DimensionalVariable => ({ name, dim });

// G: L³ M⁻¹ T⁻²
const GRAV_CONSTANT: Dimension = {
  L: 3,
  M: -1,
  T: -2,
  I: 0,
  Theta: 0,
  N: 0,
  J: 0,
};

describe('buckinghamPi — π-count theorem', () => {
  it('pendulum {period, length, gravity}: one π-group (T²g/L)', () => {
    const r = buckinghamPi([
      v('period', TIME),
      v('length', LENGTH),
      v('gravity', ACCELERATION),
    ]);
    expect(r.variableCount).toBe(3);
    expect(r.rank).toBe(2); // spans L and T
    expect(r.piGroupCount).toBe(1);
    expect(r.verdict).toBe('single-invariant');
    // the group is period² · gravity · length⁻¹ (up to overall sign/scale)
    const g = r.piGroups[0].exponents;
    expect(g['period']).toBe(2);
    expect(g['gravity']).toBe(1);
    expect(g['length']).toBe(-1);
  });

  it('Schwarzschild {r_s, mass, G, c}: one π-group (r_s·c²/GM)', () => {
    const r = buckinghamPi([
      v('schwarzschild-radius', LENGTH),
      v('mass', MASS),
      v('G', GRAV_CONSTANT),
      v('c', VELOCITY),
    ]);
    expect(r.rank).toBe(3); // spans L, M, T
    expect(r.piGroupCount).toBe(1);
    const g = r.piGroups[0].exponents;
    // r_s G⁻¹ M⁻¹ c² (normalized so the first nonzero — r_s — is positive)
    expect(g['schwarzschild-radius']).toBe(1);
    expect(g['G']).toBe(-1);
    expect(g['mass']).toBe(-1);
    expect(g['c']).toBe(2);
  });

  it('a float nullspace is not that exponent vector', () => {
    // Columns: radius, mass, G, c. Rows: L, M, T. The numeric nullspace
    // returns a scaled vector whose entries are not the integers above.
    const numeric = nullspace([
      [1, 0, 3, 1],
      [0, 1, -1, 0],
      [0, 0, -2, -1],
    ]);
    expect(numeric).toHaveLength(1);
    const [radius, mass, grav, c] = numeric[0]!;
    expect(radius).not.toBe(1);
    expect(c).not.toBe(2);
    expect(mass).toBeCloseTo(-0.5, 12);
    expect(grav).toBeCloseTo(-0.5, 12);
    const src = readFileSync(new URL('../../src/dimensional/buckingham.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/from '@danielsimonjr\/mathts-functions'/);
  });

  it('dimensionally-independent set has zero π-groups', () => {
    const r = buckinghamPi([v('length', LENGTH), v('mass', MASS)]);
    expect(r.piGroupCount).toBe(0);
    expect(r.verdict).toBe('dimensionally-independent');
    expect(r.piGroups).toEqual([]);
  });

  it('a dimensionless variable is its own π-group', () => {
    const r = buckinghamPi([v('eccentricity', DIMENSIONLESS), v('length', LENGTH)]);
    expect(r.piGroupCount).toBe(1);
    expect(r.piGroups[0].exponents['eccentricity']).toBe(1);
    expect(r.piGroups[0].exponents['length']).toBe(0);
  });

  it('multiple π-groups → multiple-invariants verdict', () => {
    // {length, time, velocity, mass}: rank 3 (L,T,M), n=4 → 1 group;
    // add another dimensionless-reducible var to force 2.
    const r = buckinghamPi([
      v('length', LENGTH),
      v('time', TIME),
      v('velocity', VELOCITY),
      v('ratio', DIMENSIONLESS),
    ]);
    expect(r.piGroupCount).toBe(2); // velocity/(length/time) and ratio
    expect(r.verdict).toBe('multiple-invariants');
  });
});

describe('dimensionallyDetermines', () => {
  it('determines r_s = const·G·M·c⁻² (the constant is NOT supplied)', () => {
    const res = dimensionallyDetermines(v('schwarzschild-radius', LENGTH), [
      v('mass', MASS),
      v('G', GRAV_CONSTANT),
      v('c', VELOCITY),
    ]);
    expect(res.determined).toBe(true);
    expect(res.upToDimensionlessConstant).toBe(true);
    expect(res.monomial).toEqual({ mass: 1, G: 1, c: -2 });
    // there is no value/constant anywhere on the result
    expect('value' in res).toBe(false);
    expect('constant' in res).toBe(false);
  });

  it('recovers the rational √ law: period = const·length^½·gravity^-½', () => {
    const res = dimensionallyDetermines(v('period', TIME), [
      v('length', LENGTH),
      v('gravity', ACCELERATION),
    ]);
    expect(res.determined).toBe(true);
    expect(res.monomial!['length']).toBeCloseTo(0.5, 12);
    expect(res.monomial!['gravity']).toBeCloseTo(-0.5, 12);
  });

  it('mass ALONE does not determine the Schwarzschild radius (needs G, c)', () => {
    const res = dimensionallyDetermines(v('schwarzschild-radius', LENGTH), [
      v('mass', MASS),
    ]);
    expect(res.determined).toBe(false);
    expect(res.reason).toMatch(/not in the span/);
  });

  it('dimensionally-dependent governing set → not uniquely determined', () => {
    // length and area=(length²) are dependent; a target gets a non-unique
    // monomial.
    const AREA2: Dimension = { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
    const res = dimensionallyDetermines(v('volume', {
      L: 3,
      M: 0,
      T: 0,
      I: 0,
      Theta: 0,
      N: 0,
      J: 0,
    }), [v('length', LENGTH), v('area', AREA2)]);
    expect(res.determined).toBe(false);
    expect(res.reason).toMatch(/dimensionally dependent/);
  });
});

describe('guards', () => {
  it('rejects duplicate variable names', () => {
    expect(() =>
      buckinghamPi([v('x', LENGTH), v('x', MASS)]),
    ).toThrow(RationalizationError);
  });

  it('rejects an empty variable set', () => {
    expect(() => buckinghamPi([])).toThrow(RationalizationError);
  });
});
