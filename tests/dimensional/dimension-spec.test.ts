/**
 * Dimension-spec parser (src/dimensional/dimension-spec.ts) — turns CLI
 * strings into Dimensions: named dims, constants (exact-case so G ≠ g),
 * explicit base exponents (incl. fractional), and error handling.
 */
import { describe, it, expect } from 'vitest';
import {
  parseDimensionSpec,
  DimensionSpecError,
  NAMED_DIMENSION_NAMES,
} from '../../src/dimensional/dimension-spec.js';
import {
  LENGTH,
  VELOCITY,
  ACTION,
  ENTROPY,
  AREA,
  POWER,
  TEMPERATURE,
  DIMENSIONLESS,
  MASS_DENSITY,
} from '../../src/dimensional/types.js';
import { divide, multiply } from '../../src/dimensional/algebra.js';
import { unitDimension } from '../../src/dimensional/units.js';

describe('parseDimensionSpec — named dimensions', () => {
  it('resolves named dimensions case-insensitively', () => {
    expect(parseDimensionSpec('length')).toEqual(LENGTH);
    expect(parseDimensionSpec('Velocity')).toEqual(VELOCITY);
    expect(parseDimensionSpec('dimensionless')).toEqual(DIMENSIONLESS);
  });
});

describe('parseDimensionSpec — constants (exact-case)', () => {
  it('maps constant names to their SI dimension', () => {
    expect(parseDimensionSpec('hbar')).toEqual(ACTION);
    expect(parseDimensionSpec('ℏ')).toEqual(ACTION);
    expect(parseDimensionSpec('c')).toEqual(VELOCITY);
    expect(parseDimensionSpec('k_B')).toEqual(ENTROPY);
    expect(parseDimensionSpec('G')).toEqual({
      L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
    });
    expect(parseDimensionSpec('mu_0')).toEqual(parseDimensionSpec('permeability'));
    expect(parseDimensionSpec('mu0')).toEqual(parseDimensionSpec('permeability'));
    expect(parseDimensionSpec('eps0')).toEqual(parseDimensionSpec('epsilon_0'));
    expect(parseDimensionSpec('epsilon0')).toEqual(parseDimensionSpec('epsilon_0'));
  });

  it('does NOT confuse G (Newton constant) with g (acceleration)', () => {
    // 'G' is the constant; lowercase 'g' is not a named term → must error,
    // not silently become Newton's constant.
    expect(parseDimensionSpec('G').L).toBe(3);
    expect(() => parseDimensionSpec('g')).toThrow(DimensionSpecError);
  });
});

describe('L1: named products and quotients', () => {
  it('parses power/area as flux', () => {
    expect(parseDimensionSpec('power/area')).toEqual(divide(POWER, AREA));
  });

  it('parses length*temperature (Wien b)', () => {
    expect(parseDimensionSpec('length*temperature')).toEqual(multiply(LENGTH, TEMPERATURE));
  });

  it('accepts mixed constant × named dim', () => {
    expect(parseDimensionSpec('c*mass')).toEqual(multiply(VELOCITY, parseDimensionSpec('mass')));
  });

  it('accepts parentheses around a product in the denominator', () => {
    expect(parseDimensionSpec('power/(area*temperature)')).toEqual(parseDimensionSpec('M.T^-3.Theta^-1'));
  });
});

describe('parseDimensionSpec — explicit base exponents', () => {
  it('parses L^a.M^b.T^c forms', () => {
    expect(parseDimensionSpec('L^3.M^-1.T^-2')).toEqual({
      L: 3, M: -1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
    });
    expect(parseDimensionSpec('L2')).toEqual(AREA);
    expect(parseDimensionSpec('L M T-2')).toEqual({
      L: 1, M: 1, T: -2, I: 0, Theta: 0, N: 0, J: 0,
    });
  });

  it('accepts fractional exponents and Theta/Θ', () => {
    expect(parseDimensionSpec('T^1/2').T).toBeCloseTo(0.5, 12);
    expect(parseDimensionSpec('Theta').Theta).toBe(1);
    expect(parseDimensionSpec('Θ^-1').Theta).toBe(-1);
  });

  it('rejects empty and unknown bases', () => {
    expect(() => parseDimensionSpec('')).toThrow(DimensionSpecError);
    expect(() => parseDimensionSpec('Q^2')).toThrow(/unknown base/);
  });
});

describe('a constant spelling that ends in a digit survives inside a product (audit N5)', () => {
  // The glued-exponent rewrite (`L2` → `L^2`) once fired on `mu0`, so
  // `mu0*length` was read as `mu^0*length` and failed on the base `mu`.
  it.each(['mu0*length', 'length*mu0', 'eps0*length', 'hbar*c/mu0', 'mu0^2'])('%s parses', (spec) => {
    expect(() => parseDimensionSpec(spec)).not.toThrow();
  });

  it('mu0*length is permeability times length, the same as mu_0*length', () => {
    expect(parseDimensionSpec('mu0*length')).toEqual(parseDimensionSpec('mu_0*length'));
    expect(parseDimensionSpec('mu0*length')).toEqual(multiply(parseDimensionSpec('permeability'), LENGTH));
  });

  it('eps0*length matches epsilon_0*length, and mu0^2 is permeability squared', () => {
    expect(parseDimensionSpec('eps0*length')).toEqual(parseDimensionSpec('epsilon_0*length'));
    expect(parseDimensionSpec('mu0^2')).toEqual(multiply(parseDimensionSpec('mu_0'), parseDimensionSpec('mu_0')));
  });

  it('a glued exponent on a base letter or a named dimension still takes its ^', () => {
    expect(parseDimensionSpec('L2*mu0')).toEqual(multiply(AREA, parseDimensionSpec('mu_0')));
    expect(parseDimensionSpec('M T-2')).toEqual(parseDimensionSpec('M*T^-2'));
    expect(parseDimensionSpec('length2')).toEqual(AREA);
  });
});

describe('named dimensions are projected from one owner, and N and J have names (audit N22)', () => {
  it('density is MASS_DENSITY', () => {
    expect(parseDimensionSpec('density')).toEqual(MASS_DENSITY);
  });

  it.each([
    ['pressure', 'Pa'],
    ['viscosity', 'Pa*s'],
    ['resistance', 'ohm'],
    ['magnetic_field', 'T'],
    ['magnetic-field', 'T'],
    ['permeability', 'H/m'],
    ['volume', 'm^3'],
    ['current', 'A'],
    ['amount', 'mol'],
    ['amount-of-substance', 'mol'],
    ['luminous-intensity', 'cd'],
  ])('%s is the dimension of the unit %s', (name, unit) => {
    expect(parseDimensionSpec(name)).toEqual(unitDimension(unit));
  });

  it('N and J bases are reachable by name inside a product', () => {
    expect(parseDimensionSpec('energy/amount').N).toBe(-1);
    expect(parseDimensionSpec('luminous-intensity/area').J).toBe(1);
  });
});

describe('circuit named dimensions (issue 683)', () => {
  // Explicit exponent tuples, so the test does not share a code path with unitDimension.
  const z = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
  const cases: Array<[string, Record<string, number>]> = [
    ['voltage', { L: 2, M: 1, T: -3, I: -1 }],
    ['capacitance', { L: -2, M: -1, T: 4, I: 2 }],
    ['inductance', { L: 2, M: 1, T: -2, I: -2 }],
    ['permittivity', { L: -3, M: -1, T: 4, I: 2 }],
    ['conductance', { L: -2, M: -1, T: 3, I: 2 }],
    ['magnetic_flux', { L: 2, M: 1, T: -2, I: -1 }],
  ];
  for (const [name, exps] of cases) {
    it(`${name} has the SI exponents`, () => {
      expect(parseDimensionSpec(name)).toEqual({ ...z, ...exps });
    });
  }
  it('accepts a hyphen spelling and a capital letter', () => {
    expect(parseDimensionSpec('magnetic-flux')).toEqual(parseDimensionSpec('magnetic_flux'));
    expect(parseDimensionSpec('Voltage')).toEqual(parseDimensionSpec('voltage'));
  });
  it('agrees with the products it must equal', () => {
    expect(parseDimensionSpec('voltage/current')).toEqual(parseDimensionSpec('resistance'));
    expect(parseDimensionSpec('charge/voltage')).toEqual(parseDimensionSpec('capacitance'));
  });
  it('an unknown term lists the accepted named dimensions, generated from the table', () => {
    let message = '';
    try {
      parseDimensionSpec('zqx');
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("unknown base dimension 'zqx'");
    expect(message).toContain('named dimensions:');
    for (const n of ['voltage', 'permittivity', 'resistance']) expect(message).toContain(n);
    for (const n of NAMED_DIMENSION_NAMES) expect(message).toContain(n);
  });
});

describe('the SI special-name units and the named dimensions', () => {
  // Every SI unit with a special name is COVERED (a named dimension equals its dimension) or EXCLUDED (with a reason).
  const SI_SPECIAL = [
    'rad', 'sr', 'Hz', 'N', 'Pa', 'J', 'W', 'C', 'V', 'F', 'ohm',
    'S', 'Wb', 'T', 'H', 'degC', 'lm', 'lx', 'Bq', 'Gy', 'Sv', 'kat',
  ];
  const COVERED: Record<string, string> = {
    rad: 'dimensionless', sr: 'dimensionless', Hz: 'frequency', N: 'force', Pa: 'pressure',
    J: 'energy', W: 'power', C: 'charge', V: 'voltage', F: 'capacitance', ohm: 'resistance',
    S: 'conductance', Wb: 'magnetic_flux', T: 'magnetic_field', H: 'inductance',
    degC: 'temperature', lm: 'luminous_intensity',
    // Same dimension as frequency; Bq counts no cycles (see the cycles test in si-special-units.test.ts).
    Bq: 'frequency',
  };
  const EXCLUDED: Record<string, string> = {
    lx: 'no named dimension for illuminance',
    Gy: 'no named dimension for absorbed dose',
    Sv: 'no named dimension for dose equivalent',
    kat: 'no named dimension for catalytic activity',
  };
  it('COVERED and EXCLUDED are disjoint and together are exactly the 22 units', () => {
    const covered = Object.keys(COVERED);
    const excluded = Object.keys(EXCLUDED);
    expect(covered.filter((u) => excluded.includes(u))).toEqual([]);
    expect([...covered, ...excluded].sort()).toEqual([...SI_SPECIAL].sort());
  });
  for (const [unit, name] of Object.entries(COVERED)) {
    it(`${name} equals the dimension of ${unit}`, () => {
      expect(parseDimensionSpec(name)).toEqual(unitDimension(unit));
    });
  }
  // The EXCLUDED reasons are checked, so a later change to the unit table or to
  // NAMED_DIMS moves the unit out of EXCLUDED instead of leaving a stale reason.
  for (const unit of Object.keys(EXCLUDED).filter((u) => EXCLUDED[u].startsWith('no named dimension'))) {
    it(`${unit} has no named dimension`, () => {
      const read = unitDimension(unit);
      const same = NAMED_DIMENSION_NAMES.filter((n) => JSON.stringify(parseDimensionSpec(n)) === JSON.stringify(read));
      expect(same).toEqual([]);
    });
  }
});
