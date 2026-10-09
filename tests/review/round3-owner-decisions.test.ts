/**
 * Round 3: the owner delegated every open decision (2026-10-09). Each decision that
 * changes behaviour is pinned here, red on the tree before it.
 *
 * @module tests/review/round3-owner-decisions
 */
import { describe, expect, it } from 'vitest';
import { evaluateRelation } from '../../src/composition/evaluate-relation.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';
import { CONTESTED_BRIDGE_IDS } from '../../src/composition/frontier-account.js';
import { catalogEntries } from '../../src/bridges/catalog-load.js';
import { parseUnit } from '../../src/dimensional/units.js';
import { canonicalRetrievalCorpus, retrieveHybrid } from '../../src/atlas/benchmark/hybrid-retrieval.js';

const value = (id: string, inputs: Record<string, number>): number => {
  const r = evaluateRelation(id, inputs);
  if (r.kind !== 'value') throw new Error(JSON.stringify(r));
  return r.value;
};

describe('be-31: the Benincasa–Dowker bracket is 1 − N0 + 9N1 − 16N2 + 8N3 (Surya 2019 eq. 33; BD 2010 eq. 14)', () => {
  const lp = 1.616255e-35;
  it('the algebraic zero is one link and nothing else: (N0, N1, N2, N3) = (1, 0, 0, 0)', () => {
    expect(value('be-31', { 'causal-set-count-0': 1, 'causal-set-count-1': 0, 'causal-set-count-2': 0, 'causal-set-count-3': 0, 'planck-length': lp })).toBe(0);
  });
  it('each count enters with the source sign: −1, +9, −16, +8 times 4/√6 per ℓ_P²', () => {
    const unit = (4 / Math.sqrt(6)) / (lp * lp);
    const at = (n0: number, n1: number, n2: number, n3: number): number =>
      value('be-31', { 'causal-set-count-0': n0, 'causal-set-count-1': n1, 'causal-set-count-2': n2, 'causal-set-count-3': n3, 'planck-length': lp }) / unit;
    expect(at(0, 0, 0, 0)).toBeCloseTo(1, 9);
    expect(at(1, 0, 0, 0) - at(0, 0, 0, 0)).toBeCloseTo(-1, 9);
    expect(at(0, 1, 0, 0) - at(0, 0, 0, 0)).toBeCloseTo(9, 9);
    expect(at(0, 0, 1, 0) - at(0, 0, 0, 0)).toBeCloseTo(-16, 9);
    expect(at(0, 0, 0, 1) - at(0, 0, 0, 0)).toBeCloseTo(8, 9);
    expect(at(50, 20, 10, 5)).toBeCloseTo(11, 6);
  });
});

describe('CE-rydberg-formula bakes R∞ as a registered constant', () => {
  it('R_inf is a canonical constant with the quantity id rydberg-constant, and the entry has no R input', () => {
    const r = constantRecord('R_inf');
    expect(r?.value).toBeCloseTo(10973731.56816, 3);
    expect(r?.quantity).toBe('rydberg-constant');
    const entry = canonicalById('CE-rydberg-formula')!;
    expect(entry.dimensional.governing.map((g) => g.name)).toEqual(['lower-level-n', 'upper-level-n']);
    const edge = CANONICAL_GRAPH.find((e) => e.id === 'CE-rydberg-formula')!;
    expect(edge.sources.map((s) => s.name)).toEqual(['lower-level-n', 'upper-level-n']);
    // Balmer α (3 → 2): 1/λ = R∞ (1/4 − 1/9), λ = 656.1 nm (infinite nuclear mass).
    expect(1 / edge.evaluate({ 'lower-level-n': 2, 'upper-level-n': 3 })).toBeCloseTo(656.11e-9, 11);
  });
});

describe('the contested bridges are a catalog field', () => {
  it('CONTESTED_BRIDGE_IDS is derived from entries marked contested in data/bridge-catalog.json', () => {
    const fromData = catalogEntries().filter((e) => e.contested === true).map((e) => `be-${e.id}`);
    expect(fromData).toEqual(['be-44', 'be-46', 'be-50']);
    expect([...CONTESTED_BRIDGE_IDS]).toEqual(fromData);
  });
});

describe('retrieve: a claim with no expression accepts nothing', () => {
  it('a text claim yields an empty accepted list and a note that says why', async () => {
    const r = await retrieveHybrid({ query: { text: 'period of a pendulum' }, corpus: canonicalRetrievalCorpus() });
    expect(r.accepted).toEqual([]);
    expect(r.note).toMatch(/no expression/);
    expect(r.note).toMatch(/nothing is accepted/);
  });
});

describe('unit spellings the second round left unread', () => {
  it('psi takes a prefix (kpsi, Mpsi), c is a unit (eV/c, GeV/c2), a Unicode minus exponent reads', () => {
    const psi = parseUnit('psi');
    expect(parseUnit('Mpsi').scale / psi.scale).toBeCloseTo(1e6, 6);
    expect(parseUnit('kpsi').dim).toEqual(psi.dim);
    const p = parseUnit('eV/c');
    expect([p.dim.L, p.dim.M, p.dim.T]).toEqual([1, 1, -1]);
    const m = parseUnit('GeV/c2');
    expect([m.dim.L, m.dim.M, m.dim.T]).toEqual([0, 1, 0]);
    expect(m.scale).toBeCloseTo(1.78266192e-27, 34);
    const a = parseUnit('m·s⁻²');
    expect([a.dim.L, a.dim.T]).toEqual([1, -2]);
    // Controls: the centi prefix still wins in cm, and cd is the candela.
    expect(parseUnit('cm').scale).toBeCloseTo(0.01, 12);
    expect(parseUnit('cd').dim.J).toBe(1);
  });
});
