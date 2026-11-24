/**
 * Generate `docs/user/api.md`, the full user API reference of the public
 * surface.
 *
 * Covers the root runtime exports of live `src/index.ts` grouped by section
 * banner (in-clause comments stripped before specifier split), the 251 root
 * type exports, the members of the `atlas` namespace (`src/atlas/public.ts`),
 * and the `MathTSEngine` subpath export with its public method list (including
 * `async` methods, cross-checked against required `TensorEngine` members).
 * Kind, declaration header, and TSDoc summary come from `publicSymbolMeta`
 * (`scripts/public-tsdoc-gaps.ts`), so the page is grounded in real code and
 * real TSDoc only. The `./probe` and `./atlas` subpaths are `@internal`.
 *
 * `bun scripts/api-reference.ts` (re)writes `docs/user/api.md`.
 * `bun scripts/api-reference.ts --check` exits 1 when the committed file
 * differs from the generated output, like `scripts/cli-reference.ts --check`.
 * The `docs-fresh` job runs `--check`.
 *
 * @module scripts/api-reference
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectPublicNamesForTest,
  publicSymbolMeta,
  readSrcText,
  rootRuntimeNamesFromIndex,
  stripComments,
} from './public-tsdoc-gaps.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/user/api.md');

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/** `exported name → banner text` for every export clause of `src/index.ts`.
 *
 * A banner is a contiguous run of full-line `//` comments outside any export
 * clause; a clause adopts the most recent banner above it. Comment runs inside
 * a clause (`// v0.8.0 punch-list …` between specifiers) are not banners.
 */
function specifierNames(clauseBody: string): string[] {
  const names: string[] = [];
  for (const raw of clauseBody.split(',')) {
    const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
    // Identifier only: a trailing `// comment, …` on the specifier must not
    // survive as a map key (Law 2: without stripComments this filter drops it).
    if (name !== undefined && /^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
  }
  return names;
}

function indexBanners(): Map<string, string> {
  const text = readSrcText('index.ts');
  const lines = text.split('\n');
  // Match on comment-stripped text so a `}` inside an in-clause comment cannot
  // truncate the clause, and a commented-out `export { }` cannot suppress a
  // banner. `stripComments` keeps newlines, so line numbers match `lines`.
  const stripped = stripComments(text);
  const clauseRe = /export\s+(?:type\s+)?\{([^}]*)\}(?:\s*from\s*['"][^'"]+['"])?/g;
  const declRe =
    /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\s*\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  const spans: { startLine: number; endLine: number }[] = [];
  const clauseLines = new Map<number, string[]>();
  const lineOf = (index: number): number => stripped.slice(0, index).split('\n').length - 1;
  const addNames = (line: number, names: readonly string[]): void => {
    const existing = clauseLines.get(line) ?? [];
    existing.push(...names);
    clauseLines.set(line, existing);
  };
  for (const match of stripped.matchAll(clauseRe)) {
    const startLine = lineOf(match.index!);
    spans.push({ startLine, endLine: lineOf(match.index! + match[0].length) });
    addNames(startLine, specifierNames(match[1]!));
  }
  for (const match of stripped.matchAll(declRe)) {
    const startLine = lineOf(match.index!);
    spans.push({ startLine, endLine: lineOf(match.index! + match[0].length) });
    addNames(startLine, [match[1]!]);
  }
  // Contiguous `//` runs outside clauses, in order: [lastLineIndex, cleaned text].
  const bannerRuns: { endLine: number; text: string }[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\/\/ ?|^\/\/$/.test(lines[i]!)) {
      i++;
      continue;
    }
    const runStart = i;
    while (i < lines.length && /^\/\/ ?|^\/\/$/.test(lines[i]!)) i++;
    let end = i - 1;
    if (runStart > end) continue;
    const runLines: string[] = [];
    for (let j = runStart; j <= end; j++) {
      const cleaned = lines[j]!
        .replace(/^\/\/ ?/, '')
        .replace(/^[-=─\s]+/, '')
        .replace(/[-=─\s]+$/, '');
      if (cleaned !== '') runLines.push(cleaned);
    }
    if (runLines.length === 0) continue;
    const overlaps = spans.some((s) => runStart <= s.endLine && s.startLine <= end);
    if (!overlaps) bannerRuns.push({ endLine: end, text: runLines.join('\n') });
  }
  const map = new Map<string, string>();
  const sortedClauseLines = [...clauseLines.keys()].sort((a, b) => a - b);
  for (const clauseLine of sortedClauseLines) {
    const banner = [...bannerRuns].reverse().find((run) => run.endLine < clauseLine)?.text ?? '';
    for (const name of clauseLines.get(clauseLine)!) if (!map.has(name)) map.set(name, banner);
  }
  return map;
}

interface Row {
  readonly name: string;
  readonly kind: string;
  readonly header: string;
  readonly summary: string;
  readonly file: string;
}

function rows(names: readonly string[], via: string): Row[] {
  const out: Row[] = [];
  for (const name of names) {
    // `atlas` is the `export * as atlas` namespace binding: it has no declaring
    // module of its own and is documented by its own section below.
    if (name === 'atlas' && via === 'root') continue;
    const meta = publicSymbolMeta(name, via);
    if (meta === null) throw new Error(`api-reference: ${via}:${name} did not resolve to a declaring module`);
    out.push({ name, kind: meta.kind, header: meta.header, summary: meta.summary, file: meta.file });
  }
  return out;
}

function table(rowList: readonly Row[]): string {
  const head = ['| Name | Kind | Declaration | Summary |', '|---|---|---|---|'];
  const body = rowList.map(
    (row) => `| \`${cell(row.name)}\` | \`${cell(row.kind)}\` | \`${cell(row.header)}\` | ${cell(row.summary)} |`,
  );
  return [...head, ...body].join('\n');
}

/** Heading for a banner: its first line; the remaining lines render as body text. */
function bannerHeading(banner: string): string {
  if (banner === '') return 'Other exports';
  const firstLine = banner.split('\n')[0] ?? banner;
  return cell(firstLine);
}

function bannerBody(banner: string): string {
  // Continuation lines of a wrapped `//` banner can start with `+ ` / `- ` /
  // `* ` (the v0.7 `Axes + LabeledTensor` wrap). Those are markdown list
  // markers if they begin a paragraph, so strip them before joining.
  const rest = banner
    .split('\n')
    .slice(1)
    .map((line) => line.replace(/^[+\-*]\s+/, ''))
    .join(' ')
    .trim();
  return cell(rest);
}

function runtimeSection(names: readonly string[], banners: ReadonlyMap<string, string>): string {
  const groups = new Map<string, string[]>();
  const ordered: string[] = [];
  for (const name of names) {
    // Filter `atlas` before grouping: it has no declaring module and would
    // otherwise occupy the bannerless group, which becomes an empty
    // `### Other exports` table once every other bannerless name gains a banner.
    if (name === 'atlas') continue;
    const banner = banners.get(name) ?? '';
    if (!groups.has(banner)) {
      groups.set(banner, []);
      ordered.push(banner);
    }
    groups.get(banner)!.push(name);
  }
  const parts: string[] = [];
  for (const banner of ordered) {
    const group = groups.get(banner)!;
    const rowList = rows(group, 'root');
    if (rowList.length === 0) continue;
    parts.push(`### ${bannerHeading(banner)}`);
    parts.push('');
    if (banner !== '') {
      const rest = bannerBody(banner);
      if (rest !== '') {
        parts.push(rest);
        parts.push('');
      }
    }
    parts.push(table(rowList));
    parts.push('');
  }
  return parts.join('\n');
}

/** Required (non-optional) method names on `TensorEngine`. */
function requiredTensorEngineMethods(source: string): readonly string[] {
  const start = source.indexOf('export interface TensorEngine');
  if (start < 0) throw new Error('TensorEngine interface not found');
  const body = source.slice(source.indexOf('{', start) + 1, source.indexOf('\n}', start));
  const names: string[] = [];
  for (const line of body.split('\n')) {
    const m = /^  (?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*[<(]/.exec(line);
    if (m === null || m[2] === '?') continue;
    names.push(m[1]!);
  }
  return names;
}

/** Public method signatures of `MathTSEngine`, from its source declaration. */
function engineMethods(): readonly string[] {
  const text = readSrcText('numerical/mathts-engine.ts');
  const start = text.indexOf('export class MathTSEngine');
  if (start < 0) throw new Error('MathTSEngine class declaration not found');
  const body = text.slice(text.indexOf('{', start) + 1, text.indexOf('\n}', start));
  const out: string[] = [];
  const names = new Set<string>();
  const lines = body.split('\n');
  // Optional leading modifiers (async, public, static, …). `private` /
  // `protected` members stay off the public list. `[<(]` catches generics.
  const methodRe =
    /^  (?!(?:private|protected)\b)(?:(?:public|async|static|override|abstract|readonly)\s+)*([A-Za-z_$][\w$]*)\s*[<(]/;
  for (let i = 0; i < lines.length; i++) {
    const m = methodRe.exec(lines[i]!);
    if (m === null) continue;
    const name = m[1]!;
    if (name === 'constructor') continue;
    let header = lines[i]!.trim();
    // Stop at the signature's opening `{` or trailing `;`, including a
    // single-line `{ return; }` body. Matching only `/[{;]\s*$/` would keep
    // consuming the next method's header.
    while (!/[{;]/.test(header) && i + 1 < lines.length) {
      i += 1;
      header = `${header} ${lines[i]!.trim()}`;
    }
    const brace = header.indexOf('{');
    if (brace >= 0) header = header.slice(0, brace);
    out.push(
      header
        .replace(/;$/, '')
        .replace(/\s+/g, ' ')
        .replace(/\( /g, '(')
        .replace(/, \)/g, ')')
        .trim(),
    );
    names.add(name);
  }
  for (const req of requiredTensorEngineMethods(readSrcText('numerical/tensor-engine.ts'))) {
    if (!names.has(req)) {
      throw new Error(`api-reference: MathTSEngine is missing required TensorEngine method ${req}`);
    }
  }
  return out;
}

/** The generated reference page. Deterministic; grounded in source and TSDoc. */
export function renderApiReference(): string {
  const buckets = collectPublicNamesForTest();
  const liveRuntime = rootRuntimeNamesFromIndex();
  const banners = indexBanners();
  const lines: string[] = [];
  lines.push('# API reference');
  lines.push('');
  lines.push('Generated from the public surface by `scripts/api-reference.ts`. Do not edit this file.');
  lines.push('`bun scripts/api-reference.ts` rewrites it. `bun scripts/api-reference.ts --check` fails when it is stale.');
  lines.push('');
  lines.push(
    'This page is the machine-generated index of every public export of the package root (runtime and types),' +
      ' the `atlas` namespace, and the `universal-physics-tensor/numerical/mathts-engine` subpath.' +
      ' The `./probe` and `./atlas` package subpaths exist but are `@internal` and out of scope here.' +
      ' For a narrative walk through the' +
      ' architecture see [the engineering API reference](../architecture/API.md); to install and make your' +
      ' first calls see [the getting-started guide](getting-started.md); the catalog layers are described in' +
      ' [the equation and constant catalog guide](catalog.md).',
  );
  lines.push('');

  lines.push('## Root runtime exports (`universal-physics-tensor`)');
  lines.push('');
  lines.push(`${liveRuntime.length} runtime exports of the package root, grouped by their \`src/index.ts\` section banner. The \`atlas\` namespace binding is its own section below.`);
  lines.push('');
  lines.push(runtimeSection(liveRuntime, banners));

  lines.push('## Root type exports (`universal-physics-tensor`)');
  lines.push('');
  lines.push(`${buckets.rootTypes.length} type exports of the package root.`);
  lines.push('');
  lines.push(table(rows(buckets.rootTypes, 'root')));
  lines.push('');

  lines.push('## The `atlas` namespace (`import { atlas } from \'universal-physics-tensor\'`)');
  lines.push('');
  lines.push(
    `${[...buckets.atlasRuntime, ...buckets.atlasTypes].length} members of \`src/atlas/public.ts\`, the single list of the atlas public surface.`,
  );
  lines.push('');
  lines.push('### Runtime members');
  lines.push('');
  lines.push(table(rows(buckets.atlasRuntime, 'atlas')));
  lines.push('');
  lines.push('### Type members');
  lines.push('');
  lines.push(table(rows(buckets.atlasTypes, 'atlas')));
  lines.push('');

  lines.push('## Subpath export (`universal-physics-tensor/numerical/mathts-engine`)');
  lines.push('');
  const engine = rows(buckets.subpath, 'numerical/mathts-engine')[0]!;
  lines.push(`\`${engine.header}\` — ${engine.summary}`);
  lines.push('');
  lines.push('Public methods:');
  lines.push('');
  lines.push(...engineMethods().map((m) => `- \`${cell(m)}\``));
  lines.push('');
  return lines.join('\n');
}

/**
 * CLI entry `main()` uses: rewrite `docs/user/api.md`, or `--check` (exit 1
 * when the committed page differs). Tests call this instead of copying the
 * comparison.
 */
export function runApiReferenceCli(argv: readonly string[] = process.argv): number {
  const check = argv.includes('--check');
  const next = renderApiReference();
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw err;
  }
  if (current === next) {
    console.log('api-reference: docs/user/api.md matches the public surface.');
    return 0;
  }
  if (check) {
    console.error('api-reference: docs/user/api.md is stale. Run `bun scripts/api-reference.ts` and commit the result.');
    return 1;
  }
  writeFileSync(OUT, next);
  console.log('api-reference: rewrote docs/user/api.md.');
  return 0;
}

function main(): void {
  const code = runApiReferenceCli();
  if (code !== 0) process.exit(code);
}

if (import.meta.main) main();
