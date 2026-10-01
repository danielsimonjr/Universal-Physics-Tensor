/**
 * Catalog evidence for `upt map`.
 *
 * `deriveEdgeEvidence` used to live in `composition/graph-viz.ts`, which made
 * that module import `atlas/derive-evidence.ts`. The derivation reads the
 * bridge catalog, so it belongs with the CLI. `buildVizModel` still applies
 * an evidence filter, and only when the caller passes the function.
 *
 * @module cli/map-evidence
 */

import type { EvidenceTag } from '../relations/types.js';
import {
  catalogEvidenceInput,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../atlas/derive-evidence.js';
import { adjudicateBridgeEntry } from '../bridges/membership.js';
import { BRIDGE_EQUATIONS } from '../bridges/index.js';

/**
 * Derive the evidence tags of the catalog row a `beId` names — at READ TIME,
 * from the artifacts that row actually carries.
 *
 * This is the whole contract: there is no evidence FIELD anywhere to read. A
 * stored tag would be an assertion nobody re-checks, which is the failure this
 * project has already removed twice. An unknown `beId` derives the empty set
 * (no row, no artifacts, no claim) rather than a default tag.
 *
 * `NO_PASSING_WITNESSES` is passed deliberately: catalog rows declare no
 * `witnesses` at all, so no witness-backed tag can be earned from them today,
 * and saying so explicitly is required by `deriveEvidence`'s own contract.
 * A catalog `formalRef` is not passed. A proof of one part does not tag the row.
 *
 * @internal — CLI support, reached through `src/cli-api.ts`. Not on the
 * published surface: `tests/api/public-surface.test.ts` pins that surface and
 * a filter helper is not part of the library's v0.4.0 contract.
 */
export function deriveEdgeEvidence(beId: number): ReadonlySet<EvidenceTag> {
  const row = BRIDGE_EQUATIONS.find((e) => e.id === beId);
  if (row === undefined) return new Set<EvidenceTag>();
  return deriveEvidenceForVerdict(
    adjudicateBridgeEntry(row),
    catalogEvidenceInput(row),
    NO_PASSING_WITNESSES,
  );
}

/**
 * The evidence-filter path that calls {@link deriveEdgeEvidence}.
 *
 * Relation filtering stays in `composition/graph-viz.ts`. This function is
 * what attaches the catalog derivation when `--evidence` is set, so the text
 * map and the visual map receive the same function and cannot disagree.
 * A caller that already supplied `deriveEvidence` is left alone.
 *
 * @internal
 */
export function withCatalogEvidence<
  T extends {
    readonly evidence?: EvidenceTag;
    readonly deriveEvidence?: (beId: number) => ReadonlySet<EvidenceTag>;
  },
>(opts: T): T & { readonly deriveEvidence?: (beId: number) => ReadonlySet<EvidenceTag> } {
  if (opts.evidence === undefined || opts.deriveEvidence !== undefined) return opts;
  return { ...opts, deriveEvidence: deriveEdgeEvidence };
}
