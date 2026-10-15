/**
 * Fixed-step classical RK4 that keeps EVERY state of the run, for the callers
 * that read a quantity off the whole motion (a supremum over a window, a zero
 * crossing) rather than off the final state. `integrateRK4`
 * (`null-ray-integrator.ts`) is the same MathTS `solveODESystem` call with
 * `dt` set and returns the last state only; a caller that re-entered it once
 * per sample would not reproduce one continuous fixed-step run, which is why
 * this module exists beside it. The two agree on the final state bit for bit
 * (`tests/numerical/rk4-trajectory.test.ts`).
 *
 * @module numerical/rk4-trajectory
 */
import { solveODESystem } from '@danielsimonjr/mathts-functions';
import { NumericalBackendError } from './errors.js';

/**
 * Integrate `dy/dt = system(t, y)` from `t0` to `t1` in `steps` fixed RK4
 * steps and return the `steps + 1` states, the first being `y0`.
 *
 * @throws NumericalBackendError if `steps` is not a positive integer, or the
 *   run did not produce exactly `steps + 1` states.
 * @internal
 */
export function rk4Trajectory(
  system: (t: number, y: ReadonlyArray<number>) => number[],
  y0: ReadonlyArray<number>,
  t0: number,
  t1: number,
  steps: number,
): number[][] {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new NumericalBackendError(`rk4Trajectory: step count must be a positive integer, got ${steps}`);
  }
  const h = (t1 - t0) / steps;
  const sol = solveODESystem(system, [...y0], [t0, t1], { dt: h });
  if (sol.y.length !== steps + 1) {
    throw new NumericalBackendError(`rk4Trajectory: expected ${steps + 1} states, got ${sol.y.length}`);
  }
  return sol.y.map((state) => [...state]);
}
