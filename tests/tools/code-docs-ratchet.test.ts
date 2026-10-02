/**
 * The pull-request code-docs ratchet has to be able to fail.
 *
 * A tag-only `/** @public *\/` and a bare export are debt. A summary line is
 * not. Debt that the base revision already had is not new. A checker that
 * reported every export, or that reported nothing, fails one of these.
 */

import { describe, expect, it } from 'vitest';
import { fileDocs, jsdocSummary, newDebt } from '../../tools/code-docs-ratchet/check.js';

const bare = 'export function bare(): void {}\n';
const tagOnly = '/** @public */\nexport function tagged(): void {}\n';
const summarized = '/** Adds one. @public */\nexport function add(n: number): number { return n + 1; }\n';
const overload = [
  '/** Returns the argument. */',
  'export function over(a: number): number;',
  'export function over(a: string): string;',
  'export function over(a: number | string): number | string { return a as number; }',
  '',
].join('\n');
const mismatch = [
  '/**',
  ' * Names the equation.',
  ' * @param equationLabel the label',
  ' */',
  'export function mismatch(_equationLabel: string): void {}',
  '',
].join('\n');
const matched = [
  '/**',
  ' * Names the equation.',
  ' * @param equationLabel the label',
  ' */',
  'export function mismatch(equationLabel: string): void {}',
  '',
].join('\n');

describe('code-docs ratchet', () => {
  it('reads a summary and rejects a tag-only comment', () => {
    expect(jsdocSummary('/** Adds one. @public */')).toBe('Adds one.');
    expect(jsdocSummary('/** @public */')).toBeNull();
    expect(jsdocSummary('// Adds one.')).toBeNull();
  });

  it('flags a bare export and a tag-only export, and accepts a summary', () => {
    expect(newDebt(null, bare).map((item) => item.name)).toEqual(['bare']);
    expect(newDebt(null, tagOnly).map((item) => item.kind)).toEqual(['missing-summary']);
    expect(newDebt(null, summarized)).toEqual([]);
  });

  it('does not treat an already-undocumented export as new debt', () => {
    const touched = `${bare}\nexport const extra = 1;\n`;
    expect(newDebt(bare, touched).map((item) => item.name)).toEqual(['extra']);
    expect(newDebt(bare, bare)).toEqual([]);
  });

  it('flags a summary that the base revision had and this revision dropped', () => {
    expect(newDebt(summarized, 'export function add(n: number): number { return n + 1; }\n').map((item) => item.name)).toEqual([
      'add',
    ]);
  });

  it('accepts an overload group whose first signature carries the summary', () => {
    const docs = fileDocs(overload);
    expect(docs.unparsed).toBe(false);
    expect(docs.symbols.get('function:over')?.documented).toBe(true);
    expect(newDebt(null, overload)).toEqual([]);
  });

  it('flags a @param name the signature does not have, and accepts the real name', () => {
    const bad = newDebt(null, mismatch);
    expect(bad.map((item) => item.kind)).toEqual(['param-mismatch']);
    expect(newDebt(null, matched)).toEqual([]);
    expect(newDebt(mismatch, mismatch)).toEqual([]);
  });

  it('flags a file that stops parsing, and ignores one that was already unparsed', () => {
    const broken = 'export function ( {\n';
    expect(fileDocs(broken).unparsed).toBe(true);
    expect(newDebt(summarized, broken).map((item) => item.kind)).toEqual(['unparsed']);
    expect(newDebt(broken, broken)).toEqual([]);
  });
});
