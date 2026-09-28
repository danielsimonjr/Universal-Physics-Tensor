/**
 * The composition table is a conservative UNDER-approximation of Blueprint v2
 * §4.2. Its authority is `docs/planning/Atlas-Phase-1-Design.md` §2.1–§2.2,
 * which differs from the implementation plan in two cells; where the two
 * disagree, the design note wins.
 *
 * Two kinds of assertion are made here and BOTH are needed. The per-cell
 * assertions catch a SWAP: when the design was revised, one cell was removed
 * and another added, and the count of silent cells stayed 56 throughout. A
 * count-only test would have passed through that revision without noticing.
 * The count assertion catches the opposite failure — silent widening of the
 * table by a cell nobody named.
 *
 * The ninth cell, pproximation ∘ exact-equivalence = approximation, was added
 * by the reviewed act of docs/planning/ADR-transported-norm-composition.md: the
 * count went from 56 to 55 and the new cell is asserted on its own below.
 */
import { describe, it, expect } from 'vitest';
import {
  COMPOSITION_TABLE,
  composeRelation,
} from '../../src/atlas/composition-table.js';
import type { RelationType } from '../../src/atlas/types.js';

const RELATION_TYPES = Object.keys(COMPOSITION_TABLE) as RelationType[];

describe('composeRelation — the eight defined cells (design note §2.1)', () => {
  it('exact-equivalence ∘ exact-equivalence = exact-equivalence', () => {
    expect(composeRelation('exact-equivalence', 'exact-equivalence')).toBe(
      'exact-equivalence',
    );
  });

  it('derivation ∘ derivation = derivation', () => {
    expect(composeRelation('derivation', 'derivation')).toBe('derivation');
  });

  it('exact-equivalence ∘ derivation = derivation', () => {
    expect(composeRelation('exact-equivalence', 'derivation')).toBe(
      'derivation',
    );
  });

  it('derivation ∘ exact-equivalence = derivation', () => {
    expect(composeRelation('derivation', 'exact-equivalence')).toBe(
      'derivation',
    );
  });

  it('coarse-graining ∘ coarse-graining = coarse-graining', () => {
    expect(composeRelation('coarse-graining', 'coarse-graining')).toBe(
      'coarse-graining',
    );
  });

  it('restriction ∘ restriction = restriction', () => {
    expect(composeRelation('restriction', 'restriction')).toBe('restriction');
  });

  it('exact-equivalence ∘ restriction = restriction', () => {
    expect(composeRelation('exact-equivalence', 'restriction')).toBe(
      'restriction',
    );
  });

  it('restriction ∘ exact-equivalence = restriction', () => {
    expect(composeRelation('restriction', 'exact-equivalence')).toBe(
      'restriction',
    );
  });
});

describe('composeRelation — cells where the design note overrides the implementation plan', () => {
  // Design note §0: K = 1 for an exact equivalence holds only in the norm that
  // bridge states. With the exact edge first, the approximation's norm would have
  // to be pulled back through the map, which the ADR on transported norms leaves
  // undefined (its §3). The plan's brief says 'approximation'; it is wrong.
  it('exact-equivalence ∘ approximation is silent, not approximation (§0)', () => {
    expect(composeRelation('exact-equivalence', 'approximation')).toBe(
      'no-composite-claim',
    );
  });

  // The table cell is a pure function of relation types. Whether a given route
  // carries a bound is decided by boundPath, which needs a declared norm
  // transport on the exact bridge (ADR-transported-norm-composition.md).
  it('approximation ∘ exact-equivalence = approximation (ADR, transported norm)', () => {
    expect(composeRelation('approximation', 'exact-equivalence')).toBe(
      'approximation',
    );
  });

  // Design note §2.2 item 5: analogy is not transitive — shared structure
  // dilutes across a chain.
  it('structural-analogy ∘ structural-analogy is silent, not structural-analogy (§2.2.5)', () => {
    expect(composeRelation('structural-analogy', 'structural-analogy')).toBe(
      'no-composite-claim',
    );
  });
});

describe('composeRelation — the conservative reading of Blueprint v2 §4.2', () => {
  it('pins 55 of 64 cells as no-composite-claim (design note §2.2, ADR transported norm)', () => {
    // 64 − 9 defined. The authority is docs/planning/Atlas-Phase-1-Design.md;
    // widening the table must be a reviewed change, not a silent one.
    let silent = 0;
    for (const first of RELATION_TYPES) {
      for (const second of RELATION_TYPES) {
        if (composeRelation(first, second) === 'no-composite-claim') silent++;
      }
    }
    expect(silent).toBe(55);
  });

  it('covers all 64 ordered pairs of the eight relation types', () => {
    expect(RELATION_TYPES).toHaveLength(8);
    for (const first of RELATION_TYPES) {
      for (const second of RELATION_TYPES) {
        expect(composeRelation(first, second)).toBeTypeOf('string');
      }
    }
  });
});
