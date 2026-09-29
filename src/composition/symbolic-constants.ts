/**
 * Symbolic-composition constant registry (v0.12 symbolic composition).
 *
 * The physical constants and named numeric factors that a bridge's
 * `symbolic` ExprNode may reference as leaf symbols, with the SI value AND
 * the SI dimension. SI VALUES import from `core/constants.js` — the single
 * source the bridge evaluators also resolve to — so a symbolic form and its
 * numeric evaluator agree bit-for-bit (the drift guard binds this end-to-end;
 * Adam A-7 / Eve EVE-3).
 *
 * Numeric-literal leaves (`'2'`, `'3'`) are NOT registered here — `evalExpr`
 * resolves them via `Number(name)` and they are implicitly dimensionless.
 * Non-base-10 tokens (`'8pi'`, `'4pi'`, `'ln2'`) MUST be here (Adam A-1 —
 * `Number('8pi')` is `NaN`).
 *
 * INTERNAL — not on the public surface.
 *
 * @module composition/symbolic-constants
 */

import type { Dimension } from '../dimensional/types.js';
import {
  DIMENSIONLESS,
  VELOCITY,
  ACTION,
} from '../dimensional/types.js';
import { C_SI, G_SI, GM_SUN_SI, HBAR_SI, H_SI, K_B_SI, B_WIEN_SI } from '../core/constants.js';

const dim = (L = 0, M = 0, T = 0, Theta = 0): Dimension => ({
  L,
  M,
  T,
  I: 0,
  Theta,
  N: 0,
  J: 0,
});

/** Newton's constant G — [L³ M⁻¹ T⁻²]. */
const GRAV: Dimension = dim(3, -1, -2);
/** Boltzmann constant k_B — [L² M T⁻² Θ⁻¹] (energy / temperature). */
const BOLTZMANN: Dimension = dim(2, 1, -2, -1);
/** Vacuum permittivity ε₀ — [I² T⁴ M⁻¹ L⁻³] (F/m). Carries a current
 *  dimension, so it cannot use the (L,M,T,Θ) `dim` helper. */
const PERMITTIVITY: Dimension = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 };
/** Stefan–Boltzmann σ — [M T⁻³ Θ⁻⁴] (W m⁻² K⁻⁴). Derived:
 *  σ = 2π⁵k_B⁴ / (15 c² h³). */
const STEFAN_BOLTZMANN: Dimension = dim(0, 1, -3, -4);
/** Wien displacement constant b — [L·Θ] (m·K). */
const WIEN: Dimension = dim(1, 0, 0, 1);

/** A registered constant leaf: SI value + SI dimension. @internal */
interface NamedConstantValue {
  readonly value: number;
  readonly dim: Dimension;
}

/**
 * Constant leaves a `symbolic` ExprNode may reference. Keys are the leaf
 * symbol `name`s; values carry the SI magnitude and dimension. `ln2`/`8pi`/
 * `4pi` reproduce the evaluators' `Math.LN2` / `8*Math.PI` / `4*Math.PI`
 * exactly (same IEEE-754 primitives).
 */
export const CONSTANTS: Readonly<Record<string, NamedConstantValue>> = {
  hbar: { value: HBAR_SI, dim: ACTION },
  h: { value: H_SI, dim: ACTION },
  c: { value: C_SI, dim: VELOCITY },
  G: { value: G_SI, dim: GRAV },
  k_B: { value: K_B_SI, dim: BOLTZMANN },
  ln2: { value: Math.LN2, dim: DIMENSIONLESS },
  '8pi': { value: 8 * Math.PI, dim: DIMENSIONLESS },
  '4pi': { value: 4 * Math.PI, dim: DIMENSIONLESS },
  '2pi': { value: 2 * Math.PI, dim: DIMENSIONLESS },
  // Extension constants for the canonical-equation L1 entries (Coulomb, Bohr,
  // Stefan–Boltzmann). CODATA 2018 values.
  epsilon_0: { value: 8.8541878128e-12, dim: PERMITTIVITY },
  sigma_sb: { value: 5.670374419e-8, dim: STEFAN_BOLTZMANN },
  b: { value: B_WIEN_SI, dim: WIEN },
  // IAU 2015 nominal solar parameter. M_sun in eval stays the rounded kilogram M_SUN_SI.
  GM_sun: { value: GM_SUN_SI, dim: dim(3, 0, -2) },
  Msun_iau: { value: GM_SUN_SI / G_SI, dim: dim(0, 1, 0) },
};

/** What a registered constant is, its SI unit, and where its value comes from (audit I10). @internal */
export interface ConstantProvenance {
  readonly meaning: string;
  /** The SI unit, in the syntax `parseUnit` reads; a test checks it against the registered dimension. */
  readonly unit: string;
  readonly source: string;
}

/**
 * A spelled-out multiple of π written as one symbol (`pi`, `6pi`). `2pi`,
 * `4pi` and `8pi` are also registered in {@link CONSTANTS}; this covers the
 * multiples an encoder spelled out and did not register (`6pi` in
 * CE-perihelion-precession). The structural normal form already drops these.
 * The numeric evaluator has to resolve them too, or a comparison treats `6pi`
 * as a free symbol and never aligns the formula.
 * @internal
 */
export function piMultipleValue(name: string): number | undefined {
  const m = /^(\d*)pi$/.exec(name);
  if (m === null) return undefined;
  const n = m[1] === '' ? 1 : Number(m[1]);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n * Math.PI;
}

/** One row per {@link CONSTANTS} key; a test holds the two key sets equal. @internal */
export const CONSTANT_PROVENANCE: Readonly<Record<string, ConstantProvenance>> = {
  hbar: { meaning: 'reduced Planck constant h/(2π)', unit: 'J*s', source: 'exact H_SI/(2π) (core/constants.ts HBAR_SI)' },
  h: { meaning: 'Planck constant', unit: 'J*s', source: 'exact SI, 2019 redefinition (core/constants.ts H_SI)' },
  c: { meaning: 'speed of light in vacuum', unit: 'm/s', source: 'exact SI (core/constants.ts C_SI)' },
  G: { meaning: 'Newtonian gravitational constant', unit: 'm^3/(kg*s^2)', source: 'CODATA 2018 (core/constants.ts G_SI)' },
  k_B: { meaning: 'Boltzmann constant', unit: 'J/K', source: 'exact SI, 2019 redefinition (core/constants.ts K_B_SI)' },
  ln2: { meaning: 'natural logarithm of 2', unit: '1', source: 'mathematical constant (Math.LN2)' },
  '8pi': { meaning: '8π', unit: '1', source: 'mathematical constant (8·Math.PI)' },
  '4pi': { meaning: '4π', unit: '1', source: 'mathematical constant (4·Math.PI)' },
  '2pi': { meaning: '2π', unit: '1', source: 'mathematical constant (2·Math.PI)' },
  epsilon_0: { meaning: 'vacuum permittivity', unit: 'F/m', source: 'CODATA 2018 (this table)' },
  sigma_sb: { meaning: 'Stefan–Boltzmann constant', unit: 'W/(m^2*K^4)', source: 'CODATA 2018 (this table)' },
  b: { meaning: 'Wien displacement constant', unit: 'm*K', source: 'CODATA 2018 (core/constants.ts B_WIEN_SI)' },
  GM_sun: {
    meaning: 'IAU nominal solar gravitational parameter (GM)☉',
    unit: 'm^3/s^2',
    source: 'IAU 2015 Resolution B3 (core/constants.ts GM_SUN_SI)',
  },
  Msun_iau: {
    meaning: 'IAU solar mass (GM)☉/G, the mass that reproduces GM_sun with G_SI',
    unit: 'kg',
    source: 'GM_SUN_SI/G_SI (core/constants.ts)',
  },
};
