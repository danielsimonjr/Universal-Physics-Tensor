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

/** The fewest significant digits kept before the sticky digit; far beyond a double's 17. */
const MIN_DIGITS = 40;

/** Decimal places of `1 / den` when it terminates (`den` = 2^a·5^b): max(a, b). Null otherwise. */
function terminatingPlaces(den: bigint): number | null {
  let d = den;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) {
    d /= 2n;
    twos++;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    fives++;
  }
  return d === 1n ? Math.max(twos, fives) : null;
}

/**
 * The rational `num / den` (`den > 0`), reduced, rounded once to the nearest double.
 *
 * A terminating quotient (`den` = 2^a·5^b) is written out exactly, every digit,
 * and parsed: a tie between two doubles is a dyadic rational, so it always
 * lands here and rounds half to even. Any other quotient is not a tie, and it
 * is at least `1 / (den·2^54)` of its magnitude away from every tie; truncating
 * it to `max(40, digits(den) + 20)` significant digits stays closer than that,
 * and a sticky `1` puts the string strictly inside the truncation interval, so
 * the string rounds the way the quotient does for any denominator.
 */
function rationalToNumber(num: bigint, den: bigint): number {
  if (num === 0n) return 0;
  const negative = num < 0n;
  const g = gcd(num, den);
  const a = (negative ? -num : num) / g;
  den /= g;
  const places = terminatingPlaces(den);
  if (places !== null) {
    const value = Number(`${(a * 10n ** BigInt(places)) / den}e-${places}`);
    return negative ? -value : value;
  }
  const digits = Math.max(MIN_DIGITS, den.toString().length + 20);
  const shift = digits - (a.toString().length - den.toString().length);
  let q: bigint;
  if (shift >= 0) {
    q = (a * 10n ** BigInt(shift)) / den;
  } else {
    q = a / (den * 10n ** BigInt(-shift));
  }
  // Not terminating, so the remainder is never zero: the sticky digit is always due.
  const value = Number(`${q.toString()}1e${-(shift + 1)}`);
  return negative ? -value : value;
}

/** The scale as a double: the rational rounded once, times the irrational factor. @internal */
export function scaleToNumber(s: ExactScale): number {
  const rational = rationalToNumber(s.num, s.den);
  return s.irrational === 1 ? rational : rational * s.irrational;
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
