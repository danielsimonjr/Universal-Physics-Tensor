/**
 * Atlas Phase 1, S1.1 — the overlay fields are OPTIONAL and the two
 * conditional requirements are enforced by the COMPILER.
 *
 * Three things are pinned here:
 *   (a) a `BridgeEdge` built with no overlay field type-checks, and the three
 *       new properties are absent — not `undefined`-valued, ABSENT — so the
 *       deep-equality pins in `tests/bridges/catalog-json.test.ts` are
 *       untouched;
 *   (b) every one of the eight `RelationType` members can be constructed
 *       carrying exactly its required content;
 *   (c) an `approximation` contract without `bound` is a TYPE error.
 *
 * (c) is the load-bearing one. It is enforced by `@ts-expect-error`, which
 * FAILS the `bun run typecheck` gate (`tsconfig.tests.json`) when the
 * construction below stops erroring. `vitest.config.ts` enables no
 * `typecheck` block, so this file's runtime pass alone does NOT prove (c) —
 * the typecheck script does.
 *
 * Design note: `docs/planning/Atlas-Phase-1-Design.md` §1.2.
 */

import { describe, it, expect } from 'vitest';

import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import type {
  ApproximationBound,
  Conventions,
  Counterexample,
  RelationContract,
  RelationType,
} from '../../src/atlas/types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validityDomain } from '../../src/composition/edge.js';

const q = (name: string): Quantity => ({
  name,
  symbol: name,
  dim: DIMENSIONLESS,
  attributes: {},
});

/** A minimal edge, identical in shape to what the catalog builds today. */
const plainEdge: BridgeEdge = {
  id: 'law-overlay-fixture',
  beId: null,
  kind: 'law',
  label: 'overlay fixture',
  sources: [q('alpha')],
  target: q('beta'),
  confidence: 'established',
  domain: validityDomain('true'),
  evaluate: (inputs) => inputs.alpha ?? 0,
  citation: 'test fixture',
};

const bound: ApproximationBound = {
  K: 1,
  delta: 0.01,
  norm: 'sup |x − x_reduced|',
  domain: 'θ0 ≤ 0.5 rad',
  horizon: 't ≪ 16 T0/θ0²',
  horizonHolds: (t) => t < 16,
  limitCharacter: 'regular',
  uniformity: ['test'],
};

describe('overlay fields are optional (a)', () => {
  it('an edge with no overlay field type-checks and carries none of them', () => {
    expect(plainEdge.relation).toBeUndefined();
    expect(plainEdge.conventions).toBeUndefined();
    expect(plainEdge.counterexamples).toBeUndefined();
  });

  it('the three keys are ABSENT, not present-and-undefined', () => {
    // This is the property `catalog-json.test.ts`'s `toEqual` depends on: an
    // absent optional field is absent on both sides of the comparison.
    const keys = Object.keys(plainEdge);
    expect(keys).not.toContain('relation');
    expect(keys).not.toContain('conventions');
    expect(keys).not.toContain('counterexamples');
  });
});

describe('every relation type carries exactly its required content (b)', () => {
  const contracts: readonly RelationContract[] = [
    { type: 'derivation', transformation: 'substitute ω0² = k/m' },
    {
      type: 'exact-equivalence',
      transformation: 'u = x/x0, τ = ω0 t',
      // REQUIRED on this member, and only this member.
      inverse: 'x = x0 u, t = τ/ω0',
    },
    { type: 'restriction', transformation: 'set b = 0' },
    {
      type: 'approximation',
      transformation: 'sin θ → θ',
      // REQUIRED on this member; `bound` mandates its own machine horizon.
      bound,
    },
    { type: 'coarse-graining', transformation: 'average over fast phase' },
    { type: 'coarse-graining', transformation: 'average over fast phase', bound },
    { type: 'analytic-continuation', transformation: 't → −iτ' },
    { type: 'structural-analogy', transformation: 'm ↔ L, k ↔ 1/C' },
    { type: 'deformation-quantization', transformation: '{·,·} → [·,·]/iħ' },
  ];

  it('constructs one contract per RelationType, covering all eight', () => {
    const seen = new Set<RelationType>(contracts.map((c) => c.type));
    expect(seen).toEqual(
      new Set<RelationType>([
        'derivation',
        'exact-equivalence',
        'restriction',
        'approximation',
        'coarse-graining',
        'analytic-continuation',
        'structural-analogy',
        'deformation-quantization',
      ]),
    );
  });

  it('narrowing on `type` reaches each member-specific field', () => {
    for (const c of contracts) {
      if (c.type === 'exact-equivalence') expect(c.inverse).toBeTruthy();
      if (c.type === 'approximation') {
        // The horizon is reachable WITHOUT a runtime presence check, because
        // the type guarantees it.
        expect(c.bound.horizonHolds(1, {})).toBe(true);
      }
    }
  });

  it('an edge accepts all three overlay fields together', () => {
    const counterexamples: readonly Counterexample[] = [
      { description: 'fails for θ0 > 1 rad', witness: 'W2b' },
    ];
    const conventions: Conventions = {
      metricSignature: '-+++',
      unitSystem: 'SI',
    };
    const edge: BridgeEdge = {
      ...plainEdge,
      id: 'law-overlay-fixture-full',
      relation: { type: 'approximation', transformation: 'sin θ → θ', bound },
      conventions,
      counterexamples,
    };
    expect(edge.relation?.type).toBe('approximation');
    expect(edge.conventions?.unitSystem).toBe('SI');
    expect(edge.counterexamples).toHaveLength(1);
  });
});

describe('a missing bound is a COMPILE error, not a runtime one (c)', () => {
  it('rejects an `approximation` contract with no bound', () => {
    // @ts-expect-error — `bound` is REQUIRED on the `approximation` member.
    // If this construction ever stops erroring, `bun run typecheck` fails on
    // the unused directive, which is the whole point of the gate.
    const missingBound: RelationContract = {
      type: 'approximation',
      transformation: 'sin θ → θ',
    };
    expect(missingBound.type).toBe('approximation');
  });

  it('rejects an `exact-equivalence` contract with no inverse', () => {
    // @ts-expect-error — `inverse` is REQUIRED on the `exact-equivalence` member.
    const missingInverse: RelationContract = {
      type: 'exact-equivalence',
      transformation: 'u = x/x0',
    };
    expect(missingInverse.type).toBe('exact-equivalence');
  });

  it('rejects a bound with no machine horizon', () => {
    // @ts-expect-error — `horizonHolds` is mandatory on `ApproximationBound`.
    const noHorizon: ApproximationBound = {
      K: 1,
      delta: 0.01,
      norm: 'sup',
      domain: 'all',
      horizon: 'unstated',
      limitCharacter: 'regular',
      uniformity: ['test'],
    };
    expect(noHorizon.K).toBe(1);
  });
});
