/**
 * The caveats printed beside a relation's value: the record's own notice, and
 * the note of every registered constant its expression names. No caller
 * switches on a notice; the text is the record's or the constant's.
 *
 * @module bridges/notices
 */

import { constantNotes } from '../dimensional/symbolic-constants.js';
import type { CatalogRelation } from './catalog-types.js';

/** Identifiers in an expression, in order of first appearance. */
function identifiers(expression: string): string[] {
  return [...new Set(expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [])];
}

/** The caveats to print beside `relation`'s value. @internal */
export function relationNotices(relation: CatalogRelation): string[] {
  const notes: string[] = [];
  if (relation.notice !== undefined) notes.push(relation.notice.text);
  for (const note of constantNotes(identifiers(relation.expression))) notes.push(`note: ${note}`);
  return notes;
}
