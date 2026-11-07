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
import { convertValue, parseUnit, unitTables, UnitError } from '../../src/dimensional/units.js';
import type { Dimension } from '../../src/dimensional/types.js';

const { units, prefixes } = unitTables();
const SUPERSCRIPT: Readonly<Record<string, number>> = { '²': 2, '³': 3 };

interface Factor {
  readonly scale: number;
  readonly dim: Dimension;
}

function close(actual: number, expected: number): void {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  expect(Math.abs(actual - expected) / scale).toBeLessThan(1e-9);
}

/** Exact unit, or prefix plus a unit. No product split. */
function trySymbol(sym: string): Factor | null {
  const exact = units.get(sym);
  if (exact !== undefined) return { scale: exact[0], dim: exact[1] };
  for (const [prefix, factor] of prefixes) {
    if (!sym.startsWith(prefix) || sym.length === prefix.length) continue;
    const base = units.get(sym.slice(prefix.length));
    if (base !== undefined && base[2]) return { scale: factor * base[0], dim: base[1] };
  }
  return null;
}

/** One factor with an optional exponent, or null. This is not the product search. */
function oneFactor(token: string): Factor | null {
  let base = token;
  let exp = 1;
  const caret = /^(.+)\^([+-]?\d+)$/.exec(token);
  if (caret !== null) {
    base = caret[1]!;
    exp = Number(caret[2]);
  } else {
    const uni = /^(.*?)([²³])$/.exec(token);
    const superExp = uni === null ? undefined : SUPERSCRIPT[uni[2]!];
    if (uni !== null && superExp !== undefined && uni[1]!.length > 0) {
      base = uni[1]!;
      exp = superExp;
    } else {
      const glued = /^(.*?)([1-9]\d*)$/.exec(token);
      if (glued !== null && glued[1]!.length > 0 && trySymbol(glued[1]!) !== null) {
        base = glued[1]!;
        exp = Number(glued[2]);
      }
    }
  }
  const parsed = trySymbol(base);
  if (parsed === null || !Number.isFinite(exp)) return null;
  return { scale: parsed.scale ** exp, dim: powerDim(parsed.dim, exp) };
}

function powerDim(dim: Dimension, exp: number): Dimension {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(dim)) out[key] = value * exp;
  return out as unknown as Dimension;
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

  it('reads a unique product, and names every reading of an ambiguous token', () => {
    let products = 0;
    let ambiguous = 0;
    const bases = [...units.keys()];
    const prefixed = [...prefixes.keys()].flatMap((prefix) =>
      [...units.entries()].filter(([, spec]) => spec[2]).map(([symbol]) => `${prefix}${symbol}`),
    );
    const lefts = [...bases, ...bases.flatMap((symbol) => [`${symbol}2`, `${symbol}^2`]), ...prefixed];
    // The walk covers about 1.4e5 tokens. A vitest `expect` per token cost about two thirds of the
    // run time, so each check records a failure as text and one assertion reads the list.
    const failures: string[] = [];
    const within = (actual: number, expected: number): boolean =>
      Math.abs(actual - expected) / Math.max(Math.abs(actual), Math.abs(expected), 1) < 1e-9;
    const factorMismatch = (token: string, want: Factor): string | null => {
      const got = parseUnit(token);
      if (!within(got.scale, want.scale)) return `${token}: scale ${got.scale} is not ${want.scale}`;
      if (!equals(got.dim, want.dim)) return `${token}: dimension is not the single factor`;
      return null;
    };
    const rightFactors = new Map(bases.map((right) => [right, oneFactor(right)] as const));
    for (const left of lefts) {
      const a = oneFactor(left);
      if (a === null) failures.push(`${left}: not one factor`);
      for (const right of bases) {
        const token = `${left}${right}`;
        if (token === 'degC' || token === '°C' || token === 'degF' || token === '°F') {
          const affine = parseUnit(token).affine;
          if (affine !== (token.endsWith('C') ? 'celsius' : 'fahrenheit')) failures.push(`${token}: affine ${affine}`);
          continue;
        }
        const single = oneFactor(token);
        if (single !== null) {
          const mismatch = factorMismatch(token, single);
          if (mismatch !== null) failures.push(mismatch);
          continue;
        }
        const b = rightFactors.get(right) ?? null;
        if (a === null || b === null) {
          if (b === null) failures.push(`${right}: not one factor`);
          continue;
        }
        let got: ReturnType<typeof parseUnit>;
        try {
          got = parseUnit(token);
        } catch (error) {
          if (!(error instanceof UnitError)) {
            failures.push(`${token}: threw ${String(error)}`);
            continue;
          }
          const message = error.message;
          if (/ambiguous/.test(message)) {
            if (!message.includes(' or ')) failures.push(`${token}: ambiguous message names one reading`);
            ambiguous += 1;
            continue;
          }
          if (!/Fahrenheit|affine|unknown unit/.test(message)) failures.push(`${token}: ${message}`);
          continue;
        }
        if (!within(got.scale, a.scale * b.scale)) failures.push(`${token}: product scale ${got.scale}`);
        if (!equals(got.dim, multiply(a.dim, b.dim))) failures.push(`${token}: product dimension`);
        products += 1;
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
    expect(products).toBeGreaterThan(0);
    expect(ambiguous).toBeGreaterThan(0);
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
