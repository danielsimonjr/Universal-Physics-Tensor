/**
 * The zero crossing inside one integrator step, read from the cubic Hermite
 * interpolant of the step. The two oscillator witnesses that time a crossing
 * (`atlas/oscillators/limit-witnesses.ts`, `norm-transport-witness.ts`) use it.
 *
 * @module numerical/hermite-crossing
 * @internal
 */

/**
 * Find the zero of the cubic Hermite interpolant on [0, 1].
 * The interpolant has values `p0`, `p1` and step-scaled slopes `m0`, `m1` at the two ends.
 * The start value is the secant root `p0 / (p0 - p1)`. Eight Newton steps refine it.
 *
 * @param p0 - The value at s = 0.
 * @param m0 - The slope at s = 0, multiplied by the step length.
 * @param p1 - The value at s = 1.
 * @param m1 - The slope at s = 1, multiplied by the step length.
 * @returns The fraction s of the step at the crossing.
 * @internal
 */
export function hermiteCrossingFraction(p0: number, m0: number, p1: number, m1: number): number {
  const p = (s: number): number =>
    (2 * s ** 3 - 3 * s ** 2 + 1) * p0 + (s ** 3 - 2 * s ** 2 + s) * m0 + (-2 * s ** 3 + 3 * s ** 2) * p1 + (s ** 3 - s ** 2) * m1;
  const dp = (s: number): number =>
    (6 * s ** 2 - 6 * s) * p0 + (3 * s ** 2 - 4 * s + 1) * m0 + (-6 * s ** 2 + 6 * s) * p1 + (3 * s ** 2 - 2 * s) * m1;
  let s = p0 / (p0 - p1);
  for (let j = 0; j < 8; j++) s -= p(s) / dp(s);
  return s;
}
