/**
 * Consequence propagation — the machine pre-classifier for the human
 * adjudication ledger. A POST-PASS annotation over ranked candidates (mirrors
 * `annotateAdjudications`): reuse `deriveProposedBridges` to derive each
 * promising candidate's monomial consequence, then compare its `normalForm`
 * against the canonical registry (SAME target AND SAME governing set) to label
 * it `entailed` (re-derives known physics), `novel-consequence` (valid, no
 * match), or `inconclusive` (no monomial consequence). Annotation-only: never
 * mutates the catalog/graph, never re-orders or re-scores, never writes to
 * ADJUDICATIONS. The underlying ProposedBridge stays `status:'unadjudicated'`.
 *
 * @module composition/consequence
 */
import type { VettedCandidate } from './discovery.js';
import type { ProposedBridge } from './proposed-bridges.js';
import { deriveProposedBridges } from './proposed-bridges.js';
import { normalForm } from '../canonical/normal-form.js';
import { CANONICAL_EQUATIONS } from '../canonical/registry.js';
import type { CanonicalEquation } from '../canonical/canonical-equation.js';

/** @public */
export type ConsequenceSignal = 'entailed' | 'novel-consequence' | 'inconclusive';

/** @public */
export interface ConsequenceEvidence {
  readonly target: string;
  readonly governing: readonly string[];
  readonly derivedNormalForm: string;
  /** The id of the canonical equation whose normalForm matched, or null. */
  readonly canonicalMatch: string | null;
  readonly sourceEquationIds: readonly [string, string];
}

/** @public */
export type ConsequenceAnnotatedCandidate = VettedCandidate & {
  readonly consequence?: {
    readonly signal: ConsequenceSignal;
    readonly evidence: readonly ConsequenceEvidence[];
  };
};

/** Governing-name set equality (order-insensitive). */
function sameGoverning(a: readonly { name: string }[], b: readonly { name: string }[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a.map((g) => g.name));
  return b.every((g) => sa.has(g.name));
}

/**
 * Classify ONE derived proposal against the canonical registry.
 * `entailed` iff some canonical equation with a `scalarAst` has the SAME target
 * name AND SAME governing set AND a matching `normalForm`. Otherwise
 * `novel-consequence`. There is NO contradiction signal — a differing normalForm
 * for the same target is NOT a contradiction (design r2: E=mc² vs E=hf).
 * @public
 */
export function classifyProposal(
  proposal: Pick<ProposedBridge, 'target' | 'governing' | 'scalarAst' | 'derivedFrom'>,
  canonical: readonly CanonicalEquation[] = CANONICAL_EQUATIONS,
): { readonly signal: Exclude<ConsequenceSignal, 'inconclusive'>; readonly evidence: ConsequenceEvidence } {
  const derivedNF = normalForm(proposal.scalarAst);
  let canonicalMatch: string | null = null;
  for (const ce of canonical) {
    if (!ce.scalarAst) continue;
    if (ce.dimensional.target.name !== proposal.target.name) continue;
    if (!sameGoverning(ce.dimensional.governing, proposal.governing)) continue;
    if (normalForm(ce.scalarAst) === derivedNF) {
      canonicalMatch = ce.id; // CanonicalEquation.id is a top-level `readonly id: string` (verified)
      break;
    }
  }
  return {
    signal: canonicalMatch ? 'entailed' : 'novel-consequence',
    evidence: {
      target: proposal.target.name,
      governing: proposal.governing.map((g) => g.name),
      derivedNormalForm: derivedNF,
      canonicalMatch,
      sourceEquationIds: proposal.derivedFrom.sourceEquationIds,
    },
  };
}

/**
 * What a derived proposal claims, in a form that travels with it: the premise,
 * whether it is a known law or a conditional identity, what the solved-for
 * symbol means, the source equations' assumptions, and the exact scope of the
 * canonical-match check.
 * @internal
 */
export interface DerivedClaim {
  /** The unadjudicated identification the relation rests on. */
  readonly premise: string;
  /** `known-law`: re-derives a registry equation. `conditional-identity`: holds only if the premise does. */
  readonly relation: 'known-law' | 'conditional-identity';
  /** No derived proposal has been confronted with a measurement. */
  readonly tested: false;
  readonly symbol: { readonly name: string; readonly fromEquation: string; readonly meaning: string };
  readonly assumptions: readonly { readonly equation: string; readonly assumptions: readonly string[] }[];
  readonly canonicalMatch: {
    readonly id: string | null;
    readonly sameTarget: number;
    readonly sameTargetAndGoverning: number;
    readonly scope: 'the canonical registry only';
  };
}

type ClaimEquation = Pick<CanonicalEquation, 'id' | 'name' | 'assumptions' | 'scalarAst'> & {
  readonly dimensional: Pick<CanonicalEquation['dimensional'], 'target' | 'governing'>;
};

/**
 * Describe the claim a derived proposal makes. Pure; the proposal is unchanged.
 * @internal
 */
export function describeDerivedClaim(
  proposal: Pick<ProposedBridge, 'target' | 'governing' | 'scalarAst' | 'derivedFrom'>,
  canonical: readonly ClaimEquation[] = CANONICAL_EQUATIONS,
): DerivedClaim {
  const { identification, sourceEquationIds, solvedFor } = proposal.derivedFrom;
  // `deriveProposedBridges` resolves the first source id for the smaller
  // endpoint name and the second for the larger, so each id's target is known
  // even when the source is a catalog bridge the canonical registry does not
  // hold (then `canonical.find` is undefined; the sentence once printed
  // "equals ? (undefined)" there, 9.0.0 audit §7 T1).
  const [t0, t1] = [identification.a, identification.b].sort();
  const endpointOf = (id: string): string => (id === sourceEquationIds[0] ? t0 : t1);
  const sources = sourceEquationIds
    .map((id) => canonical.find((e) => e.id === id))
    .filter((e): e is ClaimEquation => e !== undefined);
  const home = sources.find((e) => e.dimensional.governing.some((g) => g.name === solvedFor)) ?? sources[0];
  const homeId = home?.id ?? sourceEquationIds[0];
  const otherId = sourceEquationIds.find((id) => id !== homeId) ?? sourceEquationIds[1];
  const other = sources.find((e) => e.id === otherId);
  const homeTarget = home?.dimensional.target.name ?? endpointOf(homeId);
  const otherTarget = other?.dimensional.target.name ?? endpointOf(otherId);

  const derivedNF = normalForm(proposal.scalarAst);
  const sameTarget = canonical.filter((e) => e.scalarAst && e.dimensional.target.name === proposal.target.name);
  const sameGov = sameTarget.filter((e) => sameGoverning(e.dimensional.governing, proposal.governing));
  const match = sameGov.find((e) => normalForm(e.scalarAst!) === derivedNF);

  return {
    premise: `${identification.a} ≡ ${identification.b}`,
    relation: match ? 'known-law' : 'conditional-identity',
    tested: false,
    symbol: {
      name: solvedFor,
      fromEquation: homeId,
      meaning:
        `${solvedFor} is the ${solvedFor} of ${homeId}${home !== undefined ? ` (${home.name})` : ''}: the ${solvedFor} for which ` +
        `${homeTarget} equals ${otherTarget} (${otherId}) — an equal-${identification.dim} scale; ` +
        `the ${otherTarget} side is not given a ${solvedFor}`,
    },
    assumptions: sources.map((e) => ({ equation: e.id, assumptions: [...e.assumptions] })),
    canonicalMatch: {
      id: match?.id ?? null,
      sameTarget: sameTarget.length,
      sameTargetAndGoverning: sameGov.length,
      scope: 'the canonical registry only',
    },
  };
}

/**
 * Annotate ranked candidates with their consequence signal. Order-preserving,
 * 1:1 with the input; only `promising` candidates are classified (they are the
 * only ones `deriveProposedBridges` processes). A promising candidate with no
 * derived proposal is `inconclusive`. Generic over the input candidate type so
 * it composes with other post-pass annotators (e.g. `annotateAdjudications`)
 * without forgetting fields the caller already attached.
 * @public
 */
export function annotateConsequences<T extends VettedCandidate>(
  candidates: readonly T[],
): readonly (T & {
  readonly consequence?: {
    readonly signal: ConsequenceSignal;
    readonly evidence: readonly ConsequenceEvidence[];
  };
})[] {
  const promising = candidates.filter((c) => c.verdict === 'promising');
  const proposals = deriveProposedBridges(promising);

  // Group proposals + their classification by the sorted candidate-pair key.
  const byPair = new Map<string, { signal: ConsequenceSignal; evidence: ConsequenceEvidence[] }>();
  for (const p of proposals) {
    const key = [p.derivedFrom.identification.a, p.derivedFrom.identification.b].sort().join('~');
    const cls = classifyProposal(p);
    const cur = byPair.get(key);
    if (!cur) {
      byPair.set(key, { signal: cls.signal, evidence: [cls.evidence] });
    } else {
      cur.evidence.push(cls.evidence);
      // entailed dominates novel: if ANY consequence re-derives known physics, the pair is entailed.
      if (cls.signal === 'entailed') cur.signal = 'entailed';
    }
  }

  return candidates.map((c) => {
    if (c.verdict !== 'promising') return c;
    const key = [c.a, c.b].sort().join('~');
    const hit = byPair.get(key);
    const signal: ConsequenceSignal = hit ? hit.signal : 'inconclusive';
    return { ...c, consequence: { signal, evidence: hit?.evidence ?? [] } };
  });
}
