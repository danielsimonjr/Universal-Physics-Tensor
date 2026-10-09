/**
 * Atlas Phase 6, S6.4 — the combined artifact, the JSON-LD projection, and the
 * QUDT resolution table.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLAS_ID_PREFIX, toAtlasJsonLd, toCombinedAtlasJson } from '../../src/atlas/export.js';
import type { QudtResolution } from '../../src/atlas/export.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import type { WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../../data/atlas');
const read = (f: string): unknown => JSON.parse(readFileSync(resolve(dataDir, f), 'utf-8'));
const pkg = JSON.parse(readFileSync(resolve(here, '../../package.json'), 'utf-8')) as { version: string };
const qudt = read('qudt-resolution.json') as QudtResolution;
const witnessResults = read('witness-results.json') as WitnessResultsArtifact;
const roundTrip = (x: unknown): unknown => JSON.parse(JSON.stringify(x));

describe('data/atlas/atlas.json — the combined artifact', () => {
  it('FRESHNESS: deep-equals the live projection (re-run bun run atlas:json)', () => {
    expect(read('atlas.json')).toEqual(roundTrip(toCombinedAtlasJson(ATLAS_FAMILIES, pkg.version, witnessResults)));
  });

  it('keeps schemaVersion 0 (the only Phase 4 field change, formalRef, is additive and optional)', () => {
    expect((read('atlas.json') as { schemaVersion: string }).schemaVersion).toBe('0');
  });

  it('carries every registered family', () => {
    const fams = (read('atlas.json') as { families: Array<{ family: string }> }).families.map((f) => f.family);
    expect(fams).toEqual(ATLAS_FAMILIES.map((f) => f.family));
  });
});

describe('data/atlas/atlas.jsonld — the JSON-LD projection', () => {
  const doc = read('atlas.jsonld') as { '@graph': Array<Record<string, unknown>> };

  it('FRESHNESS: deep-equals the live projection', () => {
    expect(doc).toEqual(roundTrip(toAtlasJsonLd(ATLAS_FAMILIES, pkg.version, qudt)));
  });

  it('every node id is a stable URN and unique', () => {
    const ids = doc['@graph'].map((n) => n['@id'] as string);
    expect(ids.every((id) => id.startsWith(ATLAS_ID_PREFIX))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every bridge endpoint points at a model node in the same graph (PROV-O wasDerivedFrom included)', () => {
    const ids = new Set(doc['@graph'].map((n) => n['@id']));
    for (const n of doc['@graph']) {
      if (n['upt:relation'] === undefined) continue;
      const refs = [
        ...(n['upt:premise'] as Array<{ '@id': string }>),
        n['upt:conclusion'] as { '@id': string },
        ...(n['prov:wasDerivedFrom'] as Array<{ '@id': string }>),
      ];
      for (const r of refs) expect(ids.has(r['@id'])).toBe(true);
    }
  });
});

describe('data/atlas/qudt-resolution.json', () => {
  const allKeys = ATLAS_FAMILIES.flatMap((f) => f.models.flatMap((m) => m.parameters.map((p) => `${m.id}/${p.name}`)));

  it('has an entry for EVERY model parameter, and no stale entries', () => {
    expect(Object.keys(qudt.entries).sort()).toEqual([...allKeys].sort());
  });

  it('the export THROWS on a parameter with no entry, rather than exporting it blank', () => {
    const { ['model-spring/m']: _dropped, ...rest } = qudt.entries;
    expect(() => toAtlasJsonLd(ATLAS_FAMILIES, pkg.version, { ...qudt, entries: rest })).toThrow(
      /no QUDT resolution entry for model-spring\/m/,
    );
  });

  it('keys by (model, parameter): kappa is a spring constant in the chain and a conductivity in the heat model', () => {
    expect(qudt.entries['model-chain/kappa']).toBeNull();
    expect(qudt.entries['model-heat/kappa']).toBe('http://qudt.org/vocab/quantitykind/ThermalConductivity');
  });

  it('the deliberately unresolved kinds are exactly the ones with no same-meaning QUDT kind', () => {
    const unresolved = Object.entries(qudt.entries)
      .filter(([, v]) => v === null)
      .map(([k]) => k.split('/')[1]);
    expect([...new Set(unresolved)].sort()).toEqual(['EI', 'b', 'beta', 'gamma', 'k', 'kappa']);
  });
});
