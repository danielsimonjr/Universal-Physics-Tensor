/**
 * S3.1 — `Statement`, `Derivation`, and multicategory composition.
 *
 * The load-bearing tests here are the REFUSALS, not the successful compose.
 * Design note `docs/planning/Atlas-Phase-3-Design.md` §0 names hyperedge
 * composition as the operation that can silently produce a false claim, and §9
 * question 5 asks specifically whether `contextUnion`'s refusal path is
 * reachable at all or is "dead code that LOOKS like a safeguard".
 *
 * Every guard in `statement.ts` and `derivation.ts` is therefore driven to
 * FIRE by a test in this file, and each was additionally verified by breaking
 * the guard and confirming the test went red (see the S3.1 report). A test
 * that can only pass certifies the defect as intent.
 */
import { describe, expect, it } from 'vitest';

import {
  contextUnion,
  statementContextUnion,
} from '../../src/atlas/statement.js';
import type { Context, Statement, StatementId } from '../../src/atlas/statement.js';
import {
  composeDerivations,
  composeDerivationsOrThrow,
  DerivationCompositionError,
  makeDerivation,
} from '../../src/atlas/derivation.js';
import type { Derivation } from '../../src/atlas/derivation.js';
import type { RelationType } from '../../src/atlas/types.js';

function ctx(over: Partial<Context> = {}): Context {
  return { assumptions: [], excludes: [], ...over };
}

function statement(id: StatementId, context: Context = ctx()): Statement {
  return {
    id,
    context,
    model: 'model-spring',
    sourceExpression: `expr(${id})`,
    display: id,
  };
}

function registryOf(...statements: readonly Statement[]): ReadonlyMap<StatementId, Statement> {
  return new Map(statements.map((s) => [s.id, s]));
}

/** The §0 worked example: `D1: {A, B} ⊢ C` and `D2: {C, E} ⊢ F`. */
const ABCEF = registryOf(
  statement('A'),
  statement('B'),
  statement('C'),
  statement('E'),
  statement('F'),
);

function derivation(
  id: string,
  premises: readonly StatementId[],
  conclusion: StatementId,
  relation: RelationType = 'derivation',
  registry: ReadonlyMap<StatementId, Statement> = ABCEF,
): Derivation {
  return makeDerivation(
    { id, relation, premises, conclusion, sideConditions: [] },
    registry,
  );
}

describe('Statement', () => {
  it('carries a claim with no ast — the hidden supporting nodes (§1)', () => {
    const noether = statement('statement-noether');
    expect(noether.ast).toBeUndefined();
    expect(noether.sourceExpression).toBeTruthy();
  });

  it('distinguishes two statements that render identically but differ in context', () => {
    const lorenz = statement('s-lorenz', ctx({ gauge: 'Lorenz' }));
    const coulomb = statement('s-coulomb', ctx({ gauge: 'Coulomb' }));
    expect(lorenz.display).not.toBe(coulomb.display); // ids differ here…
    // …but the point is the contexts do not pool, which a string comparison
    // of `sourceExpression` would never reveal.
    expect(contextUnion([lorenz.context, coulomb.context]).kind).toBe('no-union');
  });
});

describe('contextUnion — checked, never computed', () => {
  it('pools compatible contexts and merges conventions by KEY', () => {
    const result = contextUnion([
      ctx({ conventions: { unitSystem: 'SI' }, assumptions: ['isolated system'] }),
      ctx({ conventions: { metricSignature: '-+++' }, assumptions: ['autonomous'] }),
    ]);
    expect(result.kind).toBe('union');
    if (result.kind !== 'union') return;
    expect(result.context.conventions).toEqual({
      unitSystem: 'SI',
      metricSignature: '-+++',
    });
    expect(result.context.assumptions).toEqual(['isolated system', 'autonomous']);
  });

  it('REFUSES a convention conflict', () => {
    const result = contextUnion([
      ctx({ conventions: { metricSignature: '-+++' } }),
      ctx({ conventions: { metricSignature: '+---' } }),
    ]);
    expect(result.kind).toBe('no-union');
    if (result.kind !== 'no-union') return;
    expect(result.reason).toBe('convention-conflict');
    expect(result.detail).toContain('metricSignature');
  });

  it('an ABSENT declaration is unknown, never a mismatch (checkConventions contract)', () => {
    const result = contextUnion([
      ctx({ conventions: { metricSignature: '-+++' } }),
      ctx({ conventions: { unitSystem: 'SI' } }),
      ctx(),
    ]);
    expect(result.kind).toBe('union');
  });

  it('REFUSES contradictory assumptions (Blueprint v2 §5.2 step 2)', () => {
    const result = contextUnion([
      ctx({ assumptions: ['weak field'] }),
      ctx({ assumptions: ['strong field'], excludes: ['weak field'] }),
    ]);
    expect(result.kind).toBe('no-union');
    if (result.kind !== 'no-union') return;
    expect(result.reason).toBe('contradictory-assumptions');
    expect(result.detail).toContain('weak field');
  });

  it('an exclusion nobody states is not a contradiction', () => {
    const result = contextUnion([
      ctx({ assumptions: ['weak field'] }),
      ctx({ assumptions: ['slow motion'], excludes: ['relativistic'] }),
    ]);
    expect(result.kind).toBe('union');
  });

  it('REFUSES two declared gauges, and tolerates one declared + one silent', () => {
    expect(
      contextUnion([ctx({ gauge: 'Lorenz' }), ctx({ gauge: 'Coulomb' })]).kind,
    ).toBe('no-union');
    expect(contextUnion([ctx({ gauge: 'Lorenz' }), ctx()]).kind).toBe('union');
  });

  it('REFUSES two declared frames', () => {
    const result = contextUnion([ctx({ frame: 'comoving' }), ctx({ frame: 'lab' })]);
    expect(result.kind).toBe('no-union');
    if (result.kind !== 'no-union') return;
    expect(result.reason).toBe('choice-conflict');
    expect(result.detail).toContain('frame');
  });

  it('a refusal has NO context to read off it (the type is the guard)', () => {
    const result = contextUnion([
      ctx({ conventions: { unitSystem: 'SI' } }),
      ctx({ conventions: { unitSystem: 'gaussian' } }),
    ]);
    expect(Object.hasOwn(result, 'context')).toBe(false);
  });

  it('throws on an empty list — a union over nothing states nothing', () => {
    expect(() => contextUnion([])).toThrow(RangeError);
  });

  it('statementContextUnion throws on an unresolved id rather than narrowing', () => {
    expect(() => statementContextUnion(['A', 'nope'], ABCEF)).toThrow(RangeError);
  });
});

describe('multicategory composition — the §0 invariant', () => {
  it('D1: {A, B} ⊢ C composed with D2: {C, E} ⊢ F yields {A, B, E} ⊢ F', () => {
    const d1 = derivation('D1', ['A', 'B'], 'C');
    const d2 = derivation('D2', ['C', 'E'], 'F');
    const result = composeDerivations('D12', d1, d2, ABCEF);
    expect(result.kind).toBe('composite');
    if (result.kind !== 'composite') return;
    expect(result.derivation.premises).toEqual(['A', 'B', 'E']);
    expect(result.derivation.conclusion).toBe('F');
    expect(result.derivation.relation).toBe('derivation');
  });

  it('the internal conclusion leaves the premises even when BOTH sides list it', () => {
    const d1 = derivation('D1', ['A', 'B'], 'C');
    const d2 = derivation('D2', ['C', 'A'], 'F');
    const result = composeDerivations('D12', d1, d2, ABCEF);
    expect(result.kind).toBe('composite');
    if (result.kind !== 'composite') return;
    expect(result.derivation.premises).toEqual(['A', 'B']);
  });

  it('REFUSES when D2 does not consume C', () => {
    const d1 = derivation('D1', ['A', 'B'], 'C');
    const d2 = derivation('D2', ['E'], 'F');
    const result = composeDerivations('D12', d1, d2, ABCEF);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('not-consumed');
    expect(Object.hasOwn(result, 'derivation')).toBe(false);
  });

  it('the throwing wrapper throws exactly that refusal', () => {
    const d1 = derivation('D1', ['A', 'B'], 'C');
    const d2 = derivation('D2', ['E'], 'F');
    expect(() => composeDerivationsOrThrow('D12', d1, d2, ABCEF)).toThrow(
      DerivationCompositionError,
    );
    try {
      composeDerivationsOrThrow('D12', d1, d2, ABCEF);
      expect.unreachable('composition should have refused');
    } catch (e) {
      expect((e as DerivationCompositionError).reason).toBe('not-consumed');
    }
  });

  it('a hyperedge cannot launder a pair the binary table refuses (§3)', () => {
    // `approximation ∘ derivation` is one of the silent cells (pinned in composition-table.test.ts).
    const d1 = derivation('D1', ['A', 'B'], 'C', 'approximation');
    const d2 = derivation('D2', ['C', 'E'], 'F', 'derivation');
    const result = composeDerivations('D12', d1, d2, ABCEF);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('no-composite-claim');
  });

  it('carries the relation the TABLE gives, not the first input', () => {
    // `exact-equivalence ∘ restriction` is `restriction`.
    const d1 = derivation('D1', ['A', 'B'], 'C', 'exact-equivalence');
    const d2 = derivation('D2', ['C', 'E'], 'F', 'restriction');
    const result = composeDerivations('D12', d1, d2, ABCEF);
    expect(result.kind).toBe('composite');
    if (result.kind !== 'composite') return;
    expect(result.derivation.relation).toBe('restriction');
  });

  it('REFUSES a composite whose statements have a convention conflict', () => {
    const registry = registryOf(
      statement('A', ctx({ conventions: { unitSystem: 'SI' } })),
      statement('B'),
      statement('C'),
      statement('E', ctx({ conventions: { unitSystem: 'gaussian' } })),
      statement('F'),
    );
    const d1 = derivation('D1', ['A', 'B'], 'C', 'derivation', registry);
    const d2 = derivation('D2', ['C', 'E'], 'F', 'derivation', registry);
    expect(d1.contextUnion.kind).toBe('union');
    expect(d2.contextUnion.kind).toBe('union');
    // Each half pools; only the COMPOSITE crosses A against E. This is the
    // case a per-derivation check alone would miss.
    const result = composeDerivations('D12', d1, d2, registry);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('no-context-union');
    expect(result.detail).toContain('unitSystem');
  });

  it('checks the CONCLUSION and the internal statement, not only the surviving premises', () => {
    // `F` is `second`'s conclusion: it is in neither half's own union check
    // against `A`, and it is NOT one of the composite's premises either. A
    // union taken over the surviving premises alone would pool this, which is
    // the mutation this test exists to kill.
    const registry = registryOf(
      statement('A', ctx({ conventions: { unitSystem: 'SI' } })),
      statement('B'),
      statement('C'),
      statement('E'),
      statement('F', ctx({ conventions: { unitSystem: 'gaussian' } })),
    );
    const d1 = derivation('D1', ['A', 'B'], 'C', 'derivation', registry);
    const d2 = derivation('D2', ['C', 'E'], 'F', 'derivation', registry);
    expect(d1.contextUnion.kind).toBe('union');
    expect(d2.contextUnion.kind).toBe('union');
    const result = composeDerivations('D12', d1, d2, registry);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('no-context-union');
  });

  it('REFUSES a composite with contradictory assumptions', () => {
    const registry = registryOf(
      statement('A', ctx({ assumptions: ['weak field'] })),
      statement('B'),
      statement('C'),
      statement('E', ctx({ assumptions: ['strong field'], excludes: ['weak field'] })),
      statement('F'),
    );
    const d1 = derivation('D1', ['A', 'B'], 'C', 'derivation', registry);
    const d2 = derivation('D2', ['C', 'E'], 'F', 'derivation', registry);
    const result = composeDerivations('D12', d1, d2, registry);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('no-context-union');
    expect(result.detail).toContain('contradictory-assumptions');
  });

  it('an input that already states no claim does not compose', () => {
    const registry = registryOf(
      statement('A', ctx({ gauge: 'Lorenz' })),
      statement('B', ctx({ gauge: 'Coulomb' })),
      statement('C'),
      statement('E'),
      statement('F'),
    );
    const d1 = derivation('D1', ['A', 'B'], 'C', 'derivation', registry);
    expect(d1.contextUnion.kind).toBe('no-union');
    const d2 = derivation('D2', ['C', 'E'], 'F', 'derivation', registry);
    const result = composeDerivations('D12', d1, d2, registry);
    expect(result.kind).toBe('no-composite');
    if (result.kind !== 'no-composite') return;
    expect(result.reason).toBe('input-states-no-claim');
  });
});

describe('makeDerivation', () => {
  it('checks the conclusion context too, not only the premises', () => {
    const registry = registryOf(
      statement('A', ctx({ frame: 'lab' })),
      statement('C', ctx({ frame: 'comoving' })),
    );
    const d = makeDerivation(
      { id: 'D', relation: 'derivation', premises: ['A'], conclusion: 'C', sideConditions: [] },
      registry,
    );
    expect(d.contextUnion.kind).toBe('no-union');
  });
});
