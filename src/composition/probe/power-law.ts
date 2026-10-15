/**
 * Power-law discovery over the Buckingham π-groups (proposal 8 of
 * docs/planning/2026-10-15-map-maker-discoverer-proposals.md).
 *
 * When the governing variables leave k ≥ 1 dimensionless groups, dimensional
 * analysis fixes the target only as `base · F(π₁, …, πₖ)` for an unknown F.
 * This module fits the one family a monomial search can state, F = C Π πₖ^{aₖ}:
 * `log(y/base) = log C + Σ aₖ log πₖ` by MathTS `ols` on the exploratory rows,
 * reads the coefficients and their standard errors back, and rationalises each
 * aₖ that lies within 2·stderr of a fraction with denominator ≤ 6 (a bounded
 * scan, not `Fraction.fromNumber`, whose continued fraction can exceed its
 * cap). An exponent that is not such a fraction is a NEGATIVE RESULT stated in
 * the abstention, not a candidate with a decimal exponent.
 *
 * The fit reads `problem.exploratory` only: the holdout rows are never seen
 * here, exactly as `fit.ts` never fits them.
 *
 * @internal
 */

import { matrixRank, ols } from '@danielsimonjr/mathts-functions';
import { buckinghamPi, dimensionallyDetermines, type PiGroup } from '../../dimensional/buckingham.js';
import type { DimensionalVariableRef, ObservationRow, SearchProblem } from './types.js';

/** One fitted π-group exponent: the estimate, its standard error, the 2σ interval and the fraction chosen in it. @internal */
export interface PowerLawExponent {
  /** The π-group's display form, e.g. `a · b^-1`. */
  readonly group: string;
  /** The π-group's integer exponent per variable. */
  readonly exponents: Readonly<Record<string, number>>;
  readonly estimate: number;
  readonly stderr: number;
  /** estimate ± 2·stderr. */
  readonly interval: readonly [number, number];
  /** The fraction with the smallest denominator ≤ 6 inside the interval; null when there is none. */
  readonly rational: { readonly numerator: number; readonly denominator: number } | null;
}

/** A recovered rational power law: `monomial` is base + Σ (pₖ/qₖ)·πₖ per variable. @internal */
export interface PowerLawFit {
  readonly kind: 'fit';
  /** The base monomial of the target over a maximal dimensionally independent subset of the governing set. */
  readonly base: Readonly<Record<string, number>>;
  readonly exponents: readonly PowerLawExponent[];
  /** log C of the fit (the prefactor is refit on the linear scale by the pipeline, like any candidate's). */
  readonly logPrefactor: number;
  readonly r2: number;
  /** Rows the fit used: a positive finite observation, base and every π. */
  readonly nRows: number;
  readonly skippedRows: number;
  /** The combined exponent per governing variable, rational values as numbers. */
  readonly monomial: Readonly<Record<string, number>>;
}

/** The outcome of {@link powerLawDetermination}. @internal */
export type PowerLawDetermination =
  | PowerLawFit
  | { readonly kind: 'not-applicable'; readonly reason: string }
  | { readonly kind: 'abstained'; readonly reason: string; readonly nRows: number; readonly skippedRows: number };

/** The largest denominator the exponent scan admits. @internal */
export const MAX_EXPONENT_DENOMINATOR = 6;

/** A reduced fraction. @internal */
export interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

/**
 * Every distinct reduced fraction p/q with q ≤ `maxDen` within `tol` of `x`,
 * in order of denominator (so 1/2 comes before 2/3). Empty when none is near;
 * more than one when the tolerance is too wide to tell them apart. @internal
 */
export function rationalCandidates(x: number, tol: number, maxDen = MAX_EXPONENT_DENOMINATOR): Rational[] {
  if (!Number.isFinite(x) || !(tol >= 0)) return [];
  const out: Rational[] = [];
  for (let d = 1; d <= maxDen; d++) {
    const lo = Math.ceil((x - tol) * d);
    const hi = Math.floor((x + tol) * d);
    for (let n = lo; n <= hi; n++) {
      const g = gcd(Math.abs(n), d);
      const r = { numerator: n / g, denominator: d / g };
      if (!out.some((o) => o.numerator === r.numerator && o.denominator === r.denominator)) out.push(r);
    }
  }
  return out;
}

/**
 * The one fraction p/q with q ≤ `maxDen` within `tol` of `x`, or null when
 * there is none or more than one (an estimate whose interval holds two
 * admissible fractions does not determine either). @internal
 */
export function rationalizeExponent(x: number, tol: number, maxDen = MAX_EXPONENT_DENOMINATOR): Rational | null {
  const all = rationalCandidates(x, tol, maxDen);
  return all.length === 1 ? all[0]! : null;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a === 0 ? 1 : a;
}

/** The π-groups of the governing set and the target's base monomial over a maximal dimensionally independent subset. @internal */
export interface PiStructure {
  readonly groups: readonly PiGroup[];
  /** Null when the target's dimension is not in the span of the governing variables. */
  readonly base: Readonly<Record<string, number>> | null;
}

/**
 * The π-groups among the governing variables (MathTS `rationalNullspace`
 * through {@link buckinghamPi}) and the base monomial: the unique monomial of
 * the target over the first maximal dimensionally independent subset of the
 * governing set, in declared order. @internal
 */
export function piStructure(target: DimensionalVariableRef, governing: readonly DimensionalVariableRef[]): PiStructure {
  if (governing.length === 0) return { groups: [], base: null };
  const groups = buckinghamPi(governing).piGroups;
  const independent: DimensionalVariableRef[] = [];
  for (const g of governing) {
    if (buckinghamPi([...independent, g]).piGroupCount === 0) independent.push(g);
  }
  const det = dimensionallyDetermines(target, independent);
  const base: Record<string, number> = {};
  if (det.determined && det.monomial) {
    for (const g of governing) base[g.name] = det.monomial[g.name] ?? 0;
    return { groups, base };
  }
  return { groups, base: null };
}

/** `Π row[name]^exp` over the non-zero exponents; NaN when a name is missing. */
function monomialValue(exponents: Readonly<Record<string, number>>, row: ObservationRow): number {
  let v = 1;
  for (const [name, e] of Object.entries(exponents)) {
    if (e === 0) continue;
    const x = row[name];
    if (x === undefined) return NaN;
    v *= x ** e;
  }
  return v;
}

/** The log-design of a set of rows: `[1, log π₁, …, log πₖ]` per usable row. @internal */
export interface LogDesign {
  readonly rows: readonly (readonly number[])[];
  /** Rows where every π-group is positive and finite. */
  readonly used: number;
  readonly skipped: number;
}

/** The log-design matrix over the rows where every π-group is positive and finite. @internal */
export function logDesign(groups: readonly PiGroup[], rows: readonly ObservationRow[]): LogDesign {
  const out: number[][] = [];
  let skipped = 0;
  for (const row of rows) {
    const pis = groups.map((g) => monomialValue(g.exponents, row));
    if (!pis.every((p) => Number.isFinite(p) && p > 0)) {
      skipped += 1;
      continue;
    }
    out.push([1, ...pis.map((p) => Math.log(p))]);
  }
  return { rows: out, used: out.length, skipped };
}

/** Each column divided by its largest magnitude (a zero column stays zero): order one, as `ols` and `matrixRank` need. */
function scaleColumns(rows: readonly (readonly number[])[]): { scaled: number[][]; scales: number[] } {
  const k = rows[0]?.length ?? 0;
  const scales = Array.from({ length: k }, (_, j) => rows.reduce((m, r) => Math.max(m, Math.abs(r[j]!)), 0));
  const scaled = rows.map((r) => r.map((v, j) => (scales[j]! > 0 ? v / scales[j]! : 0)));
  return { scaled, scales };
}

/**
 * The rank of a log-design (MathTS `matrixRank`, whose tolerance is an absolute
 * 1e-10, so the columns are scaled to order one first). 0 for no rows. @internal
 */
export function logDesignRank(design: LogDesign): number {
  if (design.rows.length === 0) return 0;
  const { scaled } = scaleColumns(design.rows);
  const r: unknown = matrixRank(scaled);
  if (typeof r !== 'number' || !Number.isInteger(r)) throw new TypeError('matrixRank did not return an integer');
  return r;
}

/** A finite number read back from a MathTS result array, or null. */
function numberAt(arr: unknown, i: number): number | null {
  if (!Array.isArray(arr)) return null;
  const v: unknown = arr[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Fit `log(y/base) = log C + Σ aₖ log πₖ` on the exploratory rows and
 * rationalise the exponents (module docs). Not applicable when the governing
 * set already fixes the target (the unique-monomial path searches that), when
 * it leaves no π-group, or when the target is outside its span. Abstains, with
 * the reason, without exploratory rows, below k + 2 usable rows, when a
 * π-group does not vary, when the log-design is collinear, or when an exponent
 * is not within 2σ of a fraction with denominator ≤ 6. @internal
 */
export function powerLawDetermination(problem: SearchProblem): PowerLawDetermination {
  const full = dimensionallyDetermines(problem.target, problem.governing);
  if (full.determined) {
    return { kind: 'not-applicable', reason: 'the governing set fixes the target up to a constant; the unique-monomial path searches it' };
  }
  const { groups, base } = piStructure(problem.target, problem.governing);
  if (groups.length === 0) {
    return { kind: 'not-applicable', reason: 'the governing set leaves no dimensionless group to raise to a power' };
  }
  if (base === null) {
    return { kind: 'not-applicable', reason: "the target's dimension is not in the span of the governing variables" };
  }
  const rows = problem.exploratory?.rows ?? [];
  if (rows.length === 0) {
    return { kind: 'abstained', reason: 'no exploratory rows: the power-law fit needs data', nRows: 0, skippedRows: 0 };
  }
  const k = groups.length;
  const X: number[][] = [];
  const ylog: number[] = [];
  let skipped = 0;
  for (const row of rows) {
    const y = row[problem.target.name];
    const b = monomialValue(base, row);
    const pis = groups.map((g) => monomialValue(g.exponents, row));
    if (!(y !== undefined && Number.isFinite(y) && y > 0 && Number.isFinite(b) && b > 0) || !pis.every((p) => Number.isFinite(p) && p > 0)) {
      skipped += 1;
      continue;
    }
    X.push(pis.map((p) => Math.log(p)));
    ylog.push(Math.log(y / b));
  }
  const used = X.length;
  const abstain = (reason: string): PowerLawDetermination => ({ kind: 'abstained', reason, nRows: used, skippedRows: skipped });
  if (used < k + 2) {
    return abstain(`only ${used} usable row(s) (positive observation, base and π-groups) for ${k} exponent(s) and a prefactor; the fit needs at least ${k + 2}`);
  }
  // A π-group whose log spreads by no more than round-off (1e-12 of its magnitude, or absolute)
  // does not vary: a/b with b = a is 1 up to an ulp, and that ulp is not an exponent's evidence.
  for (let j = 0; j < k; j++) {
    // Reductions, not spreads: a spread of a large row set overflows the call stack.
    const lo = X.reduce((m, r) => Math.min(m, r[j]!), Number.POSITIVE_INFINITY);
    const hi = X.reduce((m, r) => Math.max(m, r[j]!), Number.NEGATIVE_INFINITY);
    if (hi - lo <= 1e-12 * Math.max(1, Math.abs(hi), Math.abs(lo))) {
      return abstain(`π-group ${groups[j]!.formula} does not vary over the usable rows, so its exponent is not identifiable`);
    }
  }
  // Columns scaled to order one: `ols` tests singularity with an absolute 1e-15, so a column of
  // log π of magnitude 1e-9 would read as collinear unscaled. Coefficients and errors are unscaled after.
  const { scaled, scales } = scaleColumns(X);
  let fit;
  try {
    fit = ols(scaled, ylog, { intercept: true });
  } catch (e) {
    return abstain(`the log-design is collinear over the rows (${(e as Error).message}); the exponents are not identifiable`);
  }
  const logPrefactor = numberAt(fit.coefficients, 0);
  const r2 = typeof fit.r2 === 'number' && Number.isFinite(fit.r2) ? fit.r2 : null;
  if (logPrefactor === null || r2 === null) return abstain('ols did not return a finite intercept and R²');
  const exponents: PowerLawExponent[] = [];
  for (let j = 0; j < k; j++) {
    const c = numberAt(fit.coefficients, j + 1);
    const se = numberAt(fit.stderr, j + 1);
    if (c === null || se === null) return abstain(`ols did not return a finite coefficient and standard error for π-group ${groups[j]!.formula}`);
    const estimate = c / scales[j]!;
    const stderr = se / scales[j]!;
    // Noise-free rows give stderr 0; a representation tolerance keeps 0.5000000000000001 at 1/2.
    const tol = Math.max(2 * stderr, 1e-9 * Math.max(1, Math.abs(estimate)));
    const near = rationalCandidates(estimate, tol);
    const rational = near.length === 1 ? near[0]! : null;
    const group = groups[j]!;
    exponents.push({ group: group.formula, exponents: group.exponents, estimate, stderr, interval: [estimate - 2 * stderr, estimate + 2 * stderr], rational });
    const value = `${estimate.toPrecision(4)} ± ${stderr.toPrecision(2)}`;
    if (near.length === 0) {
      return abstain(`the exponent of ${group.formula} is ${value}, not within 2σ of a fraction with denominator ≤ ${MAX_EXPONENT_DENOMINATOR}`);
    }
    if (near.length > 1) {
      const list = near.slice(0, 4).map((r) => (r.denominator === 1 ? `${r.numerator}` : `${r.numerator}/${r.denominator}`)).join(', ');
      return abstain(
        `the exponent of ${group.formula} is ${value}: its 2σ interval holds ${near.length} fractions with denominator ≤ ${MAX_EXPONENT_DENOMINATOR} (${list}${near.length > 4 ? ', …' : ''}), so the rows do not determine it`,
      );
    }
  }
  const monomial: Record<string, number> = { ...base };
  for (const e of exponents) {
    const a = e.rational!.numerator / e.rational!.denominator;
    for (const [name, p] of Object.entries(e.exponents)) monomial[name] = (monomial[name] ?? 0) + a * p;
  }
  return { kind: 'fit', base, exponents, logPrefactor, r2, nRows: used, skippedRows: skipped, monomial };
}

/** One line for a run's wording: what the power-law fit found or why it abstained. @internal */
export function powerLawWording(pl: PowerLawDetermination): string | null {
  if (pl.kind === 'not-applicable') return null;
  if (pl.kind === 'abstained') return `no power law from the exploratory rows: ${pl.reason}`;
  const terms = pl.exponents
    .map((e) => {
      const { numerator: p, denominator: q } = e.rational!;
      const frac = q === 1 ? `${p}` : `${p}/${q}`;
      return `(${e.group})^(${frac}) [a = ${e.estimate.toPrecision(3)} ± ${e.stderr.toPrecision(2)}]`;
    })
    .join(' · ');
  return `power law from the exploratory rows: base · ${terms}; R² = ${pl.r2.toPrecision(4)} on ${pl.nRows} row(s)${pl.skippedRows > 0 ? ` (${pl.skippedRows} skipped: non-positive)` : ''}; each exponent is the fraction with denominator ≤ ${MAX_EXPONENT_DENOMINATOR} within 2σ of the fit`;
}
