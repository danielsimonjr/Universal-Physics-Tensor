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

import { constantScope } from '../dimensional/symbolic-constants.js';
import { naturalConstantOverrides, type UnitMode } from '../dimensional/natural-units.js';

/** ħ in eval is the exact quotient H_SI/(2π). */
export const HBAR_TRUNCATION_NOTE =
  'note: hbar is HBAR_SI = H_SI/(2π), the exact reduced Planck constant. ' +
  'The CODATA display 1.054571817e-34 is that quotient truncated (relative difference 6.127e-10).';

/**
 * Registered constants an eval may omit: every spelling of the constant
 * registry, plus `pi` and `tau`. A hyphenated spelling is not an identifier
 * the parser can read and is left out. Explicit `name=` wins over these.
 *
 * `2pi`, `4pi` and `8pi` are in the scope. The MathTS parser reads those
 * spellings as n·pi before the scope is consulted. The scope values match
 * that reading.
 * @internal
 */
export function codataScope(mode: UnitMode): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const [name, value] of Object.entries(constantScope())) {
    // A hyphenated spelling (`wien-constant`) is not a formula identifier; `8pi` is read as 8·pi.
    if (!name.includes('-')) scope[name] = value;
  }
  if (mode !== 'si') Object.assign(scope, naturalConstantOverrides(mode));
  return scope;
}

