/**
 * Unit parsing for numeric inputs: `1um`, `25degC`, `1 kohm`, `3.8e-16 kg/m^3`.
 *
 * A unit is a product of factors, each `symbol[^n]`, joined by `*`, `·` or a
 * space; everything after a single `/` is the denominator (`W/(m*K)` and
 * `W/m*K` both mean W·m⁻¹·K⁻¹). An exact symbol is matched before a prefixed
 * one, so `min` is a minute, `Pa` a pascal and `mm` a millimetre.
 *
 * An affine temperature (`degC`, `°C`, `degF`, `°F`) is accepted only alone.
 * The kelvin value is `value × scale + offset` for an absolute reading and
 * `value × scale` for a difference. Rankine is proportional (`°R × 5/9`), not
 * affine. The caller decides which reading, from the quantity's role.
 *
 * An exact symbol wins over a prefix: `T` is the tesla and `Ts` is a
 * terasecond; `G` is the gauss and `GPa` is a gigapascal; `P` is the poise
 * and `PV` is still a petavolt. A glued positive exponent is that power when
 * the letters are already a unit, so `K2` and `K²` are `K^2`.
 *
 * A token with no separator is one factor when the whole token is an exact
 * unit or a prefix plus a unit, with an optional exponent. That reading
 * wins on a bare token, so `ms` stays a millisecond, `mm` a millimetre,
 * `mK` a millikelvin, and `Ts` a terasecond. Inside a larger expression the
 * prefixed reading competes with a heterogeneous product (`mK` is millikelvin
 * or metre·kelvin; `ms` is millisecond or metre·second). A homogeneous power
 * does not compete (`mm` is a millimetre, not metre·metre). `parseUnit` names
 * every remaining reading and refuses. `convertValue` keeps the one reading
 * whose dimension is the declared unit. A token that is not one factor is a
 * product when exactly one split exists: `m2K` is `m^2·K`, `Vs` is `V·s`,
 * and `cm^2/Vs` is `cm^2/(V·s)`. Zero splits are an unknown unit. Two or more
 * splits name each reading and are refused (`mAs` is milliampere·second or
 * metre·ampere·second). An unknown token that ends in a digit stays unknown
 * when it is not that product.
 * `AU` is the same exact metre count as `au`. `Msun` is `M_SUN_SI` kilograms; `Msun_iau` is
 * `GM_SUN_SI / G_SI`. `myr` is a milliyear because `m` is the SI prefix.
 * `eV` takes an SI prefix, so `GeV` is 10⁹ eV in joules. `nat` is the
 * coherent information unit (scale 1); `bit` is ln 2 nat. Neither takes a
 * prefix.
 *
 * @module dimensional/units
 */
import { toSiDimensionVector } from '@danielsimonjr/mathts-core';
import { unit } from '@danielsimonjr/mathts-functions';
import { equals, format, multiply, power } from './algebra.js';
import type { Dimension } from './types.js';
import { C_SI, E_SI, G_SI, GM_SUN_SI, M_SUN_SI } from '../core/constants.js';

type AffineTemperature = 'celsius' | 'fahrenheit';

/** A unit, as a scale to SI base units and a dimension. @public */
export interface ParsedUnit {
  readonly scale: number;
  readonly dim: Dimension;
  /** Set only for a lone affine temperature, which needs a reading. */
  readonly affine?: 'celsius' | 'fahrenheit';
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
  // Tesla. An exact `T` still wins over the tera prefix, so `Ts` is a
  // terasecond. The prefix flag is what lets `nT` and `uT` parse.
  ['T', [1, D({ M: 1, T: -2, I: -1 }), true]],
  // Gauss = 10⁻⁴ T. Exact, so `GPa` stays gigapascal (prefix G + Pa) and bare `G` is gauss.
  // The gauss takes an SI prefix: `uG` and `ugauss` are a microgauss, not a product of other units.
  ['G', [1e-4, D({ M: 1, T: -2, I: -1 }), true]],
  ['gauss', [1e-4, D({ M: 1, T: -2, I: -1 }), true]],
  ['Gauss', [1e-4, D({ M: 1, T: -2, I: -1 }), true]],
  ['bar', [1e5, D({ L: -1, M: 1, T: -2 }), true]],
  ['atm', [101325, D({ L: -1, M: 1, T: -2 }), false]],
  ['angstrom', [1e-10, D({ L: 1 }), false]],
  ['Angstrom', [1e-10, D({ L: 1 }), false]],
  ['Å', [1e-10, D({ L: 1 }), false]],
  // IAU-style parsec; the prefix applies, so `Mpc` is a megaparsec.
  ['pc', [3.0856775814913673e16, D({ L: 1 }), true]],
  ['ly', [C_SI * 365.25 * 86400, D({ L: 1 }), false]],
  // CGPM 1964: 1 L = 1 dm³ = 10⁻³ m³ exactly. Prefixable, so mL is a millilitre.
  // `l` is the same litre. Bare `mL` stays the prefix; `mol/mL` competes with metre·litre.
  ['L', [1e-3, D({ L: 3 }), true]],
  ['l', [1e-3, D({ L: 3 }), true]],
  // Thermochemical calorie: 1 cal_th = 4.184 J exactly (NIST). Not cal_IT = 4.1868 J.
  // Prefixable, so kcal is 4184 J.
  ['cal', [4.184, JOULE, true]],
  // International Steam Table BTU: cal_IT × (lb/g) / (°F per 1.8 °C).
  // 4.1868 × 453.59237 / 1.8 J exactly. Not the thermochemical calorie.
  ['BTU', [(4.1868 * 453.59237) / 1.8, JOULE, false]],
  // psi = lbf/in². lbf = 0.45359237 kg × 9.80665 m/s² (1959 pound × standard gravity).
  // inch = 0.0254 m exactly.
  ['psi', [(0.45359237 * 9.80665) / (0.0254 * 0.0254), D({ L: -1, M: 1, T: -2 }), false]],
  // torr = 1/760 of a standard atmosphere = 101325/760 Pa exactly. Prefixable (mtorr).
  ['torr', [101325 / 760, D({ L: -1, M: 1, T: -2 }), true]],
  // Conventional millimetre of mercury, 133.322387415 Pa exactly (NIST SP 811).
  // Not the torr, and not `mm` × `Hg`.
  ['mmHg', [133.322387415, D({ L: -1, M: 1, T: -2 }), false]],
  // Poise = 0.1 Pa·s exactly. Prefixable, so cP = 10⁻³ Pa·s. Exact `P` wins over peta.
  ['P', [0.1, D({ L: -1, M: 1, T: -1 }), true]],
  // Rankine is proportional: K = °R × 5/9. Not affine.
  ['degR', [5 / 9, D({ Theta: 1 }), false]],
  ['°R', [5 / 9, D({ Theta: 1 }), false]],
  // Revolutions per minute = 1/60 Hz. Prefixable, so krpm is a kilorevolution per minute.
  ['rpm', [1 / 60, D({ T: -1 }), true]],
  // Mechanical horsepower = 550 ft·lbf/s. ft = 0.3048 m.
  ['hp', [550 * 0.3048 * 0.45359237 * 9.80665, D({ L: 2, M: 1, T: -3 }), false]],
  // Named SI derived units the dogfood rounds found missing.
  ['H', [1, D({ L: 2, M: 1, T: -2, I: -2 }), true]],
  ['Wb', [1, D({ L: 2, M: 1, T: -2, I: -1 }), true]],
  ['Ohm', [1, D({ L: 2, M: 1, T: -3, I: -2 }), true]],
  // Plane and solid angle, photometry, and ratios. The steradian and the radian are dimensionless here.
  ['sr', [1, DIMENSIONLESS, false]],
  ['cd', [1, D({ J: 1 }), true]],
  ['lm', [1, D({ J: 1 }), true]],
  ['lx', [1, D({ J: 1, L: -2 }), true]],
  ['arcsec', [Math.PI / 648000, DIMENSIONLESS, false]],
  ['arcmin', [Math.PI / 10800, DIMENSIONLESS, false]],
  // `mas` would otherwise be metre times attosecond, so the angular spellings are exact.
  ['mas', [Math.PI / 648000e3, DIMENSIONLESS, false]],
  ['uas', [Math.PI / 648000e6, DIMENSIONLESS, false]],
  ['%', [1e-2, DIMENSIONLESS, false]],
  ['percent', [1e-2, DIMENSIONLESS, false]],
  ['ppm', [1e-6, DIMENSIONLESS, false]],
  ['ppb', [1e-9, DIMENSIONLESS, false]],
  // Molar concentration: 1 M = 1 mol/L. Bare `M` is the molar; `MPa` is still a megapascal.
  ['M', [1000, D({ N: 1, L: -3 }), true]],
  // Unified atomic mass unit (CODATA 2018). A bare `u` is this; `um` is still a micrometre.
  ['u', [1.66053906660e-27, D({ M: 1 }), false]],
  ['amu', [1.66053906660e-27, D({ M: 1 }), false]],
  ['Da', [1.66053906660e-27, D({ M: 1 }), true]],
  // CGS and astronomy. Solar and planetary radii and masses are the IAU 2015 B3 nominal values.
  ['erg', [1e-7, JOULE, false]],
  ['cc', [1e-6, D({ L: 3 }), false]],
  ['dyn', [1e-5, D({ L: 1, M: 1, T: -2 }), true]],
  ['Jy', [1e-26, D({ M: 1, T: -2 }), true]],
  ['Lsun', [3.828e26, D({ L: 2, M: 1, T: -3 }), false]],
  ['Rsun', [6.957e8, D({ L: 1 }), false]],
  ['Rearth', [6.3781e6, D({ L: 1 }), false]],
  ['Rjup', [7.1492e7, D({ L: 1 }), false]],
  ['Mearth', [5.9722e24, D({ M: 1 }), false]],
  ['Mjup', [1.89813e27, D({ M: 1 }), false]],
  ['day', [86400, D({ T: 1 }), false]],
  ['hr', [3600, D({ T: 1 }), false]],
  // Acoustics and fluids. Poise, stokes, and rayl are exact in SI.
  ['poise', [0.1, D({ L: -1, M: 1, T: -1 }), true]],
  ['St', [1e-4, D({ L: 2, T: -1 }), true]],
  ['rayl', [1, D({ L: -2, M: 1, T: -1 }), true]],
  // Imperial and pressure units. psi = lbf/in²; ksi is a kilopsi.
  ['in', [0.0254, D({ L: 1 }), false]],
  ['inch', [0.0254, D({ L: 1 }), false]],
  ['ft', [0.3048, D({ L: 1 }), false]],
  ['mil', [2.54e-5, D({ L: 1 }), false]],
  ['lb', [0.45359237, D({ M: 1 }), false]],
  ['lbm', [0.45359237, D({ M: 1 }), false]],
  ['lbf', [0.45359237 * 9.80665, D({ L: 1, M: 1, T: -2 }), false]],
  ['kgf', [9.80665, D({ L: 1, M: 1, T: -2 }), false]],
  ['mph', [0.44704, D({ L: 1, T: -1 }), false]],
  ['knot', [1852 / 3600, D({ L: 1, T: -1 }), false]],
  ['psia', [(0.45359237 * 9.80665) / (0.0254 * 0.0254), D({ L: -1, M: 1, T: -2 }), false]],
  ['ksi', [(1000 * (0.45359237 * 9.80665)) / (0.0254 * 0.0254), D({ L: -1, M: 1, T: -2 }), false]],
  ['mmH2O', [9.80665, D({ L: -1, M: 1, T: -2 }), false]],
  ['inHg', [133.322387415 * 25.4, D({ L: -1, M: 1, T: -2 }), false]],
  ['tonne', [1000, D({ M: 1 }), false]],
  // US therm (EC therm is 1.05506e8 J). Spelled out so the choice is visible.
  ['therm', [105480400, JOULE, false]],
]);

/** Units that are a ratio or a log scale, and the reason each is not a plain factor. */
const REFUSED_UNITS: ReadonlyMap<string, string> = new Map([
  ['dB', 'dB is a logarithmic unit; give the quantity in its linear unit, or a reference level'],
  ['dBm', 'dBm is a logarithmic unit (decibels over 1 mW); give watts'],
  ['dBW', 'dBW is a logarithmic unit (decibels over 1 W); give watts'],
  ['Np', 'Np is a logarithmic unit (the neper); give the quantity in its linear unit, or a reference level'],
  ['Mach', 'Mach is a ratio to the local speed of sound; give m/s, or the ratio as a bare number'],
  ['mach', 'mach is a ratio to the local speed of sound; give m/s, or the ratio as a bare number'],
  ['ton', "'ton' is ambiguous: short ton (907.185 kg), long ton (1016.047 kg), or metric tonne (1000 kg); write tonne"],
]);

/**
 * Letters that are both an SI prefix and a unit of their own (tesla, gauss,
 * poise, hour, day, molar, atomic mass). Such a token reads as the prefix
 * reading and not as the unit times the rest: `Gyr` is a gigayear, `TW` a
 * terawatt, `hPa` a hectopascal. `m` is left out on purpose: `mK` in a
 * denominator is millikelvin or metre·kelvin, and a target dimension chooses.
 */
const PREFIX_LETTER_UNITS: ReadonlySet<string> = new Set(['T', 'G', 'P', 'h', 'd', 'M', 'u']);

const CELSIUS_OFFSET_K = 273.15;
const FAHRENHEIT_SCALE = 5 / 9;

interface AffineRow {
  readonly id: AffineTemperature;
  readonly scale: number;
  readonly offset: number;
  readonly symbols: readonly string[];
}

/** Lone spellings. A compound that contains one is refused. */
const AFFINE: readonly AffineRow[] = [
  { id: 'celsius', scale: 1, offset: CELSIUS_OFFSET_K, symbols: ['degC', '°C', '℃'] },
  {
    id: 'fahrenheit',
    scale: FAHRENHEIT_SCALE,
    offset: CELSIUS_OFFSET_K - 32 * FAHRENHEIT_SCALE,
    symbols: ['degF', '°F'],
  },
];

function affineRow(text: string): AffineRow | undefined {
  return AFFINE.find((row) => row.symbols.includes(text));
}

const PREFIXES: ReadonlyMap<string, number> = new Map([
  ['Y', 1e24], ['Z', 1e21], ['E', 1e18], ['P', 1e15], ['T', 1e12], ['G', 1e9], ['M', 1e6], ['k', 1e3],
  ['h', 1e2], ['da', 1e1], ['d', 1e-1], ['c', 1e-2], ['m', 1e-3], ['u', 1e-6], ['µ', 1e-6], ['μ', 1e-6],
  ['n', 1e-9], ['p', 1e-12], ['f', 1e-15], ['a', 1e-18], ['z', 1e-21], ['y', 1e-24],
]);

function parseSymbol(sym: string): readonly [number, Dimension] {
  const parsed = trySymbol(sym);
  if (parsed !== null) return parsed;
  throw new UnitError(`unknown unit '${sym}'`);
}

function trySymbol(sym: string): readonly [number, Dimension] | null {
  const exact = UNITS.get(sym);
  if (exact !== undefined) return [exact[0], exact[1]];
  for (const [p, f] of PREFIXES) {
    if (!sym.startsWith(p) || sym.length === p.length) continue;
    const base = UNITS.get(sym.slice(p.length));
    if (base !== undefined && base[2]) return [f * base[0], base[1]];
  }
  return null;
}

interface FactorReading {
  readonly base: string;
  readonly exp: number;
  readonly scale: number;
  readonly dim: Dimension;
}

/** One factor, or null when `token` is not exactly one unit with an optional exponent. */
function tryOneFactor(token: string): FactorReading | null {
  let base = token;
  let exp = 1;
  const caret = /^(.+)\^([+-]?\d+)$/.exec(token);
  if (caret !== null) {
    base = caret[1]!;
    exp = Number(caret[2]);
  } else {
    const uni = /^(.*?)([¹²³])$/.exec(token);
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
  return { base, exp, scale: parsed[0], dim: parsed[1] };
}

function formatReading(factors: readonly FactorReading[]): string {
  return factors.map((factor) => (factor.exp === 1 ? factor.base : `${factor.base}^${factor.exp}`)).join('·');
}

/** The unprefixed unit a prefix spelling attaches to, or null when `symbol` is exact. */
function attachedUnit(symbol: string): string | null {
  if (UNITS.has(symbol)) return null;
  for (const [prefix] of PREFIXES) {
    if (!symbol.startsWith(prefix) || symbol.length === prefix.length) continue;
    const base = symbol.slice(prefix.length);
    const row = UNITS.get(base);
    if (row !== undefined && row[2]) return base;
  }
  return null;
}

/**
 * A product of the same unprefixed unit the prefix attaches to (`mm` = m·m,
 * `mm2` = m·m²). Powers are written `m2` / `m^2`, so this reading does not
 * compete with the prefix.
 */
function homogeneousPower(single: FactorReading, product: readonly FactorReading[]): boolean {
  const unit = attachedUnit(single.base);
  if (unit === null) return false;
  return product.every((factor) => factor.base === unit && attachedUnit(factor.base) === null);
}

/** Every way to split `token` into one or more factors. A one-factor token is included. */
function segmentations(token: string): FactorReading[][] {
  const ways: FactorReading[][][] = Array.from({ length: token.length + 1 }, () => []);
  ways[0]!.push([]);
  for (let i = 0; i < token.length; i++) {
    if (ways[i]!.length === 0) continue;
    for (let j = i + 1; j <= token.length; j++) {
      const factor = tryOneFactor(token.slice(i, j));
      if (factor === null) continue;
      for (const prev of ways[i]!) ways[j]!.push([...prev, factor]);
    }
  }
  const unique = new Map<string, FactorReading[]>();
  for (const way of ways[token.length]!) unique.set(formatReading(way), way);
  return [...unique.values()];
}

/**
 * Ways to read one token. A bare expression keeps a one-factor reading and
 * does not also split it. Inside a compound, a prefixed factor also competes
 * with each heterogeneous product. A homogeneous power does not.
 */
function tokenWays(token: string, compete: boolean, side: 'numerator' | 'denominator'): FactorReading[][] {
  const refused = REFUSED_UNITS.get(token);
  if (refused !== undefined) throw new UnitError(refused);
  const single = tryOneFactor(token);
  if (single !== null && !compete) return [[single]];
  // A prefixed numerator token is the prefix reading: `mN/m` is millinewton per metre.
  // A denominator keeps the product readings (`W/mK`), and a target dimension chooses.
  if (single !== null && side === 'numerator') return [[single]];
  const prefixWins = single !== null && PREFIX_LETTER_UNITS.has(token[0]!) && attachedUnit(single.base) !== null;
  const products = segmentations(token)
    .filter((way) => way.length > 1)
    .filter(() => !prefixWins);
  const extra = single === null ? products : products.filter((way) => !homogeneousPower(single, way));
  const ways: FactorReading[][] = [];
  if (single !== null) ways.push([single]);
  for (const way of extra) ways.push(way);
  const unique = new Map<string, FactorReading[]>();
  for (const way of ways) unique.set(formatReading(way), way);
  const list = [...unique.values()];
  if (list.length === 0) throw new UnitError(`unknown unit '${token}'`);
  return list;
}

function cartesian<T>(lists: readonly (readonly T[])[]): T[][] {
  let acc: T[][] = [[]];
  for (const list of lists) {
    const next: T[][] = [];
    for (const prev of acc) for (const item of list) next.push([...prev, item]);
    acc = next;
  }
  return acc;
}

interface UnitReading extends ParsedUnit {
  readonly label: string;
}

function sideTokens(text: string): string[] {
  return text.split(/[*·\s]+|(?<=[A-Za-zµμΩ])\.(?=[A-Za-zµμΩ])/).filter((part) => part.length > 0);
}

function formatSide(tokens: readonly (readonly FactorReading[])[]): string {
  return tokens.map((factors) => formatReading(factors)).join('·');
}

function formatExpression(
  num: readonly (readonly FactorReading[])[],
  den: readonly (readonly FactorReading[])[],
): string {
  const numerator = formatSide(num);
  if (den.length === 0) return numerator;
  const denominator = formatSide(den);
  return denominator.includes('·') ? `${numerator}/(${denominator})` : `${numerator}/${denominator}`;
}

/**
 * A product of decimal scales picks up float noise (`1e-3 / (1e-2)^3` is
 * 999.9999999999999). Snap to 15 significant digits when that is within a few
 * ulps of the computed value, so `1 g/cm^3` is exactly 1000.
 */
function tidy(x: number): number {
  const snapped = Number(x.toPrecision(15));
  return Math.abs(snapped - x) <= 4 * Number.EPSILON * Math.abs(x) ? snapped : x;
}

function accumulate(tokens: readonly (readonly FactorReading[])[], sign: 1 | -1): { scale: number; dim: Dimension } {
  let scale = 1;
  let dim = DIMENSIONLESS;
  for (const factors of tokens) {
    for (const factor of factors) {
      const n = sign * factor.exp;
      scale *= factor.scale ** n;
      dim = multiply(dim, power(factor.dim, n));
    }
  }
  return { scale, dim };
}

/** Every dimensionally distinct spelling of one unit expression. */
function unitReadings(text: string): UnitReading[] {
  const t = text.trim();
  if (t === '' || t === '1') return [{ scale: 1, dim: DIMENSIONLESS, label: '1' }];
  const affine = affineRow(t);
  if (affine !== undefined) {
    return [{ scale: affine.scale, dim: D({ Theta: 1 }), affine: affine.id, label: t }];
  }
  if (
    AFFINE.some((row) => row.symbols.some((symbol) => t.includes(symbol))) ||
    /deg\s+[CFcf]|°\s*[CFcf]/.test(t)
  ) {
    throw new UnitError('an affine temperature cannot be part of a compound unit; give K');
  }
  // A chain reads left to right: `km/s/Mpc` is km/(s·Mpc), the way the Hubble constant is written.
  const parts = t.split('/');
  const compete = /[*·/\s]/.test(t);
  const numerator = sideTokens(parts[0]!);
  const denominatorText = parts
    .slice(1)
    .map((part) => part.replace(/^\((.*)\)$/, '$1'))
    .join('*');
  const denominator = denominatorText === '' ? [] : sideTokens(denominatorText);
  // `/s` is a dimensionless numerator over seconds. A bare `/` is not a unit.
  if (numerator.length === 0 && denominator.length === 0) throw new UnitError(`unknown unit '${t}'`);
  const numWays = numerator.map((token) => tokenWays(token, compete, 'numerator'));
  const denWays = denominator.map((token) => tokenWays(token, compete, 'denominator'));
  const numCombos = numerator.length === 0 ? [[]] : cartesian(numWays);
  const denCombos = denominator.length === 0 ? [[]] : cartesian(denWays);
  const unique = new Map<string, UnitReading>();
  for (const num of numCombos) {
    for (const den of denCombos) {
      const n = accumulate(num, 1);
      const d = accumulate(den, -1);
      const label = formatExpression(num, den);
      // One factor keeps its exact table scale; a product is snapped.
      const factors = [...num, ...den].reduce((count, way) => count + way.length, 0);
      const scale = n.scale * d.scale;
      unique.set(label, { scale: factors > 1 ? tidy(scale) : scale, dim: multiply(n.dim, d.dim), label });
    }
  }
  return [...unique.values()];
}

function ambiguousMessage(text: string, readings: readonly UnitReading[]): string {
  return `'${text}' is ambiguous: ${readings.map((reading) => reading.label).join(' or ')}`;
}

const SUPERSCRIPT: Readonly<Record<string, number>> = { '¹': 1, '²': 2, '³': 3 };

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
  if (symbols.includes('P')) notes.push('bare P is the poise (0.1 Pa·s); PV is still a petavolt');
  if (symbols.includes('M')) notes.push('bare M is the molar (1000 mol/m^3); MPa is still a megapascal');
  if (symbols.includes('u')) notes.push('bare u is the atomic mass unit (1.66053906660e-27 kg); um is still a micrometre');
  return notes;
}

/** Parse a unit expression; the empty string is dimensionless. @public */
export function parseUnit(text: string): ParsedUnit {
  const t = text.trim();
  const readings = unitReadings(t);
  if (readings.length !== 1) throw new UnitError(ambiguousMessage(t, readings));
  const reading = readings[0]!;
  return {
    scale: reading.scale,
    dim: reading.dim,
    ...(reading.affine !== undefined ? { affine: reading.affine } : {}),
  };
}

/** How a temperature value is read: as a point on the scale, or as a difference. @public */
export type TemperatureReading = 'absolute' | 'difference';

/** Kelvin added when this affine unit is an absolute point. @internal */
export function affineAbsoluteOffsetK(id: 'celsius' | 'fahrenheit'): number {
  const row = AFFINE.find((candidate) => candidate.id === id);
  if (row === undefined) throw new UnitError(`unknown affine temperature '${id}'`);
  return row.offset;
}

/** Kelvin from an affine or proportional reading. A difference drops the offset. */
function kelvinFrom(value: number, unit: ParsedUnit, reading: TemperatureReading): number {
  const row = unit.affine === undefined ? undefined : AFFINE.find((candidate) => candidate.id === unit.affine);
  const offset = row !== undefined && reading === 'absolute' ? row.offset : 0;
  return value * unit.scale + offset;
}

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
  const fraction = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*\/\s*((?:\d+\.?\d*|\.\d+))\s*$/.exec(raw);
  if (fraction !== null && Number(fraction[2]) !== 0) return { value: Number(fraction[1]) / Number(fraction[2]), given: '' };
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/.exec(raw);
  if (m === null) throw new UnitError(`'${raw}' is not a number with an optional unit`);
  const v = Number(m[1]);
  const given = m[2]!;
  if (!Number.isFinite(v)) throw new UnitError(`'${raw}' is not a finite number`);
  if (given === '') return { value: v, given };
  const readings = unitReadings(given);
  const to = parseUnit(target);
  if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
  const matched = readings.filter((candidate) => equals(candidate.dim, to.dim));
  if (matched.length !== 1) {
    if (readings.length > 1) throw new UnitError(ambiguousMessage(given, readings));
    const from = readings[0];
    if (from === undefined) throw new UnitError(`unknown unit '${given}'`);
    throw new UnitError(`'${given}' is ${format(from.dim)}, but this input is ${format(to.dim)} (${target || 'dimensionless'})`);
  }
  const from = matched[0]!;
  const local = kelvinFrom(v, from, reading) / to.scale;
  // MathTS `unit` + `toSI` is the conversion when it reads the same quantity.
  // A temperature difference must not take the absolute offset `toSI` adds.
  // `bit` is ln 2 nat here; MathTS reads `bit` as 1. Symbols MathTS does not
  // have (a solar mass, a Julian year, the gauss) stay on the table above.
  const via = mathTsRatio(v, given, target);
  if (via !== undefined && sameQuantity(via, local)) return { value: tidy(via), given };
  return { value: tidy(local), given };
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

interface MathTsUnit {
  toSI(): { value: unknown };
  dimensions: readonly number[];
}

/** The 7-base record for a MathTS length-10 exponent vector. Angle, bit, and solid angle are dropped. */
function dimensionFromUnitVector(vector: readonly number[]): Dimension {
  const v = toSiDimensionVector(vector, { ignoreExtra: true });
  return { L: v[0], M: v[1], T: v[2], I: v[3], Theta: v[4], N: v[5], J: v[6] };
}

function mathTsReading(value: number, unitText: string): { si: number; dim: Dimension } {
  // `unit` is a typed-function; its declared return is `unknown`.
  const created = unit(value, mathTsSpelling(unitText)) as MathTsUnit;
  const n = Number(created.toSI().value);
  if (!Number.isFinite(n)) throw new Error('non-finite SI magnitude');
  return { si: n, dim: dimensionFromUnitVector(created.dimensions) };
}

function mathTsRatio(value: number, given: string, target: string): number | undefined {
  try {
    const from = mathTsReading(value, given);
    const to = mathTsReading(1, target);
    if (to.si === 0) return undefined;
    // A scale match is not enough when the 7-base dimensions differ.
    if (!equals(from.dim, parseUnit(given).dim)) return undefined;
    if (!equals(to.dim, parseUnit(target).dim)) return undefined;
    return from.si / to.si;
  } catch {
    return undefined;
  }
}

/**
 * MathTS's SI value for `magnitude` of `unitText`, when that value and the
 * 7-base dimension agree with `local`. Affine °C stays on the local offset.
 * A symbol MathTS lacks, or a scale it disagrees with (`bit` is 1 there and
 * ln 2 here; a solar mass, a Julian year, and the gauss are absent), returns
 * undefined so the caller keeps the local table.
 *
 * @internal
 */
export function mathTsAgreedQuantity(
  magnitude: number,
  unitText: string,
  local: ParsedUnit,
): { value: number; dim: Dimension } | undefined {
  if (local.affine !== undefined) return undefined;
  try {
    const read = mathTsReading(magnitude, unitText);
    if (!sameQuantity(read.si, magnitude * local.scale)) return undefined;
    if (!equals(read.dim, local.dim)) return undefined;
    return { value: read.si, dim: read.dim };
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
