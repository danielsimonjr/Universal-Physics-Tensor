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
 *   state-space descriptions (`text-overlap.ts`), ties broken by id.
 *
 * **The recorded result stands.** The negative result (typed neighbourhood below text
 * overlap on twenty trials; NOTES.md, "Link prediction is NEGATIVE") is reproduced by
 * {@link runLinkPrediction} exactly as recorded and is not re-run for a better answer. What
 * was added beside it, never inside it: a seeded percentile-bootstrap interval on every
 * recall and MRR (MathTS `bootstrapCI`), a seeded permutation test on the two per-trial
 * reciprocal-rank vectors (MathTS `permutationTest`, stated for what it is), and McNemar's
 * exact p on the paired hits (`benchmark/stats.ts`). The Katz-index predictor
 * ({@link runKatzLinkPrediction}) is a SEPARATE result: every record it returns carries
 * `postHoc: true` and the label, and it is never a field of the recorded comparison.
 *
 * ⚠ **What this result cannot carry.** The graph is small (24 models, 22 pairs)
 * and was curated by the same agent that runs the test, in-distribution. It is a
 * statement about how this representation behaves on its own content — not a
 * discovery claim, not a hub or gap claim, and not evidence about physics the
 * atlas does not contain. ROADMAP Phase 6 asks for it as a hypothesis test, and
 * that is its whole scope. Product A (`src/composition/discovery.ts`) is not
 * touched: a test pins that nothing under `src/atlas/` imports it, and the Katz
 * predictor is not wired into discovery, whose candidates are in different
 * components by construction (every path score there is 0).
 *
 * @module atlas/link-prediction
 * @internal
 */

import { bootstrapCI, inv, permutationTest } from '@danielsimonjr/mathts-functions';
import type { AtlasFamily } from './family.js';
import type { AtlasModel } from './model.js';
import type { AtlasBridge } from './types.js';
import { jaccard, rankBy, tokens } from './text-overlap.js';
import { mcnemar } from './benchmark/stats.js';
import { meanOf } from '../numerical/statistics.js';

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

/** A percentile-bootstrap interval with the point estimate it brackets (MathTS `bootstrapCI`). @internal */
export interface BootstrapInterval {
  readonly estimate: number;
  readonly lower: number;
  readonly upper: number;
  /** The confidence level, 0.95. */
  readonly confidence: number;
}

/** The seeded intervals of the recorded comparison. @internal */
export interface LinkPredictionIntervals {
  /** The seed every resample used; stated so the interval is reproducible. */
  readonly seed: number;
  readonly resamples: number;
  readonly structuralRecall: BootstrapInterval;
  readonly textRecall: BootstrapInterval;
  readonly structuralMrr: BootstrapInterval;
  readonly textMrr: BootstrapInterval;
}

/** The seeded permutation test on the two per-trial reciprocal-rank vectors. @internal */
export interface ReciprocalRankPermutation {
  /** Mean structural reciprocal rank minus mean text reciprocal rank (the observed MRR difference). */
  readonly statistic: number;
  /** Two-tailed p from MathTS `permutationTest`. */
  readonly pValue: number;
  readonly seed: number;
  readonly resamples: number;
  /**
   * What the test is. MathTS has no paired permutation: `permutationTest` pools the two vectors
   * and re-splits them, so the trial pairing is not kept and the null is looser than a sign-flip
   * test's. The paired test on the hits is `mcnemarExactP`.
   */
  readonly kind: typeof PERMUTATION_KIND;
}

/** The statement of the permutation test's kind, so no reader takes it for a paired test. @internal */
export const PERMUTATION_KIND =
  'two-sample permutation of the reciprocal-rank vectors (pooled re-split; the pairing is not kept)' as const;

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
  /** Seeded bootstrap intervals on the four numbers above. */
  readonly intervals: LinkPredictionIntervals;
  /** The seeded permutation test on the per-trial reciprocal ranks. */
  readonly permutation: ReciprocalRankPermutation;
  /** McNemar's exact p on the paired hit table (both, structural only, text only, neither). */
  readonly mcnemarExactP: number;
}

/** The label every Katz record carries. @internal */
export const POST_HOC_LABEL = 'post hoc: added after the negative result was recorded' as const;

/** One held-out pair under the Katz-index predictor. @internal */
export interface KatzTrial {
  readonly bridgeId: string;
  readonly premise: string;
  readonly conclusion: string;
  /** 1-based rank of the held-out conclusion by Katz index; Infinity when it was not a candidate. */
  readonly katzRank: number;
  /** The Katz index K[premise][conclusion] = ((I − βA)⁻¹ − I)[premise][conclusion]; 0 when no path. */
  readonly katzScore: number;
  readonly candidates: number;
  readonly postHoc: true;
}

/** The Katz-index run: a separate, post-hoc result, never merged into the recorded comparison. @internal */
export interface KatzLinkPredictionResult {
  readonly postHoc: true;
  readonly label: typeof POST_HOC_LABEL;
  readonly k: number;
  /** The attenuation β = 1/(2·max degree), below the spectral bound 1/λ_max since λ_max ≤ max degree. */
  readonly beta: number;
  readonly trials: readonly KatzTrial[];
  readonly stillConnected: number;
  readonly katzHits: number;
  readonly katzMrr: number;
  readonly chanceRecall: number;
  readonly intervals: {
    readonly seed: number;
    readonly resamples: number;
    readonly recall: BootstrapInterval;
    readonly mrr: BootstrapInterval;
  };
}

/** The one seed every resample in this module uses, and the resample count. Stated, not hidden. */
const RESAMPLE_SEED = 20260924;
const RESAMPLES = 10000;

/** One leave-one-bridge-out query: the graph without the bridge, and the candidates. */
interface HoldOut {
  readonly held: AtlasBridge;
  readonly premise: string;
  readonly conclusion: string;
  readonly premiseModel: AtlasModel;
  /** The undirected graph WITHOUT the held-out bridge. */
  readonly adj: ReadonlyMap<string, ReadonlySet<string>>;
  readonly candidates: readonly string[];
}

/** Every held-out query of the families, and the pairs excluded as still connected. */
function holdOuts(families: readonly AtlasFamily[]): {
  readonly models: ReadonlyMap<string, AtlasModel>;
  readonly queries: readonly HoldOut[];
  readonly stillConnected: number;
} {
  const models = new Map<string, AtlasModel>();
  for (const f of families) for (const m of f.models) models.set(m.id, m);
  const bridges = families.flatMap((f) => f.bridges);
  const edgesOf = (b: AtlasBridge): Array<readonly [string, string]> => b.premises.map((p) => [p, b.conclusion] as const);

  const queries: HoldOut[] = [];
  let stillConnected = 0;
  for (const held of bridges) {
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
      const premiseModel = models.get(premise);
      if (premiseModel === undefined) continue;
      const neighbours = adj.get(premise) ?? new Set<string>();
      if (neighbours.has(conclusion)) {
        stillConnected++;
        continue;
      }
      const candidates = [...models.keys()].filter((id) => id !== premise && !neighbours.has(id));
      queries.push({ held, premise, conclusion, premiseModel, adj, candidates });
    }
  }
  return { models, queries, stillConnected };
}

/** 1-based position of `id` in a ranking; Infinity when absent. */
const rankOf = (list: readonly string[], id: string): number => {
  const i = list.indexOf(id);
  return i < 0 ? Number.POSITIVE_INFINITY : i + 1;
};

/** Seeded percentile bootstrap of the mean of per-trial values (a 0/1 hit, or a reciprocal rank). */
function bootstrapMean(values: readonly number[]): BootstrapInterval {
  const ci = bootstrapCI([...values], (sample) => meanOf(sample), {
    confidence: 0.95,
    resamples: RESAMPLES,
    seed: RESAMPLE_SEED,
  });
  return { estimate: ci.estimate, lower: ci.lower, upper: ci.upper, confidence: ci.confidence };
}

/** The mean of a trial statistic; NaN with no trials, as the recorded result always read it. */
const meanOrNaN = (xs: readonly number[]): number => (xs.length === 0 ? Number.NaN : meanOf(xs));

/**
 * Run leave-one-bridge-out link prediction over the families' model graph. The recorded
 * comparison (structural against text), with its seeded intervals and paired statistics.
 *
 * @param families - the atlas families (normally `ATLAS_FAMILIES`).
 * @param k - the depth a hit must fall within (10, as pre-registered for recall).
 * @internal
 */
export function runLinkPrediction(families: readonly AtlasFamily[], k = 10): LinkPredictionResult {
  const { models, queries, stillConnected } = holdOuts(families);
  const trials: LinkPredictionTrial[] = queries.map((q) => {
    const neighbours = q.adj.get(q.premise) ?? new Set<string>();
    const common = (id: string): number => {
      let n = 0;
      for (const x of q.adj.get(id) ?? []) if (neighbours.has(x)) n++;
      return n;
    };
    const structural = rankBy(q.candidates, (id) => [common(id), models.get(id)!.family === q.premiseModel.family ? 1 : 0]);
    const pText = tokens(`${q.premiseModel.dynamics} ${q.premiseModel.stateSpace}`);
    const text = rankBy(q.candidates, (id) => {
      const m = models.get(id)!;
      return [jaccard(pText, tokens(`${m.dynamics} ${m.stateSpace}`))];
    });
    return {
      bridgeId: q.held.id,
      premise: q.premise,
      conclusion: q.conclusion,
      structuralRank: rankOf(structural, q.conclusion),
      textRank: rankOf(text, q.conclusion),
      candidates: q.candidates.length,
    };
  });

  const structuralHit: number[] = trials.map((t) => (t.structuralRank <= k ? 1 : 0));
  const textHit: number[] = trials.map((t) => (t.textRank <= k ? 1 : 0));
  const structuralRR = trials.map((t) => 1 / t.structuralRank);
  const textRR = trials.map((t) => 1 / t.textRank);

  // The paired hit table: both, structural only, text only, neither.
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  trials.forEach((_, i) => {
    if (structuralHit[i] && textHit[i]) a++;
    else if (structuralHit[i]) b++;
    else if (textHit[i]) c++;
    else d++;
  });

  const permuted = permutationTest(structuralRR, textRR, (x, y) => meanOrNaN(x) - meanOrNaN(y), {
    resamples: RESAMPLES,
    seed: RESAMPLE_SEED,
  });

  return {
    k,
    trials,
    stillConnected,
    structuralHits: structuralHit.reduce((acc, x) => acc + x, 0),
    textHits: textHit.reduce((acc, x) => acc + x, 0),
    chanceRecall: meanOrNaN(trials.map((t) => Math.min(k, t.candidates) / t.candidates)),
    structuralMrr: meanOrNaN(structuralRR),
    textMrr: meanOrNaN(textRR),
    intervals: {
      seed: RESAMPLE_SEED,
      resamples: RESAMPLES,
      structuralRecall: bootstrapMean(structuralHit),
      textRecall: bootstrapMean(textHit),
      structuralMrr: bootstrapMean(structuralRR),
      textMrr: bootstrapMean(textRR),
    },
    permutation: {
      statistic: permuted.statistic,
      pValue: permuted.pValue,
      seed: RESAMPLE_SEED,
      resamples: RESAMPLES,
      kind: PERMUTATION_KIND,
    },
    mcnemarExactP: mcnemar({ a, b, c, d }).exactP,
  };
}

/** A square number matrix of order n, read back from MathTS `inv`, which types its result `unknown`. */
function squareMatrix(value: unknown, n: number): number[][] {
  if (!Array.isArray(value) || value.length !== n) {
    throw new TypeError(`inv did not return a ${n}×${n} matrix`);
  }
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== n || !row.every((x) => typeof x === 'number' && Number.isFinite(x))) {
      throw new TypeError(`inv did not return a ${n}×${n} matrix of finite numbers`);
    }
  }
  return value as number[][];
}

/**
 * The Katz index of the graph without the held-out bridge: K = (I − βA)⁻¹ − I through MathTS
 * `inv`, with β = 1/(2·max degree). The largest eigenvalue of a 0/1 adjacency is at most the
 * maximum degree, so β is below the spectral bound 1/λ_max and the series Σ βˡ Aˡ converges.
 * A graph with no edge has K = 0 everywhere, and β is stated as 0.5 (there is nothing to attenuate).
 */
function katzIndex(adj: ReadonlyMap<string, ReadonlySet<string>>, ids: readonly string[]): { K: number[][]; beta: number } {
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  let maxDegree = 0;
  for (const [u, neighbours] of adj) {
    const i = index.get(u);
    if (i === undefined) continue;
    maxDegree = Math.max(maxDegree, neighbours.size);
    for (const v of neighbours) {
      const j = index.get(v);
      if (j !== undefined) A[i][j] = 1;
    }
  }
  const beta = maxDegree === 0 ? 0.5 : 1 / (2 * maxDegree);
  const M = A.map((row, i) => row.map((x, j) => (i === j ? 1 : 0) - beta * x));
  const inverse = squareMatrix(inv(M), n);
  const K = inverse.map((row, i) => row.map((x, j) => (i === j ? x - 1 : x)));
  return { K, beta };
}

/**
 * The Katz-index predictor, SEPARATE from the recorded comparison and labelled post hoc: it was
 * added after the negative result was recorded, so its numbers are exploratory and are never
 * merged into that result. Ranks each candidate by K[premise][candidate] (paths of every length,
 * attenuated by β per step), ties by id. Not wired into discovery (`src/composition/`): Product A
 * candidates are in different components by construction, so every path score there is 0.
 *
 * @internal
 */
export function runKatzLinkPrediction(families: readonly AtlasFamily[], k = 10): KatzLinkPredictionResult {
  const { models, queries, stillConnected } = holdOuts(families);
  const ids = [...models.keys()];
  const index = new Map(ids.map((id, i) => [id, i]));
  let beta = Number.NaN;
  const trials: KatzTrial[] = queries.map((q) => {
    const katz = katzIndex(q.adj, ids);
    beta = katz.beta;
    const p = index.get(q.premise)!;
    const score = (id: string): number => katz.K[p][index.get(id)!];
    const ranked = rankBy(q.candidates, (id) => [score(id)]);
    return {
      bridgeId: q.held.id,
      premise: q.premise,
      conclusion: q.conclusion,
      katzRank: rankOf(ranked, q.conclusion),
      katzScore: q.candidates.includes(q.conclusion) ? score(q.conclusion) : 0,
      candidates: q.candidates.length,
      postHoc: true,
    };
  });
  const hit: number[] = trials.map((t) => (t.katzRank <= k ? 1 : 0));
  const rr = trials.map((t) => 1 / t.katzRank);
  return {
    postHoc: true,
    label: POST_HOC_LABEL,
    k,
    beta,
    trials,
    stillConnected,
    katzHits: hit.reduce((acc, x) => acc + x, 0),
    katzMrr: meanOrNaN(rr),
    chanceRecall: meanOrNaN(trials.map((t) => Math.min(k, t.candidates) / t.candidates)),
    intervals: { seed: RESAMPLE_SEED, resamples: RESAMPLES, recall: bootstrapMean(hit), mrr: bootstrapMean(rr) },
  };
}
