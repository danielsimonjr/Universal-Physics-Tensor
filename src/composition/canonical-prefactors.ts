/**
 * Sourced prefactors of canonical equations, projected from the entries.
 *
 * CE-pendulum-period is a monomial and CE-kinetic-energy's AST is `m·v²`, so a
 * user formula wrong by 2π or ½ could not be caught (persona findings L2, L7).
 * Each entry that records only dimensionally, or only up to a constant, states
 * its exact prefactor as `prefactor` with a verbatim quote and a revision-pinned
 * locator; a test holds that neither its AST nor its monomial carries a constant
 * of its own. The lookups here read those fields; the entry owns the fact, and
 * a caller that wants the quote or the locator reads the entry.
 *
 * A prefactor that depends on a dimensionless group the entry's dimensional
 * record does not carry (CE-sound-speed's √γ) is not a constant: it is the
 * entry's `groupPrefactor`, and `canonicalPrefactor` does not return it. Only
 * a caller that can bind the group uses `canonicalGroupPrefactor`.
 *
 * @module composition/canonical-prefactors
 */

import { CANONICAL_EQUATIONS } from '../canonical/registry.js';

/** Entry id → the exact factor in front of its AST or monomial, read from the entry's `prefactor`. */
const PREFACTOR_BY_ID: ReadonlyMap<string, number> = new Map(
  CANONICAL_EQUATIONS.flatMap((e) => (e.prefactor === undefined ? [] : [[e.id, e.prefactor.value] as const])),
);

/** The sourced prefactor of a canonical entry, or `undefined`. @internal */
export function canonicalPrefactor(id: string): number | undefined {
  return PREFACTOR_BY_ID.get(id);
}

/**
 * A sourced prefactor that is a power of a dimensionless group: the factor in
 * front of the entry's AST or monomial is `coefficient · group^exponent`. @internal
 */
export interface CanonicalGroupPrefactor {
  readonly id: string;
  /** The group as the entry's formula names it (`'gamma'` for γ). */
  readonly group: string;
  readonly coefficient: number;
  readonly exponent: number;
  readonly quote: string;
  readonly locator: string;
}

/** The sourced group prefactors, one row per entry that records one. @internal */
export const CANONICAL_GROUP_PREFACTORS: readonly CanonicalGroupPrefactor[] = CANONICAL_EQUATIONS.flatMap((e) =>
  e.groupPrefactor === undefined ? [] : [{ id: e.id, ...e.groupPrefactor }],
);

/** The prefactor of a group-dependent entry at a value of its group, or `undefined`. @internal */
export function canonicalGroupPrefactor(id: string, groupValue: number): number | undefined {
  const p = CANONICAL_GROUP_PREFACTORS.find((q) => q.id === id);
  return p === undefined ? undefined : p.coefficient * groupValue ** p.exponent;
}
