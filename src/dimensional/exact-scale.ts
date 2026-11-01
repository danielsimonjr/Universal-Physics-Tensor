/**
 * Exact unit scales.
 *
 * A unit's scale to SI is a rational number times one floating factor that
 * holds its irrational part (π for an angle, ln 2 for a bit). Prefixes,
 * products, quotients and integer powers multiply the rationals exactly, so
 * `g/cm^3` is 1000 and `72 mN/m` is 0.072 with no float noise to round away.
 * The one rounding is {@link scaleToNumber}, which rounds the rational
 * correctly and then multiplies by the irrational factor once.
 *
 * A decimal literal is read digit for digit. A JavaScript number is read
 * through its shortest round-trip decimal (`String(x)`), which is the
 * literal a constant was written with.
 *
 * @module dimensional/exact-scale
 * @internal
 */
import {
  addExactScales,
  decimalExactScale,
  divideExactScales,
  exactScaleOf,
  exactScaleToNumber,
  LN2_EXACT_SCALE,
  multiplyExactScales,
  PI_EXACT_SCALE,
  powerExactScale,
  ratioExactScale,
  type ExactScale as CoreExactScale,
} from '@danielsimonjr/mathts-core';
import { gcd } from '@danielsimonjr/mathts-functions';
import { bigintFrom } from '../core/mathts-read.js';


/** `num / den × irrational`, with `den > 0` and the fraction in lowest terms. @internal */
export interface ExactScale {
  readonly num: bigint;
  readonly den: bigint;
  /** The factor no rational states (π, ln 2). 1 for a rational scale. */
  readonly irrational: number;
}

/** The bigint gcd, MathTS `gcd` on its `bigint, bigint` signature, read back as the bigint it is. */
function bigGcd(a: bigint, b: bigint): bigint {
  const g = bigintFrom('gcd', gcd(a, b));
  return g < 0n ? -g : g;
}

function make(num: bigint, den: bigint, irrational: number): ExactScale {
  if (den === 0n) throw new RangeError('exact scale: zero denominator');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = bigGcd(num, den);
  return g > 1n ? { num: num / g, den: den / g, irrational } : { num, den, irrational };
}

function irrationalFactor(irrationals: CoreExactScale['irrationals']): number {
  let factor = 1;
  const pi = irrationals.pi ?? 0;
  const ln2 = irrationals.ln2 ?? 0;
  if (pi !== 0) factor *= Math.PI ** pi;
  if (ln2 !== 0) factor *= Math.LN2 ** ln2;
  return factor;
}

function fromCore(s: CoreExactScale): ExactScale {
  return make(s.num, s.den, irrationalFactor(s.irrationals));
}

/** UPT {@link ExactScale} to the MathTS core shape. @internal */
export function coreExactScaleFromUpt(s: ExactScale): CoreExactScale {
  return toCore(s);
}

/** MathTS core exact scale to UPT {@link ExactScale}. @internal */
export function uptExactScaleFromCore(s: CoreExactScale): ExactScale {
  return fromCore(s);
}

/** When `x / base` is a nonzero integer, that integer; otherwise null. */
function integerMultiple(x: number, base: number): bigint | null {
  if (!Number.isFinite(x) || !Number.isFinite(base) || base === 0 || x === 0) return null;
  const q = x / base;
  if (!Number.isFinite(q)) return null;
  const n = Math.trunc(q);
  if (n === 0 || q !== n) return null;
  if (Math.abs(n * base - x) > Math.max(1e-12, Math.abs(x) * 1e-14)) return null;
  return BigInt(n);
}

function toCore(s: ExactScale): CoreExactScale {
  let core = ratioExactScale(s.num, s.den);
  const ir = s.irrational;
  if (ir === 1) return core;
  const piMultiple = integerMultiple(ir, Math.PI);
  if (piMultiple !== null) {
    if (piMultiple !== 1n) core = multiplyExactScales(core, ratioExactScale(piMultiple, 1n));
    return multiplyExactScales(core, PI_EXACT_SCALE);
  }
  const ln2Multiple = integerMultiple(ir, Math.LN2);
  if (ln2Multiple !== null) {
    if (ln2Multiple !== 1n) core = multiplyExactScales(core, ratioExactScale(ln2Multiple, 1n));
    return multiplyExactScales(core, LN2_EXACT_SCALE);
  }
  return multiplyExactScales(core, exactScaleOf(ir));
}

/** The scale 1. @internal */
export const UNIT_SCALE: ExactScale = { num: 1n, den: 1n, irrational: 1 };

/**
 * The exact value of a decimal literal (`72`, `0.45359237`, `1.602176634e-19`),
 * or null when `text` is not one.
 * @internal
 */
export function decimalScale(text: string): ExactScale | null {
  const scaled = decimalExactScale(text.trim());
  return scaled === null ? null : fromCore(scaled);
}

/** The exact scale a finite JavaScript number was written as. @internal */
export function scaleOf(x: number): ExactScale {
  if (!Number.isFinite(x)) throw new RangeError(`exact scale: ${x} is not finite`);
  return fromCore(exactScaleOf(x));
}

/** `num / den`, exactly. @internal */
export function ratioScale(num: number | bigint, den: number | bigint): ExactScale {
  return fromCore(ratioExactScale(num, den));
}

/** A factor no rational states, such as π or ln 2. @internal */
export function irrationalScale(x: number): ExactScale {
  if (!Number.isFinite(x)) throw new RangeError(`exact scale: ${x} is not finite`);
  return { num: 1n, den: 1n, irrational: x };
}

/** `a × b × …`. @internal */
export function multiplyScales(...factors: readonly ExactScale[]): ExactScale {
  if (factors.length === 0) return UNIT_SCALE;
  return fromCore(multiplyExactScales(...factors.map(toCore)));
}

/** `a / b`. @internal */
export function divideScales(a: ExactScale, b: ExactScale): ExactScale {
  return fromCore(divideExactScales(toCore(a), toCore(b)));
}

/**
 * `a ^ n`. An integer power stays exact. A fractional power has no exact
 * rational in general and throws.
 * @internal
 */
export function powerScale(a: ExactScale, n: number): ExactScale {
  if (!Number.isInteger(n)) throw new RangeError(`exact scale: power ${n} is not an integer`);
  return fromCore(powerExactScale(toCore(a), n));
}

/** `a + b`: exact when both are rational multiples of the same irrational factor. @internal */
export function addScales(a: ExactScale, b: ExactScale): ExactScale {
  const sum = addExactScales(toCore(a), toCore(b));
  if (sum === null) throw new RangeError('exact scale: unlike irrational factors');
  return fromCore(sum);
}

/** The scale as a double: the rational rounded once, times the irrational factor. @internal */
export function scaleToNumber(s: ExactScale): number {
  return exactScaleToNumber(toCore(s));
}

const FACTOR = /^([^*/^\s]+)(?:\^([+-]?\d+))?$/;

/**
 * The two sides of a unit text or a scale expression under the single-solidus
 * convention of ISO 80000-1: everything after the first `/` is the
 * denominator, so a chain is one denominator (`km/s/Mpc` is km/(s·Mpc), and
 * `W/m*K` is W/(m·K), not (W/m)·K). The denominator comes back as one
 * `*`-joined product, each `/`-part's outer parentheses dropped. `units.ts`
 * and {@link readScaleExpression} both split here, so a unit text and a scale
 * expression in `data/units.json` read a `/` the same way.
 * @internal
 */
export function solidusSides(text: string): { readonly numerator: string; readonly denominator: string } {
  const parts = text.split('/');
  return {
    numerator: parts[0]!,
    denominator: parts
      .slice(1)
      .map((part) => part.replace(/^\((.*)\)$/, '$1'))
      .join('*'),
  };
}

/**
 * The exact value of a scale expression, the form `data/units.json` stores:
 * factors joined by `*`, then optionally `/` and the denominator's factors,
 * each a decimal literal or a name with an optional integer power
 * (`4.1868*453.59237/1.8`, `pi/180`, `lbf/inch^2`). A `/` follows the unit
 * grammar ({@link solidusSides}): `a/b*c` is a/(b·c). `resolve` gives a name
 * its scale and returns undefined for a name it does not know, which throws
 * here. A decimal literal is read digit for digit, so the result is the
 * rational the text states.
 * @internal
 */
export function readScaleExpression(text: string, resolve: (name: string) => ExactScale | undefined): ExactScale {
  const product = (side: string): ExactScale => {
    let scale = UNIT_SCALE;
    for (const part of side.split('*')) {
      const m = FACTOR.exec(part);
      if (m === null) throw new RangeError(`exact scale: '${text}' is not a product of factors`);
      const atom = m[1]!;
      const base = decimalScale(atom) ?? resolve(atom);
      if (base === undefined) throw new RangeError(`exact scale: '${text}' names '${atom}', which is not a known scale`);
      scale = multiplyScales(scale, m[2] === undefined ? base : powerScale(base, Number(m[2])));
    }
    return scale;
  };
  const trimmed = text.trim();
  const { numerator, denominator } = solidusSides(trimmed);
  const top = product(numerator);
  return trimmed.includes('/') ? divideScales(top, product(denominator)) : top;
}
