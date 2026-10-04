/**
 * Buckingham-π enumerator (build target 1 of
 * docs/planning/Bridge-Inference-Epistemics-Note.md — the principled
 * primitive for the classifier's EXACTLY-DETERMINED case).
 *
 * Given a set of dimensional variables presumed to obey one
 * dimensionally-homogeneous relation, the Buckingham-π theorem says that
 * relation re-expresses as F(π₁,…,π_{n−r}) = 0, where each πᵢ is a
 * dimensionless power-product of the variables and there are exactly
 * n − r of them (n = variables, r = rank of the dimension matrix). The
 * π-groups are a basis of the NULL SPACE of the dimension matrix.
 *
 * THE HONEST BOUNDARY (enforced by the result types — there is no value
 * or constant field anywhere): this returns the FORM only. It yields the
 * π-groups and, for a target, the monomial that determines it UP TO A
 * DIMENSIONLESS CONSTANT (the 2π, the ½, α). It does NOT and cannot
 * supply that constant, nor the function F. That boundary is exactly what
 * separates dimensional analysis from numerology — see the epistemics
 * note.
 *
 * Computation is EXACT (rational arithmetic), not floating Gaussian
 * elimination: physics dimension exponents are small rationals, and the
 * null-space basis must be exact to be trustworthy.
 *
 * @module dimensional/buckingham
 */

import { Fraction } from '@danielsimonjr/mathts-core';
import { rationalNullspace } from '@danielsimonjr/mathts-functions';
import type { Dimension } from './types.js';

const BASES = ['L', 'M', 'T', 'I', 'Theta', 'N', 'J'] as const;

/** A named physical quantity with a dimension — the enumerator's input.
 *  Structurally satisfied by a composition `Quantity`. @public */
export interface DimensionalVariable {
  readonly name: string;
  readonly dim: Dimension;
}

/** A dimensionless power-product of the input variables (integer
 *  exponents; the conventional form). No value — π-groups carry FORM,
 *  not magnitude. @public */
export interface PiGroup {
  /** Integer exponent of each variable in this dimensionless product. */
  readonly exponents: Readonly<Record<string, number>>;
  /** Display form, e.g. `period^2 · gravity · length^-1`. */
  readonly formula: string;
}

/** The dimensional closure of a variable set. @public */
export type BuckinghamVerdict =
  | 'dimensionally-independent' // 0 π-groups: no dimensionless product exists
  | 'single-invariant' // 1 π-group: one dimensionless invariant
  | 'multiple-invariants'; // ≥2 π-groups: a family F(π₁,…)

/** Result of {@link buckinghamPi}. @public */
export interface BuckinghamResult {
  readonly variables: readonly string[];
  /** Base SI dimensions actually spanned by the inputs. */
  readonly baseDimensions: readonly string[];
  /** n — the number of variables. */
  readonly variableCount: number;
  /** r — the rank of the dimension matrix. */
  readonly rank: number;
  /** n − r — the number of independent dimensionless groups. */
  readonly piGroupCount: number;
  readonly piGroups: readonly PiGroup[];
  readonly verdict: BuckinghamVerdict;
}

/** Result of {@link dimensionallyDetermines}. @public */
export interface DimensionalDeterminationResult {
  readonly target: string;
  readonly governing: readonly string[];
  /** True iff the target is fixed by the governing variables UP TO A
   *  DIMENSIONLESS CONSTANT (unique monomial). */
  readonly determined: boolean;
  /**
   * When determined: target = const · Π(governingⱼ ^ monomial[j]). The
   * exponents may be rational (e.g. 0.5 for a √ law). Always read with
   * `upToDimensionlessConstant` — the leading constant is NOT supplied.
   */
  readonly monomial?: Readonly<Record<string, number>>;
  /** Always true when `monomial` is present — a standing reminder. */
  readonly upToDimensionlessConstant?: true;
  /**
   * True only when the target's dimension is not in the span of the governing
   * variables, so a monomial needs dimensionful constants the inputs do not
   * name. False when the governing variables are dimensionally dependent or
   * leave more than one π-group: that failure is not a missing constant.
   */
  readonly outsideGoverningSpan: boolean;
  /** Plain-language reason for the verdict. */
  readonly reason: string;
}

/** Rationalization failed: a dimension exponent is not a small rational.
 *  @public */
export class RationalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RationalizationError';
  }
}

// ---------------------------------------------------------------------------
// Exact rational arithmetic (number-backed; dimension exponents are small
// rationals, so reduced fractions never overflow in practice).
// ---------------------------------------------------------------------------

interface Frac {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function frac(n: number, d: number): Frac {
  if (d === 0) throw new RationalizationError('zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

const MAX_DEN = 720;

/** Convert a (possibly rational) exponent to an exact fraction by scanning
 *  small denominators; throws if none matches within tolerance. */
function toFrac(x: number): Frac {
  if (Number.isInteger(x)) return { n: x, d: 1 };
  for (let d = 2; d <= MAX_DEN; d++) {
    const n = x * d;
    if (Math.abs(n - Math.round(n)) < 1e-9 * Math.max(1, Math.abs(n))) {
      return frac(Math.round(n), d);
    }
  }
  throw new RationalizationError(
    `dimension exponent ${x} is not a rational with denominator ≤ ${MAX_DEN}`,
  );
}

const fZero = (a: Frac): boolean => a.n === 0;

/**
 * Exact null space of the dimension matrix. Exponents pass through as
 * {@link Fraction} values after {@link toFrac}, so an irrational is still
 * {@link RationalizationError} and is not accepted by a continued fraction.
 * A matrix with no rows is `0×n`: `{ columns: n }` is the standard basis.
 * MathTS integerizes each vector (content 1, first nonzero entry positive).
 */
function nullSpace(matrix: Frac[][], cols: number): { basis: number[][]; rank: number } {
  const entries = matrix.map((row) => row.map((f) => new Fraction(f.n, f.d)));
  const solved = rationalNullspace(entries, { columns: cols });
  const basis = solved.basis.map((vec) =>
    vec.map((entry) => {
      if (entry.denominator !== 1n) {
        throw new RationalizationError(
          `null-space entry ${entry.toString()} is not an integer`,
        );
      }
      return Number(entry.numerator);
    }),
  );
  return { basis, rank: solved.rank };
}

function buildMatrix(variables: readonly DimensionalVariable[]): {
  matrix: Frac[][];
  spannedBases: string[];
} {
  const spannedBases: string[] = [];
  const matrix: Frac[][] = [];
  for (const base of BASES) {
    const row = variables.map((v) => toFrac(v.dim[base]));
    if (row.some((f) => !fZero(f))) {
      spannedBases.push(base);
      matrix.push(row);
    }
  }
  return { matrix, spannedBases };
}

function formatPiGroup(
  exponents: Record<string, number>,
  order: readonly string[],
): string {
  const parts: string[] = [];
  for (const name of order) {
    const e = exponents[name];
    if (e === 0) continue;
    parts.push(e === 1 ? name : `${name}^${e}`);
  }
  return parts.join(' · ') || '1';
}

/**
 * Enumerate the Buckingham-π groups of a dimensional variable set. Returns
 * the rank, the count n − r, and a null-space basis of dimensionless
 * groups. FORM only — no constants (see module docs).
 *
 * @public
 */
export function buckinghamPi(
  variables: readonly DimensionalVariable[],
): BuckinghamResult {
  if (variables.length === 0) {
    throw new RationalizationError('buckinghamPi requires at least one variable');
  }
  const names = variables.map((v) => v.name);
  if (new Set(names).size !== names.length) {
    throw new RationalizationError(
      `buckinghamPi requires unique variable names; got [${names.join(', ')}]`,
    );
  }

  const n = variables.length;
  const { matrix, spannedBases } = buildMatrix(variables);

  const { basis, rank } = nullSpace(matrix, n);
  const piGroups: PiGroup[] = basis.map((vec) => {
    const exponents: Record<string, number> = {};
    for (let j = 0; j < n; j++) exponents[names[j]] = vec[j];
    return { exponents, formula: formatPiGroup(exponents, names) };
  });

  const piGroupCount = n - rank;
  const verdict: BuckinghamVerdict =
    piGroupCount === 0
      ? 'dimensionally-independent'
      : piGroupCount === 1
        ? 'single-invariant'
        : 'multiple-invariants';

  return {
    variables: names,
    baseDimensions: spannedBases,
    variableCount: n,
    rank,
    piGroupCount,
    piGroups,
    verdict,
  };
}

/**
 * Does the governing set fix the target UP TO A DIMENSIONLESS CONSTANT?
 *
 * True iff the governing variables are dimensionally independent and the
 * target's dimension lies in their span — equivalently, the full set has
 * exactly one π-group and the governing set has none. When determined,
 * returns the (possibly rational) monomial exponents such that
 * target = const · Π(governingⱼ ^ monomial[j]). The constant is NOT
 * supplied — dimensional analysis cannot.
 *
 * @public
 */
export function dimensionallyDetermines(
  target: DimensionalVariable,
  governing: readonly DimensionalVariable[],
): DimensionalDeterminationResult {
  const governingNames = governing.map((v) => v.name);

  const governingPi = buckinghamPi(
    governing.length > 0 ? governing : [target],
  );
  // A redundancy among the governing variables means the monomial is not
  // unique (any dimensionless governing combo can be folded into the
  // constant) → not determined.
  if (governing.length > 0 && governingPi.piGroupCount > 0) {
    return {
      target: target.name,
      governing: governingNames,
      determined: false,
      outsideGoverningSpan: false,
      reason:
        'governing variables are dimensionally dependent ' +
        `(${governingPi.piGroupCount} dimensionless combination(s) among them); ` +
        'the determining monomial is not unique',
    };
  }

  const full = buckinghamPi([target, ...governing]);
  if (full.piGroupCount !== 1) {
    return {
      target: target.name,
      governing: governingNames,
      determined: false,
      outsideGoverningSpan: full.piGroupCount === 0,
      reason:
        full.piGroupCount === 0
          ? "the target's dimension is not in the span of the governing " +
            'variables — no dimensionless group exists, so no monomial determines it'
          : `${full.piGroupCount} independent π-groups — the target is fixed ` +
            'only as a function of several dimensionless ratios (under-constrained)',
    };
  }

  // The single π-group involves the target; solve it for the target.
  const group = full.piGroups[0].exponents;
  const targetExp = group[target.name];
  if (!targetExp) {
    return {
      target: target.name,
      governing: governingNames,
      determined: false,
      outsideGoverningSpan: false,
      reason:
        'the sole dimensionless group does not involve the target ' +
        '(the target is dimensionally redundant with the governing set)',
    };
  }
  const monomial: Record<string, number> = {};
  for (const name of governingNames) {
    monomial[name] = -(group[name] ?? 0) / targetExp;
  }

  return {
    target: target.name,
    governing: governingNames,
    determined: true,
    monomial,
    upToDimensionlessConstant: true,
    outsideGoverningSpan: false,
    reason:
      'unique dimensionless group fixes the target up to a dimensionless constant',
  };
}
