/**
 * The measurements behind the in-process witnesses of the three oscillator
 * bridges that had none: W7 (`ab-pendulum-linear`), W8b (`ab-damped-massless`)
 * and W9 (`ab-chain-wave`).
 *
 * Each one INTEGRATES the premise model's own equation by RK4 and reads the
 * claimed quantity off the motion. None evaluates the closed form its record
 * states, so a test comparing the measurement with that closed form compares
 * two methods, not one method with itself.
 *
 * @module atlas/oscillators/limit-witnesses
 * @internal
 */

import { quarterPeriod } from './norm-transport-witness.js';

/**
 * W7: the pendulum θ'' = −ω0² sin θ at ω0 = 1, released from rest; the
 * amplitude is `theta0 / resolution`, so refinement moves into the θ0 → 0 limit.
 *
 * @internal
 */
export const W7_FIXTURE = { theta0: 0.4, stepsPerPeriod: 16_384 } as const;

/**
 * T/T0 of the pendulum released from rest at `theta0`, measured by RK4 with
 * `stepsPerPeriod` steps per linear period T0 = 2π (ω0 = 1).
 *
 * @returns NaN unless 0 < theta0 < π.
 * @internal
 */
export function measurePendulumPeriodRatio(theta0: number, stepsPerPeriod: number = W7_FIXTURE.stepsPerPeriod): number {
  if (!(theta0 > 0 && theta0 < Math.PI)) return Number.NaN;
  const T0 = 2 * Math.PI;
  const quarter = quarterPeriod((x) => -Math.sin(x), theta0, T0 / stepsPerPeriod, 2 * stepsPerPeriod);
  return (4 * quarter) / T0;
}

/**
 * W8b: the damped spring m x'' + b x' + k x = 0 at the record's witness
 * normalisation b = k = x0 = 1, with v0 = 5 (the edge of |v0| ≤ 5). The mass is
 * `m / resolution`. The RK4 step is m/20, so the fast rate b/m is resolved at
 * every mass, and 5m/b is a whole number of steps.
 *
 * @internal
 */
export const W8B_FIXTURE = { m: 0.02, b: 1, k: 1, x0: 1, v0: 5, tEnd: 10, stepsPerMass: 20 } as const;

/**
 * sup |x(t) − x0 e^(−kt/b)| over the RK4 grid on t ∈ [5m/b, tEnd], x from the
 * full second-order model: the norm of `ab-damped-massless`'s bound. The
 * window stops at `tEnd`; both motions there are below x0·e^(−k·tEnd/b).
 *
 * @returns NaN unless m, b and k are positive and finite.
 * @internal
 */
export function measureMasslessOffset(
  m: number,
  fixture: { readonly b: number; readonly k: number; readonly x0: number; readonly v0: number; readonly tEnd: number; readonly stepsPerMass: number } = W8B_FIXTURE,
): number {
  const { b, k, x0, v0, tEnd, stepsPerMass } = fixture;
  if (![m, b, k].every((v) => Number.isFinite(v) && v > 0)) return Number.NaN;
  const h = m / stepsPerMass;
  const layerSteps = Math.ceil((5 * stepsPerMass) / b);
  const steps = Math.ceil(tEnd / h);
  let x = x0;
  let v = v0;
  let sup = 0;
  for (let i = 1; i <= steps; i++) {
    // The damped force reads v as well as x, so the first-order system is stepped here.
    const f = (xx: number, vv: number): number => -(b * vv + k * xx) / m;
    const k1x = v;
    const k1v = f(x, v);
    const k2x = v + 0.5 * h * k1v;
    const k2v = f(x + 0.5 * h * k1x, v + 0.5 * h * k1v);
    const k3x = v + 0.5 * h * k2v;
    const k3v = f(x + 0.5 * h * k2x, v + 0.5 * h * k2v);
    const k4x = v + h * k3v;
    const k4v = f(x + h * k3x, v + h * k3v);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (i >= layerSteps) sup = Math.max(sup, Math.abs(x - x0 * Math.exp((-k / b) * i * h)));
  }
  return sup;
}

/**
 * W9: a ring of `masses · resolution` masses, m u_n'' = κ(u_{n+1} − 2u_n + u_{n−1}),
 * started at rest in its longest mode u_n = cos(2π n/N). Refinement doubles N, so
 * qa = 2π/N halves.
 *
 * @internal
 */
export const W9_FIXTURE = { masses: 16, kappa: 1, m: 1, a: 1, stepsPerUnitTime: 1000 } as const;

/**
 * 1 − ω/(c q) on a ring of `masses` masses in its longest mode, with ω measured
 * from the first zero of u_0(t) = cos ωt (RK4, cubic Hermite and Newton on the
 * bracketing step) and c = a √(κ/m), q = 2π/(N a).
 *
 * @returns NaN for fewer than 3 masses or no crossing.
 * @internal
 */
export function measureChainDispersionError(
  masses: number,
  fixture: { readonly kappa: number; readonly m: number; readonly a: number; readonly stepsPerUnitTime: number } = W9_FIXTURE,
): number {
  const N = masses;
  if (!Number.isInteger(N) || N < 3) return Number.NaN;
  const { kappa, m, a, stepsPerUnitTime } = fixture;
  const w = kappa / m;
  const accel = (u: Float64Array): Float64Array => {
    const out = new Float64Array(N);
    for (let n = 0; n < N; n++) out[n] = w * (u[(n + 1) % N]! - 2 * u[n]! + u[(n - 1 + N) % N]!);
    return out;
  };
  const axpy = (y: Float64Array, s: number, x: Float64Array): Float64Array => {
    const out = new Float64Array(N);
    for (let n = 0; n < N; n++) out[n] = y[n]! + s * x[n]!;
    return out;
  };
  const h = 1 / stepsPerUnitTime;
  let u = Float64Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * n) / N));
  let v = new Float64Array(N);
  // Twice the lattice quarter period π/(4√(κ/m) sin(π/N)): the crossing is inside.
  const maxSteps = Math.ceil(((2 * Math.PI) / (4 * Math.sqrt(w) * Math.sin(Math.PI / N))) * stepsPerUnitTime);
  for (let i = 0; i < maxSteps; i++) {
    const k1u = v;
    const k1v = accel(u);
    const k2u = axpy(v, 0.5 * h, k1v);
    const k2v = accel(axpy(u, 0.5 * h, k1u));
    const k3u = axpy(v, 0.5 * h, k2v);
    const k3v = accel(axpy(u, 0.5 * h, k2u));
    const k4u = axpy(v, h, k3v);
    const k4v = accel(axpy(u, h, k3u));
    const nu = new Float64Array(N);
    const nv = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      nu[n] = u[n]! + (h / 6) * (k1u[n]! + 2 * k2u[n]! + 2 * k3u[n]! + k4u[n]!);
      nv[n] = v[n]! + (h / 6) * (k1v[n]! + 2 * k2v[n]! + 2 * k3v[n]! + k4v[n]!);
    }
    if (u[0]! > 0 && nu[0]! <= 0) {
      const [p0, m0, p1, m1] = [u[0]!, v[0]! * h, nu[0]!, nv[0]! * h];
      const p = (s: number): number =>
        (2 * s ** 3 - 3 * s ** 2 + 1) * p0 + (s ** 3 - 2 * s ** 2 + s) * m0 + (-2 * s ** 3 + 3 * s ** 2) * p1 + (s ** 3 - s ** 2) * m1;
      const dp = (s: number): number =>
        (6 * s ** 2 - 6 * s) * p0 + (3 * s ** 2 - 4 * s + 1) * m0 + (-6 * s ** 2 + 6 * s) * p1 + (3 * s ** 2 - 2 * s) * m1;
      let s = p0 / (p0 - p1);
      for (let j = 0; j < 8; j++) s -= p(s) / dp(s);
      const omega = Math.PI / (2 * (i + s) * h);
      const c = a * Math.sqrt(w);
      const q = (2 * Math.PI) / (N * a);
      return 1 - omega / (c * q);
    }
    u = nu;
    v = nv;
  }
  return Number.NaN;
}
