/**
 * Prefactor fit + holdout evaluation. Generation never sees holdout rows.
 *
 * @module composition/probe/fit
 */

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
  let num = 0;
  let den = 0;
  for (let i = 0; i < y.length; i++) {
    if (!Number.isFinite(f[i])) continue;
    num += f[i] * y[i];
    den += f[i] * f[i];
  }
  const prefactor = den > 0 ? num / den : 1;
  const pred = predictions(expr, exploratory, prefactor);
  let acc = 0;
  for (let i = 0; i < y.length; i++) {
    const r = scalarDiscrepancy(y[i], pred[i], 'additive');
    acc += r * r;
  }
  const exploratoryRmse = Math.sqrt(acc / y.length);

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
  let hacc = 0;
  for (let i = 0; i < yh.length; i++) {
    const r = scalarDiscrepancy(yh[i], ph[i], 'additive');
    hacc += r * r;
  }
  const holdoutRmse = Math.sqrt(hacc / yh.length);
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
