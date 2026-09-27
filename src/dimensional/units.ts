/**
 * Unit parsing for numeric inputs: `1um`, `25degC`, `1 kohm`, `3.8e-16 kg/m^3`.
 *
 * A unit is a product of factors, each `symbol[^n]`, joined by `*`, `·` or a
 * space; everything after a single `/` is the denominator (`W/(m*K)` and
 * `W/m*K` both mean W·m⁻¹·K⁻¹). An exact symbol is matched before a prefixed
 * one, so `min` is a minute, `Pa` a pascal and `mm` a millimetre.
 *
 * Temperature in °C is affine, so it is accepted only alone and only with an
 * explicit reading: an ABSOLUTE temperature adds 273.15 K; a temperature
 * DIFFERENCE (an uncertainty, an interval) does not. °F is refused rather than
 * converted.
 *
 * @module dimensional/units
 */
import { equals, format, multiply, power } from './algebra.js';
import type { Dimension } from './types.js';
import { E_SI, M_SUN_SI } from '../core/constants.js';

/** A unit, as a scale to SI base units and a dimension. @internal */
export interface ParsedUnit {
  readonly scale: number;
  readonly dim: Dimension;
  /** `'celsius'` only for a lone `degC`, which is affine and needs a reading. */
  readonly affine?: 'celsius';
}

/** Thrown for any input that does not parse as a value with a known unit. @internal */
export class UnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitError';
  }
}

const D = (p: Partial<Dimension>): Dimension => ({ L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0, ...p });
const JOULE = D({ L: 2, M: 1, T: -2 });
const DIMENSIONLESS = D({});

/** symbol → [scale to SI base, dimension, takes an SI prefix]. */
const UNITS: ReadonlyMap<string, readonly [number, Dimension, boolean]> = new Map([
  ['m', [1, D({ L: 1 }), true]],
  ['g', [1e-3, D({ M: 1 }), true]],
  ['s', [1, D({ T: 1 }), true]],
  ['K', [1, D({ Theta: 1 }), true]],
  ['A', [1, D({ I: 1 }), true]],
  ['mol', [1, D({ N: 1 }), true]],
  ['Hz', [1, D({ T: -1 }), true]],
  ['N', [1, D({ L: 1, M: 1, T: -2 }), true]],
  ['Pa', [1, D({ L: -1, M: 1, T: -2 }), true]],
  ['J', [1, JOULE, true]],
  ['W', [1, D({ L: 2, M: 1, T: -3 }), true]],
  ['C', [1, D({ T: 1, I: 1 }), true]],
  ['V', [1, D({ L: 2, M: 1, T: -3, I: -1 }), true]],
  ['ohm', [1, D({ L: 2, M: 1, T: -3, I: -2 }), true]],
  ['Ω', [1, D({ L: 2, M: 1, T: -3, I: -2 }), true]],
  ['S', [1, D({ L: -2, M: -1, T: 3, I: 2 }), true]],
  ['F', [1, D({ L: -2, M: -1, T: 4, I: 2 }), true]],
  ['eV', [E_SI, JOULE, true]],
  ['rad', [1, DIMENSIONLESS, true]],
  ['deg', [Math.PI / 180, DIMENSIONLESS, false]],
  ['min', [60, D({ T: 1 }), false]],
  ['h', [3600, D({ T: 1 }), false]],
  ['d', [86400, D({ T: 1 }), false]],
  // The Julian year, the year the orbital evaluators take.
  ['yr', [365.25 * 86400, D({ T: 1 }), true]],
  ['au', [149597870700, D({ L: 1 }), false]],
  // The solar mass the evaluators use, not the IAU nominal value.
  ['Msun', [M_SUN_SI, D({ M: 1 }), false]],
]);

const PREFIXES: ReadonlyMap<string, number> = new Map([
  ['Y', 1e24], ['Z', 1e21], ['E', 1e18], ['P', 1e15], ['T', 1e12], ['G', 1e9], ['M', 1e6], ['k', 1e3],
  ['h', 1e2], ['da', 1e1], ['d', 1e-1], ['c', 1e-2], ['m', 1e-3], ['u', 1e-6], ['µ', 1e-6], ['μ', 1e-6],
  ['n', 1e-9], ['p', 1e-12], ['f', 1e-15], ['a', 1e-18], ['z', 1e-21], ['y', 1e-24],
]);

function parseSymbol(sym: string): readonly [number, Dimension] {
  const exact = UNITS.get(sym);
  if (exact !== undefined) return [exact[0], exact[1]];
  for (const [p, f] of PREFIXES) {
    if (!sym.startsWith(p)) continue;
    const base = UNITS.get(sym.slice(p.length));
    if (base !== undefined && base[2]) return [f * base[0], base[1]];
  }
  throw new UnitError(`unknown unit '${sym}'`);
}

function parseFactors(text: string, sign: 1 | -1): { scale: number; dim: Dimension } {
  let scale = 1;
  let dim = DIMENSIONLESS;
  for (const f of text.split(/[*·\s]+/).filter((x) => x.length > 0)) {
    const m = /^([^\^]+)(?:\^([+-]?\d+))?$/.exec(f);
    if (m === null) throw new UnitError(`cannot read unit factor '${f}'`);
    const n = sign * (m[2] === undefined ? 1 : Number(m[2]));
    const [s, d] = parseSymbol(m[1]!);
    scale *= s ** n;
    dim = multiply(dim, power(d, n));
  }
  return { scale, dim };
}

/** Parse a unit expression; the empty string is dimensionless. @internal */
export function parseUnit(text: string): ParsedUnit {
  const t = text.trim();
  if (t === '' || t === '1') return { scale: 1, dim: DIMENSIONLESS };
  if (t === 'degC' || t === '°C') return { scale: 1, dim: D({ Theta: 1 }), affine: 'celsius' };
  if (/deg ?F|°F/.test(t)) throw new UnitError('Fahrenheit is not accepted; give K or degC');
  if (/degC|°C/.test(t)) throw new UnitError('degC is affine and cannot be part of a compound unit; give K');
  const parts = t.split('/');
  if (parts.length > 2) throw new UnitError(`'${t}' has more than one '/'; put the whole denominator after one '/'`);
  const num = parseFactors(parts[0]!, 1);
  if (parts.length === 1) return num;
  const den = parseFactors(parts[1]!.replace(/^\((.*)\)$/, '$1'), -1);
  return { scale: num.scale * den.scale, dim: multiply(num.dim, den.dim) };
}

/** How a temperature value is read: as a point on the scale, or as a difference. @internal */
export type TemperatureReading = 'absolute' | 'difference';

/**
 * Convert `raw` (`<number>[unit]`) into `target` (a unit expression). A bare
 * number is taken to be in `target` already. The dimensions must agree.
 *
 * @returns the value in `target`, and the unit the user gave (`''` for none).
 * @internal
 */
export function convertValue(
  raw: string,
  target: string,
  reading: TemperatureReading = 'absolute',
): { value: number; given: string } {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/.exec(raw);
  if (m === null) throw new UnitError(`'${raw}' is not a number with an optional unit`);
  const v = Number(m[1]);
  const given = m[2]!;
  if (!Number.isFinite(v)) throw new UnitError(`'${raw}' is not a finite number`);
  if (given === '') return { value: v, given };
  const from = parseUnit(given);
  const to = parseUnit(target);
  if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
  if (!equals(from.dim, to.dim)) {
    throw new UnitError(`'${given}' is ${format(from.dim)}, but this input is ${format(to.dim)} (${target || 'dimensionless'})`);
  }
  const offset = from.affine === 'celsius' && reading === 'absolute' ? 273.15 : 0;
  return { value: (v * from.scale + offset) / to.scale, given };
}

/** The dimension of a declared unit expression. @internal */
export function unitDimension(unit: string): Dimension {
  return parseUnit(unit).dim;
}
