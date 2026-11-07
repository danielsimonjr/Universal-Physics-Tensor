/**
 * MathTS unit delegation predicates (Part A steps A4–A5).
 *
 * A text enters the MathTS path only when the predicate is true up front; a
 * MathTS failure is not caught and routed back to the local reader.
 *
 * @module dimensional/mathts-unit-delegation
 * @internal
 */
import {
  Unit,
  exactScaleToNumber,
  getUnitRow,
  toSiDimensionVector,
} from '@danielsimonjr/mathts-core';
import { symmetricRelDiff } from '../core/compare.js';
import { equals, multiply, power } from './algebra.js';
import { scaleToNumber, solidusSides, type ExactScale } from './exact-scale.js';
import { UNIT_DATA } from './unit-data.js';
import type { Dimension } from './types.js';

const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
const UNITS = UNIT_DATA.units;
const PREFIXES = UNIT_DATA.prefixes;
const REFUSED = UNIT_DATA.refused;

const SUPERSCRIPT: Readonly<Record<string, number>> = { '¹': 1, '²': 2, '³': 3, '⁻¹': -1, '⁻²': -2, '⁻³': -3 };

function trySymbol(sym: string): { readonly base: string } | null {
  if (UNITS.has(sym)) return { base: sym };
  for (const [prefix] of PREFIXES) {
    if (!sym.startsWith(prefix) || sym.length === prefix.length) continue;
    const base = sym.slice(prefix.length);
    const row = UNITS.get(base);
    if (row !== undefined && row.prefixable) return { base };
  }
  return null;
}

function tryOneFactorBase(token: string): string | null {
  let base = token;
  const caret = /^(.+)\^([+-]?\d+)$/.exec(token);
  if (caret !== null) base = caret[1]!;
  else {
    const uni = /^(.*?)(⁻?[¹²³])$/.exec(token);
    if (uni !== null && SUPERSCRIPT[uni[2]!] !== undefined && uni[1]!.length > 0) base = uni[1]!;
    else {
      const glued = /^(.*?)([1-9]\d*)$/.exec(token);
      if (glued !== null && glued[1]!.length > 0 && trySymbol(glued[1]!) !== null) base = glued[1]!;
    }
  }
  return trySymbol(base)?.base ?? null;
}

function sideTokens(text: string): string[] {
  return text.split(/[*·\s]+|(?<=[A-Za-zµμΩ])\.(?=[A-Za-zµμΩ])/).filter((part) => part.length > 0);
}

/** Every factor base in `text` is admitted in UPT and present in MathTS. */
export function everySymbolInBothTables(text: string): boolean {
  const t = text.trim();
  if (t === '' || t === '1') return true;
  if (REFUSED.has(t)) return false;
  if (UNIT_DATA.affine.some((row) => row.symbols.includes(t))) return getUnitRow(t) !== undefined;
  const { numerator, denominator } = solidusSides(t);
  const tokens = [...sideTokens(numerator), ...sideTokens(denominator)];
  if (tokens.length === 0) return false;
  for (const token of tokens) {
    if (token === '1') continue;
    const base = tryOneFactorBase(token);
    if (base === null) return false;
    if (!UNITS.has(base)) return false;
    if (getUnitRow(base) === undefined) return false;
  }
  return true;
}

function mathtsScaleNumber(text: string): number | null {
  if (!everySymbolInBothTables(text)) return null;
  if (text.trim() === 'bit') return null;
  try {
    const core = Unit.exactScale(text.trim());
    return core === null ? null : exactScaleToNumber(core);
  } catch {
    return null;
  }
}

/** True when `Unit.exactScale` matches the local scale and `bit` is excluded. */
export function mathtsExactScaleAgreed(text: string, localScale: number, _localExact: ExactScale): boolean {
  if (text.trim() === 'bit') return false;
  const mt = mathtsScaleNumber(text);
  return mt !== null && (mt === localScale || symmetricRelDiff(localScale, mt) < 1e-15);
}


/** A MathTS SI-dimension entry: 0.20.0 states exact rational exponents, so a number or a `Fraction`. */
type SiEntry = number | { readonly toNumber: () => number };

function siNumber(entry: SiEntry): number {
  return typeof entry === 'number' ? entry : entry.toNumber();
}

function dimensionFromMathtsVector(dimensions: readonly number[], localDim: Dimension): Dimension {
  try {
    const v = toSiDimensionVector(dimensions);
    return { L: siNumber(v[0]!), M: siNumber(v[1]!), T: siNumber(v[2]!), I: siNumber(v[3]!), Theta: siNumber(v[4]!), N: siNumber(v[5]!), J: siNumber(v[6]!) };
  } catch {
    const ignored = toSiDimensionVector(dimensions, { ignoreExtra: true });
    if (equals(localDim, DIMENSIONLESS)) {
      return DIMENSIONLESS;
    }
    return {
      L: siNumber(ignored[0]!),
      M: siNumber(ignored[1]!),
      T: siNumber(ignored[2]!),
      I: siNumber(ignored[3]!),
      Theta: siNumber(ignored[4]!),
      N: siNumber(ignored[5]!),
      J: siNumber(ignored[6]!),
    };
  }
}

/**
 * The sub-kilo parsec spellings, UPT's by policy: MathTS 0.21.0 admits only the
 * k-and-up prefixes on `pc` (its row is `SHORT_UP_ONLY`), while UPT's prefix table
 * applies to every prefixable row in `data/units.json`. Those readings stay local.
 */
export function isSubKiloParsec(text: string): boolean {
  const t = text.trim();
  if (!t.endsWith('pc')) return false;
  const prefix = t.slice(0, -2);
  if (prefix === '') return false;
  const base = UNITS.get('pc');
  const factor = PREFIXES.get(prefix);
  return base !== undefined && base.prefixable && factor !== undefined && scaleToNumber(factor) < 1000;
}

/** True when the full unit text may take exact scale and dimension from MathTS (A4). */
export function unitExactScaleViaMathts(text: string, localScale: number, localExact: ExactScale, localDim: Dimension): boolean {
  if (isSubKiloParsec(text)) return false;
  if (!mathtsExactScaleAgreed(text, localScale, localExact)) return false;
  try {
    const u = Unit.parse(text.trim());
    const dim = dimensionFromMathtsVector(u.dimensions, localDim);
    return equals(dim, localDim);
  } catch {
    return false;
  }
}


/** True when `Unit.parse` may replace the local grammar for `text` (A5). */
export function unitParserViaMathts(
  text: string,
  localScale: number,
  localExact: ExactScale,
  localDim: Dimension,
): boolean {
  if (isSubKiloParsec(text)) return false;
  if (!unitExactScaleViaMathts(text, localScale, localExact, localDim)) return false;
  try {
    Unit.parse(text.trim());
  } catch {
    return false;
  }
  return true;
}

/** Map MathTS unit dimensions to the UPT seven-base record. */
export function mathtsParsedDimension(text: string, localDim: Dimension): Dimension {
  const u = Unit.parse(text.trim());
  return dimensionFromMathtsVector(u.dimensions, localDim);
}

/**
 * Raise a dimension to an integer power (test-only).
 * @internal
 */
export function _powerDim(dim: Dimension, exp: number): Dimension {
  return power(dim, exp);
}

/**
 * Multiply two dimensions (test-only).
 * @internal
 */
export function _multiplyDim(a: Dimension, b: Dimension): Dimension {
  return multiply(a, b);
}
