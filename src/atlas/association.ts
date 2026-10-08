/**
 * Atlas Phase 1 — the association registry.
 *
 * An `Association` records that two things SHARE something: a constant, a
 * symbol, a structure, or a line of historical influence. That is the whole of
 * its meaning. It asserts **no relation** between the two, makes **no
 * composite claim**, and is explicitly NOT a graph edge — design note §5: *"No
 * `Association` semantics beyond a registry of typed pairs — the registry is a
 * container in Sprint 1, and it makes no composite claims."*
 *
 * The distinction is the point. `CATALOG_GRAPH` edges are claims that one
 * quantity DETERMINES another. An association is the opposite epistemic act:
 * it is where the atlas writes down a resemblance it has already decided is
 * NOT a link, so the resemblance stops being re-surfaced as if it were fresh.
 * An association that also appeared as an edge would be a contradiction, and
 * `tests/atlas/association.test.ts` pins that it never does.
 *
 * **The seed is the `'decoy'` half of the adjudication ledger.** A `decoy`
 * verdict means a physicist looked at `a ≟ b` and found a coincidence with no
 * mechanism — precisely a shared appearance with no relation behind it. Every
 * `'decoy'` row in `ADJUDICATIONS` (`src/composition/adjudication.ts`) gets
 * one entry here, id-linked, with its `grounds` copied VERBATIM as the `note`.
 *
 * **No new physics is added by this module**, and two deliberate choices keep
 * it that way:
 *
 *   - `note` is the adjudicator's own prose, never a restatement. Verbatimness
 *     is pinned by test against the live ledger, so a re-worded ledger entry
 *     fails rather than silently diverging from its copy here.
 *   - `kind` is assigned MECHANICALLY, not per pair. Every seed is
 *     `'shared-structure'` because every one of them reached the ledger the
 *     same way: the identification funnel pairs quantities that share a
 *     dimensional signature. Choosing a different `kind` per row would be a
 *     fresh physics judgement about each pair, which is exactly the claim this
 *     registry exists not to make.
 *
 * **Why the seed is written out rather than derived from `ADJUDICATIONS` at
 * import time.** `src/composition/` may import atlas TYPES only, never the
 * barrel, because a value import in the other direction closes a cycle
 * `docs:deps` reports (`compose.ts` already imports `atlas/composition-table`).
 * An `atlas → composition/adjudication → discovery → …` value import risks the
 * same cycle from the other side. So this module stays a leaf, and the
 * drift protection moves into the test, which is free to import both.
 *
 * @module atlas/association
 */

/**
 * What two records share. Each value names an observable resemblance, not a
 * relation: none of them implies that either record determines, derives,
 * approximates or restricts the other.
 *
 * @internal
 */
export type AssociationKind =
  | 'shared-constant'
  | 'shared-symbol'
  | 'shared-structure'
  | 'historical-influence';

/**
 * One recorded resemblance between two named things.
 *
 * A container, deliberately. It has no `relation`, no `bound`, no `regime` and
 * no `evidence` — the fields that would let it make a claim are absent because
 * it makes none.
 *
 * @internal
 */
export interface Association {
  /**
   * Stable identity. For a seeded entry this is the `CatalogAdjudication.id`
   * it came from — `candidateId(a, b)`, the two names sorted and joined with
   * `~` — so the association and the verdict that produced it share a key.
   */
  readonly id: string;
  readonly kind: AssociationKind;
  /** The two names, in the order `id` encodes them (sorted, `~`-split). */
  readonly between: readonly [string, string];
  /** Why the resemblance is only a resemblance. Adjudicator's prose, verbatim. */
  readonly note: string;
  /** Repo-relative path of the record this note was copied from. */
  readonly citation: string;
}

/**
 * The seeded registry: one entry per `'decoy'` adjudication, in ledger order.
 *
 * Kept in step with `ADJUDICATIONS` by
 * `tests/atlas/association.test.ts`, which re-derives this array from the live
 * ledger and deep-equals it. Adding a `'decoy'` verdict without adding its
 * association here fails that test.
 *
 * @internal
 */
export const ASSOCIATIONS: readonly Association[] = [
  {
    id: 'erasure-energy~photon-energy',
    kind: 'shared-structure',
    between: ['erasure-energy', 'photon-energy'],
    note:
      "Dimensional coincidence; no mechanism. Landauer's k_B·T·ln2 is a statistical lower bound on heat dissipated to a reservoir; equating it to a single photon's hν has no universal mechanism — it rewrites thermal energy in frequency units.",
    citation: 'docs/research/proposed-equations-adjudication.md',
  },
  {
    id: 'dark-fermion-mass~erasure-energy',
    kind: 'shared-structure',
    between: ['dark-fermion-mass', 'erasure-energy'],
    note:
      'Dimensional coincidence; no mechanism. A speculative hidden-sector mass m = gv set equal to a context-dependent erasure energy — no model links a particle mass to an arbitrary processor\'s temperature.',
    citation: 'docs/research/proposed-equations-adjudication.md',
  },
  {
    id: 'dark-fermion-mass~rest-energy',
    kind: 'shared-structure',
    between: ['dark-fermion-mass', 'rest-energy'],
    note:
      'Trivial/definitional. m = vg/c² re-expresses the dark-fermion mass via E=mc² instead of via Landauer (cf. PE-2) — a definitional application, not a new bridge.',
    citation: 'docs/research/proposed-equations-adjudication.md',
  },
  {
    id: 'hubble-distance~peak-wavelength',
    kind: 'shared-structure',
    between: ['hubble-distance', 'peak-wavelength'],
    note:
      'Dimensional coincidence; no mechanism. A blackbody peak wavelength equated with the cosmological horizon — disparate domains, no mechanism; numerically off by ~10²⁹ for the CMB. The clearest "coincidence, not physics" case.',
    citation: 'docs/research/proposed-equations-adjudication.md',
  },
  {
    id: 'coarsening-length~quantum-correlation-length',
    kind: 'shared-structure',
    between: ['coarsening-length', 'quantum-correlation-length'],
    note:
      'Non-equilibrium vs equilibrium length; unanimous. A coarsening length is a non-equilibrium domain size formed by quenching through a critical point; the quantum correlation length ξ is an equilibrium static property at it. Different processes — not the same length.',
    citation: 'docs/research/orphan-connector-adjudication.md',
  },
  {
    id: 'effective-mass~tunneling-mass',
    kind: 'shared-structure',
    between: ['effective-mass', 'tunneling-mass'],
    note:
      'Different particles/Hamiltonians; unanimous. A proton\'s inertia in a specific biomolecular potential vs. an emergent electronic quasiparticle\'s effective mass in a strongly-correlated metal. Different particles, different Hamiltonians, unrelated scales.',
    citation: 'docs/research/orphan-connector-adjudication.md',
  },
  {
    id: 'decoherence-rate~mutation-rate',
    kind: 'shared-structure',
    between: ['decoherence-rate', 'mutation-rate'],
    note:
      'Same units, no shared meaning; unanimous. A decoherence rate (loss of quantum phase to the environment) vs. a mutation rate (frequency of a permanent, classical change to a DNA sequence). Same units, no shared physical meaning — decoherence may precede a mutation, but they are not one quantity.',
    citation: 'docs/research/orphan-connector-adjudication.md',
  },
  {
    id: 'foerster-radius~schwarzschild-radius',
    kind: 'shared-structure',
    between: ['foerster-radius', 'schwarzschild-radius'],
    note: 'a Förster radius is not a Schwarzschild radius',
    citation: 'docs/research/Orphan-Connector-Analysis.md',
  },
];

/** Look up an association by its `candidateId`-shaped key. @internal */
export function associationFor(id: string): Association | undefined {
  return ASSOCIATIONS.find((a) => a.id === id);
}
