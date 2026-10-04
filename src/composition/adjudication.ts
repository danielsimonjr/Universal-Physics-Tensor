/**
 * Adjudication ledger for machine-surfaced discovery candidates.
 *
 * Human verdicts on identification hypotheses (`a ≟ b`) are REVIEW MEMORY:
 * once a physicist has disposed of a candidate, the funnel must not
 * re-surface it as fresh. Verdicts NEVER mutate the catalog or graphs
 * (the epistemic firewall) — they annotate discovery output only.
 *
 * Keyed by the order-normalized quantity-name pair. Proposed equations
 * (`upt discover --derive`) inherit the verdict of the identification they
 * were derived from (`derivedFrom.identification`).
 *
 * @module composition/adjudication
 */

import type { VettedCandidate } from './discovery.js';

/** Quantity names are ASCII kebab-case slugs; enforced so `~` cannot collide
 *  (Adam/Eve vet r1: guard the character-set assumption, don't assume it). */
const SLUG = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * Stable identity for an identification hypothesis: the two quantity names,
 * sorted, joined with `~`. Deliberately excludes score/verdict/dimension so
 * ids survive funnel-internal changes. NOT rename-proof: a quantity rename
 * (alias disposition) must update `ADJUDICATIONS` in the SAME commit — the
 * calibration benchmark's seed-resolution test enforces this.
 *
 * @public
 */
export function candidateId(a: string, b: string): string {
  if (!SLUG.test(a) || !SLUG.test(b)) {
    throw new Error(
      `candidateId: quantity names must be kebab-case slugs (got '${a}', '${b}')`,
    );
  }
  return a <= b ? `${a}~${b}` : `${b}~${a}`;
}

/**
 * `candidateId` when both names are kebab-case slugs; otherwise `undefined`.
 * Graphs carry symbols that are not slugs (`A`, `impact_parameter`). Those
 * names are not ledger keys, and routing them through `candidateId` throws.
 * The ledger path keeps the throw. Callers that only need an id skip it.
 *
 * @internal
 */
export function candidateIdIfSlug(a: string, b: string): string | undefined {
  if (!SLUG.test(a) || !SLUG.test(b)) return undefined;
  return candidateId(a, b);
}

/**
 * Verdict of a human adjudication OF THE IDENTIFICATION `a ≡ b` (never of a
 * specific derived equation — derived equations inherit this as context):
 * - `genuine`  — real physics AND a new link (nothing seeded qualifies yet).
 * - `entailed` — real physics already carried by the L-layer; not a new link.
 * - `decoy`    — dimensional coincidence / no mechanism; includes trivial and
 *                definitional identifications.
 * - `deferred` — reviewed and consciously parked (≠ absent entry, which means
 *                never reviewed).
 *
 * @public
 */
export type AdjudicationVerdict = 'genuine' | 'decoy' | 'entailed' | 'deferred';

/** One adjudicated identification hypothesis. @public */
export interface CandidateAdjudication {
  /** `candidateId(a, b)` of the identification. */
  readonly id: string;
  readonly verdict: AdjudicationVerdict;
  /** Why — condensed from the adjudication record; never machine-generated. */
  readonly grounds: string;
  /** Repo-relative path of the adjudication document. */
  readonly source: string;
  /** ISO date the verdict was recorded. */
  readonly date: string;
}

/**
 * The seeded ledger — 2026-06 Adam+Eve adjudication rounds (8 → 0 genuine).
 * Append-only by convention; entries are corrected, never silently removed.
 *
 * @public
 */
export const ADJUDICATIONS: readonly CandidateAdjudication[] = [
  {
    id: candidateId('erasure-energy', 'photon-energy'),
    verdict: 'decoy',
    grounds:
      "Dimensional coincidence; no mechanism. Landauer's k_B·T·ln2 is a statistical lower bound on heat dissipated to a reservoir; equating it to a single photon's hν has no universal mechanism — it rewrites thermal energy in frequency units.",
    source: 'docs/research/proposed-equations-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('dark-fermion-mass', 'erasure-energy'),
    verdict: 'decoy',
    grounds:
      'Dimensional coincidence; no mechanism. A speculative hidden-sector mass m = gv set equal to a context-dependent erasure energy — no model links a particle mass to an arbitrary processor\'s temperature.',
    source: 'docs/research/proposed-equations-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('photon-energy', 'rest-energy'),
    verdict: 'entailed',
    grounds:
      'Real physics, already entailed by the L-layer via CE-planck-einstein (E=hν) and CE-mass-energy (E=mc²); not a new link. Both Adam and Eve agree it is not a new discovery.',
    source: 'docs/research/proposed-equations-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('dark-fermion-mass', 'rest-energy'),
    verdict: 'decoy',
    grounds:
      'Trivial/definitional. m = vg/c² re-expresses the dark-fermion mass via E=mc² instead of via Landauer (cf. PE-2) — a definitional application, not a new bridge.',
    source: 'docs/research/proposed-equations-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('hubble-distance', 'peak-wavelength'),
    verdict: 'decoy',
    grounds:
      'Dimensional coincidence; no mechanism. A blackbody peak wavelength equated with the cosmological horizon — disparate domains, no mechanism; numerically off by ~10²⁹ for the CMB. The clearest "coincidence, not physics" case.',
    source: 'docs/research/proposed-equations-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('coarsening-length', 'quantum-correlation-length'),
    verdict: 'decoy',
    grounds:
      'Non-equilibrium vs equilibrium length; unanimous. A coarsening length is a non-equilibrium domain size formed by quenching through a critical point; the quantum correlation length ξ is an equilibrium static property at it. Different processes — not the same length.',
    source: 'docs/research/orphan-connector-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('effective-mass', 'tunneling-mass'),
    verdict: 'decoy',
    grounds:
      'Different particles/Hamiltonians; unanimous. A proton\'s inertia in a specific biomolecular potential vs. an emergent electronic quasiparticle\'s effective mass in a strongly-correlated metal. Different particles, different Hamiltonians, unrelated scales.',
    source: 'docs/research/orphan-connector-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('decoherence-rate', 'mutation-rate'),
    verdict: 'decoy',
    grounds:
      'Same units, no shared meaning; unanimous. A decoherence rate (loss of quantum phase to the environment) vs. a mutation rate (frequency of a permanent, classical change to a DNA sequence). Same units, no shared physical meaning — decoherence may precede a mutation, but they are not one quantity.',
    source: 'docs/research/orphan-connector-adjudication.md',
    date: '2026-06-21',
  },
  {
    id: candidateId('foerster-radius', 'schwarzschild-radius'),
    verdict: 'decoy',
    grounds: 'a Förster radius is not a Schwarzschild radius',
    source: 'docs/research/Orphan-Connector-Analysis.md',
    date: '2026-06-15',
  },
];

const BY_ID: ReadonlyMap<string, CandidateAdjudication> = new Map(
  ADJUDICATIONS.map((a) => [a.id, a]),
);

/** Look up the verdict for an identification, order-insensitive. @public */
export function adjudicationFor(
  a: string,
  b: string,
): CandidateAdjudication | undefined {
  return BY_ID.get(candidateId(a, b));
}

/**
 * A `VettedCandidate` with its recorded verdict attached, when the ledger has
 * one for `a ≟ b`. The identification funnel (`rankDiscoveries`) never sees
 * this — annotation is a command-layer concern (the epistemic firewall).
 *
 * @public
 */
export type AnnotatedCandidate = VettedCandidate & {
  readonly adjudication?: CandidateAdjudication;
};

/**
 * Attach each candidate's recorded verdict, if any. A pure map: preserves
 * order and length, and leaves candidates without a ledger entry untouched
 * (no `adjudication` key added).
 *
 * The discovery funnel's candidate pool is NOT guaranteed to be kebab-case
 * slugs (`candidates` command sources plain quantity names like `A` or
 * `impact_parameter` straight off `BridgeEdge`/canonical governing sets) —
 * `candidateId` intentionally THROWS on those (the `~`-collision guard, see
 * its docstring). A non-slug name can never be a ledger key (every
 * `ADJUDICATIONS` entry is a valid slug), so such candidates are
 * pre-filtered out of lookup rather than routed through the throwing path.
 *
 * @public
 */
export function annotateAdjudications(
  candidates: readonly VettedCandidate[],
): readonly AnnotatedCandidate[] {
  return candidates.map((c) => {
    if (!SLUG.test(c.a) || !SLUG.test(c.b)) return c;
    const adjudication = adjudicationFor(c.a, c.b);
    return adjudication ? { ...c, adjudication } : c;
  });
}
