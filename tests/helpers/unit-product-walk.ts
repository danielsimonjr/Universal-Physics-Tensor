/**
 * The product walk of the unit juxtaposition grammar: every left factor before every unit.
 *
 * A left factor is a unit, a unit with the power `2` or `^2`, or a prefixed unit. The oracle
 * reads one factor only and does not search for a product. A token that is one factor must
 * read as that factor. Any other token must be the product of its two factors, an ambiguity
 * that names two or more readings, or a refusal. The vitest file runs a seeded sample, and
 * `scripts/unit-product-walk.ts` runs every token with no time limit.
 */
import { equals, multiply } from '../../src/dimensional/algebra.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { parseUnit, unitTables, UnitError } from '../../src/dimensional/units.js';

const { units, prefixes } = unitTables();
const SUPERSCRIPT: Readonly<Record<string, number>> = { '²': 2, '³': 3 };

/** A scale and a dimension. */
export interface Factor {
  readonly scale: number;
  readonly dim: Dimension;
}

/** One token of the walk: the left factor, the unit after it, and the glued token. */
export interface WalkToken {
  readonly left: string;
  readonly right: string;
  readonly token: string;
}

/** The result of a walk: the failure texts and the counts of each outcome. */
export interface WalkResult {
  readonly tokens: number;
  readonly failures: readonly string[];
  readonly products: number;
  readonly ambiguous: number;
}

/** Exact unit, or prefix plus a unit. No product split. */
export function trySymbol(sym: string): Factor | null {
  const exact = units.get(sym);
  if (exact !== undefined) return { scale: exact[0], dim: exact[1] };
  for (const [prefix, factor] of prefixes) {
    if (!sym.startsWith(prefix) || sym.length === prefix.length) continue;
    const base = units.get(sym.slice(prefix.length));
    if (base !== undefined && base[2]) return { scale: factor * base[0], dim: base[1] };
  }
  return null;
}

/** A dimension to an integer power. */
export function powerDim(dim: Dimension, exp: number): Dimension {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(dim)) out[key] = value * exp;
  return out as unknown as Dimension;
}

/** One factor with an optional exponent, or null. This is not the product search. */
export function oneFactor(token: string): Factor | null {
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

/** Every token of the walk, in a fixed order. */
export function productWalkTokens(): WalkToken[] {
  const bases = [...units.keys()];
  const prefixed = [...prefixes.keys()].flatMap((prefix) =>
    [...units.entries()].filter(([, spec]) => spec[2]).map(([symbol]) => `${prefix}${symbol}`),
  );
  const lefts = [...bases, ...bases.flatMap((symbol) => [`${symbol}2`, `${symbol}^2`]), ...prefixed];
  const out: WalkToken[] = [];
  for (const left of lefts) for (const right of bases) out.push({ left, right, token: `${left}${right}` });
  return out;
}

/** A seeded sample of `tokens` (mulberry32), about `fraction` of them, in walk order. */
export function sampleTokens(tokens: readonly WalkToken[], fraction: number, seed: number): WalkToken[] {
  let a = seed >>> 0;
  const rand = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return tokens.filter(() => rand() < fraction);
}

const within = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) / Math.max(Math.abs(actual), Math.abs(expected), 1) < 1e-9;

/**
 * Check each token against the oracle. A failure text names the token.
 * `expectScale` lets a positive control change the expected scale of one token.
 */
export function walkProducts(tokens: readonly WalkToken[], expectScale: (token: string, scale: number) => number = (_t, s) => s): WalkResult {
  let products = 0;
  let ambiguous = 0;
  const failures: string[] = [];
  const factors = new Map<string, Factor | null>();
  const factorOf = (text: string): Factor | null => {
    if (!factors.has(text)) factors.set(text, oneFactor(text));
    return factors.get(text)!;
  };
  for (const { left, right, token } of tokens) {
    const a = factorOf(left);
    if (a === null) failures.push(`${left}: not one factor`);
    if (token === 'degC' || token === '°C' || token === 'degF' || token === '°F') {
      const affine = parseUnit(token).affine;
      if (affine !== (token.endsWith('C') ? 'celsius' : 'fahrenheit')) failures.push(`${token}: affine ${affine}`);
      continue;
    }
    const single = oneFactor(token);
    if (single !== null) {
      const got = parseUnit(token);
      const want = expectScale(token, single.scale);
      if (!within(got.scale, want)) failures.push(`${token}: scale ${got.scale} is not ${want}`);
      else if (!equals(got.dim, single.dim)) failures.push(`${token}: dimension is not the single factor`);
      continue;
    }
    const b = factorOf(right);
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
    const want = expectScale(token, a.scale * b.scale);
    if (!within(got.scale, want)) failures.push(`${token}: product scale ${got.scale} is not ${want}`);
    if (!equals(got.dim, multiply(a.dim, b.dim))) failures.push(`${token}: product dimension`);
    products += 1;
  }
  return { tokens: tokens.length, failures, products, ambiguous };
}
