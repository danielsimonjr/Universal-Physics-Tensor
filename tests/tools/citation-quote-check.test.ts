/**
 * The citation quote check (`tools/citation-quote-check/`). It matches every quoted span and
 * locator of the `// source:` comments in `docs/research/phase-1-source-comments.txt` against downloaded source texts.
 * The sources are not in the repository, so CI checks three things without them:
 *
 * - the matcher: exact after whitespace, hyphenation and encoding normalisation, and nothing looser;
 * - completeness: every quoted span and locator of every comment has a claim in
 *   `docs/research/phase-1-citation-claims.json`, and no claim is stale;
 * - the captured output (`docs/research/phase-1-citation-quote-check.out.md`) was produced from the
 *   CURRENT manifest, covers every check in it, and has no FAIL.
 *
 * Each invariant is paired with an input that must break it, so a check that cannot fail is caught.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  completenessProblems,
  controlProblem,
  decodeEntities,
  extractCommentTokens,
  findLabelLine,
  findSpan,
  headerShowsPage,
  lfHash,
  mutateSpan,
  runCheck,
  sectionContains,
  type Check,
  type Claim,
  type Extractions,
  type Manifest,
  type SourceSpec,
} from '../../tools/citation-quote-check/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const manifestText = read('docs/research/phase-1-citation-claims.json');
const manifest = JSON.parse(manifestText) as Manifest;
const tokens = extractCommentTokens(read('docs/research/phase-1-source-comments.txt'));

describe('citation quote check — the matcher', () => {
  it('ignores whitespace, including line breaks', () => {
    expect(findSpan('a  consistency\ncondition on the CFT', 'a consistency condition')).not.toBeNull();
  });

  it('joins a word split by a line-end hyphen, and keeps a hyphenated compound', () => {
    expect(findSpan('the bath correla-\ntion time', 'correlation time')).not.toBeNull();
    expect(findSpan('the weak-\ncoupling limit', 'weak-coupling limit')).not.toBeNull();
  });

  it('reads a ligature and a typographic quote as their plain characters', () => {
    expect(findSpan('the mathematics of ﬁbre bundles', 'fibre bundles')).not.toBeNull();
    expect(findSpan('a CFT’s operator algebra', "a CFT's operator")).not.toBeNull();
  });

  it('does NOT match a span with one word changed (the matcher is not fuzzy)', () => {
    expect(findSpan('a consistency condition on the CFT data', 'a constancy condition on the CFT data')).toBeNull();
  });

  it("mutates a span's longest word so the mutation no longer matches the original", () => {
    const span = 'a set of crossing symmetry constraints';
    const m = mutateSpan(span);
    expect(m).not.toBeNull();
    expect(m).not.toBe(span);
    expect(findSpan(span, m!)).toBeNull();
    expect(mutateSpan('6.08 x 1e-13')).toBeNull();
  });
});

describe('citation quote check — equation labels and page headers', () => {
  const page = ['we find', 'E = mc^2 (1)', 'and the text refers to Gor\'kov (4) here', 'as in Eq. (1)', 'far', 'far', 'far', 'end'].join('\n');

  it('accepts a label that ends its line, near its anchor', () => {
    expect(findLabelLine(page, '(1)', 'we find', 2)).toBe(1);
  });

  it('rejects a label in the middle of a line (a reference, not a label)', () => {
    expect(findLabelLine(page, '(4)', "Gor'kov", 5)).toBe(-1);
  });

  it('rejects a line-final "Eq. (N)" (a reference to the equation, not its label)', () => {
    expect(findLabelLine('as in Eq. (1)\nmore', '(1)', 'as in', 3)).toBe(-1);
  });

  it('rejects a label whose anchor is outside the window', () => {
    expect(findLabelLine(page, '(1)', 'end', 2)).toBe(-1);
  });

  it('rejects a line-final label after a German or spelled-out reference word', () => {
    expect(findLabelLine('wie aus Gl. (4)\nweiter', '(4)', 'wie aus', 3)).toBe(-1);
    expect(findLabelLine('see equation (4)\nmore', '(4)', 'see', 3)).toBe(-1);
  });

  it('reads a printed page number from the running head, and not from a longer number', () => {
    expect(headerShowsPage('Einstein: Perihel 834 Gesamtsitzung ...', 834)).toBe(true);
    expect(headerShowsPage('no number in the head, 1834 or 8341', 834)).toBe(false);
  });

  it('decodes each HTML character reference exactly once', () => {
    expect(decodeEntities('a &amp;lt; b &lt; c &#38; d &#x26; e &bogus;')).toBe('a &lt; b < c & d & e &bogus;');
  });
});

describe('citation quote check — grading (runCheck) and controls', () => {
  // A synthetic two-page source whose PDF page 1 is printed page 10.
  const src: SourceSpec = { key: 's', title: 't', url: 'https://x', file: 'f', sha256: '0'.repeat(64), format: 'pdf', firstPage: 10 };
  const ex: Extractions = new Map([
    [
      'text',
      [
        'Head 10\nContents\n1 Intro\n2 Crossing relations\n3 End\nbody',
        'Head 11\n2 Crossing relations\nthe crossing relation is a consistency condition\nwe find\nE = mc^2 (1)\nso that a frequency follows\n3 End\nsee Eq. (1) below',
      ],
    ],
  ]);
  const grade = (c: Check) => runCheck(c, src, ex).grade;

  it('matches a span on its printed page only when that page number is legible', () => {
    expect(grade({ kind: 'span', source: 's', text: 'consistency condition', page: 11 })).toBe('MATCH');
    expect(grade({ kind: 'span', source: 's', text: 'consistency condition', page: 10 })).toBe('FAIL');
    const noHead: Extractions = new Map([['text', ['x', 'no running head\nconsistency condition']]]);
    expect(runCheck({ kind: 'span', source: 's', text: 'consistency condition', page: 11 }, src, noHead).grade).toBe('FAIL');
  });

  it('places a span inside a body section, and a contents entry cannot stand in for the heading', () => {
    const section = { chain: ['2 Crossing relations'], end: '3 End' };
    expect(sectionContains(ex.get('text')!.join('\n'), section, 'consistency condition')).toBe(true);
    expect(sectionContains(ex.get('text')!.join('\n'), section, 'body')).toBe(false);
  });

  it('grades a label MATCH on its page, and FAIL when the page is wrong', () => {
    expect(grade({ kind: 'label', source: 's', label: '(1)', near: 'we find', page: 11 })).toBe('MATCH');
    expect(grade({ kind: 'label', source: 's', label: '(1)', near: 'we find', page: 10 })).toBe('FAIL');
  });

  it('falls back to REFERENCED only on the claimed page', () => {
    const unreadable: Extractions = new Map([['text', ['Head 10\nsee Eq. (1) here', 'Head 11\nno label here']]]);
    const c = (page: number): Check => ({ kind: 'label', source: 's', label: '(1)', near: 'no label', page, reference: 'see Eq. (1)' });
    expect(runCheck(c(10), src, unreadable).grade).toBe('REFERENCED');
    expect(runCheck(c(11), src, unreadable).grade).toBe('FAIL');
  });

  it('grades an order check by position: the span must follow the label', () => {
    expect(grade({ kind: 'order', source: 's', label: '(1)', text: 'a frequency follows' })).toBe('MATCH');
    expect(grade({ kind: 'order', source: 's', label: '(1)', text: 'consistency condition' })).toBe('FAIL');
  });

  it('checks a page against a table-of-contents range', () => {
    const toc: Extractions = new Map([['text', ['3.3.1 Weak-coupling Limit 130\n3.3.2 Relaxation 137']]]);
    const c = (page: number): Check => ({ kind: 'toc-range', source: 's', entry: '3.3.1 Weak-coupling Limit', next: '3.3.2 Relaxation', page });
    expect(runCheck(c(136), src, toc).grade).toBe('MATCH');
    expect(runCheck(c(137), src, toc).grade).toBe('FAIL');
  });

  it('grades a declared claim by its declared status, never MATCH', () => {
    expect(grade({ kind: 'declared', status: 'UNREAD', reason: 'paywalled' })).toBe('UNREAD');
  });

  it('holds every control on a true claim, and reports a control that cannot fail', () => {
    expect(controlProblem({ kind: 'span', source: 's', text: 'consistency condition' }, ex)).toBeNull();
    expect(controlProblem({ kind: 'label', source: 's', label: '(1)', near: 'we find' }, ex)).toBeNull();
    expect(controlProblem({ kind: 'order', source: 's', label: '(1)', text: 'a frequency follows' }, ex)).toBeNull();
    expect(controlProblem({ kind: 'span', source: 's', text: '1.7' }, ex)).toMatch(/no control possible/);
    // A span that is its own mutation (a palindrome) would match its control; it is reported.
    const pal: Extractions = new Map([['text', ['level']]]);
    expect(controlProblem({ kind: 'span', source: 's', text: 'level' }, pal)).toMatch(/no control possible/);
  });
});

describe('citation quote check — completeness of the claims manifest', () => {
  it('reads the 15 source comments', () => {
    expect(tokens).toHaveLength(15);
  });

  it('has a claim for every quoted span and locator, and no stale claim', () => {
    expect(completenessProblems(tokens, manifest.claims)).toEqual([]);
  });

  it('FAILS when a claim is dropped or a claim names a token no comment has', () => {
    const dropped = manifest.claims.filter((c) => !(c.comment === 'BE-58/2' && c.token === 'cycles per second'));
    expect(completenessProblems(tokens, dropped)).toContain('no claim for token: BE-58/2 cycles per second');
    const stale: Claim[] = [...manifest.claims, { comment: 'BE-58/2', token: 'p. 999', checks: [{ kind: 'declared', status: 'UNREAD', reason: 'x' }] }];
    expect(completenessProblems(tokens, stale)).toContain('claim names a token no comment has: BE-58/2 p. 999');
  });

  it('pins every source by SHA-256 and names where to download it', () => {
    for (const s of manifest.sources) {
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.url).toMatch(/^https:\/\//);
    }
  });
});

describe('citation quote check — the captured output', () => {
  const outPath = resolve(root, 'docs/research/phase-1-citation-quote-check.out.md');
  // Read without throwing, so a missing output fails these tests and not the whole file.
  const out = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : '';
  const rows = out
    .split(/\r?\n/)
    .filter((l) => /^\| BE-\d+\/\d+ \|/.test(l))
    .map((l) => l.split(/(?<!\\)\|/).map((c) => c.trim()));

  it('was produced from the current manifest AND the current checker code', () => {
    expect(out).toContain(`\`docs/research/phase-1-citation-claims.json\` sha256 ${lfHash(manifestText)}`);
    expect(out).toContain(`\`tools/citation-quote-check/check.ts\` sha256 ${lfHash(read('tools/citation-quote-check/check.ts'))}`);
  });

  it('covers every check of every claim, and nothing else', () => {
    const want = manifest.claims.flatMap((c) => c.checks.map(() => `${c.comment} ${c.token}`)).sort();
    const have = rows.map((r) => `${r[1]} ${r[2]!.replace(/\\\|/g, '|')}`).sort();
    expect(have).toEqual(want);
  });

  it('has no FAIL, and grades a declared claim only by its declared status', () => {
    const grades = rows.map((r) => r[4]);
    expect(grades).not.toContain('FAIL');
    expect(new Set(grades)).toEqual(new Set(['MATCH', 'REFERENCED', 'SNIPPET-ONLY', 'BOT-WALL', 'UNREAD']));
    expect(out).toMatch(/^RESULT: PASS \(/m);
  });
});
