/**
 * Bridge-priority scorecard (src/composition/bridge-analysis.ts) — the
 * structural-decidability triage. Pins the tier partition, the
 * grounding/anchoring/complexity signals, and — load-bearing — that the
 * ranking is ORTHOGONAL to credibility (a highly-speculative bridge can
 * sit in Tier 1; established physics is not what is being ranked).
 *
 * Triage, NOT credibility. See docs/research/Bridge-Priority-Scorecard.md.
 */
import { describe, it, expect } from 'vitest';
import {
  bridgePriority,
  dimensionalFreedom,
  attemptDerivation,
  anchoringDistance,
} from '../../src/composition/bridge-analysis.js';
import {
  CATALOG_GRAPH,
  be11ZurekEdge,
  be16Edge,
  be37Edge,
  be42Edge,
  CATALOG_FULL_EDGES,
} from '../../src/composition/index.js';

const ALL_EDGES = CATALOG_GRAPH;

const board = bridgePriority(ALL_EDGES);
const byId = new Map(board.map((e) => [e.id, e]));

describe('bridge-priority — tier partition', () => {
  it('excludes established-confidence edges (they are the core)', () => {
    expect(board.find((e) => e.id === 'be-51')).toBeUndefined(); // lensing, established
    expect(board.find((e) => e.id === 'be-52')).toBeUndefined(); // perihelion, established
  });

  it('partitions the speculative bridges 8 / 5 / 19 across the three tiers', () => {
    const t: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const e of board) t[e.tier]++;
    // be-36 was tier 2 while the audit called (c_GW − c)/c grounded. The
    // prefactor −1 is the sample with v ≪ c, not a monomial. The formula
    // adds dimensionful terms, the bridge is isolated, and the tier is 3.
    // The 8 / 6 / 18 sentence is the record from before that classification.
    expect(t).toEqual({ 1: 8, 2: 5, 3: 19 });
  });

  it('is sorted best-first (non-decreasing tier)', () => {
    for (let i = 1; i < board.length; i++) {
      expect(board[i].tier).toBeGreaterThanOrEqual(board[i - 1].tier);
    }
  });
});

describe('bridge-priority — Tier 1 (anchored + grounded/tractable)', () => {
  it('promotes the anchored, recognized-equation bridges', () => {
    // grounded equation + anchored to the GR core
    expect(byId.get('be-16')?.tier).toBe(1); // Landauer (ln 2)
    expect(byId.get('be-12')?.tier).toBe(1); // thermal de Broglie (√2π)
    expect(byId.get('be-42-via-rs')?.tier).toBe(1); // Hawking via r_s (1/4π)
    expect(byId.get('be-16')?.grounding).toBe('grounded');
  });

  it('flags the data-confronted bridges (a CATALOG signal, not the engine)', () => {
    expect(byId.get('be-23')?.hasDataConfrontation).toBe(true); // Planckian
    expect(byId.get('be-36')?.hasDataConfrontation).toBe(true); // GW170817
  });
});

describe('bridge-priority — Tier 3 (isolated, multi-parameter)', () => {
  it('demotes the structurally isolated high-complexity bridges', () => {
    expect(byId.get('be-47')?.tier).toBe(3); // nucleosynthesis, complexity 6
    expect(byId.get('be-39')?.tier).toBe(3); // asymptotic safety, complexity 5
    expect(byId.get('be-47')?.anchoring).toBe(Infinity);
  });
});

describe('bridge-priority — the load-bearing caveat: triage ≠ credibility', () => {
  it('a HIGHLY-SPECULATIVE bridge sits in Tier 1', () => {
    // be-42-via-rs (Hawking) is highly-speculative as a bridge, yet Tier 1:
    // tier ranks structural decidability, not belief.
    const ht = byId.get('be-42-via-rs');
    expect(ht?.status).toBe('highly-speculative');
    expect(ht?.tier).toBe(1);
  });

  it('Tier 1 is not all "established"; Tier 3 is not all "highly-speculative"', () => {
    const t1 = board.filter((e) => e.tier === 1);
    const t3 = board.filter((e) => e.tier === 3);
    // Tier 1 contains highly-speculative entries; Tier 3 is mostly plain
    // speculative — status does not track tier.
    expect(t1.some((e) => e.status === 'highly-speculative')).toBe(true);
    expect(t3.filter((e) => e.status === 'speculative').length).toBeGreaterThan(
      t3.filter((e) => e.status === 'highly-speculative').length,
    );
  });
});

describe('bridge-analysis — component signals', () => {
  it('dimensionalFreedom matches the audit (perihelion=1, nucleosynthesis=6)', () => {
    expect(dimensionalFreedom(be37Edge)).toBe(1); // Shapiro
    expect(dimensionalFreedom(be16Edge)).toBe(0);
    expect(dimensionalFreedom(CATALOG_FULL_EDGES.find((e) => e.id === 'be-47')!)).toBe(6);
  });

  it('attemptDerivation separates grounded from empirical from decoy', () => {
    expect(attemptDerivation(be16Edge).status).toBe('derived');
    expect(attemptDerivation(be16Edge).cleanPrefactor).toBe(true); // ln 2
    expect(attemptDerivation(be42Edge).status).toBe('decoy'); // rest-mass temp
    expect(attemptDerivation(be11ZurekEdge).status).toBe('open'); // multi-param
  });

  it('anchoringDistance: an established core quantity is distance 0, isolated is ∞', () => {
    const be47 = CATALOG_FULL_EDGES.find((e) => e.id === 'be-47')!;
    expect(anchoringDistance(ALL_EDGES, be42Edge)).toBe(0); // shares `mass`
    expect(anchoringDistance(ALL_EDGES, be47)).toBe(Infinity); // nucleosynthesis, isolated
  });
});
