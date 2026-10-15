/**
 * Atlas Phase 4, S4.2 — the symbolic witness runner.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §2.
 *
 * A symbolic witness claims `lhs = rhs`. The runner forms the DIFFERENCE and
 * asks the optional CAS peer to simplify it: a difference that collapses to a
 * literal zero is `'checked'`; one that collapses to a non-zero literal is
 * `'refuted'`; anything else is `'unresolved'` with the reason it could not
 * decide.
 *
 * ## The simplifier is INJECTED, and no test touches the registry
 *
 * `src/numerical/formula-registry.ts` caches its selection in module scope and
 * exposes no reset hook, so a test that registered a stub would leak it into
 * every later test in the same worker. {@link runSymbolicWitness} therefore
 * takes the simplifier as a PARAMETER, defaulting to `simplifyExpr`. Tests
 * pass a stub for the present path and `null` for the absent path; the
 * registry is never written. One test exercises the real peer under the
 * existing skip-when-absent pattern.
 *
 * `null` means "the peer is absent" and is a first-class argument value, not a
 * forgotten one. `simplifyExpr` itself CANNOT tell absence from "nothing to
 * simplify" — both return `simplified: false` — so when the argument is
 * OMITTED the runner asks `isSimplifierAvailable()` first and maps absence to
 * `null`. Without that step the default path would report a missing peer as
 * `'not-simplified'`, the wrong reason on the one path most callers take.
 *
 * Deviation from the plan's wording, recorded in the design note §2.1: the
 * plan names `getFormulaParser()` as the default. A parser cannot decide
 * `lhs − rhs = 0`; the capability needed is SIMPLIFICATION, which lives in
 * `expr-simplify.ts` (a different peer, `@danielsimonjr/mathts-functions`).
 *
 * ## The numeric probe is a SECOND result, never folded into the CAS status
 *
 * A simplifier that fails on everything would leave every wrong dictionary
 * `'unresolved'`, which is "not checked", not "shown wrong" (the weaker
 * guarantee NOTES.md records). {@link probeSymbolicWitness} therefore
 * evaluates both sides at seeded random positive points through `evalExpr`
 * and REFUTES on disagreement. Its outcome is its own kind
 * ({@link NumericProbeKind}), carried on the run result beside `status`:
 * a probe that agrees never makes a run `'checked'`, a probe that refutes
 * never makes it `'refuted'`, and the two are tallied as two sets of
 * numbers ({@link tallySymbolicResults}; AGENTS law 4). MathTS
 * `symbolicEqual` is not used: it is the same simplifier, not a second method.
 *
 * @module atlas/witness-symbolic
 * @internal
 */

import { random, seedProbabilityRng } from '@danielsimonjr/mathts-functions';
import type { ExprNode } from '../dimensional/ast-types.js';
import { sym } from '../dimensional/ast-builders.js';
import { DIMENSIONLESS } from '../dimensional/types.js';
import { evalExpr } from '../composition/expr-eval.js';
import { isSimplifierAvailable, simplifyExpr } from '../composition/expr-simplify.js';
import { scalarSymbolsFromMathTs } from '../composition/mathts-scalar-symbols.js';
import type { WitnessRunResult } from './witness-result.js';

/**
 * The simplification capability this runner needs, as a function rather than
 * the whole module — so a stub is five lines and cannot accidentally depend on
 * anything else `expr-simplify.ts` exports.
 *
 * @internal
 */
export type SymbolicSimplifier = (
  expr: ExprNode,
) => Promise<{ readonly expr: ExprNode; readonly simplified: boolean }>;

/** What a symbolic witness asserts. @internal */
export interface SymbolicWitnessSpec {
  /** The `Witness.id` (`'W7b'`). */
  readonly id: string;
  readonly lhs: ExprNode;
  readonly rhs: ExprNode;
  /**
   * Wall-clock budget in milliseconds. Default 5000.
   *
   * ⚠ **This bounds how long the RUNNER WAITS, not how long the CAS works.**
   * The peer's `simplify` is synchronous inside its promise, so nothing here
   * can interrupt it; a timeout reports that no answer arrived in time and the
   * underlying work may still be running. Saying otherwise would be the
   * "a running process is not a working one" error in reverse.
   */
  readonly budgetMs?: number;
}

const DEFAULT_BUDGET_MS = 5000;

/**
 * What the numeric probe concluded: its own kind, never the CAS status.
 *
 * - `'numeric-refuted'`: some seeded point gives |lhs − rhs|/(|lhs| + |rhs|)
 *   above {@link NUMERIC_PROBE_TOLERANCE}.
 * - `'numeric-agrees'`: every point is within it. Agreement at finitely
 *   many points is not a proof, so this never lights an evidence tag.
 * - `'numeric-not-run'`: a side could not be evaluated to a finite number.
 *
 * @internal
 */
export type NumericProbeKind = 'numeric-refuted' | 'numeric-agrees' | 'numeric-not-run';

/** The numeric probe's record. @internal */
export interface NumericProbe {
  readonly kind: NumericProbeKind;
  /** Points evaluated; 0 when not run. */
  readonly points: number;
  /** max |lhs − rhs|/(|lhs| + |rhs|) over the points; absent when not run. */
  readonly worst?: number;
  readonly detail: string;
}

/** Seeded points per probe. @internal */
export const NUMERIC_PROBE_POINTS = 8;
/** The relative difference above which a point refutes. @internal */
export const NUMERIC_PROBE_TOLERANCE = 1e-12;

/** A leaf that evaluates on its own (π, a registered constant, a literal) is a constant, not a free symbol. */
function evaluatesAlone(name: string): boolean {
  try {
    return Number.isFinite(evalExpr(sym(name, DIMENSIONLESS)));
  } catch {
    return false;
  }
}

/** MathTS `random(lo, hi)`, read back as the number it is. */
function seededPoint(lo: number, hi: number): number {
  const v: unknown = random(lo, hi);
  if (typeof v !== 'number') throw new TypeError('random did not return a number');
  return v;
}

/**
 * Evaluate a symbolic witness's two sides at `points` seeded random points,
 * every free symbol drawn from [0.5, 2) by MathTS `random` after
 * `seedProbabilityRng(spec.id)`, so a re-run sees the same points. The free
 * symbols are the scalar leaves (`scalarSymbolsFromMathTs`) that do not
 * evaluate on their own. Never throws.
 *
 * @internal
 */
export function probeSymbolicWitness(spec: SymbolicWitnessSpec, points: number = NUMERIC_PROBE_POINTS): NumericProbe {
  const notRun = (why: string): NumericProbe => ({ kind: 'numeric-not-run', points: 0, detail: `The numeric probe did not run: ${why}.` });
  try {
    const names = new Set<string>();
    for (const leaf of [...scalarSymbolsFromMathTs(spec.lhs), ...scalarSymbolsFromMathTs(spec.rhs)]) names.add(leaf.name);
    const free = [...names].filter((name) => !evaluatesAlone(name)).sort();
    seedProbabilityRng(spec.id);
    let worst = 0;
    for (let i = 0; i < points; i++) {
      const values: Record<string, number> = {};
      for (const name of free) values[name] = seededPoint(0.5, 2);
      const lhs = evalExpr(spec.lhs, values);
      const rhs = evalExpr(spec.rhs, values);
      if (!Number.isFinite(lhs) || !Number.isFinite(rhs)) {
        return notRun(`a non-finite value (lhs ${lhs}, rhs ${rhs}) at point ${i + 1}`);
      }
      const scale = Math.abs(lhs) + Math.abs(rhs);
      worst = Math.max(worst, scale === 0 ? 0 : Math.abs(lhs - rhs) / scale);
    }
    if (worst > NUMERIC_PROBE_TOLERANCE) {
      return {
        kind: 'numeric-refuted',
        points,
        worst,
        detail: `lhs and rhs differ at a seeded point: max |lhs − rhs|/(|lhs| + |rhs|) = ${worst} over ${points} points, above ${NUMERIC_PROBE_TOLERANCE}.`,
      };
    }
    return {
      kind: 'numeric-agrees',
      points,
      worst,
      detail: `lhs and rhs agree at ${points} seeded points: max |lhs − rhs|/(|lhs| + |rhs|) = ${worst}. Agreement at points is not a proof.`,
    };
  } catch (err) {
    return notRun(`the evaluator threw: ${String(err)}`);
  }
}

/** A symbolic run: the CAS status, and the numeric probe beside it. @internal */
export interface SymbolicWitnessRunResult extends WitnessRunResult {
  readonly kind: 'symbolic';
  readonly numericProbe: NumericProbe;
}

/**
 * The CAS outcomes and the numeric outcomes of symbolic runs, as two separate
 * tallies. They are never added together.
 *
 * @internal
 */
export function tallySymbolicResults(results: readonly SymbolicWitnessRunResult[]): {
  readonly cas: { readonly checked: number; readonly refuted: number; readonly unresolved: number };
  readonly numeric: { readonly agrees: number; readonly refuted: number; readonly notRun: number };
} {
  const cas = { checked: 0, refuted: 0, unresolved: 0 };
  const numeric = { agrees: 0, refuted: 0, notRun: 0 };
  for (const r of results) {
    cas[r.status] += 1;
    if (r.numericProbe.kind === 'numeric-agrees') numeric.agrees += 1;
    else if (r.numericProbe.kind === 'numeric-refuted') numeric.refuted += 1;
    else numeric.notRun += 1;
  }
  return { cas, numeric };
}

/** The numeric value of a literal leaf, or `null`. Same rule as `validator.ts`. */
function literalValue(node: ExprNode): number | null {
  if (node.kind !== 'symbol') return null;
  if (node.name.trim() === '') return null;
  const v = Number(node.name);
  return Number.isFinite(v) ? v : null;
}

/** A sentinel the timeout race resolves with; never confusable with a result. */
const TIMED_OUT = Symbol('timed-out');

/**
 * Run one symbolic witness.
 *
 * @param spec - the claim, as two ASTs whose difference should vanish.
 * @param simplifier - the CAS capability, or `null` when the optional peer is
 * absent. When omitted, resolves to `simplifyExpr` if the peer is available and
 * to `null` otherwise. Pass `null` EXPLICITLY to exercise the absent path.
 * @returns a result carrying the CAS status and, beside it, the numeric
 * probe; **never throws**, because a thrown error forces callers into a
 * `catch` that cannot distinguish "did not run" from "failed".
 * @internal
 */
export async function runSymbolicWitness(
  spec: SymbolicWitnessSpec,
  simplifier?: SymbolicSimplifier | null,
): Promise<SymbolicWitnessRunResult> {
  const started = Date.now();
  if (simplifier === undefined) {
    simplifier = (await isSimplifierAvailable()) ? simplifyExpr : null;
  }
  // The probe is independent of the CAS: it runs on every path, and decides nothing below.
  const base = { witnessId: spec.id, kind: 'symbolic' as const, numericProbe: probeSymbolicWitness(spec) };
  const elapsed = (): number => Date.now() - started;

  if (simplifier === null) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'peer-absent',
      detail:
        'The optional CAS peer is absent, so the claim was never examined. This is ' +
        'not evidence against it.',
      elapsedMs: elapsed(),
    };
  }

  const difference: ExprNode = { kind: 'op', op: '-', args: [spec.lhs, spec.rhs] };
  const budget = spec.budgetMs ?? DEFAULT_BUDGET_MS;

  let outcome: Awaited<ReturnType<SymbolicSimplifier>> | typeof TIMED_OUT;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    outcome = await Promise.race([
      simplifier(difference),
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), budget);
      }),
    ]);
  } catch (err) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'parse-error',
      detail:
        `The simplifier threw rather than answering: ${String(err)}. A throw is not a ` +
        'refutation.',
      elapsedMs: elapsed(),
    };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  if (outcome === TIMED_OUT) {
    return {
      ...base,
      status: 'unresolved',
      reason: 'timeout',
      detail:
        `No answer arrived within ${budget} ms. The budget bounds the WAIT, not the ` +
        'CAS: the underlying simplification may still be running.',
      elapsedMs: elapsed(),
    };
  }

  const value = literalValue(outcome.expr);
  if (value === 0) {
    return {
      ...base,
      status: 'checked',
      detail: 'lhs − rhs simplified to literal 0.',
      elapsedMs: elapsed(),
    };
  }
  if (value !== null) {
    return {
      ...base,
      status: 'refuted',
      detail: `lhs − rhs simplified to the non-zero constant ${value}.`,
      elapsedMs: elapsed(),
    };
  }
  return {
    ...base,
    status: 'unresolved',
    reason: 'not-simplified',
    detail:
      'The difference did not reduce to a constant. The claim may still hold; this ' +
      'simplifier could not show it.',
    elapsedMs: elapsed(),
  };
}
