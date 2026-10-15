/**
 * Geometrized-units boundary adapters (G-9 increment 1).
 *
 * Converts a scalar between SI and geometrized (G = c = 1) units, driven
 * MECHANICALLY by the `Dimension` exponent vector — the dimension functor
 * earning its keep. For an SI quantity of dimension L^l M^m T^t the single
 * conversion factor is `G^m · c^(t − 2m)` (each kg → G/c² metres, each second
 * → c metres); the geometrized quantity is a pure length L^(l+m+t).
 *
 * This is the self-contained FOUNDATION of the units-normalization layer
 * (design: docs/planning/v0.10.0-Units-Normalization-Design-Note.md, Adam-
 * vetted r2; plan: docs/planning/v0.13-G9-Adapters-Plan.md, Eve-vetted). Only c
 * and G are in scope: a nonzero electromagnetic / thermal / molar / luminous
 * exponent (I/Θ/N/J) throws.
 *
 * PUBLIC boundary API (G-9 increment 2): a consumer running the GR pipeline in
 * geometrized (G = c = 1) units converts scalars at the boundary with these
 * adapters. The consumer-wide DEFAULT-pipeline migration (increment 3) was
 * DECLINED after adversarial review — it is measured to give no precision win
 * (and far worse far-field; see docs/planning/v0.14-G9-Increment3-Disposition.md).
 * The SI pipeline stays the default; this geometrized layer is the optional
 * boundary API.
 *
 * @module numerical/geometrized
 */

import type { Dimension } from '../dimensional/types.js';
import { UPTError } from '../dimensional/errors.js';
import { C_SI, G_SI } from '../core/constants.js';

/**
 * A dimension carries a non-c/G base (I/Θ/N/J ≠ 0) and cannot be geometrized
 * by c and G alone (k_B / ε₀ extensions are out of scope for this increment).
 *
 * @public
 */
export class NonGeometrizableDimensionError extends UPTError {
  constructor(message: string) {
    super(message);
    this.name = 'NonGeometrizableDimensionError';
  }
}

/**
 * The single SI→geometrized conversion factor for `dim`: `G^M · c^(T − 2M)`
 * (only the mass and time exponents enter). Shared by `toGeometrized` /
 * `fromGeometrized` so the round-trip is a clean inverse. A nonzero I/Θ/N/J
 * exponent throws `NonGeometrizableDimensionError` BEFORE any factor is
 * computed.
 *
 * @public
 */
export function geometrizedFactor(dim: Dimension): number {
  if (dim.I !== 0 || dim.Theta !== 0 || dim.N !== 0 || dim.J !== 0) {
    throw new NonGeometrizableDimensionError(
      `geometrizedFactor: only c and G are in scope; this dimension has a ` +
        `nonzero non-mechanizable exponent (I=${dim.I}, Θ=${dim.Theta}, ` +
        `N=${dim.N}, J=${dim.J}). Geometrization handles length / mass / time.`,
    );
  }
  return Math.pow(G_SI, dim.M) * Math.pow(C_SI, dim.T - 2 * dim.M);
}

/** SI → geometrized (G = c = 1). @public */
export function toGeometrized(valueSI: number, dim: Dimension): number {
  return valueSI * geometrizedFactor(dim);
}

/** Geometrized (G = c = 1) → SI. @public */
export function fromGeometrized(valueGeom: number, dim: Dimension): number {
  return valueGeom / geometrizedFactor(dim);
}
