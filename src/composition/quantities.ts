/**
 * Graph quantity nodes, projected from the quantity registry.
 * One object per canonical name.
 *
 * @module composition/quantities
 */

import { allQuantityRecords } from '../dimensional/quantity-registry.js';
import type { Quantity } from './quantity.js';
import { regimeAttributesOf } from './quantity.js';

// A row's attributes are checked against the axis registry here, at load: a
// misspelt axis or value in `data/quantities.json` is an error, not an unstated
// axis the gate silently abstains on (9.0.0 audit §4 Low).
const nodes = new Map<string, Quantity>();
for (const row of allQuantityRecords()) {
  if (!row.graphNode) continue;
  nodes.set(row.id, {
    name: row.id,
    symbol: row.symbol,
    dim: row.dimension,
    attributes: regimeAttributesOf(row.attributes, `data/quantities.json ${row.id}`),
  });
}

/** Every graph quantity, in registry order. */
export function allQuantities(): readonly Quantity[] {
  return [...nodes.values()];
}

/** The graph node named `name`. */
export function quantityByName(name: string): Quantity {
  const found = nodes.get(name);
  if (found === undefined) throw new Error(`quantityByName: no graph quantity '${name}'`);
  return found;
}
