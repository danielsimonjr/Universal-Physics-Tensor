/**
 * Write the TypeScript table `physjsFormalRef` reads from the vendored
 * PhysJS manifest. The manifest is the pin. This script writes that table
 * and nothing else.
 *
 *   bun scripts/generate-physjs-table.ts           # write the committed file
 *   bun scripts/generate-physjs-table.ts --check   # exit 1 when the file is stale
 *   bun scripts/generate-physjs-table.ts --stdout  # print the file
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'formal/physjs/manifest.json');
const outPath = resolve(root, 'src/atlas/physjs-entries.generated.ts');

const NESTED_FIELDS = [
  'planeWave',
  'oneLoop',
  'inversion',
  'vacuum',
  'corollary',
  'friedmann',
  'lengthMonomial',
  'torsionMonomial',
  'coefficientNotFixed',
  'unitCoefficient',
  'scalingShape',
  'everyPower',
  'perpendicularQuartic',
  'tolmanRatio',
] as const;

const ENTRY_FIELDS = new Set<string>([
  'key',
  'bridgeId',
  'theorem',
  'covers',
  'coverage',
  'leanProof',
  'axioms',
  'imports',
  ...NESTED_FIELDS,
]);

const NESTED_KEYS = ['theorem', 'covers', 'coverage', 'leanProof', 'axioms'] as const;

interface Nested {
  readonly theorem: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

interface Entry {
  readonly key: string;
  readonly bridgeId: string;
  readonly theorem: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
  readonly imports?: string;
  readonly [field: string]: string | readonly string[] | Nested | undefined;
}

interface Manifest {
  readonly schema: string;
  readonly commit: string;
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
  readonly entries: readonly Entry[];
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function emitAxioms(axioms: readonly string[]): string {
  return `[${axioms.map(quote).join(', ')}]`;
}

function emitNested(nested: Nested): string {
  for (const field of Object.keys(nested)) {
    if (!(NESTED_KEYS as readonly string[]).includes(field)) {
      throw new Error(`nested statement has unexpected field '${field}'`);
    }
  }
  return [
    '{',
    `      theorem: ${quote(nested.theorem)},`,
    `      covers: ${quote(nested.covers)},`,
    `      coverage: ${quote(nested.coverage)},`,
    `      leanProof: ${quote(nested.leanProof)},`,
    `      axioms: ${emitAxioms(nested.axioms)},`,
    '    }',
  ].join('\n');
}

function emitEntry(entry: Entry): string {
  for (const field of Object.keys(entry)) {
    if (!ENTRY_FIELDS.has(field)) {
      throw new Error(`manifest entry '${entry.key}' has unexpected field '${field}'`);
    }
  }
  const lines = [
    '  {',
    `    key: ${quote(entry.key)},`,
    `    bridgeId: ${quote(entry.bridgeId)},`,
    `    theorem: ${quote(entry.theorem)},`,
    `    covers: ${quote(entry.covers)},`,
    `    coverage: ${quote(entry.coverage)},`,
    `    leanProof: ${quote(entry.leanProof)},`,
    `    axioms: ${emitAxioms(entry.axioms)},`,
  ];
  if (entry.imports !== undefined) {
    lines.push(`    imports: ${quote(entry.imports)},`);
  }
  for (const field of NESTED_FIELDS) {
    const nested = entry[field];
    if (nested === undefined) continue;
    if (typeof nested === 'string' || Array.isArray(nested)) {
      throw new Error(`manifest entry '${entry.key}' field '${field}' is not an object`);
    }
    lines.push(`    ${field}: ${emitNested(nested)},`);
  }
  lines.push('  },');
  return lines.join('\n');
}

export function renderPhysjsTable(manifest: Manifest): string {
  if (manifest.schema !== 'physjs-bridge-manifest/v1') {
    throw new Error(`manifest schema is '${manifest.schema}', expected 'physjs-bridge-manifest/v1'`);
  }
  const body = manifest.entries.map(emitEntry).join('\n');
  return `/**
 * Generated from \`formal/physjs/manifest.json\`. Do not edit by hand.
 * \`bun run physjs:table\` rewrites this file. A stale copy fails the docs gate,
 * and a hand-edited theorem fails \`atlas:formal-gate\`.
 */

export const PHYSJS_COMMIT = ${quote(manifest.commit)};

export const PHYSJS_TOOLCHAIN = ${quote(manifest.toolchain)};

export const PHYSJS_MATHLIB = ${quote(manifest.mathlib)};

export const PHYSJS_PHYS_LIB = ${quote(manifest.physlib)};

export const PHYSJS_ENTRIES = [
${body}
] as const;
`;
}

function main(): void {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const rendered = renderPhysjsTable(manifest);
  const stdout = process.argv.includes('--stdout');
  const check = process.argv.includes('--check');
  if (stdout) {
    process.stdout.write(rendered);
    return;
  }
  if (check) {
    const committed = readFileSync(outPath, 'utf8');
    if (committed !== rendered) {
      process.stderr.write('src/atlas/physjs-entries.generated.ts is stale. Run bun run physjs:table.\n');
      process.exit(1);
    }
    return;
  }
  writeFileSync(outPath, rendered);
}

const isDirect = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();
