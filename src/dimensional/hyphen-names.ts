/**
 * Kebab catalog names are one token. A parser that treats `-` as subtraction
 * splits them. Leftmost longest match, so a longer declared name or constant
 * spelling wins over a shorter one inside it.
 *
 * @module dimensional/hyphen-names
 */

import { constantRecord } from './symbolic-constants.js';

/** `s` with every regular-expression metacharacter escaped, so it matches itself. @internal */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A hyphenated spelling a registered constant could have: letters and digits, no underscore. */
const CONSTANT_SPELLING = /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+$/;

/**
 * Rewrite declared kebab-case names to underscores. Names without a hyphen
 * stay. A hyphen that is not a declared name stays subtraction.
 *
 * Each hyphenated word is scanned left to right, segment by segment; at each
 * segment the longest run of segments that is a declared name (written with
 * underscores) or a registered constant's hyphenated spelling (written as the
 * constant's primary name: `speed-of-light` is `c`) is taken, a declared name
 * before a constant spelling of the same length. So a declared name inside a
 * longer constant spelling does not win: `reduced-planck-constant` is `hbar`,
 * not `reduced - planck_constant`.
 */
export function rewriteCatalogHyphens(
  text: string,
  catalogNames: ReadonlySet<string> | Iterable<string>,
): string {
  const declared = new Set([...catalogNames].filter((n) => n.includes('-')));
  return text.replace(/[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)+/g, (word) => rewriteWord(word, declared));
}

/** One hyphenated word, rewritten by the leftmost-longest segment scan. */
function rewriteWord(word: string, declared: ReadonlySet<string>): string {
  const segments = word.split('-');
  const out: string[] = [];
  let i = 0;
  while (i < segments.length) {
    let taken: { readonly end: number; readonly token: string } | undefined;
    for (let end = segments.length; end > i + 1 && taken === undefined; end--) {
      const candidate = segments.slice(i, end).join('-');
      if (declared.has(candidate)) {
        taken = { end, token: candidate.replace(/-/g, '_') };
      } else if (CONSTANT_SPELLING.test(candidate)) {
        const record = constantRecord(candidate);
        if (record !== undefined) taken = { end, token: record.name };
      }
    }
    if (taken === undefined) {
      out.push(segments[i]!);
      i += 1;
    } else {
      out.push(taken.token);
      i = taken.end;
    }
  }
  return out.join('-');
}
