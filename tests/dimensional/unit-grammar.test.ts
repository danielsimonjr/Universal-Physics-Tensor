/**
 * Juxtaposition is one grammar.
 *
 * A token that is exactly one factor (an exact unit, or a prefix plus a
 * unit, with an optional exponent) is that factor. Any other token is a
 * product when exactly one split exists, and an error that names the
 * readings when more than one split exists. The oracle below recognizes
 * only a single factor. It does not search for a product.
 */
import { describe, expect, it } from 'vitest';
import { equals, multiply } from '../../src/dimensional/algebra.js';
import { convertValue, parseUnit, unitTables } from '../../src/dimensional/units.js';
import { oneFactor, powerDim, productWalkTokens, sampleTokens, walkProducts } from '../helpers/unit-product-walk.js';
import type { Dimension } from '../../src/dimensional/types.js';

const { units, prefixes } = unitTables();

/** Seed and share of the sampled product walk; `scripts/unit-product-walk.ts` runs every token. */
const WALK_SEED = 20261109;
const WALK_FRACTION = 0.1;

interface Factor {
  readonly scale: number;
  readonly dim: Dimension;
}

function close(actual: number, expected: number): void {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  expect(Math.abs(actual - expected) / scale).toBeLessThan(1e-9);
}

function expectFactor(token: string, factor: Factor): void {
  const got = parseUnit(token);
  close(got.scale, factor.scale);
  expect(equals(got.dim, factor.dim), token).toBe(true);
}

const atoms: string[] = [];
for (const [symbol, spec] of units) {
  atoms.push(symbol);
  for (const exp of [2, 3]) {
    atoms.push(`${symbol}^${exp}`);
    atoms.push(`${symbol}${exp}`);
    atoms.push(`${symbol}${exp === 2 ? '²' : '³'}`);
  }
  if (!spec[2]) continue;
  for (const prefix of prefixes.keys()) {
    const prefixed = `${prefix}${symbol}`;
    if (oneFactor(prefixed) === null) continue;
    atoms.push(prefixed);
  }
}

describe('unit juxtaposition grammar', () => {
  it('reads every declared unit, prefix, and exponent as that one factor', () => {
    let read = 0;
    for (const token of atoms) {
      const factor = oneFactor(token);
      expect(factor, token).not.toBeNull();
      expectFactor(token, factor!);
      read += 1;
    }
    expect(read).toBe(atoms.length);
    expect(read).toBeGreaterThan(units.size);
    expect(atoms).toContain('keV');
    expect(atoms).toContain('cm');
    expect(atoms).toContain('mm');
  });

  it('reads a unique product, and names every reading of an ambiguous token (a seeded sample of the walk)', () => {
    // The full walk is about 1.6e5 tokens and runs in `scripts/unit-product-walk.ts`, in CI,
    // with no time limit. This test reads a seeded tenth of it. Each failure names its token.
    const sample = sampleTokens(productWalkTokens(), WALK_FRACTION, WALK_SEED);
    const result = walkProducts(sample);
    expect(result.failures.slice(0, 20)).toEqual([]);
    expect(result.products).toBeGreaterThan(0);
    expect(result.ambiguous).toBeGreaterThan(0);
    const metreSquared = oneFactor('m^2')!;
    const kelvin = oneFactor('K')!;
    expectFactor('m2K', { scale: metreSquared.scale * kelvin.scale, dim: multiply(metreSquared.dim, kelvin.dim) });
    expectFactor('Vs', { scale: 1, dim: multiply(parseUnit('V').dim, parseUnit('s').dim) });
    expectFactor('cm^2/Vs', {
      scale: parseUnit('cm^2').scale / parseUnit('V*s').scale,
      dim: multiply(parseUnit('cm^2').dim, powerDim(parseUnit('V*s').dim, -1)),
    });
    expect(equals(parseUnit('W/m2K').dim, parseUnit('W/(m^2*K)').dim)).toBe(true);
    expect(parseUnit('W/m2K').scale).toBeCloseTo(parseUnit('W/(m^2*K)').scale, 12);
    expect(() => parseUnit('mAs')).toThrow(/ambiguous/);
    expect(() => parseUnit('mAs')).toThrow(/mA·s/);
    expect(() => parseUnit('mAs')).toThrow(/m·A·s/);
  });

  it('keeps an exact symbol and a prefixed symbol that the product reading would split', () => {
    expect(parseUnit('ms').scale).toBeCloseTo(1e-3, 12);
    expect(parseUnit('ms').dim).toEqual(parseUnit('s').dim);
    expect(parseUnit('mm').scale).toBeCloseTo(1e-3, 12);
    expect(parseUnit('mm').dim).toEqual(parseUnit('m').dim);
    expect(parseUnit('Ts').scale).toBe(1e12);
    expect(parseUnit('Ts').dim).toEqual(parseUnit('s').dim);
    expect(parseUnit('mK').scale).toBeCloseTo(1e-3, 12);
    expect(parseUnit('mK').dim).toEqual(parseUnit('K').dim);
    expect(parseUnit('Gs').scale).toBe(1e9);
    expect(parseUnit('Gs').dim).toEqual(parseUnit('s').dim);
    expect(parseUnit('GPa').scale).toBe(1e9);
    expect(parseUnit('K2')).toEqual(parseUnit('K^2'));
    expect(parseUnit('cm2').dim).toEqual(parseUnit('cm^2').dim);
    expect(parseUnit('min').scale).toBe(60);
    expect(parseUnit('Pa').scale).toBe(1);
    expect(parseUnit('keV').scale).toBeCloseTo(1.602176634e-16, 24);
  });

  it('a prefixed factor inside a compound competes with a heterogeneous product', () => {
    const baseOf: Record<string, string> = { L: 'm', M: 'kg', T: 's', I: 'A', Theta: 'K', N: 'mol', J: 'cd' };
    const si = (dim: Dimension): string => {
      const parts: string[] = [];
      for (const key of Object.keys(baseOf) as (keyof Dimension)[]) {
        const exp = dim[key];
        if (exp === 0) continue;
        const unit = baseOf[key]!;
        parts.push(exp === 1 ? unit : `${unit}^${exp}`);
      }
      return parts.length === 0 ? '1' : parts.join('*');
    };
    let competed = 0;
    for (const prefix of prefixes.keys()) {
      if (!units.has(prefix)) continue;
      for (const [symbol, spec] of units) {
        if (!spec[2] || symbol === prefix) continue;
        const token = `${prefix}${symbol}`;
        const prefixed = oneFactor(token);
        const left = oneFactor(prefix);
        const right = oneFactor(symbol);
        if (prefixed === null || left === null || right === null) continue;
        expectFactor(token, prefixed);
        // A prefix letter that is also a unit (T, G, P, h, d, M, u, and c since the speed of light
        // became a unit) reads as the prefix: `W/Gyr` is not W/(G·yr), `W/cm` is not W/(c·m).
        if (['T', 'G', 'P', 'h', 'd', 'M', 'u', 'c'].includes(prefix)) {
          close(parseUnit(`W/${token}`).scale, parseUnit('W').scale / prefixed.scale);
          continue;
        }
        expect(() => parseUnit(`W/${token}`), `W/${token}`).toThrow(/ambiguous/);
        const productDim = multiply(left.dim, right.dim);
        const productScale = left.scale * right.scale;
        const watt = parseUnit('W');
        const prefixedCompound = multiply(watt.dim, powerDim(prefixed.dim, -1));
        const productCompound = multiply(watt.dim, powerDim(productDim, -1));
        if (equals(prefixed.dim, productDim)) {
          expect(() => convertValue(`1W/${token}`, si(prefixedCompound)), token).toThrow(/ambiguous/);
        } else {
          const prefTarget = si(prefixedCompound);
          const prodTarget = si(productCompound);
          close(
            convertValue(`1W/${token}`, prefTarget).value,
            watt.scale / prefixed.scale / parseUnit(prefTarget).scale,
          );
          close(
            convertValue(`1W/${token}`, prodTarget).value,
            watt.scale / productScale / parseUnit(prodTarget).scale,
          );
        }
        competed += 1;
      }
    }
    expect(competed).toBeGreaterThan(0);
    expect(() => parseUnit('W/mK')).toThrow(/mK/);
    expect(() => parseUnit('W/mK')).toThrow(/m·K/);
    expect(() => parseUnit('kg/ms')).toThrow(/ambiguous/);
    expect(convertValue('401W/mK', 'W/(m*K)').value).toBeCloseTo(401, 9);
    expect(convertValue('1kg/ms', 'Pa*s').value).toBeCloseTo(1, 9);
    expect(convertValue('1kg/ms', 'kg/s').value).toBeCloseTo(1000, 6);
    expect(parseUnit('mm/s').scale).toBeCloseTo(1e-3, 12);
    expect(() => parseUnit('mPas')).toThrow(/mPa·s/);
    expect(() => parseUnit('mPas')).toThrow(/m·Pa·s/);
  });
});
