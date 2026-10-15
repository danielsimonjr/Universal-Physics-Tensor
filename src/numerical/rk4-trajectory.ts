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
  // From @danielsimonjr/mathts-functions 0.68.5 (MathTS #371) a `span/dt` that is a whole number
  // up to rounding takes exactly that many steps of span/n and ends on t1; before it, `ceil`
  // could add one smaller step, and this module nudged `dt` by 4ε to avoid it. The count is
  // still checked, so a regression in MathTS is refused here, not integrated.
  const h = (t1 - t0) / steps;
  const sol = solveODESystem(system, [...y0], [t0, t1], { dt: h });
  if (sol.y.length !== steps + 1) {
    throw new NumericalBackendError(`rk4Trajectory: expected ${steps + 1} states, got ${sol.y.length}`);
  }
  return sol.y.map((state) => [...state]);
}
