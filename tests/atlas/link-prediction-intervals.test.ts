/**
 * Link prediction with honest intervals, labelled post hoc (proposal 20).
 *
 * The recorded negative result (NOTES.md, "Link prediction is NEGATIVE"; the note
 * `docs/research/atlas-link-prediction.md`) STANDS: typed neighbourhood recall@10 14/20 = 0.70
 * and MRR 0.282 against text overlap 16/20 = 0.80 and 0.424 over twenty leave-one-bridge-out
 * trials. This file reproduces those exact numbers first, then asks for what the result never
 * carried: a seeded bootstrap interval on each recall and MRR, a seeded permutation test on the
 * per-trial reciprocal ranks, McNemar's exact p on the paired hits, and a SEPARATE Katz-index
 * predictor whose every result says it was added after the negative result was recorded.
 *
 * @module tests/atlas/link-prediction-intervals
 */
import { describe, expect, it } from 'vitest';
import { runKatzLinkPrediction, runLinkPrediction } from '../../src/atlas/link-prediction.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import type { AtlasFamily } from '../../src/atlas/family.js';
import type { AtlasBridge } from '../../src/atlas/types.js';
import type { AtlasModel } from '../../src/atlas/model.js';

const result = runLinkPrediction(ATLAS_FAMILIES);

describe('the recorded negative result is reproduced exactly', () => {
  it('14/20 = 0.70 and MRR 0.282 (typed neighbourhood) against 16/20 = 0.80 and MRR 0.424 (text)', () => {
    expect(result.trials).toHaveLength(20);
    expect(result.stillConnected).toBe(2);
    expect(result.structuralHits).toBe(14);
    expect(result.textHits).toBe(16);
    expect(result.structuralMrr.toFixed(3)).toBe('0.282');
    expect(result.textMrr.toFixed(3)).toBe('0.424');
    expect(result.chanceRecall.toFixed(3)).toBe('0.456');
  });
});

describe('every recall and MRR carries a seeded bootstrap interval', () => {
  it('states the seed and the resample count, and brackets the point estimate', () => {
    const { intervals } = result;
    expect(Number.isInteger(intervals.seed)).toBe(true);
    expect(intervals.resamples).toBeGreaterThanOrEqual(1000);
    for (const [ci, point] of [
      [intervals.structuralRecall, 14 / 20],
      [intervals.textRecall, 16 / 20],
      [intervals.structuralMrr, result.structuralMrr],
      [intervals.textMrr, result.textMrr],
    ] as const) {
      expect(ci.confidence).toBe(0.95);
      expect(ci.estimate).toBeCloseTo(point, 12);
      expect(ci.lower).toBeLessThanOrEqual(point);
      expect(ci.upper).toBeGreaterThanOrEqual(point);
      expect(ci.upper - ci.lower).toBeGreaterThan(0);
    }
  });

  it('the intervals, pinned once (seed 20260924, 10000 resamples): twenty trials are wide', () => {
    // A number here is a measurement, not a target. The two recall intervals overlap over most
    // of their width, which is what the recorded negative result looks like with its uncertainty.
    const f = (ci: { lower: number; upper: number }): string => `[${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]`;
    expect(result.intervals.seed).toBe(20260924);
    expect(result.intervals.resamples).toBe(10000);
    expect(f(result.intervals.structuralRecall)).toBe('[0.500, 0.900]');
    expect(f(result.intervals.textRecall)).toBe('[0.600, 0.950]');
    expect(f(result.intervals.structuralMrr)).toBe('[0.158, 0.430]');
    expect(f(result.intervals.textMrr)).toBe('[0.271, 0.587]');
  });
});

describe('the paired comparison, seeded', () => {
  it('a permutation test on the two per-trial reciprocal-rank vectors, stated for what it is, beside McNemar exact p', () => {
    const { permutation } = result;
    expect(permutation.statistic).toBeCloseTo(result.structuralMrr - result.textMrr, 12);
    expect(permutation.pValue).toBeGreaterThanOrEqual(0);
    expect(permutation.pValue).toBeLessThanOrEqual(1);
    expect(Number.isInteger(permutation.seed)).toBe(true);
    expect(permutation.kind).toBe('two-sample permutation of the reciprocal-rank vectors (pooled re-split; the pairing is not kept)');
    // Pinned once (seed 20260924, 10000 resamples): the MRR difference of −0.142 is not
    // distinguishable from a re-split, p = 0.205.
    expect(permutation.statistic.toFixed(3)).toBe('-0.142');
    expect(permutation.pValue.toFixed(3)).toBe('0.205');
    // McNemar on the paired hit table is the paired test; the note records 0.727.
    expect(result.mcnemarExactP.toFixed(3)).toBe('0.727');
  });

  it('is deterministic: a second run gives the same intervals and p-values', () => {
    expect(runLinkPrediction(ATLAS_FAMILIES)).toEqual(result);
  });
});

describe('the Katz-index predictor is separate and labelled post hoc', () => {
  const katz = runKatzLinkPrediction(ATLAS_FAMILIES);

  it('every Katz result carries postHoc: true and the label', () => {
    expect(katz.postHoc).toBe(true);
    expect(katz.label).toBe('post hoc: added after the negative result was recorded');
    expect(katz.trials).toHaveLength(20);
    for (const t of katz.trials) expect(t.postHoc).toBe(true);
    expect(katz.stillConnected).toBe(2);
  });

  it('reports its own recall and MRR with seeded intervals, and is not a field of the recorded result', () => {
    expect(katz.katzHits).toBeGreaterThanOrEqual(0);
    expect(katz.katzHits).toBeLessThanOrEqual(20);
    expect(katz.intervals.recall.estimate).toBeCloseTo(katz.katzHits / 20, 12);
    expect(katz.intervals.mrr.estimate).toBeCloseTo(katz.katzMrr, 12);
    expect(katz.intervals.seed).toBe(result.intervals.seed);
    expect(result).not.toHaveProperty('katzHits');
    expect(result).not.toHaveProperty('katz');
  });

  it('beta is per trial, below the spectral bound 1/λ_max through 1/(2·max degree), and the result states its range', () => {
    // Each held-out graph has its own maximum degree, so β is a property of the trial. The result
    // once reported one β, the last trial's; it now reports the range over the trials.
    const betas = katz.trials.map((t) => t.beta);
    for (const b of betas) {
      expect(b).toBeGreaterThan(0);
      expect(b).toBeLessThan(1);
      // 1/(2·d) for an integer max degree d.
      expect(Number.isInteger(1 / (2 * b))).toBe(true);
    }
    expect(katz.betaRange).toEqual([Math.min(...betas), Math.max(...betas)]);
    expect(katz).not.toHaveProperty('beta');
    // Measured: max degree 6 on fifteen held-out graphs and 5 on five, so β runs over [1/12, 1/10].
    expect(katz.betaRange[0]).toBeCloseTo(1 / 12, 12);
    expect(katz.betaRange[1]).toBeCloseTo(1 / 10, 12);
    expect(betas.filter((b) => Math.abs(b - 1 / 10) < 1e-12)).toHaveLength(5);
  });

  it('NEGATIVE RESULT, pinned once: on the atlas the Katz index recalls 8/20 = 0.40, below chance, MRR 0.086', () => {
    // A held-out cross-family pair has no path at all once its bridge is removed, so most
    // candidates tie at a Katz index of 0 and only the id breaks the tie. Paths beyond length
    // two do not rescue the typed graph on this content; the recorded negative result stands.
    const f = (ci: { lower: number; upper: number }): string => `[${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]`;
    expect(katz.katzHits).toBe(8);
    expect(katz.katzMrr.toFixed(3)).toBe('0.086');
    expect(katz.katzHits / 20).toBeLessThan(katz.chanceRecall);
    expect(f(katz.intervals.recall)).toBe('[0.200, 0.600]');
    expect(f(katz.intervals.mrr)).toBe('[0.070, 0.104]');
  });
});

describe('Katz sees a path of length three that the neighbourhood count cannot', () => {
  const model = (id: string): AtlasModel => ({
    id,
    family: 'toy',
    stateSpace: '',
    dynamics: id,
    observables: [],
    parameters: [],
    dimensionlessInputs: [],
    canonicalRefs: [],
    regime: { family: 'toy', inequalities: [], groupDefinitions: {} },
  });
  const bridge = (id: string, p: string, c: string): AtlasBridge => ({
    id,
    relation: 'derivation',
    premises: [p],
    conclusion: c,
    transformation: '',
    preserves: [],
    doesNotPreserve: [],
    sideConditions: [],
    regime: { family: 'toy', inequalities: [], groupDefinitions: {} },
    counterexamples: [],
    witnesses: [],
    citations: [],
    reviewStatus: 'proposed',
  });
  // p–u–v–c is a path of length three; `a` is isolated and sorts before `c`. Holding out p–c:
  // p and c share NO neighbour, so the neighbourhood count scores c and a alike (0) and the id
  // tie-break puts a first; the Katz index gives c the weight of its length-3 path and a none.
  const toy: AtlasFamily = {
    family: 'toy',
    models: ['p', 'u', 'v', 'c', 'a'].map(model),
    bridges: [bridge('pu', 'p', 'u'), bridge('uv', 'u', 'v'), bridge('vc', 'v', 'c'), bridge('pc', 'p', 'c')],
    rejections: [],
  };

  it('ranks the held-out conclusion above the isolated model; the neighbourhood count does not', () => {
    const structural = runLinkPrediction([toy]).trials.find((t) => t.bridgeId === 'pc');
    const katz = runKatzLinkPrediction([toy]).trials.find((t) => t.bridgeId === 'pc');
    expect(structural?.structuralRank).toBe(3); // v (one common neighbour), then a, then c
    expect(katz?.katzRank).toBe(2); // v (length 2), then c (length 3); a has no path
    expect(katz?.katzScore).toBeGreaterThan(0);
  });
});
