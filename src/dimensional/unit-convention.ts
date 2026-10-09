/**
 * Per-quantity unit convention for the quantities whose dimension does not
 * decide the unit. Energy nodes here are GeV; the rest of the energy graph
 * is joules. Information nodes here are bits or nats; both are
 * dimensionless, and a bit is ln 2 nat. Entropy in J/K is dimensionally
 * distinct and tagged so a bit is not accepted as that entropy.
 *
 * A name absent from this table is read in SI, which is what
 * {@link readBinding} already returns. Representative magnitudes in
 * `representative-values.ts` stay in SI joules and are not read through
 * this table.
 *
 * @module dimensional/unit-convention
 * @internal
 */

import { equals } from './algebra.js';
import { parseUnit } from './units.js';

/** Quantity name → the unit its evaluator speaks; read through {@link quantityConventionUnit}. */
const QUANTITY_CONVENTION_UNIT: ReadonlyMap<string, string> = new Map([
  ['vacuum-expectation-value', 'GeV'],
  ['dark-fermion-mass', 'GeV'],
  ['planck-mass-energy', 'GeV'],
  ['inflation-hubble-energy', 'GeV'],
  ['intrinsic-information', 'bit'],
  ['subsystem-entanglement-entropy', 'nat'],
  ['modular-hamiltonian-variation', 'nat'],
  ['entanglement-entropy-variation', 'nat'],
  ['wormhole-entanglement-entropy', 'J/K'],
]);

/** The unit a quantity's evaluator speaks, or undefined when that unit is SI. @internal */
export function quantityConventionUnit(name: string): string | undefined {
  return QUANTITY_CONVENTION_UNIT.get(name);
}

/** Scale a quantity's evaluator-unit value into SI. @internal */
export function conventionScaleToSI(name: string): number {
  const unit = QUANTITY_CONVENTION_UNIT.get(name);
  return unit === undefined ? 1 : parseUnit(unit).scale;
}

/**
 * Multiply a value in `from`'s convention to obtain the value in `to`'s
 * convention. Two untagged names, or two names with the same unit, are 1.
 * An untagged name is SI. Two tagged names whose dimensions differ throw:
 * copying the number would type-check and be meaningless.
 * @internal
 */
export function conventionFactor(from: string, to: string): number {
  const fromUnit = QUANTITY_CONVENTION_UNIT.get(from);
  const toUnit = QUANTITY_CONVENTION_UNIT.get(to);
  if (fromUnit === undefined && toUnit === undefined) return 1;
  if (fromUnit === toUnit) return 1;
  const fromParsed = fromUnit === undefined ? null : parseUnit(fromUnit);
  const toParsed = toUnit === undefined ? null : parseUnit(toUnit);
  if (fromParsed !== null && toParsed !== null && !equals(fromParsed.dim, toParsed.dim)) {
    throw new Error(
      `unit convention: '${from}' is ${fromUnit} and '${to}' is ${toUnit}; the dimensions differ`,
    );
  }
  return (fromParsed?.scale ?? 1) / (toParsed?.scale ?? 1);
}
