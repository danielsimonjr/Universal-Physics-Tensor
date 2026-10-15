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

/** The fraction `x` as a percentage with `digits` decimals: `0.1234` → `12.3%`. @internal */
export function formatPercent(x: number, digits = 1): string {
  return `${(100 * x).toFixed(digits)}%`;
}
