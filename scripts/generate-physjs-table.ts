/**
 * Write the TypeScript table `physjsFormalRef` reads from this repository's
 * Lean manifest (`formal/lean/manifest.json`) and the theorem → file index
 * beside it (`scripts/lean-index.ts`). The Lean sources are this repository's
 * `lean/`; their permalinks are at the release tag `v<package.json version>`.
 * This script writes that table and nothing else. A manifest field outside the base
 * set is a nested statement when it has exactly the statement fields, and an
 * error otherwise; no list of nested names is kept here.
 *
 *   bun scripts/generate-physjs-table.ts           # write the committed file
 *   bun scripts/generate-physjs-table.ts --check   # exit 1 when the file is stale
 *   bun scripts/generate-physjs-table.ts --stdout  # print the file
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMAL_REF_KINDS } from '../src/relations/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'formal/lean/manifest.json');
const theoremFilesPath = resolve(root, 'formal/lean/theorem-files.json');
const packagePath = resolve(root, 'package.json');
const outPath = resolve(root, 'src/atlas/physjs-entries.generated.ts');

/** The fields every manifest entry may carry. Any other field is a nested statement, or an error. */
const BASE_FIELDS = new Set<string>(['key', 'bridgeId', 'theorem', 'kind', 'covers', 'coverage', 'leanProof', 'axioms', 'imports']);

/** The kinds a statement may carry: how its theorem relates to the catalog equation its key names. */
const KINDS = new Set<string>(FORMAL_REF_KINDS);

/** The fields of a statement: the top-level one, and each nested one. */
const STATEMENT_KEYS = ['theorem', 'kind', 'covers', 'coverage', 'leanProof', 'axioms'] as const;

interface Statement {
  readonly theorem: string;
  readonly kind: string;
  readonly covers: string;
  readonly coverage: string;
  readonly leanProof: string;
  readonly axioms: readonly string[];
}

interface Entry extends Statement {
  readonly key: string;
  readonly bridgeId: string;
  readonly imports?: string;
  readonly [field: string]: unknown;
}

interface Manifest {
  readonly schema: string;
  readonly toolchain: string;
  readonly mathlib: string;
  readonly physlib: string;
  readonly entries: readonly Entry[];
}

/** `formal/lean/theorem-files.json`: theorem → the Lean file under `lean/` that declares it. */
interface TheoremFiles {
  readonly files: Readonly<Record<string, string>>;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function emitAxioms(axioms: readonly string[]): string {
  return `[${axioms.map(quote).join(', ')}]`;
}

/** The nested statements of `entry`, in manifest order: every field outside the base set. */
function nestedStatements(entry: Entry): { readonly name: string; readonly statement: Statement }[] {
  const out: { name: string; statement: Statement }[] = [];
  for (const [field, value] of Object.entries(entry)) {
    if (BASE_FIELDS.has(field)) continue;
    const keys = typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value).sort() : [];
    if (keys.join() !== [...STATEMENT_KEYS].sort().join()) {
      throw new Error(`manifest entry '${entry.key}' has unexpected field '${field}': not a statement {${STATEMENT_KEYS.join(', ')}}`);
    }
    out.push({ name: field, statement: value as Statement });
  }
  return out;
}

function fileOf(files: TheoremFiles, theorem: string): string {
  const path = files.files[theorem];
  if (path === undefined) throw new Error(`formal/lean/theorem-files.json has no file for '${theorem}'`);
  if (!/^lean\/[^/]+\.lean$/.test(path)) throw new Error(`'${theorem}' file '${path}' is not lean/<File>.lean`);
  return path.slice('lean/'.length);
}

function emitStatementFields(label: string, statement: Statement, file: string, indent: string): string[] {
  if (!KINDS.has(statement.kind)) throw new Error(`manifest statement '${label}' kind '${String(statement.kind)}' is not one of ${[...KINDS].join(', ')}`);
  return [
    `${indent}kind: ${quote(statement.kind)},`,
    `${indent}theorem: ${quote(statement.theorem)},`,
    `${indent}file: ${quote(file)},`,
    `${indent}covers: ${quote(statement.covers)},`,
    `${indent}coverage: ${quote(statement.coverage)},`,
    `${indent}leanProof: ${quote(statement.leanProof)},`,
    `${indent}axioms: ${emitAxioms(statement.axioms)},`,
  ];
}

function emitEntry(entry: Entry, files: TheoremFiles): string {
  const lines = ['  {', `    key: ${quote(entry.key)},`, `    bridgeId: ${quote(entry.bridgeId)},`];
  lines.push(...emitStatementFields(entry.key, entry, fileOf(files, entry.theorem), '    '));
  if (entry.imports !== undefined) lines.push(`    imports: ${quote(entry.imports)},`);
  const nested = nestedStatements(entry);
  if (nested.length === 0) {
    lines.push('    nested: [],');
  } else {
    lines.push('    nested: [');
    for (const { name, statement } of nested) {
      lines.push('      {', `        name: ${quote(name)},`, ...emitStatementFields(`${entry.key}.${name}`, statement, fileOf(files, statement.theorem), '        '), '      },');
    }
    lines.push('    ],');
  }
  lines.push('  },');
  return lines.join('\n');
}

export function renderPhysjsTable(manifest: Manifest, files: TheoremFiles, packageVersion: string): string {
  if (manifest.schema !== 'upt-lean-manifest/v1') {
    throw new Error(`manifest schema is '${manifest.schema}', expected 'upt-lean-manifest/v1'`);
  }
  const body = manifest.entries.map((entry) => emitEntry(entry, files)).join('\n');
  return `/**
 * Generated from \`formal/lean/manifest.json\`, \`formal/lean/theorem-files.json\`
 * and the \`version\` of \`package.json\`.
 * Do not edit by hand.
 * \`bun run physjs:table\` rewrites this file. A stale copy fails the docs gate,
 * and a hand-edited theorem fails \`atlas:formal-gate\`.
 */

/** The release tag whose \`lean/\` tree the permalinks name: \`v\` and the package version. */
export const LEAN_SOURCE_TAG = ${quote(`v${packageVersion}`)};

/** Lean toolchain the lake project builds with, as the manifest records it. */
export const LEAN_TOOLCHAIN = ${quote(manifest.toolchain)};

/** Mathlib version the lake project builds with, as the manifest records it. */
export const LEAN_MATHLIB = ${quote(manifest.mathlib)};

/** Physlib commit the lake project builds with, as the manifest records it. */
export const LEAN_PHYSLIB = ${quote(manifest.physlib)};

/**
 * Compiled entry table copied from the manifest entries. Each
 * statement, nested ones included, carries its manifest kind and the Lean file
 * that declares it; each nested statement is named by its manifest field.
 */
export const PHYSJS_ENTRIES = [
${body}
] as const;
`;
}

function main(): void {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const files = JSON.parse(readFileSync(theoremFilesPath, 'utf8')) as TheoremFiles;
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8')) as { version: string };
  const rendered = renderPhysjsTable(manifest, files, version);
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
