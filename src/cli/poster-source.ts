/**
 * The POSTER source for the physics map — turn the Atlas Phase 3 poster index
 * (statements, derivations, associations) into {@link VizJunction}s, and check
 * that every id a derivation names actually resolves.
 *
 * ## The graph this draws is NOT the catalog graph
 *
 * In the catalog map, round nodes are *quantities* and box nodes are
 * *equations*. In the poster map, round nodes are **statements** — including
 * the five hidden supporting nodes (the action principle, Noether, the full
 * Maxwell system, the Lorentz group, the central limit theorem) — and box
 * nodes are **derivations**: many premises in, one conclusion out. That is the
 * whole reason a hidden node is visible at all: it is a node because something
 * names it, not because it can be evaluated (`atlas/statement.ts`, design note
 * §1, says `ast?` is optional for exactly these five).
 *
 * It also makes {@link validatePoster} able to FAIL. A hidden node that is
 * merely listed somewhere can never be contradicted; a hidden node that two
 * derivations take as a premise is contradicted the moment the registry stops
 * defining it. Design note §9 question 4 flags the named-but-not-evaluated test
 * as the likeliest vacuous pass in this sprint — the dangling-premise check is
 * the answer to it, and its own test breaks it deliberately to prove it bites.
 *
 * ## How a poster junction meets the map's filters
 *
 * Nothing here bypasses `buildVizModel`'s filtering: these junctions are handed
 * in as `opts.extraJunctions` and are judged by the same `judge` predicate as
 * every catalog edge (design note §6). Two consequences, both deliberate:
 *
 *  - A **derivation** junction carries its `relation`, because a `Derivation`
 *    HAS one. So `--relation=derivation` selects poster derivations on recorded
 *    metadata rather than dropping them as unaudited. Reporting a relation we
 *    hold would be the fabrication's mirror image: hiding evidence we have.
 *  - An **association** junction carries NO `relation`, because an
 *    `Association` makes no relation claim at all (`atlas/association.ts`). Any
 *    `--relation` filter therefore drops it into the legend's
 *    `droppedMissingMetadata` bucket — "nobody could put the question to it" —
 *    which is the correct reading, not an oversight.
 *  - NOTHING here carries a `beId`: the poster is not the bridge catalog. Every
 *    `--evidence` filter therefore drops the whole poster source as lacking
 *    metadata, and the legend says so out loud rather than rendering an empty
 *    map as an answer.
 *
 * Poster junctions never anchor a cluster: `componentsOf` keys `anchored` on
 * `'law' | 'established'` only. That is correct — the poster index is a map of
 * claims and their supports, not an assertion that any of them is textbook
 * physics — and it is recorded here because it is a decision, not an accident.
 *
 * Pure string/record production: no I/O, no registry reads beyond what the
 * caller passes in. Imports atlas LEAF modules only, never `atlas/index.ts`.
 * Lives in `cli` because it feeds `upt map` and imports the poster registries.
 *
 * @module cli/poster-source
 */

import type { Association } from '../atlas/association.js';
import type { Derivation, DerivationId } from '../atlas/derivation.js';
import type { Statement, StatementId } from '../atlas/statement.js';
import type { VizJunction } from '../composition/graph-viz.js';

/**
 * The poster index as this module consumes it: the three registries, passed
 * in rather than imported, so the renderer and the validator are testable
 * against a fixture and cannot drift with the data.
 *
 * @internal
 */
export interface PosterGraph {
  readonly statements: readonly Statement[];
  readonly derivations: readonly Derivation[];
  readonly associations: readonly Association[];
}

/** An id a derivation names that the statement registry does not define. @internal */
export interface DanglingPremise {
  /** The derivation that names it. */
  readonly derivation: DerivationId;
  /** The unresolved statement id. */
  readonly missing: StatementId;
  /**
   * Where it was named. Kept distinct because they are different defects: a
   * dangling PREMISE means the derivation stands on nothing, a dangling
   * CONCLUSION means it concludes nothing.
   */
  readonly role: 'premise' | 'conclusion';
}

/** What {@link validatePoster} found. @internal */
export interface PosterValidation {
  /** Every unresolved id, one row per (derivation, id, role). Empty ⇒ intact. */
  readonly dangling: readonly DanglingPremise[];
  /**
   * Association endpoints that are not statement ids.
   *
   * SEPARATE from `dangling`, and not a failure: `Association.between` is a
   * pair of NAMES, and the registry is explicitly a container of typed pairs
   * that makes no claim. An endpoint naming something outside the statement
   * registry is a resemblance recorded about something else, not a broken
   * derivation. Folding the two together would let a real dangling premise
   * hide inside a count of harmless rows.
   */
  readonly unresolvedAssociationEndpoints: readonly string[];
  /** Statement ids defined but named by no derivation and no association. */
  readonly orphanStatements: readonly StatementId[];
}

/**
 * Check every id the poster's derivations and associations name against the
 * statement registry.
 *
 * This is the hidden-node test's instrument. Remove `'statement-noether'` from
 * `graph.statements` and every derivation that takes it as a premise reports
 * here — which is what makes "the hidden nodes are named and linked" a claim
 * with a failure mode rather than a description of a list.
 *
 * @internal
 */
export function validatePoster(graph: PosterGraph): PosterValidation {
  const known = new Set<StatementId>(graph.statements.map((s) => s.id));
  const named = new Set<StatementId>();
  const dangling: DanglingPremise[] = [];

  for (const d of graph.derivations) {
    for (const p of d.premises) {
      named.add(p);
      if (!known.has(p)) dangling.push({ derivation: d.id, missing: p, role: 'premise' });
    }
    named.add(d.conclusion);
    if (!known.has(d.conclusion)) {
      dangling.push({ derivation: d.id, missing: d.conclusion, role: 'conclusion' });
    }
  }

  const unresolved = new Set<string>();
  for (const a of graph.associations) {
    for (const end of a.between) {
      named.add(end);
      if (!known.has(end)) unresolved.add(end);
    }
  }

  return {
    dangling,
    unresolvedAssociationEndpoints: [...unresolved].sort(),
    orphanStatements: [...known].filter((id) => !named.has(id)).sort(),
  };
}

/**
 * Render the poster index as viz junctions: one box per derivation, one per
 * association, with statement ids as the round quantity nodes.
 *
 * Association ids are prefixed `assoc:` so an association and a derivation can
 * never collide on a junction id — `buildVizModel` throws on a duplicate, and
 * a thrown map is a worse diagnosis than a namespaced id.
 *
 * An association is drawn `a → b` because the renderer has only directed
 * edges. It is NOT a directed claim: the dashed style and the separate status
 * are what say so, and `Association` carries no relation to be read off it.
 *
 * @internal
 */
export function posterJunctions(graph: PosterGraph): VizJunction[] {
  const out: VizJunction[] = graph.derivations.map((d) => ({
    id: d.id,
    label: d.id,
    status: 'poster' as const,
    sources: [...d.premises],
    target: d.conclusion,
    // A Derivation HAS a relation; carrying it lets --relation select on
    // recorded metadata instead of dropping the poster as unaudited.
    relation: d.relation,
  }));
  for (const a of graph.associations) {
    out.push({
      id: `assoc:${a.id}`,
      label: `${a.kind}: ${a.between[0]} ~ ${a.between[1]}`,
      status: 'association' as const,
      sources: [a.between[0]],
      target: a.between[1],
      // No `relation` ON PURPOSE — see the module note.
    });
  }
  return out;
}

/**
 * The poster index as this build knows it.
 *
 * ⚠ EMPTY IN THIS BUILD, and that is a recorded state rather than a mistake.
 * The sixteen entries, their derivations and their associations are the S3.3
 * deliverable (`src/atlas/poster/`), and `docs/planning/Atlas-Phase-3-Design.md`
 * §5 forbids inventing one to fill a gap: an invented entry is plausible and
 * uncheckable, which is the failure the whole design note exists to prevent.
 *
 * So the source exists, is wired, is filtered and is tested — against a fixture
 * in the tests and against this empty registry in the CLI — and it SAYS SO when
 * it renders nothing, per design note §6: *"A poster source that returns an
 * empty or partial graph must say why in the same way."* Point this at the real
 * registry when it lands; nothing else has to change.
 *
 * @internal
 */
export const POSTER_GRAPH: PosterGraph = {
  statements: [],
  derivations: [],
  associations: [],
};

/**
 * One line saying what the poster source contributed and, when it contributed
 * nothing, WHY — so an empty map can never read as a complete answer.
 *
 * @internal
 */
export function describePosterSource(
  graph: PosterGraph,
  validation: PosterValidation,
): string {
  if (graph.statements.length === 0 && graph.derivations.length === 0) {
    return (
      'poster: EMPTY — the poster index (16 entries, their derivations and ' +
      'associations) is not registered in this build. This is an unpopulated ' +
      'registry, NOT a graph with nothing in it.'
    );
  }
  const parts = [
    `poster: ${graph.statements.length} statements, ` +
      `${graph.derivations.length} derivations, ` +
      `${graph.associations.length} associations`,
  ];
  if (validation.dangling.length > 0) {
    parts.push(
      `⚠ ${validation.dangling.length} DANGLING ` +
        `(${validation.dangling.map((d) => `${d.derivation}→${d.missing}`).join(', ')})`,
    );
  }
  if (validation.unresolvedAssociationEndpoints.length > 0) {
    parts.push(
      `${validation.unresolvedAssociationEndpoints.length} association endpoint(s) ` +
        'outside the statement registry',
    );
  }
  if (validation.orphanStatements.length > 0) {
    parts.push(`${validation.orphanStatements.length} statement(s) named by nothing`);
  }
  return parts.join('; ');
}
