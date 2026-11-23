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
 * Start at the secant root and keep the endpoint sign bracket while refining.
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
  if (![p0, m0, p1, m1].every(Number.isFinite)) throw new RangeError('Hermite crossing requires finite values and slopes');
  if (p0 === 0) return 0;
  if (p1 === 0) return 1;
  if ((p0 < 0) === (p1 < 0)) throw new RangeError('Hermite crossing requires a sign bracket');

  let lo = 0;
  let hi = 1;
  const scale = Math.max(Math.abs(p0), Math.abs(p1));
  let s = (p0 / scale) / (p0 / scale - p1 / scale);
  for (let iteration = 0; iteration < 112; iteration++) {
    const value = p(s);
    if (value === 0) return s;
    if ((value < 0) === (p0 < 0)) lo = s;
    else hi = s;

    const midpoint = (lo + hi) / 2;
    if (hi - lo <= Number.EPSILON) return midpoint;
    const slope = dp(s);
    const next = s - value / slope;
    // Periodic bisection guarantees progress even when Newton's step barely moves.
    s = iteration % 2 === 0 && next > lo && next < hi ? next : midpoint;
  }
  return (lo + hi) / 2;
}
