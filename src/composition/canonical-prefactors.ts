/**
 * Sourced prefactors of canonical equations, projected from the entries.
 *
 * CE-pendulum-period is a monomial and CE-kinetic-energy's AST is `m·v²`, so a
 * user formula wrong by 2π or ½ could not be caught (persona findings L2, L7).
 * Each entry that records only dimensionally, or only up to a constant, states
 * its exact prefactor as `prefactor` with a verbatim quote and a revision-pinned
 * locator; a test holds that neither its AST nor its monomial carries a constant
 * of its own. The arrays and functions here are projections of those fields,
 * kept for callers; the entry owns the fact.
 *
 * A prefactor that depends on a dimensionless group the entry's dimensional
 * record does not carry (CE-sound-speed's √γ) is not a constant: it is the
 * entry's `groupPrefactor`, and `canonicalPrefactor` does not return it. Only
 * a caller that can bind the group uses `canonicalGroupPrefactor`.
 *
 * @module composition/canonical-prefactors
 */

import { CANONICAL_EQUATIONS } from '../canonical/registry.js';

/** One sourced prefactor, as a row keyed by the entry id. @internal */
export interface CanonicalPrefactor {
  /** A `CanonicalEquation.id`. */
  readonly id: string;
  /** The exact dimensionless factor in front of the entry's AST or monomial. */
  readonly prefactor: number;
  /** Verbatim source text the factor is read from. */
  readonly quote: string;
  /** Where the quote is: page, revision id and wikitext line. */
  readonly locator: string;
}

/** The sourced prefactors, one row per entry that records one. @internal */
export const CANONICAL_PREFACTORS: readonly CanonicalPrefactor[] = CANONICAL_EQUATIONS.flatMap((e) =>
  e.prefactor === undefined
    ? []
    : [{ id: e.id, prefactor: e.prefactor.value, quote: e.prefactor.quote, locator: e.prefactor.locator }],
);

const PREFACTOR_BY_ID = new Map(CANONICAL_PREFACTORS.map((p) => [p.id, p.prefactor]));

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
