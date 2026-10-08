/**
 * The constant registry: one row per physical constant a formula may name.
 *
 * A row holds the formula name, its other exact-case spellings, the SI value
 * (imported from `core/constants.js`, the one owner of every value), the SI
 * unit in `parseUnit` syntax, the meaning and the source. The dimension is
 * derived from the unit once, here; no second table states it. Every other
 * constant table in the library ({@link CONSTANTS}, `FORMULA_NAMED`,
 * `CONSTANT_SPELLINGS`, {@link CONSTANT_PROVENANCE}, `CANONICAL_CONSTANTS`,
 * the `upt eval` scope, the binding scope, the gradient constants) is a
 * projection of this array, so a spelling, a value and a dimension cannot
 * disagree between two files. A constant that is also a quantity names its
 * `data/quantities.json` row in `quantity`; the quantity registry derives that
 * row's aliases from here, so the file states no constant spelling.
 *
 * `canonical` marks a universal constant a canonical equation's `governing`
 * list may bake as a leaf. A row that is an overlay for `upt eval` and the
 * dimensional assignment only (`m_p`, `N_A`, the GRW parameters) is not
 * canonical, so the canonical graph does not bake it.
 *
 * Numeric-literal leaves (`'2'`, `'3'`) are NOT registered — `evalExpr`
 * resolves them via `Number(name)` and they are implicitly dimensionless.
 * Non-base-10 tokens (`'8pi'`, `'4pi'`, `'ln2'`) MUST be here (`Number('8pi')`
 * is `NaN`).
 *
 * INTERNAL — not on the public surface.
 *
 * @module dimensional/symbolic-constants
 */

import type { Dimension } from './types.js';
import { parseUnit } from './units.js';
import {
  B_WIEN_SI,
  C_SI,
  E_SI,
  EPS0_SI,
  FARADAY_SI,
  G_SI,
  GM_SUN_SI,
  H_SI,
  HBAR_CODATA_DISPLAY,
  HBAR_SI,
  K_B_SI,
  LANE_EMDEN_OMEGA3,
  M_E_SI,
  M_PROTON_SI,
  M_SUN_IAU_SI,
  M_SUN_SI,
  M_U_SI,
  MU0_SI,
  N_A_SI,
  SIGMA_SB_SI,
  THOMSON_CROSS_SECTION_SI,
} from '../core/constants.js';

/** One registered constant. @internal */
export interface ConstantRecord {
  /** The formula name; the first spelling, and the key of every projection. */
  readonly name: string;
  /** Other exact-case spellings a caller may type. */
  readonly spellings: readonly string[];
  readonly value: number;
  /** The SI unit, in the syntax `parseUnit` reads. The dimension is derived from it. */
  readonly unit: string;
  readonly dim: Dimension;
  readonly meaning: string;
  readonly source: string;
  /** A universal constant a canonical `governing` list may bake. */
  readonly canonical: boolean;
  /** A caveat printed wherever the constant is used (`upt eval`, a relation that names it). */
  readonly note?: string;
  /** The `@danielsimonjr/mathts-functions` export that states the same constant (CODATA 2022 there), when one exists. The second method. */
  readonly mathts?: string;
  /** The two libraries agree to the last bit: exact in the 2019 SI, or a product of exact constants. */
  readonly exact?: true;
  /**
   * The `data/quantities.json` id this constant is also a quantity of. The
   * quantity registry takes the constant's spellings as that row's aliases;
   * the file does not repeat them, so a spelling has one owner.
   */
  readonly quantity?: string;
}

type RowInput = Omit<ConstantRecord, 'dim' | 'spellings' | 'canonical' | 'note' | 'mathts' | 'exact' | 'quantity'> & {
  readonly quantity?: string;
  readonly note?: string;
  readonly mathts?: string;
  readonly exact?: true;
  readonly spellings?: readonly string[];
  readonly canonical?: boolean;
};

const row = (input: RowInput): ConstantRecord => ({
  ...input,
  spellings: input.spellings ?? [],
  canonical: input.canonical ?? false,
  dim: parseUnit(input.unit).dim,
});

const OWNER = 'core/constants.ts';

/** Every registered constant. Order is the order the tables print. @internal */
export const CONSTANT_REGISTRY: readonly ConstantRecord[] = [
  // ── universal constants a canonical equation may bake ──────────────────
  row({ name: 'hbar', spellings: ['ℏ'], value: HBAR_SI, unit: 'J*s', canonical: true, mathts: 'reducedPlanckConstant', exact: true,
    meaning: 'reduced Planck constant h/(2π)', source: `exact H_SI/(2π) (${OWNER} HBAR_SI)`,
    note:
      `hbar is HBAR_SI = H_SI/(2π), the exact reduced Planck constant. The CODATA display ${HBAR_CODATA_DISPLAY} ` +
      `is that quotient truncated (relative difference ${(Math.abs(HBAR_CODATA_DISPLAY - HBAR_SI) / HBAR_SI).toExponential(3)}).` }),
  row({ name: 'h', quantity: 'planck-constant', value: H_SI, unit: 'J*s', canonical: true, mathts: 'planckConstant', exact: true,
    meaning: 'Planck constant', source: `exact SI, 2019 redefinition (${OWNER} H_SI)` }),
  row({ name: 'c', value: C_SI, unit: 'm/s', canonical: true, mathts: 'speedOfLight', exact: true,
    meaning: 'speed of light in vacuum', source: `exact SI (${OWNER} C_SI)` }),
  row({ name: 'G', value: G_SI, unit: 'm^3/(kg*s^2)', canonical: true, mathts: 'gravitationConstant',
    meaning: 'Newtonian gravitational constant', source: `CODATA 2018 (${OWNER} G_SI)` }),
  row({ name: 'k_B', spellings: ['kB', 'boltzmann'], quantity: 'boltzmann-constant', value: K_B_SI, unit: 'J/K', canonical: true, mathts: 'boltzmann', exact: true,
    meaning: 'Boltzmann constant', source: `exact SI, 2019 redefinition (${OWNER} K_B_SI)` }),
  row({ name: 'ln2', value: Math.LN2, unit: '1', canonical: true,
    meaning: 'natural logarithm of 2', source: 'mathematical constant (Math.LN2)' }),
  row({ name: '8pi', value: 8 * Math.PI, unit: '1', canonical: true,
    meaning: '8π', source: 'mathematical constant (8·Math.PI)' }),
  row({ name: '4pi', value: 4 * Math.PI, unit: '1', canonical: true,
    meaning: '4π', source: 'mathematical constant (4·Math.PI)' }),
  row({ name: '2pi', value: 2 * Math.PI, unit: '1', canonical: true,
    meaning: '2π', source: 'mathematical constant (2·Math.PI)' }),
  // ISO 80000 / CODATA: a bare e is the elementary charge. Eccentricity is
  // one_minus_e_sq. The canonical dimension guard still refuses to bake a
  // dimensionless governing name e.
  row({ name: 'e', spellings: ['e_charge'], value: E_SI, unit: 'C', canonical: true, mathts: 'elementaryCharge', exact: true,
    meaning: 'elementary charge', source: `exact SI, 2019 redefinition (${OWNER} E_SI)` }),
  row({ name: 'epsilon_0', spellings: ['epsilon0', 'eps0'], value: EPS0_SI, unit: 'F/m', canonical: true,
    meaning: 'vacuum permittivity', source: `CODATA 2018 (${OWNER} EPS0_SI)` }),
  row({ name: 'sigma_sb', spellings: ['stefan-boltzmann-constant'], value: SIGMA_SB_SI, unit: 'W/(m^2*K^4)', canonical: true, mathts: 'stefanBoltzmann',
    meaning: 'Stefan–Boltzmann constant', source: `CODATA 2018 (${OWNER} SIGMA_SB_SI)` }),
  row({ name: 'b', spellings: ['wien-constant'], value: B_WIEN_SI, unit: 'm*K', canonical: true, mathts: 'wienDisplacement',
    meaning: 'Wien displacement constant', source: `CODATA 2018 (${OWNER} B_WIEN_SI)` }),
  // IAU 2015 nominal solar parameter. M_sun in eval stays the rounded kilogram M_SUN_SI.
  row({ name: 'GM_sun', value: GM_SUN_SI, unit: 'm^3/s^2', canonical: true,
    meaning: 'IAU nominal solar gravitational parameter (GM)☉', source: `IAU 2015 Resolution B3 (${OWNER} GM_SUN_SI)` }),
  row({ name: 'Msun_iau', value: M_SUN_IAU_SI, unit: 'kg', canonical: true,
    meaning: 'IAU solar mass (GM)☉/G, the mass that reproduces GM_sun with G_SI', source: `GM_SUN_SI/G_SI (${OWNER} M_SUN_IAU_SI)` }),
  row({ name: 'm_u', value: M_U_SI, unit: 'kg', canonical: true, mathts: 'atomicMass',
    meaning: 'unified atomic mass unit (atomic mass constant)', source: `CODATA 2018 (${OWNER} M_U_SI)` }),
  row({ name: 'm_e', spellings: ['electron_mass'], value: M_E_SI, unit: 'kg', canonical: true, mathts: 'electronMass',
    meaning: 'electron mass', source: `CODATA 2018 (${OWNER} M_E_SI)` }),
  // ── overlay names for `upt eval` and the dimensional assignment only ────
  row({ name: 'mu_0', spellings: ['mu0'], value: MU0_SI, unit: 'H/m', mathts: 'magneticConstant',
    meaning: 'vacuum permeability 1/(ε₀ c²)', source: `1/(EPS0_SI·C_SI²) (${OWNER} MU0_SI)` }),
  row({ name: 'm_p', spellings: ['m_proton'], value: M_PROTON_SI, unit: 'kg', mathts: 'protonMass',
    meaning: 'proton mass', source: `CODATA 2018 (${OWNER} M_PROTON_SI)` }),
  row({ name: 'N_A', value: N_A_SI, unit: 'mol^-1', mathts: 'avogadro', exact: true,
    meaning: 'Avogadro constant', source: `exact SI, 2019 redefinition (${OWNER} N_A_SI)` }),
  row({ name: 'F', value: FARADAY_SI, unit: 'C/mol', mathts: 'faraday', exact: true,
    meaning: 'Faraday constant N_A e', source: `N_A_SI·E_SI (${OWNER} FARADAY_SI)` }),
  // R = N_A k_B, the molar gas constant the thermochemical records state in their titles.
  row({ name: 'R', value: N_A_SI * K_B_SI, unit: 'J/(mol*K)', mathts: 'gasConstant', exact: true,
    meaning: 'molar gas constant N_A k_B', source: `N_A_SI·K_B_SI (${OWNER})` }),
  row({ name: 'M_sun', value: M_SUN_SI, unit: 'kg',
    meaning: 'solar mass, the repo-conventional kilogram value', source: `${OWNER} M_SUN_SI` }),
  // `curvature_k` and `scale_factor` are the Friedmann curvature extension
  // (the frozen `CE-friedmann` entry is the flat term).
  row({ name: 'curvature_k', value: 0, unit: '1',
    meaning: 'Friedmann curvature index, flat by default', source: 'this registry (flat default 0)' }),
  row({ name: 'scale_factor', value: 1, unit: 'm',
    meaning: 'Friedmann scale factor, unit by default', source: 'this registry (default 1)' }),
  row({ name: 'sigma_T', value: THOMSON_CROSS_SECTION_SI, unit: 'm^2', mathts: 'thomsonCrossSection',
    meaning: 'Thomson cross section', source: `CODATA 2018 (${OWNER} THOMSON_CROSS_SECTION_SI)` }),
  row({ name: 'lane_emden_omega_3', quantity: 'lane-emden-omega-3', value: LANE_EMDEN_OMEGA3, unit: '1',
    meaning: 'Lane–Emden n = 3 dimensionless radius', source: `${OWNER} LANE_EMDEN_OMEGA3` }),
  // GRW mass amplification: λ = λ₀ · (m / m₀), with λ₀ a rate and m₀ a mass.
  // The two numbers are the catalog expression's, so the rate is unchanged.
  row({ name: 'grw_lambda0', value: 1e-16, unit: 'Hz',
    meaning: 'GRW localization rate λ₀', source: 'catalog expression (Ghirardi–Rimini–Weber 1986)' }),
  row({ name: 'grw_m0', value: 1.67e-27, unit: 'kg',
    meaning: 'GRW reference mass m₀ (a nucleon)', source: 'catalog expression (Ghirardi–Rimini–Weber 1986)' }),
];

const BY_SPELLING = new Map<string, ConstantRecord>();
for (const record of CONSTANT_REGISTRY) {
  for (const spelling of [record.name, ...record.spellings]) {
    if (BY_SPELLING.has(spelling)) throw new Error(`constant registry: '${spelling}' is spelled twice`);
    BY_SPELLING.set(spelling, record);
  }
}

/** The registered constant `spelling` names, or undefined. @internal */
export function constantRecord(spelling: string): ConstantRecord | undefined {
  return BY_SPELLING.get(spelling);
}

/**
 * Relative tolerance within which a stated constant agrees with the registered
 * value. Textbook roundings such as `b = 2.9e-3` pass.
 * @internal
 */
const CONSTANT_AGREEMENT = 5e-3;

/** A stated value for a registered constant disagrees with the registry. The equations use the registered value. @internal */
export class ConstantDisagreementError extends Error {
  constructor(
    readonly key: string,
    readonly constant: string,
    readonly registered: number,
    readonly given: number,
  ) {
    super(
      `'${key}' is the registered constant ${constant} = ${registered}; ` +
        `${given} disagrees, and the equations use the registered value, so it cannot be rebound.`,
    );
    this.name = 'ConstantDisagreementError';
  }
}

/**
 * The registered constant `key` names when `value` agrees with it within
 * {@link CONSTANT_AGREEMENT}, or null when `key` names no constant. A value
 * that disagrees throws {@link ConstantDisagreementError}: a constant is not
 * a graph quantity, so a stated value is checked, never bound.
 * @internal
 */
export function constantAgreement(key: string, value: number): string | null {
  const record = BY_SPELLING.get(key);
  if (record === undefined) return null;
  if (Math.abs(value - record.value) > CONSTANT_AGREEMENT * Math.abs(record.value)) {
    throw new ConstantDisagreementError(key, record.name, record.value, value);
  }
  return record.name;
}

/** The notes of the registered constants among `names`, each once, in registry order. @internal */
export function constantNotes(names: Iterable<string>): string[] {
  const seen = new Set<ConstantRecord>();
  for (const name of names) {
    const record = BY_SPELLING.get(name);
    if (record?.note !== undefined) seen.add(record);
  }
  return CONSTANT_REGISTRY.filter((record) => seen.has(record)).map((record) => record.note!);
}

/** Every spelling → SI value, for a numeric scope. `pi` and `tau` are added. @internal */
export function constantScope(): Record<string, number> {
  const scope: Record<string, number> = { pi: Math.PI, tau: 2 * Math.PI };
  for (const [spelling, record] of BY_SPELLING) scope[spelling] = record.value;
  return scope;
}

/** A registered constant leaf: SI value + SI dimension. @internal */
export interface NamedConstantValue {
  readonly value: number;
  readonly dim: Dimension;
}

/**
 * Constant leaves a `symbolic` ExprNode may reference, keyed by formula name:
 * the canonical rows of {@link CONSTANT_REGISTRY}. `ln2`/`8pi`/`4pi`
 * reproduce the evaluators' `Math.LN2` / `8*Math.PI` / `4*Math.PI` exactly
 * (same IEEE-754 primitives).
 */
export const CONSTANTS: Readonly<Record<string, NamedConstantValue>> = Object.fromEntries(
  CONSTANT_REGISTRY.filter((record) => record.canonical).map((record) => [
    record.name,
    { value: record.value, dim: record.dim },
  ]),
);

/** What a registered constant is, its SI unit, and where its value comes from (audit I10). @internal */
export interface ConstantProvenance {
  readonly meaning: string;
  /** The SI unit, in the syntax `parseUnit` reads; the registered dimension is derived from it. */
  readonly unit: string;
  readonly source: string;
}

/** One row per {@link CONSTANT_REGISTRY} name. @internal */
export const CONSTANT_PROVENANCE: Readonly<Record<string, ConstantProvenance>> = Object.fromEntries(
  CONSTANT_REGISTRY.map((record) => [
    record.name,
    { meaning: record.meaning, unit: record.unit, source: record.source },
  ]),
);

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
