/**
 * A chain candidate and the order the pipeline reads candidates in.
 *
 * Confirmation of a catalog id, then a restatement, then a unique
 * monomial, then a named PhysJS.Dimensional shape that leaves a
 * function or an exponent unfixed. A shorter chain comes before a
 * longer one. Equal lengths compare the ordered edge ids from the
 * left. Nothing here is written into the catalog.
 *
 * @internal
 * @module composition/chain-candidate
 */

/** The four classes the order distinguishes. */
export type ChainCandidateKind =
  | 'confirmation'
  | 'restatement'
  | 'unique-monomial'
  | 'unfixed-shape';

/**
 * One survivor of a chain of proved edges.
 *
 * `kind` and `edgeIds` are the order. `catalogId`, `canonicalId`,
 * `restatesBridge`, `theorem`, and `id` are carried data and are not
 * compared.
 */
export interface ChainCandidate {
  readonly kind: ChainCandidateKind;
  readonly edgeIds: readonly string[];
  readonly catalogId?: number;
  readonly canonicalId?: string;
  readonly restatesBridge?: string;
  readonly theorem?: string;
  readonly id?: string;
}

function classIndex(kind: ChainCandidateKind): number {
  switch (kind) {
    case 'confirmation':
      return 0;
    case 'restatement':
      return 1;
    case 'unique-monomial':
      return 2;
    case 'unfixed-shape':
      return 3;
  }
}

/**
 * Shorter chain first, then lexicographic edge ids.
 *
 * The regime-mismatch list uses this same comparison. It is not a class
 * inside {@link orderChainCandidates}.
 */
export function compareChainEdgeIds(left: readonly string[], right: readonly string[]): -1 | 0 | 1 {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  for (let i = 0; i < left.length; i++) {
    const a = left[i] as string;
    const b = right[i] as string;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

/**
 * Total order of chain candidates. Returns a new array of the same
 * objects. The input array is left as it was.
 */
export function orderChainCandidates(candidates: readonly ChainCandidate[]): ChainCandidate[] {
  return [...candidates].sort((a, b) => {
    const byClass = classIndex(a.kind) - classIndex(b.kind);
    if (byClass !== 0) return byClass < 0 ? -1 : 1;
    return compareChainEdgeIds(a.edgeIds, b.edgeIds);
  });
}
