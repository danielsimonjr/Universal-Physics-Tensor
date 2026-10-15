/**
 * Adaptive quadrature for the parent-model comparisons of the applied cases:
 * MathTS `quad`, adaptive Gauss–Kronrod (G7–K15), whose embedded error
 * estimate refines each panel until it is below the relative tolerance. The
 * integrands here are smooth, one-signed and monotone over bands that can
 * span many decades, which a fixed grid resolves badly at the low end.
 *
 * `quad` is called with `atol: 0` (`@danielsimonjr/mathts-functions` ≥
 * 0.68.3): its default accepts a panel whose error estimate is below an
 * ABSOLUTE 1e-14, which would accept an SI-scaled integral (a noise power of
 * 1e-13 V²) at a relative error of order one. `quad` also does not throw when
 * the depth cap is reached; its error estimate is read here, so a
 * non-convergence is still an error rather than a number.
 *
 * @module cases/quadrature
 */
import { quad } from '@danielsimonjr/mathts-functions';

/**
 * ∫ₐᵇ f by MathTS `quad`, to `relTol` of the integral, for a one-signed `f`.
 *
 * Each panel is accepted at an error estimate below `relTol` of its own value,
 * so for a one-signed integrand the summed estimate is below `relTol` of the
 * integral; a sign-changing integrand can exceed that and is refused.
 * @throws Error when the result is not finite, or the summed error estimate is above twice
 *   `relTol` of the integral (the quadrature ran out of depth), with the interval in the message.
 * @internal
 */
export function adaptiveQuadrature(f: (x: number) => number, a: number, b: number, relTol = 1e-10, maxDepth = 60): number {
  const { value, error } = quad(f, a, b, { tol: relTol, atol: 0, maxDepth });
  if (!Number.isFinite(value)) throw new Error(`adaptiveQuadrature: non-finite integral ${value} on [${a}, ${b}]`);
  if (error > 2 * relTol * Math.abs(value)) {
    throw new Error(`adaptiveQuadrature: no convergence on [${a}, ${b}] (error estimate ${error} at relTol ${relTol})`);
  }
  return value;
}
