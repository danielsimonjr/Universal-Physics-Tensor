/**
 * The quantity registry. Canonical id, aliases, dimension, and whether an
 * affine temperature is an absolute point or an interval. Synonym groups and
 * the temperature role are projections of this table. The aliases of a
 * quantity that is also a registered constant come from the constant registry.
 *
 * @module dimensional/quantity-registry
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  const path = join(dirname(fileURLToPath(import.meta.url)), '../../data/quantities.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as QuantityFile;
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
