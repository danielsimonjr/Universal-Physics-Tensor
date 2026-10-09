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

/** The two-sided 95% normal quantile. @internal */
export const Z95 = 1.959963984540054;

/** A closed interval. @internal */
export interface Interval {
  readonly lower: number;
  readonly upper: number;
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * @throws Error when `n` is not a positive integer or `successes` is outside `[0, n]`.
 * @internal
 */
export function wilsonInterval(successes: number, n: number, z = Z95): Interval {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`wilsonInterval: n must be a positive integer, got ${n}`);
  if (!Number.isInteger(successes) || successes < 0 || successes > n) {
    throw new Error(`wilsonInterval: successes must be an integer in [0, n], got ${successes}`);
  }
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  // At x = 0 the lower bound, and at x = n the upper bound, are EXACTLY 0 and 1
  // analytically; the formula reaches them only to within float rounding.
  return {
    lower: successes === 0 ? 0 : Math.max(0, centre - half),
    upper: successes === n ? 1 : Math.min(1, centre + half),
  };
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

/** `ln C(n, k)`, summed; exact enough for the n here. */
function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

/**
 * McNemar's paired test. The EXACT binomial p-value is the one to report at
 * these sample sizes; the χ² is given because readers expect it.
 *
 * @internal
 */
export function mcnemar(table: PairedTable): McNemarResult {
  const n = table.b + table.c;
  if (n === 0) return { chiSquared: 0, exactP: 1 };
  const chiSquared = Math.max(0, Math.abs(table.b - table.c) - 1) ** 2 / n;
  const k = Math.min(table.b, table.c);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return { chiSquared, exactP: Math.min(1, 2 * tail) };
}

/**
 * Newcombe's method 10: a 95% interval for the PAIRED difference in proportions
 * p_A − p_B = (b − c)/n, built from the two marginal Wilson intervals and a
 * correlation correction φ. Pre-registered criterion: the interval for the
 * atlas-minus-baseline difference must exclude zero.
 *
 * Newcombe, Statistics in Medicine 17 (1998) 2635.
 *
 * @internal
 */
export function pairedDifferenceInterval(table: PairedTable, z = Z95): Interval & { readonly diff: number } {
  const { a, b, c, d } = table;
  const n = a + b + c + d;
  if (n === 0) throw new Error('pairedDifferenceInterval: empty table');
  const p1 = (a + b) / n;
  const p2 = (a + c) / n;
  const w1 = wilsonInterval(a + b, n, z);
  const w2 = wilsonInterval(a + c, n, z);
  const denom = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  let phi = 0;
  if (denom > 0) {
    const cross = a * d - b * c;
    // Newcombe's continuity adjustment of φ, applied only when ad > bc.
    phi = (cross > 0 ? Math.max(cross - n / 2, 0) : cross) / denom;
  }
  const diff = p1 - p2;
  const dl1 = p1 - w1.lower;
  const du1 = w1.upper - p1;
  const dl2 = p2 - w2.lower;
  const du2 = w2.upper - p2;
  const lower = diff - Math.sqrt(Math.max(0, dl1 * dl1 - 2 * phi * dl1 * du2 + du2 * du2));
  const upper = diff + Math.sqrt(Math.max(0, du1 * du1 - 2 * phi * du1 * dl2 + dl2 * dl2));
  return { diff, lower: Math.max(-1, lower), upper: Math.min(1, upper) };
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
  let n = 0;
  let agree = 0;
  const rows = new Array<number>(k).fill(0);
  const cols = new Array<number>(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const v = matrix[i]![j]!;
      n += v;
      rows[i]! += v;
      cols[j]! += v;
      if (i === j) agree += v;
    }
  }
  if (n === 0) throw new Error('cohensKappa: no ratings');
  const po = agree / n;
  let pe = 0;
  for (let i = 0; i < k; i++) pe += (rows[i]! / n) * (cols[i]! / n);
  if (pe === 1) return Number.NaN;
  return (po - pe) / (1 - pe);
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
