/**
 * Kebab catalog names are one token. A parser that treats `-` as subtraction
 * splits them. Longest match first, so a longer declared name wins over a
 * shorter one that is its suffix.
 *
 * @module dimensional/hyphen-names
 */

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
  return out;
}
