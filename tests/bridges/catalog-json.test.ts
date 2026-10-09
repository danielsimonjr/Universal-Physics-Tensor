/**
 * The catalog file is the source. `scripts/check-catalog-json.mjs` holds the
 * cross-file rules once (`crossChecks`); this test runs them on the live
 * file and proves they fire on a broken copy. The in-file rules (schema,
 * order, ledgers, outcomes, confidence) are the loader's, exercised by the
 * loader's own tests.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { crossChecks } from '../../scripts/check-catalog-json.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

interface CatalogEntry {
  id: number;
  type?: string;
  formalKey?: string;
}

interface CatalogFile {
  schemaVersion: number;
  packageVersion: string;
  entries: CatalogEntry[];
  relations: Array<{ id: string; catalogId: number | null }>;
}

describe('data/bridge-catalog.json', () => {
  const catalog = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'bridge-catalog.json'), 'utf8')) as CatalogFile;
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as { version: string };
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf8')) as {
    entries: Array<{ key: string }>;
  };
  const keys = new Set(manifest.entries.map((entry) => entry.key));

  it('is schema 3, matches the package version, every record has a filing and every relation names a row', () => {
    expect(crossChecks(catalog, pkg.version, keys)).toEqual([]);
    expect(catalog.entries.length).toBeGreaterThan(0);
  });

  it('rejects a record whose filing was removed, a stale package version, a key outside the manifest and a relation of no row', () => {
    const noType: CatalogFile = { ...catalog, entries: catalog.entries.map((entry, i) => (i === 0 ? { ...entry, type: undefined } : entry)) };
    expect(crossChecks(noType, pkg.version, keys)).toEqual([`record ${catalog.entries[0]!.id} has no filing type`]);
    expect(crossChecks(catalog, '0.0.0', keys)).toEqual([`packageVersion ${catalog.packageVersion} is not package.json 0.0.0`]);
    const keyed = catalog.entries.find((entry) => entry.formalKey !== undefined)!;
    expect(crossChecks(catalog, pkg.version, new Set([...keys].filter((k) => k !== keyed.formalKey)))).toEqual([
      `record ${keyed.id} formalKey ${keyed.formalKey} is not in the manifest`,
    ]);
    const orphan: CatalogFile = { ...catalog, relations: [...catalog.relations, { id: 'be-9999', catalogId: 9999 }] };
    expect(crossChecks(orphan, pkg.version, keys)).toEqual(['relation be-9999 names an unknown catalog id 9999']);
  });

  it('the package script runs the check script, not an emitter', () => {
    const scripts = (JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['catalog:json']).toBe('npm run build && node scripts/check-catalog-json.mjs');
  });
});
