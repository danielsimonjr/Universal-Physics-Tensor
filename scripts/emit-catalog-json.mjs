/**
 * Check `data/bridge-catalog.json`. The file is the source. This script
 * does not regenerate it.
 *
 * Run via `npm run catalog:json`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const catalog = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'bridge-catalog.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf8'));
const keys = new Set(manifest.entries.map((entry) => entry.key));
const errors = [];

if (catalog.schemaVersion !== 3) errors.push(`schemaVersion is ${catalog.schemaVersion}`);
if (catalog.packageVersion !== pkg.version) {
  errors.push(`packageVersion ${catalog.packageVersion} is not package.json ${pkg.version}`);
}
if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) errors.push('entries is empty');
if (catalog.count !== catalog.entries.length) {
  errors.push(`count ${catalog.count} is not entries ${catalog.entries.length}`);
}
const ids = new Set();
for (const entry of catalog.entries ?? []) {
  ids.add(entry.id);
  if (entry.type !== 'standard' && entry.type !== 'cross-domain') {
    errors.push(`record ${entry.id} has no type`);
  }
  if (entry.formalKey !== undefined && !keys.has(entry.formalKey)) {
    errors.push(`record ${entry.id} formalKey ${entry.formalKey} is not in the manifest`);
  }
  if (entry.basis !== undefined && entry.basis !== true) {
    errors.push(`record ${entry.id} basis is not true`);
  }
  if (entry.derivedFrom !== undefined && !Array.isArray(entry.derivedFrom)) {
    errors.push(`record ${entry.id} derivedFrom is not an array`);
  }
}
for (const relation of catalog.relations ?? []) {
  if (relation.catalogId !== null && !ids.has(relation.catalogId)) {
    errors.push(`relation ${relation.id} names an unknown catalog id ${relation.catalogId}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(
  `catalog ok: schema 3, ${catalog.entries.length} records, package v${pkg.version}`,
);
