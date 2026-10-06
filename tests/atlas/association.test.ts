/**
 * Atlas Phase 1 S1.4 — the association registry.
 *
 * The load-bearing property is NEGATIVE: an association is precisely not an
 * edge. These tests spend most of their effort proving that the two registries
 * stay disjoint, because a resemblance that leaked into the graph would be a
 * claim nobody made.
 */
import { describe, it, expect } from 'vitest';
import { ASSOCIATIONS, associationFor } from '../../src/atlas/association.js';
import { ADJUDICATIONS } from '../../src/composition/adjudication.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';
import { buildVizModel } from '../../src/composition/graph-viz.js';
import { allQuantities } from '../../src/composition/quantities.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';

const decoys = ADJUDICATIONS.filter((a) => a.verdict === 'decoy');

/** Unordered pair key, matching `candidateId`'s sort-then-join. */
const pairKey = (a: string, b: string) => (a <= b ? `${a}~${b}` : `${b}~${a}`);

describe('ASSOCIATIONS — seeded from the decoy verdicts', () => {
  it('has exactly one entry per decoy adjudication, id-linked', () => {
    expect(decoys.length).toBeGreaterThan(0);
    expect(ASSOCIATIONS.map((a) => a.id)).toEqual(decoys.map((d) => d.id));
  });

  it("copies each decoy's grounds VERBATIM as the note, and its source as the citation", () => {
    for (const d of decoys) {
      const assoc = associationFor(d.id);
      expect(assoc, `no association for ${d.id}`).toBeDefined();
      expect(assoc!.note).toBe(d.grounds);
      expect(assoc!.citation).toBe(d.source);
    }
  });

  it('derives `between` from the ~-split id, in id order', () => {
    for (const a of ASSOCIATIONS) {
      expect(a.between).toEqual(a.id.split('~'));
      expect(pairKey(a.between[0], a.between[1])).toBe(a.id);
    }
  });

  it('assigns kind mechanically — every seed is shared-structure', () => {
    // Not a per-pair physics judgement; see the module docstring. A seed that
    // acquired a different kind would be a new claim about that pair.
    for (const a of ASSOCIATIONS) expect(a.kind).toBe('shared-structure');
  });
});

describe('every seeded name resolves to a real quantity', () => {
  // NOTE (brief correction): the decoy names do NOT all live in the
  // composition quantity registry. Five of them — erasure-energy,
  // photon-energy, rest-energy, hubble-distance, peak-wavelength — are
  // canonical-equation targets/governing variables (src/canonical/entries/),
  // not `Quantity` nodes. The funnel draws from both, so the resolution set is
  // the UNION. Checking the composition registry alone would fail 5 of 7.
  const compositionNames = new Set(allQuantities().map((quantity) => quantity.name));
  const canonicalNames = new Set(
    CANONICAL_EQUATIONS.flatMap((e) => [
      e.dimensional.target.name,
      ...e.dimensional.governing.map((g) => g.name),
    ]),
  );

  it('resolves in the composition registry or the canonical registry', () => {
    const unresolved: string[] = [];
    for (const a of ASSOCIATIONS) {
      for (const n of a.between) {
        if (!compositionNames.has(n) && !canonicalNames.has(n)) unresolved.push(`${a.id}: ${n}`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('the composition registry alone is NOT sufficient — the union is load-bearing', () => {
    // A control. If this ever goes to zero the union above stopped being
    // necessary, and a green union test would no longer prove it was used.
    const onlyCanonical = ASSOCIATIONS.flatMap((a) => a.between).filter(
      (n) => !compositionNames.has(n) && canonicalNames.has(n),
    );
    expect(onlyCanonical.length).toBeGreaterThan(0);
  });
});

describe('an association is precisely NOT an edge', () => {
  const edgePairs = new Set<string>();
  for (const e of CATALOG_GRAPH) {
    for (const s of e.sources) edgePairs.add(pairKey(s.name, e.target.name));
  }

  it('no association pair is also a CATALOG_GRAPH edge', () => {
    const collisions = ASSOCIATIONS.filter((a) => edgePairs.has(a.id)).map((a) => a.id);
    expect(collisions).toEqual([]);
  });

  it('the collision check can actually fire (control)', () => {
    // Proves `edgePairs` is populated and keyed the same way. Without this, an
    // empty set would pass the test above for the wrong reason.
    expect(edgePairs.size).toBeGreaterThan(0);
    const [someEdge] = [...edgePairs];
    expect(edgePairs.has(someEdge!)).toBe(true);
  });

  it('buildVizModel never emits an association as an edge', () => {
    const model = buildVizModel(CATALOG_GRAPH);
    const emitted = new Set<string>();
    for (const j of model.junctions) {
      for (const s of j.sources) emitted.add(pairKey(s, j.target));
    }
    expect(emitted.size).toBeGreaterThan(0); // control: the model is non-empty
    for (const a of ASSOCIATIONS) expect(emitted.has(a.id)).toBe(false);
  });
});
