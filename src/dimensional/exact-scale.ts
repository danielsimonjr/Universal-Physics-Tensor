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

/** `num / den × irrational`, with `den > 0` and the fraction in lowest terms. @internal */
export interface ExactScale {
  readonly num: bigint;
  readonly den: bigint;
  /** The factor no rational states (π, ln 2). 1 for a rational scale. */
  readonly irrational: number;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function make(num: bigint, den: bigint, irrational: number): ExactScale {
  if (den === 0n) throw new RangeError('exact scale: zero denominator');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return g > 1n ? { num: num / g, den: den / g, irrational } : { num, den, irrational };
}

/** The scale 1. @internal */
export const UNIT_SCALE: ExactScale = { num: 1n, den: 1n, irrational: 1 };

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/**
 * The exact value of a decimal literal (`72`, `0.45359237`, `1.602176634e-19`),
 * or null when `text` is not one.
 * @internal
 */
export function decimalScale(text: string): ExactScale | null {
  const m = DECIMAL.exec(text.trim());
  if (m === null) return null;
  const whole = m[2] ?? '';
  const fraction = m[3] ?? '';
  if (whole === '' && fraction === '') return null;
  const exponent = Number(m[4] ?? '0') - fraction.length;
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10_000) return null;
  let num = BigInt(whole + fraction);
  if (m[1] === '-') num = -num;
  return exponent >= 0 ? make(num * 10n ** BigInt(exponent), 1n, 1) : make(num, 10n ** BigInt(-exponent), 1);
}

/** The exact scale a finite JavaScript number was written as. @internal */
export function scaleOf(x: number): ExactScale {
  if (!Number.isFinite(x)) throw new RangeError(`exact scale: ${x} is not finite`);
  return decimalScale(String(x))!;
}

/** `num / den`, exactly. @internal */
export function ratioScale(num: number | bigint, den: number | bigint): ExactScale {
  return make(BigInt(num), BigInt(den), 1);
}

/** A factor no rational states, such as π or ln 2. @internal */
export function irrationalScale(x: number): ExactScale {
  if (!Number.isFinite(x)) throw new RangeError(`exact scale: ${x} is not finite`);
  return { num: 1n, den: 1n, irrational: x };
}

/** `a × b × …`. @internal */
export function multiplyScales(...factors: readonly ExactScale[]): ExactScale {
  let num = 1n;
  let den = 1n;
  let irrational = 1;
  for (const f of factors) {
    num *= f.num;
    den *= f.den;
    irrational *= f.irrational;
  }
  return make(num, den, irrational);
}

/** `a / b`. @internal */
export function divideScales(a: ExactScale, b: ExactScale): ExactScale {
  if (b.num === 0n) throw new RangeError('exact scale: division by zero');
  return make(a.num * b.den, a.den * b.num, a.irrational / b.irrational);
}

/**
 * `a ^ n`. An integer power stays exact. A fractional power has no exact
 * rational in general, so it becomes one floating factor.
 * @internal
 */
export function powerScale(a: ExactScale, n: number): ExactScale {
  if (Number.isInteger(n)) {
    const k = BigInt(Math.abs(n));
    const up = make(a.num ** k, a.den ** k, a.irrational ** Math.abs(n));
    return n >= 0 ? up : divideScales(UNIT_SCALE, up);
  }
  return irrationalScale(scaleToNumber(a) ** n);
}

/** `a + b`: exact when both are rational multiples of the same irrational factor. @internal */
export function addScales(a: ExactScale, b: ExactScale): ExactScale {
  if (a.irrational === b.irrational) return make(a.num * b.den + b.num * a.den, a.den * b.den, a.irrational);
  return irrationalScale(scaleToNumber(a) + scaleToNumber(b));
}

/** Significant digits kept before the sticky digit; far beyond a double's 17. */
const DIGITS = 40;

/**
 * The rational `num / den` rounded once to the nearest double. A terminating
 * decimal is read exactly; any other quotient is truncated to 40 significant
 * digits and a sticky `1` is appended, so the string lies strictly between
 * the truncation and the next decimal and rounds the way the quotient does.
 */
function rationalToNumber(num: bigint, den: bigint): number {
  if (num === 0n) return 0;
  const negative = num < 0n;
  const a = negative ? -num : num;
  const shift = DIGITS - (a.toString().length - den.toString().length);
  let q: bigint;
  let r: bigint;
  if (shift >= 0) {
    const t = a * 10n ** BigInt(shift);
    q = t / den;
    r = t % den;
  } else {
    const d = den * 10n ** BigInt(-shift);
    q = a / d;
    r = a % d;
  }
  const digits = r === 0n ? q.toString() : `${q.toString()}1`;
  const exponent = -(shift + (r === 0n ? 0 : 1));
  const value = Number(`${digits}e${exponent}`);
  return negative ? -value : value;
}

/** The scale as a double: the rational rounded once, times the irrational factor. @internal */
export function scaleToNumber(s: ExactScale): number {
  const rational = rationalToNumber(s.num, s.den);
  return s.irrational === 1 ? rational : rational * s.irrational;
}
