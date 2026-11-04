/**
 * UPT unit wrapper policy on top of MathTS (Part A steps A8, A11, A12 partial).
 *
 * Admission, refusal policy, and cycle counting stay here even when parsing and
 * scales delegate to MathTS. Four deliberate overrides of MathTS defaults are
 * layered here, each pinned by a test that reads both sides:
 *
 * 1. `ton` — MathTS parses the US short ton (907.18474 kg); UPT refuses it as
 *    ambiguous (`data/units.json`, `tests/dimensional/unit-wrapper-refusal.test.ts`).
 * 2. An affine temperature inside a compound — MathTS accepts `degC/s`;
 *    UPT refuses it (`localUnitReadings`, `tests/dimensional/units.test.ts`).
 * 3. `pc` prefixes — MathTS admits only k and up (`SHORT_UP_ONLY`); UPT's
 *    prefix table applies to every prefixable row, so `mpc` stays on the local
 *    grammar (`isSubKiloParsec`, `tests/dimensional/unit-override-parsec.test.ts`).
 * 4. `bit` — MathTS reports scale 1 on its bit axis; UPT keeps ln 2 nat
 *    (`applyBitScaleOverride`, `tests/dimensional/unit-wrapper-bit.test.ts`).
 *
 * The refusal *definitions* for `dB`, `dBm`, `dBW`, `Np`, `Mach` and `mach` are
 * MathTS's `REFUSED_UNIT_SPELLINGS` (0.21.0); `data/units.json` no longer
 * repeats them. The wrapper turns a MathTS refusal into `UnitRefusedError`
 * before any parse, compounds included.
 *
 * @module dimensional/mathts-unit-wrapper
 * @internal
 */
import { REFUSED_UNIT_SPELLINGS, Unit, exactScaleToNumber } from '@danielsimonjr/mathts-core';
import { scaleToNumber, solidusSides, type ExactScale } from './exact-scale.js';
import { isSubKiloParsec, mathtsExactScaleReading, mathtsParsedDimension } from './mathts-unit-delegation.js';
import { UNIT_DATA } from './unit-data.js';
import type { Dimension } from './types.js';

const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

const REFUSED = UNIT_DATA.refused;
const UNITS = UNIT_DATA.units;

/** Agreed spellings that fully parse through MathTS (Part A step A5). The 0.21.0
 * core adds the day symbol, the angstrom spellings, and SI prefixes on `psi` and
 * `torr`; the k-and-up parsec spellings agree with the table double for double. */
export const A5_DELEGATED_TEXTS = [
  'km',
  'degC',
  'g/cm^3',
  'mN/m',
  'kohm',
  'GeV',
  'km/s/Mpc',
  'd',
  'day',
  'Angstrom',
  'angstrom',
  'Å',
  'psi',
  'torr',
  'kpsi',
  'Mpsi',
  'mtorr',
  'utorr',
  'kpc',
  'Mpc',
  'Gpc',
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

/** A token MathTS refuses by name: UPT policy rows first, then the MathTS registry. */
function refusalReasonFor(token: string): string | undefined {
  return REFUSED.get(token) ?? REFUSED_UNIT_SPELLINGS[token];
}

/** Tokens whose spelling carries a refusal reason: UPT policy rows first, then MathTS's registry. */
export function refusedTokensIn(text: string): readonly string[] {
  const t = text.trim();
  if (t === '' || t === '1') return [];
  const whole = refusalReasonFor(t);
  if (whole !== undefined) return [t];
  const { numerator, denominator } = solidusSides(t);
  const tokens = [...sideTokens(numerator), ...sideTokens(denominator)];
  const hits: string[] = [];
  for (const token of tokens) {
    if (token === '1') continue;
    if (refusalReasonFor(token) !== undefined) hits.push(token);
    else {
      const base = factorBase(token);
      if (base !== null && refusalReasonFor(base) !== undefined) hits.push(base);
    }
  }
  return hits;
}

/** Refusal message: UPT policy (`ton`) first, then the MathTS registry (`dB` and friends). Null when the text is not denied. */
export function uptRefusalReason(text: string): string | null {
  const hits = refusedTokensIn(text);
  if (hits.length === 0) return null;
  const token = hits[0]!;
  return refusalReasonFor(token) ?? null;
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
  if (isSubKiloParsec(t)) return null;
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
