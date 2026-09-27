/**
 * Audit §14 item 14: each recorded `preprocessing` / `independence` statement cites where its
 * support is written, as a repository file plus a verbatim quote that must occur in it or a symbol
 * it must declare. This test resolves every reference.
 *
 * What it does NOT show: that a statement is true, or that the quoted text covers every clause of
 * the statement. It shows only that the cited text exists at the cited place, so a reference that
 * was mistyped, invented, or left behind by an edit fails instead of reading as support.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listConfrontations } from '../../src/bridges/confrontations.js';
import type { SourceRef, SourceRefs } from '../../src/bridges/observations/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Shorter quotes match too easily to identify a place; symbols are exempt. */
const MIN_QUOTE_LENGTH = 10;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Why `ref` does not resolve, or null when it does. */
function refProblem(ref: SourceRef): string | null {
  if (isAbsolute(ref.file) || ref.file.split('/').includes('..')) return `${ref.file}: not a path inside the repository`;
  const path = resolve(root, ref.file);
  if (!existsSync(path)) return `${ref.file}: no such file`;
  const text = readFileSync(path, 'utf-8');
  if ('quote' in ref) {
    if (ref.quote.trim().length < MIN_QUOTE_LENGTH) return `${ref.file}: quote shorter than ${MIN_QUOTE_LENGTH} characters`;
    return text.includes(ref.quote) ? null : `${ref.file}: quote not found verbatim: "${ref.quote}"`;
  }
  const declared = new RegExp(
    `^\\s*(?:export\\s+)?(?:declare\\s+)?(?:async\\s+)?(?:const|let|var|function|interface|type|class|enum)\\s+${escapeRe(ref.symbol)}\\b`,
    'm',
  );
  return declared.test(text) ? null : `${ref.file}: does not declare ${ref.symbol}`;
}

const cited: { where: string; refs: SourceRefs }[] = listConfrontations().flatMap((e) => {
  const o = e.run();
  const out: { where: string; refs: SourceRefs }[] = [];
  if (o.preprocessing.state === 'recorded') out.push({ where: `be-${e.bridgeId} preprocessing`, refs: o.preprocessing.source });
  if (o.independence.state !== 'not-recorded') out.push({ where: `be-${e.bridgeId} independence`, refs: o.independence.source });
  return out;
});

describe('every recorded confrontation statement cites text that exists', () => {
  it('there are recorded statements to check, each with at least one reference', () => {
    expect(cited.length).toBeGreaterThan(0);
    for (const { where, refs } of cited) expect(refs.length, where).toBeGreaterThan(0);
  });

  it('every reference resolves: the file exists and the quote or declared symbol is in it', () => {
    const problems = cited.flatMap(({ where, refs }) =>
      refs.map(refProblem).filter((p): p is string => p !== null).map((p) => `${where}: ${p}`),
    );
    expect(problems).toEqual([]);
  });

  describe('controls: a reference planted wrong does not resolve', () => {
    const real = cited.flatMap((c) => c.refs).find((r): r is Extract<SourceRef, { quote: string }> => 'quote' in r)!;

    it('the unplanted reference resolves (so the failures below are caused by the plant)', () => {
      expect(refProblem(real)).toBeNull();
    });

    it('a file that does not exist', () => {
      expect(refProblem({ ...real, file: real.file.replace(/\.ts$/, '-missing.ts') })).toMatch(/no such file/);
    });

    it('a quote altered by one character', () => {
      const altered = real.quote.slice(0, -1) + (real.quote.endsWith('X') ? 'Y' : 'X');
      expect(refProblem({ ...real, quote: altered })).toMatch(/quote not found verbatim/);
    });

    it('a real quote cited in the wrong file', () => {
      expect(refProblem({ file: 'src/bridges/observations/types.ts', quote: real.quote })).toMatch(/quote not found verbatim/);
    });

    it('a symbol the file only imports and uses, but does not declare', () => {
      expect(refProblem({ file: 'src/bridges/be61-wiedemann-franz-confrontation.ts', symbol: 'LORENZ_NUMBER_SI' })).toMatch(
        /does not declare LORENZ_NUMBER_SI/,
      );
      expect(refProblem({ file: 'src/bridges/be61-wiedemann-franz.ts', symbol: 'LORENZ_NUMBER_SI' })).toBeNull();
    });

    it('a path outside the repository, and a quote too short to identify a place', () => {
      expect(refProblem({ file: '../outside.ts', quote: real.quote })).toMatch(/not a path inside/);
      expect(refProblem({ file: real.file, quote: real.quote.slice(0, 3) })).toMatch(/shorter than/);
    });
  });
});
