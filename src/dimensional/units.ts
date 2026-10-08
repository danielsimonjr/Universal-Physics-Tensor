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
import { equals, format, multiply, power } from './algebra.js';
import type { Dimension } from './types.js';
import { C_SI, E_SI, G_SI, GM_SUN_SI, M_SUN_SI, M_U_SI } from '../core/constants.js';
import {
  addScales,
  decimalScale,
  divideScales,
  irrationalScale,
  multiplyScales,
  powerScale,
  ratioScale,
  scaleOf,
  scaleToNumber,
  UNIT_SCALE,
  type ExactScale,
} from './exact-scale.js';

/** An affine temperature scale: a lone `degC` or `degF`. @public */
export type AffineTemperature = 'celsius' | 'fahrenheit';

/** A unit, as a scale to SI base units and a dimension. @public */
export interface ParsedUnit {
  readonly scale: number;
  readonly dim: Dimension;
  /** Set only for a lone affine temperature, which needs a reading. */
  readonly affine?: AffineTemperature;
}

/** Thrown for any input that does not parse as a value with a known unit. @public */
export class UnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitError';
  }
}

/** A symbol no table row and no prefix spells. @public */
export class UnknownUnitError extends UnitError {
  constructor(readonly symbol: string) {
    super(`unknown unit '${symbol}'`);
    this.name = 'UnknownUnitError';
  }
}

/**
 * A unit the reader recognizes and refuses: a logarithmic or ratio unit, an
 * ambiguous name such as `ton`, or an affine temperature inside a compound.
 * @public
 */
export class UnitRefusedError extends UnitError {
  constructor(message: string) {
    super(message);
    this.name = 'UnitRefusedError';
  }
}

/** A unit expression with more than one dimensionally distinct reading. @public */
export class AmbiguousUnitError extends UnitError {
  constructor(readonly text: string, readonly readings: readonly string[]) {
    super(`'${text}' is ambiguous: ${readings.join(' or ')}`);
    this.name = 'AmbiguousUnitError';
  }
}

const D = (p: Partial<Dimension>): Dimension => ({ L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0, ...p });
const JOULE = D({ L: 2, M: 1, T: -2 });
const DIMENSIONLESS = D({});

/** One unit symbol. */
interface UnitRow {
  /** Exact scale to SI base units. */
  readonly scale: ExactScale;
  readonly dim: Dimension;
  /** Takes an SI prefix. */
  readonly prefixable: boolean;
  /**
   * The unit counts cycles (turns), not radians. An angular-frequency input in
   * rad/s takes 2π per cycle; the radian itself does not.
   */
  readonly cycles?: true;
}

const x = (scale: string | ExactScale): ExactScale => (typeof scale === 'string' ? decimalScale(scale)! : scale);
const row = (scale: string | ExactScale, dim: Dimension, prefixable: boolean, cycles?: true): UnitRow =>
  cycles === true ? { scale: x(scale), dim, prefixable, cycles } : { scale: x(scale), dim, prefixable };

const PI = irrationalScale(Math.PI);
const INCH = x('0.0254');
const FOOT = x('0.3048');
const POUND = x('0.45359237');
const STANDARD_GRAVITY = x('9.80665');
const LBF = multiplyScales(POUND, STANDARD_GRAVITY);
const PSI = divideScales(LBF, powerScale(INCH, 2));
const JULIAN_YEAR_S = multiplyScales(x('365.25'), x('86400'));
const MM_HG = x('133.322387415');

/** symbol → exact scale to SI base, dimension, prefixability, cycle count. */
const UNITS: ReadonlyMap<string, UnitRow> = new Map([
  ['m', row('1', D({ L: 1 }), true)],
  ['g', row('1e-3', D({ M: 1 }), true)],
  ['s', row('1', D({ T: 1 }), true)],
  ['K', row('1', D({ Theta: 1 }), true)],
  ['A', row('1', D({ I: 1 }), true)],
  ['mol', row('1', D({ N: 1 }), true)],
  // A hertz is one cycle per second.
  ['Hz', row('1', D({ T: -1 }), true, true)],
  ['N', row('1', D({ L: 1, M: 1, T: -2 }), true)],
  ['Pa', row('1', D({ L: -1, M: 1, T: -2 }), true)],
  ['J', row('1', JOULE, true)],
  ['W', row('1', D({ L: 2, M: 1, T: -3 }), true)],
  ['C', row('1', D({ T: 1, I: 1 }), true)],
  ['V', row('1', D({ L: 2, M: 1, T: -3, I: -1 }), true)],
  ['ohm', row('1', D({ L: 2, M: 1, T: -3, I: -2 }), true)],
  ['Ω', row('1', D({ L: 2, M: 1, T: -3, I: -2 }), true)],
  ['S', row('1', D({ L: -2, M: -1, T: 3, I: 2 }), true)],
  ['F', row('1', D({ L: -2, M: -1, T: 4, I: 2 }), true)],
  ['eV', row(scaleOf(E_SI), JOULE, true)],
  // Information. A nat is the coherent dimensionless unit; a bit is ln 2 nat.
  // Exact, so neither takes a prefix (`kbit` is not a kilobit).
  ['nat', row('1', DIMENSIONLESS, false)],
  ['bit', row(irrationalScale(Math.LN2), DIMENSIONLESS, false)],
  ['rad', row('1', DIMENSIONLESS, true)],
  ['deg', row(multiplyScales(PI, ratioScale(1, 180)), DIMENSIONLESS, false)],
  ['min', row('60', D({ T: 1 }), false)],
  ['h', row('3600', D({ T: 1 }), false)],
  ['d', row('86400', D({ T: 1 }), false)],
  // The Julian year, the year the orbital evaluators take.
  ['yr', row(JULIAN_YEAR_S, D({ T: 1 }), true)],
  ['au', row('149597870700', D({ L: 1 }), false)],
  ['AU', row('149597870700', D({ L: 1 }), false)],
  // The solar mass the evaluators use, not the IAU nominal value.
  ['Msun', row(scaleOf(M_SUN_SI), D({ M: 1 }), false)],
  // GM☉/G, so G × Msun_iau is the IAU solar mass parameter.
  // A ratio of two measured constants, so it is the double the registry's Msun_iau holds, not a decimal quotient.
  ['Msun_iau', row(scaleOf(GM_SUN_SI / G_SI), D({ M: 1 }), false)],
  // Tesla. An exact `T` still wins over the tera prefix, so `Ts` is a
  // terasecond. The prefix flag is what lets `nT` and `uT` parse.
  ['T', row('1', D({ M: 1, T: -2, I: -1 }), true)],
  // Gauss = 10⁻⁴ T. Exact, so `GPa` stays gigapascal (prefix G + Pa) and bare `G` is gauss.
  // The gauss takes an SI prefix: `uG` and `ugauss` are a microgauss, not a product of other units.
  ['G', row('1e-4', D({ M: 1, T: -2, I: -1 }), true)],
  ['gauss', row('1e-4', D({ M: 1, T: -2, I: -1 }), true)],
  ['Gauss', row('1e-4', D({ M: 1, T: -2, I: -1 }), true)],
  ['bar', row('1e5', D({ L: -1, M: 1, T: -2 }), true)],
  ['atm', row('101325', D({ L: -1, M: 1, T: -2 }), false)],
  ['angstrom', row('1e-10', D({ L: 1 }), false)],
  ['Angstrom', row('1e-10', D({ L: 1 }), false)],
  ['Å', row('1e-10', D({ L: 1 }), false)],
  // IAU-style parsec; the prefix applies, so `Mpc` is a megaparsec.
  ['pc', row(scaleOf(3.0856775814913673e16), D({ L: 1 }), true)],
  ['ly', row(multiplyScales(scaleOf(C_SI), JULIAN_YEAR_S), D({ L: 1 }), false)],
  // CGPM 1964: 1 L = 1 dm³ = 10⁻³ m³ exactly. Prefixable, so mL is a millilitre.
  // `l` is the same litre. Bare `mL` stays the prefix; `mol/mL` competes with metre·litre.
  ['L', row('1e-3', D({ L: 3 }), true)],
  ['l', row('1e-3', D({ L: 3 }), true)],
  // Thermochemical calorie: 1 cal_th = 4.184 J exactly (NIST). Not cal_IT = 4.1868 J.
  // Prefixable, so kcal is 4184 J.
  ['cal', row('4.184', JOULE, true)],
  // International Steam Table BTU: cal_IT × (lb/g) / (°F per 1.8 °C).
  // 4.1868 × 453.59237 / 1.8 J exactly. Not the thermochemical calorie.
  ['BTU', row(divideScales(multiplyScales(x('4.1868'), x('453.59237')), x('1.8')), JOULE, false)],
  // psi = lbf/in². lbf = 0.45359237 kg × 9.80665 m/s² (1959 pound × standard gravity).
  // inch = 0.0254 m exactly.
  ['psi', row(PSI, D({ L: -1, M: 1, T: -2 }), false)],
  // torr = 1/760 of a standard atmosphere = 101325/760 Pa exactly. Prefixable (mtorr).
  ['torr', row(ratioScale(101325, 760), D({ L: -1, M: 1, T: -2 }), true)],
  // Conventional millimetre of mercury, 133.322387415 Pa exactly (NIST SP 811).
  // Not the torr, and not `mm` × `Hg`.
  ['mmHg', row(MM_HG, D({ L: -1, M: 1, T: -2 }), false)],
  // Poise = 0.1 Pa·s exactly. Prefixable, so cP = 10⁻³ Pa·s. Exact `P` wins over peta.
  ['P', row('0.1', D({ L: -1, M: 1, T: -1 }), true)],
  // Rankine is proportional: K = °R × 5/9. Not affine.
  ['degR', row(ratioScale(5, 9), D({ Theta: 1 }), false)],
  ['°R', row(ratioScale(5, 9), D({ Theta: 1 }), false)],
  // Revolutions per minute = 1/60 Hz, a cycle count. Prefixable, so krpm is a kilorevolution per minute.
  ['rpm', row(ratioScale(1, 60), D({ T: -1 }), true, true)],
  // Mechanical horsepower = 550 ft·lbf/s. ft = 0.3048 m.
  ['hp', row(multiplyScales(x('550'), FOOT, LBF), D({ L: 2, M: 1, T: -3 }), false)],
  // Named SI derived units the dogfood rounds found missing.
  ['H', row('1', D({ L: 2, M: 1, T: -2, I: -2 }), true)],
  ['Wb', row('1', D({ L: 2, M: 1, T: -2, I: -1 }), true)],
  ['Ohm', row('1', D({ L: 2, M: 1, T: -3, I: -2 }), true)],
  // Plane and solid angle, photometry, and ratios. The steradian and the radian are dimensionless here.
  ['sr', row('1', DIMENSIONLESS, false)],
  ['cd', row('1', D({ J: 1 }), true)],
  ['lm', row('1', D({ J: 1 }), true)],
  ['lx', row('1', D({ J: 1, L: -2 }), true)],
  ['arcsec', row(multiplyScales(PI, ratioScale(1, 648000)), DIMENSIONLESS, false)],
  ['arcmin', row(multiplyScales(PI, ratioScale(1, 10800)), DIMENSIONLESS, false)],
  // `mas` would otherwise be metre times attosecond, so the angular spellings are exact.
  ['mas', row(multiplyScales(PI, ratioScale(1, 648000000)), DIMENSIONLESS, false)],
  ['uas', row(multiplyScales(PI, ratioScale(1, 648000000000)), DIMENSIONLESS, false)],
  ['%', row('1e-2', DIMENSIONLESS, false)],
  ['percent', row('1e-2', DIMENSIONLESS, false)],
  ['ppm', row('1e-6', DIMENSIONLESS, false)],
  ['ppb', row('1e-9', DIMENSIONLESS, false)],
  // Molar concentration: 1 M = 1 mol/L. Bare `M` is the molar; `MPa` is still a megapascal.
  ['M', row('1000', D({ N: 1, L: -3 }), true)],
  // Unified atomic mass unit (CODATA 2018). A bare `u` is this; `um` is still a micrometre.
  ['u', row(scaleOf(M_U_SI), D({ M: 1 }), false)],
  ['amu', row(scaleOf(M_U_SI), D({ M: 1 }), false)],
  ['Da', row(scaleOf(M_U_SI), D({ M: 1 }), true)],
  // CGS and astronomy. Solar and planetary radii and masses are the IAU 2015 B3 nominal values.
  ['erg', row('1e-7', JOULE, false)],
  ['cc', row('1e-6', D({ L: 3 }), false)],
  ['dyn', row('1e-5', D({ L: 1, M: 1, T: -2 }), true)],
  ['Jy', row('1e-26', D({ M: 1, T: -2 }), true)],
  ['Lsun', row('3.828e26', D({ L: 2, M: 1, T: -3 }), false)],
  ['Rsun', row('6.957e8', D({ L: 1 }), false)],
  ['Rearth', row('6.3781e6', D({ L: 1 }), false)],
  ['Rjup', row('7.1492e7', D({ L: 1 }), false)],
  ['Mearth', row('5.9722e24', D({ M: 1 }), false)],
  ['Mjup', row('1.89813e27', D({ M: 1 }), false)],
  ['day', row('86400', D({ T: 1 }), false)],
  ['hr', row('3600', D({ T: 1 }), false)],
  // Acoustics and fluids. Poise, stokes, and rayl are exact in SI.
  ['poise', row('0.1', D({ L: -1, M: 1, T: -1 }), true)],
  ['St', row('1e-4', D({ L: 2, T: -1 }), true)],
  ['rayl', row('1', D({ L: -2, M: 1, T: -1 }), true)],
  // Imperial and pressure units. psi = lbf/in²; ksi is a kilopsi.
  ['in', row(INCH, D({ L: 1 }), false)],
  ['inch', row(INCH, D({ L: 1 }), false)],
  ['ft', row(FOOT, D({ L: 1 }), false)],
  ['mil', row('2.54e-5', D({ L: 1 }), false)],
  ['lb', row(POUND, D({ M: 1 }), false)],
  ['lbm', row(POUND, D({ M: 1 }), false)],
  ['lbf', row(LBF, D({ L: 1, M: 1, T: -2 }), false)],
  ['kgf', row(STANDARD_GRAVITY, D({ L: 1, M: 1, T: -2 }), false)],
  ['mph', row('0.44704', D({ L: 1, T: -1 }), false)],
  ['knot', row(ratioScale(1852, 3600), D({ L: 1, T: -1 }), false)],
  ['psia', row(PSI, D({ L: -1, M: 1, T: -2 }), false)],
  ['ksi', row(multiplyScales(x('1000'), PSI), D({ L: -1, M: 1, T: -2 }), false)],
  ['mmH2O', row(STANDARD_GRAVITY, D({ L: -1, M: 1, T: -2 }), false)],
  ['inHg', row(multiplyScales(MM_HG, x('25.4')), D({ L: -1, M: 1, T: -2 }), false)],
  ['tonne', row('1000', D({ M: 1 }), false)],
  // US therm (EC therm is 1.05506e8 J). Spelled out so the choice is visible.
  ['therm', row('105480400', JOULE, false)],
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

const CELSIUS_OFFSET_K = x('273.15');
const FAHRENHEIT_SCALE = ratioScale(5, 9);

interface AffineRow {
  readonly id: AffineTemperature;
  /** Kelvin per degree, exactly. */
  readonly scale: ExactScale;
  /** The reading at the ice point (0 °C, 273.15 K), exactly. */
  readonly icePoint: ExactScale;
  readonly symbols: readonly string[];
}

/** Lone spellings. A compound that contains one is refused. */
const AFFINE: readonly AffineRow[] = [
  { id: 'celsius', scale: UNIT_SCALE, icePoint: x('0'), symbols: ['degC', '°C', '℃'] },
  { id: 'fahrenheit', scale: FAHRENHEIT_SCALE, icePoint: x('32'), symbols: ['degF', '°F'] },
];

/** Kelvin at a reading of zero, exactly: 273.15 − icePoint × scale. */
function affineOffset(row: AffineRow): ExactScale {
  return addScales(CELSIUS_OFFSET_K, multiplyScales(x('-1'), row.icePoint, row.scale));
}

const fractionText = (s: ExactScale): string => (s.den === 1n ? String(s.num) : `${s.num}/${s.den}`);

/**
 * How a reading on an affine scale becomes kelvin, from the row's scale and
 * ice point: `absolute: (degF − 32) × 5/9 + 273.15`, `a difference: × 5/9, no offset`.
 * @internal
 */
export function affineReadingNote(affine: AffineTemperature, reading: TemperatureReading): string {
  const row = AFFINE.find((candidate) => candidate.id === affine)!;
  const unitScale = row.scale.num === row.scale.den;
  if (reading === 'difference') return unitScale ? 'a difference: no offset' : `a difference: × ${fractionText(row.scale)}, no offset`;
  const kelvin = String(scaleToNumber(CELSIUS_OFFSET_K));
  if (unitScale && row.icePoint.num === 0n) return `absolute: + ${kelvin}`;
  const shifted = row.icePoint.num === 0n ? row.symbols[0]! : `(${row.symbols[0]!} − ${fractionText(row.icePoint)})`;
  return `absolute: ${unitScale ? shifted : `${shifted} × ${fractionText(row.scale)}`} + ${kelvin}`;
}

function affineRow(text: string): AffineRow | undefined {
  return AFFINE.find((candidate) => candidate.symbols.includes(text));
}

const PREFIXES: ReadonlyMap<string, ExactScale> = new Map(
  (
    [
      ['Y', '1e24'], ['Z', '1e21'], ['E', '1e18'], ['P', '1e15'], ['T', '1e12'], ['G', '1e9'], ['M', '1e6'], ['k', '1e3'],
      ['h', '1e2'], ['da', '1e1'], ['d', '1e-1'], ['c', '1e-2'], ['m', '1e-3'], ['u', '1e-6'], ['µ', '1e-6'], ['μ', '1e-6'],
      ['n', '1e-9'], ['p', '1e-12'], ['f', '1e-15'], ['a', '1e-18'], ['z', '1e-21'], ['y', '1e-24'],
    ] as const
  ).map(([prefix, scale]) => [prefix, x(scale)] as const),
);

interface SymbolReading {
  readonly scale: ExactScale;
  readonly dim: Dimension;
  readonly cycles: number;
}

function trySymbol(sym: string): SymbolReading | null {
  const exact = UNITS.get(sym);
  if (exact !== undefined) return { scale: exact.scale, dim: exact.dim, cycles: exact.cycles === true ? 1 : 0 };
  for (const [p, f] of PREFIXES) {
    if (!sym.startsWith(p) || sym.length === p.length) continue;
    const base = UNITS.get(sym.slice(p.length));
    if (base !== undefined && base.prefixable) {
      return { scale: multiplyScales(f, base.scale), dim: base.dim, cycles: base.cycles === true ? 1 : 0 };
    }
  }
  return null;
}

interface FactorReading {
  readonly base: string;
  readonly exp: number;
  readonly scale: ExactScale;
  readonly dim: Dimension;
  readonly cycles: number;
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
  return { base, exp, scale: parsed.scale, dim: parsed.dim, cycles: parsed.cycles };
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
    const unitRow = UNITS.get(base);
    if (unitRow !== undefined && unitRow.prefixable) return base;
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
  if (refused !== undefined) throw new UnitRefusedError(refused);
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
  if (list.length === 0) throw new UnknownUnitError(token);
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

/** One reading of a unit expression, with its exact scale. @internal */
export interface UnitReading extends ParsedUnit {
  readonly label: string;
  readonly exact: ExactScale;
  /** Net power of cycle-counting units (Hz, rpm): 1 for a lone `kHz`, 0 for `1/s`. */
  readonly cycles: number;
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

function accumulate(
  tokens: readonly (readonly FactorReading[])[],
  sign: 1 | -1,
): { scale: ExactScale; dim: Dimension; cycles: number } {
  let scale = UNIT_SCALE;
  let dim = DIMENSIONLESS;
  let cycles = 0;
  for (const factors of tokens) {
    for (const factor of factors) {
      const n = sign * factor.exp;
      scale = multiplyScales(scale, powerScale(factor.scale, n));
      dim = multiply(dim, power(factor.dim, n));
      cycles += factor.cycles * n;
    }
  }
  return { scale, dim, cycles };
}

function reading(exact: ExactScale, dim: Dimension, label: string, cycles: number, affine?: AffineTemperature): UnitReading {
  return {
    scale: scaleToNumber(exact),
    exact,
    dim,
    label,
    cycles,
    ...(affine === undefined ? {} : { affine }),
  };
}

/**
 * Every dimensionally distinct reading of one unit expression.
 *
 * The unit grammar is not the formula grammar, and the difference is
 * deliberate: a unit symbol is not an identifier (a prefix, a glued product
 * or a glued power lives inside one token: `mN`, `m2K`, `Vs`, `K²`, `°C`,
 * `%`), and everything after the first `/` is the denominator, the
 * single-solidus convention of ISO 80000-1 (`W/m*K` is W·m⁻¹·K⁻¹), where the
 * formula grammar would read `(W/m)·K`.
 * @internal
 */
function unitReadings(text: string): UnitReading[] {
  const t = text.trim();
  if (t === '' || t === '1') return [reading(UNIT_SCALE, DIMENSIONLESS, '1', 0)];
  const affine = affineRow(t);
  if (affine !== undefined) return [reading(affine.scale, D({ Theta: 1 }), t, 0, affine.id)];
  if (
    AFFINE.some((candidate) => candidate.symbols.some((symbol) => t.includes(symbol))) ||
    /deg\s+[CFcf]|°\s*[CFcf]/.test(t)
  ) {
    throw new UnitRefusedError('an affine temperature cannot be part of a compound unit; give K');
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
  if (numerator.length === 0 && denominator.length === 0) throw new UnknownUnitError(t);
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
      unique.set(label, reading(multiplyScales(n.scale, d.scale), multiply(n.dim, d.dim), label, n.cycles + d.cycles));
    }
  }
  return [...unique.values()];
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
  if (symbols.includes('u')) notes.push(`bare u is the atomic mass unit (${M_U_SI} kg); um is still a micrometre`);
  return notes;
}

/** The one reading of a unit expression; more than one is refused. @internal */
export function readUnit(text: string): UnitReading {
  const t = text.trim();
  const readings = unitReadings(t);
  if (readings.length !== 1) throw new AmbiguousUnitError(t, readings.map((r) => r.label));
  return readings[0]!;
}

/** Parse a unit expression; the empty string is dimensionless. @public */
export function parseUnit(text: string): ParsedUnit {
  const r = readUnit(text);
  return { scale: r.scale, dim: r.dim, ...(r.affine !== undefined ? { affine: r.affine } : {}) };
}

/** How a temperature value is read: as a point on the scale, or as a difference. @public */
export type TemperatureReading = 'absolute' | 'difference';

/** The SI magnitude of `magnitude` in `unit`, exactly. An absolute affine reading adds its offset. */
function siMagnitude(magnitude: ExactScale, unit: UnitReading, temperature: TemperatureReading): ExactScale {
  const scaled = multiplyScales(magnitude, unit.exact);
  const row = unit.affine === undefined ? undefined : AFFINE.find((candidate) => candidate.id === unit.affine);
  return row !== undefined && temperature === 'absolute' ? addScales(scaled, affineOffset(row)) : scaled;
}

const FRACTION = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*\/\s*((?:\d+\.?\d*|\.\d+))\s*$/;
const NUMBER_THEN_REST = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/;

/**
 * `raw` split into an exact decimal magnitude and the unit text after it, or
 * null when `raw` is not a number followed by an optional unit. A plain
 * fraction (`1/3`) is a number. Text that begins with an operator (`*h`,
 * `·c`) is an expression, not a unit.
 * @internal
 */
function splitQuantityLiteral(raw: string): { readonly magnitude: ExactScale; readonly unit: string } | null {
  const fraction = FRACTION.exec(raw);
  if (fraction !== null) {
    const den = decimalScale(fraction[2]!)!;
    if (den.num !== 0n) return { magnitude: divideScales(decimalScale(fraction[1]!)!, den), unit: '' };
  }
  const m = NUMBER_THEN_REST.exec(raw);
  if (m === null) return null;
  const unit = m[2]!;
  if (unit.startsWith('*') || unit.startsWith('·')) return null;
  const magnitude = decimalScale(m[1]!);
  return magnitude === null ? null : { magnitude, unit };
}

/** A number with a unit, read exactly and rounded once. @internal */
export interface QuantityLiteral {
  /** SI value; a bare number is unchanged. */
  readonly value: number;
  readonly dim: Dimension;
  /** The unit text as given; `''` for a bare number. */
  readonly unit: string;
  readonly cycles: number;
  readonly affine?: AffineTemperature;
}

function finiteLiteral(raw: string, value: number): number {
  if (!Number.isFinite(value)) throw new UnitError(`'${raw}' is not a finite number`);
  return value;
}

/**
 * Read `raw` as one number with an optional unit, in SI. Null when `raw` is
 * not that form or names a unit no row spells, so the caller can read it as
 * an expression. A refused unit and an ambiguous one throw. The value may be
 * non-finite (`1e999`); the caller owns that refusal and its error class.
 * @internal
 */
export function readQuantityLiteral(raw: string, temperature: TemperatureReading = 'absolute'): QuantityLiteral | null {
  const literal = splitQuantityLiteral(raw);
  if (literal === null) return null;
  if (literal.unit === '') {
    return { value: scaleToNumber(literal.magnitude), dim: DIMENSIONLESS, unit: '', cycles: 0 };
  }
  let unit: UnitReading;
  try {
    unit = readUnit(literal.unit);
  } catch (error) {
    if (error instanceof UnknownUnitError) return null;
    throw error;
  }
  return {
    value: scaleToNumber(siMagnitude(literal.magnitude, unit, temperature)),
    dim: unit.dim,
    unit: literal.unit,
    cycles: unit.cycles,
    ...(unit.affine === undefined ? {} : { affine: unit.affine }),
  };
}

/** A value converted into a declared unit. @public */
export interface ConvertedValue {
  readonly value: number;
  /** The unit the user gave; `''` for a bare number. */
  readonly given: string;
  /** Net power of cycle-counting units in `given` (1 for `Hz` or `rpm`); absent when 0. */
  readonly cycles?: number;
  /** Set when `given` is a lone affine temperature. */
  readonly affine?: AffineTemperature;
}

/**
 * Convert `raw` (`<number>[unit]`) into `target` (a unit expression). A bare
 * number is taken to be in `target` already. The dimensions must agree.
 *
 * The magnitude, the unit scales and the target scale are multiplied as
 * exact rationals and rounded once, so `1 g/cm^3` in `kg/m^3` is 1000.
 *
 * @returns the value in `target`, and the unit the user gave (`''` for none).
 * @public
 */
export function convertValue(raw: string, target: string, temperature: TemperatureReading = 'absolute'): ConvertedValue {
  const literal = splitQuantityLiteral(raw);
  if (literal === null) throw new UnitError(`'${raw}' is not a number with an optional unit`);
  if (literal.unit === '') return { value: finiteLiteral(raw, scaleToNumber(literal.magnitude)), given: '' };
  const given = literal.unit;
  const readings = unitReadings(given);
  const to = readUnit(target);
  if (to.affine !== undefined) throw new UnitError(`a declared unit cannot be affine ('${target}')`);
  const matched = readings.filter((candidate) => equals(candidate.dim, to.dim));
  if (matched.length !== 1) {
    if (readings.length > 1) throw new AmbiguousUnitError(given, readings.map((r) => r.label));
    const from = readings[0];
    if (from === undefined) throw new UnknownUnitError(given);
    throw new UnitError(`'${given}' is ${format(from.dim)}, but this input is ${format(to.dim)} (${target || 'dimensionless'})`);
  }
  const from = matched[0]!;
  const value = scaleToNumber(divideScales(siMagnitude(literal.magnitude, from, temperature), to.exact));
  return {
    value: finiteLiteral(raw, value),
    given,
    ...(from.cycles === 0 ? {} : { cycles: from.cycles }),
    ...(from.affine === undefined ? {} : { affine: from.affine }),
  };
}

/** The dimension of a declared unit expression. @internal */
export function unitDimension(unit: string): Dimension {
  return parseUnit(unit).dim;
}

/** The symbols the unit table spells, with their exact scales, for the agreement test against MathTS. @internal */
export function unitRows(): ReadonlyMap<string, { readonly scale: ExactScale; readonly dim: Dimension; readonly prefixable: boolean }> {
  return UNITS;
}

/**
 * The tables conversion reads, for the CLI record's fingerprint (`src/cli/record-tables.ts`):
 * each row's scale, dimension, prefixability and `cycles` flag (which multiplies an angular
 * input by 2π), the prefixes, and the Celsius offset.
 * @internal
 */
export function unitTables(): {
  units: ReadonlyMap<string, readonly [number, Dimension, boolean, boolean]>;
  prefixes: ReadonlyMap<string, number>;
  celsiusOffsetK: number;
} {
  return {
    units: new Map([...UNITS].map(([symbol, r]) => [symbol, [scaleToNumber(r.scale), r.dim, r.prefixable, r.cycles === true] as const])),
    prefixes: new Map([...PREFIXES].map(([prefix, f]) => [prefix, scaleToNumber(f)] as const)),
    celsiusOffsetK: scaleToNumber(CELSIUS_OFFSET_K),
  };
}
