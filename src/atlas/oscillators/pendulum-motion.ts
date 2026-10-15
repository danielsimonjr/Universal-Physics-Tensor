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

import { ellipticK, findRoot, solveODESystem } from '@danielsimonjr/mathts-functions';
import { pendulumPeriodErrorAt } from './bridges-limits.js';

/** ω0² at T0 = 1. @internal */
export const W2 = (2 * Math.PI) ** 2;
/** @internal */
export const pendulumAccel = (x: number): number => -W2 * Math.sin(x);
/** @internal */
export const linearAccel = (x: number): number => -W2 * x;

/**
 * One fixed step of x″ = accel(x). MathTS `solveODESystem` with `dt` is the
 * classical RK4 step.
 *
 * @internal
 */
export function rk4Step(x: number, v: number, h: number, accel: (x: number) => number): [number, number] {
  const sol = solveODESystem((_t, y) => [y[1]!, accel(y[0]!)], [x, v], [0, h], { dt: h });
  const end = sol.y[sol.y.length - 1] ?? [x, v];
  return [end[0]!, end[1]!];
}

/**
 * The root in (0, h] of x(τ), the position one partial RK4 step of length τ
 * from (x, v), by MathTS `findRoot` (Brent) on the bracket (0, x), (h, nx).
 *
 * The crossing is then located to the integrator's own truncation error,
 * rather than to the O(h³) error of a straight line between the two steps.
 * That truncation error is nearly the same for the pendulum and the linear
 * oscillator at small θ0, so it cancels in their phase difference; the
 * interpolation error does not. `findRoot` evaluates both ends, and a step
 * of length 0 is the start itself (`solveODESystem` cannot take `dt = 0`).
 * Its `tol` stops on the residual (an angle) and on the bracket width (a
 * time in T0), both at 1e-12, below the integrator's error either way.
 */
function refineCrossing(x: number, v: number, nx: number, h: number, accel: (x: number) => number): number {
  if (nx === 0) return h;
  const position = (tau: number): number => (tau === 0 ? x : tau === h ? nx : rk4Step(x, v, tau, accel)[0]);
  return findRoot(position, 0, h, { tol: 1e-12, maxIter: 200 });
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
 * θ0 in [0, π) whose exact relative period error is `eps`, by MathTS
 * `findRoot` (Brent) on the strictly increasing `pendulumPeriodErrorAt`.
 *
 * The residual is solved as `err/eps − 1`, of order 1, so `findRoot`'s one
 * `tol` (it stops on the residual AND on the bracket width) cannot stop on a
 * residual that is small only because `eps` is. The upper end is just below
 * π, where the error is finite; at π it is `Infinity`, which Brent's
 * interpolation cannot take.
 *
 * @returns NaN for a negative or non-finite `eps`.
 * @internal
 */
export function theta0OfPeriodError(eps: number): number {
  if (!Number.isFinite(eps) || eps < 0) return Number.NaN;
  if (eps === 0) return 0;
  const hi = Math.PI * (1 - Number.EPSILON);
  if (pendulumPeriodErrorAt({ theta0: hi }) <= eps) return hi;
  return findRoot((theta0) => pendulumPeriodErrorAt({ theta0 }) / eps - 1, 0, hi, {
    tol: 4 * Number.EPSILON,
    maxIter: 200,
  });
}

/**
 * The nome q = exp(−π K′/K) of the modulus k = sin(θ0/2): K = K(m) and
 * K′ = K(1 − m) at the parameter m = k², both MathTS `ellipticK` (whose
 * route is the AGM, so K′/K = AGM(1, cos(θ0/2)) / AGM(1, sin(θ0/2))).
 * @internal
 */
export function pendulumNome(theta0: number): number {
  const k = Math.sin(Math.abs(theta0) / 2);
  if (k === 0) return 0;
  const K: unknown = ellipticK(k * k);
  const Kp: unknown = ellipticK(Math.cos(theta0 / 2) ** 2);
  if (typeof K !== 'number' || typeof Kp !== 'number') throw new TypeError('ellipticK did not return a number');
  return Math.exp((-Math.PI * Kp) / K);
}
