/**
 * Dimensional algebra: per-base-exponent arithmetic.
 *
 * Operations follow standard dimensional analysis (Bridgman, "Dimensional Analysis", 1922):
 *   - multiply: add exponents per base
 *   - divide:   subtract exponents per base
 *   - power:    scale exponents by the scalar `n`
 *   - add/sub:  permitted only when both operands have the same dimension
 *
 * @module dimensional/algebra
 */

import { Dimension, NAMED_DIMENSIONS } from './types.js';
import { DimensionMismatchError } from './errors.js';

/**
 * Re-exported for callers that import the error from the algebra module.
 * The definition lives in `errors.ts`.
 *
 * @public
 */
export { DimensionMismatchError } from './errors.js';

const BASES = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;
type Base = typeof BASES[number];

/** Product of two dimensions: exponents add per base. */
export function multiply(a: Dimension, b: Dimension): Dimension {
  const out = {} as Dimension;
  for (const base of BASES) {
    out[base as Base] = a[base as Base] + b[base as Base];
  }
  return out;
}

/** Quotient of two dimensions: exponents subtract per base. */
export function divide(a: Dimension, b: Dimension): Dimension {
  const out = {} as Dimension;
  for (const base of BASES) {
    out[base as Base] = a[base as Base] - b[base as Base];
  }
  return out;
}

/** Raise a dimension to a (possibly fractional) power: exponents scale by `n`. */
export function power(a: Dimension, n: number): Dimension {
  const out = {} as Dimension;
  for (const base of BASES) {
    out[base as Base] = a[base as Base] * n;
  }
  return out;
}

/**
 * Largest exponent difference still treated as equal. Physical dimension
 * exponents are integers or simple rationals (halves, thirds), so any genuine
 * distinction is ≥ ~1/3 — far above this tolerance, which only absorbs
 * floating-point round-off in fractional powers (v0.20 dimensionful `M^0.5`
 * reached by different op chains, e.g. 0.30000000000000004 vs 0.3).
 */
export const EXPONENT_TOL = 1e-9;

/**
 * True iff two dimensions have equal exponents on every base, within
 * `EXPONENT_TOL` so floating-point round-off in fractional exponents does not
 * read as unequal.
 *
 * Unrolled over the 7 bases (no iterator / dynamic-key access) and
 * short-circuiting — `equals` is on the hot path (every `add`/`subtract`, and
 * `format`'s named-dimension scan calls it per entry). Stays distinct from
 * `linkage.ts`'s exact `dimEqual`: this one is tolerant by design (the v0.20
 * fractional-power round-off fix), so they are NOT the same predicate.
 */
export function equals(a: Dimension, b: Dimension): boolean {
  return (
    Math.abs(a.L - b.L) <= EXPONENT_TOL &&
    Math.abs(a.M - b.M) <= EXPONENT_TOL &&
    Math.abs(a.T - b.T) <= EXPONENT_TOL &&
    Math.abs(a.I - b.I) <= EXPONENT_TOL &&
    Math.abs(a.Theta - b.Theta) <= EXPONENT_TOL &&
    Math.abs(a.N - b.N) <= EXPONENT_TOL &&
    Math.abs(a.J - b.J) <= EXPONENT_TOL
  );
}

/** Dimensional sum: requires equal dimensions, else throws `DimensionMismatchError`. */
export function add(a: Dimension, b: Dimension): Dimension {
  if (!equals(a, b)) {
    throw new DimensionMismatchError(
      `Cannot add unlike dimensions: ${format(a)} + ${format(b)}`,
      a,
      b,
    );
  }
  return { ...a };
}

/** Dimensional difference: requires equal dimensions, else throws `DimensionMismatchError`. */
export function subtract(a: Dimension, b: Dimension): Dimension {
  if (!equals(a, b)) {
    throw new DimensionMismatchError(
      `Cannot subtract unlike dimensions: ${format(a)} - ${format(b)}`,
      a,
      b,
    );
  }
  return { ...a };
}

/**
 * Format a `Dimension` for human display.
 *
 * Strategy:
 *   1. If `d` matches a named SI dimension exactly, return e.g. "[energy]".
 *      "dimensionless" is rendered as "[1]" for compactness.
 *   2. Otherwise emit the bracketed product form, e.g. "[M L^2 T^-2]".
 *      Bases with exponent 0 are omitted; exponent 1 is written without "^1".
 */
export function format(d: Dimension): string {
  for (const [name, ref] of NAMED_DIMENSIONS) {
    if (equals(d, ref)) {
      if (name === 'dimensionless') return '[1]';
      return `[${name}]`;
    }
  }
  const parts: string[] = [];
  for (const base of BASES) {
    const exp = d[base as Base];
    if (exp === 0) continue;
    if (exp === 1) parts.push(base);
    else parts.push(`${base}^${exp}`);
  }
  if (parts.length === 0) return '[1]';
  return `[${parts.join(' ')}]`;
}
