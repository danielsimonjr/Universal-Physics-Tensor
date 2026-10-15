/**
 * Explicit residual / discrepancy evaluation. Does not replace
 * `residualInSigma` on the confrontation spine.
 *
 * @module composition/probe/residual
 */

import { norm2 } from '@danielsimonjr/mathts-core';
import type { DiscrepancyDefinition, DiscrepancyKind } from './types.js';

export class ResidualError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResidualError';
  }
}

/**
 * Scalar discrepancy. Covariance-standardized with a non-diagonal Σ is
 * unsupported and throws rather than silently using diagonal σ.
 *
 * @internal
 */
export function scalarDiscrepancy(
  observed: number,
  predicted: number,
  kind: DiscrepancyKind,
  scale = 1,
): number {
  if (!Number.isFinite(observed) || !Number.isFinite(predicted)) {
    throw new ResidualError('scalarDiscrepancy: observed and predicted must be finite');
  }
  switch (kind) {
    case 'additive':
      return observed - predicted;
    case 'relative': {
      const s = scale !== 0 && Number.isFinite(scale) ? scale : Math.abs(predicted) || 1;
      return (observed - predicted) / s;
    }
    case 'log-ratio': {
      if (!(observed > 0 && predicted > 0)) {
        throw new ResidualError('log-ratio residual requires positive observed and predicted');
      }
      return Math.log(observed / predicted);
    }
    case 'standardized': {
      if (!(scale > 0 && Number.isFinite(scale))) {
        throw new ResidualError('standardized residual requires positive finite sigma');
      }
      return (observed - predicted) / scale;
    }
    case 'likelihood': {
      if (!(scale > 0)) throw new ResidualError('likelihood residual requires positive sigma');
      const z = (observed - predicted) / scale;
      return 0.5 * z * z + Math.log(scale * Math.sqrt(2 * Math.PI));
    }
    case 'vector':
    case 'tensor':
    case 'distributional':
    case 'operator':
    case 'custom':
      throw new ResidualError(
        `${kind} discrepancy is not implemented on the scalar path — abstain`,
      );
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

/**
 * RMSE of a discrepancy over paired samples: core `norm2` of the discrepancies
 * (the scaled, overflow-safe 2-norm) over √n. Empty or unequal-length samples
 * are refused, as before; a non-finite sample still throws from
 * {@link scalarDiscrepancy}. @internal
 */
export function rmse(
  observed: readonly number[],
  predicted: readonly number[],
  def: DiscrepancyDefinition,
  scale = 1,
): number {
  if (observed.length !== predicted.length || observed.length === 0) {
    throw new ResidualError('rmse: nonempty equal-length samples required');
  }
  const residuals = observed.map((o, i) => scalarDiscrepancy(o, predicted[i]!, def.kind, scale));
  return norm2(residuals) / Math.sqrt(residuals.length);
}
