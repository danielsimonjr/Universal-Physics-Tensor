/**
 * Kebab catalog names are one token. A parser that treats `-` as subtraction
 * splits them. Longest match first, so a longer declared name wins over a
 * shorter one that is its suffix.
 *
 * @module dimensional/hyphen-names
 */

import { constantRecord } from './symbolic-constants.js';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite declared kebab-case names to underscores. Names without a hyphen
 * stay. A hyphen that is not a declared name stays subtraction.
 */
export function rewriteCatalogHyphens(
  text: string,
  catalogNames: ReadonlySet<string> | Iterable<string>,
): string {
  const names = [...catalogNames]
    .filter((n) => n.includes('-'))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  let out = text;
  for (const name of names) {
    const underscored = name.replace(/-/g, '_');
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(name)}(?![A-Za-z0-9_])`, 'g');
    out = out.replace(re, underscored);
  }
  // A hyphenated spelling of a registered constant (`speed-of-light`) is that constant, by its
  // primary name (`c`), whether or not the caller declared it: the formula then reads the baked
  // value, and the hyphens are not subtractions.
  out = out.replace(/(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+(?![A-Za-z0-9_])/g, (word) => {
    const record = constantRecord(word);
    return record === undefined ? word : record.name;
  });
  return out;
}
