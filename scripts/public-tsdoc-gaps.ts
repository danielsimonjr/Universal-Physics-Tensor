/**
 * TSDoc gaps on the public surface.
 *
 * Collects every public name — the root runtime snapshot, the explicit type
 * exports of `src/index.ts`, the members of the `atlas` namespace
 * (`src/atlas/public.ts`), and the `MathTSEngine` subpath export — resolves
 * each to the module holding its declaration (skipping pure re-export
 * clauses), and reports the ones whose JSDoc has no summary line, using
 * `fileDocs` from `tools/code-docs-ratchet/check.ts`.
 *
 * `--check` exits 1 when any gap remains, 0 when the surface is fully
 * documented.
 *
 * @module scripts/public-tsdoc-gaps
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileDocs } from '../tools/code-docs-ratchet/check.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');

function readSrc(relFromSrc: string): string {
  return readFileSync(resolve(SRC, relFromSrc), 'utf8');
}

/** Source reader override for tests; restored by the caller. */
let readSource: (rel: string) => string = readSrc;

/** Inject a source reader (tests) and return the restore function. */
export function setSourceReaderForTest(reader: (rel: string) => string): () => void {
  const previous = readSource;
  readSource = reader;
  return () => {
    readSource = previous;
  };
}

/** `./x/y.js` relative to a module in `src/` → `src/x/y.ts`. */
function targetFile(fromRel: string, spec: string): string {
  const base = resolve(dirname(resolve(SRC, fromRel)), spec.replace(/\.js$/, '.ts'));
  return base.startsWith(SRC + '/') ? base.slice(SRC.length + 1) : base;
}

interface ExportClause {
  /** Exported name → local name (equal without `as`). */
  readonly names: ReadonlyMap<string, string>;
  /** Re-export target spec, or null for a clause of local declarations. */
  readonly from: string | null;
  readonly typeOnly: boolean;
}

interface ModuleExports {
  /** Clauses in source order. */
  readonly clauses: readonly ExportClause[];
  /** Names declared by an inline `export <decl> name`. */
  readonly declared: ReadonlySet<string>;
}

/** Strip line and block comments so clause regexes cannot match inside one. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

function moduleExports(rel: string): ModuleExports {
  const text = stripComments(readSource(rel));
  const clauses: ExportClause[] = [];
  const declared = new Set<string>();
  const clauseRe = /export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*'([^']+)')?/g;
  for (const match of text.matchAll(clauseRe)) {
    const names = new Map<string, string>();
    for (const raw of match[2].split(',')) {
      const spec = raw.trim();
      if (spec === '') continue;
      const asMatch = spec.match(/^type\s+([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (asMatch !== null) {
        names.set(asMatch[2], asMatch[1]);
        continue;
      }
      const parts = spec.split(/\s+as\s+/);
      const exported = (parts[1] ?? parts[0]).trim();
      const local = parts[0].replace(/^type\s+/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(exported)) names.set(exported, local);
    }
    if (names.size > 0) clauses.push({ names, from: match[3] ?? null, typeOnly: match[1] !== undefined });
  }
  const nsRe = /export\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*'([^']+)'/g;
  for (const match of text.matchAll(nsRe)) {
    clauses.push({ names: new Map([[match[1], match[1]]]), from: match[2], typeOnly: false, });
  }
  const declRe = /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\s*\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(declRe)) declared.add(match[1]);
  return { clauses, declared };
}

interface Site {
  readonly file: string;
}

function resolveName(rel: string, name: string, seen: Set<string>): Site[] {
  if (seen.has(rel)) return [];
  seen.add(rel);
  const mod = moduleExports(rel);
  if (mod.declared.has(name)) return [{ file: rel }];
  const sites: Site[] = [];
  for (const clause of mod.clauses) {
    if (!clause.names.has(name)) continue;
    if (clause.from === null) return [{ file: rel }];
    sites.push(...resolveName(targetFile(rel, clause.from), clause.names.get(name)!, seen));
  }
  return sites;
}

/** Every exported name of a module, following re-export clauses one hop. */
function topLevelNames(rel: string): { runtime: Set<string>; types: Set<string> } {
  const mod = moduleExports(rel);
  const runtime = new Set<string>();
  const types = new Set<string>();
  for (const clause of mod.clauses) {
    for (const exported of clause.names.keys()) (clause.typeOnly ? types : runtime).add(exported);
  }
  for (const name of mod.declared) runtime.add(name);
  return { runtime, types };
}

function documented(site: Site, name: string): boolean {
  const docs = fileDocs(readSource(site.file), site.file);
  for (const [key, symbol] of docs.symbols) {
    if (key.endsWith(`:${name}`) && symbol.documented) return true;
  }
  return false;
}

function snapshotRuntimeNames(): Set<string> {
  const snap = readFileSync(resolve(ROOT, 'tests/api/__snapshots__/public-surface.test.ts.snap'), 'utf8');
  const match = snap.match(/runtime exports match[^`]*1`\] = `\n(\[[\s\S]*?\])\n`;\s*$/);
  if (match === null) throw new Error('runtime-export snapshot not found');
  return new Set(JSON.parse(match[1].replace(/,(\s*[\]}])/g, '$1')) as string[]);
}

function collect(): { name: string; via: string }[] {
  const entries: { name: string; via: string }[] = [];
  for (const name of snapshotRuntimeNames()) entries.push({ name, via: 'root' });
  for (const name of topLevelNames('index.ts').types) entries.push({ name, via: 'root' });
  const atlas = topLevelNames('atlas/public.ts');
  for (const name of atlas.runtime) entries.push({ name, via: 'atlas' });
  for (const name of atlas.types) entries.push({ name, via: 'atlas' });
  entries.push({ name: 'MathTSEngine', via: 'numerical/mathts-engine' });
  return entries;
}

function gaps(): { name: string; via: string; file: string }[] {
  const found: { name: string; via: string; file: string }[] = [];
  const seenNames = new Set<string>();
  for (const entry of collect()) {
    const key = `${entry.via}:${entry.name}`;
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    const entryRoot = entry.via === 'atlas' ? 'atlas/public.ts' : entry.via === 'root' ? 'index.ts' : `${entry.via}.ts`;
    if (entry.name === 'atlas') continue;
    const sites = resolveName(entryRoot, entry.name, new Set());
    if (sites.length === 0) {
      console.error(`UNRESOLVED ${entry.via} ${entry.name}`);
      continue;
    }
    if (sites.every((site) => !documented(site, entry.name))) {
      found.push({ name: entry.name, via: entry.via, file: sites[0].file });
    }
  }
  return found;
}

/** Every public symbol whose resolved declaration has no JSDoc summary line. */
export function publicTsdocGaps(): { name: string; via: string; file: string }[] {
  return gaps();
}

function main(): void {
  const check = process.argv.includes('--check');
  const list = gaps();
  for (const gap of list) console.log(`${gap.file} ${gap.name}`);
  if (check && list.length > 0) process.exit(1);
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === resolve(fileURLToPath(import.meta.url))) main();
