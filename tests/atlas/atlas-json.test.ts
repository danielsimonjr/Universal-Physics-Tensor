/**
 * Atlas Phase 0 S0.6 — committed JSON artifact ↔ live family drift guard.
 *
 * `data/atlas/oscillators.json` is the reviewable surface. This test fails
 * whenever an atlas record changes without re-running `npm run atlas:json` —
 * the same discipline `tests/bridges/catalog-json.test.ts` applies to the
 * bridge catalog.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { toAtlasJson } from '../../src/atlas/serialize.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { deriveEvidence } from '../../src/atlas/derive-evidence.js';
import { artifactPassingWitnessIds, type WitnessResultsArtifact } from '../../src/atlas/witness-artifact.js';
import { ALL_EVIDENCE_TAGS } from '../../src/relations/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(here, '../../package.json'), 'utf-8'),
) as { version: string };
const artifact = JSON.parse(
  readFileSync(resolve(here, '../../data/atlas/oscillators.json'), 'utf-8'),
) as {
  schemaVersion: string;
  packageVersion: string;
  family: string;
  models: Array<Record<string, unknown>>;
  bridges: Array<Record<string, unknown>>;
  rejections: Array<Record<string, unknown>>;
};

/** The committed witness results: the ONLY source of which witnesses pass, so the published evidence is derived against it. */
const witnessResults = JSON.parse(
  readFileSync(resolve(here, '../../data/atlas/witness-results.json'), 'utf-8'),
) as WitnessResultsArtifact;

const schema = JSON.parse(
  readFileSync(resolve(here, '../../data/schemas/atlas-record.v0.json'), 'utf-8'),
) as { definitions: Record<string, any> };

const live = JSON.parse(
  JSON.stringify(toAtlasJson(OSCILLATOR_FAMILY, pkg.version, witnessResults)),
) as typeof artifact;

describe('data/atlas/oscillators.json — committed artifact integrity', () => {
  it('carries schemaVersion "0", the package version and the family name', () => {
    expect(artifact.schemaVersion).toBe('0');
    expect(artifact.packageVersion).toBe(pkg.version);
    expect(artifact.family).toBe('oscillators');
  });

  it('model, bridge and rejection ids match the live family exactly, in order', () => {
    expect(artifact.models.map((m) => m['id'])).toEqual(live.models.map((m) => m['id']));
    expect(artifact.bridges.map((b) => b['id'])).toEqual(
      live.bridges.map((b) => b['id']),
    );
    expect(artifact.rejections.map((r) => r['id'])).toEqual(
      live.rejections.map((r) => r['id']),
    );
  });

  it('FRESHNESS: the committed artifact deep-equals the live projection (re-run npm run atlas:json)', () => {
    expect(artifact).toEqual(live);
  });
});

describe('every registered family has a committed, fresh artifact', () => {
  it.each(ATLAS_FAMILIES.map((f) => [f.family, f] as const))(
    'data/atlas/%s.json deep-equals the live projection (re-run bun run atlas:json)',
    (name, family) => {
      const path = resolve(here, `../../data/atlas/${name}.json`);
      const committedFamily = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
      const liveFamily = JSON.parse(JSON.stringify(toAtlasJson(family, pkg.version, witnessResults))) as unknown;
      expect(committedFamily).toEqual(liveFamily);
    },
  );

  it('the family list is not just the oscillators (a one-family loop would prove nothing new)', () => {
    expect(ATLAS_FAMILIES.map((f) => f.family)).toContain('diffusion');
  });
});

describe('the published evidence is DERIVED, and the artifact obeys its schema', () => {
  it.each(ATLAS_FAMILIES.map((f) => [f.family, f] as const))(
    'data/atlas/%s.json: every bridge\'s evidence equals deriveEvidence against data/atlas/witness-results.json',
    (name, family) => {
      const path = resolve(here, `../../data/atlas/${name}.json`);
      const committed = JSON.parse(readFileSync(path, 'utf-8')) as { bridges: Array<{ id: string; evidence: unknown }> };
      const disagreements: string[] = [];
      for (const bridge of family.bridges) {
        const derived = [...deriveEvidence(bridge, artifactPassingWitnessIds(witnessResults, bridge.id))].sort();
        const published = committed.bridges.find((b) => b.id === bridge.id)?.evidence;
        if (JSON.stringify(published) !== JSON.stringify(derived)) {
          disagreements.push(`${bridge.id}: published ${JSON.stringify(published)}, derived ${JSON.stringify(derived)}`);
        }
      }
      expect(disagreements).toEqual([]);
    },
  );

  it('the derivation is not vacuous: some bridge derives a positive tag, and some derives contradicted', () => {
    const all = ATLAS_FAMILIES.flatMap((f) => f.bridges).map((b) => deriveEvidence(b, artifactPassingWitnessIds(witnessResults, b.id)));
    expect(all.some((tags) => tags.has('numerically-supported'))).toBe(true);
    expect(all.some((tags) => tags.has('formally-proved'))).toBe(true);
    expect(all.some((tags) => tags.has('contradicted'))).toBe(true);
  });

  it('the schema declares evidence as an array of evidence tags, and every committed bridge obeys it', () => {
    const evidence = schema.definitions['atlasBridge']['properties']['evidence'];
    expect(evidence['type']).toBe('array');
    expect(evidence['items']).toEqual({ $ref: '#/definitions/evidenceTag' });
    expect(schema.definitions['evidenceTag']['enum']).toEqual([...ALL_EVIDENCE_TAGS]);
    for (const family of ATLAS_FAMILIES) {
      const committed = JSON.parse(readFileSync(resolve(here, `../../data/atlas/${family.family}.json`), 'utf-8')) as {
        bridges: Array<{ id: string; evidence: unknown }>;
      };
      for (const bridge of committed.bridges) {
        expect(Array.isArray(bridge.evidence), bridge.id).toBe(true);
        for (const tag of bridge.evidence as unknown[]) expect(ALL_EVIDENCE_TAGS as readonly unknown[], bridge.id).toContain(tag);
      }
    }
  });

  it('the schema declares bound.deltaAtBasis, keeps additionalProperties false on the bound, and every committed bound obeys it', () => {
    const bound = schema.definitions['approximationBound'];
    expect(bound['additionalProperties']).toBe(false);
    expect(bound['properties']['deltaAtBasis']['enum']).toEqual(['closed-form', 'numerically-supported']);
    const allowed = new Set(Object.keys(bound['properties']));
    const required = bound['required'] as string[];
    let bounds = 0;
    for (const family of ATLAS_FAMILIES) {
      const committed = JSON.parse(readFileSync(resolve(here, `../../data/atlas/${family.family}.json`), 'utf-8')) as {
        bridges: Array<{ id: string; relation: string; bound?: Record<string, unknown> }>;
      };
      for (const bridge of committed.bridges) {
        if (bridge.bound === undefined) continue;
        bounds += 1;
        for (const key of Object.keys(bridge.bound)) expect(allowed, `${bridge.id}.bound.${key}`).toContain(key);
        for (const key of required) expect(bridge.bound, `${bridge.id}.bound.${key}`).toHaveProperty(key);
        if (bridge.relation === 'approximation') expect(bridge.bound['deltaAtBasis'], bridge.id).toBeDefined();
      }
    }
    expect(bounds).toBeGreaterThan(0);
  });
});
