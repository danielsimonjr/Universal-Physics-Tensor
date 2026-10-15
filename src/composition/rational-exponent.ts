/**
 * Exact rationals from doubles, for exponents and prefactors.
 *
 * A monomial exponent read from an AST literal (`0.5`, `0.3333333333333333`)
 * and a prefactor recovered by a fit are doubles that stand for small
 * rationals. This module turns one into a core `Fraction` when a rational
 * with a bounded denominator reproduces it to a stated relative tolerance,
 * and refuses otherwise, so an irrational is never approximated into a
 * rational and a rounding error never becomes a denominator of 10¹⁶.
 *
 * `Fraction.fromNumber(x, cap)` is asked first; the installed version can
 * return a denominator above its cap, so the cap and the tolerance are checked
 * here. When that answer is refused, a bounded-denominator scan (the one
 * `dimensional/buckingham.ts` uses for dimension exponents) is the second
 * method, so a rational the continued fraction stepped past is still found.
 *
 * @module composition/rational-exponent
 */

import { Fraction } from '@danielsimonjr/mathts-core';

/** The denominator cap the Buckingham enumerator uses for exponents. @internal */
export const DEFAULT_MAX_DENOMINATOR = 720;

/** Options of {@link rationalize}. @internal */
export interface RationalizeOptions {
  /** Largest denominator accepted (default {@link DEFAULT_MAX_DENOMINATOR}). */
  readonly maxDenominator?: number;
  /** Relative tolerance `|n/d − x| ≤ tolerance·|x|` (default 1e-9); for `x = 0` the match is exact. */
  readonly tolerance?: number;
}

function within(candidate: Fraction, x: number, tolerance: number): boolean {
  const value = fractionToNumber(candidate);
  if (x === 0) return value === 0;
  return Math.abs(value - x) <= tolerance * Math.abs(x);
}

/**
 * The rational with denominator ≤ `maxDenominator` that reproduces `x` to
 * the tolerance, or `undefined` when there is none.
 *
 * @internal
 */
export function rationalize(x: number, options: RationalizeOptions = {}): Fraction | undefined {
  if (!Number.isFinite(x)) return undefined;
  const maxDenominator = options.maxDenominator ?? DEFAULT_MAX_DENOMINATOR;
  const tolerance = options.tolerance ?? 1e-9;
  if (Number.isInteger(x)) return new Fraction(x, 1);
  const guess = Fraction.fromNumber(x, BigInt(maxDenominator));
  if (guess.denominator <= BigInt(maxDenominator) && within(guess, x, tolerance)) return guess;
  for (let d = 1; d <= maxDenominator; d++) {
    const n = Math.round(x * d);
    // A safe-integer n/d is the same correctly rounded quotient as the reduced
    // fraction's, so a miss is decided on doubles and no Fraction is built for it
    // (the clean-prefactor rule asks this 43,200 times for one miss).
    if (Number.isSafeInteger(n) && !(Math.abs(n / d - x) <= tolerance * Math.abs(x))) continue;
    const candidate = new Fraction(n, d);
    if (within(candidate, x, tolerance)) return candidate;
  }
  return undefined;
}

/** The double a fraction stands for (numerator over denominator, one rounding). @internal */
export function fractionToNumber(f: Fraction): number {
  return Number(f.numerator) / Number(f.denominator);
}

/** `9/8`, `2`, `-1/3`: the fraction in lowest terms, no sign on the denominator. @internal */
export function formatRational(f: Fraction): string {
  return f.denominator === 1n ? f.numerator.toString() : `${f.numerator}/${f.denominator}`;
}
