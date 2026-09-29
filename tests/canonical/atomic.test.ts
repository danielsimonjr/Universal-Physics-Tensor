/**
 * Atomic-scale derived-constant canonical entries — presence + id smoke test,
 * plus (batch 6) per-entry dimensional/scalarAst checks for the monomial law
 * added on top of the pilot's registry-wide invariants.test.ts guard.
 * Dimensional correctness is otherwise guarded registry-wide in
 * invariants.test.ts.
 *
 * `CE-compton-wavelength-full` is λ = h/(m c). The reduced wavelength stays
 * the L0 id `CE-compton-wavelength`.
 *
 * @module tests/canonical/atomic
 */
import { describe, it, expect } from 'vitest';
import { ATOMIC } from '../../src/canonical/entries/atomic.js';
import { multiply, power, equals } from '../../src/dimensional/algebra.js';
import { validate } from '../../src/dimensional/validator.js';
import type { Dimension } from '../../src/dimensional/types.js';

const EXPECTED_IDS = [
  'CE-bohr-magneton',
  // Folded in from the former l1-quantum-em batch file (2026-06-22 god-file
  // split): the quantum-domain monomials (Bohr radius already-adjacent).
  'CE-bohr-radius',
  'CE-classical-electron-radius',
  'CE-compton-wavelength-full',
  'CE-de-broglie',
  'CE-planck-einstein',
  'CE-rydberg-energy',
  'CE-thomson-cross-section',
  // Sprint 3 poster entry 4 (ROADMAP Phase 3).
  'CE-uncertainty-principle',
];

const BATCH_6_IDS = new Set(['CE-thomson-cross-section']);

describe('ATOMIC canonical entries', () => {
  it('has the atomic derived-constant set', () => {
    expect(ATOMIC.length).toBe(EXPECTED_IDS.length);
    expect(ATOMIC.map((e) => e.id).sort()).toEqual(EXPECTED_IDS);
  });

  it('the batch-6 law is a dimensionally unique monomial (0 free groups)', () => {
    for (const e of ATOMIC) {
      if (!BATCH_6_IDS.has(e.id)) continue;
      expect(e.freeDimensionlessGroups, e.id).toBe(0);
      expect(e.dimensional.monomial, e.id).not.toBeNull();
    }
  });

  it("the batch-6 monomial reproduces the target's dimension", () => {
    for (const e of ATOMIC) {
      if (!BATCH_6_IDS.has(e.id)) continue;
      const gov = new Map(e.dimensional.governing.map((g) => [g.name, g.dim]));
      let acc: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
      for (const [name, exp] of Object.entries(e.dimensional.monomial!)) {
        acc = multiply(acc, power(gov.get(name)!, exp));
      }
      expect(equals(acc, e.dimensional.target.dim), e.id).toBe(true);
    }
  });

  it('the batch-6 entry carries a scalarAst that validates to its target dimension', () => {
    for (const e of ATOMIC) {
      if (!BATCH_6_IDS.has(e.id)) continue;
      expect(e.scalarAst, e.id).toBeDefined();
      const res = validate(e.scalarAst!);
      expect(res.ok, e.id).toBe(true);
      expect(res.inferredDimension, e.id).toBeDefined();
      expect(equals(res.inferredDimension!, e.dimensional.target.dim), e.id).toBe(true);
    }
  });

  it('the batch-6 entry cites at least one reference and has assumptions', () => {
    for (const e of ATOMIC) {
      if (!BATCH_6_IDS.has(e.id)) continue;
      expect(e.references.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.assumptions.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.domain, e.id).toBe('quantum');
    }
  });
});
