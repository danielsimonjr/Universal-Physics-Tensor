/**
 * The catalog file is the source. Every record carries a filing, a
 * formalKey resolves in the vendored manifest, and a relation names a
 * record or null. A record with the filing removed fails the same checks.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

interface CatalogEntry {
  id: number;
  type?: string;
  formalKey?: string;
  basis?: boolean;
  derivedFrom?: unknown;
}

interface CatalogFile {
  schemaVersion: number;
  packageVersion: string;
  count: number;
  entries: CatalogEntry[];
  relations: Array<{ id: string; catalogId: number | null }>;
}

function problems(catalog: CatalogFile, packageVersion: string, keys: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (catalog.schemaVersion !== 3) errors.push('schema');
  if (catalog.packageVersion !== packageVersion) errors.push('package');
  if (catalog.count !== catalog.entries.length) errors.push('count');
  const ids = new Set(catalog.entries.map((entry) => entry.id));
  for (const entry of catalog.entries) {
    if (entry.type !== 'standard' && entry.type !== 'cross-domain') errors.push(`type ${entry.id}`);
    if (entry.formalKey !== undefined && !keys.has(entry.formalKey)) errors.push(`formalKey ${entry.id}`);
    if (entry.basis !== undefined && entry.basis !== true) errors.push(`basis ${entry.id}`);
    if (entry.derivedFrom !== undefined && !Array.isArray(entry.derivedFrom)) errors.push(`derivedFrom ${entry.id}`);
  }
  for (const relation of catalog.relations) {
    if (relation.catalogId !== null && !ids.has(relation.catalogId)) errors.push(`relation ${relation.id}`);
  }
  return errors;
}

describe('data/bridge-catalog.json', () => {
  const catalog = JSON.parse(
    readFileSync(resolve(repoRoot, 'data', 'bridge-catalog.json'), 'utf8'),
  ) as CatalogFile;
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as { version: string };
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf8'),
  ) as { entries: Array<{ key: string }> };
  const keys = new Set(manifest.entries.map((entry) => entry.key));

  it('is schema 3, matches the package version, and every record has a filing', () => {
    expect(problems(catalog, pkg.version, keys)).toEqual([]);
    expect(catalog.entries.length).toBeGreaterThan(0);
  });

  it('rejects a record whose filing was removed', () => {
    const broken: CatalogFile = {
      ...catalog,
      entries: catalog.entries.map((entry, index) =>
        index === 0 ? { ...entry, type: undefined } : entry,
      ),
    };
    expect(problems(broken, pkg.version, keys).some((error) => error.startsWith('type'))).toBe(true);
  });
});
