/**
 * Generate `docs/user/api.md`, the full user API reference of the public
 * surface.
 *
 * Covers the 233 root runtime exports grouped by their `src/index.ts` section
 * banner, the 248 root type exports, the members of the `atlas` namespace
 * (`src/atlas/public.ts`), and the `MathTSEngine` subpath export with its
 * public method list. Kind, declaration header, and TSDoc summary come from
 * `publicSymbolMeta` (`scripts/public-tsdoc-gaps.ts`), so the page is grounded
 * in real code and real TSDoc only.
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

import { collectPublicNamesForTest, publicSymbolMeta, setSourceReaderForTest } from './public-tsdoc-gaps.js';

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
function indexBanners(): Map<string, string> {
  const text = readFileSync(join(root, 'src/index.ts'), 'utf8');
  const lines = text.split('\n');
  const clauseRe = /export\s+(?:type\s+)?\{([^}]*)\}(?:\s*from\s*['"][^'"]+['"])?/g;
  const spans: { start: number; end: number }[] = [];
  const clauseLines = new Map<number, string[]>();
  for (const match of text.matchAll(clauseRe)) {
    const clauseLine = text.slice(0, match.index).split('\n').length - 1;
    spans.push({ start: match.index, end: match.index + match[0].length });
    const names: string[] = [];
    for (const raw of match[1]!.split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
      if (name !== undefined && name !== '') names.push(name);
    }
    clauseLines.set(clauseLine, names);
  }
  const insideClause = (lineIndex: number): boolean => {
    const start = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
    const end = start + lines[lineIndex]!.length;
    return spans.some((s) => start < s.end && s.start < end);
  };
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
      const cleaned = lines[j]!.replace(/^\/\/ ?/, '').replace(/[-=─\s]+$/, '');
      runLines.push(cleaned);
    }
    if (runLines.length === 0) continue;
    const runStartOffset = lines.slice(0, runStart).join('\n').length + (runStart > 0 ? 1 : 0);
    const runEndOffset = lines.slice(0, end + 1).join('\n').length;
    const overlaps = spans.some((s) => runStartOffset < s.end && s.start < runEndOffset);
    if (!overlaps) bannerRuns.push({ endLine: end, text: runLines.join(' ') });
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
  const firstSentenceEnd = banner.indexOf('. ');
  return cell(firstSentenceEnd < 0 ? banner : banner.slice(0, firstSentenceEnd + 1));
}

function runtimeSection(names: readonly string[], banners: ReadonlyMap<string, string>): string {
  const groups = new Map<string, string[]>();
  const ordered: string[] = [];
  for (const name of names) {
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
    parts.push(`### ${bannerHeading(banner)}`);
    parts.push('');
    if (banner !== '') {
      const first = bannerHeading(banner);
      const rest = banner.slice(first.length).trim();
      if (rest !== '') {
        parts.push(cell(rest));
        parts.push('');
      }
    }
    parts.push(table(rows(group, 'root')));
    parts.push('');
  }
  return parts.join('\n');
}

/** Public method signatures of `MathTSEngine`, from its source declaration. */
function engineMethods(): readonly string[] {
  const text = readFileSync(join(root, 'src/numerical/mathts-engine.ts'), 'utf8');
  const start = text.indexOf('export class MathTSEngine');
  if (start < 0) throw new Error('MathTSEngine class declaration not found');
  const body = text.slice(text.indexOf('{', start) + 1, text.indexOf('\n}', start));
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const m = /^  (?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (m === null) continue;
    const header = line.trim();
    out.push(header.endsWith('{') ? header.slice(0, -1).trim() : header);
  }
  return out;
}

/** The generated reference page. Deterministic; grounded in source and TSDoc. */
export function renderApiReference(): string {
  const buckets = collectPublicNamesForTest();
  const banners = indexBanners();
  const lines: string[] = [];
  lines.push('# API reference');
  lines.push('');
  lines.push('Generated from the public surface by `scripts/api-reference.ts`. Do not edit this file.');
  lines.push('`bun scripts/api-reference.ts` rewrites it. `bun scripts/api-reference.ts --check` fails when it is stale.');
  lines.push('');
  lines.push(
    'This page is the machine-generated index of every public export. For a narrative walk through the' +
      ' architecture see [the engineering API reference](../architecture/API.md); to install and make your' +
      ' first calls see [the getting-started guide](getting-started.md); the catalog layers are described in' +
      ' [the equation and constant catalog guide](catalog.md).',
  );
  lines.push('');

  lines.push('## Root runtime exports (`universal-physics-tensor`)');
  lines.push('');
  lines.push(`${buckets.rootRuntime.length} runtime exports of the package root, grouped by their \`src/index.ts\` section banner. The \`atlas\` namespace binding is its own section below.`);
  lines.push('');
  lines.push(runtimeSection(buckets.rootRuntime, banners));

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

function main(): void {
  const check = process.argv.includes('--check');
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
    return;
  }
  if (check) {
    console.error('api-reference: docs/user/api.md is stale. Run `bun scripts/api-reference.ts` and commit the result.');
    process.exit(1);
  }
  writeFileSync(OUT, next);
  console.log('api-reference: rewrote docs/user/api.md.');
}

if (import.meta.main) main();
