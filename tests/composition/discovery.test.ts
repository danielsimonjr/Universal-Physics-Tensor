/**
 * Direction 2 — the discovery loop (vet link candidates through the
 * inference suite). Controlled fixtures pin the three verdicts:
 *   - promising      — the identification merges two components AND unlocks
 *                      new determinable quantities, staying consistent.
 *   - contradictory  — the identification makes a node over-determined and
 *                      its two derivations DISAGREE (a falsification).
 *   - inert          — consistent but structurally idle.
 * The real-graph block pins the funnel over CATALOG_GRAPH.
 */
import { describe, it, expect } from 'vitest';
import {
  vetLinkCandidate,
  rankDiscoveries,
  buildDiscoveryContext,
  vetInContext,
} from '../../src/composition/discovery.js';
import { forwardClosure } from '../../src/composition/identifiability.js';
import { retrodict } from '../../src/composition/retrodiction.js';
import {
  proposeLinkCandidates,
  type LinkCandidate,
} from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { CENSUS } from '../helpers/census.js';

const q = (name: string): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: {},
});

const edge = (
  id: string,
  sourceNames: string[],
  targetName: string,
  evaluate: (i: Record<string, number>) => number,
): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: sourceNames.map(q),
  target: q(targetName),
  confidence: 'speculative',
  domain: { description: 'any', predicate: () => true },
  evaluate,
  citation: 'synthetic',
});

const cand = (a: string, b: string): LinkCandidate => ({
  a,
  b,
  dim: '[energy]',
  touchesCore: false,
  sameKind: false,
  sharedToken: null,
});

const noBase = { identifications: [] as const };

describe('vetLinkCandidate — controlled verdicts', () => {
  it('PROMISING: merges two components and unlocks new quantities', () => {
    // chain 1: x → a ; chain 2: b → y. Identifying a≡b bridges them.
    const edges = [
      edge('e1', ['x'], 'a', (i) => i['x'] * 2),
      edge('e2', ['b'], 'y', (i) => i['b'] * 3),
    ];
    const r = vetLinkCandidate(edges, cand('a', 'b'), {
      groundTruth: { x: 2 },
      ...noBase,
    });
    expect(r.mergesComponents).toBe(true);
    expect(r.unlocksFromAnchor).toEqual(['b', 'y']);
    expect(r.numericallyConsistent).toBe(true);
    expect(r.verdict).toBe('promising');
    expect(r.score).toBeGreaterThan(0);
  });

  it('CONTRADICTORY: the identification makes a node disagree with itself', () => {
    // x → a → t (t = 20x). A second route b → t (t = 5b) only fires once
    // a≡b feeds b = a = 2x, giving t = 10x ≠ 20x.
    const edges = [
      edge('e1', ['x'], 'a', (i) => i['x'] * 2),
      edge('e3', ['a'], 't', (i) => i['a'] * 10),
      edge('e4', ['b'], 't', (i) => i['b'] * 5),
    ];
    const r = vetLinkCandidate(edges, cand('a', 'b'), {
      groundTruth: { x: 1 },
      ...noBase,
    });
    expect(r.numericallyConsistent).toBe(false);
    expect(r.inconsistentNodes).toContain('t');
    expect(r.verdict).toBe('contradictory');
    expect(r.score).toBeLessThan(0);
  });

  describe('a base-graph inconsistency is the graph\'s fact, not every candidate\'s (9.0.0 audit §4 C4)', () => {
    // t is already over-determined from x and its two routes disagree (2x vs 3x)
    // before any hypothesis. That is a finding about the base graph, which
    // `retrodict` reports. A candidate is `contradictory` only for an
    // inconsistency the HYPOTHESIS creates: inconsistent(hyp) minus
    // inconsistent(base).
    const base = [
      edge('e1', ['x'], 't', (i) => i['x'] * 2),
      edge('e2', ['x'], 't', (i) => i['x'] * 3),
    ];

    it('outside the anchor closure the identification cannot fire, so it is inert, not contradictory', () => {
      const edges = [...base, edge('e3', ['p'], 'r', (i) => i['p'])];
      expect(retrodict(edges, { x: 1 }, noBase).allConsistent).toBe(false); // the base fact
      const r = vetLinkCandidate(edges, cand('p', 'q'), { groundTruth: { x: 1 }, ...noBase });
      expect(r.numericallyConsistent).toBe(true);
      expect(r.inconsistentNodes).toEqual([]);
      expect(r.verdict).toBe('inert');
    });

    it('inside the closure, a hypothesis that adds no disagreement is not contradictory either', () => {
      // x → a; b → y. a≡b only unlocks y; t's disagreement is untouched.
      const edges = [...base, edge('e3', ['x'], 'a', (i) => i['x'] * 2), edge('e4', ['b'], 'y', (i) => i['b'] * 3)];
      const r = vetLinkCandidate(edges, cand('a', 'b'), { groundTruth: { x: 1 }, ...noBase });
      expect(r.numericallyConsistent).toBe(true);
      expect(r.inconsistentNodes).toEqual([]);
      expect(r.verdict).toBe('promising');
    });

    it('inside the closure, a hypothesis that creates a NEW disagreement is contradictory, and names only that node', () => {
      // x → a → u (u = 20x); b → u (u = 5b). a≡b gives b = 2x, u = 10x ≠ 20x: new.
      const edges = [
        ...base,
        edge('e3', ['x'], 'a', (i) => i['x'] * 2),
        edge('e4', ['a'], 'u', (i) => i['a'] * 10),
        edge('e5', ['b'], 'u', (i) => i['b'] * 5),
      ];
      const r = vetLinkCandidate(edges, cand('a', 'b'), { groundTruth: { x: 1 }, ...noBase });
      expect(r.numericallyConsistent).toBe(false);
      expect(r.inconsistentNodes).toEqual(['u']);
      expect(r.verdict).toBe('contradictory');
    });
  });

  it('INERT: consistent but a and b are already in one component', () => {
    const edges = [
      edge('e1', ['x'], 'a', (i) => i['x'] * 2),
      edge('e2', ['a'], 'b', (i) => i['a'] * 3),
    ];
    const r = vetLinkCandidate(edges, cand('a', 'b'), {
      groundTruth: { x: 2 },
      ...noBase,
    });
    expect(r.mergesComponents).toBe(false);
    expect(r.unlocksFromAnchor).toEqual([]);
    expect(r.numericallyConsistent).toBe(true);
    expect(r.verdict).toBe('inert');
  });
});

describe('vetLinkCandidate — anchor-derived magnitude fallback', () => {
  // A quantity with no static representative value still has a definite
  // magnitude AT THE ANCHOR if the graph can forward-evaluate it; the gate
  // uses that instead of abstaining.
  it('falsifies a clash using a graph-derived (anchor) value for one side', () => {
    // 'derived' = 1e6 · x at the anchor x = 1e6 → 1e12, vs static 'tiny' = 1.
    const edges = [edge('e1', ['x'], 'derived', (i) => i['x'] * 1e6)];
    const r = vetLinkCandidate(edges, cand('derived', 'tiny'), {
      groundTruth: { x: 1e6 },
      representativeValues: { tiny: { value: 1, source: 'test' } },
      ...noBase,
    });
    expect(r.magnitudeChecked).toBe(true);
    expect(r.magnitudeUsedAnchor).toBe(true);
    expect(r.ordersApart).toBeCloseTo(12, 6);
    expect(r.verdict).toBe('magnitude-clash');
  });

  it('still abstains when the non-static side is not anchor-reachable', () => {
    const edges = [edge('e1', ['x'], 'derived', (i) => i['x'] * 2)];
    const r = vetLinkCandidate(edges, cand('derived', 'unreachable'), {
      groundTruth: { x: 1 },
      representativeValues: {},
      ...noBase,
    });
    expect(r.magnitudeChecked).toBe(false);
    expect(r.magnitudeUsedAnchor).toBe(false);
  });

  it('prefers the sourced static value over the anchor value', () => {
    // 'a' is anchor-reachable (=100) but ALSO has a static entry (=1e-30);
    // the static value wins, producing a clash against b=1.
    const edges = [edge('e1', ['x'], 'a', (i) => i['x'] * 100)];
    const r = vetLinkCandidate(edges, cand('a', 'b'), {
      groundTruth: { x: 1 },
      representativeValues: {
        a: { value: 1e-30, source: 'static' },
        b: { value: 1, source: 'static' },
      },
      ...noBase,
    });
    expect(r.magnitudeUsedAnchor).toBe(false);
    expect(r.ordersApart).toBeCloseTo(30, 6);
    expect(r.verdict).toBe('magnitude-clash');
  });

  // Round-2 MED: the static-table path lacked the `isFinite && !=0` gate the
  // anchor path had, so a 0/∞/NaN table entry spoofed or silently disabled the
  // falsifier (log10(0) = -∞ → a spurious clash).
  it('abstains when a static representative value is zero', () => {
    const edges = [edge('e1', ['x'], 'a', (i) => i['x'] * 2)];
    const r = vetLinkCandidate(edges, cand('zero', 'other'), {
      groundTruth: { x: 1 },
      representativeValues: {
        zero: { value: 0, source: 'test' },
        other: { value: 1, source: 'test' },
      },
      ...noBase,
    });
    expect(r.magnitudeChecked).toBe(false);
    expect(r.verdict).not.toBe('magnitude-clash');
  });

  it('abstains when a static representative value is non-finite', () => {
    const edges = [edge('e1', ['x'], 'a', (i) => i['x'] * 2)];
    const r = vetLinkCandidate(edges, cand('inf', 'other'), {
      groundTruth: { x: 1 },
      representativeValues: {
        inf: { value: Infinity, source: 'test' },
        other: { value: 1, source: 'test' },
      },
      ...noBase,
    });
    expect(r.magnitudeChecked).toBe(false);
    expect(r.verdict).not.toBe('magnitude-clash');
  });
});

describe('vetLinkCandidate — generic↔specialization (subsuming) bar', () => {
  it('bars a token-subset identification from promising (demotes to inert)', () => {
    // x → mass ; reference-mass → y. Identifying mass ≡ reference-mass would
    // merge + unlock, but mass ⊂ reference-mass is tautological.
    const edges = [
      edge('e1', ['x'], 'mass', (i) => i['x'] * 2),
      edge('e2', ['reference-mass'], 'y', (i) => i['reference-mass'] * 3),
    ];
    const r = vetLinkCandidate(edges, cand('mass', 'reference-mass'), {
      groundTruth: { x: 2 },
      representativeValues: {},
      ...noBase,
    });
    expect(r.subsuming).toBe(true);
    expect(r.mergesComponents).toBe(true);
    expect(r.unlocksFromAnchor.length).toBeGreaterThan(0);
    expect(r.verdict).toBe('inert');
    expect(r.score).toBe(0);
  });

  it('does NOT bar a partial-token pair (radius ≟ radius of different kinds)', () => {
    const r = vetLinkCandidate([], cand('schwarzschild-radius', 'foerster-radius'), {
      representativeValues: {},
      ...noBase,
    });
    expect(r.subsuming).toBe(false);
  });
});

describe('rankDiscoveries — real CATALOG_GRAPH funnel', () => {
  const ranked = rankDiscoveries(CATALOG_GRAPH);

  it('vets every proposed candidate and tags each with a verdict', () => {
    // 191 is the record from before be-74..76.
    // 199 is the record from before be-77..87.
    // 389 is the record from before be-88..102.
    // 710 is the record from before be-103..125.
    // 1525 is the record from before be-126..133.
    // 1964 is the record from before be-134..146.
    // 2518 is the record from before be-147..170.
    // 4196 is the record from before be-33 and be-88 dropped the sources their formulas never read.
    expect(ranked.length).toBe(CENSUS.discovery.catalog.total);
    const verdicts = new Set(ranked.map((r) => r.verdict));
    for (const v of verdicts) {
      expect(['promising', 'inert', 'contradictory', 'magnitude-clash', 'axis-clash']).toContain(v);
    }
  });

  it('is ranked promising-first, then by score (non-increasing within a verdict)', () => {
    const RANK = {
      promising: 0,
      inert: 1,
      'magnitude-clash': 2,
      contradictory: 3,
      'axis-clash': 4,
    } as const;
    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1];
      const cur = ranked[i];
      expect(RANK[prev.verdict]).toBeLessThanOrEqual(RANK[cur.verdict]);
      if (prev.verdict === cur.verdict) {
        expect(prev.score).toBeGreaterThanOrEqual(cur.score);
      }
    }
  });

  it('contradictory candidates carry the falsifying node and never rank promising', () => {
    for (const r of ranked) {
      if (r.verdict === 'contradictory') {
        expect(r.numericallyConsistent).toBe(false);
        expect(r.inconsistentNodes.length).toBeGreaterThan(0);
      }
    }
  });

  const find = (a: string, b: string) =>
    ranked.find(
      (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
    );

  it('anchor-derived magnitudes falsify scale-clash identifications', () => {
    // schwarzschild-radius (~3 km at M_sun) is not in the static table but is
    // anchor-reachable; identifying it with a 5 nm Förster radius is a clash.
    const sw = find('schwarzschild-radius', 'foerster-radius');
    expect(sw?.verdict).toBe('magnitude-clash');
    expect(sw?.magnitudeUsedAnchor).toBe(true);
    // mass = M_sun vs the Planck mass (~2e-8 kg) — a 38-order clash.
    const mp = find('mass', 'planck-mass');
    expect(mp?.verdict).toBe('magnitude-clash');
    expect(mp?.magnitudeUsedAnchor).toBe(true);
  });

  // Persona finding L3 (2026-09-25): thermal-wavelength ≟ planck-length "passed" the magnitude
  // gate at 1.1 orders. At the anchor the temperature is the Hawking temperature of the anchor
  // mass, and h/√(2π M k_B T_H) = 4π ℓ_P EXACTLY for every M (log10 4π = 1.099), so the match is
  // an identity of the graph, not evidence. Checked at M = 1 kg, 1e12 kg and M_sun: ratio 12.566.
  it('an anchor-invariant magnitude ratio is flagged, not counted as a pass', () => {
    const tp = find('thermal-wavelength', 'planck-length');
    expect(tp?.magnitudeUsedAnchor).toBe(true);
    // 3 decimals: planck-length comes from the representative-value table as 1.616e-35, and
    // log10(1.616255 / 1.616) = 6.9e-5 decades is that rounding, not a physics difference.
    expect(tp?.ordersApart).toBeCloseTo(Math.log10(4 * Math.PI), 3);
    expect(tp?.magnitudeAnchorInvariant).toBe(true);
  });

  it('control: an anchor-derived ratio that MOVES with the anchor is not flagged', () => {
    // r_s ∝ M while ℓ_P is a constant: rescaling the anchor moves the ratio.
    const sp = find('schwarzschild-radius', 'planck-length');
    expect(sp?.magnitudeUsedAnchor).toBe(true);
    expect(sp?.magnitudeAnchorInvariant).toBe(false);
  });

  it('generic↔specialization identifications are barred from promising', () => {
    const rm = find('mass', 'reference-mass');
    expect(rm?.subsuming).toBe(true);
    expect(rm?.verdict).not.toBe('promising');
  });

  it('curated BE-24/BE-26 scales falsify the tunnelling/FRET length clashes', () => {
    // barrier-width (~Å) and donor-acceptor-distance (~nm) now have sourced
    // values, so identifying them with the km-scale Schwarzschild radius clashes.
    for (const q of ['barrier-width', 'donor-acceptor-distance']) {
      const r = find('schwarzschild-radius', q);
      expect(r?.verdict, q).toBe('magnitude-clash');
    }
  });

  it('no candidate is BOTH promising and subsuming', () => {
    for (const r of ranked) {
      if (r.verdict === 'promising') expect(r.subsuming).toBe(false);
    }
  });
});

describe('rankDiscoveries — one shared context', () => {
  // rankDiscoveries builds the candidate-invariant context once and vets every
  // candidate in it; vetLinkCandidate builds a fresh one per call. The two
  // agree exactly when the build is a function of (edges, opts) and vetting
  // never mutates the context, so those two facts are what this block checks.
  // The record from before this change vetted all 4196 candidates through
  // vetLinkCandidate, rebuilding the context (a retrodiction, two forward
  // evaluations, the components and the closure, about 32 ms) once per
  // candidate: 158 s on Node 22 and 227 s on the CI runner, under a 300 s cap.
  const candidates = proposeLinkCandidates(CATALOG_GRAPH);
  const byPair = (x: { a: string; b: string; dim: string }, y: { a: string; b: string; dim: string }) =>
    x.a.localeCompare(y.a) || x.b.localeCompare(y.b) || x.dim.localeCompare(y.dim);

  it('two builds of the context are equal', () => {
    expect(buildDiscoveryContext(CATALOG_GRAPH, {})).toEqual(buildDiscoveryContext(CATALOG_GRAPH, {}));
  });

  it('vetting every candidate leaves the shared context unchanged, and rankDiscoveries is that vetting', () => {
    const ctx = buildDiscoveryContext(CATALOG_GRAPH, {});
    const before = structuredClone(ctx);
    const shared = candidates.map((c) => vetInContext(CATALOG_GRAPH, c, ctx)).sort(byPair);
    expect(ctx).toEqual(before);
    expect(rankDiscoveries(CATALOG_GRAPH).slice().sort(byPair)).toEqual(shared);
  });

  it('vetLinkCandidate, with its own context, agrees on the first candidate of every verdict', () => {
    const ranked = rankDiscoveries(CATALOG_GRAPH);
    const firsts = new Map<string, (typeof ranked)[number]>();
    for (const r of ranked) if (!firsts.has(r.verdict)) firsts.set(r.verdict, r);
    expect(firsts.size).toBeGreaterThan(2);
    for (const r of firsts.values()) {
      const c = candidates.find((x) => x.a === r.a && x.b === r.b && x.dim === r.dim)!;
      expect(vetLinkCandidate(CATALOG_GRAPH, c), `${r.a} ≡ ${r.b}`).toEqual(r);
    }
  });

  it('an identification with neither endpoint in the anchor closure does not move the closure', () => {
    // vetInContext reuses the base retrodiction for such a candidate. The
    // closure is the determinable set retrodiction checks; it stays the base
    // closure for every one of these candidates.
    const ctx = buildDiscoveryContext(CATALOG_GRAPH, {});
    const outside = candidates.filter((c) => !ctx.closureBase.has(c.a) && !ctx.closureBase.has(c.b));
    expect(outside.length).toBeGreaterThan(0);
    const base = [...ctx.closureBase].sort();
    for (const c of outside) {
      const withHyp = [
        ...ctx.baseIdents,
        { from: c.a, to: c.b, rationale: 'test' },
        { from: c.b, to: c.a, rationale: 'test' },
      ];
      expect([...forwardClosure(CATALOG_GRAPH, ctx.anchor, withHyp)].sort(), `${c.a} ≡ ${c.b}`).toEqual(base);
    }
  });

  it('a full retrodiction agrees with the reused base report on evenly spaced candidates outside the closure', () => {
    const ctx = buildDiscoveryContext(CATALOG_GRAPH, {});
    const outside = candidates.filter((c) => !ctx.closureBase.has(c.a) && !ctx.closureBase.has(c.b));
    const step = Math.max(1, Math.floor(outside.length / 24));
    for (let i = 0; i < outside.length; i += step) {
      const c = outside[i]!;
      const report = retrodict(CATALOG_GRAPH, ctx.groundTruth, {
        identifications: [
          ...ctx.baseIdents,
          { from: c.a, to: c.b, rationale: 'test' },
          { from: c.b, to: c.a, rationale: 'test' },
        ],
      });
      const inconsistent = report.results.filter((r) => r.outcome === 'inconsistent').map((r) => r.target).sort();
      expect([report.allConsistent, inconsistent], `${c.a} ≡ ${c.b}`).toEqual([
        ctx.baseNumericallyConsistent,
        [...ctx.baseInconsistentNodes],
      ]);
    }
  });
});
