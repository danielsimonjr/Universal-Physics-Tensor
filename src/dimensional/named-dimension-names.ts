/**
 * The names of the named dimensions, as a pure leaf. `src/cli/library-defaults.ts`
 * reads this list for `upt derive --help`, so this module must stay importable
 * without `dimension-spec.ts` (which pulls the unit reader and the MathTS
 * function library).
 *
 * @module dimensional/named-dimension-names
 */

/** Every name `dimension-spec.ts` accepts as a named dimension, in table order. */
export const NAMED_DIMENSION_NAMES = [
  'dimensionless',
  'length',
  'area',
  'volume',
  'time',
  'frequency',
  'mass',
  'density',
  'velocity',
  'acceleration',
  'force',
  'energy',
  'power',
  'action',
  'temperature',
  'entropy',
  'charge',
  'current',
  'electric_current',
  'amount',
  'amount_of_substance',
  'luminous_intensity',
  'pressure',
  'viscosity',
  'resistance',
  'magnetic_field',
  'permeability',
  'voltage',
  'capacitance',
  'inductance',
  'permittivity',
  'conductance',
  'magnetic_flux',
] as const;

/** One name of the named-dimension table. */
export type NamedDimensionName = (typeof NAMED_DIMENSION_NAMES)[number];
