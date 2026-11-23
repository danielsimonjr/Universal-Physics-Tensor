/**
 * The canonical-equation registry — the queryable index of the L-layer.
 * Seeded incrementally by `entries/*` modules (Tasks 2,4,5,9); this file owns
 * the assembled array, the id map, and the accessors.
 *
 * @module canonical/registry
 */
import type { CanonicalEquation, CanonicalDomain } from './canonical-equation.js';
import { BRIDGE_EQUATIONS } from '../bridges/index.js';
import { DIMENSIONAL_CLASSICS } from './entries/dimensional-classics.js';
import { RELATIVITY } from './entries/relativity.js';
import { MECHANICS } from './entries/mechanics.js';
import { ELECTROMAGNETISM } from './entries/electromagnetism.js';
import { FLUIDS_WAVES } from './entries/fluids-waves.js';
import { THERMO_NUCLEAR_COSMO } from './entries/thermo-nuclear-cosmo.js';
import { ATOMIC } from './entries/atomic.js';
import { CONDENSED_MATTER } from './entries/condensed-matter.js';
import { STATISTICAL_MECHANICS } from './entries/statistical-mechanics.js';
import { TEXTBOOK_COVERAGE } from './entries/textbook-coverage.js';
import { NONMONOMIAL } from './entries/nonmonomial.js';

/**
 * Every canonical equation in the registry. The L1 entries are grouped by
 * physics domain (relativity / EM / thermo / atomic / …); the former
 * `l1-gravity-thermo` and `l1-quantum-em` batch files were folded into these
 * domain-named modules in the 2026-06-22 god-file split.
 */
export const CANONICAL_EQUATIONS: readonly CanonicalEquation[] = [
  ...DIMENSIONAL_CLASSICS,
  ...RELATIVITY,
  ...MECHANICS,
  ...ELECTROMAGNETISM,
  ...FLUIDS_WAVES,
  ...THERMO_NUCLEAR_COSMO,
  ...ATOMIC,
  ...CONDENSED_MATTER,
  ...STATISTICAL_MECHANICS,
  ...NONMONOMIAL,
  ...TEXTBOOK_COVERAGE,
];

/** Id → entry. */
export const CANONICAL_BY_ID: Readonly<Record<string, CanonicalEquation>> =
  Object.fromEntries(CANONICAL_EQUATIONS.map((e) => [e.id, e]));

/** The entry with id `id`, or `undefined`. */
export function canonicalById(id: string): CanonicalEquation | undefined {
  return CANONICAL_BY_ID[id];
}

/** Every entry in `domain`. */
export function canonicalByDomain(
  domain: CanonicalDomain,
): readonly CanonicalEquation[] {
  return CANONICAL_EQUATIONS.filter((e) => e.domain === domain);
}

/**
 * Canonical equations whose `dimensional.target.name` is `name`. Usually 0 or 1;
 * a length > 1 means the target quantity is shared (the caller must treat that as
 * ambiguous). Used by the identity-consequence surfacer to recover the source
 * equation behind a discovery candidate's endpoint.
 */
export function canonicalByTarget(
  name: string,
): readonly CanonicalEquation[] {
  return CANONICAL_EQUATIONS.filter((e) => e.dimensional.target.name === name);
}

/** Catalog bridge ids (string form) that at least one canonical entry names as
 *  a `partnerBridges` / `restatesBridge` correspondence. */
export function partneredBridgeIds(): Set<string> {
  const ids = new Set<string>();
  for (const e of CANONICAL_EQUATIONS) {
    for (const b of e.partnerBridges) ids.add(b);
    if (e.restatesBridge) ids.add(e.restatesBridge);
  }
  return ids;
}

/**
 * Catalog bridges with NO canonical correspondence partner yet — the explicit,
 * logged coverage gap (review finding F2). Sorted by numeric id. The count is
 * pinned by a test so shrinking it (adding a partner) is a deliberate act.
 */
export function bridgesWithoutCanonicalPartner(): string[] {
  const partnered = partneredBridgeIds();
  return BRIDGE_EQUATIONS.map((b) => String(b.id))
    .filter((id) => !partnered.has(id))
    .sort((a, b) => Number(a) - Number(b));
}
