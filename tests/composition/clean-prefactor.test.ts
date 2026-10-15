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
import { attemptDerivation, cleanPrefactorForm } from '../../src/composition/bridge-analysis.js';
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
