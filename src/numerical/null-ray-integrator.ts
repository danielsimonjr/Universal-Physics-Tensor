/**
 * Fixed-step classical RK4 integrator for affine-parameterized null
 * geodesics. No module under `src/` calls it: the covariant-eikonal path
 * (`src/numerical/covariant-eikonal.ts`) uses the symplectic
 * `integrateGeodesicGL4`, and the tests keep this one as the RK4 oracle
 * the atlas ODE helper is compared against. The fixed steps are MathTS
 * `solveODESystem` with `dt` set. Operates on plain `number[]` state
 * vectors, no TensorEngine dependency.
 *
 * @module numerical/null-ray-integrator
 */
import { solveODESystem } from '@danielsimonjr/mathts-functions';
import { NumericalBackendError } from './errors.js';

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
 * state vector. Classical 4th-order Runge-Kutta — global error O(h⁴).
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
  const h = (lambda1 - lambda0) / steps;
  const yStart = [...y0];
  const sol = solveODESystem(
    (lambda, y) => {
      const k = system(lambda, y);
      checkLength(k, yStart.length);
      return k;
    },
    yStart,
    [lambda0, lambda1],
    { dt: h },
  );
  return [...(sol.y[sol.y.length - 1] ?? yStart)];
}
