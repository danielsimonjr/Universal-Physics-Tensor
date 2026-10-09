/**
 * Check `data/bridge-catalog.json`. The file is the source; nothing
 * regenerates it.
 *
 * Two layers. Loading `dist/bridges/catalog-load.js` runs every check the
 * library runs at load: the schema (`data/bridge-catalog.schema.json`), the
 * id order, one confrontation per id, the rejection ledger, each outcome on
 * its kind, and each row relation's confidence derived from its row. The
 * cross-file checks below are what the loader cannot know: the package
 * version, the PhysJS manifest keys, and that every relation names a row.
 *
 * Run via `npm run catalog:json`. `tests/bridges/catalog-json.test.ts`
 * imports {@link crossChecks}, so the rules live here once.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

/**
 * The problems of `catalog` the loader does not check: the package version,
 * the manifest keys, and relation → row references. `[]` when sound.
 */
export function crossChecks(catalog, packageVersion, manifestKeys) {
  const errors = [];
  if (catalog.schemaVersion !== 3) errors.push(`schemaVersion is ${catalog.schemaVersion}`);
  if (catalog.packageVersion !== packageVersion) {
    errors.push(`packageVersion ${catalog.packageVersion} is not package.json ${packageVersion}`);
  }
  if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) errors.push('entries is empty');
  const ids = new Set();
  for (const entry of catalog.entries ?? []) {
    ids.add(entry.id);
    if (entry.type !== 'standard' && entry.type !== 'cross-domain') errors.push(`record ${entry.id} has no filing type`);
    if (entry.formalKey !== undefined && !manifestKeys.has(entry.formalKey)) {
      errors.push(`record ${entry.id} formalKey ${entry.formalKey} is not in the manifest`);
    }
  }
  for (const relation of catalog.relations ?? []) {
    if (relation.catalogId !== null && !ids.has(relation.catalogId)) {
      errors.push(`relation ${relation.id} names an unknown catalog id ${relation.catalogId}`);
    }
  }
  return errors;
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const catalog = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'bridge-catalog.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'formal', 'physjs', 'manifest.json'), 'utf8'));
  const keys = new Set(manifest.entries.map((entry) => entry.key));
  const errors = crossChecks(catalog, pkg.version, keys);
  let loaded;
  try {
    loaded = await import(pathToFileURL(resolve(repoRoot, 'dist', 'bridges', 'catalog-load.js')));
  } catch (error) {
    errors.push(`load: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  const file = loaded.bridgeCatalog();
  console.log(
    `catalog ok: schema 3, package v${pkg.version}; ${file.entries.length} records in id order, ` +
      `${file.relations.length} relations (confidence derived from the row), ${file.evaluators.length} evaluators, ` +
      `${file.confrontations.length} confrontations (one per id, outcomes checked on kind), ` +
      `${file.adjudications.length} adjudications, ${file.rejections.length} rejections; ` +
      `${catalog.entries.filter((e) => e.formalKey !== undefined).length} formalKeys in the manifest`,
  );
}
