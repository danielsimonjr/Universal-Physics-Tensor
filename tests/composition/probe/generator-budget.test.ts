/**
 * The native monomial generator honours its budget and builds exactly the
 * monomial it is given. Each empty or refused result is paired with the same
 * problem under the default budget, which does yield candidates, so the
 * emptiness is caused by the cap under test and not by the problem.
 */
import { describe, it, expect } from 'vitest';
import { TIME, LENGTH, ACCELERATION, DIMENSIONLESS } from '../../../src/dimensional/types.js';
import { generateNative, monomialToExpr } from '../../../src/composition/probe/generator.js';
import { openBudget, DEFAULT_SEARCH_BUDGET } from '../../../src/composition/probe/search-budget.js';
import { makeResidualGap } from '../../../src/composition/probe/problem.js';
import { problemFromResidualGap } from '../../../src/composition/probe/frontier.js';
import type { DiscrepancyKind } from '../../../src/composition/probe/types.js';

const vars = [
  { name: 'period', dim: TIME },
  { name: 'length', dim: LENGTH },
  { name: 'gravity', dim: ACCELERATION },
];
const pendulum = () =>
  problemFromResidualGap(makeResidualGap('fg-gen', 'generator budget'), { name: 'period', dim: TIME }, vars.slice(1));

describe('monomialToExpr', () => {
  it('omits a zero exponent: the result is the monomial without that key', () => {
    expect(monomialToExpr({ length: 0.5, gravity: -0.5, period: 0 }, vars)).toEqual(
      monomialToExpr({ length: 0.5, gravity: -0.5 }, vars),
    );
    expect(JSON.stringify(monomialToExpr({ length: 0.5, gravity: -0.5, period: 0 }, vars))).not.toMatch(/period/);
  });
  it('an all-zero monomial is the dimensionless 1, and a single factor is returned bare', () => {
    expect(monomialToExpr({ length: 0 }, vars)).toEqual({ kind: 'symbol', name: '1', dim: DIMENSIONLESS });
    expect(monomialToExpr({ length: 1 }, vars)).toMatchObject({ kind: 'symbol', name: 'length' });
  });
  it('refuses a variable it has no dimension for, naming it', () => {
    expect(() => monomialToExpr({ mass: 1 }, vars)).toThrow(/unknown variable 'mass'/);
  });
});

describe('generateNative — budget caps', () => {
  it('the default budget yields the monomial and its 2π multiple (the control for the caps below)', () => {
    const got = [...generateNative(pendulum(), openBudget())];
    expect(got).toHaveLength(2);
    expect(JSON.stringify(got[1]!.expression)).toMatch(/"2pi"/);
  });
  it('a depth cap below the monomial depth yields nothing', () => {
    expect([...generateNative(pendulum(), openBudget({ ...DEFAULT_SEARCH_BUDGET, maxAstDepth: 1 }))]).toEqual([]);
  });
  it('an operator cap below the monomial operator count yields nothing', () => {
    expect([...generateNative(pendulum(), openBudget({ ...DEFAULT_SEARCH_BUDGET, maxOperators: 0 }))]).toEqual([]);
  });
  it('an operator cap between the two candidates keeps the smaller one only', () => {
    const got = [...generateNative(pendulum(), openBudget({ ...DEFAULT_SEARCH_BUDGET, maxOperators: 3 }))];
    expect(got).toHaveLength(1);
    expect(JSON.stringify(got[0]!.expression)).not.toMatch(/"2pi"/);
  });
});

describe('generateNative — corrections to a baseline', () => {
  const baseline = monomialToExpr({ length: 0.5, gravity: -0.5 }, vars);
  const withBaseline = (kind: DiscrepancyKind) => ({
    ...pendulum(),
    baseline,
    discrepancy: { kind, observableIds: ['period'] },
  });
  const corrections = (kind: DiscrepancyKind, budget = DEFAULT_SEARCH_BUDGET) =>
    [...generateNative(withBaseline(kind), openBudget(budget))].filter((c) => c.originNote.startsWith('correction:'));

  it('a relative correction is refused when its term carries the target dimension: 1 + [T] is inhomogeneous', () => {
    // The relative form scales the baseline by (1 + m) with m the target's own monomial, so it is
    // homogeneous only for a dimensionless target. For this period target it is never emitted.
    expect(corrections('relative')).toEqual([]);
    expect(corrections('standardized')).toEqual([]);
    expect(corrections('additive')).toHaveLength(1);
  });
  it('for a dimensionless target the relative form is homogeneous and is emitted', () => {
    const ratio = {
      ...problemFromResidualGap(makeResidualGap('fg-gen-r', 'ratio'), { name: 'ratio', dim: DIMENSIONLESS }, vars.slice(1)),
      baseline: { kind: 'symbol' as const, name: '1', dim: DIMENSIONLESS },
      discrepancy: { kind: 'relative' as const, observableIds: ['ratio'] },
    };
    const got = [...generateNative(ratio, openBudget())].filter((c) => c.originNote === 'correction:relative');
    expect(got).toHaveLength(1);
    expect(got[0]!.expression).toMatchObject({ kind: 'op', op: '*', args: [{ name: '1' }, { kind: 'op', op: '+' }] });
  });
  it('a discrepancy kind with no scalar correction form yields no correction', () => {
    expect(corrections('additive')).toHaveLength(1);
    expect(corrections('log-ratio')).toEqual([]);
    expect(corrections('distributional')).toEqual([]);
  });
  it('a budget spent on the native candidates leaves none for a correction', () => {
    expect(corrections('additive', { ...DEFAULT_SEARCH_BUDGET, maxCandidates: 2 })).toEqual([]);
    expect(corrections('additive', { ...DEFAULT_SEARCH_BUDGET, maxCandidates: 3 })).toHaveLength(1);
  });
});
