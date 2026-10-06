/**
 * Catalog formal references moved off the bridge rows.
 *
 * `data/bridge-catalog.json` is the record of each reference as it was
 * stored on the catalog entry: kind, url, covers, and the rest.
 * `catalogFormalRef` is the same reference after the move.
 * `deriveEvidence` of one must match `deriveEvidence` of the other.
 * The catalog path passes a kind-`bridge` reference and omits every other kind.
 *
 * A control rewrites kind. If that rewrite left the tag set alone, the
 * equality above would not be reading kind.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import {
  catalogEvidenceInput,
  deriveEvidence,
  deriveEvidenceForVerdict,
  NO_PASSING_WITNESSES,
} from '../../src/atlas/derive-evidence.js';
import type { FormalRef } from '../../src/relations/types.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { adjudicateBridgeEntry } from '../../src/bridges/membership.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifact = JSON.parse(readFileSync(resolve(root, 'data/bridge-catalog.json'), 'utf-8')) as {
  entries: Array<{ id: number; formalKey?: string; formalRef?: FormalRef }>;
};

function tags(record: Parameters<typeof deriveEvidence>[0]): string[] {
  return [...deriveEvidence(record, NO_PASSING_WITNESSES)].sort();
}

describe('catalog formalRef overlay', () => {
  it('stores a manifest key and does not store a formalRef', () => {
    expect(artifact.entries.length).toBe(BRIDGE_EQUATIONS.length);
    expect(artifact.entries.some((entry) => entry.formalRef !== undefined)).toBe(false);
    const withKey = artifact.entries.filter((entry) => entry.formalKey !== undefined);
    const withoutKey = artifact.entries.filter((entry) => entry.formalKey === undefined);
    expect(withKey.length).toBeGreaterThan(0);
    expect(withoutKey.length).toBeGreaterThan(0);
    for (const entry of withKey) {
      const overlay = catalogFormalRef(entry.id);
      expect(overlay, `be-${entry.id}`).toBeDefined();
      expect(overlay?.system, `be-${entry.id}`).toBe('lean4-physjs');
    }
    for (const entry of withoutKey) {
      expect(catalogFormalRef(entry.id), `be-${entry.id}`).toBeUndefined();
    }
  });

  it('the catalog path keeps a bridge-kind reference and omits every other kind', () => {
    for (const live of BRIDGE_EQUATIONS) {
      const catalogPath = [...deriveEdgeEvidence(live.id)].sort();
      const fromInput = [
        ...deriveEvidenceForVerdict(
          adjudicateBridgeEntry(live),
          catalogEvidenceInput(live),
          NO_PASSING_WITNESSES,
        ),
      ].sort();
      expect(catalogPath, `be-${live.id} catalog path`).toEqual(fromInput);
    }
    const property = catalogFormalRef(11);
    expect(property?.kind).toBe('property');
    const withProperty = tags({
      ...catalogEvidenceInput(BRIDGE_EQUATIONS.find((entry) => entry.id === 11)!),
      formalRef: property,
    });
    expect(withProperty).toContain('formally-proved-property');
    expect([...deriveEdgeEvidence(11)]).not.toContain('formally-proved-property');
  });

  it('CONTROL: rewriting kind changes the tag set', () => {
    const property = catalogFormalRef(29);
    expect(property?.kind).toBe('property');
    const asProperty = tags({ formalRef: property });
    const asBridge = tags({ formalRef: { ...property!, kind: 'bridge' } });
    expect(asProperty).not.toEqual(asBridge);
    expect(asProperty).toContain('formally-proved-property');
    expect(asProperty).not.toContain('formally-proved');
    expect(asBridge).toContain('formally-proved');
  });

  it('a key the overlay does not contain resolves to no reference', () => {
    expect(catalogFormalRef(11)).toBeDefined();
    expect(catalogFormalRef(20)).toBeUndefined();
    expect(catalogFormalRef(999)).toBeUndefined();
  });
});
