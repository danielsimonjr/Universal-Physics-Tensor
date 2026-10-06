/**
 * `buildVizModel` / `filterEdges` overlay filters — Atlas Phase 2, S2.4.
 *
 * The two properties these tests exist to hold:
 *
 *  1. **A missing overlay means something DIFFERENT once a filter is set.**
 *     Unfiltered, an edge with no `relation` is kept. Filtered, it is dropped —
 *     and the drop is counted SEPARATELY from an edge that carried metadata and
 *     simply did not match. Folding the two counts together would let an
 *     unaudited graph render as a complete answer.
 *  2. **Evidence is DERIVED, never stored.** Nothing carries an evidence field;
 *     `deriveEdgeEvidence` reads the catalog row at call time. The positive
 *     control below proves the filter selects on the derived set by using a row
 *     that GAINS a tag and one that does not.
 *
 * @module tests/composition/graph-viz-filters
 */
import { describe, it, expect } from 'vitest';
import {
  buildVizModel,
  filterEdges,
  formatFilterLegend,
} from '../../src/composition/graph-viz.js';
import type { VizJunction } from '../../src/composition/graph-viz.js';
import { deriveEdgeEvidence, withCatalogEvidence } from '../../src/cli/map-evidence.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import type { EvidenceTag } from '../../src/atlas/types.js';

const BOTH = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];

/** How many `--source=both` edges record each relation type. Measured, not guessed. */
function countByRelation(): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of BOTH) {
    if (e.relation) m.set(e.relation.type, (m.get(e.relation.type) ?? 0) + 1);
  }
  return m;
}

describe('filterEdges — relation', () => {
  it('no filter keeps every edge, including the unaudited ones', () => {
    const { kept, stats } = filterEdges(BOTH, {});
    expect(kept.length).toBe(BOTH.length);
    expect(stats.droppedMissingMetadata).toBe(0);
    expect(stats.droppedNotMatching).toBe(0);
    // The premise of property 1: most of the graph carries NO relation.
    expect(BOTH.filter((e) => e.relation === undefined).length).toBeGreaterThan(0);
  });

  it('--relation=approximation yields the audited approximation edges — pinned at ZERO', () => {
    // PINNED FROM SPRINT 1 S1.5. `tests/atlas/audited-catalog.test.ts` audits
    // exactly ten rows (BE-11, 21, 35, 37, 48, 51, 52, 55, 58, 59) and the
    // relation types those rows and their edges record are `derivation`,
    // `coarse-graining` and `exact-equivalence`. NOT ONE is an
    // `approximation`, so the honest pin for this filter is 0 — the brief's
    // expectation of a non-zero count does not match what S1.5 landed.
    //
    // A zero-result test proves nothing on its own, which is why the
    // `derivation` case below is its positive control.
    const { kept, stats } = filterEdges(BOTH, { relation: 'approximation' });
    expect(kept).toEqual([]);
    expect(stats.kept).toBe(0);
    expect(countByRelation().get('approximation')).toBeUndefined();
  });

  it('POSITIVE CONTROL: --relation=derivation selects exactly the derivation edges', () => {
    const expected = BOTH.filter((e) => e.relation?.type === 'derivation');
    expect(expected.length).toBeGreaterThan(0);
    const { kept, stats } = filterEdges(BOTH, { relation: 'derivation' });
    expect(kept.map((e) => e.id).sort()).toEqual(expected.map((e) => e.id).sort());
    expect(stats.kept).toBe(expected.length);
  });

  it('separates "did not match" from "no metadata at all"', () => {
    const { stats } = filterEdges(BOTH, { relation: 'derivation' });
    const withOverlay = BOTH.filter((e) => e.relation !== undefined).length;
    const withoutOverlay = BOTH.length - withOverlay;
    expect(stats.droppedMissingMetadata).toBe(withoutOverlay);
    expect(stats.droppedNotMatching).toBe(withOverlay - stats.kept);
    expect(stats.kept + stats.droppedNotMatching + stats.droppedMissingMetadata).toBe(
      stats.total,
    );
    // The number that must never be silent.
    expect(stats.droppedMissingMetadata).toBeGreaterThan(0);
  });
});

describe('deriveEdgeEvidence — derived at read time, from the row', () => {
  it('BE-35 gains `contradicted` from the counterexample it carries', () => {
    expect([...deriveEdgeEvidence(35)]).toContain('contradicted');
  });

  it('BE-11 carries no refuting artifact, so it derives only `proposed`', () => {
    expect([...deriveEdgeEvidence(11)]).toEqual(['proposed']);
  });

  it('an id with no catalog row derives NOTHING — no default tag', () => {
    expect([...deriveEdgeEvidence(9999)]).toEqual([]);
  });
});

describe('buildVizModel — evidence filter', () => {
  it('without a derivation function, a beId cannot be evaluated and the filter throws', () => {
    expect(() => buildVizModel(BOTH, { evidence: 'proposed' })).toThrow(/no deriveEvidence/);
  });

  it('proposed keeps edges that are still proposed, and formally-proved keeps the kind-bridge edges', () => {
    const withBeId = BOTH.filter((e) => e.beId != null);
    const proposed = withBeId.filter((e) => deriveEdgeEvidence(e.beId!).has('proposed'));
    const proved = withBeId.filter((e) => deriveEdgeEvidence(e.beId!).has('formally-proved'));
    expect(proposed.length).toBeGreaterThan(0);
    // 24 is the record from before be-77..87. Each new edge derives formally-proved.
    expect(proved.length).toBe(118);
    // 94 is the record from before be-147..170.
    // 81 is the record from before be-134..146.
    // 73 is the record from before be-126..133.
    // 50 is the record from before be-103..125. 35 is the record from before be-88..102.
    expect(proposed.length + proved.length).toBe(withBeId.length);
    const model = buildVizModel(BOTH, withCatalogEvidence({ evidence: 'proposed' }));
    expect(model.filterStats.kept).toBe(proposed.length);
    expect(model.filterStats.droppedNotMatching).toBe(proved.length);
    // Law/canonical edges have `beId: null` — they cannot be evaluated, so they
    // are MISSING metadata, never "not matching".
    expect(model.filterStats.droppedMissingMetadata).toBe(BOTH.length - withBeId.length);
    const provedModel = buildVizModel(BOTH, withCatalogEvidence({ evidence: 'formally-proved' }));
    expect(provedModel.filterStats.kept).toBe(proved.length);
    expect(provedModel.filterStats.droppedNotMatching).toBe(proposed.length);
  });

  it('`contradicted` selects nothing on the live graph (BE-35 has no edge)', () => {
    const model = buildVizModel(BOTH, withCatalogEvidence({ evidence: 'contradicted' }));
    expect(model.filterStats.kept).toBe(0);
    expect(model.filterStats.droppedNotMatching).toBeGreaterThan(0);
  });

  it('POSITIVE CONTROL: the filter reads the DERIVED set, one edge in and one out', () => {
    const catalogBacked = BOTH.filter((e) => e.beId != null);
    const winner = catalogBacked[0].beId!;
    const loser = catalogBacked.find((e) => e.beId !== winner)!.beId!;
    const derive = (beId: number): ReadonlySet<EvidenceTag> =>
      new Set<EvidenceTag>(beId === winner ? ['numerically-supported'] : ['proposed']);
    const model = buildVizModel(
      BOTH,
      withCatalogEvidence({ evidence: 'numerically-supported', deriveEvidence: derive }),
    );
    const keptIds = new Set(model.junctions.map((j) => j.beId));
    expect(keptIds.has(winner)).toBe(true);
    expect(keptIds.has(loser)).toBe(false);
    expect(model.filterStats.kept).toBe(
      catalogBacked.filter((e) => e.beId === winner).length,
    );
  });

  it('an overlay junction with no beId is MISSING metadata, not non-matching', () => {
    const extra: VizJunction = {
      id: 'IC-test',
      label: 'IC-test',
      status: 'proposed',
      sources: ['mass'],
      target: 'energy',
    };
    const plain = buildVizModel(BOTH, { extraJunctions: [extra] });
    expect(plain.junctions.some((j) => j.id === 'IC-test')).toBe(true);

    const filtered = buildVizModel(
      BOTH,
      withCatalogEvidence({
        extraJunctions: [extra],
        evidence: 'proposed',
      }),
    );
    expect(filtered.junctions.some((j) => j.id === 'IC-test')).toBe(false);
    const unfiltered = buildVizModel(BOTH, withCatalogEvidence({ evidence: 'proposed' }));
    expect(filtered.filterStats.droppedMissingMetadata).toBe(
      unfiltered.filterStats.droppedMissingMetadata + 1,
    );
  });
});

describe('the legend', () => {
  it('is null when no filter is set, and the stats still balance', () => {
    const model = buildVizModel(BOTH, {});
    expect(model.filterLegend).toBeNull();
    expect(model.filterStats.kept).toBe(model.filterStats.total);
  });

  it('prints a ZERO lacking-metadata count rather than omitting the line', () => {
    const zero = formatFilterLegend({
      total: 3,
      kept: 1,
      droppedNotMatching: 2,
      droppedMissingMetadata: 0,
      relation: 'derivation',
    });
    expect(zero).toContain('0 dropped (no overlay metadata)');
  });

  it('reaches both emitters', () => {
    const model = buildVizModel(BOTH, { relation: 'derivation' });
    expect(model.filterLegend).toContain('no overlay metadata');
    expect(model.toMermaid()).toContain('no overlay metadata');
    expect(model.toDot()).toContain('no overlay metadata');
  });
});
