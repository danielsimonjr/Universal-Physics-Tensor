/**
 * The measurement behind W1τ, `ab-spring-lc`'s relative-period norm transport
 * (`./norm-transport.ts`).
 *
 * The pendulum is pushed through the bridge's map q(t_LC) = (q0/θ0)·θ(t),
 * t_LC = t·ω_s/ω_LC, and integrated as its OWN equation in circuit time,
 * q'' = −ω_LC² (q0/θ0) sin(θ0 q/q0). Its period is measured by RK4 and compared
 * with the LC circuit's period 2π√(LC). Nothing here multiplies a pendulum
 * period by a factor: the image is solved where the circuit lives.
 *
 * @module atlas/oscillators/norm-transport-witness
 * @internal
 */

import { rk4Step } from './pendulum-motion.js';
import { W1TAU_FIXTURE } from './norm-transport.js';

/** The circuit and release a measurement uses. @internal */
export interface TransportCircuit {
  readonly L: number;
  readonly C: number;
  /** Release charge, > 0. */
  readonly q0: number;
}

/**
 * First downward zero crossing of the release from rest at `q0 > 0`, by cubic
 * Hermite interpolation of the bracketing RK4 step (values and derivatives at
 * both ends), refined by Newton. Released from rest, it is a quarter period.
 */
function quarterPeriod(accel: (q: number) => number, q0: number, h: number, maxSteps: number): number {
  let x = q0;
  let v = 0;
  for (let i = 0; i < maxSteps; i++) {
    const [nx, nv] = rk4Step(x, v, h, accel);
    if (x > 0 && nx <= 0) {
      const [p0, m0, p1, m1] = [x, v * h, nx, nv * h];
      const p = (s: number): number =>
        (2 * s ** 3 - 3 * s ** 2 + 1) * p0 + (s ** 3 - 2 * s ** 2 + s) * m0 + (-2 * s ** 3 + 3 * s ** 2) * p1 + (s ** 3 - s ** 2) * m1;
      const dp = (s: number): number =>
        (6 * s ** 2 - 6 * s) * p0 + (3 * s ** 2 - 4 * s + 1) * m0 + (-6 * s ** 2 + 6 * s) * p1 + (3 * s ** 2 - 2 * s) * m1;
      let s = p0 / (p0 - p1);
      for (let k = 0; k < 8; k++) s -= p(s) / dp(s);
      return (i + s) * h;
    }
    x = nx;
    v = nv;
  }
  return Number.NaN;
}

/**
 * T_image / T_LC − 1: the relative period error of the pendulum's image against
 * the circuit, with `stepsPerPeriod` RK4 steps per LC period.
 *
 * @returns NaN when `theta0` is not in (0, π) or no crossing is found.
 * @internal
 */
export function measureTransportedPeriodError(
  theta0: number,
  stepsPerPeriod: number,
  circuit: TransportCircuit = W1TAU_FIXTURE,
): number {
  if (!(theta0 > 0 && theta0 < Math.PI) || !(circuit.q0 > 0)) return Number.NaN;
  const omegaLC = 1 / Math.sqrt(circuit.L * circuit.C);
  const tLC = (2 * Math.PI) / omegaLC;
  const accel = (q: number): number => -(omegaLC ** 2) * (circuit.q0 / theta0) * Math.sin((theta0 * q) / circuit.q0);
  const quarter = quarterPeriod(accel, circuit.q0, tLC / stepsPerPeriod, 2 * stepsPerPeriod);
  return (4 * quarter) / tLC - 1;
}
