/**
 * Fixed-step classical RK4 integrator for affine-parameterized null
 * geodesics, and the one-step RK4 the atlas and case modules call. The
 * covariant-eikonal path (`src/numerical/covariant-eikonal.ts`) uses the
 * symplectic `integrateGeodesicGL4` instead. The fixed steps are
 * `rk4Trajectory` (`rk4-trajectory.ts`, MathTS `solveODESystem` with `dt`),
 * the one owner of the step count; this module returns its last state.
 * Operates on plain `number[]` state vectors, no TensorEngine dependency.
 *
 * @module numerical/null-ray-integrator
 */
import { NumericalBackendError } from './errors.js';
import { rk4Trajectory } from './rk4-trajectory.js';

/** A first-order ODE system: dy/dλ = f(λ, y). `y` and the return are
 *  state vectors of equal length.
 *  v0.6.1: dropped export — was @internal-tagged with no external consumer. */
type ODESystem = (lambda: number, y: ReadonlyArray<number>) => number[];

function checkLength(k: ReadonlyArray<number>, expected: number): void {
  if (k.length !== expected) {
    throw new NumericalBackendError(
      `integrateRK4: ODE system returned a state vector of length ${k.length}, expected ${expected}`,
    );
  }
}

/**
 * Integrate `system` from affine parameter `lambda0` to `lambda1` in
 * `steps` fixed RK4 steps, starting from state `y0`. Returns the final
 * state vector. Classical 4th-order Runge-Kutta — global error O(h⁴). It takes
 * exactly `steps` steps of (lambda1 − lambda0)/steps (`rk4Trajectory`).
 *
 * @internal — cross-module/test use only; not part of the consumer surface.
 */
export function integrateRK4(
  system: ODESystem,
  y0: ReadonlyArray<number>,
  lambda0: number,
  lambda1: number,
  steps: number,
): number[] {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new NumericalBackendError(`integrateRK4: step count must be a positive integer, got ${steps}`);
  }
  const yStart = [...y0];
  const states = rk4Trajectory(
    (lambda, y) => {
      const k = system(lambda, y);
      checkLength(k, yStart.length);
      return k;
    },
    yStart,
    lambda0,
    lambda1,
    steps,
  );
  return states[states.length - 1] ?? yStart;
}
