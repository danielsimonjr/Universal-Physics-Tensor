/**
 * The quantity registry. Canonical id, aliases, dimension, and whether an
 * affine temperature is an absolute point or an interval. Synonym groups and
 * the temperature role are projections of this table. The aliases of a
 * quantity that is also a registered constant come from the constant registry.
 *
 * @module dimensional/quantity-registry
 */

import { checkedDataFile } from '../core/data-file.js';
import type { Dimension } from './types.js';
import { CONSTANT_REGISTRY } from './symbolic-constants.js';

/** Declared role of an affine temperature quantity. */
export type QuantityKind = 'absolute' | 'interval';

/** A carrier that enters a same-sign transport rule. */
export type SignRole = 'charge' | 'mobility';

/** One quantity. `graphNode` is false for a spelling that is not a graph node. */
export interface QuantityRecord {
  readonly id: string;
  readonly symbol: string;
  readonly dimension: Dimension;
  readonly attributes: Readonly<Record<string, string>>;
  readonly kind?: QuantityKind;
  readonly aliases?: readonly string[];
  readonly signRole?: SignRole;
  readonly graphNode: boolean;
}

interface QuantityFile {
  readonly quantities: readonly QuantityRecord[];
}

/** `_` written as `-`: the one fold every spelling comparison uses. */
export const foldName = (s: string): string => s.replace(/_/g, '-');

/**
 * The rows of `data/quantities.json`. A constant that is also a quantity
 * (`k_B` is `boltzmann-constant`) gives that row its spellings as aliases:
 * the constant registry owns them and the file does not repeat them.
 */
function loadQuantities(): readonly QuantityRecord[] {
  const parsed = checkedDataFile('quantities.json') as QuantityFile;
  const ids = new Set(parsed.quantities.map((row) => row.id));
  const derived = new Map<string, string[]>();
  for (const constant of CONSTANT_REGISTRY) {
    if (constant.quantity === undefined) continue;
    if (!ids.has(constant.quantity)) {
      throw new Error(`constant '${constant.name}' names quantity '${constant.quantity}', which data/quantities.json does not have`);
    }
    derived.set(constant.quantity, [...(derived.get(constant.quantity) ?? []), constant.name, ...constant.spellings]);
  }
  return parsed.quantities.map((row) => {
    const known = new Set([row.id, ...(row.aliases ?? [])].map(foldName));
    const spellings = (derived.get(row.id) ?? []).filter((spelling) => !known.has(foldName(spelling)));
    return spellings.length === 0 ? row : { ...row, aliases: [...(row.aliases ?? []), ...spellings] };
  });
}

const QUANTITIES = loadQuantities();

/**
 * Folded spelling → row, over every id and alias. Two rows that one folded
 * spelling names throw: the later row would silently shadow the earlier.
 * @internal
 */
export function quantitySpellingIndex(rows: readonly QuantityRecord[]): ReadonlyMap<string, QuantityRecord> {
  const index = new Map<string, QuantityRecord>();
  for (const row of rows) {
    for (const spelling of new Set([row.id, ...(row.aliases ?? [])].map(foldName))) {
      const other = index.get(spelling);
      if (other !== undefined) {
        throw new Error(`data/quantities.json: '${spelling}' spells both '${other.id}' and '${row.id}' (\`_\` and \`-\` are one character)`);
      }
      index.set(spelling, row);
    }
  }
  return index;
}

const BY_KEY = quantitySpellingIndex(QUANTITIES);

/** Every quantity record, graph nodes and spellings. */
export function allQuantityRecords(): readonly QuantityRecord[] {
  return QUANTITIES;
}

/** The record `name` spells, comparing `_` and `-` as the same character. */
export function quantityRecord(name: string): QuantityRecord | undefined {
  return BY_KEY.get(foldName(name));
}

/**
 * Synonym groups projected from declared aliases. The canonical id is first.
 * A quantity with no alias is not a group.
 */
export function synonymGroupsFromRegistry(): readonly (readonly string[])[] {
  const groups: string[][] = [];
  for (const row of QUANTITIES) {
    const aliases = row.aliases ?? [];
    if (aliases.length === 0) continue;
    groups.push([row.id, ...aliases]);
  }
  return groups;
}
