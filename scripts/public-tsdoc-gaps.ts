/**
 * TSDoc gaps on the public surface.
 *
 * Collects every public name — the root runtime snapshot, the explicit type
 * exports of `src/index.ts` (including inline `type` specifiers inside mixed
 * `export { value, type T }` clauses and inline `export interface` /
 * `export type` declarations), the members of the `atlas` namespace
 * (`src/atlas/public.ts`), and the `MathTSEngine` subpath export — resolves
 * each to the module holding its declaration (skipping pure re-export
 * clauses), and reports a name if any resolved site's JSDoc has no summary
 * line, using `fileDocs` from `tools/code-docs-ratchet/check.ts`.
 *
 * `--check` exits 1 when any gap remains, when any name is unresolved, or
 * when `src/index.ts` contains a bare `export * from` or `export type * from`
 * (namespace `export * as atlas` is allowed). Specifiers may use `'` or `"`.
 *
 * @module scripts/public-tsdoc-gaps
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileDocs, type SymbolDoc } from '../tools/code-docs-ratchet/check.js';

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

/** One name in an `export { … }` clause, with per-specifier kind. */
interface ExportSpecifier {
  readonly exported: string;
  readonly local: string;
  readonly kind: 'type' | 'value';
}

interface ExportClause {
  readonly specifiers: readonly ExportSpecifier[];
  /** Re-export target spec, or null for a clause of local declarations. */
  readonly from: string | null;
  readonly typeOnly: boolean;
}

interface ModuleExports {
  /** Clauses in source order. */
  readonly clauses: readonly ExportClause[];
  /** Inline `export <decl> name` → type (`interface`/`type`) or value. */
  readonly declared: ReadonlyMap<string, 'type' | 'value'>;
}

/** Strip line and block comments so clause regexes cannot match inside one. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

function parseSpecifier(raw: string, clauseTypeOnly: boolean): ExportSpecifier | null {
  const spec = raw.trim();
  if (spec === '') return null;
  const typePrefixed = /^type\s+/.test(spec);
  const rest = spec.replace(/^type\s+/, '').trim();
  const asMatch = rest.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
  const identMatch = rest.match(/^([A-Za-z_$][\w$]*)$/);
  const kind: 'type' | 'value' = typePrefixed || clauseTypeOnly ? 'type' : 'value';
  if (asMatch !== null) return { local: asMatch[1]!, exported: asMatch[2]!, kind };
  if (identMatch !== null) return { local: identMatch[1]!, exported: identMatch[1]!, kind };
  return null;
}

function declaredKind(keyword: string): 'type' | 'value' {
  const kind = keyword.replace(/\s/g, '');
  return kind === 'interface' || kind === 'type' ? 'type' : 'value';
}

function moduleExports(rel: string): ModuleExports {
  const text = stripComments(readSource(rel));
  const clauses: ExportClause[] = [];
  const declared = new Map<string, 'type' | 'value'>();
  const clauseRe = /export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
  for (const match of text.matchAll(clauseRe)) {
    const typeOnly = match[1] !== undefined;
    const specifiers: ExportSpecifier[] = [];
    for (const raw of match[2].split(',')) {
      const parsed = parseSpecifier(raw, typeOnly);
      if (parsed !== null) specifiers.push(parsed);
    }
    if (specifiers.length > 0) clauses.push({ specifiers, from: match[3] ?? null, typeOnly });
  }
  const nsRe = /export\s+(type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(nsRe)) {
    const typeOnly = match[1] !== undefined;
    clauses.push({
      specifiers: [{ exported: match[2]!, local: match[2]!, kind: typeOnly ? 'type' : 'value' }],
      from: match[3]!,
      typeOnly,
    });
  }
  const declRe =
    /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function\s*\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of text.matchAll(declRe)) declared.set(match[2]!, declaredKind(match[1]!));
  return { clauses, declared };
}

/** Declaring file and the local name `fileDocs` keys use (after `as` aliases). */
export interface Site {
  readonly file: string;
  readonly lookupName: string;
}

function resolveName(rel: string, name: string, seen: Set<string>): Site[] {
  if (seen.has(rel)) return [];
  seen.add(rel);
  const mod = moduleExports(rel);
  if (mod.declared.has(name)) return [{ file: rel, lookupName: name }];
  const sites: Site[] = [];
  for (const clause of mod.clauses) {
    const spec = clause.specifiers.find((item) => item.exported === name);
    if (spec === undefined) continue;
    if (clause.from === null) return [{ file: rel, lookupName: spec.local }];
    sites.push(...resolveName(targetFile(rel, clause.from), spec.local, seen));
  }
  return sites;
}

/** Every exported name of a module, following re-export clauses one hop. */
function topLevelNames(rel: string): { runtime: Set<string>; types: Set<string> } {
  const mod = moduleExports(rel);
  const runtime = new Set<string>();
  const types = new Set<string>();
  for (const clause of mod.clauses) {
    for (const spec of clause.specifiers) (spec.kind === 'type' ? types : runtime).add(spec.exported);
  }
  for (const [name, kind] of mod.declared) (kind === 'type' ? types : runtime).add(name);
  return { runtime, types };
}

function symbolName(key: string): string {
  return key.slice(key.indexOf(':') + 1);
}

function symbolKind(key: string): string {
  return key.slice(0, key.indexOf(':'));
}

/**
 * True only when every `fileDocs` declaration of `lookupName` has a summary.
 * A documented homonym of a different kind does not mask an undocumented one.
 */
function documented(site: Site): boolean {
  const docs = fileDocs(readSource(site.file), site.file);
  if (docs.unparsed) return false;
  const matches: SymbolDoc[] = [];
  for (const [key, symbol] of docs.symbols) {
    if (symbolName(key) === site.lookupName) matches.push(symbol);
  }
  if (matches.length === 0) return false;
  return matches.every((symbol) => symbol.documented);
}

function snapshotRuntimeNames(): Set<string> {
  const snap = readFileSync(resolve(ROOT, 'tests/api/__snapshots__/public-surface.test.ts.snap'), 'utf8');
  const match = snap.match(/runtime exports match[^`]*1`\] = `\n(\[[\s\S]*?\])\n`;\s*$/);
  if (match === null) throw new Error('runtime-export snapshot not found');
  return new Set(JSON.parse(match[1].replace(/,(\s*[\]}])/g, '$1')) as string[]);
}

function sorted(names: Iterable<string>): readonly string[] {
  return [...names].sort();
}

/** Census buckets the checker walks. Source of truth is this enumeration. */
export interface PublicCensusBuckets {
  /** Root runtime snapshot (`tests/api/__snapshots__/public-surface.test.ts.snap`). */
  readonly rootRuntime: readonly string[];
  /** Root type exports of `src/index.ts`, including mixed-clause `type` specifiers. */
  readonly rootTypes: readonly string[];
  /** Value exports of `src/atlas/public.ts`. */
  readonly atlasRuntime: readonly string[];
  /** Type exports of `src/atlas/public.ts`. */
  readonly atlasTypes: readonly string[];
  /** Public subpath exports (`MathTSEngine`). */
  readonly subpath: readonly string[];
}

/** The names each census bucket contributes. Size pins read this helper; deleting a loop from `collect()` fails the per-bucket CONTROL, not these pins. */
export function collectPublicNamesForTest(): PublicCensusBuckets {
  const atlas = topLevelNames('atlas/public.ts');
  return {
    rootRuntime: sorted(snapshotRuntimeNames()),
    rootTypes: sorted(topLevelNames('index.ts').types),
    atlasRuntime: sorted(atlas.runtime),
    atlasTypes: sorted(atlas.types),
    subpath: ['MathTSEngine'],
  };
}

function entryRootFor(via: string): string {
  if (via === 'atlas') return 'atlas/public.ts';
  if (via === 'root') return 'index.ts';
  return `${via}.ts`;
}

function collect(): { name: string; via: string }[] {
  const buckets = collectPublicNamesForTest();
  const entries: { name: string; via: string }[] = [];
  for (const name of buckets.rootRuntime) entries.push({ name, via: 'root' });
  for (const name of buckets.rootTypes) entries.push({ name, via: 'root' });
  for (const name of buckets.atlasRuntime) entries.push({ name, via: 'atlas' });
  for (const name of buckets.atlasTypes) entries.push({ name, via: 'atlas' });
  for (const name of buckets.subpath) entries.push({ name, via: 'numerical/mathts-engine' });
  return entries;
}

/** `export * from` / `export type * from` with `'` or `"` (no `as`). `export * as atlas from` is not one. */
function bareStarFrom(source: string): string[] {
  const out: string[] = [];
  const re = /export\s+(type\s+)?\*\s+from\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(re)) out.push(match[2]!);
  return out;
}

/** A public name that did not resolve to a declaring module. */
export interface UnresolvedPublicName {
  readonly via: string;
  readonly name: string;
}

/** Gaps, unresolved names, and a banned bare `export * from` on the package root. */
export interface PublicTsdocReport {
  readonly gaps: readonly { name: string; via: string; file: string }[];
  readonly unresolved: readonly UnresolvedPublicName[];
  readonly bareStarFrom: readonly string[];
}

function report(): PublicTsdocReport {
  const found: { name: string; via: string; file: string }[] = [];
  const unresolved: UnresolvedPublicName[] = [];
  const seenNames = new Set<string>();
  for (const entry of collect()) {
    const key = `${entry.via}:${entry.name}`;
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    if (entry.name === 'atlas') continue;
    const sites = resolveName(entryRootFor(entry.via), entry.name, new Set());
    if (sites.length === 0) {
      unresolved.push({ via: entry.via, name: entry.name });
      continue;
    }
    const undoc = sites.filter((site) => !documented(site));
    if (undoc.length > 0) {
      found.push({ name: entry.name, via: entry.via, file: undoc[0]!.file });
    }
  }
  return {
    gaps: found,
    unresolved,
    bareStarFrom: bareStarFrom(stripComments(readSource('index.ts'))),
  };
}

/** Every public symbol whose resolved declaration has no JSDoc summary line. */
export function publicTsdocGaps(): { name: string; via: string; file: string }[] {
  return [...report().gaps];
}

/** The full checker report (gaps, unresolved names, banned root `export * from`). */
export function publicTsdocReport(): PublicTsdocReport {
  return report();
}

/** Resolve one exported name through re-exports to its declaring `Site`s (tests). */
export function resolvePublicSitesForTest(rel: string, name: string): Site[] {
  return resolveName(rel, name, new Set());
}

function publicKind(keyKind: string): string {
  switch (keyKind) {
    case 'function':
      return 'function';
    case 'class_declaration':
    case 'abstract_class_declaration':
      return 'class';
    case 'interface_declaration':
      return 'interface';
    case 'type_alias_declaration':
      return 'type';
    case 'enum_declaration':
      return 'enum';
    case 'lexical_declaration':
    case 'variable_declaration':
      return 'const';
    default:
      return keyKind;
  }
}

/** Kind, TSDoc summary, and declaration header S13 needs for one public name. */
export interface PublicSymbolMeta {
  readonly kind: string;
  readonly summary: string;
  readonly header: string;
  readonly file: string;
  readonly lookupName: string;
}

/**
 * Resolve `name` from a census `via` to the declaring module and return the
 * declaration kind, JSDoc summary, and header snippet. Null when unresolved
 * or `fileDocs` cannot parse the file.
 */
export function publicSymbolMeta(name: string, via = 'root'): PublicSymbolMeta | null {
  const sites = resolveName(entryRootFor(via), name, new Set());
  if (sites.length === 0) return null;
  const site = sites[0]!;
  const docs = fileDocs(readSource(site.file), site.file);
  if (docs.unparsed) return null;
  const matches: { kind: string; symbol: SymbolDoc }[] = [];
  for (const [key, symbol] of docs.symbols) {
    if (symbolName(key) === site.lookupName) matches.push({ kind: publicKind(symbolKind(key)), symbol });
  }
  if (matches.length === 0) return null;
  const preferred = matches.find((item) => item.symbol.documented) ?? matches[0]!;
  return {
    kind: preferred.kind,
    summary: preferred.symbol.summary ?? '',
    header: preferred.symbol.header,
    file: site.file,
    lookupName: site.lookupName,
  };
}

function main(): void {
  const check = process.argv.includes('--check');
  const result = report();
  for (const gap of result.gaps) console.log(`${gap.file} ${gap.name}`);
  for (const item of result.unresolved) console.error(`UNRESOLVED ${item.via} ${item.name}`);
  for (const spec of result.bareStarFrom) console.error(`BARE_EXPORT_STAR index.ts ${spec}`);
  if (check && (result.gaps.length > 0 || result.unresolved.length > 0 || result.bareStarFrom.length > 0)) {
    process.exit(1);
  }
}

const entry = process.argv[1];
if (entry !== undefined && resolve(entry) === resolve(fileURLToPath(import.meta.url))) main();
