/**
 * The measurements behind the in-process witnesses of the three oscillator
 * bridges that had none: W7 (`ab-pendulum-linear`), W8b (`ab-damped-massless`)
 * and W9 (`ab-chain-wave`).
 *
 * Each one INTEGRATES the premise model's own equation with MathTS
 * `solveODESystem` and `dt`, and reads the
 * claimed quantity off the motion. None evaluates the closed form its record
 * states, so a test comparing the measurement with that closed form compares
 * two methods, not one method with itself.
 *
 * @module atlas/oscillators/limit-witnesses
 * @internal
 */

import { solveODESystem } from '@danielsimonjr/mathts-functions';
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
  const sol = solveODESystem(
    (_t, y) => [y[1]!, -(b * y[1]! + k * y[0]!) / m],
    [x0, v0],
    [0, steps * h],
    { dt: h },
  );
  let sup = 0;
  for (let i = layerSteps; i <= steps; i++) {
    const x = sol.y[i]?.[0];
    if (x === undefined) return Number.NaN;
    sup = Math.max(sup, Math.abs(x - x0 * Math.exp((-k / b) * i * h)));
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
  const h = 1 / stepsPerUnitTime;
  let state = [
    ...Float64Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * n) / N)),
    ...new Array<number>(N).fill(0),
  ];
  // Twice the lattice quarter period π/(4√(κ/m) sin(π/N)): the crossing is inside.
  const maxSteps = Math.ceil(((2 * Math.PI) / (4 * Math.sqrt(w) * Math.sin(Math.PI / N))) * stepsPerUnitTime);
  for (let i = 0; i < maxSteps; i++) {
    const sol = solveODESystem(
      (_t, y) => {
        const pos = Float64Array.from(y.slice(0, N));
        const vel = y.slice(N);
        const a = accel(pos);
        return [...vel, ...a];
      },
      state,
      [0, h],
      { dt: h },
    );
    const next = sol.y[sol.y.length - 1];
    if (next === undefined) return Number.NaN;
    const u0 = state[0]!;
    const nu0 = next[0]!;
    const v0 = state[N]!;
    const nv0 = next[N]!;
    if (u0 > 0 && nu0 <= 0) {
      const [p0, m0, p1, m1] = [u0, v0 * h, nu0, nv0 * h];
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
    state = next.slice();
  }
  return Number.NaN;
}
