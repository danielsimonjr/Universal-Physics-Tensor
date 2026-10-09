/**
 * Regime derivation. The measured facts these tests pin come from executing
 * `buckinghamPi`, recorded in design note §10 Q1:
 *   {m, b, k}          → 1 group, {m:1, b:-2, k:1}, formula "m · b^-2 · k"
 *   {m, b, k, theta0}  → 2 groups, verdict 'multiple-invariants'
 * A dimensionless input is passed INTO `buckinghamPi` as a zero-dimension
 * variable and comes back as its own trivial group; nothing is synthesized.
 */
import { describe, it, expect } from 'vitest';
import { deriveRegimeGroups, regimeHolds } from '../../src/atlas/regime.js';
import type { Regime } from '../../src/atlas/types.js';
import { DAMPING, SPRING_CONSTANT } from '../../src/atlas/oscillators/dimensions.js';
import { MASS } from '../../src/dimensional/types.js';

const MBK = [
  { name: 'm', dim: MASS },
  { name: 'b', dim: DAMPING },
  { name: 'k', dim: SPRING_CONSTANT },
];

describe('deriveRegimeGroups', () => {
  it('derives exactly one group for {m, b, k}, keyed by its formula', () => {
    const groups = deriveRegimeGroups('oscillators', MBK, []);
    expect(Object.keys(groups)).toEqual(['m · b^-2 · k']);
    expect(groups['m · b^-2 · k'].exponents).toEqual({ m: 1, b: -2, k: 1 });
  });

  it('keys a dimensionless input by its own name, without synthesizing it', () => {
    const groups = deriveRegimeGroups('oscillators', MBK, ['theta0']);
    expect(Object.keys(groups).sort()).toEqual(['m · b^-2 · k', 'theta0']);
    expect(groups['theta0'].exponents).toEqual({ m: 0, b: 0, k: 0, theta0: 1 });
    // The dimensioned group picks up the zero exponent for the input.
    expect(groups['m · b^-2 · k'].exponents).toEqual({ m: 1, b: -2, k: 1, theta0: 0 });
  });

  it('returns an empty record for a dimensionally-independent set', () => {
    expect(deriveRegimeGroups('oscillators', [{ name: 'm', dim: MASS }], [])).toEqual({});
  });

  it('rejects a dimensionless input that collides with a parameter name', () => {
    expect(() => deriveRegimeGroups('oscillators', MBK, ['m'])).toThrow();
  });
});

describe('regimeHolds', () => {
  const underdamped: Regime = {
    family: 'oscillators',
    inequalities: [{ group: 'm · b^-2 · k', op: '>', bound: 0.25, alias: 'ζ < 1' }],
    groupDefinitions: deriveRegimeGroups('oscillators', MBK, []),
  };

  it('holds when m·k·b^-2 = 1 > 0.25', () => {
    expect(regimeHolds(underdamped, { 'm · b^-2 · k': 1 })).toEqual({
      ok: true,
      checked: 1,
      violated: [],
      unchecked: [],
    });
  });

  it('names the violated inequality when m·k·b^-2 = 0.1', () => {
    const result = regimeHolds(underdamped, { 'm · b^-2 · k': 0.1 });
    expect(result.ok).toBe(false);
    expect(result.violated).toHaveLength(1);
    expect(result.violated[0].group).toBe('m · b^-2 · k');
    expect(result.violated[0].alias).toBe('ζ < 1');
  });

  // Sprint 2 (design note §1, Adam A2 RED #2) split this answer in two. An
  // absent value used to report `ok: false` — a violation nobody observed.
  // It is now `'unknown'`, which is still NOT a pass; the distinction is what
  // lets a caller tell "I measured this and it failed" from "I never measured
  // this". `tests/atlas/regime-admission.test.ts` pins the tri-state in full.
  it("treats a missing group value as 'unknown' rather than a pass", () => {
    const result = regimeHolds(underdamped, {});
    expect(result.ok).toBe('unknown');
    expect(result.ok).not.toBe(true);
    expect(result.violated).toEqual([]);
    expect(result.unchecked[0].group).toBe('m · b^-2 · k');
  });

  it('evaluates an inequality on a dimensionless input group', () => {
    const regime: Regime = {
      family: 'oscillators',
      inequalities: [{ group: 'theta0', op: '<', bound: 0.5 }],
      groupDefinitions: deriveRegimeGroups('oscillators', MBK, ['theta0']),
    };
    expect(regime.groupDefinitions['theta0']).toBeDefined();
    expect(regimeHolds(regime, { theta0: 0.2 }).ok).toBe(true);
    expect(regimeHolds(regime, { theta0: 0.9 }).ok).toBe(false);
  });

  it('supports all four comparison operators', () => {
    const mk = (op: '<' | '<=' | '>' | '>='): Regime => ({
      family: 'oscillators',
      inequalities: [{ group: 'theta0', op, bound: 1 }],
      groupDefinitions: deriveRegimeGroups('oscillators', MBK, ['theta0']),
    });
    expect(regimeHolds(mk('<'), { theta0: 1 }).ok).toBe(false);
    expect(regimeHolds(mk('<='), { theta0: 1 }).ok).toBe(true);
    expect(regimeHolds(mk('>'), { theta0: 1 }).ok).toBe(false);
    expect(regimeHolds(mk('>='), { theta0: 1 }).ok).toBe(true);
  });
});
