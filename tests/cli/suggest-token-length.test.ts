/**
 * A failed explain splits the name on hyphens and asks `upt search` for the
 * words. A one-letter fragment is a symbol for an explicit search, not a
 * suggestion. `not-a-quantity-xyz` must not search the token `a`.
 *
 * The ranking lives in `searchNameWords`. Explicit `upt search a` still
 * matches the quantity `a`.
 */
import { describe, it, expect } from 'vitest';
import * as api from '../../src/cli-api.js';
import { runCli } from '../../src/cli/main.js';
import { buildSearchIndex, matchEveryWord, queryWords, searchNameWords } from '../../src/cli/search-index.js';

describe('suggestion queries drop a one- or two-letter hyphen token', () => {
  it('not-a-quantity-xyz does not search the token a', () => {
    const found = searchNameWords(api, 'not-a-quantity-xyz');
    const words = found?.words ?? [];
    expect(words).not.toContain('a');
    expect(words.join(' ')).not.toBe('a');
    const ids = (found?.matches ?? []).map((m) => m.entry.id);
    expect(ids).not.toContain('a');
  });

  it('schrodinger-equation still searches the word schrodinger, not a one-letter name', () => {
    const found = searchNameWords(api, 'schrodinger-equation');
    expect(found?.words).toContain('schrodinger');
    expect(found?.words.every((w) => w.length >= 3)).toBe(true);
  });

  it('upt explain not-a-quantity-xyz does not suggest searching a', async () => {
    const lines: string[] = [];
    const sink = (s?: string) => lines.push((s ?? '') + '\n');
    const code = await runCli(['explain', 'not-a-quantity-xyz'], {
      out: sink,
      err: sink,
      write: (s: string) => lines.push(s),
    });
    const text = lines.join('');
    expect(code).toBe(1);
    expect(text).toMatch(/NOT COVERED/);
    expect(text).not.toContain('`upt search a`');
  });

  it('explicit search of a still finds the quantity a', () => {
    const index = buildSearchIndex(api);
    const matches = matchEveryWord(api, index, queryWords(['a']));
    expect(matches.some((m) => m.entry.kind === 'quantity' && m.entry.id === 'a')).toBe(true);
  });
});
