/**
 * D1 — the axis-compatibility falsifier (verdict `'axis-clash'`).
 *
 * A discovery candidate is an IDENTIFICATION (`a ≡ b`, one quantity, two
 * names): stated `scale`/`force` regime attributes must agree. Either side
 * silent on an axis — including a fold-conflict among identified
 * contributors — abstains that axis rather than clashing. Information is
 * annotation-only this phase (never falsifies, never enters `axisClashes`).
 * See docs/superpowers/specs/2026-07-02-discovery-hardening-phase2-design.md
 * D1.
 *
 * Controlled fixtures mirror `discovery.test.ts`'s pattern: a synthetic
 * two-edge graph (`a`/`b` already share a component, so the verdict is
 * `inert` absent an axis clash — an unambiguous baseline for "abstain
 * leaves the verdict unaffected"), with `quantityAttributes` injected via
 * `DiscoveryOptions` (same pattern as `representativeValues` in
 * `discovery-magnitude.test.ts`) so the gate is exercised independently of
 * the real (evolving) registry.
 */
import { describe, it, expect } from 'vitest';
import { vetLinkCandidate } from '../../src/composition/discovery.js';
import type { DiscoveryOptions } from '../../src/composition/discovery.js';
import type { LinkCandidate } from '../../src/composition/bridge-analysis.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import type { RegimeAttributes } from '../../src/composition/quantity.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

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
  domain: validityDomain('true'),
  evaluate,
  citation: 'synthetic',
});

const cand = (a: string, b: string): LinkCandidate => ({
  a,
  b,
  dim: '[dimensionless]',
  touchesCore: false,
  sameKind: false,
  sharedToken: null,
});

const noBase = [] as const;

// a and b already sit in one component (a → b), so absent an axis clash the
// verdict is deterministically 'inert' — the baseline every abstention case
// asserts is unchanged.
const baselineEdges = [edge('e1', ['x'], 'a', (i) => i['x'] * 2), edge('e2', ['a'], 'b', (i) => i['a'] * 3)];

const opts = (
  attrs: Readonly<Record<string, RegimeAttributes>>,
  extra: Partial<DiscoveryOptions> = {},
): DiscoveryOptions => ({
  groundTruth: { x: 2 },
  identifications: noBase,
  quantityAttributes: new Map(Object.entries(attrs)),
  ...extra,
});

describe('axis-compatibility gate — clash', () => {
  it('(a) both-stated scale clash: verdict axis-clash, score -1, pinned message', () => {
    const r = vetLinkCandidate(
      baselineEdges,
      cand('a', 'b'),
      opts({ a: { scale: 'quantum' }, b: { scale: 'cosmological' } }),
    );
    expect(r.verdict).toBe('axis-clash');
    expect(r.score).toBe(-1);
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['scale: quantum ≠ cosmological']);
  });

  it('(f) force-axis clash', () => {
    const r = vetLinkCandidate(
      baselineEdges,
      cand('a', 'b'),
      opts({ a: { force: 'gravitational' }, b: { force: 'electromagnetic' } }),
    );
    expect(r.verdict).toBe('axis-clash');
    expect(r.score).toBe(-1);
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['force: gravitational ≠ electromagnetic']);
  });
});

describe('axis-compatibility gate — agreement and abstention', () => {
  it('(b) both-stated agreement: not clashed, axisChecked true', () => {
    const r = vetLinkCandidate(
      baselineEdges,
      cand('a', 'b'),
      opts({ a: { scale: 'quantum' }, b: { scale: 'quantum' } }),
    );
    expect(r.verdict).toBe('inert'); // unaffected — no clash
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual([]);
  });

  it('(c) one side silent: abstains, axisChecked false, verdict unaffected', () => {
    const r = vetLinkCandidate(baselineEdges, cand('a', 'b'), opts({ a: { scale: 'quantum' } }));
    expect(r.verdict).toBe('inert');
    expect(r.axisChecked).toBe(false);
    expect(r.axisClashes).toEqual([]);
  });

  it('(d) both silent: abstains, axisChecked false, verdict unaffected', () => {
    const r = vetLinkCandidate(baselineEdges, cand('a', 'b'), opts({}));
    expect(r.verdict).toBe('inert');
    expect(r.axisChecked).toBe(false);
    expect(r.axisClashes).toEqual([]);
  });

  it('(g) information mismatch: NO clash — annotation only, never enters axisClashes', () => {
    const r = vetLinkCandidate(
      baselineEdges,
      cand('a', 'b'),
      opts({ a: { information: 'shannon' }, b: { information: 'von-neumann' } }),
    );
    expect(r.verdict).toBe('inert');
    expect(r.axisChecked).toBe(false); // neither gate axis (scale/force) had data
    expect(r.axisClashes).toEqual([]);
  });

  it('(h) fold-conflict abstention: contributors disagree on an axis → counts as unstated', () => {
    // Synthetic fold: 'x1' and 'x2' both fold ONTO 'shared', with conflicting
    // scale attributes. 'shared' itself states nothing. The resolver must
    // treat 'shared's effective scale as UNSTATED (conflict → abstain), even
    // though the OTHER endpoint ('other') states a value that would
    // otherwise clash against one of the two disagreeing contributors.
    const r = vetLinkCandidate(
      [edge('e1', ['q0'], 'shared', (i) => i['q0'])],
      cand('shared', 'other'),
      opts(
        { x1: { scale: 'quantum' }, x2: { scale: 'classical' }, other: { scale: 'quantum' } },
        {
          identifications: [
            { from: 'x1', to: 'shared', rationale: 'synthetic fold-conflict fixture' },
            { from: 'x2', to: 'shared', rationale: 'synthetic fold-conflict fixture' },
          ],
        },
      ),
    );
    expect(r.axisChecked).toBe(false);
    expect(r.axisClashes).toEqual([]);
  });

  it("(i) fold pull-through positive case: single fold contributor's scale reaches effective attributes", () => {
    // Synthetic fold: 'source' (with scale:'quantum') folds onto 'target'.
    // 'target' itself has no attributes. When comparing 'target' vs 'other'
    // (with scale:'classical'), the effective attributes for 'target' should
    // include the pulled-through 'quantum' from 'source', causing a clash.
    // This test FAILS if fold contributors are ignored (both sides abstain → no clash).
    const r = vetLinkCandidate(
      [edge('e1', ['q0'], 'target', (i) => i['q0'])],
      cand('target', 'other'),
      opts(
        { source: { scale: 'quantum' }, other: { scale: 'classical' } },
        {
          identifications: [
            { from: 'source', to: 'target', rationale: 'fold pull-through discriminator' },
          ],
        },
      ),
    );
    // Positive pull-through: axis checked and clash detected.
    expect(r.verdict).toBe('axis-clash');
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['scale: quantum ≠ classical']);
  });

  it("(j) fold pull-through force axis: verifies non-scale attribute pull-through", () => {
    // Same logic as case (i), but for the force axis to ensure the resolver
    // pulls through attributes uniformly across all axes.
    const r = vetLinkCandidate(
      [edge('e1', ['q0'], 'target', (i) => i['q0'])],
      cand('target', 'other'),
      opts(
        { source: { force: 'gravitational' }, other: { force: 'electromagnetic' } },
        {
          identifications: [
            { from: 'source', to: 'target', rationale: 'force axis pull-through discriminator' },
          ],
        },
      ),
    );
    // Positive pull-through on force axis.
    expect(r.verdict).toBe('axis-clash');
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['force: gravitational ≠ electromagnetic']);
  });
});

describe('axis-compatibility gate — precedence', () => {
  it('(e) magnitude-clash AND axis-clash both fire: magnitude-clash wins, axisClashes still populated', () => {
    const edges = [edge('e1', ['x'], 'derived', (i) => i['x'] * 1e6)];
    const r = vetLinkCandidate(
      edges,
      cand('derived', 'tiny'),
      opts(
        { derived: { scale: 'quantum' }, tiny: { scale: 'cosmological' } },
        {
          groundTruth: { x: 1e6 },
          representativeValues: { tiny: { value: 1, source: 'test' } },
        },
      ),
    );
    expect(r.verdict).toBe('magnitude-clash');
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['scale: quantum ≠ cosmological']);
  });

  it('(e2) contradictory AND axis-clash both fire: contradictory wins, axisClashes still populated', () => {
    // x → a → t (t = 20x); b → t (t = 5b) only fires once a≡b; disagrees.
    const edges = [
      edge('e1', ['x'], 'a', (i) => i['x'] * 2),
      edge('e3', ['a'], 't', (i) => i['a'] * 10),
      edge('e4', ['b'], 't', (i) => i['b'] * 5),
    ];
    const r = vetLinkCandidate(
      edges,
      cand('a', 'b'),
      opts({ a: { scale: 'quantum' }, b: { scale: 'cosmological' } }, { groundTruth: { x: 1 } }),
    );
    expect(r.verdict).toBe('contradictory');
    expect(r.axisChecked).toBe(true);
    expect(r.axisClashes).toEqual(['scale: quantum ≠ cosmological']);
  });
});
