/**
 * Atlas Phase 5, S5.3 — the deterministic, in-tree BASELINE conditions and the
 * recall-at-depth-k scorer.
 *
 * Design note: `docs/planning/Atlas-Phase-5-Design.md` §7.
 *
 * Each baseline ranks a reference corpus against a query. The pre-registered
 * criterion is recall at depth 10 against embeddings, so a baseline is scored by
 * whether the correct reference lands in its top k. Three baselines, in rising
 * order of structure:
 *
 * - **text retrieval** — Jaccard overlap of lower-cased word tokens;
 * - **symbol matching** — Jaccard overlap of the expression's symbol names;
 * - **typed structural search** — exact agreement of the leakage key
 *   (dimension-renamed normal form), then symbol overlap as the tie-break.
 *
 * **Every ranking is fully deterministic:** ties break on the reference id, so a
 * rerun can never reorder a tie and move a result across the depth cut.
 *
 * Embeddings and LLM conditions run OUT OF PROCESS; `backend-shapes.ts` holds
 * only their request and response shapes.
 *
 * @module atlas/benchmark/baselines
 * @internal
 */

import type { ExprNode } from '../../dimensional/ast-types.js';
import { leakageKey } from './leakage.js';

/** One record a baseline can retrieve. @internal */
export interface CorpusRecord {
  readonly id: string;
  readonly text: string;
  readonly expr?: ExprNode;
}

/** A query: an item's text and, when it has one, its expression. @internal */
export interface RetrievalQuery {
  readonly text: string;
  readonly expr?: ExprNode;
}

/** A ranking: reference ids, best first. @internal */
export type Ranking = readonly string[];

const tokens = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 0),
  );

const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

/**
 * Free symbol names of an expression, for the symbol-matching baseline.
 *
 * Stated, not hidden: the walk descends `op`, `transcendental` and `abs`
 * only. A symbol inside an `integral`, a `derivative` or a tensor node is
 * not collected, the same limit `leakage.ts` states for its dimension
 * renaming. Widening it would change the frozen study's symbol baseline.
 */
function symbolNames(node: ExprNode | undefined, out = new Set<string>()): Set<string> {
  if (node === undefined) return out;
  if (node.kind === 'symbol') {
    // Numeric literals are not symbols a reader would match on.
    if (!Number.isFinite(Number(node.name))) out.add(node.name);
    return out;
  }
  if (node.kind === 'op') for (const a of node.args) symbolNames(a, out);
  else if (node.kind === 'transcendental' || node.kind === 'abs') symbolNames(node.arg, out);
  return out;
}

/** Rank by descending score, ties broken by ascending id — never by input order. */
function rankBy(corpus: readonly CorpusRecord[], score: (r: CorpusRecord) => number): Ranking {
  return corpus
    .map((r) => ({ id: r.id, s: score(r) }))
    .sort((a, b) => (b.s !== a.s ? b.s - a.s : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((x) => x.id);
}

/** Baseline 1: text retrieval by word-token overlap. @internal */
export function rankByTextOverlap(query: RetrievalQuery, corpus: readonly CorpusRecord[]): Ranking {
  const q = tokens(query.text);
  return rankBy(corpus, (r) => jaccard(q, tokens(r.text)));
}

/** Baseline 2: symbol matching by overlap of expression symbol names. @internal */
export function rankBySymbolOverlap(query: RetrievalQuery, corpus: readonly CorpusRecord[]): Ranking {
  const q = symbolNames(query.expr);
  return rankBy(corpus, (r) => jaccard(q, symbolNames(r.expr)));
}

/**
 * Baseline 3: typed structural search. A record whose leakage key equals the
 * query's scores above every record that does not; symbol overlap orders within
 * each tier. A query or record with no expression scores zero structurally.
 *
 * @internal
 */
export function rankByStructure(query: RetrievalQuery, corpus: readonly CorpusRecord[]): Ranking {
  const qKey = query.expr === undefined ? undefined : leakageKey(query.expr);
  const qSyms = symbolNames(query.expr);
  return rankBy(corpus, (r) => {
    const structural = qKey !== undefined && r.expr !== undefined && leakageKey(r.expr) === qKey ? 1 : 0;
    return 2 * structural + jaccard(qSyms, symbolNames(r.expr));
  });
}

/**
 * Recall at depth k: the fraction of queries for which AT LEAST ONE correct
 * reference appears in the top k of its ranking.
 *
 * A query with no ranking counts as a MISS, never as absent from the
 * denominator: dropping it would raise recall by failing to answer. A query with
 * no correct reference in `truth` is an error in the answer key, and throws.
 *
 * @throws Error if `truth` lists no correct reference for some query.
 * @internal
 */
export function recallAtK(
  rankings: ReadonlyMap<string, Ranking>,
  truth: ReadonlyMap<string, readonly string[]>,
  k = 10,
): number {
  if (truth.size === 0) return Number.NaN;
  let hits = 0;
  for (const [queryId, correct] of truth) {
    if (correct.length === 0) throw new Error(`recallAtK: no correct reference for ${queryId}`);
    const top = (rankings.get(queryId) ?? []).slice(0, k);
    if (correct.some((c) => top.includes(c))) hits++;
  }
  return hits / truth.size;
}
