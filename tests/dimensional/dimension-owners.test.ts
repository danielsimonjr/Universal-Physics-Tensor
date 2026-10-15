/**
 * One owner for the base list, the SI base-unit table, the exact dimension
 * predicates and the named shapes. Five files carried a `BASES` literal, three
 * an `isDimensionless`, two a `dimEqual`, two an `SI_BASE`; `dimensional/algebra`
 * exports them now, and `dimensional/types` names the shapes the atlas and the
 * canonical entries each spelled by exponents.
 */
import { describe, expect, it } from 'vitest';
import { BASES, exactlyEquals, isDimensionless, SI_BASE, equals } from '../../src/dimensional/algebra.js';
import {
  CAPACITANCE,
  DIMENSIONLESS,
  ELECTRIC_FIELD,
  INDUCTANCE,
  MASS_DENSITY,
  MOMENTUM,
  PERMITTIVITY,
  PRESSURE,
  RESISTANCE,
  SPECIFIC_HEAT,
  SPRING_CONSTANT,
  THERMAL_CONDUCTIVITY,
  VISCOSITY,
  VOLUME,
  NAMED_DIMENSIONS,
  type Dimension,
} from '../../src/dimensional/types.js';
import { dim } from '../../src/dimensional/ast-builders.js';

describe('the base list and the SI base table', () => {
  it('BASES is the seven SI bases in the order every copy used', () => {
    expect([...BASES]).toEqual(['L', 'M', 'T', 'I', 'Theta', 'N', 'J']);
  });

  it('SI_BASE pairs each base with its coherent unit, kilogram first', () => {
    expect(SI_BASE.map(([k, u]) => `${k}:${u}`)).toEqual(['M:kg', 'L:m', 'T:s', 'I:A', 'Theta:K', 'N:mol', 'J:cd']);
  });
});

describe('the exact predicates', () => {
  it('isDimensionless is exact zero on every base', () => {
    expect(isDimensionless(DIMENSIONLESS)).toBe(true);
    expect(isDimensionless(dim(1e-12))).toBe(false);
    // A partial object (the CLI builds one from entries) reads a missing base as 0.
    expect(isDimensionless({ L: 0 } as Dimension)).toBe(true);
  });

  it('exactlyEquals is exact, unlike the tolerant equals', () => {
    const a = dim(0.5);
    const b = dim(0.5 + 1e-12);
    expect(equals(a, b)).toBe(true);
    expect(exactlyEquals(a, b)).toBe(false);
    expect(exactlyEquals(dim(1, 1, -2), { L: 1, M: 1, T: -2 } as Dimension)).toBe(true);
  });
});

describe('the named shapes', () => {
  it('each named shape is the exponent form the copies spelled', () => {
    expect(PRESSURE).toEqual(dim(-1, 1, -2));
    expect(SPRING_CONSTANT).toEqual(dim(0, 1, -2));
    expect(CAPACITANCE).toEqual(dim(-2, -1, 4, 2));
    expect(INDUCTANCE).toEqual(dim(2, 1, -2, -2));
    expect(RESISTANCE).toEqual(dim(2, 1, -3, -2));
    expect(THERMAL_CONDUCTIVITY).toEqual(dim(1, 1, -3, 0, -1));
    expect(SPECIFIC_HEAT).toEqual(dim(2, 0, -2, 0, -1));
    expect(VISCOSITY).toEqual(dim(-1, 1, -1));
    expect(VOLUME).toEqual(dim(3));
    expect(PERMITTIVITY).toEqual(dim(-3, -1, 4, 2));
    expect(MOMENTUM).toEqual(dim(1, 1, -1));
    expect(ELECTRIC_FIELD).toEqual(dim(1, 1, -3, -1));
    expect(MASS_DENSITY).toEqual(dim(-3, 1));
  });

  it('the new shapes are not rows of NAMED_DIMENSIONS, so format() output is unchanged', () => {
    const names = NAMED_DIMENSIONS.map(([name]) => name);
    for (const absent of ['pressure', 'spring-constant', 'capacitance', 'volume', 'momentum', 'electric-field']) {
      expect(names).not.toContain(absent);
    }
  });
});
