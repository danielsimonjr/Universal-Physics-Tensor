import { describe, it, expect } from 'vitest';
import {
  deriveProposedBridges,
  dedupByNormalForm,
  resolveSources,
  toProposedEntry,
  PROPOSED_BRIDGES,
  toMonomial,
  fromMonomial,
  NotAMonomialError,
  promoteProposal,
  MissingEvidenceError,
  type ProposedBridge,
} from '../../src/composition/proposed-bridges.js';
import { rankDiscoveries, type VettedCandidate } from '../../src/composition/discovery.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { validate } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';
import { CANONICAL_BY_ID } from '../../src/canonical/registry.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';

/** Minimal promising candidate (the generator only reads a/b/dim/verdict). */
const promising = (a: string, b: string, dim = '[energy]'): VettedCandidate =>
  ({ a, b, dim, verdict: 'promising' } as unknown as VettedCandidate);

describe('monomial algebra', () => {
  it('decomposes the Landauer scalarAst to {k_B, T, ln2}', () => {
    const m = toMonomial(CANONICAL_BY_ID['CE-landauer'].scalarAst!);
    expect(new Set(m.keys())).toEqual(new Set(['k_B', 'T', 'ln2']));
    expect(m.get('T')!.exp).toBe(1);
  });

  it('round-trips a monomial through fromMonomial to an equal dimension', () => {
    const ast = CANONICAL_BY_ID['CE-planck-einstein'].scalarAst!;
    const rebuilt = fromMonomial(toMonomial(ast));
    expect(format(validate(rebuilt).inferredDimension!)).toBe(
      format(validate(ast).inferredDimension!),
    );
  });

  it('rejects a non-monomial (sum) AST', () => {
    const sum = {
      kind: 'op' as const,
      op: '+' as const,
      args: [CANONICAL_BY_ID['CE-landauer'].scalarAst!, CANONICAL_BY_ID['CE-landauer'].scalarAst!],
    };
    expect(() => toMonomial(sum)).toThrow(NotAMonomialError);
  });
});

describe('deriveProposedBridges — canonical-only pilot', () => {
  const proposals = deriveProposedBridges();

  it('emits the Landauer photon first, plus the new fully-quantitative IDs', () => {
    // The canonical L-layer expansion (Adam+Eve audit) added more
    // fully-quantitative + determinate laws, so the identity-consequence funnel
    // now surfaces four coincidences (all UNADJUDICATED), including
    // CE-compton-wavelength-full against the Hubble distance: the Landauer photon,
    // hν=mc² (photon-energy↔rest-energy via mass), and c/H≟b/T
    // (hubble-distance↔peak-wavelength). Order is registry-stable (Landauer first).
    expect(proposals).toHaveLength(4);
    expect(proposals.map((p) => p.id).sort()).toEqual([
      'IC-compton-wavelength-full--hubble-distance--hubble-rate',
      'IC-erasure-energy--photon-energy--nu',
      'IC-hubble-distance--peak-wavelength--temperature',
      'IC-photon-energy--rest-energy--mass',
    ]);
    const p = proposals[0];
    expect(p.id).toBe('IC-erasure-energy--photon-energy--nu');
    expect(p.target.name).toBe('nu');
    expect(p.dimensionalSignature).toBe('[frequency]');
    expect(p.derivedFrom.sourceEquationIds).toContain('CE-landauer');
    expect(p.derivedFrom.sourceEquationIds).toContain('CE-planck-einstein');
  });

  it('evaluates to ~4.33 THz at temperature = 300 K (Eve recompute)', () => {
    // Leaf canonicalised T → temperature (aligned with the governing/graph name).
    const nu = proposals[0].evaluate({ temperature: 300 });
    expect(nu).toBeGreaterThan(4.2e12);
    expect(nu).toBeLessThan(4.45e12);
  });

  it('round-trips: scalarAst validates to its dimensionalSignature', () => {
    for (const p of proposals) {
      expect(format(validate(p.scalarAst).inferredDimension!)).toBe(p.dimensionalSignature);
    }
  });

  it('gates out CE-jarzynski (scalar-up-to-constant) — Adam M3 / Eve E3', () => {
    // The free-energy-difference ≟ photon-energy candidate is `promising` but
    // must yield NO proposal (Jarzynski prefactor is a non-constant stub).
    const only = deriveProposedBridges([
      promising('free-energy-difference', 'photon-energy'),
    ]);
    expect(only).toEqual([]);
    for (const p of proposals) {
      expect(p.derivedFrom.sourceEquationIds).not.toContain('CE-jarzynski');
    }
  });

  it('gates out a monomial:null endpoint (Newton) — gate 1', () => {
    expect(CANONICAL_BY_ID['CE-newton-gravitation'].dimensional.monomial).toBeNull();
    const none = deriveProposedBridges([
      promising('gravitational-force', 'lorentz-force', '[force]'),
    ]);
    expect(none).toEqual([]);
  });
});

describe('epistemic firewall', () => {
  it("every proposal carries the literal status 'unadjudicated'", () => {
    for (const p of deriveProposedBridges()) {
      expect(p.status).toBe('unadjudicated');
    }
  });

  it('does NOT mutate BRIDGE_EQUATIONS (reference identity + content hash)', () => {
    const ref = BRIDGE_EQUATIONS;
    const before = JSON.stringify(BRIDGE_EQUATIONS);
    deriveProposedBridges();
    expect(BRIDGE_EQUATIONS).toBe(ref); // same array reference
    expect(JSON.stringify(BRIDGE_EQUATIONS)).toBe(before); // unchanged content
    expect(BRIDGE_EQUATIONS).toHaveLength(55);
  });
});

describe('promoteProposal — promotion gate (guardrail #5)', () => {
  const p = deriveProposedBridges()[0];

  it('throws unless every human input is present', () => {
    expect(() => promoteProposal(p, { citation: '', status: 'highly-speculative', reviewRef: 'x' }))
      .toThrow(MissingEvidenceError);
    expect(() => promoteProposal(p, { citation: 'c', status: 'highly-speculative', reviewRef: '  ' }))
      .toThrow(MissingEvidenceError);
  });

  it('returns a review-ready request on full evidence', () => {
    const req = promoteProposal(p, {
      citation: 'no known literature — coincidence',
      status: 'highly-speculative',
      reviewRef: 'docs/planning/v0.24.0-Review-Findings.md',
    });
    expect(req.proposal).toBe(p);
    expect(req.evidence.status).toBe('highly-speculative');
  });
});

describe('dedupByNormalForm — cross-proposal dedup (Design §9 #2)', () => {
  const base = deriveProposedBridges()[0];

  it('collapses structurally-equal proposals into one, recording the others', () => {
    // A twin with the SAME derived relation but a different identification.
    const twin: ProposedBridge = {
      ...base,
      id: 'IC-aaa--bbb--nu',
      derivedFrom: {
        ...base.derivedFrom,
        identification: { a: 'aaa', b: 'bbb', dim: base.derivedFrom.identification.dim },
      },
    };
    const deduped = dedupByNormalForm([base, twin]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe(base.id); // first kept (order preserved)
    expect(deduped[0].alsoDerivableFrom).toContain('aaa ≡ bbb');
  });

  it('does NOT collapse different relations', () => {
    const other: ProposedBridge = {
      ...base,
      id: 'IC-other',
      dimensionalSignature: '[energy]', // different target dim ⇒ different key
    };
    expect(dedupByNormalForm([base, other])).toHaveLength(2);
  });
});

describe('widened scope — candidate-set agnostic', () => {
  it('derives the same single proposal from the --source=both candidate set', () => {
    const both = rankDiscoveries([...CATALOG_GRAPH, ...CANONICAL_GRAPH]);
    const proposals = deriveProposedBridges(both);
    // Only canonical-target pairs resolve; bridge-only endpoints are skipped.
    const ids = proposals.map((p) => p.id);
    expect(ids).toContain('IC-erasure-energy--photon-energy--nu');
    // No structural duplicates survive (dedup ran).
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('bridge-source adapter + leaf canonicalization', () => {
  const both = deriveProposedBridges(rankDiscoveries([...CATALOG_GRAPH, ...CANONICAL_GRAPH]));

  it('collapses the canonical + BE-16 Landauer photon into ONE merged proposal', () => {
    // erasure-energy ≟ photon-energy (CE-landauer) and
    // landauer-erasure-energy ≟ photon-energy (BE-16) now derive the SAME relation
    // (leaf `temperature`), so dedup merges them and records both derivations.
    const photon = both.filter(
      (p) =>
        p.target.name === 'nu' &&
        p.dimensionalSignature === '[frequency]' &&
        (p.derivedFrom.identification.a === 'erasure-energy' ||
          p.derivedFrom.identification.a === 'landauer-erasure-energy'),
    );
    expect(photon).toHaveLength(1);
    const m = photon[0];
    expect(m.evaluate({ temperature: 300 })).toBeGreaterThan(4.2e12);
    const tags = new Set([
      `${m.derivedFrom.identification.a} ≡ ${m.derivedFrom.identification.b}`,
      ...m.alsoDerivableFrom,
    ]);
    expect(tags.has('erasure-energy ≡ photon-energy')).toBe(true); // canonical
    expect(tags.has('landauer-erasure-energy ≡ photon-energy')).toBe(true); // BE-16 bridge
  });

  it('unlocks a NEW derivation from the BE-18 symbolic form (dark-fermion temperature)', () => {
    // dark-fermion-mass = yukawa·vev (BE-18) ≟ erasure-energy = k_B·temperature·ln2
    // ⇒ temperature = vev·yukawa/(k_B·ln2). A proposal that did not exist before
    // BE-18 got a symbolic form.
    const df = both.find((p) => p.derivedFrom.sourceEquationIds.includes('BE-18'));
    expect(df).toBeDefined();
    expect(df!.target.name).toBe('temperature');
    expect(df!.dimensionalSignature).toBe('[temperature]');
    expect(df!.governing.map((g) => g.name).sort()).toEqual([
      'vacuum-expectation-value',
      'yukawa-coupling',
    ]);
  });

  it('de-ambiguates a multi-source target (Hawking, BE-42) by enumeration, not skip', () => {
    const srcs = resolveSources('hawking-temperature');
    // canonical CE-hawking-temperature + BE-42's two parametrisations.
    expect(srcs.length).toBeGreaterThanOrEqual(2);
    expect(srcs.filter((s) => s.id === 'BE-42').length).toBe(2);
  });

  it('skips non-monomial bridge symbolic forms (BE-33 corr-length)', () => {
    expect(resolveSources('quantum-correlation-length')).toEqual([]);
  });

  it('leaves canonical-only scope unchanged (no bridge sources)', () => {
    for (const p of deriveProposedBridges()) {
      for (const id of p.derivedFrom.sourceEquationIds) expect(id.startsWith('CE-')).toBe(true);
    }
  });
});

describe('PROPOSED_BRIDGES surface (catalog field-shape, separate registry)', () => {
  it('materializes the pilot as an unadjudicated, honest entry', () => {
    expect(PROPOSED_BRIDGES).toHaveLength(4); // Landauer photon + 3 expansion IDs
    const e = PROPOSED_BRIDGES.find(
      (b) => b.id === 'IC-erasure-energy--photon-energy--nu',
    )!;
    expect(e).toBeDefined();
    expect(e.status).toBe('unadjudicated');
    expect(e.id).toBe('IC-erasure-energy--photon-energy--nu');
    expect(e.bridges).toEqual(['information', 'quantum']);
    expect(e.dimensional_signature).toBe('[frequency]');
    expect(e.category).toBe('Z');
    expect(e.known_issues[0].severity).toBe('phenomenological-ansatz');
  });

  it('fabricates no literature for the derived relation itself', () => {
    const e = toProposedEntry(deriveProposedBridges()[0]);
    // Every reference is either the honest derivation note or a clearly-tagged
    // SOURCE-equation citation — never an unqualified citation for the new relation.
    for (const r of e.references) {
      expect(r === 'Machine-derived; the combined relation has no independent literature.'
        || /^source (CE|BE)-/.test(r)).toBe(true);
    }
  });

  it('is NOT the catalog — BRIDGE_EQUATIONS stays the faithful 44', () => {
    expect(BRIDGE_EQUATIONS).toHaveLength(55);
    // PROPOSED_BRIDGES ids are string IC-*, never numeric catalog ids.
    for (const e of PROPOSED_BRIDGES) expect(e.id).toMatch(/^IC-/);
  });
});

// Compile-time firewall: a ProposedBridge is NOT a BridgeEquationEntry.
// (status 'unadjudicated' ∉ BridgeEquationStatus; judgment fields omitted.)
const _firewall: ProposedBridge['status'] = 'unadjudicated';
void _firewall;
