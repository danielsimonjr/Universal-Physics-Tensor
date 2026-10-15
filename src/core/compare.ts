/**
 * Numeric and string comparisons the layers above share.
 *
 * Two quotients state how far a value is from a reference; three predicates
 * decide agreement in the product form `|a − b| ≤ tol · scale`, which is the
 * form the sites that migrated here used, so a verdict at a tolerance
 * boundary does not move by an ulp. The codepoint order is the sort that
 * `a < b ? -1 : a > b ? 1 : 0` spelled at ten sites; it is not
 * `localeCompare`, and a sort that used `localeCompare` keeps it.
 *
 * @module core/compare
 */

/** `|value − ref| / max(|ref|, floor)`: the relative difference against a reference, with a floor for a reference near zero. @internal */
export function relDiff(value: number, ref: number, floor = 0): number {
  return Math.abs(value - ref) / Math.max(Math.abs(ref), floor);
}

/** `|a − b| / max(|a|, |b|, floor)`: the relative difference of two values neither of which is the reference. @internal */
export function symmetricRelDiff(a: number, b: number, floor = 0): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), floor);
}

/** `|value − ref| ≤ tol · max(|ref|, floor)`: agreement relative to the reference. @internal */
export function withinRel(value: number, ref: number, tol: number, floor = 0): boolean {
  return Math.abs(value - ref) <= tol * Math.max(Math.abs(ref), floor);
}

/**
 * `|value − ref| ≤ tol · max(1, |ref|)`: relative far from one, absolute near
 * zero. The form a stored number written to a few significant digits is
 * checked against the computed one with.
 * @internal
 */
export function withinMixed(value: number, ref: number, tol: number): boolean {
  return Math.abs(value - ref) <= tol * Math.max(1, Math.abs(ref));
}

/** `|a − b| ≤ tol · max(|a|, |b|, floor)`: agreement of two values neither of which is the reference. @internal */
export function withinSymmetric(a: number, b: number, tol: number, floor = 1): boolean {
  return Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), floor);
}

/** The UTF-16 code-unit order of two strings: −1, 0 or 1. Not `localeCompare`. @internal */
export function compareCodepoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A comparator over records, by a string key in codepoint order. @internal */
export function byKey<T>(key: (item: T) => string): (a: T, b: T) => number {
  return (a, b) => compareCodepoint(key(a), key(b));
}
