/**
 * Atlas Phase 1 Sprint 1 (S1.2b) — the `relation` guard inside `composeEdges`.
 *
 * The sprint's one-sentence contract (`docs/planning/Atlas-Phase-1-Design.md`):
 * an edge with no overlay field must behave BYTE-IDENTICALLY to before. Test 1
 * is what proves that, and it is the reason this file exists at all — re-running
 * the existing suite would only prove the suite still passes, which is a weaker
 * claim than "the output is unchanged".
 *
 * The proof has two parts, kept apart because they move for different reasons.
 *
 * 1. THE INVARIANT. For every ordered pair of catalog edges, the outcome of `composeEdges` is
 *    predicted from the edge data alone — the junction (by name or registered identification),
 *    the junction dimension, the alias dispositions, and the composition table when both
 *    operands carry a relation — and the live outcome must be that prediction. This holds for
 *    any catalog and is not regenerated on an ingest; the composed set is derived, never typed.
 * 2. THE RECORD. `compose-relation.golden.json` is `snapshotAllPairs` over the graph as it was
 *    when the golden was last captured. Every pair in it must still compose to the same bytes
 *    (`extraKeys` records every own key, so an unconditionally-set `relation` fails even though
 *    no old field changed), and a pair the live graph adds is allowed to be absent from it. The
 *    golden was once rewritten inside every catalog-ingest commit, which is the change it should
 *    have been detecting; now it only has to grow when a captured pair's behaviour is MEANT to
 *    change.
 *
 * @module tests/composition/compose-relation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  composeEdges,
  junctionDimensionsMatch,
  QUANTITY_IDENTIFICATIONS,
  SOURCE_ALIAS_DISPOSITIONS,
} from '../../src/composition/compose.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  UndefinedCompositionError,
  type BridgeEdge,
} from '../../src/composition/index.js';
import { composeRelation, NO_COMPOSITE_CLAIM } from '../../src/relations/composition-table.js';
import type { RelationContract } from '../../src/atlas/types.js';
import { snapshotAllPairs, type PairSnapshot } from './compose-relation.snapshot.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const GOLDEN: readonly PairSnapshot[] = JSON.parse(
  readFileSync(fileURLToPath(new URL('./compose-relation.golden.json', import.meta.url)), 'utf8'),
);

/** The outcome classes `composeEdges` can reach, in the order it tests for them. */
type Outcome = 'junction' | 'dimension' | 'alias' | 'table' | 'composed';

/**
 * The outcome the EDGE DATA predicts for `first >> second`: the same four questions
 * `composeEdges` asks, in its order, answered from the registries it reads. No call to the
 * operator, so a change in the operator and a change in the data cannot cancel.
 */
function predictedOutcome(first: BridgeEdge, second: BridgeEdge): Outcome {
  let junction = second.sources.find((s) => s.name === first.target.name);
  if (junction === undefined) {
    for (const ident of QUANTITY_IDENTIFICATIONS) {
      if (ident.from !== first.target.name) continue;
      junction = second.sources.find((s) => s.name === ident.to);
      if (junction !== undefined) break;
    }
  }
  if (junction === undefined) return 'junction';
  if (!junctionDimensionsMatch(first.target.dim, junction.dim)) return 'dimension';

  const remaining = second.sources.filter((s) => s !== junction);
  const firstNames = new Set(first.sources.map((s) => s.name));
  const collisions = [...new Set(remaining.filter((s) => firstNames.has(s.name)).map((s) => s.name))];
  const dispositions = SOURCE_ALIAS_DISPOSITIONS[`${first.id}>>${second.id}`] ?? [];
  for (const name of collisions) {
    const d = dispositions.find((x) => x.name === name);
    if (d === undefined) return 'alias';
    if (d.treatAs !== 'shared') {
      const renamed = d.treatAs.renameSecond;
      if (firstNames.has(renamed) || second.sources.some((s) => s.name === renamed)) return 'alias';
    }
  }

  if (first.relation !== undefined && second.relation !== undefined) {
    const cell = composeRelation(first.relation.type, second.relation.type);
    if (cell === NO_COMPOSITE_CLAIM || cell === 'approximation') return 'table';
  }
  return 'composed';
}

/** The outcome class the LIVE operator produced, from the snapshot's error name. */
function liveOutcome(snapshot: PairSnapshot): Outcome | string {
  if (snapshot.outcome === 'composed') return 'composed';
  switch (snapshot.error) {
    case 'CompositionJunctionError':
      return 'junction';
    case 'CompositionDimensionError':
      return 'dimension';
    case 'CompositionAliasError':
      return 'alias';
    case 'UndefinedCompositionError':
      return 'table';
    default:
      return snapshot.error;
  }
}

const q = (name: string) => ({ name, symbol: name, dim: DIMENSIONLESS, attributes: {} });

/** A minimal synthetic edge `a -> b`, optionally carrying a relation. */
const edge = (
  id: string,
  source: string,
  target: string,
  relation?: RelationContract,
): BridgeEdge => ({
  id,
  beId: null,
  kind: 'bridge',
  label: id,
  sources: [q(source)],
  target: q(target),
  confidence: 'established',
  domain: { description: 'any', predicate: () => true },
  evaluate: (inputs) => inputs[source] * 2,
  citation: 'synthetic',
  ...(relation ? { relation } : {}),
});

const EXACT: RelationContract = {
  type: 'exact-equivalence',
  transformation: 'u = x / x0',
  inverse: 'x = x0 u',
};
const DERIVATION: RelationContract = {
  type: 'derivation',
  transformation: 'substitute the constitutive relation',
};
const APPROX: RelationContract = {
  type: 'approximation',
  transformation: 'expand to first order in ε',
  bound: {
    K: 1,
    delta: 0.1,
    norm: 'sup |f − f_approx|',
    domain: 'ε ∈ (0, 0.1)',
    horizon: 'ε < 0.1',
    horizonHolds: () => true,
    limitCharacter: 'regular',
    uniformity: ['test'],
  },
};
const DEFQ: RelationContract = {
  type: 'deformation-quantization',
  transformation: 'Moyal star product to O(ħ)',
};

describe('S1.2b — the existing catalog composes EXACTLY as it did before', () => {
  it('carries a relation on exactly the seven S1.5-audited edges, and no others', () => {
    // S1.2b asserted NO edge carried a relation, because at Wave 2 none did and
    // that made the unchanged-composition proof trivially sound. S1.5 audited
    // ten catalog rows and copied each relation onto the row's edges, so the
    // premise is now false as written. It is replaced rather than deleted: the
    // proof still needs a stated premise, and "which edges carry one" is the
    // fact that must not drift. The golden snapshot below is what actually
    // proves composition is unchanged — it records every own key of every
    // composed edge, so a newly DERIVED relation would fail it. It passes.
    const bearing = CATALOG_GRAPH.filter((e) => e.relation !== undefined).map((e) => e.id);
    expect([...bearing].sort()).toEqual(
      ['be-11-zurek', 'be-11-master', 'be-21', 'be-37', 'be-48', 'be-51', 'be-52', 'be-55', 'be-58', 'be-59'].sort(),
    );
    // 127 is the record from before every catalog relation, including be-147..170, was an edge.
    // 57 is the record from before be-77..87.
    expect(CATALOG_GRAPH.length).toBe(158);
    // 114 is the record from before be-134..146.
    // 106 is the record from before be-126..133.
    // 83 is the record from before be-103..125.
    // 68 is the record from before be-88..102.
  });

  const live = snapshotAllPairs(CATALOG_GRAPH, composeEdges);
  const liveByPair = new Map(live.map((s) => [s.pair, s]));

  it('every ordered pair composes, or refuses, exactly as its edge data predicts (the invariant)', () => {
    expect(live.length).toBe(CATALOG_GRAPH.length ** 2);
    const disagreements: string[] = [];
    for (const first of CATALOG_GRAPH) {
      for (const second of CATALOG_GRAPH) {
        const pair = `${first.id}>>${second.id}`;
        const predicted = predictedOutcome(first, second);
        const actual = liveOutcome(liveByPair.get(pair)!);
        if (predicted !== actual) disagreements.push(`${pair}: predicted ${predicted}, got ${actual}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it('the composed set is the derived set, and it is not empty (the invariant is not vacuous)', () => {
    const predicted = CATALOG_GRAPH.flatMap((first) =>
      CATALOG_GRAPH.filter((second) => predictedOutcome(first, second) === 'composed').map(
        (second) => `${first.id}>>${second.id}`,
      ),
    ).sort();
    const composed = live.filter((s) => s.outcome === 'composed').map((s) => s.pair).sort();
    expect(composed).toEqual(predicted);
    expect(composed.length).toBeGreaterThan(0);
    // More than one outcome class is exercised by the live catalog, so a predictor that returned
    // one constant could not pass the invariant above. (Which classes occur is a fact about the
    // catalog: at 9.0.0 no pair meets at a junction with mismatched dimensions, and no two
    // relation-bearing edges meet at all, so `dimension` and `table` are reached only by the
    // synthetic edges further down this file.)
    const classes = new Set(live.map(liveOutcome));
    expect(classes).toContain('junction');
    expect(classes).toContain('composed');
    expect(classes.size).toBeGreaterThan(1);
  });

  it('every pair in the golden record still composes to the same bytes (the record is additive)', () => {
    // evaluateAtOnes was refreshed when HBAR_SI became H_SI/(2π). Pair structure was not.
    expect(GOLDEN.length).toBeGreaterThan(0);
    expect(GOLDEN.some((s) => s.outcome === 'composed')).toBe(true);
    const moved: string[] = [];
    for (const row of GOLDEN) {
      const now = liveByPair.get(row.pair);
      if (now === undefined) {
        moved.push(`${row.pair}: no longer a pair of the live graph`);
        continue;
      }
      try {
        expect(now).toEqual(row);
      } catch {
        moved.push(`${row.pair}: ${row.outcome} → ${now.outcome}`);
      }
    }
    expect(moved).toEqual([]);
  });

  it('control: a predictor missing one of the questions is caught by the invariant', () => {
    const disagreements = (predict: (a: BridgeEdge, b: BridgeEdge) => Outcome): number =>
      CATALOG_GRAPH.flatMap((a) =>
        CATALOG_GRAPH.filter((b) => predict(a, b) !== liveOutcome(liveByPair.get(`${a.id}>>${b.id}`)!)),
      ).length;

    // Without the registered identifications, a pair that meets only through one (for example
    // hawking-temperature → temperature) is predicted 'junction' while the operator composes it.
    const byNameOnly = (first: BridgeEdge, second: BridgeEdge): Outcome => {
      if (second.sources.some((s) => s.name === first.target.name)) return predictedOutcome(first, second);
      return 'junction';
    };
    expect(disagreements(byNameOnly)).toBeGreaterThan(0);

    // Without the alias question, a pair whose operands share a source name with no recorded
    // disposition is predicted 'composed' while the operator refuses it.
    const noAlias = (first: BridgeEdge, second: BridgeEdge): Outcome => {
      const p = predictedOutcome(first, second);
      return p === 'alias' ? 'composed' : p;
    };
    expect(disagreements(noAlias)).toBeGreaterThan(0);

    // The real predictor has no disagreement; the two above are what "caught" means.
    expect(disagreements(predictedOutcome)).toBe(0);
  });
});

describe('S1.2b — two relation-bearing edges compose through the table', () => {
  it('exact-equivalence ∘ derivation = derivation (a DEFINED cell)', () => {
    const composed = composeEdges(
      edge('e1', 'a', 'b', EXACT),
      edge('e2', 'b', 'c', DERIVATION),
    );
    expect(composed.relation).toEqual({
      type: 'derivation',
      transformation: 'u = x / x0 then substitute the constitutive relation',
    });
    expect(composed.relationDerivedFrom).toEqual(['e1', 'e2']);
  });

  it('exact ∘ exact carries the composed inverse, innermost map undone last', () => {
    const composed = composeEdges(
      edge('e1', 'a', 'b', EXACT),
      edge('e2', 'b', 'c', { ...EXACT, transformation: 'v = u / u0', inverse: 'u = u0 v' }),
    );
    expect(composed.relation).toEqual({
      type: 'exact-equivalence',
      transformation: 'u = x / x0 then v = u / u0',
      inverse: 'u = u0 v then x = x0 u',
    });
  });

  it('the overlay does not disturb the numeric behaviour of the composed edge', () => {
    const composed = composeEdges(
      edge('e1', 'a', 'b', EXACT),
      edge('e2', 'b', 'c', DERIVATION),
    );
    expect(composed.evaluate({ a: 3 })).toBe(12); // 3*2 piped into *2
  });
});

describe('S1.2b — a refused pair throws UndefinedCompositionError', () => {
  const refused = () =>
    composeEdges(
      edge('be-approx', 'a', 'b', APPROX),
      edge('be-defq', 'b', 'c', DEFQ),
    );

  it('throws the dedicated error type', () => {
    expect(refused).toThrow(UndefinedCompositionError);
  });

  it('names BOTH edge ids and BOTH relation types in the message', () => {
    let message = '';
    try {
      refused();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('be-approx');
    expect(message).toContain('be-defq');
    expect(message).toContain('approximation');
    expect(message).toContain('deformation-quantization');
  });
});

describe('the widened cell approximation ∘ exact-equivalence is refused at the edge layer', () => {
  // The table now returns 'approximation' for this order
  // (docs/planning/ADR-transported-norm-composition.md). An edge's relation
  // declares no norm transport, so the edge layer cannot compose the bound and
  // must refuse with the guard's own message, not the silent-cell message.
  const widened = () =>
    composeEdges(edge('be-approx', 'a', 'b', APPROX), edge('be-exact', 'b', 'c', EXACT));

  it('throws UndefinedCompositionError naming the missing composed bound', () => {
    expect(widened).toThrow(UndefinedCompositionError);
    expect(widened).toThrow(/returned 'approximation'/);
    expect(widened).toThrow(/declares no norm transport/);
  });

  it('control: the reverse order is still a silent cell, with the silent-cell message', () => {
    const reverse = () =>
      composeEdges(edge('be-exact', 'a', 'b', EXACT), edge('be-approx', 'b', 'c', APPROX));
    expect(reverse).toThrow(/asserts no composite relation/);
    expect(reverse).not.toThrow(/returned 'approximation'/);
  });
});

describe('S1.2b — one operand without a relation takes the unchanged path', () => {
  it('does not throw, and sets neither overlay key', () => {
    for (const [first, second] of [
      [edge('e1', 'a', 'b', APPROX), edge('e2', 'b', 'c')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c', DEFQ)],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    ] as const) {
      const composed = composeEdges(first, second);
      expect(composed.relation).toBeUndefined();
      expect(composed.relationDerivedFrom).toBeUndefined();
      expect(Object.keys(composed)).not.toContain('relation');
      expect(Object.keys(composed)).not.toContain('relationDerivedFrom');
    }
  });

  it('is refused ONLY when both sides carry one — the same pair composes fine without', () => {
    // The identical id/type pair that throws above composes silently once one
    // side drops its relation. That difference IS the guard.
    expect(() =>
      composeEdges(edge('be-approx', 'a', 'b', APPROX), edge('be-defq', 'b', 'c')),
    ).not.toThrow();
  });
});
