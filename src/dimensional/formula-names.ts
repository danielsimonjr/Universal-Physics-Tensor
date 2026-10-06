/**
 * Names a formula may use that are not leaves of {@link CONSTANTS}.
 *
 * Spreading these into `CONSTANTS` would bake them into the canonical graph
 * (`CANONICAL_CONSTANTS` spreads that table). They are an overlay for
 * dimensional assignment and for `upt eval` only.
 *
 * @module dimensional/formula-names
 */

import type { Dimension } from './types.js';
import { CHARGE, DIMENSIONLESS, LENGTH, MASS, TEMPERATURE } from './types.js';
import {
  C_SI,
  E_SI,
  FARADAY_SI,
  LANE_EMDEN_OMEGA3,
  M_E_SI,
  M_PROTON_SI,
  N_A_SI,
  THOMSON_CROSS_SECTION_SI,
} from '../core/constants.js';
import { quantityRecord, synonymGroupsFromRegistry } from './quantity-registry.js';

const PERMITTIVITY: Dimension = { L: -3, M: -1, T: 4, I: 2, Theta: 0, N: 0, J: 0 };
/** μ₀ = 1/(ε₀ c²), [M L T⁻² I⁻²]. */
const PERMEABILITY: Dimension = { L: 1, M: 1, T: -2, I: -2, Theta: 0, N: 0, J: 0 };
/** N_A — [N⁻¹]. */
const PER_AMOUNT: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: -1, J: 0 };
/** Faraday constant — charge per amount, [T I N⁻¹]. */
const FARADAY: Dimension = { L: 0, M: 0, T: 1, I: 1, Theta: 0, N: -1, J: 0 };
/** Thomson cross-section — area. */
const AREA: Dimension = { L: 2, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };

/** Vacuum permittivity, the same CODATA value `CONSTANTS.epsilon_0` holds. */
export const EPS0_SI = 8.8541878128e-12;
/** Vacuum permeability from ε₀ and the exact c. */
export const MU0_SI = 1 / (EPS0_SI * C_SI * C_SI);

/** One formula-only name. @internal */
export interface FormulaName {
  readonly name: string;
  readonly dim: Dimension;
  readonly value: number;
}

/**
 * Overlay names. `eps0` is rewritten to the constant `epsilon_0` before parse,
 * so it is not listed here. `curvature_k` and `scale_factor` are the Friedmann
 * curvature extension (the frozen `CE-friedmann` entry is the flat term).
 * @internal
 */
export const FORMULA_NAMED: readonly FormulaName[] = [
  { name: 'm_e', dim: MASS, value: M_E_SI },
  { name: 'electron_mass', dim: MASS, value: M_E_SI },
  { name: 'e_charge', dim: CHARGE, value: E_SI },
  { name: 'mu_0', dim: PERMEABILITY, value: MU0_SI },
  { name: 'm_p', dim: MASS, value: M_PROTON_SI },
  { name: 'm_proton', dim: MASS, value: M_PROTON_SI },
  { name: 'N_A', dim: PER_AMOUNT, value: N_A_SI },
  { name: 'F', dim: FARADAY, value: FARADAY_SI },
  { name: 'curvature_k', dim: DIMENSIONLESS, value: 0 },
  { name: 'scale_factor', dim: LENGTH, value: 1 },
  { name: 'sigma_T', dim: AREA, value: THOMSON_CROSS_SECTION_SI },
  { name: 'lane_emden_omega_3', dim: DIMENSIONLESS, value: LANE_EMDEN_OMEGA3 },
];

/** Name → dimension for the formula overlay. Does not override a catalog entry. @internal */
export function formulaNameDimensions(): ReadonlyMap<string, Dimension> {
  return new Map(FORMULA_NAMED.map((n) => [n.name, n.dim]));
}

/** A short symbol is this quantity only when it carries this dimension. */
export interface DimensionRename {
  readonly symbol: string;
  readonly dimension: Dimension;
  readonly name: string;
}

/**
 * Structural-hash spellings. A time coordinate named `T` is not temperature.
 * The name table includes this array. It is defined here so the canonical
 * normal form can read it without importing composition.
 */
export const DIMENSION_RENAMES: readonly DimensionRename[] = [
  { symbol: 'T', dimension: TEMPERATURE, name: 'temperature' },
  { symbol: 'M', dimension: MASS, name: 'mass' },
  { symbol: 'm_1', dimension: MASS, name: 'mass' },
  { symbol: 'm_2', dimension: MASS, name: 'secondary-mass' },
];

/**
 * One quantity, under every spelling a caller may type.
 *
 * A group is not a pair of hubs. `T` and `temp` are the same temperature
 * whether or not the word `temperature` is also present. `Th_K` and `Tc_K`
 * are two temperatures and are not in the temperature group. `k_B` and
 * `boltzmann-constant` are one scale. `specific-heat` and
 * `specific-heat-capacity` are one quantity. This array is
 * the only spelling list: the name table holds it by reference, and a
 * temperature binding asks {@link isTemperatureName}.
 *
 * A dimension rename is a different fact. It applies only when the symbol
 * carries that dimension, so a time coordinate named `T` stays `T`.
 */
/** Synonym groups projected from the quantity registry's aliases. */
export const SYNONYM_GROUPS: readonly (readonly string[])[] = synonymGroupsFromRegistry();

const foldName = (s: string): string => s.replace(/_/g, '-');

/** The group `name` belongs to, comparing `_` and `-` as the same character. */
export function synonymGroup(name: string): readonly string[] | undefined {
  const folded = foldName(name);
  return SYNONYM_GROUPS.find((group) => group.some((member) => member === name || foldName(member) === folded));
}

/**
 * True when `name` is a spelling of the temperature quantity.
 * A declared kelvin unit is a separate fact the binding reader already has.
 */
export function isTemperatureName(name: string): boolean {
  const group = synonymGroup(name);
  return group !== undefined && group.includes('temperature');
}

/**
 * Whether an affine temperature on this quantity is an interval or a point.
 *
 * The registry declares `kind`. An interval is a difference. A name the
 * registry does not declare is an absolute point. The spelling of the name
 * is not the role.
 */
export function temperatureQuantityRole(name: string): 'absolute' | 'difference' {
  return quantityRecord(name)?.kind === 'interval' ? 'difference' : 'absolute';
}

/**
 * Thrown when one quantity is bound under two spellings and the numbers differ.
 * The formula is not run. The message names both spellings.
 */
export class SynonymDisagreementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SynonymDisagreementError';
  }
}

/** Spellings of one group that `values` actually binds. */
function presentSpellings(group: readonly string[], values: Readonly<Record<string, number>>): string[] {
  return Object.keys(values).filter((key) => group.some((member) => member === key || foldName(member) === foldName(key)));
}

/**
 * Refuse two spellings of one quantity that carry different numbers.
 * The message names the keys the caller typed.
 */
export function assertSynonymAgreement(values: Readonly<Record<string, number>>): void {
  for (const group of SYNONYM_GROUPS) {
    const present = presentSpellings(group, values);
    if (present.length < 2) continue;
    const first = values[present[0]!]!;
    if (present.some((key) => values[key] !== first)) {
      const shown = present.map((key) => `${key}=${values[key]}`).join(', ');
      throw new SynonymDisagreementError(
        `${present.join(' and ')} are one quantity and disagree (${shown})`,
      );
    }
  }
}

/**
 * Copy an agreed value onto every spelling in its group.
 * A formula that names `T` and a formula that names `temperature` then read one binding.
 */
export function expandSynonymValues<T extends Record<string, number>>(values: T): T {
  assertSynonymAgreement(values);
  const out: Record<string, number> = { ...values };
  for (const group of SYNONYM_GROUPS) {
    const present = presentSpellings(group, values);
    if (present.length === 0) continue;
    const value = values[present[0]!]!;
    for (const member of group) {
      if (!Object.hasOwn(out, member)) out[member] = value;
    }
  }
  return out as T;
}

/**
 * The catalog or parameter name `name` means.
 *
 * A literal name wins, then an `_`/`-` swap, then an edge alias whose target
 * is in `catalogNames`, then the member of {@link SYNONYM_GROUPS} that the
 * catalog holds. `null` when none of those is in the catalog. `T` is
 * temperature when that name is in the catalog; the pendulum period is named
 * `period`, not `T`.
 *
 * @public
 */
export function resolveQuantityName(
  name: string,
  catalogNames: ReadonlySet<string>,
  edgeAliases?: ReadonlyMap<string, string>,
): string | null {
  if (catalogNames.has(name)) return name;
  const underToHyphen = name.replace(/_/g, '-');
  if (underToHyphen !== name && catalogNames.has(underToHyphen)) return underToHyphen;
  const hyphenToUnder = name.replace(/-/g, '_');
  if (hyphenToUnder !== name && catalogNames.has(hyphenToUnder)) return hyphenToUnder;
  if (edgeAliases !== undefined) {
    const alias = edgeAliases.get(name) ?? edgeAliases.get(underToHyphen) ?? edgeAliases.get(hyphenToUnder);
    if (alias !== undefined && catalogNames.has(alias)) return alias;
  }
  const group = synonymGroup(name);
  if (group !== undefined) {
    for (const member of group) {
      if (catalogNames.has(member)) return member;
      const folded = foldName(member);
      if (folded !== member && catalogNames.has(folded)) return folded;
    }
  }
  return null;
}
