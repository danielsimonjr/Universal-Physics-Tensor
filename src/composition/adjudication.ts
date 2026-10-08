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
import { bridgeCatalog } from '../bridges/catalog-load.js';
import type { CatalogAdjudication as CandidateAdjudication } from '../bridges/catalog-types.js';

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

export type { AdjudicationVerdict, CatalogAdjudication as CandidateAdjudication } from '../bridges/catalog-types.js';

const VERDICTS: ReadonlySet<string> = new Set(['genuine', 'decoy', 'entailed', 'deferred']);

/**
 * The ledger: the `adjudications` block of `data/bridge-catalog.json`, read
 * once. Append-only by convention; a record is corrected there, never
 * silently removed. A record whose verdict is not one of the four, or whose
 * id is not a slug pair, is a defect in the file and refuses to load.
 *
 * @public
 */
export const ADJUDICATIONS: readonly CandidateAdjudication[] = bridgeCatalog().adjudications.map((row) => {
  if (!VERDICTS.has(row.verdict)) throw new Error(`adjudication ${row.id}: verdict '${row.verdict}' is not genuine, decoy, entailed or deferred`);
  const [a, b, extra] = row.id.split('~');
  if (a === undefined || b === undefined || extra !== undefined || candidateId(a, b) !== row.id) {
    throw new Error(`adjudication ${row.id}: id is not a sorted slug pair`);
  }
  return row;
});

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
