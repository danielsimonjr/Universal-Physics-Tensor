/**
 * Word-token overlap: the text baseline's tokenizer, Jaccard similarity and the rank comparator.
 *
 * `link-prediction.ts` reads these. `benchmark/baselines.ts` carries private copies of the same
 * functions on purpose (its rank comparator spells the codepoint order inline, where this one
 * calls `compareCodepoint`): that file is a pinned code blob of the closed criterion 3 study,
 * hashed by the study's freeze, and is not edited to import this module.
 *
 * @module atlas/text-overlap
 * @internal
 */

import { compareCodepoint } from '../core/compare.js';

/** Lower-cased word tokens (letters and digits) of a text, as a set. @internal */
export const tokens = (text: string): Set<string> =>
  new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0));

/** Jaccard similarity |a ∩ b| / |a ∪ b|; 0 when both sets are empty. @internal */
export const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

/**
 * Rank candidates by descending score list (lexicographic), then ascending id. A stable, total
 * order: two candidates with equal scores are ordered by id, never by input position.
 *
 * @internal
 */
export function rankBy(candidates: readonly string[], score: (id: string) => readonly number[]): string[] {
  return [...candidates].sort((x, y) => {
    const sx = score(x);
    const sy = score(y);
    for (let i = 0; i < sx.length; i++) if (sx[i] !== sy[i]) return sy[i]! - sx[i]!;
    return compareCodepoint(x, y);
  });
}
