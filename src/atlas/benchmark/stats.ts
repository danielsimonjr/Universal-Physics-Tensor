/**
 * Atlas Phase 5, S5.4 — the benchmark's statistics and power report.
 *
 * Design note: `docs/planning/Atlas-Phase-5-Design.md` §8.
 *
 * Every function here is tested against a value computed independently, not
 * against its own output: the Wilson intervals against the plan's textbook
 * values, McNemar against a hand-computed 2×2 table, and κ against a hand-computed
 * confusion matrix. The paired-difference interval (Newcombe's method 10) has no
 * textbook value in the repository; it is tested by properties that pin it to
 * Wilson and to the unpaired square-and-add interval where those must agree.
 *
 * @module atlas/benchmark/stats
 * @internal
 */

import {
  binomialTest,
  cohensKappa as mathtsKappa,
  newcombePairedInterval,
  wilsonInterval as mathtsWilson,
} from '@danielsimonjr/mathts-functions';
import { numberFrom } from '../../core/mathts-read.js';

/** A closed interval. @internal */
export interface Interval {
  readonly lower: number;
  readonly upper: number;
}

/**
 * Calculates the Wilson score interval for a binomial proportion with MathTS `wilsonInterval`.
 *
 * @param confidence The confidence level in (0, 1). The default value is 0.95.
 * @throws Error when `n` is not a positive integer or `successes` is outside `[0, n]`.
 * @internal
 */
export function wilsonInterval(successes: number, n: number, confidence = 0.95): Interval {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`wilsonInterval: n must be a positive integer, got ${n}`);
  if (!Number.isInteger(successes) || successes < 0 || successes > n) {
    throw new Error(`wilsonInterval: successes must be an integer in [0, n], got ${successes}`);
  }
  return mathtsWilson(successes, n, confidence);
}

/** A paired 2×2 table: a = both right, b = only A right, c = only B right, d = both wrong. @internal */
export interface PairedTable {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** McNemar's test on the discordant cells. @internal */
export interface McNemarResult {
  /** Continuity-corrected χ² = max(0, |b − c| − 1)² / (b + c); 0 when b + c = 0. The correction never goes negative (Edwards 1948). */
  readonly chiSquared: number;
  /** Exact two-sided p-value from Binomial(b + c, ½); 1 when b + c = 0. */
  readonly exactP: number;
}

/**
 * McNemar's paired test. The EXACT binomial p-value is the one to report at
 * these sample sizes; the χ² is given because readers expect it.
 *
 * @internal
 */
export function mcnemar(table: PairedTable): McNemarResult {
  const n = table.b + table.c;
  // No discordant pair: the χ² below would be 0/0. An equal split needs no branch: the χ² is 0 and binomialTest gives p = 1.
  if (n === 0) return { chiSquared: 0, exactP: 1 };
  const chiSquared = Math.max(0, Math.abs(table.b - table.c) - 1) ** 2 / n;
  // MathTS `binomialTest` sums every outcome no more likely than the observed one; at p = ½ that is twice the smaller tail.
  const exactP = numberFrom('binomialTest', binomialTest(Math.min(table.b, table.c), n).pValue);
  return { chiSquared, exactP };
}

/**
 * Applies Newcombe's method 10 with MathTS `newcombePairedInterval`. The method gives
 * an interval for the PAIRED difference in proportions, p_A − p_B = (b − c)/n.
 * The method uses the two marginal Wilson intervals and a correlation correction φ.
 * The pre-registered criterion requires the interval for the atlas-minus-baseline
 * difference to exclude zero.
 *
 * Newcombe, Statistics in Medicine 17 (1998) 2635.
 *
 * @param confidence The confidence level in (0, 1). The default is 0.95.
 * @throws Error when the table has no observation.
 * @internal
 */
export function pairedDifferenceInterval(table: PairedTable, confidence = 0.95): Interval & { readonly diff: number } {
  if (table.a + table.b + table.c + table.d === 0) throw new Error('pairedDifferenceInterval: empty table');
  return newcombePairedInterval(table, confidence);
}

/**
 * Cohen's κ for two raters over the same items, from a square confusion matrix
 * (`matrix[i][j]` = items rater 1 put in category i and rater 2 in category j).
 *
 * @returns NaN when chance agreement is 1 (κ is undefined there), never 1.
 * @internal
 */
export function cohensKappa(matrix: readonly (readonly number[])[]): number {
  const k = matrix.length;
  if (k === 0 || matrix.some((row) => row.length !== k)) throw new Error('cohensKappa: matrix must be square and non-empty');
  if (matrix.every((row) => row.every((v) => v === 0))) throw new Error('cohensKappa: no ratings');
  // MathTS returns `NaN` for 0/0 when chance agreement is 1.
  return mathtsKappa(matrix);
}

/** What a frozen set of a given size can and cannot resolve. @internal */
export interface PowerReport {
  readonly nPerClass: number;
  /** The assumed per-class accuracy the interval is computed at. */
  readonly assumedAccuracy: number;
  readonly interval: Interval;
  /** Half the interval width: differences smaller than about twice this are not resolvable. */
  readonly halfWidth: number;
  readonly statement: string;
}

/**
 * The interval a frozen set of `nPerClass` items per class can afford at an
 * assumed accuracy. This is the "report the interval it can afford rather than
 * the claim it cannot" line of ROADMAP Phase 5.
 *
 * @internal
 */
export function powerReport(nPerClass: number, assumedAccuracy = 0.8): PowerReport {
  const successes = Math.round(assumedAccuracy * nPerClass);
  const interval = wilsonInterval(successes, nPerClass);
  const halfWidth = (interval.upper - interval.lower) / 2;
  const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
  return {
    nPerClass,
    assumedAccuracy,
    interval,
    halfWidth,
    statement:
      `With ${nPerClass} items per class at ${pct(assumedAccuracy)} accuracy, the 95% Wilson interval ` +
      `is [${pct(interval.lower)}, ${pct(interval.upper)}] (±${pct(halfWidth)}). Two methods whose ` +
      `accuracies differ by less than about ${pct(2 * halfWidth)} cannot be separated on this set ` +
      'by unpaired intervals; the paired McNemar design is what narrows it.',
  };
}
