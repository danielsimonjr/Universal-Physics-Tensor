/**
 * Registry-wide invariants + OPEN-bridge coverage (Task 7, review findings
 * F1/F2/F4). These guard the whole `CANONICAL_EQUATIONS` set, not one entry.
 *
 * @module tests/canonical/invariants
 */
import { describe, it, expect } from 'vitest';
import {
  CANONICAL_EQUATIONS,
  partneredBridgeIds,
  bridgesWithoutCanonicalPartner,
} from '../../src/canonical/registry.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { multiply, power, equals } from '../../src/dimensional/algebra.js';
import { validate } from '../../src/dimensional/validator.js';
import type { Dimension } from '../../src/dimensional/types.js';

const CATALOG_IDS = new Set(BRIDGE_EQUATIONS.map((b) => String(b.id)));

describe('canonical registry invariants', () => {
  it('every determinate monomial reproduces its target dimension (F1)', () => {
    for (const e of CANONICAL_EQUATIONS) {
      const mono = e.dimensional.monomial;
      if (mono === null) continue; // underdetermined (free dimensionless group)
      const gov = new Map(e.dimensional.governing.map((g) => [g.name, g.dim]));
      let acc: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
      for (const [name, exp] of Object.entries(mono)) {
        const d = gov.get(name);
        expect(d, `${e.id}: monomial references unknown governing '${name}'`).toBeDefined();
        acc = multiply(acc, power(d!, exp));
      }
      expect(equals(acc, e.dimensional.target.dim), e.id).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = CANONICAL_EQUATIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry cites at least one reference', () => {
    for (const e of CANONICAL_EQUATIONS) {
      expect(e.references.length, e.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('partnerBridges / restatesBridge reference real catalog bridges (F4)', () => {
    for (const e of CANONICAL_EQUATIONS) {
      for (const b of e.partnerBridges) {
        expect(CATALOG_IDS.has(b), `${e.id} → partner ${b}`).toBe(true);
      }
      if (e.restatesBridge) {
        expect(
          CATALOG_IDS.has(e.restatesBridge),
          `${e.id} → restates ${e.restatesBridge}`,
        ).toBe(true);
      }
    }
  });

  it('partner/restates ids are bare numeric strings (F4 authoring guard)', () => {
    // A non-numeric form like "BE-21" would silently demote restates-canonical
    // to recovers in the linkage F4 guard (String(bridgeId) is "21").
    for (const e of CANONICAL_EQUATIONS) {
      if (e.restatesBridge) {
        expect(/^\d+$/.test(e.restatesBridge), `${e.id} restates`).toBe(true);
      }
      for (const b of e.partnerBridges) {
        expect(/^\d+$/.test(b), `${e.id} partner ${b}`).toBe(true);
      }
    }
  });

  it('L0 fields are self-consistent: monomial !== null ⟺ freeGroups === 0 (F1)', () => {
    for (const e of CANONICAL_EQUATIONS) {
      expect(e.dimensional.monomial !== null, e.id).toBe(
        e.freeDimensionlessGroups === 0,
      );
    }
  });

  it('a scalar-AST means the status is at least scalar-up-to-constant (F1)', () => {
    for (const e of CANONICAL_EQUATIONS) {
      if (e.scalarAst) {
        expect(e.epistemicStatus, e.id).not.toBe('dimensional');
      }
    }
  });

  it('every scalar-AST validates to its declared target dimension (F1)', () => {
    // Registry-wide form of the per-entry check the former l1-*.test.ts files
    // ran on their batches. The explicit AST is fully determined even when the
    // Buckingham monomial is underdetermined (free dimensionless group), so it
    // must reproduce the target dimension regardless of `freeDimensionlessGroups`.
    // Compare via `equals` (the codebase dimension predicate), not `toEqual`:
    // a negated/divided AST can yield a signed-zero exponent (-0), which is the
    // same dimension but trips `toEqual`'s Object.is semantics.
    for (const e of CANONICAL_EQUATIONS) {
      if (!e.scalarAst) continue;
      const res = validate(e.scalarAst);
      expect(res.ok, e.id).toBe(true);
      expect(res.inferredDimension, e.id).toBeDefined();
      expect(equals(res.inferredDimension!, e.dimensional.target.dim), e.id).toBe(true);
    }
  });
});

describe('OPEN-bridge coverage (F2 — gaps are logged, not silent)', () => {
  it('the partnered set is exactly the current correspondences', () => {
    expect([...partneredBridgeIds()].sort()).toEqual([
      '12',
      '13',
      '16',
      '29',
      '41',
      '42',
      '51',
      '52',
    ]);
  });

  it('un-partnered catalog bridges are enumerated and the count is pinned', () => {
    const gap = bridgesWithoutCanonicalPartner();
    // 58 catalog bridges − 8 partnered. Shrinking this is a deliberate act
    // (add a canonical partner, then update this number). Most remaining gap
    // bridges are SPECULATIVE — they correctly have no standard-physics partner.
    expect(gap.length).toBe(50);
    // every gap id is a real catalog id (and none is partnered)
    const partnered = partneredBridgeIds();
    for (const id of gap) {
      expect(CATALOG_IDS.has(id)).toBe(true);
      expect(partnered.has(id)).toBe(false);
    }
  });
});
