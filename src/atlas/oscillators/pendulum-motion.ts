/**
 * The pendulum and its linear oscillator, integrated and read off, for the
 * witnesses of `ab-pendulum-linear`'s declared translations. Time is in units
 * of T0 (ω0 = 2π); both motions are released from rest at θ0.
 *
 * Also the closed forms those translations are built from: θ0 recovered from
 * the bound's ε, and the nome q of the pendulum's elliptic modulus.
 *
 * @module atlas/oscillators/pendulum-motion
 * @internal
 */

import { agm, pendulumPeriodErrorAt } from './bridges-limits.js';

/** ω0² at T0 = 1. @internal */
export const W2 = (2 * Math.PI) ** 2;
/** @internal */
export const pendulumAccel = (x: number): number => -W2 * Math.sin(x);
/** @internal */
export const linearAccel = (x: number): number => -W2 * x;

/** One classical RK4 step of x″ = accel(x). @internal */
export function rk4Step(x: number, v: number, h: number, accel: (x: number) => number): [number, number] {
  const k1x = v;
  const k1v = accel(x);
  const k2x = v + 0.5 * h * k1v;
  const k2v = accel(x + 0.5 * h * k1x);
  const k3x = v + 0.5 * h * k2v;
  const k3v = accel(x + 0.5 * h * k2x);
  const k4x = v + h * k3v;
  const k4v = accel(x + h * k3x);
  return [x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x), v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)];
}

/**
 * The root in (0, h] of x(τ), the position one partial RK4 step of length τ
 * from (x, v), by the secant method from the bracket (0, x) and (h, nx).
 *
 * The crossing is then located to the integrator's own truncation error,
 * rather than to the O(h³) error of a straight line between the two steps.
 * That truncation error is nearly the same for the pendulum and the linear
 * oscillator at small θ0, so it cancels in their phase difference; the
 * interpolation error does not.
 */
function refineCrossing(x: number, v: number, nx: number, h: number, accel: (x: number) => number): number {
  let a = 0;
  let fa = x;
  let b = h;
  let fb = nx;
  for (let k = 0; k < 50 && fb !== 0 && fb !== fa; k++) {
    const c = b - (fb * (b - a)) / (fb - fa);
    if (!(c >= -h && c <= 2 * h) || c === b) break;
    a = b;
    fa = fb;
    b = c;
    fb = rk4Step(x, v, c, accel)[0];
  }
  return b;
}

/** Zero-crossing times of a release from rest at `theta0`, over `periods` of T0 = 1. @internal */
export function crossingTimes(accel: (x: number) => number, theta0: number, stepsPerPeriod: number, periods: number): number[] {
  const h = 1 / stepsPerPeriod;
  const out: number[] = [];
  let x = theta0;
  let v = 0;
  for (let i = 0; i < stepsPerPeriod * periods; i++) {
    const [nx, nv] = rk4Step(x, v, h, accel);
    if (nx === 0 || x > 0 !== nx > 0) out.push(i * h + refineCrossing(x, v, nx, h, accel));
    x = nx;
    v = nv;
  }
  return out;
}

/** The phase at `t`, interpolated through the anchors (0, 0) and (c_k, π/2 + kπ). @internal */
export function phaseAt(crossings: readonly number[], t: number): number {
  let prevT = 0;
  let prevPhase = 0;
  for (let k = 0; k < crossings.length; k++) {
    const c = crossings[k]!;
    const phase = Math.PI / 2 + k * Math.PI;
    if (t <= c) return prevPhase + ((phase - prevPhase) * (t - prevT)) / (c - prevT);
    prevT = c;
    prevPhase = phase;
  }
  return Number.NaN;
}

/**
 * θ0 in [0, π) whose exact relative period error is `eps`, by bisection on the
 * strictly increasing `pendulumPeriodErrorAt`.
 *
 * @returns NaN for a negative or non-finite `eps`.
 * @internal
 */
export function theta0OfPeriodError(eps: number): number {
  if (!Number.isFinite(eps) || eps < 0) return Number.NaN;
  if (eps === 0) return 0;
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 200 && hi - lo > 0; i++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (pendulumPeriodErrorAt({ theta0: mid }) < eps) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The nome q = exp(−π K′/K) of the modulus k = sin(θ0/2), with
 * K′/K = AGM(1, cos(θ0/2)) / AGM(1, sin(θ0/2)).
 * @internal
 */
export function pendulumNome(theta0: number): number {
  const k = Math.sin(Math.abs(theta0) / 2);
  if (k === 0) return 0;
  return Math.exp((-Math.PI * agm(1, Math.cos(theta0 / 2))) / agm(1, k));
}
