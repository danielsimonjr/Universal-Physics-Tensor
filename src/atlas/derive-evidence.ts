/**
 * Atlas Phase 1, S1.3 — evidence tags, DERIVED AT READ TIME.
 *
 * Design note: `docs/planning/Atlas-Phase-1-Design.md` §3 and §4.
 *
 * **The contract of this module: it has no write path.** No record stores an
 * evidence set; every tag is computed from the artifacts a record actually
 * carries, each time it is asked for. A tag is emitted ONLY when the artifact
 * it names is present and passing. There is no default-true tag, no tag
 * derived from another tag, no tag derived from `reviewStatus`, and no tag
 * derived from prose. A record carrying no passing witness derives exactly
 * `{'proposed'}`.
 *
 * ## The empty-set trap (design note §3, Adam A1 RED — confirmed by execution)
 *
 * `convention-checked` is the ONLY rule in the table whose quantifier is
 * universal (`every`). Written as "`conventions` is present AND every declared
 * field is consumed by a witness", it hands the tag to a record with ZERO
 * witnesses, because `conventions = {}` declares nothing and `[].every(…)` is
 * vacuously true. {@link deriveEvidence} therefore requires a NON-EMPTY
 * declaration before the universal runs, and
 * `tests/atlas/derive-evidence.test.ts` pins the empty-object case.
 *
 * **The general rule, for anything added here later:** a universal quantifier
 * in a tag derivation must be paired with a non-emptiness check, or the tag is
 * free. The other rules are existentials (`some`), which are false on the
 * empty set and therefore safe.
 *
 * ## What "passing" means, and why the caller supplies it
 *
 * `Witness` records an id and the test file that runs it; nothing on the
 * record says whether that test passed. Proving it is a filesystem act (see
 * `tests/atlas/evidence-rule.test.ts`, which matches witness ids against test
 * titles), and this module is pure. So the set of passing witness ids is an
 * ARGUMENT, and it is REQUIRED — {@link NO_PASSING_WITNESSES} must be passed
 * explicitly when nothing is verified.
 *
 * It used to DEFAULT to empty, which sounds conservative and was in fact a
 * defect (Eve E1 RED, confirmed by execution). Defaulting the other way, to
 * "all", would have been the free-tag defect above in a second location — but
 * defaulting to empty created the mirror-image failure: a forgotten argument
 * produced an answer identical to a real negative. A catalog-wide check written
 * that way could only ever report "no row gains evidence", whatever the rows
 * held, so it could not fail. Requiring the argument makes a vacuous result a
 * STATED choice, and `tests/atlas/coverage.test.ts` now carries a positive
 * control so that a negative result carries information.
 *
 * @module atlas/derive-evidence
 * @internal
 */

import type { Conventions, EvidenceTag, FormalFidelity } from './types.js';

/**
 * The verdict of `adjudicateBridgeEntry` (`src/bridges/membership.ts`),
 * restated structurally so this module takes no dependency on `src/bridges`
 * (the dependency must run one way — design note §1).
 *
 * `tests/atlas/derive-evidence.test.ts` pins this union against the real
 * `BridgeVerdict` at compile time AND at runtime over the live catalog, so a
 * fourth verdict fails the test rather than silently falling through.
 *
 * @internal
 */
export type MembershipVerdict = 'bridge' | 'not-a-bridge' | 'unadjudicated';

/**
 * A witness as this derivation reads it.
 *
 * Structural, not an import of `Witness`, for two reasons that are findings in
 * their own right (both reported to the Lead):
 *
 *  - `Witness.kind` is `'symbolic' | 'numeric' | 'formal'` — there is NO
 *    `'dimensional'` member, so `dimension-checked` has no source on today's
 *    data. The kind is widened here to include `'dimensional'` so the rule is
 *    written once and correctly; it simply never fires until such a witness
 *    exists. Widening it is not inventing evidence: no record carries one.
 *  - `Witness` records no list of the convention fields a check consumes, so
 *    `consumes` is optional here. Absent ⇒ the witness consumes nothing ⇒
 *    `convention-checked` cannot be earned. Conservative by construction.
 *
 * @internal
 */
export interface WitnessLike {
  readonly id: string;
  readonly kind: 'symbolic' | 'numeric' | 'formal' | 'dimensional';
  /** Convention fields this check actually consumes, when it declares any. */
  readonly consumes?: readonly (keyof Conventions)[];
}

/**
 * A counterexample as this derivation reads it.
 *
 * `Counterexample` (`src/atlas/types.ts`) carries `description` and `witness`
 * and has NO `resolvedBy` field — so on today's data every counterexample is
 * unresolved. `resolvedBy` is read here as an optional property rather than
 * assumed absent, so that adding it later resolves counterexamples without
 * touching this file. This module adds no field to any type.
 *
 * @internal
 */
export interface CounterexampleLike {
  readonly description?: string;
  readonly witness?: string;
  /** Present and non-empty ⇒ the counterexample is resolved and does not contradict. */
  readonly resolvedBy?: string;
}

/**
 * A rejection as this projection reads it — structural, so this module still
 * imports nothing from `src/bridges`.
 *
 * @internal
 */
export interface RejectionLike {
  readonly beId: number;
  readonly reason: string;
}

/**
 * A row's counterexamples INCLUDING the one its rejection constitutes.
 *
 * ROADMAP §7 Phase 1 asks for "a `RejectedBridgeAdjudication` ⇒ `contradicted`
 * with the counterexample LINKED". The linking half is what matters and was
 * missing: BE-35 had a counterexample written by hand and earned `contradicted`
 * honestly, while BE-28, BE-29, BE-32 and BE-40 had none — and an earlier rule
 * papered over that by FORCING `contradicted` onto every rejected row, which
 * manufactured a refutation from nothing (Eve E1).
 *
 * This is the linking done properly. The rejection's own `reason` IS the
 * counterexample: a row rejected for being single-regime is refuted AS A BRIDGE
 * by exactly that argument. Projecting it means `contradicted` is then EARNED
 * through the ordinary derivation rather than asserted by a special case.
 *
 * **It is a projection, not a copy.** The reason string is never duplicated into
 * a catalog row; `bridges/rejected.ts` remains its single source, which is what
 * the ROADMAP means by "cross-linked ... rather than duplicating it". The caller
 * supplies the rejection, so this module still owns no view of WHICH ids are
 * rejected.
 *
 * @internal
 */
export function counterexamplesWithRejection(
  record: EvidenceInput,
  rejection: RejectionLike | undefined,
): readonly CounterexampleLike[] {
  const own = record.counterexamples ?? [];
  if (rejection === undefined) return own;
  // Do not double-count. A row may ALREADY cite the rejection by hand — BE-35
  // does, with `witness: 'src/bridges/rejected.ts - REJECTED_BRIDGE_ADJUDICATIONS,
  // beId 35'`. My first predicate matched only the machine key `rejection:<id>`
  // and so missed it, appending the SAME argument a second time in different
  // words, which is exactly the duplication the ROADMAP says to avoid. The
  // predicate therefore accepts either form: the machine key, or any witness
  // that names the rejection registry together with this beId.
  const key = `rejection:${rejection.beId}`;
  const alreadyLinked = own.some((c) => {
    const w = c.witness ?? '';
    if (w === key) return true;
    return w.includes('REJECTED_BRIDGE_ADJUDICATIONS') && w.includes(String(rejection.beId));
  });
  if (alreadyLinked) return own;
  return [
    ...own,
    { description: rejection.reason, witness: `rejection:${rejection.beId}` },
  ];
}

/** The artifacts a record carries, all optional. @internal */
export interface EvidenceInput {
  readonly witnesses?: readonly WitnessLike[];
  readonly conventions?: Conventions;
  readonly counterexamples?: readonly CounterexampleLike[];
  /**
   * The record's formal reference, read ONLY for its fidelity. Structural so a
   * caller can pass an `AtlasBridge` directly.
   */
  readonly formalRef?: { readonly fidelity: FormalFidelity };
}

/**
 * The empty passing set, for a caller that genuinely has nothing marked passing.
 *
 * ⚠ This is EXPORTED and must be passed EXPLICITLY. It used to be a default
 * parameter value, and that was a defect found by post-implementation review
 * (Eve, E1) and confirmed by execution: a record carrying three passing
 * witnesses and a consumed convention derived `{'proposed'}` under the default —
 * byte-identical to an empty record. A caller who simply forgot the argument got
 * an answer indistinguishable from a real negative.
 *
 * That made a catalog-wide check VACUOUS rather than reassuring. "No row gains
 * evidence" was the only outcome the call could produce, whatever the rows
 * contained, so the check could not fail and proved nothing. Requiring the
 * argument forces the caller to STATE which witnesses were verified, which is
 * exactly the decision that must never be implicit.
 */
export const NO_PASSING_WITNESSES: ReadonlySet<string> = new Set<string>();

/** The fields `Conventions` may declare. Kept in one place so the check is total. */
const CONVENTION_FIELDS = [
  'heatWorkSign',
  'metricSignature',
  'fourierNormalization',
  'unitSystem',
  'capacitorChargeSign',
] as const satisfies readonly (keyof Conventions)[];

/** The convention fields a record actually declares (a `undefined` value declares nothing). */
function declaredConventionFields(
  conventions: Conventions | undefined,
): readonly (keyof Conventions)[] {
  if (conventions === undefined) return [];
  return CONVENTION_FIELDS.filter((field) => conventions[field] !== undefined);
}

/**
 * Derive the evidence set of one record.
 *
 * @param record - the artifacts the record carries.
 * @param passingWitnessIds - ids of witnesses VERIFIED to pass. REQUIRED: pass
 * {@link NO_PASSING_WITNESSES} explicitly when nothing is verified, so that a
 * vacuous result is a stated choice rather than a forgotten argument.
 * @returns a fresh set; never cached, never stored.
 * @internal
 */
export function deriveEvidence(
  record: EvidenceInput,
  passingWitnessIds: ReadonlySet<string>,
): ReadonlySet<EvidenceTag> {
  const tags = new Set<EvidenceTag>();

  const passing = (record.witnesses ?? []).filter((w) => passingWitnessIds.has(w.id));

  // Existentials over the passing witnesses — false on the empty set.
  // `symbolically-checked` has exactly ONE derivation: a passing symbolic
  // witness. Which symbolic witnesses pass is DEFINED by the committed results
  // artifact (`data/atlas/witness-results.json`, Phase 4 §3) — the caller feeds
  // it in through `passingWitnessIds` via `artifactPassingWitnessIds`.
  if (passing.some((w) => w.kind === 'dimensional')) tags.add('dimension-checked');
  if (passing.some((w) => w.kind === 'symbolic')) tags.add('symbolically-checked');

  // `formally-proved` iff a formal reference exists AND someone checked that
  // its statement says what the record says. `'unreviewed'` records a reference
  // without earning the tag — a proof of the wrong statement proves nothing.
  if (record.formalRef !== undefined && record.formalRef.fidelity !== 'unreviewed') {
    tags.add('formally-proved');
  }
  if (passing.some((w) => w.kind === 'numeric')) tags.add('numerically-supported');

  // The ONE universal in the table — guarded by non-emptiness. See §3 above.
  const declared = declaredConventionFields(record.conventions);
  if (
    declared.length > 0 &&
    declared.every((field) => passing.some((w) => (w.consumes ?? []).includes(field)))
  ) {
    tags.add('convention-checked');
  }

  // Existential: a counterexample with no resolution.
  if (
    (record.counterexamples ?? []).some(
      (c) => c.resolvedBy === undefined || c.resolvedBy === '',
    )
  ) {
    tags.add('contradicted');
  }

  if (tags.size === 0) tags.add('proposed');
  return tags;
}

/**
 * The artifacts a catalog row may be judged on.
 *
 * `formalRef` is absent on purpose. A catalog reference certifies one part.
 * Passing it to {@link deriveEvidence} would light `formally-proved` on the
 * whole row. The predicate still lights that tag when a caller passes a
 * reference; this function is what keeps the catalog path from doing so.
 *
 * @internal
 */
export function catalogEvidenceInput(row: {
  readonly conventions?: Conventions;
  readonly counterexamples?: readonly CounterexampleLike[];
}): EvidenceInput {
  return {
    ...(row.conventions !== undefined ? { conventions: row.conventions } : {}),
    ...(row.counterexamples !== undefined ? { counterexamples: row.counterexamples } : {}),
  };
}

/**
 * Derive the evidence set of a catalog row, under the adjudication precedence
 * of design note §4. The verdict is supplied by the caller — it comes from
 * `adjudicateBridgeEntry`, which owns the rejected-id registry
 * (`REJECTED_BRIDGE_IDS`). Reading that registry here would make this file a
 * second source of truth about which ids are rejected.
 *
 * | Verdict | Derives |
 * |---|---|
 * | `'not-a-bridge'` | {@link deriveEvidence} runs normally — see below |
 * | `'unadjudicated'` | `{'proposed'}` only — never a refutation, never support |
 * | `'bridge'` | {@link deriveEvidence} runs normally |
 *
 * ## ⚠ `'not-a-bridge'` no longer forces `'contradicted'` (Eve E1, 2026-09-21)
 *
 * It used to, "regardless of witnesses", and that rule — written by me in design
 * note §4 — **violated §3 of the same document.** `contradicted` means THE CLAIM
 * IS REFUTED. `not-a-bridge` means THE ROW IS NOT A REGIME-CROSSING BRIDGE.
 * Those are different assertions about different things, and conflating them made
 * the library report BE-35 as `status: 'established'` and `evidence:
 * {'contradicted'}` in the same breath — from which a reader cannot tell whether
 * the equation is a true in-regime identity the bridge graph ignores, or a
 * refuted statement.
 *
 * Measured when the rule was removed: of the five rejected rows, only **BE-35**
 * carries an actual counterexample, and it derives `{'contradicted'}` NATURALLY
 * through the normal path. **BE-28, BE-29, BE-32 and BE-40 carry none** — the old
 * rule was manufacturing a refutation for four rows with no refuting artifact
 * whatsoever. That is exactly what §3 forbids: a tag is emitted only when the
 * artifact it names is present and passing.
 *
 * Membership already has a single owner — `adjudicateBridgeEntry` — and it does
 * not need restating in the evidence vocabulary. Removing the case leaves each
 * fact with exactly one source, which is what §4 was trying to achieve and this
 * rule was quietly undermining.
 *
 * @internal
 */
export function deriveEvidenceForVerdict(
  verdict: MembershipVerdict,
  record: EvidenceInput,
  passingWitnessIds: ReadonlySet<string>,
): ReadonlySet<EvidenceTag> {
  switch (verdict) {
    // 'not-a-bridge' falls through to the normal derivation on purpose: a row
    // is refuted by a COUNTEREXAMPLE, not by failing a membership test. See the
    // block comment above for the measurement that forced this change.
    case 'not-a-bridge':
      return deriveEvidence(record, passingWitnessIds);
    case 'unadjudicated':
      return new Set<EvidenceTag>(['proposed']);
    case 'bridge':
      return deriveEvidence(record, passingWitnessIds);
  }
}

/**
 * The evidence set of a COMPOSITE claim, derived from its parts' sets: every
 * step of a route and every norm transport it applied
 * (`docs/planning/ADR-transported-norm-composition.md` §4).
 *
 * - A positive tag survives only if EVERY part carries it: a chain is never
 *   better supported than its weakest link, so the composite is the
 *   intersection. `formally-proved` therefore needs a proof of every part; a
 *   transport declaration's set holds at most its numeric or symbolic basis, so
 *   no route through one is formally proved.
 * - `contradicted` survives if ANY part carries it: a refuted part refutes the
 *   chain that rests on it.
 * - With no positive tag left, the composite is `{'proposed'}` (plus
 *   `contradicted` when present). An unwitnessed declaration contributes
 *   `{'proposed'}` and so caps the composite there.
 *
 * @throws RangeError on no parts: a composite of nothing has no evidence to state.
 * @internal
 */
export function deriveCompositeEvidence(parts: readonly ReadonlySet<EvidenceTag>[]): ReadonlySet<EvidenceTag> {
  if (parts.length === 0) {
    throw new RangeError('deriveCompositeEvidence: a composite of no parts has no evidence to derive');
  }
  const positive = (s: ReadonlySet<EvidenceTag>) => [...s].filter((t) => t !== 'proposed' && t !== 'contradicted');
  let common = new Set(positive(parts[0]!));
  for (const part of parts.slice(1)) common = new Set(positive(part).filter((t) => common.has(t)));
  const tags = new Set<EvidenceTag>(common);
  if (parts.some((p) => p.has('contradicted'))) tags.add('contradicted');
  if (common.size === 0) tags.add('proposed');
  return tags;
}
