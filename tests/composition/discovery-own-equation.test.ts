/**
 * The magnitude gate's own-equation source (option 2 of the owner's decision of 2026-10-16, "Both").
 *
 * A quantity with no sourced table value and no no-anchor constant value, reached by an edge whose
 * every source is valued from the table or the constants, takes that edge's own evaluation as its
 * magnitude, with a σ in decades propagated through the edge's log-elasticities. The gate uses it
 * only when σ ≤ the table's own one decade; two edges that disagree give no value. The Hubble
 * distance is the one quantity a candidate uses that the mechanism reaches on today's graphs; the
 * table also states it (part (a) of the decision), so the mechanism is tested with that row removed.
 *
 * @module tests/composition/discovery-own-equation
 */
import { describe, it, expect } from 'vitest';
import { buildDiscoveryContext, rankDiscoveries, vetLinkCandidate } from '../../src/composition/discovery.js';
import type { DiscoveryOptions, VettedCandidate } from '../../src/composition/discovery.js';
import type { LinkCandidate } from '../../src/composition/bridge-analysis.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { deriveProposedBridges } from '../../src/composition/proposed-bridges.js';
import { describeGrounding } from '../../src/composition/grounding.js';
import { DERIVED_AGREEMENT, deriveOwnEquationMagnitudes } from '../../src/composition/own-equation-magnitude.js';
import { REPRESENTATIVE_VALUES } from '../../src/composition/representative-values.js';
import type { RepresentativeValue } from '../../src/composition/representative-values.js';
import { C_SI } from '../../src/core/constants.js';
import { DIMENSIONLESS, ENERGY, LENGTH } from '../../src/dimensional/types.js';

const pair = (c: Pick<VettedCandidate, 'a' | 'b'>): string => `${c.a} ≟ ${c.b}`;
const find = (rows: readonly VettedCandidate[], a: string, b: string): VettedCandidate => {
  const row = rows.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
  if (row === undefined) throw new Error(`no candidate ${a} ≟ ${b}`);
  return row;
};

/** The real table without part (a)'s row, so the Hubble distance has to come from its own equation. */
const WITHOUT_HUBBLE_ROW: Readonly<Record<string, RepresentativeValue>> = Object.fromEntries(
  Object.entries(REPRESENTATIVE_VALUES).filter(([name]) => name !== 'hubble-distance'),
);

/** The three Hubble rows on the canonical graph, with the orders the gate measures (|Δ log10|). */
const HUBBLE_ROWS = [
  { a: 'bohr-radius', b: 'hubble-distance', orders: 36.41 },
  { a: 'compton-wavelength', b: 'hubble-distance', orders: 37.75 },
  { a: 'hubble-distance', b: 'peak-wavelength', orders: 21.46 },
] as const;

/** The four proposals the Hubble identifications derived before the gate could see the distance. */
const HUBBLE_PROPOSALS = [
  'IC-bohr-radius--hubble-distance--hubble-rate',
  'IC-classical-electron-radius--hubble-distance--hubble-rate',
  'IC-compton-wavelength-full--hubble-distance--hubble-rate',
  'IC-hubble-distance--peak-wavelength--temperature',
] as const;

describe('the Hubble distance has a magnitude (the table row, part (a))', () => {
  const ranked = rankDiscoveries([...CANONICAL_GRAPH]);
  it.each(HUBBLE_ROWS)('$a ≟ $b is a magnitude clash on the canonical graph', ({ a, b, orders }) => {
    const row = find(ranked, a, b);
    expect(row.verdict, pair(row)).toBe('magnitude-clash');
    expect(row.magnitudeChecked).toBe(true);
    expect(row.ordersApart!).toBeCloseTo(orders, 1);
    // the table states it, so nothing was derived from an equation
    expect(row.magnitudeDerived).toEqual([]);
  });
  it('the four Hubble proposals are no longer derived', () => {
    const ids = deriveProposedBridges(ranked).map((p) => p.id);
    for (const id of HUBBLE_PROPOSALS) expect(ids, id).not.toContain(id);
    // a positive control: the funnel still derives proposals on this graph
    expect(ids.length).toBeGreaterThan(0);
  });
  it('the table value is c/H0 at the table\'s own hubble-rate', () => {
    const row = REPRESENTATIVE_VALUES['hubble-distance'];
    expect(row).toBeDefined();
    expect(row!.value / (C_SI / REPRESENTATIVE_VALUES['hubble-rate']!.value)).toBeCloseTo(1, 2);
    expect(row!.sigmaDecades).toBeUndefined();
  });
});

describe('the mechanism, with the Hubble row removed (part (b))', () => {
  const opts: DiscoveryOptions = { representativeValues: WITHOUT_HUBBLE_ROW };
  const derivedRanked = rankDiscoveries([...CANONICAL_GRAPH], opts);
  const tableRanked = rankDiscoveries([...CANONICAL_GRAPH]);

  it('derives the Hubble distance from CE-hubble-distance, c/H0, at one decade', () => {
    const ctx = buildDiscoveryContext([...CANONICAL_GRAPH], opts);
    const d = ctx.derivedMagnitudes.values.get('hubble-distance');
    expect(d).toBeDefined();
    expect(d!.edge).toBe('CE-hubble-distance');
    expect(d!.inputs).toEqual(['hubble-rate']);
    expect(d!.value / (C_SI / 2.2e-18)).toBeCloseTo(1, 12);
    expect(d!.sigmaDecades).toBeCloseTo(1, 9);
  });

  it.each(HUBBLE_ROWS)('$a ≟ $b clashes from the derived value, at the table run\'s p', ({ a, b, orders }) => {
    const derived = find(derivedRanked, a, b);
    const table = find(tableRanked, a, b);
    expect(derived.verdict).toBe('magnitude-clash');
    expect(derived.ordersApart!).toBeCloseTo(orders, 1);
    expect(derived.magnitudeDerived).toEqual(['hubble-distance']);
    // the derived endpoint is not anchor-derived; peak-wavelength's own value is (the Wien law at
    // the Hawking temperature of the anchor mass), in both runs
    expect(derived.magnitudeUsedAnchor).toBe(table.magnitudeUsedAnchor);
    expect(derived.magnitudeUsedAnchor).toBe(a === 'hubble-distance' && b === 'peak-wavelength');
    // same σ (one decade), same value up to the table's rounding, so the same verdict and p
    expect(derived.ordersApart!).toBeCloseTo(table.ordersApart!, 2);
    expect(derived.magnitudeP!).toBeGreaterThan(0);
    expect(Math.log10(derived.magnitudeP!)).toBeCloseTo(Math.log10(table.magnitudeP!), 0);
  });

  it('the derived run and the table run give the same verdict on every canonical row', () => {
    const verdicts = (rows: readonly VettedCandidate[]): string[] => rows.map((c) => `${pair(c)} ${c.verdict}`).sort();
    expect(verdicts(derivedRanked)).toEqual(verdicts(tableRanked));
  });

  it('the four Hubble proposals are not derived from the derived run either', () => {
    const ids = deriveProposedBridges(derivedRanked).map((p) => p.id);
    for (const id of HUBBLE_PROPOSALS) expect(ids, id).not.toContain(id);
  });
});

describe('the precision guard refuses the FRET efficiency', () => {
  it('fret-efficiency from two 5 nm scales carries 3√2 decades and gets no magnitude', () => {
    const ctx = buildDiscoveryContext([...CATALOG_GRAPH], {});
    expect(ctx.derivedMagnitudes.values.has('fret-efficiency')).toBe(false);
    const refusal = ctx.derivedMagnitudes.refusals.find((r) => r.name === 'fret-efficiency');
    expect(refusal).toBeDefined();
    expect(refusal!.reason).toBe('imprecise');
    expect(refusal!.edges).toEqual(['be-24']);
    expect(refusal!.sigmaDecades!).toBeCloseTo(3 * Math.SQRT2, 6);
    expect(refusal!.detail).toMatch(/σ/);
  });
});

// ── synthetic graphs ────────────────────────────────────────────────────────

const q = (name: string, dim: Quantity['dim'] = LENGTH): Quantity => ({ name, symbol: name, dim, attributes: {} });

const edge = (
  id: string,
  target: Quantity,
  sources: readonly Quantity[],
  evaluate: (inputs: Record<string, number>) => number,
  extra: Partial<BridgeEdge> = {},
): BridgeEdge => ({
  id,
  beId: null,
  kind: 'law',
  label: id,
  sources,
  target,
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate,
  citation: 'synthetic',
  ...extra,
});

const cand = (a: string, b: string, dim = '[L]'): LinkCandidate => ({ a, b, dim, touchesCore: false, sameKind: false, sharedToken: null });

describe('the mechanism on synthetic graphs', () => {
  const precise = (value: number): RepresentativeValue => ({ value, source: 'synthetic', sigmaDecades: 0.3 });

  it('converts an SI seed into a GeV-convention input and the result back (wrong by 6.24e9 without it)', () => {
    const darkMass = edge(
      'derive-dark-mass',
      q('dark-fermion-mass', ENERGY),
      [q('vacuum-expectation-value', ENERGY), q('yukawa-coupling', DIMENSIONLESS)],
      (i) => i['vacuum-expectation-value']! * i['yukawa-coupling']!,
    );
    const repVals = {
      'vacuum-expectation-value': precise(3.94e-8), // 246 GeV in joules
      'yukawa-coupling': precise(1),
      'reference-energy': precise(3.94e-8),
    };
    const ctx = buildDiscoveryContext([darkMass], { representativeValues: repVals, groundTruth: {} });
    const d = ctx.derivedMagnitudes.values.get('dark-fermion-mass');
    expect(d).toBeDefined();
    expect(d!.value / 3.94e-8).toBeCloseTo(1, 9);
    const r = vetLinkCandidate([darkMass], cand('dark-fermion-mass', 'reference-energy', '[energy]'), {
      representativeValues: repVals,
      groundTruth: {},
    });
    expect(r.magnitudeChecked).toBe(true);
    expect(r.ordersApart!).toBeLessThan(1e-6);
    expect(r.magnitudeDerived).toEqual(['dark-fermion-mass']);
  });

  it('propagates σ through log-elasticities, chains derived inputs, and never reads the anchor', () => {
    const y = edge('y-from-x', q('y'), [q('x')], (i) => i['x']! ** 2);
    const z = edge('z-from-y', q('z'), [q('y')], (i) => Math.sqrt(i['y']!) * 10);
    const repVals = { x: precise(1e3), w: precise(1e4) };
    for (const groundTruth of [{}, { x: 7 }, { y: 1e20 }] as Record<string, number>[]) {
      const ctx = buildDiscoveryContext([y, z], { representativeValues: repVals, groundTruth });
      const dy = ctx.derivedMagnitudes.values.get('y')!;
      const dz = ctx.derivedMagnitudes.values.get('z')!;
      expect(dy.value).toBeCloseTo(1e6, 3);
      expect(dy.sigmaDecades).toBeCloseTo(0.6, 9);
      expect(dz.value).toBeCloseTo(1e4, 6);
      expect(dz.sigmaDecades).toBeCloseTo(0.3, 9);
      const r = vetLinkCandidate([y, z], cand('z', 'w'), { representativeValues: repVals, groundTruth });
      expect(r.magnitudeChecked).toBe(true);
      expect(r.magnitudeUsedAnchor).toBe(false);
      expect(r.magnitudeDerived).toEqual(['z']);
      expect(r.ordersApart!).toBeLessThan(1e-9);
    }
  });

  it('an unset coefficient gives no magnitude', () => {
    const unset = edge('unset', q('y'), [q('x')], (i) => i['x']!, { coefficientUnset: true });
    const ctx = buildDiscoveryContext([unset], { representativeValues: { x: precise(1) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
  });

  it('a domain refusal gives no magnitude', () => {
    const refusing = edge('refusing', q('y'), [q('xa')], (i) => i['xa']!, { domain: validityDomain('xa > 10', ['xa']) });
    const ctx = buildDiscoveryContext([refusing], { representativeValues: { xa: precise(1) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
    // a positive control: the same edge inside its domain fires
    const inside = buildDiscoveryContext([refusing], { representativeValues: { xa: precise(100) }, groundTruth: {} });
    expect(inside.derivedMagnitudes.values.get('y')?.value).toBeCloseTo(100, 9);
  });

  it('a non-finite result gives no magnitude', () => {
    const blowsUp = edge('blows-up', q('y'), [q('x')], () => Number.POSITIVE_INFINITY);
    const ctx = buildDiscoveryContext([blowsUp], { representativeValues: { x: precise(1) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
  });

  it('two disagreeing edges give no magnitude, whatever their order, and the disagreement is recorded', () => {
    const one = edge('one', q('y'), [q('x')], (i) => i['x']!);
    const two = edge('two', q('y'), [q('x')], (i) => 2 * i['x']!);
    const downstream = edge('down', q('z'), [q('y')], (i) => i['y']!);
    for (const edges of [[one, two, downstream], [downstream, two, one]]) {
      const ctx = buildDiscoveryContext(edges, { representativeValues: { x: precise(1) }, groundTruth: {} });
      expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
      expect(ctx.derivedMagnitudes.values.has('z')).toBe(false);
      const refusal = ctx.derivedMagnitudes.refusals.find((r) => r.name === 'y');
      expect(refusal?.reason).toBe('disagreeing-edges');
      expect(refusal?.edges).toEqual(['one', 'two']);
    }
    // two agreeing edges are one value
    const twin = edge('twin', q('y'), [q('x')], (i) => i['x']! * (1 + 1e-12));
    const agreeing = buildDiscoveryContext([one, twin], { representativeValues: { x: precise(1) }, groundTruth: {} });
    expect(agreeing.derivedMagnitudes.values.get('y')?.value).toBeCloseTo(1, 9);
  });

  it('a disagreement found only after a later round still withdraws the quantity', () => {
    // `late` reaches y only after w is derived, so the first round values y through `early` alone
    const early = edge('early', q('y'), [q('x')], (i) => i['x']!);
    const w = edge('w-from-x', q('w'), [q('x')], (i) => i['x']!);
    const late = edge('late', q('y'), [q('w')], (i) => 3 * i['w']!);
    const ctx = buildDiscoveryContext([early, w, late], { representativeValues: { x: precise(1) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
    expect(ctx.derivedMagnitudes.refusals.find((r) => r.name === 'y')?.edges).toEqual(['early', 'late']);
    expect(ctx.derivedMagnitudes.values.get('w')?.value).toBeCloseTo(1, 9);
  });

  it('a σ above one decade is refused and recorded', () => {
    const cube = edge('cube', q('y'), [q('x')], (i) => i['x']! ** 4);
    const ctx = buildDiscoveryContext([cube], { representativeValues: { x: precise(10) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
    const refusal = ctx.derivedMagnitudes.refusals.find((r) => r.name === 'y');
    expect(refusal?.reason).toBe('imprecise');
    expect(refusal?.sigmaDecades).toBeCloseTo(1.2, 9);
  });

  it('a quantity the table states is not derived', () => {
    const y = edge('y-from-x', q('y'), [q('x')], (i) => i['x']! ** 2);
    const ctx = buildDiscoveryContext([y], { representativeValues: { x: precise(10), y: precise(5) }, groundTruth: {} });
    expect(ctx.derivedMagnitudes.values.has('y')).toBe(false);
  });

  it('reversing the edge list of each real graph changes no derived magnitude and no refusal', () => {
    for (const graph of [[...CATALOG_GRAPH], [...CANONICAL_GRAPH], [...CATALOG_GRAPH, ...CANONICAL_GRAPH]]) {
      for (const opts of [{}, { representativeValues: WITHOUT_HUBBLE_ROW }]) {
        const forward = buildDiscoveryContext(graph, opts).derivedMagnitudes;
        const reversed = buildDiscoveryContext([...graph].reverse(), opts).derivedMagnitudes;
        expect([...reversed.values].sort()).toEqual([...forward.values].sort());
        expect([...reversed.refusals].sort((x, y) => x.name.localeCompare(y.name))).toEqual(
          [...forward.refusals].sort((x, y) => x.name.localeCompare(y.name)),
        );
      }
    }
  });
});

describe('a control the mechanism must not move', () => {
  it('a row whose endpoints both have table values keeps its verdict, orders and p', () => {
    const row = find(rankDiscoveries([...CATALOG_GRAPH]), 'landauer-erasure-energy', 'barrier-height');
    // measured on a336533, before the mechanism and the table row
    expect(row.verdict).toBe('promising');
    expect(row.ordersApart).toBe(1.0427519804209489);
    expect(row.magnitudeP).toBe(BARRIER_HEIGHT_P);
  });
});

describe('deriveOwnEquationMagnitudes, called directly', () => {
  it('the guard is the caller\'s: FRET passes at five decades and is refused at the default one', () => {
    const seeds = {
      representativeValues: REPRESENTATIVE_VALUES,
      constantValues: new Map<string, number>(),
      identifications: [],
    };
    const loose = deriveOwnEquationMagnitudes([...CATALOG_GRAPH], seeds, 5);
    expect(loose.values.get('fret-efficiency')?.value).toBeCloseTo(0.5, 12);
    expect(loose.values.get('fret-efficiency')?.sigmaDecades).toBeCloseTo(3 * Math.SQRT2, 6);
    const strict = deriveOwnEquationMagnitudes([...CATALOG_GRAPH], seeds);
    expect(strict.values.has('fret-efficiency')).toBe(false);
    expect(DERIVED_AGREEMENT).toBe(1e-9);
  });
});

describe('the grounding ledger says where a derived magnitude came from', () => {
  it('a passed magnitude from an own-equation value says so, and does not say anchor-derived', () => {
    const y = edge('y-from-x', q('y'), [q('x')], (i) => i['x']! ** 2);
    const repVals = {
      x: { value: 1e3, source: 'synthetic', sigmaDecades: 0.3 },
      w: { value: 2e6, source: 'synthetic', sigmaDecades: 0.3 },
    };
    const c = vetLinkCandidate([y], cand('y', 'w'), { representativeValues: repVals, groundTruth: {} });
    expect(c.magnitudeDerived).toEqual(['y']);
    const line = describeGrounding(c).passed.find((p) => p.startsWith('magnitude'));
    expect(line).toBe('magnitude (0.3 orders, y from its own equation)');
  });
});

/** `magnitudeP` of landauer-erasure-energy ≟ barrier-height on the catalog graph, measured on a336533. */
const BARRIER_HEIGHT_P = 0.4609174390605081;
