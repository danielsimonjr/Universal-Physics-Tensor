/**
 * One internal chain record.
 *
 * The classifier kind, the order key, the filter theorem, a regime
 * mismatch, and the edge ids live on this value. {@link chainOrderKey}
 * and the pipeline's renderer are functions of it. A confirmation and a
 * restatement do not become a rejection.
 *
 * @module composition/chain-result
 */

import type { ChainClassification } from '../canonical/structural.js';
import type { CompositionResult } from '../relations/composition-table.js';
import type { BuckinghamFilterRecord } from './buckingham-filter.js';
import { compareChainEdgeIds, type ChainCandidateKind } from './chain-candidate.js';
import type { ChainRegimeMismatch } from './chain-regime.js';

/**
 * The pipeline's one chain value.
 *
 * `classification` is the structural result. `theorem` is the Buckingham
 * filter's named shape, or null when the filter named none. `mismatch`
 * is set only for a provisional chain the regime gate refused.
 * `categoryComposition` is the category claim for the two steps. It is
 * unset when the edges have no stored category object ids. A recorded
 * `no-composite-claim` does not change the order key.
 *
 * @internal
 */
export interface ChainRecord {
  readonly edgeIds: readonly string[];
  readonly classification: ChainClassification;
  readonly theorem: BuckinghamFilterRecord['theorem'];
  readonly mismatch: ChainRegimeMismatch | undefined;
  readonly categoryComposition: CompositionResult | undefined;
}

/**
 * The four-class order key of `record`.
 *
 * A confirmation stays a confirmation. A restatement stays a restatement.
 * A provisional chain whose filter theorem is `monomial_form` is a unique
 * monomial. Every other provisional chain is an unfixed shape. A mismatch
 * does not change the key.
 *
 * @internal
 */
export function chainOrderKey(record: ChainRecord): ChainCandidateKind {
  if (record.classification.kind === 'confirmation') return 'confirmation';
  if (record.classification.kind === 'restatement') return 'restatement';
  return record.theorem === 'PhysJS.Dimensional.monomial_form' ? 'unique-monomial' : 'unfixed-shape';
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
 * Total order of chain records by {@link chainOrderKey}, then by edge ids.
 *
 * Returns a new array. The input array is left as it was. A rejection is
 * not a class in this order.
 *
 * @internal
 */
export function orderChainRecords(records: readonly ChainRecord[]): ChainRecord[] {
  return [...records].sort((a, b) => {
    const byClass = classIndex(chainOrderKey(a)) - classIndex(chainOrderKey(b));
    if (byClass !== 0) return byClass < 0 ? -1 : 1;
    return compareChainEdgeIds(a.edgeIds, b.edgeIds);
  });
}
