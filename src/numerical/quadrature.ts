/**
 * Gauss–Legendre quadrature — shared between the numerical AST lowering and the
 * traced reverse-mode-AD lowering of definite `integral` nodes.
 *
 * 16-point Gauss–Legendre on [−1, 1]: exact for polynomials of degree ≤ 31, and
 * highly accurate for smooth integrands (√, exp, trig away from singularities).
 * It is NOT reliable for highly oscillatory integrands or singularities at/near
 * the bounds — those are out of scope for the differentiable-integral feature.
 *
 * The affine map from [−1, 1] to [a, b] is x = (b−a)/2·ξ + (a+b)/2 with Jacobian
 * (b−a)/2, so ∫ₐᵇ f dx ≈ (b−a)/2 · Σᵢ wᵢ·f(xᵢ). For b < a the (b−a)/2 factor is
 * negative, giving the correct signed integral (∫ₐᵇ = −∫ᵦᵃ).
 *
 * The nodes are MathTS `rootsLegendre(16)`. `gaussQuad` is not this rule: its
 * single-interval order is only 2–5, and a larger `n` is that many panels of
 * order 5. `quad` is adaptive Gauss–Kronrod, not a fixed degree.
 *
 * @module numerical/quadrature
 */
import { rootsLegendre } from '@danielsimonjr/mathts-functions';

/** A Gauss–Legendre abscissa/weight pair on the reference interval [−1, 1]. @internal */
interface GaussLegendreNode {
  readonly node: number;
  readonly weight: number;
}

const legendre16 = rootsLegendre(16);

/** P₁₆'(x) by the three-term recurrence, for the weight formula. */
function legendre16Derivative(x: number): number {
  let p0 = 1;
  let p1 = x;
  for (let k = 2; k <= 16; k++) {
    const p2 = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
    p0 = p1;
    p1 = p2;
  }
  return (16 * (x * p1 - p0)) / (x * x - 1);
}

/**
 * 16-point Gauss–Legendre nodes and weights on [−1, 1] (Σ weights = 2). The
 * nodes are MathTS `rootsLegendre(16)`'s. The weights are the closed form
 * `2 / ((1 − x²) P₁₆'(x)²)` on those nodes: MathTS's tabulated weights carried a
 * relative error of 8e-14 (Σ = 1.9999999999999956), 400 times the double
 * precision the degree-31 exactness claim rests on (Tom's second round).
 */
export const GAUSS_LEGENDRE_16: ReadonlyArray<GaussLegendreNode> = legendre16.nodes.map((node) => {
  const dp = legendre16Derivative(node);
  return { node, weight: 2 / ((1 - node * node) * dp * dp) };
});

/**
 * Evaluate the definite integral ∫ₐᵇ f(x) dx by 16-point Gauss–Legendre
 * quadrature. `f` is sampled at the 16 mapped abscissae.
 */
export function integrateGaussLegendre(
  f: (x: number) => number,
  a: number,
  b: number,
): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new RangeError(
      `integrateGaussLegendre: integration bounds must be finite, got [${a}, ${b}].`,
    );
  }
  const half = (b - a) / 2;
  const mid = (a + b) / 2;
  let sum = 0;
  for (const { node, weight } of GAUSS_LEGENDRE_16) {
    sum += weight * f(half * node + mid);
  }
  const result = half * sum;
  if (!Number.isFinite(result)) {
    throw new RangeError(
      `integrateGaussLegendre: integrand produced a non-finite result (${result}) on [${a}, ${b}].`,
    );
  }
  return result;
}
