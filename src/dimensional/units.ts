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
 * An exact symbol wins over a prefix: `T` is the tesla and `Ts` is a
 * terasecond; `G` is the gauss and `GPa` is a gigapascal. `AU` is the same
 * exact metre count as `au`. `Msun` is `M_SUN_SI` kilograms; `Msun_iau` is
 * `GM_SUN_SI / G_SI`. `myr` is a milliyear because `m` is the SI prefix.
 * `eV` takes an SI prefix, so `GeV` is 10⁹ eV in joules. `nat` is the
 * coherent information unit (scale 1); `bit` is ln 2 nat. Neither takes a
 * prefix.
 *
 * @module dimensional/units
 */
import { unit } from '@danielsimonjr/mathts-functions';
import { equals, format, multiply, power } from './algebra.js';
import type { Dimension } from './types.js';
import { C_SI, E_SI, G_SI, GM_SUN_SI, M_SUN_SI } from '../core/constants.js';

/** A unit, as a scale to SI base units and a dimension. @public */
export interface ParsedUnit {
  readonly scale: number;
  readonly dim: Dimension;
  /** `'celsius'` only for a lone `degC`, which is affine and needs a reading. */
  readonly affine?: 'celsius';
}

/** Thrown for any input that does not parse as a value with a known unit. @public */
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
  // Information. A nat is the coherent dimensionless unit; a bit is ln 2 nat.
  // Exact, so neither takes a prefix (`kbit` is not a kilobit).
  ['nat', [1, DIMENSIONLESS, false]],
  ['bit', [Math.LN2, DIMENSIONLESS, false]],
  ['rad', [1, DIMENSIONLESS, true]],
  ['deg', [Math.PI / 180, DIMENSIONLESS, false]],
  ['min', [60, D({ T: 1 }), false]],
  ['h', [3600, D({ T: 1 }), false]],
  ['d', [86400, D({ T: 1 }), false]],
  // The Julian year, the year the orbital evaluators take.
  ['yr', [365.25 * 86400, D({ T: 1 }), true]],
  ['au', [149597870700, D({ L: 1 }), false]],
  ['AU', [149597870700, D({ L: 1 }), false]],
  // The solar mass the evaluators use, not the IAU nominal value.
  ['Msun', [M_SUN_SI, D({ M: 1 }), false]],
  // GM☉/G, so G × Msun_iau is the IAU solar mass parameter.
  ['Msun_iau', [GM_SUN_SI / G_SI, D({ M: 1 }), false]],
  // Tesla. Exact, so it is not a prefix: `Ts` is a terasecond, `T` is a tesla.
  ['T', [1, D({ M: 1, T: -2, I: -1 }), false]],
  // Gauss = 10⁻⁴ T. Exact, so `GPa` stays gigapascal (prefix G + Pa) and bare `G` is gauss.
  ['G', [1e-4, D({ M: 1, T: -2, I: -1 }), false]],
  ['bar', [1e5, D({ L: -1, M: 1, T: -2 }), true]],
  ['atm', [101325, D({ L: -1, M: 1, T: -2 }), false]],
  ['angstrom', [1e-10, D({ L: 1 }), false]],
  ['Angstrom', [1e-10, D({ L: 1 }), false]],
  ['Å', [1e-10, D({ L: 1 }), false]],
  // IAU-style parsec; the prefix applies, so `Mpc` is a megaparsec.
  ['pc', [3.0856775814913673e16, D({ L: 1 }), true]],
  ['ly', [C_SI * 365.25 * 86400, D({ L: 1 }), false]],
]);

const CELSIUS_OFFSET_K = 273.15;

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

/**
 * Spellings that convert correctly and still mean something else to a reader.
 * `myr` is a milliyear, `Msun` is `M_SUN_SI`, bare `G` is the gauss, bare `T`
 * is the tesla, and bare `A` is the ampere rather than the angstrom.
 * @internal
 */
export function unitConventionNotes(given: string): string[] {
  const notes: string[] = [];
  const symbols = given.split(/[*·/\s^0-9()+-]+/).filter((s) => s.length > 0);
  if (symbols.includes('myr')) {
    notes.push('myr is a milliyear (the SI prefix m on yr = 0.001 yr), not a million years; a million years is Myr');
  }
  if (symbols.includes('Msun')) {
    notes.push(
      `Msun is ${M_SUN_SI} kg (M_SUN_SI), not GM☉/G; G×Msun is about 3.0e-4 high versus the IAU GM☉. Use the unit Msun_iau, or the eval name GM_sun, for GM_SUN_SI`,
    );
  }
  if (symbols.includes('G')) notes.push('bare G is the gauss (1e-4 T); GPa is still a gigapascal');
  if (symbols.includes('T')) notes.push('bare T is the tesla; Ts is a terasecond');
  if (symbols.includes('A')) notes.push('bare A is the ampere, not the angstrom; write angstrom or Å for 10^-10 m');
  return notes;
}

/** Parse a unit expression; the empty string is dimensionless. @public */
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

/** How a temperature value is read: as a point on the scale, or as a difference. @public */
export type TemperatureReading = 'absolute' | 'difference';

/**
 * Convert `raw` (`<number>[unit]`) into `target` (a unit expression). A bare
 * number is taken to be in `target` already. The dimensions must agree.
 *
 * @returns the value in `target`, and the unit the user gave (`''` for none).
 * @public
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
  const offset = from.affine === 'celsius' && reading === 'absolute' ? CELSIUS_OFFSET_K : 0;
  const local = (v * from.scale + offset) / to.scale;
  // MathTS `unit` + `toSI` is the conversion when it reads the same quantity.
  // A temperature difference must not take the absolute offset `toSI` adds.
  // `bit` is ln 2 nat here; MathTS reads `bit` as 1. Symbols MathTS does not
  // have (a solar mass, a Julian year, the gauss) stay on the table above.
  const via = mathTsRatio(v, given, target);
  if (via !== undefined && sameQuantity(via, local)) return { value: via, given };
  return { value: local, given };
}

/** Spellings MathTS's unit parser accepts for the same UPT symbol. */
function mathTsSpelling(text: string): string {
  return text
    .replaceAll('µ', 'u')
    .replaceAll('μ', 'u')
    .replaceAll('Ω', 'ohm')
    .replaceAll('Å', 'angstrom')
    .replaceAll('°C', 'degC');
}

/** SI magnitude of `value` in `unitText`, from MathTS `unit` and `toSI`. */
function mathTsSi(value: number, unitText: string): number {
  // `unit` is a typed-function; its declared return is `unknown`.
  const created = unit(value, mathTsSpelling(unitText)) as { toSI(): { value: unknown } };
  const si = created.toSI();
  const n = Number(si.value);
  if (!Number.isFinite(n)) throw new Error('non-finite SI magnitude');
  return n;
}

function mathTsRatio(value: number, given: string, target: string): number | undefined {
  try {
    const from = mathTsSi(value, given);
    const to = mathTsSi(1, target);
    if (to === 0) return undefined;
    return from / to;
  } catch {
    return undefined;
  }
}

function sameQuantity(got: number, expected: number): boolean {
  const scale = Math.max(Math.abs(got), Math.abs(expected));
  return Math.abs(got - expected) <= 1e-9 * scale;
}

/** The dimension of a declared unit expression. @internal */
export function unitDimension(unit: string): Dimension {
  return parseUnit(unit).dim;
}

/** The tables conversion reads, for the CLI record's fingerprint (`src/cli/record-tables.ts`). @internal */
export function unitTables(): {
  units: ReadonlyMap<string, readonly [number, Dimension, boolean]>;
  prefixes: ReadonlyMap<string, number>;
  celsiusOffsetK: number;
} {
  return { units: UNITS, prefixes: PREFIXES, celsiusOffsetK: CELSIUS_OFFSET_K };
}
