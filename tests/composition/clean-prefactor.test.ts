/**
 * A clean prefactor is decided by a rule, not a list (proposal 3): a
 * recovered constant r is clean when r = p / (π^a · ln2^b) for a ∈ −2..2,
 * b ∈ −1..1 and a rational p with denominator ≤ 720, within the same 1e-9 the
 * fit uses, or when r² is (the √π, √(2π) members of the retired list). The
 * hit is reported as its exact form.
 *
 * Deviation from the design note, recorded here rather than hidden: the note
 * expected the Stefan–Boltzmann prefactor 0.164493406684823 NOT to be a hit.
 * Under the rule as stated it is: it equals π²/60 to fifteen digits (a = −2,
 * p = 1/60), which is the closed form σ = π² k_B⁴ / (60 ℏ³ c²). The rule is
 * kept as stated and the hit is pinned. Wien's 1.2655 (2π over the root of a
 * transcendental equation) is not a hit.
 */
import { describe, expect, it } from 'vitest';
import { Fraction } from '@danielsimonjr/mathts-core';
import { attemptDerivation, cleanPrefactorForm } from '../../src/composition/bridge-analysis.js';
import { fractionToNumber, rationalize } from '../../src/composition/rational-exponent.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CENSUS } from '../helpers/census.js';

describe('cleanPrefactorForm — the rule', () => {
  it('be-80: 9/8 and be-84: π/ln 2 are hits (the retired list called them empirical)', () => {
    expect(cleanPrefactorForm(1.125)).toBe('9/8');
    expect(cleanPrefactorForm(Math.PI / Math.LN2)).toBe('π/ln 2');
    expect(cleanPrefactorForm(4.53236014182719)).toBe('π/ln 2');
  });

  it("Wien's 1.2655 is not a hit", () => {
    expect(cleanPrefactorForm(1.26546641505411)).toBeUndefined();
    expect(cleanPrefactorForm((2 * Math.PI) / 4.965114231744276)).toBeUndefined();
  });

  it('Stefan–Boltzmann IS a hit under the stated rule: π²/60 (deviation from the note, see the header)', () => {
    expect(Math.PI ** 2 / 60).toBeCloseTo(0.164493406684823, 15);
    expect(cleanPrefactorForm(0.164493406684823)).toBe('π²/60');
  });

  it('renders the members of the retired list as their exact forms', () => {
    expect(cleanPrefactorForm(1)).toBe('1');
    expect(cleanPrefactorForm(2)).toBe('2');
    expect(cleanPrefactorForm(0.5)).toBe('1/2');
    expect(cleanPrefactorForm(Math.LN2)).toBe('ln 2');
    expect(cleanPrefactorForm(1 / (4 * Math.PI))).toBe('1/(4π)');
    expect(cleanPrefactorForm(1 / (6 * Math.PI))).toBe('1/(6π)');
    expect(cleanPrefactorForm(2 * Math.PI)).toBe('2π');
    expect(cleanPrefactorForm(Math.PI)).toBe('π');
    expect(cleanPrefactorForm(Math.sqrt(2 * Math.PI))).toBe('√(2π)');
    expect(cleanPrefactorForm(Math.sqrt(Math.PI))).toBe('√π');
  });

  it('a sign is carried, and a value outside the family is not a hit', () => {
    expect(cleanPrefactorForm(-(Math.PI ** 2) / 240)).toBe('-π²/240');
    expect(cleanPrefactorForm(Math.SQRT2)).toBe('√2'); // r² = 2 is rational, so the square branch names it
    expect(cleanPrefactorForm(Math.E)).toBeUndefined();
    // BCS π/e^γ: with the numerator unbounded, 21791 ln 2/(563π²) matched it to 1e-9 by chance.
    expect(cleanPrefactorForm(1.76387698886205)).toBeUndefined();
    // A G-closure of an atomic law is an integer-valued double, a rational over 1; the numerator cap refuses it.
    expect(cleanPrefactorForm(3.61754693883e21)).toBeUndefined();
    expect(cleanPrefactorForm(721)).toBeUndefined();
    expect(cleanPrefactorForm(720)).toBe('720');
    expect(cleanPrefactorForm(0)).toBeUndefined();
    expect(cleanPrefactorForm(Number.NaN)).toBeUndefined();
  });

  it('refuses a rational the cap excludes and a near miss past 1e-9', () => {
    expect(cleanPrefactorForm(1 / 721)).toBeUndefined();
    expect(cleanPrefactorForm(1.125 * (1 + 1e-7))).toBeUndefined();
    expect(cleanPrefactorForm(1.125 * (1 + 1e-10))).toBe('9/8');
  });
});

/** The seeded 64-bit LCG of the measurement: s ← s·6364136223846793005 + 1442695040888963407 mod 2^64. */
function lcg(seed: bigint): () => number {
  let s = seed;
  const mask = (1n << 64n) - 1n;
  return () => {
    s = (s * 6364136223846793005n + 1442695040888963407n) & mask;
    return Number(s >> 11n) / 2 ** 53;
  };
}

/** Hits of the rule among `n` log-uniform draws on [lo, hi], in the draw order the seed fixes. */
function chanceHits(rnd: () => number, lo: number, hi: number, n: number): number {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.exp(Math.log(lo) + rnd() * (Math.log(hi) - Math.log(lo)));
    if (cleanPrefactorForm(x) !== undefined) hits++;
  }
  return hits;
}

describe('cleanPrefactorForm — the measured chance-hit rate', () => {
  // A rule this wide names some numbers by chance. Measured with seed 20261015, 20000
  // log-uniform draws per range, the second range continuing the first one's stream: 53 hits on
  // [0.1, 10] (0.27%) and 19 on [1e-3, 1e3] (0.10%) at the current caps (a ∈ −2..2, b ∈ −1..1,
  // numerator and denominator ≤ 720, 1e-9, and the square branch). The draws are deterministic,
  // so these are exact pins: a widened search (a larger cap, a looser tolerance, another
  // symbol) moves them, and that move has to be reviewed here.
  it('pins 53 of 20000 on [0.1, 10] and 19 of 20000 on [1e-3, 1e3]', () => {
    const rnd = lcg(20261015n);
    expect(chanceHits(rnd, 0.1, 10, 20000)).toBe(53);
    expect(chanceHits(rnd, 1e-3, 1e3, 20000)).toBe(19);
  });

  it('named transcendental constants are not hits; √2 is, by the r² branch', () => {
    expect(cleanPrefactorForm(1.26546641505411)).toBeUndefined(); // Wien, 2π/x
    expect(cleanPrefactorForm(1.76387698886205)).toBeUndefined(); // BCS, π/e^γ
    expect(cleanPrefactorForm(Math.E)).toBeUndefined();
    expect(cleanPrefactorForm(0.5772156649015329)).toBeUndefined(); // Euler's γ
    expect(cleanPrefactorForm(1.2020569031595942)).toBeUndefined(); // ζ(3)
    expect(cleanPrefactorForm((1 + Math.sqrt(5)) / 2)).toBeUndefined(); // the golden ratio
    expect(cleanPrefactorForm(Math.SQRT2)).toBe('√2');
  });

  it('an integer before ln 2 is spaced, as ln 2 is everywhere else in a form', () => {
    expect(cleanPrefactorForm(2 * Math.LN2)).toBe('2 ln 2');
    expect(cleanPrefactorForm((713 * Math.LN2) / (654 * Math.PI))).toBe('713 ln 2/(654π)');
    expect(cleanPrefactorForm(2 * Math.PI * Math.LN2)).toBe('2π ln 2');
  });
});

describe('rationalize — the double-only miss is the Fraction miss (second method)', () => {
  // rationalize decides a miss on n/d in doubles before building a Fraction (the rule asks it
  // 43,200 times per miss). The reference below builds every Fraction, as the scan did before.
  function reference(x: number, maxDenominator: number, tolerance: number): Fraction | undefined {
    if (!Number.isFinite(x)) return undefined;
    if (Number.isInteger(x)) return new Fraction(x, 1);
    const within = (f: Fraction) => Math.abs(fractionToNumber(f) - x) <= tolerance * Math.abs(x);
    const guess = Fraction.fromNumber(x, BigInt(maxDenominator));
    if (guess.denominator <= BigInt(maxDenominator) && within(guess)) return guess;
    for (let d = 1; d <= maxDenominator; d++) {
      const candidate = new Fraction(Math.round(x * d), d);
      if (within(candidate)) return candidate;
    }
    return undefined;
  }

  it('agrees on 3000 seeded draws, hits and misses, across tolerances and magnitudes', () => {
    const rnd = lcg(7n);
    let hits = 0;
    for (let i = 0; i < 3000; i++) {
      const d = 1 + Math.floor(rnd() * 720);
      const n = Math.floor(rnd() * 5000) - 2500;
      // Half the draws are exact rationals (hits), half are perturbed (mostly misses).
      const x = (n / d) * (i % 2 === 0 ? 1 : 1 + (rnd() - 0.5) * 1e-6) * 10 ** Math.floor(rnd() * 8 - 4);
      const tolerance = i % 3 === 0 ? 1e-12 : 1e-9;
      const got = rationalize(x, { maxDenominator: 720, tolerance });
      const want = reference(x, 720, tolerance);
      expect(got?.toString(), String(x)).toBe(want?.toString());
      if (want !== undefined) hits++;
    }
    expect(hits).toBeGreaterThan(500);
    expect(hits).toBeLessThan(2500);
  });
});

describe('the audit reads the rule', () => {
  const edge = (beId: number) => CATALOG_GRAPH.find((e) => e.beId === beId)!;

  it('be-80 derives with the clean 9/8 and be-84 with π/ln 2', () => {
    const d80 = attemptDerivation(edge(80));
    expect(d80.status).toBe('derived');
    expect(d80.cleanPrefactor).toBe(true);
    expect(d80.prefactorForm).toBe('9/8');
    const d84 = attemptDerivation(edge(84));
    expect(d84.status).toBe('derived');
    expect(d84.cleanPrefactor).toBe(true);
    expect(d84.prefactorForm).toBe('π/ln 2');
  });

  it('two canonical closures the list could not name are derived under the rule', () => {
    const canonical = (id: string) => CANONICAL_GRAPH.find((e) => e.id === id)!;
    const efe = attemptDerivation(canonical('CE-einstein-field-eq'));
    expect(efe.status).toBe('derived');
    expect(efe.subset).toEqual(['c', 'G']);
    expect(efe.prefactorForm).toBe('8π');
    const rydberg = attemptDerivation(canonical('CE-rydberg-energy'));
    expect(rydberg.status).toBe('derived');
    expect(rydberg.prefactorForm).toBe('1/(32π²)');
  });

  it('the catalog audit tallies are the census; the canonical tallies are the census once it records the two moves above', () => {
    const tally = (graph: typeof CATALOG_GRAPH) => {
      const t = { derived: 0, coefficientUnset: 0, decoy: 0, notAMonomial: 0, open: 0 };
      for (const e of graph) {
        const d = attemptDerivation(e);
        if (d.status === 'derived') t.derived += 1;
        else if (d.status === 'coefficient-unset') t.coefficientUnset += 1;
        else if (d.status === 'decoy') t.decoy += 1;
        else if (d.status === 'not-a-monomial') t.notAMonomial += 1;
        else t.open += 1;
      }
      return t;
    };
    const catalog = tally(CATALOG_GRAPH);
    expect(catalog).toEqual({
      derived: CENSUS.derivationAudit.derived,
      coefficientUnset: CENSUS.derivationAudit.coefficientUnset,
      decoy: CENSUS.derivationAudit.decoy,
      notAMonomial: CENSUS.derivationAudit.notAMonomial,
      open: CENSUS.derivationAudit.open,
    });
    const canonical = tally(CANONICAL_GRAPH);
    expect(canonical).toEqual({
      derived: CENSUS.canonical.audit.derived,
      coefficientUnset: CENSUS.canonical.audit.coefficientUnset,
      decoy: CENSUS.canonical.audit.decoy,
      notAMonomial: 0,
      open: CENSUS.canonical.audit.open,
    });
  });
});
