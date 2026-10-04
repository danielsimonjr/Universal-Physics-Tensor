/**
 * Condensed-matter canonical entries (PILOT batch of the L-layer expansion):
 * Drude transport (mobility/conductivity/resistivity/Hall/drift velocity), and
 * the Fermi-gas + collective-frequency √-laws. Each must be a unique
 * dimensional monomial (0 free groups) whose monomial reproduces the target
 * dimension.
 *
 * Cyclotron frequency (`ω_c = qB/m`) was in the pilot brief's 10 but is
 * omitted — it duplicates the pre-existing `CE-cyclotron-frequency` in
 * `electromagnetism.ts`.
 *
 * @module tests/canonical/condensed-matter
 */
import { describe, it, expect } from 'vitest';
import { CONDENSED_MATTER } from '../../src/canonical/entries/condensed-matter.js';
import { multiply, power, equals } from '../../src/dimensional/algebra.js';
import { validate } from '../../src/dimensional/validator.js';
import type { Dimension } from '../../src/dimensional/types.js';

const EXPECTED_IDS = [
  'CE-carrier-mobility',
  'CE-debye-frequency',
  'CE-drift-velocity',
  'CE-drude-resistivity',
  'CE-electrical-conductivity',
  'CE-fermi-energy',
  'CE-fermi-velocity',
  'CE-hall-coefficient',
  'CE-plasma-frequency',
];

const SCALAR_AST_IDS = new Set([
  'CE-carrier-mobility',
  'CE-electrical-conductivity',
  'CE-drude-resistivity',
  'CE-hall-coefficient',
  'CE-drift-velocity',
  'CE-plasma-frequency',
]);

const DIMENSIONAL_ONLY_IDS = new Set([
  'CE-fermi-energy',
  'CE-fermi-velocity',
  'CE-debye-frequency',
]);

describe('CONDENSED_MATTER canonical entries', () => {
  it('has the full pilot batch of 10 entries', () => {
    expect(CONDENSED_MATTER.length).toBe(EXPECTED_IDS.length);
    expect(CONDENSED_MATTER.map((e) => e.id).sort()).toEqual(EXPECTED_IDS);
  });

  it('every entry is a dimensionally unique monomial (0 free groups)', () => {
    for (const e of CONDENSED_MATTER) {
      expect(e.freeDimensionlessGroups, e.id).toBe(0);
      expect(e.dimensional.monomial, e.id).not.toBeNull();
    }
  });

  it("each determinate monomial reproduces the target's dimension", () => {
    for (const e of CONDENSED_MATTER) {
      const gov = new Map(e.dimensional.governing.map((g) => [g.name, g.dim]));
      let acc: Dimension = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
      for (const [name, exp] of Object.entries(e.dimensional.monomial!)) {
        acc = multiply(acc, power(gov.get(name)!, exp));
      }
      expect(equals(acc, e.dimensional.target.dim), e.id).toBe(true);
    }
  });

  it('the 6 fully-quantitative laws carry a scalarAst', () => {
    for (const e of CONDENSED_MATTER) {
      if (SCALAR_AST_IDS.has(e.id)) {
        expect(e.scalarAst, e.id).toBeDefined();
        expect(e.epistemicStatus, e.id).toBe('fully-quantitative');
      }
    }
    expect(
      CONDENSED_MATTER.filter((e) => e.scalarAst).map((e) => e.id).sort(),
    ).toEqual([...SCALAR_AST_IDS].sort());
  });

  it('the 3 proportionalities omit scalarAst and are dimensional-only', () => {
    for (const e of CONDENSED_MATTER) {
      if (DIMENSIONAL_ONLY_IDS.has(e.id)) {
        expect(e.scalarAst, e.id).toBeUndefined();
        expect(e.epistemicStatus, e.id).toBe('dimensional');
      }
    }
  });

  it('every scalarAst validates to its declared target dimension', () => {
    for (const e of CONDENSED_MATTER) {
      if (!e.scalarAst) continue;
      const res = validate(e.scalarAst);
      expect(res.ok, e.id).toBe(true);
      expect(res.inferredDimension, e.id).toBeDefined();
      expect(equals(res.inferredDimension!, e.dimensional.target.dim), e.id).toBe(true);
    }
  });

  it('every entry cites at least one reference and has assumptions', () => {
    for (const e of CONDENSED_MATTER) {
      expect(e.references.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.assumptions.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.domain, e.id).toBe('condensed-matter');
    }
  });
});
