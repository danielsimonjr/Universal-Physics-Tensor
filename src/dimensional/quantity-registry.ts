/**
 * The quantity registry. Canonical id, aliases, dimension, and whether an
 * affine temperature is an absolute point or an interval. Synonym groups and
 * the temperature role are projections of this table.
 *
 * @module dimensional/quantity-registry
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dimension } from './types.js';

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
  readonly defaultUnit?: string;
  readonly signRole?: SignRole;
  readonly graphNode: boolean;
}

interface QuantityFile {
  readonly quantities: readonly QuantityRecord[];
}

const foldName = (s: string): string => s.replace(/_/g, '-');

function loadQuantities(): readonly QuantityRecord[] {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../../data/quantities.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as QuantityFile;
  return parsed.quantities;
}

const QUANTITIES = loadQuantities();

const BY_KEY = new Map<string, QuantityRecord>();
for (const row of QUANTITIES) {
  BY_KEY.set(row.id, row);
  BY_KEY.set(foldName(row.id), row);
  for (const alias of row.aliases ?? []) {
    BY_KEY.set(alias, row);
    BY_KEY.set(foldName(alias), row);
  }
}

/** Every quantity record, graph nodes and spellings. */
export function allQuantityRecords(): readonly QuantityRecord[] {
  return QUANTITIES;
}

/** The record `name` spells, comparing `_` and `-` as the same character. */
export function quantityRecord(name: string): QuantityRecord | undefined {
  return BY_KEY.get(name) ?? BY_KEY.get(foldName(name));
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
