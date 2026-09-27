/**
 * PI-instrument Phase 1 — the epistemic-grounding ledger. A pure, derived view
 * over a `VettedCandidate`'s already-computed falsifier results: which gates RAN
 * a real comparison and the candidate SURVIVED (`passed`), which could not test
 * it or produced an unadjudicated result (`gaps`), and the honest ceiling — no
 * mechanism test (axis-compatibility is a proxy, not a mechanism test) and no
 * data confrontation. Annotation-only: it changes no verdict, score, or count.
 *
 * The ledger's job is to expose WEAKNESS so a PI knows how much weight a verdict
 * bears. A gate lands in `passed` ONLY if it ran a real comparison and the
 * candidate survived; anything untestable (an abstained gate) or unadjudicated
 * (a novel machine-derived consequence) is a `gap`, never a strength. There is
 * deliberately NO single "tier": magnitude (numeric) and axis (regime) are
 * orthogonal evidence and must not collapse into one rank a PI could misread as
 * credibility.
 *
 * @module composition/grounding
 */
import type { VettedCandidate } from './discovery.js';
import type { ConsequenceSignal } from './consequence.js';

/** The epistemic-grounding ledger for one discovery candidate. @public */
export interface CandidateGrounding {
  /** Gates that ran a real comparison AND the candidate survived. */
  readonly passed: readonly string[];
  /** Gates that could NOT test the candidate, or produced an unadjudicated result. */
  readonly gaps: readonly string[];
  /**
   * Honest ceiling — no mechanism test has run. This is PERMANENT for a
   * dimensional discovery candidate, not a placeholder: axis-compatibility is a
   * regime PROXY, and `entailed` (the strongest available signal — the
   * consequence re-derives a known canonical law) is a structural-consequence
   * check, not a mechanism test. A dedicated mechanism-proxy gate was assessed
   * 2026-07-04 and found NOT buildable without fabricating coupling physics the
   * catalog does not have (Phase 2 grounding; see the PI-instrument Phase 2
   * not-build note). Real mechanism lives in the ESTABLISHED-bridge world
   * (`upt confront`), not in candidate space. The field stays for honesty (the
   * ceiling is never a silent omission) and for the constructive path: growing
   * the canonical registry so `entailed` stops abstaining.
   */
  readonly mechanismTested: false;
  /**
   * Honest ceiling — this candidate is not confronted with real data. This is
   * PERMANENT for a dimensional discovery candidate, not a placeholder: a
   * cross-cluster dimensional identification is a coincidence review surface
   * (0/8 ever adjudicated genuine) with no implied observable to measure. Data
   * confrontation lives in the ESTABLISHED-bridge world (`upt confront`), which
   * the evidence-spine work grows. The scientific loop is closed not by
   * confronting candidates but by the FIREWALL: a candidate must graduate to an
   * established bridge (human review + citation) before it can be data-tested.
   * A propose→confront loop over candidates was assessed 2026-07-04 (PI-instrument
   * Phase 3) and found to have no confrontable target — the honest boundary is
   * that candidates are unconfrontable until promoted. The field stays for
   * honesty and flips only for a candidate that is `entailed` into (or graduates
   * to) a data-confronted relation.
   */
  readonly dataTested: false;
}

/**
 * Derive the grounding ledger from a candidate's existing falsifier results.
 * `consequence` is the optional consequence-annotation signal (from
 * `annotateConsequences`); omit it when the consequence layer did not run.
 *
 * Designed for `promising` candidates (the ones a PI reviews), but honest for
 * any candidate: it never reports a gate as `passed` unless it actually ran and
 * the candidate survived it.
 *
 * @public
 */
export function describeGrounding(
  c: VettedCandidate,
  consequence?: ConsequenceSignal,
): CandidateGrounding {
  const passed: string[] = [];
  const gaps: string[] = [];

  // Numerical-consistency: the retrodiction filter always runs. It is `passed`
  // only when the candidate is actually consistent (a contradictory candidate's
  // failure is its verdict, not a grounding line — this view is for survivors).
  if (c.numericallyConsistent) passed.push('numerical-consistency');

  // Magnitude gate: ran only when both endpoints had a representative value.
  // An anchor-invariant ratio is fixed by the graph at every anchor, so its
  // agreement is an identity, not a survived test (persona finding L3).
  if (c.magnitudeChecked && c.magnitudeAnchorInvariant === true) {
    gaps.push(
      'magnitude (anchor-invariant: the graph fixes this ratio at every anchor, so the match is an identity, not evidence)',
    );
  } else if (c.magnitudeChecked) {
    const parts: string[] = [];
    if (c.ordersApart != null) parts.push(`${c.ordersApart.toFixed(1)} orders`);
    if (c.magnitudeUsedAnchor) parts.push('anchor-derived');
    passed.push(parts.length ? `magnitude (${parts.join(', ')})` : 'magnitude');
  } else {
    gaps.push('magnitude (no representative value)');
  }

  // Axis-compatibility: honestly PARTIAL — "≥1 regime axis resolved and agreed",
  // never "fully axis-checked". Cleared only when an axis was resolved AND none
  // clashed. (A clash is the axis-clash verdict, not a survivor's grounding.)
  if (c.axisChecked && c.axisClashes.length === 0) {
    passed.push('axis-compatible (≥1 regime axis)');
  } else if (!c.axisChecked) {
    gaps.push('axis (regime attributes unresolved)');
  }

  // Consequence: ONLY `entailed` clears (the consequence re-derives a known
  // canonical law — a real check against standard physics). `novel-consequence`
  // is an UNADJUDICATED machine-surfaced relation — a weakness to investigate,
  // not a passed test. `inconclusive` means the consequence layer could not test.
  if (consequence === 'entailed') passed.push('consequence: entailed');
  else if (consequence === 'novel-consequence') gaps.push('consequence: novel (unadjudicated)');
  else if (consequence === 'inconclusive') gaps.push('consequence: inconclusive');

  return { passed, gaps, mechanismTested: false, dataTested: false };
}

/** An independent falsifier: a gate that can reject an identification the anchored graph cannot. */
export type IndependentFalsifier = 'magnitude' | 'axis' | 'consequence';

/**
 * How far one candidate is from being a testable claim, dimension by dimension.
 * Deliberately NOT a score: the dimensions are orthogonal and are never summed.
 * @internal
 */
export interface CandidateReadiness {
  /** Connectivity. It makes a candidate worth a look; it is never evidence. */
  readonly structure: { readonly mergesComponents: boolean; readonly unlocks: number };
  /** `same-kind`: the names share a kind token. `dimension-only`: nothing but the dimension is shared. */
  readonly kind: 'same-kind' | 'dimension-only';
  /**
   * Independent falsifiers that ran and the candidate survived, and those that
   * abstained. An abstention is a missing test, never a pass. Numerical
   * consistency is not listed: it runs from a single anchor and cannot reach
   * the quantities an identification unlocks.
   */
  readonly falsifiers: {
    readonly survived: readonly IndependentFalsifier[];
    readonly abstained: readonly IndependentFalsifier[];
  };
  readonly mechanismTested: false;
  readonly dataTested: false;
  /** What would make the identification testable, each item derived from why a gate abstained. */
  readonly needs: {
    /** The premise every literal identification a≡b rests on. */
    readonly premise: string;
    /** Endpoints that need a representative magnitude for the magnitude falsifier to run. */
    readonly magnitudeFor: readonly string[];
    /** Axes and endpoints that need a stated regime for the axis falsifier to run. */
    readonly regimeFor: readonly { readonly axis: string; readonly endpoints: readonly string[] }[];
    /** The consequence check could not re-derive a known law. */
    readonly derivableConsequence: boolean;
  };
  /** The independent observation that would test the premise. */
  readonly observation: string;
}

/**
 * Derive a candidate's readiness from its falsifier fields.
 * @internal
 */
export function describeReadiness(c: VettedCandidate, consequence?: ConsequenceSignal): CandidateReadiness {
  const survived: IndependentFalsifier[] = [];
  const abstained: IndependentFalsifier[] = [];
  if (c.magnitudeChecked && c.magnitudeAnchorInvariant !== true) survived.push('magnitude');
  else abstained.push('magnitude');
  if (c.axisChecked && c.axisClashes.length === 0) survived.push('axis');
  else if (!c.axisChecked) abstained.push('axis');
  if (consequence === 'entailed') survived.push('consequence');
  else abstained.push('consequence');
  const kind = c.sameKind ? 'same-kind' : 'dimension-only';
  return {
    structure: { mergesComponents: c.mergesComponents, unlocks: c.unlocksFromAnchor.length },
    kind,
    falsifiers: { survived, abstained },
    mechanismTested: false,
    dataTested: false,
    needs: {
      premise:
        kind === 'same-kind'
          ? `${c.a} and ${c.b} are the same physical quantity, not two quantities of one kind`
          : `${c.a} and ${c.b} are the same physical quantity, not only both ${c.dim}`,
      magnitudeFor: c.magnitudeChecked ? [] : [...(c.magnitudeMissing ?? [])],
      regimeFor: c.axisChecked ? [] : (c.axisUnstated ?? []).map((u) => ({ axis: u.axis, endpoints: [...u.endpoints] })),
      derivableConsequence: consequence !== 'entailed',
    },
    observation:
      `measure ${c.a} and ${c.b} in one system that defines both: the identification predicts equal values ` +
      'within uncertainty. If no system defines both, it has no observable content yet.',
  };
}
