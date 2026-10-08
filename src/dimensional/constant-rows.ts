/**
 * The constant registry's rows as written: name, spellings, SI value, SI unit
 * text, meaning, source and flags, one row per physical constant a formula or
 * the unit table may name.
 *
 * `symbolic-constants.ts` derives each row's dimension from its unit with
 * `parseUnit` and owns every projection. The rows live here, apart from that
 * derivation, because the unit table reads constants too: `data/units.json`
 * names `c`, `e`, `m_u`, `M_sun`, `Msun_iau` and `ln2` by these spellings, and
 * the unit parser cannot import a module that imports the unit parser. This
 * module imports only `core/constants.ts`, the owner of every value, so the
 * unit loader and the registry read one set of spellings with no cycle.
 *
 * INTERNAL — not on the public surface.
 *
 * @module dimensional/constant-rows
 */

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

/** One registered constant as written: everything but the dimension, which `symbolic-constants.ts` derives from `unit`. @internal */
export interface ConstantRow {
  /** The formula name; the first spelling, and the key of every projection. */
  readonly name: string;
  /** Other exact-case spellings a caller may type. */
  readonly spellings: readonly string[];
  readonly value: number;
  /** The SI unit, in the syntax `parseUnit` reads. The dimension is derived from it. */
  readonly unit: string;
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
  /**
   * A mathematical constant no rational states (ln 2, 2π, 4π, 8π). An exact
   * reader (`data/units.json`'s scale expressions) carries `value` as the
   * irrational factor instead of reading its decimal as a rational.
   */
  readonly irrational?: true;
}

type RowInput = Omit<ConstantRow, 'spellings' | 'canonical' | 'note' | 'mathts' | 'exact' | 'quantity' | 'irrational'> & {
  readonly quantity?: string;
  readonly irrational?: true;
  readonly note?: string;
  readonly mathts?: string;
  readonly exact?: true;
  readonly spellings?: readonly string[];
  readonly canonical?: boolean;
};

const row = (input: RowInput): ConstantRow => ({
  ...input,
  spellings: input.spellings ?? [],
  canonical: input.canonical ?? false,
});

const OWNER = 'core/constants.ts';

/** Every registered constant as written. Order is the order the tables print. @internal */
export const CONSTANT_ROWS: readonly ConstantRow[] = [
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
  row({ name: 'ln2', value: Math.LN2, unit: '1', canonical: true, irrational: true,
    meaning: 'natural logarithm of 2', source: 'mathematical constant (Math.LN2)' }),
  row({ name: '8pi', value: 8 * Math.PI, unit: '1', canonical: true, irrational: true,
    meaning: '8π', source: 'mathematical constant (8·Math.PI)' }),
  row({ name: '4pi', value: 4 * Math.PI, unit: '1', canonical: true, irrational: true,
    meaning: '4π', source: 'mathematical constant (4·Math.PI)' }),
  row({ name: '2pi', value: 2 * Math.PI, unit: '1', canonical: true, irrational: true,
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

const BY_SPELLING = new Map<string, ConstantRow>();
for (const constant of CONSTANT_ROWS) {
  for (const spelling of [constant.name, ...constant.spellings]) {
    if (BY_SPELLING.has(spelling)) throw new Error(`constant registry: '${spelling}' is spelled twice`);
    BY_SPELLING.set(spelling, constant);
  }
}

/** The registered constant row `spelling` names, or undefined. @internal */
export function constantRow(spelling: string): ConstantRow | undefined {
  return BY_SPELLING.get(spelling);
}
