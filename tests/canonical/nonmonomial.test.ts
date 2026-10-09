/**
 * L1-sum-tier entries (pilot: `CE-bernoulli`, `CE-radioactive-decay`, …; hard
 * backlog: `CE-lorentz-factor`, `CE-compton-shift`, `CE-rydberg-formula`,
 * `CE-snell-law`, `CE-malus-law`) — per-entry checks: `monomial === null` with
 * `freeDimensionlessGroups >= 1` (dimensionally underdetermined — the classic
 * non-monomial state), the exact form carried in `scalarAst` (which validates
 * to the target dimension), each Bernoulli summand shares the pressure
 * dimension, the decay exp-arg dimensionless, plus targeted checks for the
 * hard-backlog transcendental args (Compton's cos-arg, Rydberg's two 1/n²
 * terms, Malus's cos² factor).
 *
 * @module tests/canonical/nonmonomial
 */
import { describe, it, expect } from 'vitest';
import { NONMONOMIAL } from '../../src/canonical/entries/nonmonomial.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { validate } from '../../src/dimensional/validator.js';
import { equals } from '../../src/dimensional/algebra.js';
import { evalExpr } from '../../src/composition/expr-eval.js';
import { canonicalPrefactor } from '../../src/composition/canonical-prefactors.js';

describe('NONMONOMIAL pilot entries', () => {
  it('all non-monomial entries are registered', () => {
    expect(NONMONOMIAL.length).toBe(13);
    const ids = NONMONOMIAL.map((e) => e.id);
    for (const id of [
      'CE-bernoulli',
      'CE-radioactive-decay',
      'CE-photoelectric',
      'CE-carnot-efficiency',
      'CE-boltzmann-factor',
      'CE-lorentz-factor',
      'CE-compton-shift',
      'CE-rydberg-formula',
      'CE-snell-law',
      'CE-malus-law',
      // Sprint 3 poster entries 1, 2 and 13 (ROADMAP Phase 3).
      'CE-first-law-thermodynamics',
      'CE-boltzmann-entropy',
      'CE-normal-distribution',
    ]) {
      expect(ids, id).toContain(id);
    }
    for (const e of NONMONOMIAL) {
      expect(canonicalById(e.id), e.id).toBeDefined();
    }
  });

  for (const e of NONMONOMIAL) {
    it(`${e.id}: monomial === null with freeGroups >= 1, but carries a scalarAst`, () => {
      // Dimensionally underdetermined (no single monomial), so monomial:null and
      // freeGroups >= 1 — the classic F1-consistent state. The exact form is not
      // lost: it lives in the scalarAst (asserted below).
      expect(e.dimensional.monomial).toBeNull();
      expect(e.freeDimensionlessGroups).toBeGreaterThanOrEqual(1);
      expect(e.scalarAst).toBeDefined();
    });

    it(`${e.id}: scalarAst validates to the declared target dimension`, () => {
      expect(e.scalarAst).toBeDefined();
      const res = validate(e.scalarAst!);
      expect(res.ok, JSON.stringify(res)).toBe(true);
      expect(res.inferredDimension).toBeDefined();
      expect(equals(res.inferredDimension!, e.dimensional.target.dim)).toBe(true);
    });
  }

  it('Bernoulli: each summand independently validates to the pressure dimension', () => {
    const bernoulli = canonicalById('CE-bernoulli')!;
    const rhs = bernoulli.scalarAst!;
    expect(rhs.kind).toBe('op');
    if (rhs.kind !== 'op') throw new Error('unreachable');
    expect(rhs.op).toBe('+');
    expect(rhs.args.length).toBe(3);
    for (const summand of rhs.args) {
      const res = validate(summand);
      expect(res.ok, JSON.stringify(res)).toBe(true);
      expect(equals(res.inferredDimension!, bernoulli.dimensional.target.dim)).toBe(true);
    }
  });

  it('radioactive decay: the exp argument (λt) is dimensionless', () => {
    const decay = canonicalById('CE-radioactive-decay')!;
    const rhs = decay.scalarAst!;
    expect(rhs.kind).toBe('op');
    if (rhs.kind !== 'op') throw new Error('unreachable');
    const expNode = rhs.args.find((a) => a.kind === 'transcendental');
    expect(expNode).toBeDefined();
    if (!expNode || expNode.kind !== 'transcendental') throw new Error('unreachable');
    expect(expNode.fn).toBe('exp');
    const argRes = validate(expNode.arg);
    expect(argRes.ok, JSON.stringify(argRes)).toBe(true);
    expect(
      equals(argRes.inferredDimension!, {
        L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0,
      }),
    ).toBe(true);
  });

  it("Compton shift: the cos argument (scattering angle) is dimensionless", () => {
    const compton = canonicalById('CE-compton-shift')!;
    const rhs = compton.scalarAst!;
    expect(rhs.kind).toBe('op');
    if (rhs.kind !== 'op') throw new Error('unreachable');
    const factor = rhs.args.find((a) => a.kind === 'op' && a.op === '-');
    expect(factor).toBeDefined();
    if (!factor || factor.kind !== 'op') throw new Error('unreachable');
    const cosNode = factor.args.find((a) => a.kind === 'transcendental');
    expect(cosNode).toBeDefined();
    if (!cosNode || cosNode.kind !== 'transcendental') throw new Error('unreachable');
    expect(cosNode.fn).toBe('cos');
    const argRes = validate(cosNode.arg);
    expect(argRes.ok, JSON.stringify(argRes)).toBe(true);
    expect(argRes.inferredDimension).toBeDefined();
    expect(
      equals(argRes.inferredDimension!, { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 }),
    ).toBe(true);
  });

  it('Rydberg formula: both 1/n² terms are dimensionless', () => {
    const rydberg = canonicalById('CE-rydberg-formula')!;
    const rhs = rydberg.scalarAst!;
    expect(rhs.kind).toBe('op');
    if (rhs.kind !== 'op') throw new Error('unreachable');
    const diff = rhs.args.find((a) => a.kind === 'op' && a.op === '-');
    expect(diff).toBeDefined();
    if (!diff || diff.kind !== 'op') throw new Error('unreachable');
    expect(diff.args.length).toBe(2);
    for (const term of diff.args) {
      const res = validate(term);
      expect(res.ok, JSON.stringify(res)).toBe(true);
      expect(res.inferredDimension).toBeDefined();
      expect(
        equals(res.inferredDimension!, { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 }),
      ).toBe(true);
    }
  });

  it("Malus's law: the cos² factor is dimensionless", () => {
    const malus = canonicalById('CE-malus-law')!;
    const rhs = malus.scalarAst!;
    expect(rhs.kind).toBe('op');
    if (rhs.kind !== 'op') throw new Error('unreachable');
    const cosSquared = rhs.args.find((a) => a.kind === 'op' && a.op === '^');
    expect(cosSquared).toBeDefined();
    if (!cosSquared) throw new Error('unreachable');
    const res = validate(cosSquared);
    expect(res.ok, JSON.stringify(res)).toBe(true);
    expect(res.inferredDimension).toBeDefined();
    expect(
      equals(res.inferredDimension!, { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 }),
    ).toBe(true);
  });
});

describe('CE-normal-distribution: one numeric point of the whole density', () => {
  // p(x) = e^{-(x-μ)²/(2σ²)} / (σ √(2π)). At x − μ = 1, σ = 1 the exponential is e^{-1/2}.
  // An AST that divides by σ² alone gives e^{-1}, a different function, not a prefactor.
  const entry = canonicalById('CE-normal-distribution')!;
  const point = { 'standard-deviation': 1, 'deviation-from-mean': 1 };

  it('the AST carries the ½ inside the exponent: e^{-1/2} at (x−μ, σ) = (1, 1)', () => {
    expect(evalExpr(entry.scalarAst!, point)).toBeCloseTo(Math.exp(-0.5), 12);
  });

  it('the sourced prefactor is 1/√(2π), so the whole density is 0.24197 at that point', () => {
    expect(canonicalPrefactor(entry.id)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 15);
    const density = canonicalPrefactor(entry.id)! * evalExpr(entry.scalarAst!, point);
    expect(density).toBeCloseTo(Math.exp(-0.5) / Math.sqrt(2 * Math.PI), 12);
    expect(density).toBeCloseTo(0.24197072451914337, 12);
  });

  it('control: the density at (2, 1) is e^{-2}/√(2π), so a σ instead of a 2σ² would be caught there too', () => {
    const at2 = canonicalPrefactor(entry.id)! * evalExpr(entry.scalarAst!, { ...point, 'deviation-from-mean': 2 });
    expect(at2).toBeCloseTo(Math.exp(-2) / Math.sqrt(2 * Math.PI), 12);
  });
});
