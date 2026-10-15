/**
 * Catalog formal references.
 *
 * The catalog row stores the manifest key, and beside it two projections of
 * the manifest: the theorem that key names and the record's proof status.
 * This module builds the reference from the key, derives the status from
 * that reference, and reports a row whose stored projections disagree with
 * the derivation. It does not parse an id out of text, and it does not store
 * an evidence tag.
 *
 * @module atlas/catalog-formal-ref
 */

import type { FormalRef } from '../relations/types.js';
import type { CatalogEntry, ProofStatus } from '../bridges/catalog-types.js';
import { catalogEntries, catalogEntry } from '../bridges/catalog-load.js';
import { physjsFormalRef } from './physjs-ref.js';

/** Memo of the PhysJS reference already built for a catalog id. */
const byId = new Map<number, FormalRef | undefined>();

/**
 * The reviewed PhysJS reference for a catalog id, or `undefined` when the
 * row records no manifest key.
 *
 * @internal
 */
export function catalogFormalRef(id: number): FormalRef | undefined {
  if (byId.has(id)) return byId.get(id);
  const entry = catalogEntry(id);
  const key = entry?.formalKey;
  const ref = key === undefined ? undefined : physjsFormalRef(key);
  if (ref !== undefined && entry?.theorem !== ref.statement) {
    throw new Error(`catalog id ${id} names theorem '${entry?.theorem}', the manifest entry '${key}' names '${ref.statement}'`);
  }
  byId.set(id, ref);
  return ref;
}

/**
 * The proof status a record earns, derived from its reference: `pending` with
 * no formalKey, `full` for a reviewed kind-`bridge` reference, `weak` for any
 * other reference. `reference` is the record's {@link catalogFormalRef}.
 *
 * @internal
 */
export function deriveProofStatus(reference: FormalRef | undefined): ProofStatus {
  if (reference === undefined) return 'pending';
  return reference.kind === 'bridge' && reference.fidelity !== 'unreviewed' ? 'full' : 'weak';
}

/**
 * Records whose stored `theorem` or `proofStatus` disagree with the manifest:
 * a theorem that is not the one the manifest entry of `formalKey` names, a
 * theorem on a record with no `formalKey` (or none on a record with one), and
 * a status other than {@link deriveProofStatus}. Empty means every record's
 * projections are the manifest's. `referenceOf` defaults to the manifest's
 * reference for the key; a test passes a changed one.
 *
 * @internal
 */
export function catalogProofProblems(
  entries: readonly CatalogEntry[] = catalogEntries(),
  referenceOf: (key: string) => FormalRef = physjsFormalRef,
): string[] {
  const problems: string[] = [];
  for (const entry of entries) {
    const reference = entry.formalKey === undefined ? undefined : referenceOf(entry.formalKey);
    if (reference === undefined) {
      if (entry.theorem !== undefined) problems.push(`catalog id ${entry.id} names theorem '${entry.theorem}' and has no formalKey`);
    } else if (entry.theorem !== reference.statement) {
      problems.push(`catalog id ${entry.id} theorem is '${entry.theorem ?? '(none)'}', the manifest entry '${entry.formalKey}' names '${reference.statement}'`);
    }
    const derived = deriveProofStatus(reference);
    if (entry.proofStatus !== derived) {
      problems.push(`catalog id ${entry.id} proofStatus is '${entry.proofStatus}', derived '${derived}'`);
    }
  }
  return problems;
}
