/**
 * Atlas Phase 6, S6.3 — link prediction over the typed model graph: ONE result,
 * stated as a hypothesis about the representation.
 *
 * Design note: `docs/planning/Atlas-Phase-6-Design.md` §1.
 *
 * The graph: every model in every registered family is a node; every
 * premise→conclusion pair of every bridge is an undirected edge. The test is
 * leave-one-bridge-out: remove a bridge's edges, then ask each predictor to rank
 * the conclusion among every model not already adjacent to the premise. A hit is
 * the held-out conclusion inside the top k.
 *
 * - **structural predictor** — common neighbours in the remaining graph, ties
 *   broken by sharing the premise's family, then by id;
 * - **text baseline** — word-token overlap between the models' dynamics and
 *   state-space descriptions, ties broken by id.
 *
 * ⚠ **What this result cannot carry.** The graph is small (24 models, 22 pairs)
 * and was curated by the same agent that runs the test, in-distribution. It is a
 * statement about how this representation behaves on its own content — not a
 * discovery claim, not a hub or gap claim, and not evidence about physics the
 * atlas does not contain. ROADMAP Phase 6 asks for it as a hypothesis test, and
 * that is its whole scope. Product A (`src/composition/discovery.ts`) is not
 * touched: a test pins that nothing under `src/atlas/` imports it.
 *
 * @module atlas/link-prediction
 * @internal
 */

import type { AtlasFamily } from './family.js';
import type { AtlasModel } from './model.js';

/** One held-out pair and whether each predictor recovered it. @internal */
export interface LinkPredictionTrial {
  readonly bridgeId: string;
  readonly premise: string;
  readonly conclusion: string;
  /** 1-based rank of the held-out conclusion; Infinity when it was not a candidate. */
  readonly structuralRank: number;
  readonly textRank: number;
  /** How many candidates the conclusion competed against. */
  readonly candidates: number;
}

/** The whole leave-one-bridge-out run. @internal */
export interface LinkPredictionResult {
  readonly k: number;
  readonly trials: readonly LinkPredictionTrial[];
  /**
   * Held-out pairs whose endpoints stay adjacent through ANOTHER bridge. Such a
   * pair is not a missing link — the conclusion cannot even be a candidate — so
   * it is excluded from the trials and counted here instead of silently.
   */
  readonly stillConnected: number;
  readonly structuralHits: number;
  readonly textHits: number;
  /**
   * The hit rate a RANDOM ranking would get: the mean over trials of
   * min(k, candidates)/candidates. On a small graph this is high, and a
   * predictor's recall means nothing until it is read against it.
   */
  readonly chanceRecall: number;
  /** Mean reciprocal rank of the held-out conclusion. */
  readonly structuralMrr: number;
  readonly textMrr: number;
}

const tokens = (text: string): Set<string> =>
  new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0));

const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

/** Rank candidates by descending score list (lexicographic), then ascending id. */
function rank(candidates: readonly string[], score: (id: string) => readonly number[]): string[] {
  return [...candidates].sort((x, y) => {
    const sx = score(x);
    const sy = score(y);
    for (let i = 0; i < sx.length; i++) if (sx[i] !== sy[i]) return sy[i]! - sx[i]!;
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

/**
 * Run leave-one-bridge-out link prediction over the families' model graph.
 *
 * @param families - the atlas families (normally `ATLAS_FAMILIES`).
 * @param k - the depth a hit must fall within (10, as pre-registered for recall).
 * @internal
 */
export function runLinkPrediction(families: readonly AtlasFamily[], k = 10): LinkPredictionResult {
  const models = new Map<string, AtlasModel>();
  for (const f of families) for (const m of f.models) models.set(m.id, m);
  const bridges = families.flatMap((f) => f.bridges);

  const edgesOf = (b: (typeof bridges)[number]): Array<readonly [string, string]> =>
    b.premises.map((p) => [p, b.conclusion] as const);

  const trials: LinkPredictionTrial[] = [];
  let stillConnected = 0;
  for (const held of bridges) {
    // The graph WITHOUT the held-out bridge.
    const adj = new Map<string, Set<string>>();
    for (const id of models.keys()) adj.set(id, new Set());
    for (const b of bridges) {
      if (b === held) continue;
      for (const [u, v] of edgesOf(b)) {
        adj.get(u)?.add(v);
        adj.get(v)?.add(u);
      }
    }
    for (const [premise, conclusion] of edgesOf(held)) {
      const pModel = models.get(premise);
      if (pModel === undefined) continue;
      const neighbours = adj.get(premise) ?? new Set<string>();
      if (neighbours.has(conclusion)) {
        stillConnected++;
        continue;
      }
      const candidates = [...models.keys()].filter((id) => id !== premise && !neighbours.has(id));
      const common = (id: string): number => {
        let n = 0;
        for (const x of adj.get(id) ?? []) if (neighbours.has(x)) n++;
        return n;
      };
      const structural = rank(candidates, (id) => [common(id), models.get(id)!.family === pModel.family ? 1 : 0]);
      const pText = tokens(`${pModel.dynamics} ${pModel.stateSpace}`);
      const text = rank(candidates, (id) => {
        const m = models.get(id)!;
        return [jaccard(pText, tokens(`${m.dynamics} ${m.stateSpace}`))];
      });
      const at = (list: string[]): number => {
        const i = list.indexOf(conclusion);
        return i < 0 ? Number.POSITIVE_INFINITY : i + 1;
      };
      trials.push({
        bridgeId: held.id,
        premise,
        conclusion,
        structuralRank: at(structural),
        textRank: at(text),
        candidates: candidates.length,
      });
    }
  }
  const mean = (xs: readonly number[]): number => (xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    k,
    trials,
    stillConnected,
    structuralHits: trials.filter((t) => t.structuralRank <= k).length,
    textHits: trials.filter((t) => t.textRank <= k).length,
    chanceRecall: mean(trials.map((t) => Math.min(k, t.candidates) / t.candidates)),
    structuralMrr: mean(trials.map((t) => 1 / t.structuralRank)),
    textMrr: mean(trials.map((t) => 1 / t.textRank)),
  };
}
