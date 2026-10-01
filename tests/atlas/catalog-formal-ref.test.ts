/**
 * Catalog formal references moved off the bridge rows.
 *
 * `data/bridge-catalog.json` is the record of each reference as it was
 * stored on the catalog entry: kind, url, covers, and the rest.
 * `catalogFormalRef` is the same reference after the move.
 * `deriveEvidence` of one must match `deriveEvidence` of the other.
 * The catalog path still omits the reference.
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
  NO_PASSING_WITNESSES,
} from '../../src/atlas/derive-evidence.js';
import type { FormalRef } from '../../src/relations/types.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { deriveEdgeEvidence } from '../../src/cli/map-evidence.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const artifact = JSON.parse(readFileSync(resolve(root, 'data/bridge-catalog.json'), 'utf-8')) as {
  entries: Array<{ id: number; formalRef?: FormalRef }>;
};

function tags(record: Parameters<typeof deriveEvidence>[0]): string[] {
  return [...deriveEvidence(record, NO_PASSING_WITNESSES)].sort();
}

describe('catalog formalRef overlay', () => {
  it('each overlay reference equals the committed catalog formalRef, including kind, url, and covers', () => {
    expect(artifact.entries.length).toBe(BRIDGE_EQUATIONS.length);
    for (const live of BRIDGE_EQUATIONS) {
      const stored = artifact.entries.find((entry) => entry.id === live.id)?.formalRef ?? null;
      const overlay = catalogFormalRef(live.id) ?? null;
      expect(overlay, `be-${live.id}`).toEqual(stored);
      expect(overlay?.kind, `be-${live.id} kind`).toBe(stored?.kind);
      expect(overlay?.url, `be-${live.id} url`).toBe(stored?.url);
      expect(overlay?.covers, `be-${live.id} covers`).toBe(stored?.covers);
    }
  });

  it('deriveEvidence of the overlay equals deriveEvidence of the committed reference', () => {
    let differedFromCatalogPath = 0;
    for (const live of BRIDGE_EQUATIONS) {
      const stored = artifact.entries.find((entry) => entry.id === live.id)?.formalRef;
      const overlay = catalogFormalRef(live.id);
      const before = tags({
        ...catalogEvidenceInput(live),
        ...(stored !== undefined ? { formalRef: stored } : {}),
      });
      const after = tags({
        ...catalogEvidenceInput(live),
        ...(overlay !== undefined ? { formalRef: overlay } : {}),
      });
      expect(after, `be-${live.id}`).toEqual(before);
      const catalogPath = [...deriveEdgeEvidence(live.id)].sort();
      expect(catalogPath, `be-${live.id} catalog path`).toEqual(tags(catalogEvidenceInput(live)));
      if (before.join('|') !== catalogPath.join('|')) differedFromCatalogPath += 1;
    }
    expect(differedFromCatalogPath).toBeGreaterThan(0);
  });

  it('CONTROL: rewriting kind changes the tag set', () => {
    const property = catalogFormalRef(16);
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
