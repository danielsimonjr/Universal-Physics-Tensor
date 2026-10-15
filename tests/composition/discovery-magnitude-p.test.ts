/**
 * The graded magnitude gate (proposal 11). The falsifier's verdict stays a hard
 * `ordersApart > N` (N = 3 by default); beside it the funnel now reports
 * `magnitudeP = 2·Φ(−orders / √(σ_a² + σ_b²))` through MathTS `normalCDF` of the NEGATIVE
 * argument (never `1 − cdf`), with σ in decades per representative value, default one decade
 * (the table's stated "good to about one order"). It is the calibrated strength of the
 * falsifier against the two values' stated uncertainty, not a credibility score: a small p says
 * the two magnitudes are hard to reconcile, and says nothing about the identification being true.
 *
 * @module tests/composition/discovery-magnitude-p
 */
import { describe, it, expect } from 'vitest';
import { normalCDF } from '@danielsimonjr/mathts-functions';
import { vetLinkCandidate } from '../../src/composition/discovery.js';
import type { DiscoveryOptions } from '../../src/composition/discovery.js';
import type { LinkCandidate } from '../../src/composition/bridge-analysis.js';
import {
  DEFAULT_SIGMA_DECADES,
  sigmaDecadesOf,
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

const opts = (representativeValues: DiscoveryOptions['representativeValues']): DiscoveryOptions => ({
  representativeValues,
});

const phi = (z: number): number => {
  const v: unknown = normalCDF(z);
  if (typeof v !== 'number') throw new TypeError('normalCDF did not return a number');
  return v;
};

describe('magnitudeP — the calibrated strength of the magnitude falsifier', () => {
  it('2.9 decades apart at σ = 1 is no clash, and no longer a clean pass: p ≈ 0.040', () => {
    const r = vetLinkCandidate([], cand('alpha', 'near'), opts({
      alpha: { value: 1e-21, source: 'test' },
      near: { value: 10 ** (-21 + 2.9), source: 'test' },
    }));
    expect(r.verdict).not.toBe('magnitude-clash');
    expect(r.ordersApart).toBeCloseTo(2.9, 9);
    expect(r.magnitudeP).toBeCloseTo(2 * phi(-2.9 / Math.SQRT2), 12);
    expect(r.magnitudeP).toBeCloseTo(0.0403, 3);
    expect(r.magnitudeP!).toBeLessThan(0.05);
  });

  it('3.1 decades apart stays a clash (the threshold is not changed), p ≈ 0.028', () => {
    const r = vetLinkCandidate([], cand('alpha', 'far'), opts({
      alpha: { value: 1e-21, source: 'test' },
      far: { value: 10 ** (-21 + 3.1), source: 'test' },
    }));
    expect(r.verdict).toBe('magnitude-clash');
    expect(r.magnitudeP).toBeCloseTo(2 * phi(-3.1 / Math.SQRT2), 12);
    expect(r.magnitudeP).toBeCloseTo(0.0285, 3);
  });

  it('σ is settable per row: two decades on both sides widens the same gap to p ≈ 0.31', () => {
    const r = vetLinkCandidate([], cand('alpha', 'near'), opts({
      alpha: { value: 1e-21, source: 'test', sigmaDecades: 2 },
      near: { value: 10 ** (-21 + 2.9), source: 'test', sigmaDecades: 2 },
    }));
    expect(r.verdict).not.toBe('magnitude-clash');
    expect(r.magnitudeP).toBeCloseTo(2 * phi(-2.9 / Math.sqrt(8)), 12);
    expect(r.magnitudeP).toBeCloseTo(0.305, 2);
  });

  it('the default σ is one decade, the table\'s stated precision, and no shipped row invents another', () => {
    expect(DEFAULT_SIGMA_DECADES).toBe(1);
    expect(sigmaDecadesOf({ value: 1, source: 'test' })).toBe(1);
    expect(sigmaDecadesOf({ value: 1, source: 'test', sigmaDecades: 0.5 })).toBe(0.5);
    for (const rv of Object.values(REPRESENTATIVE_VALUES)) expect(sigmaDecadesOf(rv)).toBe(1);
  });

  it('the gate abstains as before, and then reports no p', () => {
    const r = vetLinkCandidate([], cand('alpha', 'unknown-qty'), opts({ alpha: { value: 1e-21, source: 'test' } }));
    expect(r.magnitudeChecked).toBe(false);
    expect(r.magnitudeP).toBeNull();
  });

  it('a 10-decade clash has a p the lower tail resolves (not rounded to 0 by 1 − cdf)', () => {
    const r = vetLinkCandidate([], cand('alpha', 'beta'), opts({
      alpha: { value: 1e-21, source: 'test' },
      beta: { value: 1e-11, source: 'test' },
    }));
    expect(r.verdict).toBe('magnitude-clash');
    expect(r.magnitudeP!).toBeGreaterThan(0);
    expect(r.magnitudeP!).toBeLessThan(1e-10);
  });
});
