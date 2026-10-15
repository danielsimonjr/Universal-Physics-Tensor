/**
 * Native bounded grammar enumerator — dimensional monomials via Buckingham-π.
 * Deterministic visit order; seed-independent.
 *
 * @module composition/probe/generator
 */

import type { ExprNode } from '../../dimensional/ast-types.js';
import { DIMENSIONLESS } from '../../dimensional/types.js';
import { sym } from '../../dimensional/ast-builders.js';
import { dimensionallyDetermines, type DimensionalDeterminationResult } from '../../dimensional/buckingham.js';
import { validate } from '../../dimensional/validator.js';
import type { DimensionalVariableRef, SearchBudget, SearchProblem } from './types.js';
import { canEmitCandidate, type BudgetState } from './search-budget.js';
import { powerLawDetermination, type PowerLawFit } from './power-law.js';

/** The power-law fit over the π-groups, re-exported beside the generator that emits it. */
export { powerLawDetermination, powerLawWording, rationalizeExponent } from './power-law.js';
export type { PowerLawDetermination, PowerLawExponent, PowerLawFit } from './power-law.js';

export interface RawCandidate {
  readonly expression: ExprNode;
  readonly monomial: Readonly<Record<string, number>> | null;
  readonly originNote: string;
  /** Set on a candidate the power-law fit produced: its exponents, their errors and R². */
  readonly powerLaw?: PowerLawFit;
}

/** Build `Π governing^exp` as an `ExprNode`. @internal */
export function monomialToExpr(
  monomial: Readonly<Record<string, number>>,
  vars: readonly DimensionalVariableRef[],
): ExprNode {
  const byName = new Map(vars.map((v) => [v.name, v.dim]));
  const factors: ExprNode[] = [];
  for (const name of Object.keys(monomial).sort()) {
    const exp = monomial[name];
    if (exp === 0) continue;
    const dim = byName.get(name);
    if (!dim) throw new RangeError(`monomialToExpr: unknown variable '${name}'`);
    const base = sym(name, dim);
    if (exp === 1) factors.push(base);
    else {
      factors.push({
        kind: 'op',
        op: '^',
        args: [base, sym(String(exp), DIMENSIONLESS)],
      });
    }
  }
  if (factors.length === 0) return sym('1', DIMENSIONLESS);
  if (factors.length === 1) return factors[0];
  return { kind: 'op', op: '*', args: factors };
}

function* extraPrefactors(base: ExprNode): Iterable<ExprNode> {
  yield base;
  // Registered `2pi` leaf (same normalForm as `base` — dimensionless constant).
  yield { kind: 'op', op: '*', args: [sym('2pi', DIMENSIONLESS), base] };
}

/**
 * Yield `expr` and its registered prefactor variants that validate and fit the budget's
 * depth and operator caps; `seen` keeps one copy of each construction across the paths.
 */
function* emitWithPrefactors(
  expr: ExprNode,
  monomial: Readonly<Record<string, number>>,
  originNote: string,
  powerLaw: PowerLawFit | undefined,
  state: BudgetState,
  seen: Set<string>,
): Iterable<RawCandidate> {
  for (const candidate of extraPrefactors(expr)) {
    if (!canEmitCandidate(state)) return;
    if (validate(candidate).ok !== true) continue;
    // Depth / operator caps
    const depth = astDepth(candidate);
    const ops = opCount(candidate);
    if (depth > state.budget.maxAstDepth) continue;
    if (ops > state.budget.maxOperators) continue;
    const key = JSON.stringify(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    state.candidates += 1;
    yield { expression: candidate, monomial, originNote, ...(powerLaw ? { powerLaw } : {}) };
  }
}

/**
 * Yield dimensionally valid monomials for `problem`, honouring the budget.
 * Invalid typed constructions are skipped (never evaluated).
 *
 * Two paths. The unique monomial of {@link nativeDetermination}, when there
 * is one. Then, when the governing set leaves π-groups (the full determination
 * is not unique) and the problem has exploratory rows, the rational power law
 * over those groups that {@link powerLawDetermination} fits on THOSE ROWS
 * ONLY; the holdout rows are never read here. A fit whose exponents all
 * rationalise to 0 is the base monomial again and is kept once.
 *
 * @internal
 */
export function* generateNative(
  problem: SearchProblem,
  state: BudgetState,
): Iterable<RawCandidate> {
  const vars = [problem.target, ...problem.governing];
  const seen = new Set<string>();
  const { det } = nativeDetermination(problem);
  if (det.determined && det.monomial) {
    yield* emitWithPrefactors(monomialToExpr(det.monomial, vars), det.monomial, det.reason, undefined, state, seen);
  }

  if ((problem.exploratory?.rows.length ?? 0) > 0) {
    const pl = powerLawDetermination(problem);
    if (pl.kind === 'fit') {
      const note = `power-law: ${pl.exponents.map((e) => `${e.group}^(${e.rational!.numerator}/${e.rational!.denominator})`).join(' · ')}`;
      yield* emitWithPrefactors(monomialToExpr(pl.monomial, vars), pl.monomial, note, pl, state, seen);
    }
  }

  if (problem.baseline && problem.discrepancy) {
    yield* generateCorrections(problem, state, seen);
  }
}

/**
 * The monomial the native enumerator searches, and the dimensionless inputs it
 * leaves out (persona finding C2). A dimensionless input makes the monomial
 * non-unique, since any f(θ0) can multiply it, and the enumerator used to
 * produce nothing. When the monomial over ALL inputs is not unique, it is taken
 * from the DIMENSIONED inputs; `unsearched` names the dimensionless ones whose
 * function is not searched.
 * @internal
 */
export function nativeDetermination(problem: SearchProblem): {
  det: DimensionalDeterminationResult;
  unsearched: string[];
} {
  const det = dimensionallyDetermines(problem.target, problem.governing);
  if (det.determined) return { det, unsearched: [] };
  const isDimensionless = (g: DimensionalVariableRef) => Object.values(g.dim).every((e) => e === 0);
  const dimless = problem.governing.filter(isDimensionless);
  if (dimless.length === 0) return { det, unsearched: [] };
  const reduced = dimensionallyDetermines(
    problem.target,
    problem.governing.filter((g) => !isDimensionless(g)),
  );
  return reduced.determined
    ? { det: reduced, unsearched: dimless.map((g) => g.name) }
    : { det, unsearched: [] };
}

function astDepth(node: ExprNode): number {
  if (node.kind === 'op') return 1 + Math.max(0, ...node.args.map(astDepth));
  if (node.kind === 'transcendental' || node.kind === 'abs') return 1 + astDepth(node.arg);
  return 1;
}

function opCount(node: ExprNode): number {
  if (node.kind === 'op') return 1 + node.args.reduce((n, a) => n + opCount(a), 0);
  return 0;
}

/**
 * Additive / relative corrections: search a monomial of the same dimension
 * as the observable to add to (or scale) the baseline.
 */
function* generateCorrections(
  problem: SearchProblem,
  state: BudgetState,
  seen: Set<string>,
): Iterable<RawCandidate> {
  const kind = problem.discrepancy!.kind;
  if (kind !== 'additive' && kind !== 'relative' && kind !== 'standardized') return;
  const { det } = nativeDetermination(problem);
  if (!det.determined || !det.monomial) return;
  if (!canEmitCandidate(state)) return;
  const corr = monomialToExpr(det.monomial, [problem.target, ...problem.governing]);
  const baseline = problem.baseline!;
  const combined: ExprNode =
    kind === 'additive'
      ? { kind: 'op', op: '+', args: [baseline, corr] }
      : { kind: 'op', op: '*', args: [baseline, { kind: 'op', op: '+', args: [sym('1', DIMENSIONLESS), corr] }] };
  if (validate(combined).ok !== true) return;
  const key = JSON.stringify(combined);
  if (seen.has(key)) return;
  seen.add(key);
  state.candidates += 1;
  yield { expression: combined, monomial: det.monomial, originNote: `correction:${kind}` };
}

/** Expose budget type for callers. @internal */
export type { SearchBudget };
