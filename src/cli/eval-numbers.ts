/**
 * Numbers `upt eval` understands: a bare numeral, a numeral with a unit, and
 * the CODATA names a script should not have to paste.
 *
 * Bare `e` is not one of them. Charge is `e_charge`.
 *
 * @module cli/eval-numbers
 * @internal
 */

import { C_SI, E_SI, G_SI, GM_SUN_SI, HBAR_SI, H_SI, K_B_SI, M_E_SI, M_SUN_SI } from '../core/constants.js';
import { parseUnit, UnitError } from '../dimensional/units.js';
import { EPS0_SI, MU0_SI } from '../composition/formula-names.js';
import type { UnitMode } from '../composition/natural-units.js';

/** ħ in eval is the exact quotient H_SI/(2π). */
export const HBAR_TRUNCATION_NOTE =
  'note: hbar is HBAR_SI = H_SI/(2π), the exact reduced Planck constant. ' +
  'The CODATA display 1.054571817e-34 is that quotient truncated (relative difference 6.127e-10).';

/** CODATA / SI names an eval may omit. Explicit `name=` wins over these. @internal */
export function codataScope(mode: UnitMode): Record<string, number> {
  const scope: Record<string, number> = {
    G: G_SI,
    c: C_SI,
    hbar: HBAR_SI,
    h: H_SI,
    k_B: K_B_SI,
    e_charge: E_SI,
    m_e: M_E_SI,
    eps0: EPS0_SI,
    mu0: MU0_SI,
    M_sun: M_SUN_SI,
    GM_sun: GM_SUN_SI,
    Msun_iau: GM_SUN_SI / G_SI,
  };
  if (mode !== 'si') {
    scope.c = 1;
    scope.hbar = 1;
    scope.h = 2 * Math.PI;
  }
  if (mode === 'geometrized') scope.G = 1;
  return scope;
}

/**
 * A scope token: a finite number, or a number with a unit converted to its SI
 * scale (`1Msun` → kilograms, `25degC` → kelvin with the absolute offset).
 * @internal
 */
export function parseEvalToken(raw: string): number {
  const trimmed = raw.trim();
  // A scientific literal (`1.054571817e-34`) is a number. The `e` is the exponent, not a unit.
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/.exec(trimmed);
  if (m === null || m[2] === undefined || m[2] === '') {
    throw new UnitError(`'${raw}' is not a finite number or a number with a unit`);
  }
  const v = Number(m[1]);
  const unit = parseUnit(m[2]);
  if (unit.affine === 'celsius') return v * unit.scale + 273.15;
  return v * unit.scale;
}
