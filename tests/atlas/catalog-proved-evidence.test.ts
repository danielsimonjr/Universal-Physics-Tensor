/**
 * A manifest-checked PhysJS formalRef of kind `bridge` is passed on the
 * catalog path. Catalog evidence and edge evidence are that same derivation.
 *
 * Before the path passed the reference, this file failed: `be-16`, `be-63`,
 * and `be-66` derived `proposed` on both paths, while `deriveEvidence` of
 * the same reference derived `formally-proved`.
 *
 * A derivation-step (`be-30`) and a rejected partial (`be-35`) stay off
 * `formally-proved`. An unadjudicated row (`be-50`) stays `proposed`.
 * `composeEdges(be42Edge, be16Edge)` stays `highly-speculative`.
 */

import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import {
  catalogEvidenceInput,
  deriveEvidence,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../../src/atlas/derive-evidence.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';
import { adjudicateBridgeEntry } from '../../src/bridges/membership.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { composeEdges } from '../../src/composition/compose.js';
import { be16Edge, be42Edge } from '../../src/composition/edges/calibration.js';

function row(id: number) {
  const entry = BRIDGE_EQUATIONS.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`missing be-${id}`);
  return entry;
}

function catalogTags(id: number): string[] {
  const entry = row(id);
  return [
    ...deriveEvidenceForVerdict(
      adjudicateBridgeEntry(entry),
      catalogEvidenceInput(entry),
      NO_PASSING_WITNESSES,
    ),
  ].sort();
}

function edgeTags(id: number): string[] {
  return [...deriveEdgeEvidence(id)].sort();
}

describe('catalog and edge evidence for a manifest-checked formalRef', () => {
  it('a kind-bridge reference is formally-proved on both paths', () => {
    for (const id of [16, 63, 66]) {
      const ref = catalogFormalRef(id);
      expect(ref?.kind, `be-${id}`).toBe('bridge');
      expect(ref?.system, `be-${id}`).toBe('lean4-physjs');
      expect(ref?.fidelity, `be-${id}`).toBe('sanity-lemmas');
      expect(deriveEvidence({ formalRef: ref }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(true);
      expect(catalogTags(id), `be-${id} catalog`).toEqual(['formally-proved']);
      expect(edgeTags(id), `be-${id} edge`).toEqual(['formally-proved']);
    }
  });

  it('a derivation-step stays proposed, and be-35 stays contradicted', () => {
    expect(catalogFormalRef(30)?.kind).toBe('derivation-step');
    expect(catalogTags(30)).toEqual(['proposed']);
    expect(edgeTags(30)).toEqual(['proposed']);
    expect(deriveEvidence({ formalRef: catalogFormalRef(30) }, NO_PASSING_WITNESSES).has('formally-proved')).toBe(
      false,
    );
    expect(catalogFormalRef(35)?.kind).toBe('derivation-step');
    expect(adjudicateBridgeEntry(row(35))).toBe('not-a-bridge');
    expect(catalogTags(35)).toEqual(['contradicted']);
    expect(edgeTags(35)).toEqual(['contradicted']);
    expect(catalogTags(35)).not.toContain('formally-proved');
  });

  it('an unadjudicated kind-bridge row stays proposed, and a property is not formally-proved', () => {
    expect(catalogFormalRef(50)?.kind).toBe('bridge');
    expect(adjudicateBridgeEntry(row(50))).toBe('unadjudicated');
    expect(catalogTags(50)).toEqual(['proposed']);
    expect(edgeTags(50)).toEqual(['proposed']);
    expect(catalogFormalRef(11)?.kind).toBe('property');
    expect(catalogTags(11)).toEqual(['proposed']);
    expect(edgeTags(11)).toEqual(['proposed']);
    expect(edgeTags(11)).not.toContain('formally-proved-property');
  });

  it('a chain through be-16 keeps the weaker grade', () => {
    expect(be16Edge.confidence).toBe('speculative');
    expect(composeEdges(be42Edge, be16Edge).confidence).toBe('highly-speculative');
    expect(edgeTags(42)).not.toContain('formally-proved');
    expect(edgeTags(16)).toContain('formally-proved');
  });
});
