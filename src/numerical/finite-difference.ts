/**
 * One central-difference rule.
 *
 * Three readers differentiated a closed form by central differences, each
 * with its own step rule and its own denominator (`2h` at one, the
 * representable step at another). The derivative is here, once: the caller
 * passes the step its rule chose, and the denominator is the step the
 * floating-point point actually took, `dx = (x + h) − (x − h)`, so a
 * perturbation that rounds at an astrophysical `x` is divided by what was
 * applied, not by what was asked.
 *
 * @module numerical/finite-difference
 */

/**
 * `∂f/∂x_key` at `point` by the central difference with half-step `step`:
 * `(f(x + h) − f(x − h)) / ((x + h) − (x − h))`. The other keys of `point` are
 * held. The step rule is the caller's; a zero or non-finite `step` makes the
 * denominator 0 or NaN, which the caller refuses before calling.
 * @internal
 */
export function centralPartial(
  f: (point: Record<string, number>) => number,
  point: Readonly<Record<string, number>>,
  key: string,
  step: number,
): number {
  const x = point[key]!;
  const up = x + step;
  const down = x - step;
  return (f({ ...point, [key]: up }) - f({ ...point, [key]: down })) / (up - down);
}
