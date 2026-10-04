/**
 * Bridge-equation dimensional audit: how many of the catalog's bridge
 * equations can the Buckingham-π engine DERIVE? (research write-up:
 * docs/research/Bridge-Equation-Dimensional-Audit.md).
 *
 * The honest answer is three-way, and this test pins it:
 *
 *   - derived   — a fundamental-constant subset dimensionally closes the
 *     target AND the resulting monomial reproduces the bridge's own
 *     evaluator up to a CONSTANT ratio (so the engine recovers the form,
 *     and the numerical match recovers the dimensionless prefactor that
 *     dimensional analysis cannot supply — ln2, 1/4π, 2, √(2π), 1/8π …).
 *   - decoy     — dimensional closures exist, but none match the
 *     evaluator: the same dimensions admit a different physical formula
 *     (e.g. mass·c²/k_B, the rest-mass temperature, instead of the
 *     Hawking temperature ∝ 1/M), or the bridge is additive, not a
 *     monomial.
 *   - open      — no constant subset closes it: an irreducible free
 *     dimensionless group (genuine multi-parameter physics) or a
 *     dimensionless target.
 *
 * Derivation is by DIMENSIONS — the engine never supplies the constant;
 * the numerical match against the evaluator does. The derivation /
 * complexity engine itself lives in src/composition/bridge-analysis.ts
 * (attemptDerivation / dimensionalFreedom); this audit pins its verdicts
 * over the catalog graph.
 */
import { describe, it, expect } from 'vitest';
import {
  attemptDerivation,
  dimensionalFreedom,
} from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const ALL_EDGES = CATALOG_GRAPH;

const byId = new Map(ALL_EDGES.map((e) => [e.id, e] as const));
const derive = (id: string) => attemptDerivation(byId.get(id)!);
const free = (id: string) => dimensionalFreedom(byId.get(id)!);

describe('bridge dimensional audit — genuine derivations (form + recovered prefactor)', () => {
  it('be-16 Landauer: E ∝ k_B·T, prefactor = ln 2', () => {
    const r = derive('be-16');
    expect(r.status).toBe('derived');
    if (r.status === 'derived') {
      expect(r.subset).toEqual(['k_B']);
      expect(r.prefactor).toBeCloseTo(Math.log(2), 6);
    }
  });

  it('be-21 KSS bound: η/s ∝ ℏ/k_B, prefactor = 1/4π', () => {
    const r = derive('be-21');
    expect(r.status).toBe('derived');
    if (r.status === 'derived') expect(r.prefactor).toBeCloseTo(1 / (4 * Math.PI), 6);
  });

  it('be-42-via-rs Hawking: T_H ∝ ℏc/(r_s k_B), prefactor = 1/4π', () => {
    const r = derive('be-42-via-rs');
    expect(r.status).toBe('derived');
    if (r.status === 'derived') {
      expect([...r.subset!].sort()).toEqual(['c', 'k_B', 'ℏ'].sort());
      expect(r.prefactor).toBeCloseTo(1 / (4 * Math.PI), 6);
    }
  });

  it('law-schwarzschild: r_s ∝ GM/c², prefactor = 2 (NOT the Compton decoy)', () => {
    const r = derive('law-schwarzschild-radius');
    expect(r.status).toBe('derived');
    if (r.status === 'derived') {
      expect([...r.subset!].sort()).toEqual(['G', 'c'].sort());
      expect(r.prefactor).toBeCloseTo(2, 9);
    }
  });

  it('be-12 thermal de Broglie: λ ∝ ℏ(m k_B T)^-½, prefactor = √(2π)', () => {
    const r = derive('be-12');
    expect(r.status).toBe('derived');
    if (r.status === 'derived') {
      expect([...r.subset!].sort()).toEqual(['k_B', 'ℏ'].sort());
      expect(r.prefactor).toBeCloseTo(Math.sqrt(2 * Math.PI), 6);
    }
  });

  it('be-20 vacuum energy density: ρ_Λ ∝ Λc²/G, prefactor = 1/8π', () => {
    const r = derive('be-20');
    expect(r.status).toBe('derived');
    if (r.status === 'derived')
      expect(r.prefactor).toBeCloseTo(1 / (8 * Math.PI), 6);
  });
});

describe('bridge dimensional audit — decoys and the irreducible majority', () => {
  it('be-42 (direct, from mass) is a DECOY: only mass·c²/k_B closes, ∝ M not 1/M', () => {
    expect(derive('be-42').status).toBe('decoy');
  });

  it('be-27 effective-temperature stays a DECOY: the plus is dimensionless, and the monomial does not match', () => {
    expect(derive('be-27').status).toBe('decoy');
  });

  it('most bridges are dimensionally UNCLOSABLE (irreducible free group)', () => {
    // "admits a unique dimensional closure" ⟺ 0 free dimensionless
    // parameters (dimensionalFreedom === 0).
    const closable = ALL_EDGES.filter((e) => dimensionalFreedom(e) === 0);
    // 25 of 57 admit SOME dimensional closure; 32 admit none.
    // be-59 (f = 2eV/h) is a closure. be-67 (v_A = B/√(μ0 ρ)) is another,
    // and attemptDerivation calls it a decoy: the SI coefficient is not
    // fixed by the monomial match against the evaluator's samples.
    // be-69 is the same decoy shape. be-70, be-71, and be-73 are closures.
    // be-72 is not: two dimensionless metric components leave a free ratio.
    // be-74 is a closure. be-75 and be-76 are freedom 0 and decoys: a
    // constant subset closes the dimension, and the ratio is not constant.
    // The 22-of-54 sentence is the record from before be-74..76.
    expect(closable.length).toBe(25);
    expect(ALL_EDGES.length - closable.length).toBe(32);
  });

  it('dimensional analysis is a weak filter: a small minority are genuine monomial derivations', () => {
    const derived = ALL_EDGES.filter((e) => attemptDerivation(e).status === 'derived');
    // The form-matching subset (verified against each evaluator).
    // be-59 joined this set: f = (2e/h) V is a monomial.
    // be-70, be-71, and be-73 match their evaluators.
    // be-36 left it: (c_GW − c)/c adds dimensionful terms, and the constant
    // −1 was the sample v ≪ c. be-69 is the same shape, not a derivation.
    // be-74 joins this set through {ℏ, c, e}. The recovered prefactor is
    // 1/(8 π α) ≈ 5.45, which is 1/(2 μ0) rewritten with μ0 = 4 π α ℏ / (e² c).
    // That ratio is not a clean 1/2. be-75 and be-76 stay decoys.
    // The count of 14 is the record from before be-74.
    expect(derived.length).toBe(15);
  });
});

/**
 * Dimensional complexity (free dimensionless parameters): for each
 * bridge, the minimal constant subset that puts the target's dimension
 * IN SPAN, then the leftover π-group count − 1. 0 = a single dimensionless
 * statement (monomial or dimensionless target); k = the relation is a
 * monomial × F(k dimensionless ratios). This grades the binary
 * "unclosable" into a spectrum, and shows it is ORTHOGONAL to credibility.
 * (Engine: dimensionalFreedom in src/composition/bridge-analysis.ts.)
 */
describe('bridge dimensional complexity — the spectrum behind "unclosable"', () => {
  it('derivable bridges have 0 free dimensionless parameters', () => {
    expect(free('law-schwarzschild-radius')).toBe(0);
    expect(free('be-16')).toBe(0);
    expect(free('be-21')).toBe(0);
  });

  it('Mercury perihelion AND Shapiro delay are complexity 1 — one ratio from a monomial', () => {
    // Both are ESTABLISHED, codebase-validated GR results, yet "unclosable":
    // they each carry exactly ONE dimensionless ratio (eccentricity / radius
    // ratio). Complexity is not credibility.
    expect(free('be-52')).toBe(1); // perihelion precession
    expect(free('be-37')).toBe(1); // Shapiro delay
  });

  it('the genuinely multi-parameter bridges sit at the top of the spectrum', () => {
    expect(free('be-47')).toBe(6); // primordial nucleosynthesis (8 sources)
    expect(free('be-39')).toBe(5); // asymptotic safety
  });

  it('the spectrum histogram is pinned (25 at 0; max 6)', () => {
    const hist: Record<number, number> = {};
    for (const e of ALL_EDGES) hist[dimensionalFreedom(e)] = (hist[dimensionalFreedom(e)] ?? 0) + 1;
    expect(hist[0]).toBe(25); // the dimensionally-pinned set (derived + decoy)
    expect(Math.max(...Object.keys(hist).map(Number))).toBe(6);
    // 14 bridges are exactly one dimensionless ratio away from a monomial.
    // be-68 is one: g_00 is dimensionless, so T √(−g_00) is temperature times one ratio.
    // be-72 sits at 2, not in this bin. The count of 22 at complexity 0 is the record from before be-74..76.
    expect(hist[1]).toBe(14);
  });

  it('complexity is ORTHOGONAL to status: an established bridge sits at complexity 1', () => {
    // be-52 (perihelion) is established; many complexity-≥3 bridges are too
    // (be-53 Yang-Mills). Derivability/complexity does not track credibility.
    expect(free('be-52')).toBe(1);
    expect(free('be-53')).toBe(3); // Yang-Mills β-function: established, complexity 3
  });
});
