/**
 * Emit every atlas family as a versioned JSON artifact (Phase 0 S0.6; all
 * families since Phase 4 S4.4).
 *
 * Same discipline as `check-catalog-json.mjs`: the committed artifact is the
 * reviewable surface, and `tests/atlas/atlas-json.test.ts` pins it against the
 * live family, so an atlas edit fails CI until `npm run atlas:json` is re-run.
 *
 * Run via `npm run atlas:json` (builds dist/ first; this script imports the
 * COMPILED family by relative path — the package `exports` field constrains
 * bare-specifier imports only).
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// `import()` of an absolute path fails on Windows (ERR_UNSUPPORTED_ESM_URL_SCHEME);
// the path must be a `file://` URL.
const distImport = (...parts) =>
  import(pathToFileURL(resolve(repoRoot, 'dist', ...parts)).href);

const { ATLAS_FAMILIES } = await distImport('atlas', 'families.js');
const { toAtlasJson } = await distImport('atlas', 'serialize.js');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'));

// One artifact per registered family, named for the family. Every family in
// ATLAS_FAMILIES is emitted, so a new family cannot be registered without its
// reviewable artifact (tests/atlas/atlas-json.test.ts pins each one).
const outDir = resolve(repoRoot, 'data', 'atlas');
mkdirSync(outDir, { recursive: true });
for (const family of ATLAS_FAMILIES) {
  const record = toAtlasJson(family, pkg.version);
  const out = resolve(outDir, `${family.family}.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + '\n');
  console.log(
    `Wrote ${out} (${record.models.length} models, ${record.bridges.length} bridges, ` +
      `${record.rejections.length} rejections, schema v${record.schemaVersion}, package v${pkg.version})`,
  );
}

// Phase 6 S6.4: the combined artifact and its JSON-LD projection. The QUDT
// resolution table is data the Lead maintains; the export module receives it.
const { toCombinedAtlasJson, toAtlasJsonLd } = await distImport('atlas', 'export.js');
const qudt = JSON.parse(readFileSync(resolve(outDir, 'qudt-resolution.json'), 'utf-8'));
const combined = resolve(outDir, 'atlas.json');
writeFileSync(combined, JSON.stringify(toCombinedAtlasJson(ATLAS_FAMILIES, pkg.version), null, 2) + '\n');
console.log(`Wrote ${combined} (${ATLAS_FAMILIES.length} families)`);
const jsonld = resolve(outDir, 'atlas.jsonld');
writeFileSync(jsonld, JSON.stringify(toAtlasJsonLd(ATLAS_FAMILIES, pkg.version, qudt), null, 2) + '\n');
console.log(`Wrote ${jsonld}`);
