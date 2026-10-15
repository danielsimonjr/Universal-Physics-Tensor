/**
 * Readers for the typed MathTS results.
 *
 * The typed MathTS functions (`lgamma`, `ellipticK`, `mean`, `gcd`, `inv`,
 * …) are dispatch objects whose declared return is `unknown`, so every
 * caller used to carry its own `typeof` check before arithmetic. These three
 * readers are that check, once: each returns the value as the type it is and
 * throws a `TypeError` naming the MathTS function otherwise. They check the
 * shape, not the value: a `NaN` is a number and is passed through, as the
 * inline checks passed it.
 *
 * @module core/mathts-read
 */

function kindOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/** The number `v` is, or a `TypeError` naming the MathTS function `fn` that returned something else. @internal */
export function numberFrom(fn: string, v: unknown): number {
  if (typeof v !== 'number') throw new TypeError(`${fn} did not return a number (got ${kindOf(v)})`);
  return v;
}

/** The bigint `v` is, or a `TypeError` naming the MathTS function `fn` that returned something else. @internal */
export function bigintFrom(fn: string, v: unknown): bigint {
  if (typeof v !== 'bigint') throw new TypeError(`${fn} did not return a bigint (got ${kindOf(v)})`);
  return v;
}

/**
 * The `n`×`n` number matrix `v` is, copied row by row into a fresh `number[][]`,
 * or a `TypeError` naming the MathTS function `fn` when `v` is not an array of
 * `n` rows of `n` numbers.
 * @internal
 */
export function numberMatrixFrom(fn: string, v: unknown, n: number): number[][] {
  const refuse = (): never => {
    throw new TypeError(`${fn} did not return a ${n}×${n} number matrix (got ${kindOf(v)})`);
  };
  if (!Array.isArray(v) || v.length !== n) return refuse();
  return v.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== n) return refuse();
    return row.map((x: unknown) => (typeof x === 'number' ? x : refuse()));
  });
}
