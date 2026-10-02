/**
 * Names for the three regime vocabularies. They are not one type, and
 * nothing here converts a value from one into another. The join gate does
 * not import this module.
 *
 * - Tensor-cell registry: `defineRegime` in `src/core/regime-registry.ts`.
 *   A named value on a scale, force, symmetry, information, topology, or
 *   dimension axis, with provenance.
 * - π-group regime: `regimeHolds` and `regimeOverlap` in `src/relations/regime.ts`.
 *   Inequalities on Buckingham groups. `regimeHolds` is tri-state.
 * - Quantity attributes: `regimesDiffer` in `src/composition/quantity.ts`,
 *   gated by `GATE_AXES` in `src/composition/axes.ts`. Scale and force on a
 *   quantity. That module is not imported: this layer importing composition
 *   is an upward edge.
 *
 * @module relations/regime-vocabularies
 */

import type { RegimeValueBase } from '../core/regime-registry.js';
import type { Regime } from './types.js';

/**
 * The value `defineRegime` returns. `src/relations/` importing
 * `src/core/regime-registry.ts` is a downward edge.
 *
 * @internal
 */
export type TensorCellRegime = RegimeValueBase;

/**
 * The inequalities `regimeHolds` checks.
 *
 * @internal
 */
export type PiGroupRegime = Regime;

/**
 * The quantity-attribute vocabulary, named and not imported.
 * `regimesDiffer` stays in `src/composition/quantity.ts`.
 *
 * @internal
 */
export type QuantityAttributeRegime = never;
