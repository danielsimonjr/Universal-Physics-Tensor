/**
 * Atlas Phase 1 Sprint 1 (S1.2b) — the `relation` guard inside `composeEdges`.
 *
 * The sprint's one-sentence contract (`docs/planning/Atlas-Phase-1-Design.md`):
 * an edge with no overlay field must behave BYTE-IDENTICALLY to before. Test 1
 * is what proves that, and it is the reason this file exists at all — re-running
 * the existing suite would only prove the suite still passes, which is a weaker
 * claim than "the output is unchanged".
 *
 * The proof: `compose-relation.golden.json` is `snapshotAllPairs` over
 * `CATALOG_GRAPH` (68 edges). The ordered-pair count is the golden's length.
 * The test re-runs the same serializer against the live operator and
 * deep-equals it. `extraKeys` records
 * every own key of each composed edge, so an unconditionally-set `relation`
 * fails even though no field of the old set changed.
 *
 * @module tests/composition/compose-relation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { composeEdges } from '../../src/composition/compose.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import {
  UndefinedCompositionError,
  type BridgeEdge,
} from '../../src/composition/index.js';
import type { RelationContract } from '../../src/atlas/types.js';
import { snapshotAllPairs, type PairSnapshot } from './compose-relation.snapshot.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const GOLDEN: readonly PairSnapshot[] = JSON.parse(
  readFileSync(fileURLToPath(new URL('./compose-relation.golden.json', import.meta.url)), 'utf8'),
);

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
      ['be-11-zurek', 'be-11-master', 'be-21', 'be-37', 'be-48', 'be-51', 'be-52', 'be-55', 'be-59'].sort(),
    );
    // 57 is the record from before be-77..87.
    expect(CATALOG_GRAPH.length).toBe(83);
    // 68 is the record from before be-88..102.
  });

  it('reproduces the golden snapshot of all 6889 ordered pairs', () => {
    // evaluateAtOnes was refreshed when HBAR_SI became H_SI/(2π). Pair structure was not.
    const live = snapshotAllPairs(CATALOG_GRAPH, composeEdges);
    expect(live.length).toBe(GOLDEN.length);
    // Deep-equal the whole array, not a per-pair loop: a pair that stopped
    // being produced at all must fail too.
    expect(live).toEqual(GOLDEN);
  });

  it('the golden is a real proof, not a vacuous one (it has composable pairs)', () => {
    // 3249 = 57² is the record from before be-77..87. 68² = 4624.
    expect(GOLDEN.length).toBe(6889);
    // 4624 = 68² is the record from before be-88..102. 83² = 6889.
    // 19 composed pairs is the record from before be-74..76. The three new
    // pairs are be-74>>be-76, be-42>>be-76, and be-42-via-rs>>be-76.
    expect(GOLDEN.filter((s) => s.outcome === 'composed').length).toBe(22);
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
