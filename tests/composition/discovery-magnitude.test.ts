/**
 * Order-of-magnitude falsifier for the discovery loop. The graph's numeric
 * check (`retrodict`) runs from a single anchor and cannot evaluate the
 * quantities a dimensional coincidence "unlocks" — so it never contradicts
 * them. The magnitude gate injects external, sourced order-of-magnitude
 * values and rejects identifications a≡b whose representative values differ
 * by more than N orders. It is a PARTIAL falsifier: it abstains when either
 * value is unknown (and so never false-rejects on missing data).
 *
 * @module tests/composition/discovery-magnitude
 */
import { describe, it, expect } from 'vitest';
import { vetLinkCandidate } from '../../src/composition/discovery.js';
import type { DiscoveryOptions } from '../../src/composition/discovery.js';
import type { LinkCandidate } from '../../src/composition/bridge-analysis.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { DIMENSIONLESS, ENERGY } from '../../src/dimensional/types.js';
import {
  representativeValue,
  REPRESENTATIVE_VALUES,
} from '../../src/composition/representative-values.js';

const cand = (a: string, b: string): LinkCandidate => ({
  a,
  b,
  dim: '[energy]',
  touchesCore: false,
  sameKind: false,
  sharedToken: null,
});

// Injected table so the gate's behaviour is tested independently of the
// real (evolving) representative-value set.
const repVals = {
  alpha: { value: 1e-21, source: 'test' },
  beta: { value: 1e-11, source: 'test' }, // 10 orders from alpha
  gamma: { value: 5e-21, source: 'test' }, // ~0.7 orders from alpha
} as const;

const opts = (extra: Partial<DiscoveryOptions> = {}): DiscoveryOptions => ({
  representativeValues: repVals,
  ...extra,
});

const graphQuantity = (name: string, dim: Quantity['dim']): Quantity => ({
  name,
  symbol: name,
  dim,
  attributes: {},
});

describe('discover — order-of-magnitude falsifier', () => {
  it('falsifies an identification whose values differ by > N orders', () => {
    const r = vetLinkCandidate([], cand('alpha', 'beta'), opts());
    expect(r.verdict).toBe('magnitude-clash');
    expect(r.magnitudeChecked).toBe(true);
    expect(r.ordersApart).toBeCloseTo(10, 6);
    expect(r.score).toBeLessThan(0);
  });

  it('lets a close-magnitude pair survive (no clash)', () => {
    const r = vetLinkCandidate([], cand('alpha', 'gamma'), opts());
    expect(r.verdict).not.toBe('magnitude-clash');
    expect(r.magnitudeChecked).toBe(true);
    expect(r.ordersApart).not.toBeNull();
    expect(r.ordersApart as number).toBeLessThan(1);
  });

  it('abstains when a representative value is missing (no false reject)', () => {
    const r = vetLinkCandidate([], cand('alpha', 'unknown-qty'), opts());
    expect(r.magnitudeChecked).toBe(false);
    expect(r.ordersApart).toBeNull();
    expect(r.verdict).not.toBe('magnitude-clash');
  });

  it('threshold is configurable: a 10-order gap survives at N=12', () => {
    const r = vetLinkCandidate(
      [],
      cand('alpha', 'beta'),
      opts({ maxOrdersOfMagnitude: 12 }),
    );
    expect(r.verdict).not.toBe('magnitude-clash');
  });

  it('compares anchor-derived tagged quantities with SI representative values', () => {
    const derivesDarkMass: BridgeEdge = {
      id: 'derive-dark-mass',
      beId: null,
      kind: 'bridge',
      label: 'derive dark mass',
      sources: [
        graphQuantity('vacuum-expectation-value', ENERGY),
        graphQuantity('yukawa-coupling', DIMENSIONLESS),
      ],
      target: graphQuantity('dark-fermion-mass', ENERGY),
      confidence: 'established',
      domain: { description: 'any', predicate: () => true },
      evaluate: (inputs) =>
        inputs['vacuum-expectation-value']! * inputs['yukawa-coupling']!,
      citation: 'synthetic',
    };
    const r = vetLinkCandidate(
      [derivesDarkMass],
      cand('dark-fermion-mass', 'vacuum-expectation-value'),
      {
        groundTruth: {
          'vacuum-expectation-value': 246,
          'yukawa-coupling': 1,
        },
      },
    );

    expect(r.magnitudeChecked).toBe(true);
    expect(r.ordersApart).toBeLessThan(0.01);
    expect(r.verdict).not.toBe('magnitude-clash');
  });
});

describe('representative-values table', () => {
  it('returns a sourced value for a scale-specific quantity', () => {
    const v = representativeValue('hubble-rate');
    expect(v).toBeDefined();
    expect(v?.value).toBeGreaterThan(0);
    expect(typeof v?.source).toBe('string');
    expect((v?.source.length ?? 0) > 0).toBe(true);
  });

  it('abstains (undefined) on generic, scale-ambiguous quantities', () => {
    expect(representativeValue('mass')).toBeUndefined();
    expect(representativeValue('energy')).toBeUndefined();
    expect(representativeValue('length')).toBeUndefined();
  });

  it('abstains on speculative quantities with no agreed scale (no fabrication)', () => {
    for (const q of [
      'dark-fermion-mass',
      'scalar-field-value',
      'inflation-hubble-energy',
      'boundary-length',
      'coarsening-length',
    ]) {
      expect(representativeValue(q), q).toBeUndefined();
    }
  });

  it('carries the BE-24/BE-26 curated scales (FRET + DNA proton tunneling)', () => {
    // donor–acceptor distance and Förster radius share the FRET nm regime.
    expect(representativeValue('donor-acceptor-distance')?.value).toBeCloseTo(
      5e-9,
      12,
    );
    // barrier width ~Å, barrier height ~0.2 eV, tunnelling mass = proton.
    expect(representativeValue('barrier-width')?.value).toBeLessThan(1e-9);
    expect(representativeValue('barrier-height')?.value).toBeGreaterThan(0);
    expect(representativeValue('tunneling-mass')?.value).toBeCloseTo(
      1.673e-27,
      30,
    );
  });

  it('every entry carries a positive value and a non-empty source', () => {
    for (const [name, rv] of Object.entries(REPRESENTATIVE_VALUES)) {
      expect(rv.value, name).toBeGreaterThan(0);
      expect(rv.source.length, name).toBeGreaterThan(0);
    }
  });
});
