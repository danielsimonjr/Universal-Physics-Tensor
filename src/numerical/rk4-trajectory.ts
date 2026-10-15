/**
 * Fixed-step classical RK4 that keeps EVERY state of the run: the one owner of
 * the fixed-step count. `integrateRK4` (`null-ray-integrator.ts`) returns its
 * last state and `integrateGeodesic` (`geodesic-integrator.ts`) samples its
 * states; callers that read a quantity off the whole motion (a supremum over a
 * window, a zero crossing) call it directly. A caller that re-entered a
 * one-step integrator once per sample would not reproduce one continuous
 * fixed-step run (`tests/numerical/rk4-trajectory.test.ts`).
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
  // MathTS takes ceil(span/dt) steps of span/ceil(span/dt): when span/(span/steps)
  // rounds a hair above `steps` it takes one extra, smaller step. `dt` is passed
  // a few ulps above span/steps so that ceiling is exactly `steps`, and the step
  // MathTS then uses is span/steps, the one asked for. The count is still checked.
  const h = ((t1 - t0) / steps) * (1 + 4 * Number.EPSILON);
  const sol = solveODESystem(system, [...y0], [t0, t1], { dt: h });
  if (sol.y.length !== steps + 1) {
    throw new NumericalBackendError(`rk4Trajectory: expected ${steps + 1} states, got ${sol.y.length}`);
  }
  return sol.y.map((state) => [...state]);
}
