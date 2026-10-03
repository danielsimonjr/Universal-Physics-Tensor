/**
 * Numbers `upt eval` understands: a bare numeral, a numeral with a unit, and
 * the CODATA names a script should not have to paste.
 *
 * Bare `e` is the elementary charge, taken from the constant registry.
 * Euler's number is `exp(x)`. `E` is energy and is not filled in.
 *
 * @module cli/eval-numbers
 * @internal
 */

import { E_SI, M_E_SI, M_SUN_SI } from '../core/constants.js';
import { MU0_SI } from '../dimensional/formula-names.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import type { UnitMode } from '../dimensional/natural-units.js';

/** ħ in eval is the exact quotient H_SI/(2π). */
export const HBAR_TRUNCATION_NOTE =
  'note: hbar is HBAR_SI = H_SI/(2π), the exact reduced Planck constant. ' +
  'The CODATA display 1.054571817e-34 is that quotient truncated (relative difference 6.127e-10).';

/**
 * Registered constants an eval may omit, taken from {@link CONSTANTS} so a
 * new registry leaf is a formula name without a second list. Aliases below
 * are spellings that are not registry keys. Bare `sigma` is not an alias of
 * `sigma_sb`. Explicit `name=` wins over these.
 *
 * `2pi`, `4pi` and `8pi` are in the scope. The MathTS parser reads those
 * spellings as n·pi before the scope is consulted. The scope values match
 * that reading.
 * @internal
 */
export function codataScope(mode: UnitMode): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const [name, c] of Object.entries(CONSTANTS)) scope[name] = c.value;
  scope.e_charge = E_SI;
  scope.m_e = M_E_SI;
  scope.eps0 = CONSTANTS.epsilon_0.value;
  scope.mu0 = MU0_SI;
  scope.mu_0 = MU0_SI;
  scope.kB = CONSTANTS.k_B.value;
  scope.M_sun = M_SUN_SI;
  if (mode !== 'si') {
    scope.c = 1;
    scope.hbar = 1;
    scope.h = 2 * Math.PI;
  }
  if (mode === 'geometrized') scope.G = 1;
  return scope;
}

