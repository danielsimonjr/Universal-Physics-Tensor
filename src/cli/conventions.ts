/**
 * Convention lines the CLI prints beside a comparison.
 *
 * @module cli/conventions
 * @internal
 */

import { canonicalById } from '../canonical/registry.js';

/**
 * A factor or form difference is a failed check, except within a convention
 * group: entries that share `conventionGroup` are one law under different
 * conventions (the two Compton wavelengths differ by 2π), so a formula that
 * agrees with one of them has matched that convention. The other difference
 * is still printed. A formula that matches none of a group still fails.
 * @internal
 */
export function canonicalCheckFailed(
  comparisons: readonly { readonly id: string; readonly kind: string }[],
): boolean {
  const hard = comparisons.filter((c) => c.kind === 'factor' || c.kind === 'form');
  if (hard.length === 0) return false;
  const agreedGroups = new Set(
    comparisons.filter((c) => c.kind === 'agrees').map((c) => canonicalById(c.id)?.conventionGroup).filter((g) => g !== undefined),
  );
  return !hard.every((c) => {
    const group = canonicalById(c.id)?.conventionGroup;
    return group !== undefined && agreedGroups.has(group);
  });
}

/** One line per convention note the listed entries carry; a note two entries share prints once. @internal */
export function conventionLines(ids: readonly string[]): string[] {
  const lines: string[] = [];
  for (const id of ids) {
    const note = canonicalById(id)?.conventionNote;
    if (note === undefined) continue;
    const line = `convention: ${note}`;
    if (!lines.includes(line)) lines.push(line);
  }
  return lines;
}
