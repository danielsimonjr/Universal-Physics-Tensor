/**
 * S3.4 — the poster source: the hidden-node (dangling-premise) check, the
 * dashed association edge, and the silent-omission trap in `STATUSES_IN_ORDER`.
 *
 * ## Every assertion here was watched to FAIL first
 *
 * `docs/planning/Atlas-Phase-3-Design.md` §9 question 4 names this file's
 * subject as the likeliest vacuous pass in the sprint: *"a test over nodes that
 * are named-but-not-evaluated is exactly the shape that passes trivially."* So
 * each block below pairs its assertion with a POSITIVE CONTROL — the same check
 * run against a graph where the defect is present — so the test cannot pass by
 * being unable to see anything.
 */

import { describe, it, expect } from 'vitest';
import {
  posterJunctions,
  validatePoster,
  describePosterSource,
  POSTER_GRAPH,
  type PosterGraph,
} from '../../src/cli/poster-source.js';
import {
  buildVizModel,
  ALL_VIZ_STATUSES,
  type VizJunction,
  type VizStatus,
} from '../../src/composition/graph-viz.js';
import { makeDerivation } from '../../src/atlas/derivation.js';
import type { Derivation } from '../../src/atlas/derivation.js';
import type { Context, Statement } from '../../src/atlas/statement.js';
import type { Association } from '../../src/atlas/association.js';

/** A context that pools with any other copy of itself: nothing declared, nothing excluded. */
const PLAIN: Context = { assumptions: [], excludes: [] };

function statement(id: string, display: string): Statement {
  // `ast` is deliberately absent — these are the named-and-linked hidden nodes
  // `atlas/statement.ts` says must be expressible without a fabricated encoding.
  return { id, context: PLAIN, model: 'harmonic-oscillator', sourceExpression: display, display };
}

/**
 * A miniature of the real poster: the Noether hidden node supporting BOTH the
 * energy-conservation and the momentum-conservation edges that `ROADMAP.md`
 * Phase 3 states, plus the `7 ↔ 16` association that the design note insists is
 * an association and NOT a derivation edge.
 *
 * Two derivations consume `statement-noether` on purpose — the S3.4 criterion
 * is that removing it makes AT LEAST TWO derivations report a dangling premise,
 * and a fixture with one could not distinguish "the check works" from "the
 * check fires once by luck".
 */
function fixture(): PosterGraph {
  const statements: Statement[] = [
    statement('statement-noether', "Noether's theorem"),
    statement('statement-action-principle', 'dS = 0'),
    statement('statement-energy-conservation', 'dE/dt = 0'),
    statement('statement-momentum-conservation', 'dp/dt = 0'),
    statement('statement-e7', 'entry 7'),
    statement('statement-e16', 'entry 16'),
  ];
  const registry = new Map(statements.map((s) => [s.id, s]));
  const derivations: Derivation[] = [
    makeDerivation(
      {
        id: 'd-noether-energy',
        relation: 'derivation',
        premises: ['statement-noether', 'statement-action-principle'],
        conclusion: 'statement-energy-conservation',
        sideConditions: ['autonomous model'],
      },
      registry,
    ),
    makeDerivation(
      {
        id: 'd-noether-momentum',
        relation: 'derivation',
        premises: ['statement-noether', 'statement-action-principle'],
        conclusion: 'statement-momentum-conservation',
        sideConditions: ['isolated particle system'],
      },
      registry,
    ),
  ];
  const associations: Association[] = [
    {
      id: 'statement-e16~statement-e7',
      kind: 'historical-influence',
      between: ['statement-e7', 'statement-e16'],
      note: 'the historical link only; NOT a derivation edge',
      citation: 'ROADMAP.md § Phase 3 — `7 ↔ 16` association for the historical link only',
    },
  ];
  return { statements, derivations, associations };
}

/** The same poster with one statement removed from the registry. */
function without(graph: PosterGraph, id: string): PosterGraph {
  return { ...graph, statements: graph.statements.filter((s) => s.id !== id) };
}

describe('validatePoster — the hidden node is a claim that can FAIL', () => {
  it('POSITIVE CONTROL: the intact poster has no dangling premise', () => {
    const v = validatePoster(fixture());
    expect(v.dangling).toEqual([]);
    // If this ever reports rows, every assertion below is meaningless, because
    // the dangling list would be non-empty no matter what the next test removes.
    expect(v.unresolvedAssociationEndpoints).toEqual([]);
  });

  it('removing statement-noether makes at least TWO derivations report a dangling premise', () => {
    const v = validatePoster(without(fixture(), 'statement-noether'));
    const premiseRows = v.dangling.filter(
      (d) => d.role === 'premise' && d.missing === 'statement-noether',
    );
    expect(premiseRows.length).toBeGreaterThanOrEqual(2);
    expect(new Set(premiseRows.map((d) => d.derivation))).toEqual(
      new Set(['d-noether-energy', 'd-noether-momentum']),
    );
    // And it RETURNS them — the criterion is not "it noticed", it is that the
    // caller gets the rows and can name which derivation lost its footing.
    expect(v.dangling[0]).toMatchObject({ missing: 'statement-noether', role: 'premise' });
  });

  it('a missing CONCLUSION is reported as its own role, not folded into premises', () => {
    const v = validatePoster(without(fixture(), 'statement-energy-conservation'));
    expect(v.dangling).toEqual([
      {
        derivation: 'd-noether-energy',
        missing: 'statement-energy-conservation',
        role: 'conclusion',
      },
    ]);
  });

  it('an association endpoint outside the registry is NOT a dangling premise', () => {
    // An `Association` makes no claim, so an endpoint naming something else is
    // a recorded resemblance, not a broken derivation. Keeping the two lists
    // apart is what stops a real dangling premise hiding in a harmless count.
    const v = validatePoster(without(fixture(), 'statement-e7'));
    expect(v.dangling).toEqual([]);
    expect(v.unresolvedAssociationEndpoints).toEqual(['statement-e7']);
  });

  it('a statement nothing names is reported as an orphan', () => {
    const g = fixture();
    const v = validatePoster({
      ...g,
      statements: [...g.statements, statement('statement-unused', 'nobody cites this')],
    });
    expect(v.orphanStatements).toEqual(['statement-unused']);
  });
});

describe('posterJunctions — what the poster contributes to the map', () => {
  const junctions = posterJunctions(fixture());
  const byId = new Map(junctions.map((j) => [j.id, j]));

  it('one junction per derivation and per association, with statements as the nodes', () => {
    expect(junctions).toHaveLength(3);
    expect(byId.get('d-noether-energy')).toMatchObject({
      status: 'poster',
      sources: ['statement-noether', 'statement-action-principle'],
      target: 'statement-energy-conservation',
    });
    // The hidden node is a real graph node, which is the whole reason removing
    // it from the registry is detectable at all.
    expect(byId.get('d-noether-momentum')!.sources).toContain('statement-noether');
  });

  it('a derivation CARRIES its relation; an association carries none', () => {
    expect(byId.get('d-noether-energy')!.relation).toBe('derivation');
    expect(byId.get('assoc:statement-e16~statement-e7')!.relation).toBeUndefined();
  });

  it('nothing poster-sourced carries a beId, so --evidence drops it as LACKING metadata', () => {
    for (const j of junctions) expect(j.beId).toBeUndefined();
    const model = buildVizModel([], {
      extraJunctions: junctions,
      evidence: 'empirically-supported',
    });
    expect(model.junctions).toEqual([]);
    expect(model.filterStats.droppedMissingMetadata).toBe(3);
    expect(model.filterStats.droppedNotMatching).toBe(0);
    // The legend is what keeps an empty map from reading as a complete answer.
    expect(model.filterLegend).toContain('3 dropped (no overlay metadata)');
  });

  it('--relation=derivation keeps the derivations and drops the association as unaskable', () => {
    const model = buildVizModel([], { extraJunctions: junctions, relation: 'derivation' });
    expect(model.junctions.map((j) => j.id)).toEqual(['d-noether-energy', 'd-noether-momentum']);
    expect(model.filterStats.droppedMissingMetadata).toBe(1);
  });

  it('poster junctions never anchor a cluster', () => {
    const model = buildVizModel([], { extraJunctions: junctions });
    expect(model.clusters.every((c) => !c.anchored)).toBe(true);
  });
});

describe('association edges render DASHED', () => {
  const model = buildVizModel([], { extraJunctions: posterJunctions(fixture()) });

  it('Mermaid: the association classDef is dashed and the poster one is not', () => {
    const mermaid = model.toMermaid();
    expect(mermaid).toContain('classDef association');
    expect(mermaid).toMatch(/classDef association [^\n]*stroke-dasharray:4 3/);
    // POSITIVE CONTROL for the assertion above: if `stroke-dasharray` leaked
    // into every classDef the first expectation would pass while meaning
    // nothing. `poster` must be SOLID in the same output.
    expect(mermaid).toMatch(/classDef poster [^\n]*/);
    expect(mermaid.match(/classDef poster [^\n]*/)![0]).not.toContain('stroke-dasharray');
    // The association junction is the node that carries the class.
    expect(mermaid).toContain(':::association');
  });

  it('DOT: the association box is style="filled,dashed" and the derivation box is not', () => {
    const dot = model.toDot();
    const assocLine = dot.split('\n').find((l) => l.includes('assoc_'))!;
    expect(assocLine).toContain('style="filled,dashed"');
    const derivLine = dot.split('\n').find((l) => /j_d_noether_energy /.test(l))!;
    expect(derivLine).toContain('style="filled"');
    expect(derivLine).not.toContain('dashed');
  });
});

describe('THE SILENT TRAP — a status missing from STATUSES_IN_ORDER omits its classDef', () => {
  // `STATUS_STYLE` is a `Record<VizStatus, …>`, so an unregistered status is a
  // COMPILE error. `STATUSES_IN_ORDER` is a plain array, so an unregistered
  // status compiles fine and silently drops the Mermaid `classDef` — the node
  // renders unstyled and nothing complains. This is the guard for that.
  const one = (status: VizStatus, i: number): VizJunction => ({
    id: `j-${status}`,
    label: status,
    status,
    sources: [`q-in-${i}`],
    target: `q-out-${i}`,
  });

  it('EVERY status in ALL_VIZ_STATUSES emits a Mermaid classDef when it is used', () => {
    const mermaid = buildVizModel([], {
      extraJunctions: ALL_VIZ_STATUSES.map(one),
    }).toMermaid();
    const emitted = new Set(
      [...mermaid.matchAll(/^ {2}classDef (\S+) /gm)].map((m) => m[1]),
    );
    for (const st of ALL_VIZ_STATUSES) {
      expect(emitted, `classDef missing for status '${st}'`).toContain(st);
    }
  });

  it('a status is styled in DOT for every member of the union', () => {
    const dot = buildVizModel([], { extraJunctions: ALL_VIZ_STATUSES.map(one) }).toDot();
    for (const st of ALL_VIZ_STATUSES) {
      expect(dot).toContain(`label="${st}"`);
    }
  });
});

describe('describePosterSource — an empty registry says WHY', () => {
  it('the shipped POSTER_GRAPH is empty in this build and reports itself as unpopulated', () => {
    // Pinned deliberately. When S3.3 registers the sixteen entries this test
    // FAILS, which is the correct moment to be told: an empty poster must never
    // become a silently-accepted normal state.
    expect(POSTER_GRAPH.statements).toEqual([]);
    const note = describePosterSource(POSTER_GRAPH, validatePoster(POSTER_GRAPH));
    expect(note).toContain('EMPTY');
    expect(note).toContain('not registered in this build');
  });

  it('a populated poster reports its counts, and a broken one reports the dangling rows', () => {
    const g = fixture();
    expect(describePosterSource(g, validatePoster(g))).toBe(
      'poster: 6 statements, 2 derivations, 1 associations',
    );
    const broken = without(g, 'statement-noether');
    const note = describePosterSource(broken, validatePoster(broken));
    expect(note).toContain('2 DANGLING');
    expect(note).toContain('d-noether-energy→statement-noether');
  });
});
