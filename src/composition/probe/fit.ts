/**
 * Prefactor fit + holdout evaluation. Generation never sees holdout rows.
 *
 * @module composition/probe/fit
 */

import { norm2, pairwiseDot } from '@danielsimonjr/mathts-core';
import type { ExprNode } from '../../dimensional/ast-types.js';
import { evalExpr } from '../expr-eval.js';
import { DEFAULT_HOLDOUT_TOL, type ProbeDataset } from './types.js';
import { scalarDiscrepancy } from './residual.js';
import { canonicalJson } from './serialize.js';

export interface FitResult {
  readonly prefactor: number;
  readonly exploratoryRmse: number;
  readonly nExploratory: number;
  readonly holdoutRmse: number | null;
  readonly nHoldout: number;
  readonly holdoutSupported: boolean;
}

function predictions(expr: ExprNode, rows: ProbeDataset, prefactor: number): number[] {
  return rows.rows.map((row) => {
    const y = evalExpr(expr, row);
    return prefactor * y;
  });
}

function observed(rows: ProbeDataset): number[] {
  return rows.rows.map((row) => {
    const y = row[rows.observable];
    if (!Number.isFinite(y)) {
      throw new RangeError(`fit: row missing finite observable '${rows.observable}'`);
    }
    return y;
  });
}

/** Root-mean-square additive discrepancy: core `norm2` of the residuals (the scaled, overflow-safe 2-norm) over √n. */
function rmse(observedValues: readonly number[], predicted: readonly number[]): number {
  const residuals = observedValues.map((obs, i) => scalarDiscrepancy(obs, predicted[i]!, 'additive'));
  return norm2(residuals) / Math.sqrt(residuals.length);
}

function predictorKey(row: Readonly<Record<string, number>>, observable: string): string {
  const predictors: Record<string, number> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== observable) predictors[key] = value;
  }
  return canonicalJson(predictors);
}

/**
 * Least-squares prefactor c in y ≈ c · f(x) on exploratory data, then score
 * locked holdout. Holdout must not have been in the generation context.
 *
 * @internal
 */
export function fitPrefactor(
  expr: ExprNode,
  exploratory: ProbeDataset,
  holdout: ProbeDataset | undefined,
  holdoutTol = DEFAULT_HOLDOUT_TOL,
): FitResult {
  if (exploratory.role !== 'exploratory-fit') {
    throw new RangeError(`fit: exploratory role must be exploratory-fit (got '${exploratory.role}')`);
  }
  if (holdout) {
    if (holdout.role !== 'validation-holdout' && holdout.role !== 'external-replication') {
      throw new RangeError(`fit: holdout role must be validation-holdout or external-replication`);
    }
    const holdKeys = new Set(holdout.rows.map((r) => predictorKey(r, holdout.observable)));
    for (const row of exploratory.rows) {
      if (holdKeys.has(predictorKey(row, exploratory.observable))) {
        throw new RangeError('fit: holdout row leaked into exploratory set');
      }
    }
  }
  const y = observed(exploratory);
  const f = predictions(expr, exploratory, 1);
  // The least-squares prefactor over the rows where the form is finite: c = f·y / f·f
  // (core `pairwiseDot`, a pairwise sum).
  const finite = f.map((v, i) => [v, y[i]!] as const).filter(([v]) => Number.isFinite(v));
  const den = pairwiseDot(finite.map(([v]) => v), finite.map(([v]) => v));
  const prefactor = den > 0 ? pairwiseDot(finite.map(([v]) => v), finite.map(([, obs]) => obs)) / den : 1;
  const pred = predictions(expr, exploratory, prefactor);
  const exploratoryRmse = rmse(y, pred);

  if (!holdout || holdout.rows.length === 0) {
    return {
      prefactor,
      exploratoryRmse,
      nExploratory: y.length,
      holdoutRmse: null,
      nHoldout: 0,
      holdoutSupported: false,
    };
  }
  const yh = observed(holdout);
  const ph = predictions(expr, holdout, prefactor);
  const holdoutRmse = rmse(yh, ph);
  const scale =
    Math.max(...yh.map(Math.abs), ...ph.map(Math.abs), 1e-12);
  const holdoutSupported = holdoutRmse <= holdoutTol * scale;
  return {
    prefactor,
    exploratoryRmse,
    nExploratory: y.length,
    holdoutRmse,
    nHoldout: yh.length,
    holdoutSupported,
  };
}
