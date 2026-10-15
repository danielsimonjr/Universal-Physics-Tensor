/**
 * The printed forms of a number.
 *
 * A recovered or compared quantity prints through {@link formatQuantity}: a
 * fixed count of significant digits, an integer as an integer. A value a
 * reader may need to reproduce bit for bit prints through
 * {@link formatExact}. A fraction reported as a percentage prints through
 * {@link formatPercent}. The number itself is never rounded by these; only
 * its text is.
 *
 * @module core/format
 */

/**
 * `value` to `digits` significant digits (15 by default, the precision an
 * evaluator input is already passed at; a statistic such as a residual in σ
 * asks for 3), with trailing zeros dropped so an integer stays `1`, not
 * `1.0000e+0`.
 * @internal
 */
export function formatQuantity(value: number, digits = 15): string {
  return String(Number(value.toPrecision(digits)));
}

/** The shortest decimal that round-trips to the same double (`upt evaluate`'s outputs). @internal */
export function formatExact(value: number): string {
  return String(value);
}

/** How {@link formatPercent} prints a statistic: significant digits, and a `+` on a positive value when `signed`. @internal */
export interface PercentDigits {
  readonly significant: number;
  readonly signed?: boolean;
}

/**
 * The fraction `x` as a percentage. A number of `digits` fixes the decimals
 * (`0.1234` → `12.3%`); `{ significant }` prints that many significant digits
 * through {@link formatQuantity} (`-0.437` → `-43.7%`, `1.5` → `150%`), and
 * `signed` adds `+` to a positive value (`+25.7%`; zero stays `0%`).
 * @internal
 */
export function formatPercent(x: number, digits: number | PercentDigits = 1): string {
  if (typeof digits === 'number') return `${(100 * x).toFixed(digits)}%`;
  return `${digits.signed === true && x > 0 ? '+' : ''}${formatQuantity(x * 100, digits.significant)}%`;
}
