/**
 * The citation quote check: a MECHANICAL check of the `// source:` comments in
 * `docs/research/phase-1-source-comments.txt` against the downloaded source texts. It re-judges no wording.
 *
 * Every quoted span and every page, equation or section locator in those comments is a claim in
 * `docs/research/phase-1-citation-claims.json`. For each claim the check runs exact string tests:
 *
 * - `span`: the text occurs in the source, optionally on a stated printed page (whose number must
 *   also be legible on that page) or inside a stated section;
 * - `label`: an equation label `(N)` is the LAST token of a line, is not preceded by "Eq.", and has
 *   an anchor within a few lines; a label that no extraction can read falls back to a `reference`
 *   span and is graded REFERENCED, never MATCH;
 * - `order`: a span occurs after a label on the same page;
 * - `toc-range`: a page lies between two table-of-contents entries;
 * - `declared`: a claim that cannot be matched (snippet-only access, an unread source, a publisher
 *   bot wall) is graded by name and never counted as a match.
 *
 * Normalisation, for spans only: Unicode NFKC and typographic quotes to ASCII (character encoding),
 * soft hyphens removed, a line-end hyphen either joined or kept, and all whitespace removed. Nothing
 * else. A span passes when any extraction of the source (pdftotext default, pdftotext -raw,
 * tesseract OCR of listed pages) satisfies every condition of its check.
 *
 * Every span check has a paired NEGATIVE CONTROL: the same span with its longest word reversed must
 * NOT match. Every source file is pinned by SHA-256, so a changed download fails the check.
 *
 * OCR page images are written under `<sources>/ocr-work-*`; the check writes nothing else except the
 * report, and only with `--write`.
 *
 * Run (needs pdftotext, pdftoppm and tesseract, and the source files; the manifest lists each URL):
 *   bun tools/citation-quote-check/check.ts --sources <dir> [--pdftotext <exe>] [--pdftoppm <exe>]
 *     [--tesseract <exe>] [--write]
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One downloaded source, pinned by the SHA-256 of its file. */
export interface SourceSpec {
  readonly key: string;
  readonly title: string;
  readonly url: string;
  readonly file: string;
  readonly sha256: string;
  readonly format: 'pdf' | 'html' | 'json' | 'text';
  /** The printed page number of PDF page 1, when page locators refer to this source. */
  readonly firstPage?: number;
  /** PDF page indices (1-based) to OCR with tesseract, for labels or headers the text layer lost. */
  readonly ocrPages?: readonly number[];
  readonly note?: string;
}

/** A section as an ordered chain of headings (outermost first) and the heading that ends it. */
export interface SectionSpec {
  readonly chain: readonly string[];
  readonly end: string;
}

/** One mechanical test. */
export type Check =
  | { readonly kind: 'span'; readonly source: string; readonly text: string; readonly page?: number; readonly section?: SectionSpec }
  | {
      readonly kind: 'label';
      readonly source: string;
      readonly label: string;
      readonly near: string;
      readonly page?: number;
      readonly lines?: number;
      readonly reference?: string;
    }
  | { readonly kind: 'order'; readonly source: string; readonly label: string; readonly text: string; readonly page?: number }
  | { readonly kind: 'toc-range'; readonly source: string; readonly entry: string; readonly next: string; readonly page: number }
  | { readonly kind: 'declared'; readonly status: 'SNIPPET-ONLY' | 'UNREAD' | 'BOT-WALL'; readonly reason: string };

/** One quoted span or locator of one comment, and the tests that confirm it. */
export interface Claim {
  /** `BE-<id>/<n>`: the n-th `// source:` comment inside the entry with that id. */
  readonly comment: string;
  /** The quoted span or locator exactly as the comment's token extractor returns it. */
  readonly token: string;
  readonly checks: readonly Check[];
}

export interface Manifest {
  readonly sources: readonly SourceSpec[];
  readonly claims: readonly Claim[];
}

/** The tokens of one `// source:` comment. */
export interface CommentTokens {
  readonly comment: string;
  readonly quotes: readonly string[];
  readonly locators: readonly string[];
}

export type Grade = 'MATCH' | 'REFERENCED' | 'SNIPPET-ONLY' | 'UNREAD' | 'BOT-WALL' | 'FAIL';

export interface CheckResult {
  readonly grade: Grade;
  readonly detail: string;
}

/** The texts of one source: extraction name → pages (index 0 is PDF page 1). */
export type Extractions = ReadonlyMap<string, readonly string[]>;

const QUOTE_MAP: readonly (readonly [RegExp, string])[] = [
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
  [/­/g, ''],
];

/** Encoding-level normalisation: NFKC and typographic quotes to ASCII. */
export function canonical(text: string): string {
  let s = text.normalize('NFKC');
  for (const [re, to] of QUOTE_MAP) s = s.replace(re, to);
  return s;
}

/** The needle form of a span: canonical, all whitespace removed. */
export function needleForm(text: string): string {
  return canonical(text).replace(/\s+/g, '');
}

/** The two haystack forms: a line-end hyphen joined (a split word) and kept (a compound). */
export function haystackForms(text: string): readonly string[] {
  const c = canonical(text);
  return [c.replace(/-[ \t]*\r?\n\s*/g, ''), c.replace(/-[ \t]*\r?\n\s*/g, '-')].map((s) => s.replace(/\s+/g, ''));
}

/** Index of the span in the haystack form where it is found, or -1 for each form. */
export function findSpan(haystack: string, span: string): { form: number; index: number } | null {
  const n = needleForm(span);
  if (n.length === 0) return null;
  const forms = haystackForms(haystack);
  for (let f = 0; f < forms.length; f++) {
    const i = forms[f]!.indexOf(n);
    if (i >= 0) return { form: f, index: i };
  }
  return null;
}

/**
 * The negative control of a span: its longest word (four letters or more) reversed. Returns null
 * when the span has no such word, so the caller reports the control as missing.
 */
export function mutateSpan(span: string): string | null {
  const words = [...span.matchAll(/[A-Za-z]{4,}/g)].map((m) => ({ w: m[0], i: m.index! }));
  if (words.length === 0) return null;
  const longest = words.reduce((a, b) => (b.w.length > a.w.length ? b : a));
  const reversed = [...longest.w].reverse().join('');
  if (reversed.toLowerCase() === longest.w.toLowerCase()) return null;
  return span.slice(0, longest.i) + reversed + span.slice(longest.i + longest.w.length);
}

/** The token of a claim that declares the access to a whole source rather than one span. */
export const SOURCE_TOKEN = '(source)';

const LOCATOR =
  /(?<![A-Za-z])(?:pp?\.\s*\d+(?:\s*(?:[-–]|,|and)\s*\d+)*|[Ee]qs?\.\s*(?:\(\d+(?:\.\d+)?\)|\d+(?:\.\d+)?)(?:\s*(?:[-–]|,)\s*(?:\(\d+(?:\.\d+)?\)|\d+(?:\.\d+)?))*|Sec\.\s*[0-9IVX]+(?:\.[0-9IVX]+)*|section\s+\d+(?:\.\d+)*)|§\s*\d+(?:\.\d+)*/g;

/**
 * The quoted spans and locators of every `// source:` comment in the source-comment file, keyed
 * `BE-<id>/<n>`. A comment runs from its `// source:` line to the next line that is not a comment.
 * A double quote right after a digit is read as arc seconds (1.7"), not as a quotation mark.
 */
export function extractCommentTokens(indexSource: string): CommentTokens[] {
  const lines = indexSource.split(/\r?\n/);
  const out: CommentTokens[] = [];
  const perEntry = new Map<number, number>();
  let entryId: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const idMatch = /^\s*id:\s*(\d+),/.exec(lines[i]!);
    if (idMatch) entryId = Number(idMatch[1]);
    if (!/^\s*\/\/\s*source:/.test(lines[i]!)) continue;
    if (entryId === null) throw new Error(`source comment at line ${i + 1} precedes any entry id`);
    const block: string[] = [];
    for (let j = i; j < lines.length && /^\s*\/\//.test(lines[j]!); j++) block.push(lines[j]!.replace(/^\s*\/\/\s?/, '').trim());
    const text = block.join(' ').replace(/(\d)"/g, '$1″');
    const n = (perEntry.get(entryId) ?? 0) + 1;
    perEntry.set(entryId, n);
    out.push({
      comment: `BE-${entryId}/${n}`,
      quotes: [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]!.trim()),
      locators: [...text.matchAll(LOCATOR)].map((m) => m[0].replace(/\s+/g, ' ').trim()),
    });
  }
  return out;
}

/**
 * Completeness: every token of every comment has a claim, and every claim names a token that a
 * comment still has. Returns the problems; an empty list means complete.
 */
export function completenessProblems(tokens: readonly CommentTokens[], claims: readonly Claim[]): string[] {
  const want = new Set(tokens.flatMap((t) => [...t.quotes, ...t.locators].map((k) => `${t.comment} ${k}`)));
  // A `(source)` claim declares the access to a whole source (for example "not read"); it has no
  // token in the comment and may carry only `declared` checks.
  const tokenClaims = claims.filter((c) => c.token !== SOURCE_TOKEN);
  const have = new Set(tokenClaims.map((c) => `${c.comment} ${c.token}`));
  const problems: string[] = [];
  for (const k of want) if (!have.has(k)) problems.push(`no claim for token: ${k}`);
  for (const k of have) if (!want.has(k)) problems.push(`claim names a token no comment has: ${k}`);
  for (const c of claims) if (c.checks.length === 0) problems.push(`claim has no check: ${c.comment} ${c.token}`);
  for (const c of claims) {
    if (c.token === SOURCE_TOKEN && c.checks.some((k) => k.kind !== 'declared')) problems.push(`${c.comment} (source) may carry only declared checks`);
  }
  return problems;
}

function pageIndex(src: SourceSpec, page: number): number {
  if (src.firstPage === undefined) throw new Error(`${src.key}: page ${page} given but no firstPage`);
  return page - src.firstPage;
}

/** True when the printed page number is legible near the top or bottom of the page text. */
export function headerShowsPage(pageText: string, page: number): boolean {
  const flat = pageText.replace(/\s+/g, ' ');
  const re = new RegExp(`(?<!\\d)${page}(?!\\d)`);
  return re.test(flat.slice(0, 400)) || re.test(flat.slice(-400));
}

/**
 * A word that makes a following `(N)` a REFERENCE to an equation, not its label: English "Eq.",
 * "Eqs.", "equation(s)" and German "Gl.", "Gln.", "Gleichung(en)" (two sources are German).
 */
const REFERENCE_WORD = /(^|\s)(eqs?|Eqs?|equations?|Equations?|Gln?|Gleichung(en)?)\.?$/;

/** The line index of a line-final label not preceded by a reference word, within `lines` of the anchor. */
export function findLabelLine(pageText: string, label: string, near: string, lines = 12): number {
  const ls = canonical(pageText).split(/\r?\n/).map((l) => l.trim());
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const final = new RegExp(`(^|[^A-Za-z])${esc}$`);
  for (let i = 0; i < ls.length; i++) {
    const m = final.exec(ls[i]!);
    if (!m) continue;
    const before = ls[i]!.slice(0, ls[i]!.length - label.length).trimEnd();
    if (REFERENCE_WORD.test(before)) continue;
    const win = ls.slice(Math.max(0, i - lines), i + lines + 1).join('\n');
    if (findSpan(win, near)) return i;
  }
  return -1;
}

function pagesFor(src: SourceSpec, pages: readonly string[], page?: number): { text: string; ok: boolean; why: string }[] {
  if (page === undefined) return [{ text: pages.join('\n'), ok: true, why: '' }];
  const i = pageIndex(src, page);
  if (i < 0 || i >= pages.length) return [{ text: '', ok: false, why: `printed page ${page} is outside the file` }];
  return [{ text: pages[i]!, ok: true, why: '' }];
}

/** True when no extraction is missing the page and at least one shows its printed number. */
function headerLegible(src: SourceSpec, ex: Extractions, page: number): boolean {
  return [...ex.values()].some((pages) => headerShowsPage(pages[pageIndex(src, page)] ?? '', page));
}

/**
 * True when the span lies inside the section: after the last occurrence (before the span) of each
 * heading in the chain, outermost first, and before the first occurrence of the end heading after
 * the innermost one. A table-of-contents entry therefore cannot stand in for the body heading: the
 * end heading follows it before the span does.
 */
export function sectionContains(text: string, section: SectionSpec, span: string): boolean {
  const n = needleForm(span);
  for (const form of haystackForms(text)) {
    let p = form.indexOf(n);
    while (p >= 0) {
      let limit = p;
      let ok = true;
      for (let k = section.chain.length - 1; k >= 0; k--) {
        const s = form.lastIndexOf(needleForm(section.chain[k]!), limit);
        if (s < 0) {
          ok = false;
          break;
        }
        limit = s;
      }
      if (ok) {
        const innermost = form.lastIndexOf(needleForm(section.chain[section.chain.length - 1]!), p);
        const e = form.indexOf(needleForm(section.end), innermost + 1);
        if (e > p) return true;
      }
      p = form.indexOf(n, p + 1);
    }
  }
  return false;
}

/** Run one check against the extractions of its source. */
export function runCheck(check: Check, src: SourceSpec | undefined, ex: Extractions | undefined): CheckResult {
  if (check.kind === 'declared') return { grade: check.status, detail: check.reason };
  if (!src || !ex) return { grade: 'FAIL', detail: `unknown source ${check.source}` };
  const tried: string[] = [];
  for (const [name, pages] of ex) {
    if (check.kind === 'span') {
      for (const p of pagesFor(src, pages, check.page)) {
        if (!p.ok) {
          tried.push(`${name}: ${p.why}`);
          continue;
        }
        const hit = check.section ? sectionContains(p.text, check.section, check.text) : findSpan(p.text, check.text) !== null;
        if (!hit) {
          tried.push(`${name}: not found${check.page !== undefined ? ` on p. ${check.page}` : ''}`);
          continue;
        }
        if (check.page !== undefined && !headerLegible(src, ex, check.page)) {
          return { grade: 'FAIL', detail: `${name}: found, but no extraction shows the printed page number ${check.page}` };
        }
        return { grade: 'MATCH', detail: `${name}${check.page !== undefined ? `, p. ${check.page} (header legible)` : ''}${check.section ? ', inside the section' : ''}` };
      }
    } else if (check.kind === 'label' || check.kind === 'order') {
      const near = check.kind === 'label' ? check.near : check.text;
      for (const p of pagesFor(src, pages, check.page)) {
        if (!p.ok) continue;
        const line = findLabelLine(p.text, check.label, near, check.kind === 'label' ? (check.lines ?? 12) : 40);
        if (line < 0) {
          tried.push(`${name}: no line-final ${check.label}`);
          continue;
        }
        if (check.kind === 'order') {
          const after = canonical(p.text).split(/\r?\n/).slice(line + 1).join('\n');
          if (!findSpan(after, check.text)) {
            tried.push(`${name}: span not after ${check.label}`);
            continue;
          }
        }
        if (check.page !== undefined && !headerLegible(src, ex, check.page)) {
          return { grade: 'FAIL', detail: `${name}: found, but no extraction shows the printed page number ${check.page}` };
        }
        const where = check.page !== undefined ? `, p. ${check.page} (header legible)` : '';
        return { grade: 'MATCH', detail: `${name}, line-final ${check.label}${check.kind === 'order' ? ', span follows it' : ''}${where}` };
      }
    } else if (check.kind === 'toc-range') {
      const all = pages.join('\n');
      const num = (entry: string): number | null => {
        const want = needleForm(entry);
        for (const l of canonical(all).split(/\r?\n/)) {
          if (!needleForm(l).startsWith(want)) continue;
          const m = /(\d+)\s*$/.exec(l.trim());
          if (m) return Number(m[1]);
        }
        return null;
      };
      const a = num(check.entry);
      const b = num(check.next);
      if (a !== null && b !== null) {
        if (a <= check.page && check.page < b) return { grade: 'MATCH', detail: `${name}: ${check.entry} ${a}, ${check.next} ${b}` };
        return { grade: 'FAIL', detail: `${name}: p. ${check.page} is not in [${a}, ${b})` };
      }
      tried.push(`${name}: entry pages not legible`);
    }
  }
  if (check.kind === 'label' && check.reference) {
    // The fallback is held to the same place as the label: the claimed page, with its number legible.
    const refHit = [...ex.values()].some((pages) =>
      pagesFor(src, pages, check.page).some((p) => p.ok && findSpan(p.text, check.reference!) !== null),
    );
    const placed = check.page === undefined || headerLegible(src, ex, check.page);
    if (refHit && placed) {
      const where = check.page !== undefined ? ` on p. ${check.page} (header legible)` : '';
      return { grade: 'REFERENCED', detail: `no extraction reads the printed label ${check.label}; the source text says "${check.reference}"${where}` };
    }
  }
  return { grade: 'FAIL', detail: tried.join('; ') || 'no extraction' };
}

/**
 * The negative control of a check. A span's mutation must match nowhere in the source. A label must
 * not be found near its anchor's mutation, which shows that the anchor, not the label alone, placed
 * it. An order check's mutated span must not follow the label. Returns null when the control holds
 * or the check kind has no control (`toc-range`, `declared`).
 */
export function controlProblem(check: Check, ex: Extractions | undefined): string | null {
  if (!ex || (check.kind !== 'span' && check.kind !== 'label' && check.kind !== 'order')) return null;
  const original = check.kind === 'label' ? check.near : check.text;
  const m = mutateSpan(original);
  if (m === null) return `no control possible for "${original}"`;
  for (const [name, pages] of ex) {
    const all = pages.join('\n');
    let hit: boolean;
    if (check.kind === 'span') hit = findSpan(all, m) !== null;
    else if (check.kind === 'label') hit = findLabelLine(all, check.label, m, check.lines ?? 12) >= 0;
    else {
      const line = findLabelLine(all, check.label, m, 40);
      hit = line >= 0 && findSpan(canonical(all).split(/\r?\n/).slice(line + 1).join('\n'), m) !== null;
    }
    if (hit) return `control "${m}" matched in ${name}`;
  }
  return null;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = { quot: '"', amp: '&', lt: '<', gt: '>', nbsp: ' ', apos: "'" };

/**
 * Decode HTML character references in ONE pass, so each is decoded exactly once: `&amp;lt;` becomes
 * the text `&lt;`, not `<`. An unknown named entity is left as it is.
 */
export function decodeEntities(html: string): string {
  return html.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, e: string) => {
    if (e.startsWith('#x') || e.startsWith('#X')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
    return NAMED_ENTITIES[e] ?? whole;
  });
}

/** SHA-256 of a text file with line endings normalised, so a CRLF checkout hashes as LF. */
export function lfHash(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

// ---------------------------------------------------------------- I/O (the command line)

function run(exe: string, args: readonly string[]): string {
  const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(`${exe}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${exe} ${args.join(' ')} exited ${r.status}: ${r.stderr}`);
  return r.stdout;
}

function version(exe: string, flag: string): string {
  const r = spawnSync(exe, [flag], { encoding: 'utf8' });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`.split(/\r?\n/).find((l) => /\d/.test(l))?.trim() ?? 'unknown';
}

interface Tools {
  readonly pdftotext: string;
  readonly pdftoppm: string;
  readonly tesseract: string;
}

function extract(src: SourceSpec, path: string, tools: Tools, workRoot: string): Map<string, string[]> {
  const ex = new Map<string, string[]>();
  if (src.format === 'pdf') {
    const pagesOf = (s: string) => s.replace(/\f$/, '').split('\f');
    ex.set('text', pagesOf(run(tools.pdftotext, ['-enc', 'UTF-8', path, '-'])));
    ex.set('raw', pagesOf(run(tools.pdftotext, ['-raw', '-enc', 'UTF-8', path, '-'])));
    if (src.ocrPages && src.ocrPages.length > 0) {
      // Two page-segmentation modes: 3 (automatic, column-aware) and 4 (one column of text). Each
      // reads some labels the other loses; both are extractions of the same page image.
      const n = ex.get('text')!.length;
      const byPsm = new Map<string, string[]>([
        ['3', new Array<string>(n).fill('')],
        ['4', new Array<string>(n).fill('')],
      ]);
      const dir = mkdtempSync(join(workRoot, 'ocr-work-'));
      for (const p of src.ocrPages) {
        const prefix = join(dir, `p${p}`);
        run(tools.pdftoppm, ['-r', '300', '-gray', '-f', String(p), '-l', String(p), '-png', path, prefix]);
        const png = readdirSync(dir).find((f) => f.startsWith(`p${p}-`) && f.endsWith('.png'));
        if (!png) throw new Error(`${src.key}: pdftoppm wrote no image for page ${p}`);
        for (const [psm, pages] of byPsm) pages[p - 1] = run(tools.tesseract, [join(dir, png), '-', '--psm', psm]);
      }
      for (const [psm, pages] of byPsm) ex.set(`ocr-psm${psm}`, pages);
    }
  } else if (src.format === 'html') {
    const raw = readFileSync(path, 'utf8');
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    ex.set('html', [decodeEntities(text)]);
  } else if (src.format === 'json') {
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(JSON.parse(readFileSync(path, 'utf8')));
    ex.set('json', [strings.join('\n')]);
  } else {
    ex.set('text', [readFileSync(path, 'utf8')]);
  }
  return ex;
}

function main(argv: readonly string[]): number {
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const sourcesDir = arg('--sources');
  if (!sourcesDir) {
    console.error('usage: bun tools/citation-quote-check/check.ts --sources <dir> [--write]');
    return 2;
  }
  const tools: Tools = {
    pdftotext: arg('--pdftotext') ?? 'pdftotext',
    pdftoppm: arg('--pdftoppm') ?? 'pdftoppm',
    tesseract: arg('--tesseract') ?? 'tesseract',
  };
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const manifestPath = join(root, 'docs/research/phase-1-citation-claims.json');
  const manifestText = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText) as Manifest;
  const tokens = extractCommentTokens(readFileSync(join(root, 'docs/research/phase-1-source-comments.txt'), 'utf8'));

  const out: string[] = [];
  const problems: string[] = [];
  out.push('# Phase 1 citation quote check - output');
  out.push('');
  out.push('Generated by `bun tools/citation-quote-check/check.ts --write`. Do not edit by hand.');
  out.push('');
  out.push(`- manifest: \`docs/research/phase-1-citation-claims.json\` sha256 ${lfHash(manifestText)}`);
  out.push(`- checker: \`tools/citation-quote-check/check.ts\` sha256 ${lfHash(readFileSync(fileURLToPath(import.meta.url), 'utf8'))}`);
  out.push(`- pdftotext: ${version(tools.pdftotext, '-v')}`);
  out.push(`- tesseract: ${version(tools.tesseract, '--version')}`);
  out.push(`- comments: ${tokens.length}; claims: ${manifest.claims.length}`);
  out.push('');

  const completeness = completenessProblems(tokens, manifest.claims);
  problems.push(...completeness);
  out.push(`## Completeness\n\n${completeness.length === 0 ? 'Every quoted span and locator of every comment has a claim, and no claim is stale.' : completeness.map((p) => `- FAIL: ${p}`).join('\n')}\n`);

  out.push('## Sources\n\n| Key | File | SHA-256 | Pin |\n|---|---|---|---|');
  const extractions = new Map<string, Extractions>();
  for (const src of manifest.sources) {
    const path = join(sourcesDir, src.file);
    let sha = 'missing';
    try {
      sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    } catch {
      problems.push(`${src.key}: file ${src.file} missing`);
    }
    const pinned = sha === src.sha256;
    if (sha !== 'missing' && !pinned) problems.push(`${src.key}: sha256 ${sha} differs from the pinned ${src.sha256}`);
    out.push(`| ${src.key} | ${src.file} | ${sha} | ${pinned ? 'ok' : 'FAIL'} |`);
    if (pinned) extractions.set(src.key, extract(src, path, tools, sourcesDir));
  }
  out.push('');

  const counts = new Map<Grade, number>();
  out.push('## Claims\n\n| Comment | Token | Check | Grade | Detail |\n|---|---|---|---|---|');
  let controls = 0;
  for (const claim of manifest.claims) {
    for (const check of claim.checks) {
      const src = 'source' in check ? manifest.sources.find((s) => s.key === check.source) : undefined;
      const ex = 'source' in check ? extractions.get(check.source) : undefined;
      const r = runCheck(check, src, ex);
      counts.set(r.grade, (counts.get(r.grade) ?? 0) + 1);
      if (r.grade === 'FAIL') problems.push(`${claim.comment} ${claim.token}: ${r.detail}`);
      const what =
        check.kind === 'span'
          ? `span "${check.text}"${check.page !== undefined ? ` p. ${check.page}` : ''} [${check.source}]`
          : check.kind === 'label'
            ? `label ${check.label} near "${check.near}"${check.page !== undefined ? ` p. ${check.page}` : ''} [${check.source}]`
            : check.kind === 'order'
              ? `"${check.text}" after ${check.label} [${check.source}]`
              : check.kind === 'toc-range'
                ? `p. ${check.page} in "${check.entry}" [${check.source}]`
                : 'declared';
      out.push(`| ${claim.comment} | ${claim.token.replace(/\|/g, '\\|')} | ${what.replace(/\|/g, '\\|')} | ${r.grade} | ${r.detail.replace(/\|/g, '\\|')} |`);
      const cp = controlProblem(check, ex);
      if (check.kind === 'span' || check.kind === 'label' || check.kind === 'order') controls++;
      if (cp) problems.push(`${claim.comment} ${claim.token}: ${cp}`);
    }
  }
  out.push('');
  out.push(`## Negative controls\n\n${controls} controls (a span, a label's anchor, or an order check's span, with its longest word reversed). Controls that matched or were impossible: ${problems.filter((p) => p.includes('control')).length}.\n`);
  const summary = [...counts.entries()].map(([g, n]) => `${n} ${g}`).join(', ');
  out.push(`## Result\n\nRESULT: ${problems.length === 0 ? 'PASS' : 'FAIL'} (${summary})`);
  if (problems.length > 0) out.push('', ...problems.map((p) => `- ${p}`));
  out.push('');

  const report = out.join('\n');
  process.stdout.write(report);
  if (argv.includes('--write')) writeFileSync(join(root, 'docs/research/phase-1-citation-quote-check.out.md'), report);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
