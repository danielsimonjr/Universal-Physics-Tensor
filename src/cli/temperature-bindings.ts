/**
 * Joules per kelvin for a temperature binding.
 *
 * `upt eval` looks up `k_B` and `kB`. The graph quantity is
 * `boltzmann-constant`. A bare number or a J/K value on that name is the
 * scale, so `kT` equals the energy the caller wrote. Any other dimension
 * falls through to `k_B`, `kB`, then the CODATA value.
 *
 * @module cli/temperature-bindings
 * @internal
 */
import { equals } from '../dimensional/algebra.js';
import { CONSTANTS as SYMBOLIC } from '../dimensional/symbolic-constants.js';
import { boltzmannBindingScale, type BindingValue } from '../numerical/binding-value.js';

/**
 * Joules per kelvin for aligning a temperature binding in this assignment list.
 * @internal
 */
export function kelvinScale(pending: readonly { name: string; read: BindingValue }[]): number {
  const named = pending.find((p) => p.name === 'boltzmann-constant');
  if (named !== undefined && (!named.read.dimensioned || equals(named.read.dimension, SYMBOLIC.k_B.dim))) {
    return named.read.value;
  }
  return boltzmannBindingScale(pending);
}
