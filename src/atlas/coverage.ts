/**
 * Atlas Phase 1, S1.3 — evidence coverage, counted BY TAG.
 *
 * Design note `docs/planning/Atlas-Phase-1-Design.md` §3: *"Any future commit
 * that appears to raise a row's evidence without adding a witness is a bug,
 * and the coverage report is what makes it visible: it reports counts BY TAG,
 * so a jump is legible."*
 *
 * A single "how many records have evidence" total would hide exactly the
 * movement this report exists to expose — one tag inflating while another
 * drains reads as no change at all. So the report is per tag, every tag is
 * present with an explicit zero, and `records` is reported beside the counts
 * (the counts do not sum to it: a record carries several tags).
 *
 * Pure: no I/O, no catalog import, no caching — every function here takes
 * what it counts as an argument, so it can never disagree with a registry.
 *
 * @module atlas/coverage
 * @internal
 */

import { ALL_EVIDENCE_TAGS } from './types.js';
import type { EvidenceTag } from './types.js';

// Moved to `types.ts`: the derived-tag literals may appear under `src/atlas/`
// only there and in `derive-evidence.ts`. Re-exported so callers are unchanged.
export { ALL_EVIDENCE_TAGS } from './types.js';

/** Counts by tag over a set of records. @internal */
export interface EvidenceCoverage {
  /** How many records were counted. */
  readonly records: number;
  /** One entry per `EvidenceTag`, zero included. Counts overlap by design. */
  readonly byTag: Readonly<Record<EvidenceTag, number>>;
}

/**
 * Count derived evidence sets by tag.
 *
 * @param evidenceSets - one derived set per record, e.g. the output of
 * `deriveEvidence` mapped over a catalog. Deriving is the caller's job; this
 * function never derives, so it cannot disagree with the derivation.
 * @internal
 */
export function summarizeEvidence(
  evidenceSets: Iterable<ReadonlySet<EvidenceTag>>,
): EvidenceCoverage {
  const byTag = Object.fromEntries(ALL_EVIDENCE_TAGS.map((t) => [t, 0])) as Record<
    EvidenceTag,
    number
  >;
  let records = 0;
  for (const set of evidenceSets) {
    records += 1;
    for (const tag of set) byTag[tag] += 1;
  }
  return { records, byTag };
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay coverage — how much of the catalog a HUMAN has audited
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How much of the catalog carries the Phase 1 overlay.
 *
 * `summarizeEvidence` above answers "what support do these records have";
 * this answers the different question "how much has anyone LOOKED at". The two
 * must not be conflated: a row can be `verified` (its derived tag set is
 * non-empty, which a machine check produces) while nobody has recorded a
 * `relation` for it at all.
 *
 * - `schema` — the denominator: the catalog rows plus the canonical
 *   registry (the counts are the caller's; this module stores none). The atlas families are NOT in it; they are reported separately,
 *   because a nine-model pilot would otherwise dilute a catalog-wide fraction.
 * - `audited` — a HUMAN set `relation` or `conventions` on the record.
 * - `verified` — a derived evidence tag set is non-empty. Passed IN, never
 *   derived here, for the same reason `summarizeEvidence` never derives.
 * - `notYetAudited` — `schema − audited`, stated rather than left to arithmetic.
 *
 * @internal
 */
export interface OverlayCoverage {
  readonly schema: number;
  readonly audited: number;
  readonly verified: number;
  readonly notYetAudited: number;
  /** The atlas pilot, reported beside the catalog and never mixed into it. */
  readonly atlas: { readonly bridges: number; readonly reviewed: number };
}

/** A record that may carry the Phase 1 overlay. Structural, so this module
 * imports no registry and cannot become a second source of truth. @internal */
export interface OverlayBearing {
  readonly relation?: unknown;
  readonly conventions?: unknown;
}

/** An atlas bridge, reduced to the one field this report reads. @internal */
export interface ReviewStatusBearing {
  readonly reviewStatus: 'proposed' | 'reviewed';
}

/**
 * Count overlay coverage over the catalog rows and canonical entries.
 *
 * Every input is PASSED IN. The module stays pure and importless, so it can
 * never disagree with the registries — the caller states which registries it
 * counted, exactly as `summarizeEvidence` requires its caller to state which
 * evidence sets it derived.
 *
 * @param schemaRecords - the catalog rows and canonical entries, concatenated.
 * @param verifiedCount - how many of them have a non-empty derived tag set.
 * @param atlasBridges - the atlas pilot's bridges, reported separately.
 * @internal
 */
export function overlayCoverage(
  schemaRecords: readonly OverlayBearing[],
  verifiedCount: number,
  atlasBridges: readonly ReviewStatusBearing[],
): OverlayCoverage {
  const audited = schemaRecords.filter(
    (r) => r.relation !== undefined || r.conventions !== undefined,
  ).length;
  return {
    schema: schemaRecords.length,
    audited,
    verified: verifiedCount,
    notYetAudited: schemaRecords.length - audited,
    atlas: {
      bridges: atlasBridges.length,
      reviewed: atlasBridges.filter((b) => b.reviewStatus === 'reviewed').length,
    },
  };
}
