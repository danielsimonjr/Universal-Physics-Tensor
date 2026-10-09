/**
 * The evidence spine is a RIGOR HIERARCHY, not N equal confirmations. Each
 * confrontation carries an author-declared rigor tier (stringent/moderate/loose)
 * folding in precision AND honesty (one-sidedness, order-of-magnitude, caveats).
 * This test pins the distribution and — the anti-inflation guard — verifies no
 * tier is OVER-declared relative to its computed precision.
 * @module tests/bridges/confrontation-rigor
 */
import { describe, it, expect } from 'vitest';
import {
  CONFRONTATION_RIGOR,
  confrontationRigor,
  runConfrontation,
} from '../../src/bridges/confrontations.js';
import { DATA_CONFRONTED_IDS } from '../../src/bridges/confrontation-coverage.js';
import { CENSUS } from '../helpers/census.js';

/** Computed test precision from an outcome (smaller = tighter). */
function precisionOf(o: ReturnType<typeof runConfrontation>): number {
  // `runConfrontation` returns `undefined` for an unregistered bridge id; every
  // id iterated here comes from `CONFRONTATION_RIGOR`, which is always registered
  // (pinned by the 'declares a tier for exactly the data-confronted bridges' test
  // above), so this is unreachable in practice — but the type is honest about the
  // possibility, and guarding it up front is what lets TS narrow `o.kind` below
  // (a discriminant check can't narrow through a possibly-undefined receiver).
  if (o === undefined) return Infinity;
  if (o.kind === 'value') return Math.abs(o.sigma) / Math.abs(o.observed || o.predicted || 1);
  if (o.kind === 'consistency') return o.fractionalGap;
  return Infinity; // upper-bound / one-sided → loose-compatible
}

describe('confrontation rigor hierarchy', () => {
  it('declares a tier for exactly the data-confronted bridges', () => {
    expect([...CONFRONTATION_RIGOR.keys()].sort((a, b) => a - b)).toEqual(
      [...DATA_CONFRONTED_IDS].sort((a, b) => a - b),
    );
  });

  it('the honest distribution is stringent / moderate / loose (NOT all equal)', () => {
    const tiers = [...CONFRONTATION_RIGOR.values()];
    expect(tiers.filter((t) => t === 'stringent').length).toBe(CENSUS.confrontations.rigorStringent);
    expect(tiers.filter((t) => t === 'moderate').length).toBe(CENSUS.confrontations.rigorModerate);
    expect(tiers.filter((t) => t === 'loose').length).toBe(CENSUS.confrontations.rigorLoose);
  });

  it('the metrology triangle is the precision core (BE-55/58/59 all stringent)', () => {
    expect(confrontationRigor(55)).toBe('stringent'); // QHE universality 8.6e-11
    expect(confrontationRigor(58)).toBe('stringent'); // JNT k_B 5 ppm
    expect(confrontationRigor(59)).toBe('stringent'); // Josephson 1e-9
  });

  it('ANTI-INFLATION: no tier is over-declared vs its computed precision', () => {
    for (const [id, tier] of CONFRONTATION_RIGOR) {
      const p = precisionOf(runConfrontation(id));
      if (tier === 'stringent') {
        expect(p, `be-${id} declared stringent but precision ${p}`).toBeLessThanOrEqual(5e-3);
      } else if (tier === 'moderate') {
        expect(p, `be-${id} declared moderate but precision ${p}`).toBeLessThanOrEqual(5e-2);
      }
      // 'loose' is unconstrained — a conservatively-declared loose (e.g. be-11,
      // whose gap is 0 but real precision ~15%) is honest, not a violation.
    }
  });
});
