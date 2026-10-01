/**
 * v0.8.0 Phase 5 (P-2) — committed JSON catalog artifact ↔ live
 * catalog drift guard.
 *
 * `data/bridge-catalog.json` is the physicist-facing review surface.
 * This test fails whenever the TypeScript catalog changes without
 * re-running `npm run catalog:json` — same discipline as the
 * spec↔index guard. Schema checks are hand-rolled (no new runtime
 * deps) against data/bridge-catalog.schema.json's requirements.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { catalogFormalRef } from '../../src/atlas/catalog-formal-ref.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { listConfrontations } from '../../src/bridges/confrontations.js';
import { ADJUDICATIONS } from '../../src/composition/adjudication.js';

const here = dirname(fileURLToPath(import.meta.url));
const artifact = JSON.parse(
  readFileSync(
    resolve(here, '../../data/bridge-catalog.json'),
    'utf-8',
  ),
) as {
  schemaVersion: number;
  packageVersion: string;
  count: number;
  entries: Array<Record<string, unknown>>;
  confrontations: Array<Record<string, unknown>>;
  adjudications: Array<Record<string, unknown>>;
};

describe('data/bridge-catalog.json — committed artifact integrity (P-2)', () => {
  it('schemaVersion 2, count matches the live catalog', () => {
    expect(artifact.schemaVersion).toBe(2);
    expect(artifact.count).toBe(BRIDGE_EQUATIONS.length);
    expect(artifact.entries).toHaveLength(BRIDGE_EQUATIONS.length);
  });

  it('FRESHNESS: committed confrontations + adjudications deep-equal the live registries (v2 discovery surfaces)', () => {
    const liveConfrontations = listConfrontations().map((e) => ({
      bridgeId: e.bridgeId,
      title: e.title,
      kind: e.kind,
      outcome: e.run(),
    }));
    expect(artifact.confrontations).toEqual(
      JSON.parse(JSON.stringify(liveConfrontations)),
    );
    expect(artifact.adjudications).toEqual(
      JSON.parse(JSON.stringify(ADJUDICATIONS)),
    );
  });

  it('entry ids and order match the live catalog exactly', () => {
    expect(artifact.entries.map((e) => e['id'])).toEqual(
      BRIDGE_EQUATIONS.map((e) => e.id),
    );
  });

  it('every entry satisfies the schema requirements (hand-rolled checks)', () => {
    const STATUSES = new Set([
      'established',
      'speculative',
      'highly-speculative',
      'invalid',
    ]);
    for (const e of artifact.entries) {
      expect(typeof e['id']).toBe('number');
      expect(typeof e['name']).toBe('string');
      expect(Array.isArray(e['bridges'])).toBe(true);
      expect(e['bridges']).toHaveLength(2);
      expect(STATUSES.has(e['status'] as string)).toBe(true);
      expect(Array.isArray(e['references'])).toBe(true);
      expect(Array.isArray(e['dependencies'])).toBe(true);
    }
  });

  it('FRESHNESS: committed entries deep-equal the live catalog joined with the overlay (re-run npm run catalog:json after catalog edits)', () => {
    // The catalog row does not store formalRef. The artifact still does:
    // the overlay is joined after id, which is where the committed file
    // carries it. JSON round-trip so undefined-vs-absent normalizes.
    const live = JSON.parse(
      JSON.stringify(
        BRIDGE_EQUATIONS.map((entry) => {
          const { id, ...rest } = entry;
          const formalRef = catalogFormalRef(id);
          return formalRef === undefined ? { id, ...rest } : { id, formalRef, ...rest };
        }),
      ),
    );
    expect(artifact.entries).toEqual(live);
  });
});
