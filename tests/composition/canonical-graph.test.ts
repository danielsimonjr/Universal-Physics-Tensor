/**
 * Canonical-only discovery — project the standard-physics L-layer
 * (`CANONICAL_EQUATIONS`) into the composition-graph edge vocabulary so the
 * existing discovery/analysis funnel runs on textbook physics ALONE, with the
 * speculative bridge catalog excluded.
 *
 * Two contracts are pinned here:
 *   1. the adapter faithfully projects every canonical equation to an
 *      `established` `law` edge, with universal constants baked into the
 *      evaluator (parity with the bridge graph — constants are not nodes); and
 *   2. running discovery on the canonical-only graph introduces NO numerical
 *      contradiction — the regression harness that "standard physics, fed to
 *      the inference suite, stays self-consistent".
 */
import { describe, it, expect } from 'vitest';
import {
  canonicalToEdges,
  CANONICAL_GRAPH,
  CANONICAL_CONSTANTS,
} from '../../src/composition/canonical-graph.js';
import { rankDiscoveries } from '../../src/composition/discovery.js';
import { CANONICAL_EQUATIONS, CANONICAL_BY_ID } from '../../src/canonical/registry.js';
import type { CanonicalEquation } from '../../src/canonical/canonical-equation.js';
import { M_SUN_KG } from '../../src/composition/edges/calibration.js';
import { G_SI, C_SI } from '../../src/core/constants.js';
import { MASS, LENGTH, DIMENSIONLESS } from '../../src/dimensional/types.js';

const byId = (id: string) => {
  const e = CANONICAL_GRAPH.find((edge) => edge.id === id);
  if (!e) throw new Error(`no canonical edge ${id}`);
  return e;
};

describe('canonicalToEdges — adapter contract', () => {
  it('projects exactly one edge per canonical equation', () => {
    expect(CANONICAL_GRAPH.length).toBe(CANONICAL_EQUATIONS.length);
  });

  it('marks every edge as an established law with no catalog id', () => {
    for (const e of CANONICAL_GRAPH) {
      expect(e.confidence).toBe('established');
      expect(e.kind).toBe('law');
      expect(e.beId).toBeNull();
    }
  });

  it('bakes universal constants into the evaluator (they are not graph nodes)', () => {
    const constNames = new Set(Object.keys(CANONICAL_CONSTANTS));
    for (const e of CANONICAL_GRAPH) {
      for (const s of e.sources) {
        expect(constNames.has(s.name)).toBe(false);
      }
    }
  });

  it('bakes the electron mass m_e (a universal constant, not an observable)', () => {
    // Otherwise discovery ranks the absurd `mass ≟ m_e` (Sun vs electron) as
    // promising — the magnitude gate abstains because m_e has no rep value.
    expect(CANONICAL_CONSTANTS.m_e?.dim).toEqual(MASS);
    const sourceNames = CANONICAL_GRAPH.flatMap((e) => e.sources.map((s) => s.name));
    expect(sourceNames).not.toContain('m_e');
    const promising = rankDiscoveries(CANONICAL_GRAPH).filter((r) => r.verdict === 'promising');
    expect(promising.some((r) => r.a === 'm_e' || r.b === 'm_e')).toBe(false);
  });

  it('guards constant-baking by DIMENSION (a same-named variable is not baked)', () => {
    // A future entry naming a dimensionless `e` (eccentricity) must keep it a
    // graph node, not silently replace it with the elementary charge.
    const fake: CanonicalEquation = {
      id: 'CE-fake-eccentricity',
      name: 'fake',
      domain: 'gravitation',
      formula_latex: 'x = e L',
      epistemicStatus: 'dimensional',
      freeDimensionlessGroups: 0,
      dimensional: {
        target: { name: 'fake-length', dim: LENGTH },
        governing: [
          { name: 'e', dim: DIMENSIONLESS }, // eccentricity, NOT elementary charge
          { name: 'L', dim: LENGTH },
        ],
        monomial: { e: 1, L: 1 },
      },
      regime: {},
      assumptions: [],
      references: ['test'],
      partnerBridges: [],
    };
    const [edge] = canonicalToEdges([fake]);
    expect(edge.sources.map((s) => s.name).sort()).toEqual(['L', 'e']);
    // e=0.5 (eccentricity) must flow through, not 1.602e-19 (charge).
    expect(edge.evaluate({ e: 0.5, L: 2 })).toBeCloseTo(1, 9);
  });

  it('reduces Schwarzschild radius to a single physical source (mass)', () => {
    const e = byId('CE-schwarzschild-radius');
    expect(e.sources.map((s) => s.name)).toEqual(['mass']);
    expect(e.target.name).toBe('radius');
    // monomial r ∝ G·M·c⁻², times the sourced factor 2.
    const expected = (2 * G_SI * M_SUN_KG) / C_SI ** 2;
    expect(e.evaluate({ mass: M_SUN_KG })).toBeCloseTo(expected, 6);
  });

  it('emits a finite zero-source edge for all-constant quantities (Planck length)', () => {
    const e = byId('CE-planck-length');
    expect(e.sources).toHaveLength(0);
    const v = e.evaluate({});
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('evaluates a fully-quantitative AST when the monomial is null', () => {
    // Two same-dim masses leave the Buckingham monomial null. The AST is still
    // F = G m₁ m₂ / r², and that is what the edge returns.
    const e = byId('CE-newton-gravitation');
    expect(e.evaluate({ mass: 1, 'secondary-mass': 1, r: 1 })).toBeCloseTo(G_SI, 8);
    expect(CANONICAL_BY_ID['CE-newton-gravitation'].dimensional.monomial).toBeNull();
  });

  it('is callable on an explicit equation subset', () => {
    const subset = CANONICAL_EQUATIONS.slice(0, 3);
    expect(canonicalToEdges(subset)).toHaveLength(3);
  });
});

describe('canonical-only discovery — regression harness', () => {
  it('introduces NO numerical contradiction (standard physics stays consistent)', () => {
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    const contradictory = ranked.filter((r) => r.verdict === 'contradictory');
    expect(contradictory).toEqual([]);
  });

  it('does NOT false-reject compton ≟ bohr as a magnitude-clash', () => {
    // Both are atomic length scales ~1 order apart (a_0 = λ_C/(2πα)). Without
    // sourced representative values the gate evaluated the Compton wavelength at
    // the {mass: M_sun} anchor → ~10⁻⁷³ m → a spurious ~61-order clash. With
    // sourced values it reads the real magnitudes and the clash disappears.
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    const pair = ranked.find(
      (r) =>
        (r.a === 'compton-wavelength' && r.b === 'bohr-radius') ||
        (r.a === 'bohr-radius' && r.b === 'compton-wavelength'),
    );
    expect(pair).toBeDefined();
    expect(pair!.verdict).not.toBe('magnitude-clash');
    expect(pair!.ordersApart).not.toBeNull();
    expect(pair!.ordersApart!).toBeLessThan(3);
  });

  it('uses no fragmented variable aliases (T, M, m_1, m_2) as node names', () => {
    const banned = new Set(['T', 'M', 'm_1', 'm_2']);
    const names = CANONICAL_GRAPH.flatMap((e) => [
      e.target.name,
      ...e.sources.map((s) => s.name),
    ]);
    for (const n of names) expect(banned.has(n), `node "${n}" should be unified`).toBe(false);
  });

  it('surfaces no namespace-artifact candidates (T/M/m_1/m_2)', () => {
    const banned = new Set(['T', 'M', 'm_1', 'm_2']);
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    expect(ranked.some((r) => banned.has(r.a) || banned.has(r.b))).toBe(false);
  });

  it('makes temperature a shared hub across the thermo equations', () => {
    const tempEdges = CANONICAL_GRAPH.filter((e) =>
      [e.target.name, ...e.sources.map((s) => s.name)].includes('temperature'),
    );
    expect(tempEdges.length).toBeGreaterThanOrEqual(5);
  });

  it("preserves Newton's free-mass-ratio structure (monomial stays null)", () => {
    // mass and secondary-mass stay two DISTINCT mass quantities (buckinghamPi
    // requires unique governing names, and the free mass-ratio is why the monomial is null).
    expect(CANONICAL_BY_ID['CE-newton-gravitation'].dimensional.monomial).toBeNull();
  });

  it('treats compton ≟ de-broglie as a DECLARED link, not a fresh candidate', () => {
    // de-broglie-wavelength is identified to compton-wavelength (the Compton
    // wavelength is the de Broglie wavelength at the relativistic limit p = mc),
    // so the canonicalizer folds the two into one node — it is never re-proposed
    // as a discovery, and `de-broglie-wavelength` disappears as a candidate name.
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    expect(
      ranked.some((r) => r.a === 'de-broglie-wavelength' || r.b === 'de-broglie-wavelength'),
    ).toBe(false);
  });

  it('keeps the GENUINE planck-length ≟ bohr-radius scale clash', () => {
    // ℓ_P (~10⁻³⁵ m) and a_0 (~10⁻¹¹ m) really are ~24 orders apart — adding the
    // atomic representative values must not erase a correct falsification.
    const ranked = rankDiscoveries(CANONICAL_GRAPH);
    const pair = ranked.find(
      (r) =>
        (r.a === 'planck-length' && r.b === 'bohr-radius') ||
        (r.a === 'bohr-radius' && r.b === 'planck-length'),
    );
    expect(pair).toBeDefined();
    expect(pair!.verdict).toBe('magnitude-clash');
  });
});

describe('thermal-de-broglie-wavelength ≡ thermal-wavelength identification', () => {
  it('connects a bridge using thermal-de-broglie-wavelength to canonical physics', async () => {
    const { buildVizModel } = await import('../../src/composition/graph-viz.js');
    const { equationLanding } = await import('../../src/composition/user-equation.js');
    // a junction whose ONLY canonical-vocabulary link is the thermal wavelength
    // (named the catalog way) — isolated unless the alias folds it onto the
    // canonical `thermal-wavelength` node (BE-11's situation).
    const j = {
      id: 'user-equation',
      label: 'decoherence-rate from thermal-de-broglie-wavelength',
      status: 'user' as const,
      sources: ['thermal-de-broglie-wavelength'],
      target: 'decoherence-rate',
    };
    const model = buildVizModel(CANONICAL_GRAPH, { extraJunctions: [j] });
    const landing = equationLanding(model, 'user-equation');
    expect(landing.isolated).toBe(false);
    expect(landing.sharedQuantities).toContain('thermal-wavelength');
  });
});
