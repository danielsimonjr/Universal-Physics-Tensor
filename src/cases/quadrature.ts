/**
 * Adaptive quadrature for the parent-model comparisons of the applied cases:
 * MathTS `quad`, adaptive Gauss–Kronrod (G7–K15), whose embedded error
 * estimate refines each panel until it is below the relative tolerance. The
 * integrands here are smooth and monotone over bands that can span many
 * decades, which a fixed grid resolves badly at the low end.
 *
 * `quad` accepts a panel once its error estimate is below `tol · |panel|` OR
 * below an ABSOLUTE floor of 1e-14, so an SI-scaled integral (a noise power
 * of 1e-13 V², say) would be accepted at a relative error of order one. The
 * integrand is therefore scaled to order one from a coarse pass before
 * `quad` sees it, and scaled back after. `quad` also does not throw when the
 * depth cap is reached; its error estimate is read here, so a
 * non-convergence is still an error rather than a number.
 *
 * @module cases/quadrature
 */
import { quad } from '@danielsimonjr/mathts-functions';

/**
 * ∫ₐᵇ f by MathTS `quad`, to `relTol` of the integral.
 * @throws Error when the result is not finite, or the summed error estimate is above `relTol`
 *   of the integral's coarse scale (the quadrature ran out of depth), with the interval in
 *   the message.
 * @internal
 */
export function adaptiveQuadrature(f: (x: number) => number, a: number, b: number, relTol = 1e-10, maxDepth = 60): number {
  // The scale of the integral from a coarse pass: the largest |f| over 64 samples times the
  // width. It only moves `quad`'s absolute floor out of the way; the tolerance stays relative.
  let scale = 0;
  for (let i = 0; i <= 64; i++) scale = Math.max(scale, Math.abs(f(a + ((b - a) * i) / 64)) * Math.abs(b - a));
  if (!(scale > 0)) scale = 1;
  const { value, error } = quad((x) => f(x) / scale, a, b, { tol: relTol, maxDepth });
  if (!Number.isFinite(value)) throw new Error(`adaptiveQuadrature: non-finite integral ${value * scale} on [${a}, ${b}]`);
  if (!(error <= relTol * Math.max(Math.abs(value), 1))) {
    throw new Error(`adaptiveQuadrature: no convergence on [${a}, ${b}] (error estimate ${error * scale} at relTol ${relTol})`);
  }
  return value * scale;
}
