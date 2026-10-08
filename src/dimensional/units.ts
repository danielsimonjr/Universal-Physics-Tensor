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
 * The table is data: `data/units.json`, loaded and validated by
 * `unit-data.ts`. Every row, prefix, refused spelling, prefix letter, affine
 * scale and spelling note is a row there, with the reason as its `comment`;
 * this module holds the grammar. `myr` is a milliyear because `m` is the SI
 * prefix, and `eV` takes one, so `GeV` is 10⁹ eV in joules.
 *
 * @module dimensional/units
 */
import { equals, format, multiply, power } from './algebra.js';
import type { Dimension } from './types.js';
import {
  addScales,
  decimalScale,
  divideScales,
  multiplyScales,
  powerScale,
  ratioScale,
  scaleToNumber,
  solidusSides,
  UNIT_SCALE,
  type ExactScale,
} from './exact-scale.js';
import { UNIT_DATA, type AffineRow as UnitDataAffineRow } from './unit-data.js';

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
const DIMENSIONLESS = D({});

/** symbol → exact scale to SI base, dimension, prefixability, cycle count. Rows are `data/units.json`. */
const UNITS = UNIT_DATA.units;

/** Units that are a ratio or a log scale, and the reason each is not a plain factor. */
const REFUSED_UNITS = UNIT_DATA.refused;

/**
 * Letters that are both an SI prefix and a unit of their own. Such a token
 * reads as the prefix reading and not as the unit times the rest: `Gyr` is a
 * gigayear. The file's `prefixLetterUnits.comment` says why `m` is not one.
 */
const PREFIX_LETTER_UNITS = UNIT_DATA.prefixLetterUnits;

/** Kelvin at 0 °C, exactly. */
const CELSIUS_OFFSET_K = UNIT_DATA.iceKelvin;

interface AffineRow extends UnitDataAffineRow {
  readonly id: AffineTemperature;
}

/** Lone spellings. A compound that contains one is refused. The schema holds `id` to the two scales. */
const AFFINE = UNIT_DATA.affine as readonly AffineRow[];

/** Kelvin at a reading of zero, exactly: 273.15 − icePoint × scale. */
function affineOffset(row: AffineRow): ExactScale {
  return addScales(CELSIUS_OFFSET_K, multiplyScales(ratioScale(-1, 1), row.icePoint, row.scale));
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

const PREFIXES = UNIT_DATA.prefixes;

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
  // A chain is one denominator: `km/s/Mpc` is km/(s·Mpc), the way the Hubble constant is written.
  const sides = solidusSides(t);
  const compete = /[*·/\s]/.test(t);
  const numerator = sideTokens(sides.numerator);
  const denominator = sides.denominator === '' ? [] : sideTokens(sides.denominator);
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
 * Spellings that convert correctly and still mean something else to a reader:
 * the `spellingNotes` of `data/units.json` for each symbol in `given`, in file
 * order. `myr` is a milliyear, bare `G` is the gauss, bare `A` the ampere.
 * @internal
 */
export function unitConventionNotes(given: string): string[] {
  const symbols = new Set(given.split(/[*·/\s^0-9()+-]+/).filter((s) => s.length > 0));
  return [...UNIT_DATA.spellingNotes].filter(([spelling]) => symbols.has(spelling)).map(([, note]) => note);
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
 * input by 2π), the prefixes, the Celsius offset, and the SHA-256 of `data/units.json`, so a
 * refused spelling, a prefix letter, an affine row or a note that changes changes the fingerprint too.
 * @internal
 */
export function unitTables(): {
  units: ReadonlyMap<string, readonly [number, Dimension, boolean, boolean]>;
  prefixes: ReadonlyMap<string, number>;
  celsiusOffsetK: number;
  sourceSha256: string;
} {
  return {
    units: new Map([...UNITS].map(([symbol, r]) => [symbol, [scaleToNumber(r.scale), r.dim, r.prefixable, r.cycles === true] as const])),
    prefixes: new Map([...PREFIXES].map(([prefix, f]) => [prefix, scaleToNumber(f)] as const)),
    celsiusOffsetK: scaleToNumber(CELSIUS_OFFSET_K),
    sourceSha256: UNIT_DATA.sha256,
  };
}
