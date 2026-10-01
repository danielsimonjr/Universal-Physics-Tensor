/**
 * First-order uncertainty propagation through composition edges
 * (v0.10.0 T4 — fulfills the improvement plan's G-3 carrier claim:
 * "edges carry uncertainties, and uncertainty propagates through
 * composition").
 *
 *   σ_out² = Σᵢ (∂f/∂xᵢ · σᵢ)²        (independent-input Gaussian,
 *                                       first order)
 *
 * Partials are central differences with a relative step
 * h = 1e-6·max(|xᵢ|, 1e-30). Because composed edges ARE `BridgeEdge`s
 * (design D-2 closure), chains need no extra machinery — propagate on
 * the composed edge directly.
 *
 * Scope honesty: independent inputs only (no covariance matrix), first
 * order only (no curvature term). Adequate for the scalar closed-form
 * edges in the graph today; revisit both if correlated observables or
 * strongly nonlinear edges land.
 *
 * @module composition/uncertainty
 */

import type { BridgeEdge } from './edge.js';
import { evaluateEdge } from './edge.js';
import type { ApproximationBound } from '../relations/types.js';

/**
 * Optional extras for {@link propagateUncertainty}.
 *
 * INTERNAL, not public. Sprint 2's boundary is that nothing new reaches
 * `src/index.ts` before Phase 6. This shipped tagged public, which failed
 * `tests/api/public-tag-vs-index-invariant.test.ts`: a symbol advertised as
 * public but unreachable from the barrel is a promise the package cannot keep.
 *
 * @internal
 */
export interface UncertaintyOptions {
  /**
   * An approximation bound for the map the edge stands in for. Its `delta` —
   * the uniform model error in `bound.norm` — is added to the statistical
   * sigma IN QUADRATURE, on the usual independence assumption between input
   * noise and model error.
   *
   * `bound.K` is deliberately NOT used. The Lipschitz constant composes bounds
   * ALONG A PATH (`atlas/error-algebra`); applying it here would rescale a
   * sigma this edge already differentiates directly, double-counting the
   * sensitivity the partials measure.
   *
   * ⚠ The caller is asserting that `bound.norm` is commensurate with the
   * edge's output quantity. Nothing here can check that — no edge records a
   * norm — so supplying a bound whose norm is a RELATIVE error against an
   * absolute-valued edge produces a wrong number silently. Omit `bound` unless
   * the norms genuinely match.
   */
  readonly bound?: ApproximationBound;
}

/** Result of a propagation. @public */
export interface UncertaintyResult {
  /** Central value f(x) (domain-checked). */
  readonly value: number;
  /**
   * Propagated 1σ STATISTICAL standard deviation, from the input sigmas alone.
   *
   * This never includes `bound.delta`. A deterministic bias and a random spread are different
   * things and this field is only the second; see {@link UncertaintyResult.delta}.
   */
  readonly sigma: number;
  /**
   * The DETERMINISTIC model-error bound, present only when `opts.bound` was supplied — the echo of
   * `bound.delta`, surfaced beside `sigma` rather than folded into it.
   *
   * A caller needing a single envelope combines them and owns the coverage factor it chose:
   * `k * sigma + delta`. This function will not choose `k`.
   */
  readonly delta?: number;
  /** Per-input partial derivatives ∂f/∂xᵢ (central difference). */
  readonly partials: Readonly<Record<string, number>>;
  /** Echo of `opts.bound`, present only when one was supplied. */
  readonly bound?: ApproximationBound;
}

/**
 * Propagate independent 1σ input uncertainties through an edge.
 *
 * `sigmas` keys are source-quantity names; inputs absent from `sigmas`
 * (or with σ = 0) contribute no variance but still get a partial.
 * The central value is domain-checked (`evaluateEdge`); the stencil
 * evaluations use the raw evaluator — a ±h step that exits the
 * validity domain near its boundary would otherwise poison the
 * derivative with a thrown error rather than a number.
 *
 * `opts.bound` is the only way this function's output can differ from its
 * pre-Sprint-2 output: omit it and every field is byte-identical, including
 * the absence of `bound` on the result.
 *
 * @public
 */
export function propagateUncertainty(
  edge: BridgeEdge,
  inputs: Record<string, number>,
  sigmas: Record<string, number>,
  opts?: UncertaintyOptions,
): UncertaintyResult {
  const value = evaluateEdge(edge, inputs);

  const partials: Record<string, number> = {};
  let variance = 0;

  for (const source of edge.sources) {
    const name = source.name;
    const x = inputs[name];
    if (!Number.isFinite(x)) {
      throw new RangeError(
        `propagateUncertainty: input '${name}' is not a finite number`,
      );
    }
    const h = 1e-6 * Math.max(Math.abs(x), 1e-30);
    const plus = edge.evaluate({ ...inputs, [name]: x + h });
    const minus = edge.evaluate({ ...inputs, [name]: x - h });
    const partial = (plus - minus) / (2 * h);
    partials[name] = partial;

    const sigma = sigmas[name] ?? 0;
    if (sigma < 0 || !Number.isFinite(sigma)) {
      throw new RangeError(
        `propagateUncertainty: sigma for '${name}' must be finite and ≥ 0`,
      );
    }
    if (sigma > 0) variance += partial * partial * sigma * sigma;
  }

  const bound = opts?.bound;
  if (bound === undefined) {
    return { value, sigma: Math.sqrt(variance), partials };
  }
  if (!Number.isFinite(bound.delta) || bound.delta < 0) {
    throw new RangeError(
      `propagateUncertainty: bound.delta must be finite and ≥ 0, got ${bound.delta}`,
    );
  }
  // THE TWO ARE REPORTED SEPARATELY AND ARE DELIBERATELY NOT COMBINED.
  //
  // This previously returned `sqrt(variance + delta^2)`, justified by "the usual independence
  // assumption between input noise and model error". INDEPENDENCE DOES NOT LICENSE QUADRATURE FOR
  // A BIAS. `sigma` is a 1-sigma spread of a zero-mean random variable; `bound.delta` is a
  // DETERMINISTIC worst-case sup-norm offset. Adding them in quadrature treats a systematic
  // displacement as if it averaged out, which UNDERSTATES the envelope — and understates it
  // precisely when the model error is largest relative to the noise, which is when a caller most
  // needs the number to be honest.
  //
  // Raised independently by two reviews that did not see each other (an adversarial physics panel,
  // and Eve E2), which is the strongest signal this project has produced.
  //
  // WHY SEPARATE RATHER THAN ADDED. Collapsing to one number requires choosing a coverage factor —
  // `k*sigma + delta`, with k about 4.47 for 95% by Chebyshev, or k=1 for a 1-sigma semi-interval.
  // That choice belongs to the caller's risk posture, not to this library, and baking one in would
  // repeat the original error in a new costume: a defensible-looking number whose provenance is a
  // convention nobody stated. A caller who needs one value composes it from the two fields and owns
  // the k it picked.
  return {
    value,
    sigma: Math.sqrt(variance),
    delta: bound.delta,
    partials,
    bound,
  };
}
