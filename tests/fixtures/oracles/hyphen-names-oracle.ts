// ORACLE: `rewriteCatalogHyphens` as it was before the leftmost-longest scan. Test-only; never imported by src/.
/**
 * The retired rewrite: every declared kebab name, longest first, replaced
 * wherever it stands (its lookbehind admitted a preceding `-`), then each
 * whole hyphenated word that spells a registered constant. A declared name
 * inside a longer constant spelling was rewritten first, so
 * `reduced-planck-constant` became `reduced-planck_constant` and never
 * reached `hbar`. Kept so the corpus test can name exactly which texts the
 * fix changes (WORKFLOWS: keep the path that produced the wrong result).
 */
import { escapeRegExp } from '../../../src/dimensional/hyphen-names.js';
import { constantRecord } from '../../../src/dimensional/symbolic-constants.js';

/** The pre-fix rewrite, verbatim. */
export function oracleRewriteCatalogHyphens(
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
  out = out.replace(/(?<![A-Za-z0-9_])[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+(?![A-Za-z0-9_])/g, (word) => {
    const record = constantRecord(word);
    return record === undefined ? word : record.name;
  });
  return out;
}
