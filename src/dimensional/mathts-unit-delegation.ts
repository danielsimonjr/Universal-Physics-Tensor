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
  readScaleExpression as mathtsReadScaleExpression,
  toSiDimensionVector,
  type ExactScale as CoreExactScale,
} from '@danielsimonjr/mathts-core';
import { equals, multiply, power } from './algebra.js';
import { coreExactScaleFromUpt, solidusSides, uptExactScaleFromCore, type ExactScale } from './exact-scale.js';
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

function mathtsCoreExactScale(text: string): CoreExactScale | null {
  if (!everySymbolInBothTables(text)) return null;
  if (text.trim() === 'bit' || /\bbit\b/.test(text)) return null;
  const core = Unit.exactScale(text.trim());
  return core ?? null;
}

/** True when `Unit.exactScale` matches the local scale and `bit` is excluded. */
export function mathtsExactScaleAgreed(text: string, localScale: number, localExact: ExactScale): boolean {
  if (text.trim() === 'bit') return false;
  if (!everySymbolInBothTables(text)) return false;
  const core = mathtsCoreExactScale(text);
  if (core === null) return false;
  const mt = exactScaleToNumber(core);
  if (mt !== localScale) return false;
  const upt = uptExactScaleFromCore(core);
  return upt.num === localExact.num && upt.den === localExact.den && upt.irrational === localExact.irrational;
}

function dimensionFromMathtsVector(dimensions: readonly number[], localDim: Dimension): Dimension {
  try {
    const v = toSiDimensionVector(dimensions);
    return { L: v[0]!, M: v[1]!, T: v[2]!, I: v[3]!, Theta: v[4]!, N: v[5]!, J: v[6]! };
  } catch {
    const ignored = toSiDimensionVector(dimensions, { ignoreExtra: true });
    if (equals(localDim, DIMENSIONLESS)) {
      return DIMENSIONLESS;
    }
    return {
      L: ignored[0]!,
      M: ignored[1]!,
      T: ignored[2]!,
      I: ignored[3]!,
      Theta: ignored[4]!,
      N: ignored[5]!,
      J: ignored[6]!,
    };
  }
}

/** True when the full unit text may take exact scale and dimension from MathTS (A4). */
export function unitExactScaleViaMathts(text: string, localScale: number, localExact: ExactScale, localDim: Dimension): boolean {
  if (!mathtsExactScaleAgreed(text, localScale, localExact)) return false;
  const u = Unit.parse(text.trim());
  const dim = dimensionFromMathtsVector(u.dimensions, localDim);
  return equals(dim, localDim);
}

/** Exact scale from MathTS when {@link unitExactScaleViaMathts} is true. */
export function mathtsExactScaleReading(text: string): ExactScale {
  const core = mathtsCoreExactScale(text);
  if (core === null) throw new RangeError(`mathts exact scale: '${text}' is not delegated`);
  return uptExactScaleFromCore(core);
}

/** True when `Unit.parse` may replace the local grammar for `text` (A5). */
export function unitParserViaMathts(
  text: string,
  localScale: number,
  localExact: ExactScale,
  localDim: Dimension,
): boolean {
  if (!unitExactScaleViaMathts(text, localScale, localExact, localDim)) return false;
  Unit.parse(text.trim());
  return true;
}

export function mathtsParsedDimension(text: string, localDim: Dimension): Dimension {
  const u = Unit.parse(text.trim());
  return dimensionFromMathtsVector(u.dimensions, localDim);
}

/** Scale expression for `data/units.json` through MathTS (A3 helper re-export for tests). */
export function readFileScaleExpression(text: string, resolve: (name: string) => ExactScale | undefined): ExactScale {
  return uptExactScaleFromCore(
    mathtsReadScaleExpression(text, (name) => {
      const scale = resolve(name);
      return scale === undefined ? undefined : coreExactScaleFromUpt(scale);
    }),
  );
}

/** @internal Test-only: local dimension power helper for delegation checks. */
export function _powerDim(dim: Dimension, exp: number): Dimension {
  return power(dim, exp);
}

/** @internal Test-only: local dimension multiply helper for delegation checks. */
export function _multiplyDim(a: Dimension, b: Dimension): Dimension {
  return multiply(a, b);
}
