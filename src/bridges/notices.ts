/**
 * The caveats printed beside a relation's value: the record's own notice, and
 * the note of every registered constant its expression names. No caller
 * switches on a notice; the text is the record's or the constant's.
 *
 * @module bridges/notices
 */

import { constantNotes } from '../dimensional/symbolic-constants.js';
import type { CatalogRelation } from './catalog-types.js';
import { expressionNames } from './expr-parse.js';

/** The caveats to print beside `relation`'s value. @internal */
export function relationNotices(relation: CatalogRelation): string[] {
  const notes: string[] = [];
  if (relation.notice !== undefined) notes.push(relation.notice.text);
  // The names are read after the kebab rewrite: a bare identifier regex read be-39's
  // `truncation-coefficient-b` as the constant `b`. A `reduced-planck-constant` spelling is
  // `hbar` (tests/bridges/expression-names.test.ts).
  for (const note of constantNotes(expressionNames(relation.expression))) notes.push(`note: ${note}`);
  return notes;
}
