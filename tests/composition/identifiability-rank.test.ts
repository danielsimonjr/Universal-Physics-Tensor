/**
 * Identifiability by rank in log space (proposal 1).
 *
 * A monomial relation `y = C Π xᵢ^aᵢ` is one linear row
 * `log y − Σ aᵢ log xᵢ = log C`. Stacking the rows of every monomial edge with
 * a unit row per known quantity, the exact null space (MathTS
 * `rationalNullspace`) says which quantities are determined (their column
 * is 0 in every basis vector) and how many independent consistency checks the
 * system carries (distinct rows − rank). The forward closure fires an edge
 * only when every source is known, so it never uses a law in reverse and
 * counts a restated monomial twice; the rank does both exactly. The two
 * answers stay separate fields, and a law used in reverse is named so a
 * caller can refuse it (validity domains are stated on the sources).
 */
import { describe, expect, it } from 'vitest';
import {
  classifyIdentifiability,
  forwardClosure,
  identifiabilityByRank,
} from '../../src/composition/identifiability.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import type { BridgeEdge, Quantity } from '../../src/composition/index.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const L: Dimension = { ...DIMENSIONLESS, L: 1 };
const q = (name: string, dim: Dimension = L): Quantity => ({ name, symbol: name, dim, attributes: {} });
const sym = (name: string, dim: Dimension = L): ExprNode => ({ kind: 'symbol', name, dim });
const pow = (base: ExprNode, exp: string): ExprNode => ({ kind: 'op', op: '^', args: [base, sym(exp, DIMENSIONLESS)] });
const mul = (...args: ExprNode[]): ExprNode => ({ kind: 'op', op: '*', args });

/** A monomial edge `target = Π sources^exp`, with its symbolic form. */
const monomial = (id: string, target: string, exps: Record<string, number>): BridgeEdge => ({
  id,
  beId: null,
  kind: 'law',
  label: id,
  sources: Object.keys(exps).map((n) => q(n)),
  target: q(target),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: (i) => Object.entries(exps).reduce((acc, [n, e]) => acc * Math.pow(i[n]!, e), 1),
  symbolic: mul(...Object.entries(exps).map(([n, e]) => (e === 1 ? sym(n) : pow(sym(n), String(e))))),
  citation: 'synthetic',
});

/** A numeric-only edge: no symbolic form, so the rank cannot read it. */
const opaque = (id: string, sources: string[], target: string): BridgeEdge => ({
  id,
  beId: null,
  kind: 'law',
  label: id,
  sources: sources.map((n) => q(n)),
  target: q(target),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: () => 1,
  citation: 'synthetic',
});

const NO_IDENTS = { identifications: [] as const };

describe('identifiabilityByRank — a three-quantity chain with the anchor at the END', () => {
  // a → b (b = a²), b → c (c = b³). Knowing c alone.
  const chain = [monomial('ab', 'b', { a: 2 }), monomial('bc', 'c', { b: 3 })];

  it('the forward closure cannot reach a or b from c', () => {
    expect([...forwardClosure(chain, ['c'], [])].sort()).toEqual(['c']);
  });

  it('the rank determines all three, with both laws read in reverse and no surplus check', () => {
    const r = identifiabilityByRank(chain, ['c'], NO_IDENTS);
    expect([...r.determined].sort()).toEqual(['a', 'b', 'c']);
    expect(r.surplusChecks).toBe(0);
    expect([...r.usedInReverse].sort()).toEqual(['ab', 'bc']);
    expect([...r.monomialEdges].sort()).toEqual(['ab', 'bc']);
  });

  it('from the START nothing is reversed, and knowing both ends is one consistency check', () => {
    const fromStart = identifiabilityByRank(chain, ['a'], NO_IDENTS);
    expect([...fromStart.determined].sort()).toEqual(['a', 'b', 'c']);
    expect(fromStart.usedInReverse).toEqual([]);
    expect(fromStart.surplusChecks).toBe(0);
    const bothEnds = identifiabilityByRank(chain, ['a', 'c'], NO_IDENTS);
    expect(bothEnds.surplusChecks).toBe(1);
    expect(bothEnds.usedInReverse).toEqual([]);
  });

  it('classifyIdentifiability reports the union: determinable by rank, verdict exactly-determined, no forward derivation, the reversed laws named', () => {
    const r = classifyIdentifiability(chain, ['c'], 'a', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual([]);
    expect(r.determinable).toEqual(['a', 'b', 'c']);
    expect(r.rank.determinedByRankOnly).toEqual(['a', 'b']);
    expect([...r.rank.usedInReverse].sort()).toEqual(['ab', 'bc']);
    expect(r.blockingFrontier).toEqual([]);
  });
});

describe('a restated monomial adds a row but no surplus check', () => {
  // b = a² twice, under two ids, and once more as b² = a⁴ (the same relation, scaled).
  const twice = [monomial('law-1', 'b', { a: 2 }), monomial('law-2', 'b', { a: 2 })];
  const scaled = [...twice, monomial('law-3', 'b', { a: 2 })];

  it('rank: the duplicate row is not an independent check', () => {
    expect(identifiabilityByRank(twice, ['a'], NO_IDENTS).surplusChecks).toBe(0);
    expect(identifiabilityByRank(scaled, ['a'], NO_IDENTS).surplusChecks).toBe(0);
  });

  it('the forward count still over-counts (the documented over-count), and the two facts stay separate', () => {
    const r = classifyIdentifiability(twice, ['a'], 'b', NO_IDENTS);
    expect(r.verdict).toBe('over-determined');
    expect(r.surplusConstraints).toBe(1);
    expect(r.rank.surplusChecks).toBe(0);
  });

  it('a genuinely different second law IS a check: b = a² and b = a³ from a known a', () => {
    const r = identifiabilityByRank([monomial('law-1', 'b', { a: 2 }), monomial('law-4', 'b', { a: 3 })], ['a'], NO_IDENTS);
    expect(r.surplusChecks).toBe(1);
  });
});

describe('the exact count on a small fixture', () => {
  // Known {a, d}. b = a·d, c = b² (via two restated spellings), e = c/d, and an opaque edge d, e → f.
  const fixture = [
    monomial('ad-b', 'b', { a: 1, d: 1 }),
    monomial('b-c', 'c', { b: 2 }),
    monomial('b-c-again', 'c', { b: 2 }),
    monomial('cd-e', 'e', { c: 1, d: -1 }),
    opaque('de-f', ['d', 'e'], 'f'),
  ];

  it('rank: five quantities determined, one restatement, zero surplus; the opaque edge is not a row', () => {
    const r = identifiabilityByRank(fixture, ['a', 'd'], NO_IDENTS);
    expect([...r.determined].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(r.surplusChecks).toBe(0);
    expect(r.monomialEdges).not.toContain('de-f');
  });

  it('closure: the opaque edge still fires forward, so f is determinable by closure only', () => {
    const r = classifyIdentifiability(fixture, ['a', 'd'], 'f', NO_IDENTS);
    expect(r.verdict).toBe('exactly-determined');
    expect(r.derivations).toEqual(['de-f']);
    expect(r.determinable).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(r.rank.determined).not.toContain('f');
  });

  it('c is over-determined by the forward count (2 restated rows) and exactly determined by rank', () => {
    const r = classifyIdentifiability(fixture, ['a', 'd'], 'c', NO_IDENTS);
    expect(r.surplusConstraints).toBe(1);
    expect(r.rank.surplusChecks).toBe(0);
  });
});

describe('identifications stay directed', () => {
  // x ≡ y (from x to y). b = y². Knowing b alone: y is determined in reverse; x is NOT (the identification copies x → y only).
  const edges = [monomial('yb', 'b', { y: 2 })];
  const idents = { identifications: [{ from: 'x', to: 'y', rationale: 'synthetic' }] };

  it('from b, y is reversed into and x is not', () => {
    const r = identifiabilityByRank(edges, ['b'], idents);
    expect([...r.determined].sort()).toEqual(['b', 'y']);
  });

  it('from x, the identification feeds the rank: b is determined', () => {
    const r = identifiabilityByRank(edges, ['x'], idents);
    expect([...r.determined].sort()).toEqual(['b', 'x', 'y']);
  });
});

describe('on the live graphs', () => {
  it('the rank set contains the forward closure through the monomial edges on the catalog graph from {mass}', () => {
    const rank = identifiabilityByRank(CATALOG_GRAPH, ['mass']);
    const monomialIds = new Set(rank.monomialEdges);
    const throughMonomials = forwardClosure(CATALOG_GRAPH.filter((e) => monomialIds.has(e.id)), ['mass']);
    for (const name of throughMonomials) expect(rank.determined.includes(name), name).toBe(true);
    expect(rank.monomialEdges.length).toBeGreaterThan(50);
    expect(rank.surplusChecks).toBeGreaterThanOrEqual(0);
  });

  it('a law is read in reverse on the catalog: knowing the Hawking temperature determines the mass through be-42', () => {
    const r = identifiabilityByRank(CATALOG_GRAPH, ['hawking-temperature']);
    expect(r.determined.includes('mass')).toBe(true);
    expect(r.usedInReverse).toContain('be-42');
    const forward = forwardClosure(CATALOG_GRAPH, ['hawking-temperature']);
    expect(forward.has('mass')).toBe(false);
  });

  it('every canonical edge whose equation states a monomial is a row; the free-group entries are the ones left out', () => {
    const r = identifiabilityByRank(CANONICAL_GRAPH, []);
    const monomialIds = new Set(r.monomialEdges);
    const leftOut = CANONICAL_GRAPH.filter((e) => !monomialIds.has(e.id)).map((e) => e.id).sort();
    const freeGroup = CANONICAL_EQUATIONS.filter((ce) => ce.dimensional.monomial === null).map((ce) => ce.id).sort();
    expect(leftOut).toEqual(freeGroup);
    expect(freeGroup.length).toBeGreaterThan(0);
  });
});
