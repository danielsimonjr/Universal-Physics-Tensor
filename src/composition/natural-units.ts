/**
 * Opt-in natural units. The default comparison stays SI: an energy written as
 * a mass is a mismatch. `--natural` sets ħ = c = 1; `--geometrized` also
 * sets G = 1. A mismatch is reconciled only when the exponent difference is
 * an integer combination of those constants.
 *
 * @module composition/natural-units
 */

import type { Dimension } from '../dimensional/types.js';

/** Which constants may be set to 1. @internal */
export type UnitMode = 'si' | 'natural' | 'geometrized';

/**
 * Constant values for a numeric comparison in this mode. `h = 2π` keeps
 * `h = 2π ħ` when `ħ = 1`. SI comparisons pass no overrides.
 * @internal
 */
export function naturalConstantOverrides(mode: Exclude<UnitMode, 'si'>): Record<string, number> {
  const overrides: Record<string, number> = { c: 1, hbar: 1, h: 2 * Math.PI };
  if (mode === 'geometrized') overrides.G = 1;
  return overrides;
}

/** The powers of G, ħ and c that reconcile two dimensions, or null. @internal */
export interface NaturalPowers {
  readonly nG: number;
  readonly nH: number;
  readonly nC: number;
}

/**
 * Powers of G, ħ and c such that multiplying a quantity of dimension `from`
 * by G^nG ħ^nH c^nC yields `to`. `nG` is zero unless `mode` is `geometrized`.
 * Current, temperature, amount and luminous intensity must already agree.
 * @internal
 */
export function naturalPowers(from: Dimension, to: Dimension, mode: Exclude<UnitMode, 'si'>): NaturalPowers | null {
  const dL = to.L - from.L;
  const dM = to.M - from.M;
  const dT = to.T - from.T;
  if (to.I - from.I !== 0 || to.Theta - from.Theta !== 0 || to.N - from.N !== 0 || to.J - from.J !== 0) {
    return null;
  }
  if ((dL + dT - dM) % 2 !== 0) return null;
  const nG = (dL + dT - dM) / 2;
  if (nG !== 0 && mode !== 'geometrized') return null;
  const nH = dM + nG;
  const nC = -dT - dM - 3 * nG;
  if (!Number.isInteger(nH) || !Number.isInteger(nC) || !Number.isInteger(nG)) return null;
  return { nG, nH, nC };
}

/** A one-line note of the powers that were set to 1, or null when none are needed. @internal */
export function naturalNote(powers: NaturalPowers, mode: Exclude<UnitMode, 'si'>): string | null {
  if (powers.nG === 0 && powers.nH === 0 && powers.nC === 0) return null;
  const bits: string[] = [];
  if (powers.nC !== 0) bits.push(`c^${powers.nC}`);
  if (powers.nH !== 0) bits.push(`ħ^${powers.nH}`);
  if (powers.nG !== 0) bits.push(`G^${powers.nG}`);
  const flag = mode === 'geometrized' ? '--geometrized (G = ħ = c = 1)' : '--natural (ħ = c = 1)';
  return `${flag}: the dimensions agree after multiplying by ${bits.join(' ')}, with those constants set to 1`;
}
