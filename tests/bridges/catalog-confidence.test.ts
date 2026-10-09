/**
 * A relation's confidence is its catalog row's status. The row is the one
 * owner; the file stores a confidence only on a relation that has no row.
 *
 * Before 9.0.1 the file stored a second copy on every relation, and be-37's
 * copy said `established` while its row said `speculative`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalogEntry, catalogRelations, loadCatalog } from '../../src/bridges/catalog-load.js';
import type { CatalogFileRecord } from '../../src/bridges/catalog-types.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'data', 'bridge-catalog.json'), 'utf8'),
) as CatalogFileRecord;

describe('relation confidence is the row status', () => {
  it('every relation with a catalog id carries its row status as its confidence', () => {
    const drift = catalogRelations()
      .filter((relation) => relation.catalogId !== null)
      .filter((relation) => relation.confidence !== catalogEntry(relation.catalogId!)!.status)
      .map((relation) => `${relation.id}: relation ${relation.confidence}, row ${catalogEntry(relation.catalogId!)!.status}`);
    expect(drift).toEqual([]);
  });

  it('the file stores no confidence on a relation with a catalog id, and one on each row-less relation', () => {
    const stored = raw.relations.filter((relation) => relation.catalogId !== null && relation.confidence !== undefined).map((r) => r.id);
    expect(stored).toEqual([]);
    const rowless = raw.relations.filter((relation) => relation.catalogId === null);
    expect(rowless.length).toBeGreaterThan(0);
    for (const relation of rowless) expect(relation.confidence, relation.id).toBeDefined();
  });

  it('the loader refuses a stored confidence on a row relation', () => {
    const index = raw.relations.findIndex((relation) => relation.catalogId !== null);
    const broken: CatalogFileRecord = {
      ...raw,
      relations: raw.relations.map((relation, i) => (i === index ? { ...relation, confidence: 'established' as const } : relation)),
    };
    expect(() => loadCatalog(broken)).toThrow(/stores a confidence; the row's status is the owner/);
  });

  it('the loader refuses a row-less relation without a confidence', () => {
    const broken: CatalogFileRecord = {
      ...raw,
      relations: raw.relations.map((relation) => {
        if (relation.catalogId !== null) return relation;
        const { confidence: _dropped, ...rest } = relation;
        return rest;
      }),
    };
    expect(() => loadCatalog(broken)).toThrow(/has no catalog row and no confidence/);
  });

  it('the loader refuses a relation whose row is invalid', () => {
    const relation = raw.relations.find((row) => row.catalogId !== null)!;
    const broken: CatalogFileRecord = {
      ...raw,
      entries: raw.entries.map((entry) => (entry.id === relation.catalogId ? { ...entry, status: 'invalid' as const } : entry)),
    };
    expect(() => loadCatalog(broken)).toThrow(/row is invalid/);
  });

  it('be-37 is speculative on both surfaces: the row says why in its notes', () => {
    const row = catalogEntry(37)!;
    expect(row.status).toBe('speculative');
    expect(row.notes).toMatch(/bridge framing/);
    expect(catalogRelations().find((relation) => relation.id === 'be-37')!.confidence).toBe('speculative');
  });
});
