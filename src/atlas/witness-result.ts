/**
 * Atlas Phase 4, S4.2 — the shape a witness run reports.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §2.2.
 *
 * **The load-bearing distinction in this file: a check that DID NOT RUN is not
 * a check that FAILED.** Peer absent, budget exhausted, and parser throw are
 * all `'unresolved'`, each carrying the reason it could not answer. Only a
 * check that COMPLETES and finds a disagreement is `'refuted'`.
 *
 * This repo has been bitten by exactly that conflation more than once — a
 * checker that discarded its own stderr manufactured a false negative
 * indistinguishable from a clean pass. Folding "could not run" into "failed"
 * is the same defect with the sign flipped: it turns a missing optional peer
 * into a refutation of the physics.
 *
 * Nothing here throws. A runner that threw would force every caller into a
 * `try`/`catch` whose `catch` arm cannot tell which of the three outcomes it
 * is looking at.
 *
 * @module atlas/witness-result
 * @internal
 */

/**
 * What a witness run concluded.
 *
 * - `'checked'` — the check RAN and the claim held.
 * - `'refuted'` — the check RAN and the claim did not hold.
 * - `'unresolved'` — the check did not run, or ran and could not decide.
 *
 * @internal
 */
export type WitnessStatus = 'checked' | 'refuted' | 'unresolved';

/**
 * Why a witness is `'unresolved'`. Required on that status so a reader never
 * has to guess which of four very different situations produced it.
 *
 * @internal
 */
export type UnresolvedReason =
  /** The optional peer that performs the check is not installed. */
  | 'peer-absent'
  /** The wall-clock budget elapsed before an answer arrived. */
  | 'timeout'
  /** The input could not be parsed or evaluated at all. */
  | 'parse-error'
  /** The check ran to completion and neither confirmed nor refuted. */
  | 'not-simplified'
  /** Refinement did not improve the answer, so nothing is concluded. */
  | 'no-convergence'
  /**
   * Both resolutions hit the target exactly, so there was no error for
   * refinement to reduce and convergence cannot be shown. Not a failure of
   * the scheme and not a demonstration of it.
   */
  | 'no-error-to-reduce';

/** What one witness run produced. @internal */
export interface WitnessRunResult {
  /** The `Witness.id` this run corresponds to (`'W7b'`). */
  readonly witnessId: string;
  readonly kind: 'symbolic' | 'numeric';
  readonly status: WitnessStatus;
  /** REQUIRED when `status === 'unresolved'`, absent otherwise. */
  readonly reason?: UnresolvedReason;
  /** Human-readable note — never the discriminator, always the explanation. */
  readonly detail: string;
  /** Milliseconds the runner waited. */
  readonly elapsedMs: number;
}

/**
 * The ids of runs that CHECKED, as `deriveEvidence` wants its
 * `passingWitnessIds` argument.
 *
 * A convenience with one purpose: keep the mapping from run results to
 * "passing" in ONE place. Writing `results.filter(r => r.status !== 'refuted')`
 * at a call site would hand `symbolically-checked` to every unresolved run —
 * the free-tag defect `derive-evidence.ts` documents at length, reintroduced
 * one layer up.
 *
 * @internal
 */
export function passingWitnessIds(
  results: readonly WitnessRunResult[],
): ReadonlySet<string> {
  return new Set(results.filter((r) => r.status === 'checked').map((r) => r.witnessId));
}
