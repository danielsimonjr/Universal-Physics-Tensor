/**
 * Declared-limit checks for probe candidates.
 *
 * A failed limit is **not automatically fatal**. It is fatal only when the
 * candidate claims the domain in which the limit fails. A limit whose rows
 * the candidate mostly could not be evaluated on is **undecided**, which is
 * neither a pass nor a failure and is never fatal.
 *
 * @internal
 */

import { norm2 } from '@danielsimonjr/mathts-core';
import type { ExprNode } from '../../dimensional/ast-types.js';
import type { DeclaredLimit, ProbeDataset } from './types.js';
import { evalExpr } from '../expr-eval.js';

/** What a limit check found: the limit held, failed, or could not be decided on these rows. @internal */
export type LimitOutcome = 'held' | 'failed' | 'undecided';

export interface LimitCheckResult {
  readonly id: string;
  /** `outcome === 'held'`. */
  readonly passed: boolean;
  readonly outcome: LimitOutcome;
  /** Rows the candidate was evaluated on (finite prediction and a finite observation). */
  readonly evaluated: number;
  /** Rows the candidate threw on, or predicted a non-finite value for, or that have no finite observation. */
  readonly skipped: number;
  readonly claimedDomain: boolean;
  readonly fatal: boolean;
  readonly detail: string;
}

/**
 * Evaluate `prefactor · expr` RMSE on `dataset`. When the candidate does not
 * claim `limit.regime`, a failure is recorded but not fatal.
 *
 * A row the candidate throws on, or predicts a non-finite value for, is
 * skipped and COUNTED. When more rows were skipped than evaluated (or none
 * could be evaluated), the outcome is `undecided`: a candidate that throws on
 * nine rows of ten is not judged on the tenth. That threshold, skipped >
 * evaluated, is a choice stated here, not a measured one.
 *
 * The pass rule is LOOSE by design: the limit holds when the RMSE over the
 * evaluated rows is at most half the largest |observation| of the dataset. It
 * catches a candidate that is wrong by its own scale in a regime, not one that
 * is wrong by a few percent; the holdout tolerance is the quantitative test.
 * The RMSE is core `norm2` of the residuals over √n (overflow-safe), so a
 * residual of 1e200 is a number, not `Infinity`.
 *
 * @internal
 */
export function checkDeclaredLimit(
  expr: ExprNode,
  dataset: ProbeDataset,
  prefactor: number,
  limit: DeclaredLimit,
  claimsDomain: boolean,
): LimitCheckResult {
  if (dataset.rows.length === 0) {
    return {
      id: limit.id,
      passed: true,
      outcome: 'held',
      evaluated: 0,
      skipped: 0,
      claimedDomain: claimsDomain,
      fatal: false,
      detail: `no observations for declared-limit ${limit.id}`,
    };
  }
  const residuals: number[] = [];
  let skipped = 0;
  for (const row of dataset.rows) {
    let predicted: number;
    try {
      predicted = prefactor * evalExpr(expr, row);
    } catch {
      skipped += 1;
      continue;
    }
    const observed = row[dataset.observable];
    if (!Number.isFinite(predicted) || observed === undefined || !Number.isFinite(observed)) {
      skipped += 1;
      continue;
    }
    residuals.push(predicted - observed);
  }
  const evaluated = residuals.length;
  const total = dataset.rows.length;
  if (evaluated === 0 || skipped > evaluated) {
    return {
      id: limit.id,
      passed: false,
      outcome: 'undecided',
      evaluated,
      skipped,
      claimedDomain: claimsDomain,
      fatal: false,
      detail: `limit ${limit.id} undecided: ${skipped} of ${total} rows could not be evaluated (${evaluated} could); not judged on so few`,
    };
  }
  const rmse = norm2(residuals) / Math.sqrt(evaluated);
  // A reduce, not `Math.max(...rows)`: a spread of a large dataset overflows the call stack.
  const scale = dataset.rows.reduce((m, r) => {
    const v = r[dataset.observable];
    return v !== undefined && Number.isFinite(v) ? Math.max(m, Math.abs(v)) : m;
  }, 1e-12);
  const passed = Number.isFinite(rmse) && rmse <= 0.5 * scale;
  const fatal = !passed && claimsDomain;
  const rows = skipped > 0 ? ` on ${evaluated} of ${total} rows (${skipped} skipped)` : '';
  return {
    id: limit.id,
    passed,
    outcome: passed ? 'held' : 'failed',
    evaluated,
    skipped,
    claimedDomain: claimsDomain,
    fatal,
    detail: passed
      ? `limit ${limit.id} held (rmse=${rmse})${rows}`
      : `limit ${limit.id} failed (rmse=${rmse})${rows}${fatal ? ' — fatal because candidate claims this domain' : ' — not fatal (domain not claimed)'}`,
  };
}

/** Run every declared limit. @internal */
export function checkDeclaredLimits(
  expr: ExprNode,
  dataset: ProbeDataset | undefined,
  prefactor: number,
  limits: readonly DeclaredLimit[],
  claimedRegimes: Readonly<Record<string, string>> = {},
): readonly LimitCheckResult[] {
  const rows = dataset ?? {
    id: 'empty',
    role: 'falsification-only' as const,
    rows: [],
    observable: '',
    schemaVersion: '0',
  };
  return limits.map((limit) => {
    const claimsDomain = Object.entries(limit.regime).every(
      ([k, v]) => claimedRegimes[k] === v,
    );
    return checkDeclaredLimit(expr, rows, prefactor, limit, claimsDomain);
  });
}
