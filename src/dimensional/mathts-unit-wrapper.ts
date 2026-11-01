/**
 * UPT unit wrapper policy on top of MathTS (Part A steps A8, A11, A12 partial).
 *
 * Admission, refusal denylist, the `bit` scale, and cycle counting stay here
 * even when parsing and scales delegate to MathTS.
 *
 * @module dimensional/mathts-unit-wrapper
 * @internal
 */
import { Unit, exactScaleToNumber } from '@danielsimonjr/mathts-core';
import { scaleToNumber, solidusSides, type ExactScale } from './exact-scale.js';
import { mathtsExactScaleReading, mathtsParsedDimension } from './mathts-unit-delegation.js';
import { UNIT_DATA } from './unit-data.js';
import type { Dimension } from './types.js';

const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

const REFUSED = UNIT_DATA.refused;
const UNITS = UNIT_DATA.units;

/** Agreed spellings that fully parse through MathTS (Part A step A5). */
export const A5_DELEGATED_TEXTS = [
  'km',
  'degC',
  'g/cm^3',
  'mN/m',
  'kohm',
  'GeV',
  'km/s/Mpc',
] as const;

const A5_DELEGATED = new Set<string>(A5_DELEGATED_TEXTS);

const SUPERSCRIPT: Readonly<Record<string, number>> = { '¹': 1, '²': 2, '³': 3, '⁻¹': -1, '⁻²': -2, '⁻³': -3 };

function sideTokens(text: string): string[] {
  return text.split(/[*·\s]+|(?<=[A-Za-zµμΩ])\.(?=[A-Za-zµμΩ])/).filter((part) => part.length > 0);
}

function trySymbolBase(token: string): string | null {
  if (UNITS.has(token)) return token;
  for (const [prefix] of UNIT_DATA.prefixes) {
    if (!token.startsWith(prefix) || token.length === prefix.length) continue;
    const base = token.slice(prefix.length);
    const row = UNITS.get(base);
    if (row !== undefined && row.prefixable) return base;
  }
  return null;
}

function factorBase(token: string): string | null {
  let base = token;
  const caret = /^(.+)\^([+-]?\d+)$/.exec(token);
  if (caret !== null) base = caret[1]!;
  else {
    const uni = /^(.*?)(⁻?[¹²³])$/.exec(token);
    if (uni !== null && SUPERSCRIPT[uni[2]!] !== undefined && uni[1]!.length > 0) base = uni[1]!;
    else {
      const glued = /^(.*?)([1-9]\d*)$/.exec(token);
      if (glued !== null && glued[1]!.length > 0 && trySymbolBase(glued[1]!) !== null) base = glued[1]!;
    }
  }
  return trySymbolBase(base);
}

/** Tokens whose spelling is on the UPT refusal denylist. */
export function refusedTokensIn(text: string): readonly string[] {
  const t = text.trim();
  if (t === '' || t === '1') return [];
  const whole = REFUSED.get(t);
  if (whole !== undefined) return [t];
  const { numerator, denominator } = solidusSides(t);
  const tokens = [...sideTokens(numerator), ...sideTokens(denominator)];
  const hits: string[] = [];
  for (const token of tokens) {
    if (token === '1') continue;
    if (REFUSED.has(token)) hits.push(token);
    else {
      const base = factorBase(token);
      if (base !== null && REFUSED.has(base)) hits.push(base);
    }
  }
  return hits;
}

/** Refusal message from `data/units.json`, or null when the text is not denied. */
export function uptRefusalReason(text: string): string | null {
  const hits = refusedTokensIn(text);
  if (hits.length === 0) return null;
  const token = hits[0]!;
  return REFUSED.get(token) ?? null;
}

/** Whether `text` is on the Part A step A5 delegated spelling list. */
export function isA5DelegatedText(text: string): boolean {
  return A5_DELEGATED.has(text.trim());
}

/** MathTS parses `ton`; UPT refuses it by policy (A8). */
export function mathtsWouldParse(text: string): boolean {
  try {
    Unit.parse(text.trim());
    return true;
  } catch {
    return false;
  }
}

/** Keep `bit` at ln 2 nat on the 7-vector (A11a). */
export function applyBitScaleOverride(text: string, exact: ExactScale, scale: number): { readonly exact: ExactScale; readonly scale: number } {
  if (text.trim() !== 'bit') return { exact, scale };
  const row = UNITS.get('bit');
  if (row === undefined) return { exact, scale };
  const localScale = scaleToNumber(row.scale);
  return { exact: row.scale, scale: localScale };
}

/** Scale, dimension, and cycles for one A5 in-set text read through MathTS. */
export interface MathtsDelegatedReading {
  readonly exact: ExactScale;
  readonly scale: number;
  readonly dim: Dimension;
  readonly cycles: number;
}

function affineDim(text: string): Dimension | null {
  const row = UNIT_DATA.affine.find((candidate) => candidate.symbols.includes(text));
  return row === undefined ? null : { ...DIMENSIONLESS, Theta: 1 };
}

/**
 * Scale and dimension for an A5 in-set text through MathTS only (A12 partial).
 * Returns null when the text is not on the A5 list or MathTS rejects it.
 */
export function tryMathtsA5Reading(text: string): MathtsDelegatedReading | null {
  const t = text.trim();
  if (!isA5DelegatedText(t)) return null;
  const affineDimHint = affineDim(t);
  try {
    Unit.parse(t);
  } catch {
    return null;
  }
  const core = Unit.exactScale(t);
  if (core === null) return null;
  const scale = exactScaleToNumber(core);
  const dim = mathtsParsedDimension(t, affineDimHint ?? DIMENSIONLESS);
  const exact = UNITS.get(t)?.scale ?? mathtsExactScaleReading(t);
  const overridden = applyBitScaleOverride(t, exact, scale);
  return { exact: overridden.exact, scale: overridden.scale, dim, cycles: 0 };
}
