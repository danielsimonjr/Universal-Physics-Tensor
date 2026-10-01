/**
 * Emit the bridge catalog as a versioned JSON artifact (v0.8.0 P-2).
 *
 * The JSON file is the physicist-facing review surface: domain experts
 * can read and PR `data/bridge-catalog.json` without touching
 * TypeScript. `tests/bridges/catalog-json.test.ts` pins the committed
 * artifact against the live catalog, so catalog edits fail CI until
 * `npm run catalog:json` is re-run — the same drift discipline the
 * spec↔index guard uses.
 *
 * Run via `npm run catalog:json` (builds dist/ first; this script
 * imports the COMPILED catalog by relative path — the package
 * `exports` field constrains bare-specifier imports only).
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// `import()` of an absolute path fails on Windows (modern Node's ESM loader
// rejects the bare `C:\…` scheme — ERR_UNSUPPORTED_ESM_URL_SCHEME); the path
// must be a `file://` URL. This was why the artifact went stale — it could
// not be regenerated on the Windows dev box.
const distImport = (...parts) =>
  import(pathToFileURL(resolve(repoRoot, 'dist', ...parts)).href);

const { BRIDGE_EQUATIONS } = await distImport('bridges', 'index.js');
const { catalogFormalRef } = await distImport('atlas', 'catalog-formal-ref.js');

/** The catalog row does not store the reference. Put it back after `id` for the artifact. */
function withCatalogFormalRef(entry) {
  const { id, ...rest } = entry;
  const formalRef = catalogFormalRef(id);
  return formalRef === undefined ? { id, ...rest } : { id, formalRef, ...rest };
}
const { listConfrontations } = await distImport('bridges', 'confrontations.js');
const { ADJUDICATIONS } = await distImport('composition', 'adjudication.js');
const pkg = JSON.parse(
  readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'),
);

// v2 (P10): the discovery review surfaces alongside the catalog — the
// committed real-data confrontations (predicted-vs-observed outcomes) and
// the human adjudication ledger. Both are plain data; a collaborator can
// consume UPT's findings without running the CLI or building the TS.
const confrontations = listConfrontations().map((e) => ({
  bridgeId: e.bridgeId,
  title: e.title,
  kind: e.kind,
  outcome: e.run(),
}));

const artifact = {
  $schema: './bridge-catalog.schema.json',
  schemaVersion: 2,
  packageVersion: pkg.version,
  count: BRIDGE_EQUATIONS.length,
  entries: BRIDGE_EQUATIONS.map(withCatalogFormalRef),
  confrontations,
  adjudications: ADJUDICATIONS,
};

const out = resolve(repoRoot, 'data', 'bridge-catalog.json');
writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n');
console.log(
  `Wrote ${out} (${BRIDGE_EQUATIONS.length} entries, ${confrontations.length} confrontations, ` +
    `${ADJUDICATIONS.length} adjudications, package v${pkg.version})`,
);
