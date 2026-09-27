/**
 * S2.2 — `findPath` / `boundPath`, and the refusals that matter more than the
 * numbers.
 *
 * The load-bearing test in this file is NOT an arithmetic one. It is
 * `no-claim over a 'no-composite-claim' path`: design note §3 states that a
 * composed number over an undefined composite is "the most dangerous output
 * this library could produce", and the only way to show the guard works is to
 * walk a path that crosses such a cell and assert no number comes back.
 *
 * ⚠ Two corrections to the S2.2 brief are pinned here as tests, because a
 * correction that lives only in a report gets re-introduced:
 *
 * 1. The brief expects `findPath('oscillators', 'model-pendulum', 'model-lc')`
 *    to carry the bound `(1, 0.0025)`. It carries NO bound. That path is
 *    `approximation` then `exact-equivalence`, and that cell of
 *    `COMPOSITION_TABLE` is `'no-composite-claim'` — deliberately, by Phase 1
 *    §2.2 item 5. The brief's own load-bearing rule forbids the number the
 *    brief asks for, and the very path it names is the case that proves it.
 * 2. `0.0025` is `θ0²/16` at `θ0 = 0.2`, but `AB_PENDULUM_LINEAR.bound.delta`
 *    is `0.5²/16 = 0.015625` — the worst case over the recorded regime
 *    `θ0 ≤ 0.5`. No field parameterises a bound by operating point, so no
 *    function here can produce `0.0025`.
 */

import { describe, expect, it } from 'vitest';

import { boundPath, findAtlasPath, findPath } from '../../src/atlas/path-bound.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { composeBoundPath, IDENTITY_BOUND } from '../../src/atlas/error-algebra.js';
import { composeRelation } from '../../src/atlas/composition-table.js';
import { MissingLipschitzError } from '../../src/atlas/types.js';
import type { ApproximationBound, AtlasBridge, RelationType } from '../../src/atlas/types.js';
import { AB_PENDULUM_LINEAR } from '../../src/atlas/oscillators/bridges-limits.js';
import { propagateUncertainty } from '../../src/composition/uncertainty.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

/**
 * A bound with the mandatory fields filled, for algebra-only assertions.
 *
 * `uniformity` defaults to a non-empty marker so these helpers stay analysed.
 * A dedicated case passes `null` or `[]` — both mean not yet analysed.
 */
function bound(
  K: number,
  delta: number,
  norm: string,
  uniformity: readonly string[] | null = ['test'],
): ApproximationBound {
  return {
    K,
    delta,
    norm,
    domain: 'test',
    horizon: 'test horizon',
    horizonHolds: () => true,
    limitCharacter: 'regular',
    uniformity,
  };
}

/**
 * A synthetic bridge. Real records cannot cover every gate: `coarse-graining`
 * is the only relation whose cell composes with itself AND whose `bound` is
 * optional, so it is the vehicle for the multi-edge arithmetic.
 */
function bridgeOf(
  id: string,
  relation: RelationType,
  b: ApproximationBound | undefined,
): AtlasBridge {
  return {
    id,
    relation,
    premises: ['model-a'],
    conclusion: 'model-b',
    transformation: 'test',
    inverse: relation === 'exact-equivalence' ? 'test inverse' : undefined,
    preserves: [],
    doesNotPreserve: [],
    sideConditions: [],
    bound: b,
    regime: AB_PENDULUM_LINEAR.regime,
    counterexamples: [],
    evidence: new Set(),
    witnesses: [],
    citations: [],
    reviewStatus: 'proposed',
  };
}

describe('findPath', () => {
  it('routes pendulum → lc through the spring, traversing the exact edge forwards', () => {
    const path = findPath('oscillators', 'model-pendulum', 'model-lc');
    expect(path?.map((b) => b.id)).toEqual(['ab-pendulum-linear', 'ab-spring-lc']);
  });

  it('traverses an exact-equivalence BACKWARDS (lc → spring) but never an approximation', () => {
    expect(findPath('oscillators', 'model-lc', 'model-spring')?.map((b) => b.id)).toEqual([
      'ab-spring-lc',
    ]);
    // spring → pendulum would need `ab-pendulum-linear` reversed; an
    // approximation loses information and is one-way.
    expect(findPath('oscillators', 'model-spring', 'model-pendulum')).toBeNull();
  });

  it('returns an empty path for a model to itself, and null when disconnected', () => {
    expect(findPath('oscillators', 'model-lc', 'model-lc')).toEqual([]);
    expect(findPath('oscillators', 'model-lc', 'model-first-order')).toBeNull();
  });

  it('throws rather than returning null for an unknown family or endpoint', () => {
    expect(() => findPath('nope', 'model-lc', 'model-lc')).toThrow(RangeError);
    expect(() => findPath('oscillators', 'model-lc', 'model-nope')).toThrow(RangeError);
  });

  it('stays inside its family: a bridge filed there but ending elsewhere is not followed', () => {
    expect(() => findPath('waves', 'model-klein-gordon', 'model-schrodinger-free')).toThrow(RangeError);
  });
});

describe('findAtlasPath (audit F01)', () => {
  it('follows a bridge filed in one family that ends in another', () => {
    expect(findAtlasPath('model-klein-gordon', 'model-schrodinger-free')?.map((b) => b.id)).toEqual([
      'ab-kg-schrodinger',
    ]);
  });

  it('chains across three families under the same traversal rules', () => {
    // waves → oscillators (restriction), then the exact equivalence backwards.
    expect(findAtlasPath('model-klein-gordon', 'model-lc')?.map((b) => b.id)).toEqual([
      'ab-kg-oscillator',
      'ab-spring-lc',
    ]);
    expect(findAtlasPath('model-schrodinger-free', 'model-klein-gordon')).toBeNull();
  });

  it('agrees with findPath on every same-family pair that findPath connects', () => {
    for (const fam of ATLAS_FAMILIES) {
      for (const a of fam.models) {
        for (const b of fam.models) {
          const inFamily = findPath(fam.family, a.id, b.id);
          if (inFamily === null) continue;
          expect(findAtlasPath(a.id, b.id)?.length).toBe(inFamily.length);
        }
      }
    }
  });

  it('throws for an endpoint in no family', () => {
    expect(() => findAtlasPath('model-lc', 'model-nope')).toThrow(RangeError);
  });
});

describe('boundPath — the refusals', () => {
  it('LOAD-BEARING: a path crossing a no-composite-claim cell yields NO number', () => {
    // Guard the premise: if this cell is ever widened, this test must be
    // rewritten deliberately rather than silently start passing for a new
    // reason.
    expect(composeRelation('approximation', 'exact-equivalence')).toBe('no-composite-claim');

    const path = findPath('oscillators', 'model-pendulum', 'model-lc');
    expect(path).not.toBeNull();
    const result = boundPath(path!);

    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('no-composite-claim');
    // The refusal is structural: there is no `bound` property to read at all.
    expect(Object.hasOwn(result, 'bound')).toBe(false);
    expect((result as { bound?: unknown }).bound).toBeUndefined();
  });

  it('refuses a path whose bounds state DIFFERENT norms', () => {
    const result = boundPath([
      bridgeOf('cg-1', 'coarse-graining', bound(2, 0.1, 'relative period error')),
      bridgeOf('cg-2', 'coarse-graining', bound(3, 0.2, 'sup |x − x_reduced|')),
    ]);
    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('norm-mismatch');
  });

  it('refuses to carry a normed claim through an exact map that states no norm', () => {
    // `exact-equivalence ∘ exact-equivalence` IS a defined cell, so the
    // relation gate passes and the norm gate is what refuses.
    expect(composeRelation('exact-equivalence', 'exact-equivalence')).toBe('exact-equivalence');
    const result = boundPath([
      bridgeOf('ex-normed', 'exact-equivalence', bound(1, 0.01, 'relative period error')),
      bridgeOf('ex-bare', 'exact-equivalence', undefined),
    ]);
    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('norm-not-stated');
    expect(result.detail).toContain('ex-bare');
  });

  it('throws on an empty path rather than returning the identity', () => {
    expect(() => boundPath([])).toThrow(RangeError);
  });

  it('refuses a coarse-graining whose uniformity is null, and returns no numeric bound', () => {
    const result = boundPath([
      bridgeOf('cg-unanalysed', 'coarse-graining', bound(2, 0.1, 'relative period error', null)),
    ]);
    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('uniformity-unanalysed');
    expect(result.detail).toContain('cg-unanalysed');
    // The refusal is structural: there is no `bound` property to read at all.
    expect(Object.hasOwn(result, 'bound')).toBe(false);
    expect((result as { bound?: unknown }).bound).toBeUndefined();
  });

  it('refuses the same bridge shape when uniformity is an empty array', () => {
    const result = boundPath([
      bridgeOf('cg-empty', 'coarse-graining', bound(2, 0.1, 'relative period error', [])),
    ]);
    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('uniformity-unanalysed');
    expect(Object.hasOwn(result, 'bound')).toBe(false);
  });

  it('CONTROL: the same bridge shape with a stated scope is not uniformity-unanalysed', () => {
    // The refusal above must be able to fail. An analysed bound of the same
    // shape composes to a number; if this also returned uniformity-unanalysed,
    // the gate would be a check that cannot fail.
    const result = boundPath([
      bridgeOf('cg-analysed', 'coarse-graining', bound(2, 0.1, 'relative period error', ['stated scope'])),
    ]);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error('unreachable');
    expect(result.bound).toEqual({ K: 2, delta: 0.1 });
  });

  it('a no-composite-claim path still reports that reason when a bound is unanalysed', () => {
    // Relation is the first gate. This path fails BOTH the relation cell and
    // the uniformity check; the reported reason must stay the relation.
    expect(composeRelation('approximation', 'exact-equivalence')).toBe('no-composite-claim');
    const result = boundPath([
      bridgeOf('approx-unanalysed', 'approximation', bound(1, 0.01, 'relative period error', null)),
      bridgeOf('ex-bare', 'exact-equivalence', undefined),
    ]);
    expect(result.kind).toBe('no-claim');
    if (result.kind !== 'no-claim') throw new Error('unreachable');
    expect(result.reason).toBe('no-composite-claim');
  });
});

describe('propagateUncertainty — the optional bound is strictly additive', () => {
  const a = -3.7;
  const linear: BridgeEdge = {
    id: 'linear',
    beId: null,
    kind: 'law',
    label: 'linear',
    sources: [{ name: 'x', symbol: 'x', dim: DIMENSIONLESS, attributes: {} }],
    target: { name: 'y', symbol: 'y', dim: DIMENSIONLESS, attributes: {} },
    confidence: 'established',
    domain: { description: 'any', predicate: () => true },
    evaluate: (i) => a * i['x']!,
    citation: 'synthetic',
  };

  it('PROVES the default is unchanged: omitting opts is identical to omitting it entirely', () => {
    const before = propagateUncertainty(linear, { x: 2 }, { x: 0.5 });
    // Same call, with the new parameter explicitly absent and explicitly
    // empty. All three must agree field for field, INCLUDING the absence of
    // `bound` — a result that gained a `bound: undefined` key would break
    // `toEqual`-style pins elsewhere.
    expect(propagateUncertainty(linear, { x: 2 }, { x: 0.5 }, undefined)).toEqual(before);
    expect(propagateUncertainty(linear, { x: 2 }, { x: 0.5 }, {})).toEqual(before);
    expect(Object.hasOwn(before, 'bound')).toBe(false);
    // Relative, not absolute: the partial is a central difference and carries
    // ~1e-11 relative noise. An absolute 1e-12 pin would fail on arithmetic
    // this change does not touch.
    const expected = Math.abs(a) * 0.5;
    expect(Math.abs(before.sigma - expected) / expected).toBeLessThan(1e-9);
  });

  it('reports the statistical sigma and the deterministic delta SEPARATELY, and echoes the bound', () => {
    const b = bound(2, 3, 'relative period error');
    const plain = propagateUncertainty(linear, { x: 2 }, { x: 0.5 });
    const withBound = propagateUncertainty(linear, { x: 2 }, { x: 0.5 }, { bound: b });
    expect(withBound.value).toBe(plain.value);
    expect(withBound.partials).toEqual(plain.partials);
    expect(withBound.bound).toBe(b);

    // `sigma` is the STATISTICAL spread and nothing else: supplying a bound must not move it.
    expect(withBound.sigma).toBe(plain.sigma);
    // The deterministic bias is surfaced beside it, not folded into it.
    expect(withBound.delta).toBe(3);

    // REGRESSION PINS, both directions. This test previously asserted
    // `sigma === sqrt(plain.sigma^2 + 9)` under the comment "Quadrature, not addition" — it pinned
    // the defect as intent. Independence does not license quadrature for a BIAS: delta is a
    // deterministic sup-norm offset, not a zero-mean random variable, so the root-sum-square
    // understates the envelope exactly when the model error dominates the noise.
    expect(withBound.sigma).not.toBeCloseTo(Math.hypot(plain.sigma, 3), 6);
    // And it is not silently ADDED either — the library refuses to pick a coverage factor.
    expect(withBound.sigma).not.toBeCloseTo(plain.sigma + 3, 6);
    // K is deliberately unused: a bound differing only in K changes nothing.
    const sameDelta = propagateUncertainty(linear, { x: 2 }, { x: 0.5 }, {
      bound: bound(99, 3, 'relative period error'),
    });
    expect(sameDelta.sigma).toBe(withBound.sigma);
  });

  it('rejects a negative or non-finite delta rather than producing NaN', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        propagateUncertainty(linear, { x: 2 }, { x: 0.5 }, {
          bound: bound(1, bad, 'relative period error'),
        }),
      ).toThrow(RangeError);
    }
  });
});

describe('boundPath — the arithmetic, where a claim is actually licensed', () => {
  it('composes a single approximation edge to its own recorded bound', () => {
    const result = boundPath([AB_PENDULUM_LINEAR]);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error('unreachable');
    expect(result.relation).toBe('approximation');
    expect(result.norm).toBe('relative period error, normalized by the value of the reduced model');
    // The bridge's delta is now the EXACT relative period error at the edge of
    // its declared range, θ0 = 0.5, not the series term 0.5²/16 = 0.015625 —
    // which is 1.456% below the error it was supposed to bound. A single-edge
    // path composes to the edge's own bound, so this pin follows the record.
    expect(result.bound.K).toBe(1);
    expect(result.bound.delta).toBeCloseTo(0.0158525311014, 10);
    expect(result.bound.delta).toBeGreaterThan(0.5 ** 2 / 16);
    // NOT 0.0025: see the file header, correction 2.
    expect(result.bound.delta).not.toBeCloseTo(0.0025, 10);
    expect(result.terminal).toBe(false);
  });

  it('(K=2, δ=0.1) then (K=3, δ=0.2) composes to (6, 0.5)', () => {
    // Hand-verification of the outer-after-inner algebra, traversal order
    // [b1, b2] ⇒ composite b2 ∘ b1 = (K₂K₁, K₂δ₁ + δ₂):
    //   K = 3 · 2                = 6
    //   δ = 3 · 0.1 + 0.2 = 0.3 + 0.2 = 0.5
    // Asserted at the algebra level AND end-to-end through `boundPath`, so a
    // gate that silently reordered the fold would fail the second, not the
    // first.
    expect(composeBoundPath([{ K: 2, delta: 0.1 }, { K: 3, delta: 0.2 }])).toEqual({
      bound: { K: 6, delta: 0.5 },
      terminal: false,
    });

    const norm = 'relative period error';
    const result = boundPath([
      bridgeOf('cg-1', 'coarse-graining', bound(2, 0.1, norm)),
      bridgeOf('cg-2', 'coarse-graining', bound(3, 0.2, norm)),
    ]);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error('unreachable');
    expect(result.bound).toEqual({ K: 6, delta: 0.5 });
    expect(result.relation).toBe('coarse-graining');
    expect(result.norm).toBe(norm);
    expect(result.terminal).toBe(false);
    // Non-commutative: the reversed path is a different composite.
    const reversed = boundPath([
      bridgeOf('cg-2', 'coarse-graining', bound(3, 0.2, norm)),
      bridgeOf('cg-1', 'coarse-graining', bound(2, 0.1, norm)),
    ]);
    if (reversed.kind !== 'bound') throw new Error('unreachable');
    expect(reversed.bound).toEqual({ K: 6, delta: 0.1 + 2 * 0.2 });
  });

  it('a bound-less edge in the MIDDLE throws MissingLipschitzError', () => {
    const norm = 'relative period error';
    expect(() =>
      boundPath([
        bridgeOf('cg-1', 'coarse-graining', bound(2, 0.1, norm)),
        bridgeOf('cg-mid', 'coarse-graining', undefined),
        bridgeOf('cg-3', 'coarse-graining', bound(3, 0.2, norm)),
      ]),
    ).toThrow(MissingLipschitzError);
  });

  it('a bound-less edge LAST is allowed, and the result says terminal', () => {
    const norm = 'relative period error';
    const result = boundPath([
      bridgeOf('cg-1', 'coarse-graining', bound(2, 0.1, norm)),
      bridgeOf('cg-last', 'coarse-graining', undefined),
    ]);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error('unreachable');
    expect(result.terminal).toBe(true);
    // The bound covers the PREFIX only; nothing is claimed past the last step.
    expect(result.bound).toEqual({ K: 2, delta: 0.1 });
    expect(result.norm).toBe(norm);
  });

  it('an all-exact path is the identity, in no stated norm', () => {
    const result = boundPath([
      bridgeOf('ex-1', 'exact-equivalence', undefined),
      bridgeOf('ex-2', 'exact-equivalence', undefined),
    ]);
    expect(result.kind).toBe('bound');
    if (result.kind !== 'bound') throw new Error('unreachable');
    expect(result.bound).toEqual(IDENTITY_BOUND);
    expect(result.norm).toBeNull();
    expect(result.relation).toBe('exact-equivalence');
  });
});
