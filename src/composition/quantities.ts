/**
 * Graph quantity nodes, projected from the quantity registry.
 * One object per canonical name.
 *
 * @module composition/quantities
 */

import { allQuantityRecords } from '../dimensional/quantity-registry.js';
import type { Quantity, RegimeAttributes } from './quantity.js';

const nodes = new Map<string, Quantity>();
for (const row of allQuantityRecords()) {
  if (!row.graphNode) continue;
  nodes.set(row.id, {
    name: row.id,
    symbol: row.symbol,
    dim: row.dimension,
    attributes: row.attributes as RegimeAttributes,
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

/** Canonical temperature node. */
export const temperatureQ = quantityByName('temperature');
/** Canonical mass node. */
export const massQ = quantityByName('mass');
