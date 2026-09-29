/**
 * Sprint 2 — regime algebra, tri-state admission, and coverage gaps.
 *
 * Two rules from `docs/planning/Atlas-Phase-2-Design.md` dominate this file,
 * and both are rules the design note CORRECTED after the Adam A2 vet:
 *
 *   §1 (RED #2) `regimeHolds` is TRI-STATE. An absent π-group value yields
 *   `'unknown'`, which is a failure to confirm validity and NEVER validity.
 *   The tests below assert `'unknown' !== true` explicitly, so the silent-pass
 *   defect cannot return by someone "simplifying" the type back to a boolean.
 *
 *   §0 (RED #1) A golden is a REGRESSION gate, not a correctness proof: it
 *   cannot see an error in a direction its inputs never travel. Correctness
 *   rests on PER-INEQUALITY boundary tests — just inside the bound, just
 *   outside it, and EXACTLY ON it. The on-the-bound case is the only one that
 *   separates `<` from `<=`, and no full-system test would reveal a swap.
 */
import { describe, it, expect } from 'vitest';
import {
  admitApproximation,
  collidingRegimeGroups,
  deriveRegimeGroups,
  intersectRegimes,
  regimeHolds,
  regimeOverlap,
  uncoveredRegions,
} from '../../src/atlas/regime.js';
import { MissingHorizonError } from '../../src/atlas/types.js';
import type { AtlasBridge, Regime } from '../../src/atlas/types.js';
import { OSCILLATOR_FAMILY } from '../../src/atlas/oscillators/index.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import {
  AB_PENDULUM_LINEAR,
  AB_DAMPED_MASSLESS,
} from '../../src/atlas/oscillators/bridges-limits.js';
import { DAMPING, SPRING_CONSTANT } from '../../src/atlas/oscillators/dimensions.js';
import { MASS } from '../../src/dimensional/types.js';

const FAMILY = 'oscillators';
const ZETA = 'm · b^-2 · k';

const MBK = [
  { name: 'm', dim: MASS },
  { name: 'b', dim: DAMPING },
  { name: 'k', dim: SPRING_CONSTANT },
];
const MBK_GROUPS = deriveRegimeGroups(FAMILY, MBK, []);

/** A one-inequality regime on the `m k / b²` group. */
const onZeta = (op: '<' | '<=' | '>' | '>=', bound: number): Regime => ({
  family: FAMILY,
  inequalities: [{ group: ZETA, op, bound }],
  groupDefinitions: MBK_GROUPS,
});

// The two regimes the oscillator family actually states, read off the bridges
// that carry them rather than re-declared here — a re-declaration would test a
// copy and pass while the real record drifted.
const PENDULUM_REGIME = AB_PENDULUM_LINEAR.regime;
const DAMPED_REGIME = AB_DAMPED_MASSLESS.regime;

describe('per-inequality boundary tests (design note §0, Adam A2 RED #1)', () => {
  // `theta0 <= 0.5` — CLOSED above. On the bound it HOLDS.
  describe("the pendulum's `theta0 <= 0.5`", () => {
    it('holds just inside the bound', () => {
      expect(regimeHolds(PENDULUM_REGIME, { theta0: 0.4999999 }).ok).toBe(true);
    });

    it('holds EXACTLY ON the bound, because the operator is `<=`', () => {
      expect(regimeHolds(PENDULUM_REGIME, { theta0: 0.5 }).ok).toBe(true);
    });

    it('fails just outside the bound', () => {
      const result = regimeHolds(PENDULUM_REGIME, { theta0: 0.5000001 });
      expect(result.ok).toBe(false);
      expect(result.violated.map((i) => i.group)).toEqual(['theta0']);
    });

    it('pins the operator itself, so a `<`/`<=` swap fails here', () => {
      expect(PENDULUM_REGIME.inequalities).toHaveLength(1);
      expect(PENDULUM_REGIME.inequalities[0]).toMatchObject({
        group: 'theta0',
        op: '<=',
        bound: 0.5,
      });
    });
  });

  // `m · b^-2 · k < 0.25` — OPEN above. On the bound it FAILS.
  describe("the damped spring's `m k / b² < 1/4`", () => {
    it('holds just inside the bound', () => {
      expect(regimeHolds(DAMPED_REGIME, { [ZETA]: 0.2499999 }).ok).toBe(true);
    });

    it('FAILS exactly on the bound, because the operator is `<`', () => {
      const result = regimeHolds(DAMPED_REGIME, { [ZETA]: 0.25 });
      expect(result.ok).toBe(false);
      expect(result.violated[0].alias).toBe('ζ > 1');
    });

    it('fails just outside the bound', () => {
      expect(regimeHolds(DAMPED_REGIME, { [ZETA]: 0.2500001 }).ok).toBe(false);
    });

    it('pins the operator itself, so a `<`/`<=` swap fails here', () => {
      expect(DAMPED_REGIME.inequalities).toHaveLength(1);
      expect(DAMPED_REGIME.inequalities[0]).toMatchObject({
        group: ZETA,
        op: '<',
        bound: 0.25,
      });
    });
  });

  // The `>` / `>=` pair gets the same treatment; nothing in the family states
  // one, so a swap there would otherwise be unguarded until it shipped.
  it('separates `>` from `>=` exactly on the bound', () => {
    expect(regimeHolds(onZeta('>', 1), { [ZETA]: 1 }).ok).toBe(false);
    expect(regimeHolds(onZeta('>=', 1), { [ZETA]: 1 }).ok).toBe(true);
    expect(regimeHolds(onZeta('>', 1), { [ZETA]: 1.0000001 }).ok).toBe(true);
    expect(regimeHolds(onZeta('>=', 1), { [ZETA]: 0.9999999 }).ok).toBe(false);
  });
});

describe('regimeHolds is TRI-STATE (design note §1, Adam A2 RED #2)', () => {
  it("returns 'unknown' when a group value is ABSENT", () => {
    const result = regimeHolds(DAMPED_REGIME, {});
    expect(result.ok).toBe('unknown');
    expect(result.unchecked.map((i) => i.group)).toEqual([ZETA]);
    expect(result.violated).toEqual([]);
  });

  it("'unknown' is NOT true — the silent-pass defect cannot return", () => {
    const result = regimeHolds(DAMPED_REGIME, {});
    expect(result.ok).not.toBe(true);
    expect(result.ok !== true).toBe(true);
    // And it is not a violation either: nothing was observed to fail.
    expect(result.ok).not.toBe(false);
  });

  it("reproduces Adam's Re/Ma case: a supplied Ma does not excuse an absent Re", () => {
    const flow: Regime = {
      family: FAMILY,
      inequalities: [
        { group: 'Re', op: '>', bound: 2000 },
        { group: 'Ma', op: '<', bound: 0.3 },
      ],
      groupDefinitions: {},
    };
    const result = regimeHolds(flow, { Ma: 0.1 });
    expect(result.ok).toBe('unknown');
    expect(result.unchecked.map((i) => i.group)).toEqual(['Re']);
  });

  it('a CHECKED violation outranks an absence', () => {
    const flow: Regime = {
      family: FAMILY,
      inequalities: [
        { group: 'Re', op: '>', bound: 2000 },
        { group: 'Ma', op: '<', bound: 0.3 },
      ],
      groupDefinitions: {},
    };
    const result = regimeHolds(flow, { Ma: 0.9 });
    expect(result.ok).toBe(false);
    expect(result.violated.map((i) => i.group)).toEqual(['Ma']);
    expect(result.unchecked.map((i) => i.group)).toEqual(['Re']);
  });

  it("treats a non-finite value as UNCHECKED, not as a violation", () => {
    expect(regimeHolds(DAMPED_REGIME, { [ZETA]: NaN }).ok).toBe('unknown');
    expect(regimeHolds(DAMPED_REGIME, { [ZETA]: Infinity }).ok).toBe('unknown');
  });

  it('a regime with no inequalities holds vacuously', () => {
    const unconstrained: Regime = {
      family: FAMILY,
      inequalities: [],
      groupDefinitions: MBK_GROUPS,
    };
    expect(regimeHolds(unconstrained, {}).ok).toBe(true);
  });
});

describe('regimeOverlap', () => {
  it("classifies the family's two regimes as nested — they share NO group", () => {
    // `theta0` and `m k / b²` are different coordinates, so neither regime
    // constrains the other's. Silence is not a constraint: reporting
    // 'disjoint' here would claim a separation the records never state.
    expect(regimeOverlap(PENDULUM_REGIME, DAMPED_REGIME)).toBe('nested');
  });

  it("reports 'disjoint' when a shared group cannot satisfy both", () => {
    expect(regimeOverlap(onZeta('<', 0.25), onZeta('>', 1))).toBe('disjoint');
  });

  it("reports 'disjoint' when the intervals meet only at an OPEN endpoint", () => {
    expect(regimeOverlap(onZeta('<', 1), onZeta('>', 1))).toBe('disjoint');
    expect(regimeOverlap(onZeta('<', 1), onZeta('>=', 1))).toBe('disjoint');
    // Both CLOSED at the same point: they share exactly that point, and
    // neither contains the other, so they overlap rather than nest. This is
    // the case a `<`/`<=` swap flips to 'disjoint', and the reason the
    // boundary is tested at all.
    expect(regimeOverlap(onZeta('<=', 1), onZeta('>=', 1))).toBe('overlap');
  });

  it("reports 'nested' when one shared box contains the other", () => {
    expect(regimeOverlap(onZeta('<', 0.1), onZeta('<', 1))).toBe('nested');
    expect(regimeOverlap(onZeta('<', 1), onZeta('<', 0.1))).toBe('nested');
  });

  it("reports 'overlap' when they meet and neither contains the other", () => {
    const low: Regime = {
      family: FAMILY,
      inequalities: [
        { group: ZETA, op: '>', bound: 0 },
        { group: ZETA, op: '<', bound: 1 },
      ],
      groupDefinitions: MBK_GROUPS,
    };
    const high: Regime = {
      family: FAMILY,
      inequalities: [
        { group: ZETA, op: '>', bound: 0.5 },
        { group: ZETA, op: '<', bound: 2 },
      ],
      groupDefinitions: MBK_GROUPS,
    };
    expect(regimeOverlap(low, high)).toBe('overlap');
  });

  it('compares on SHARED names only, ignoring a private coordinate', () => {
    const withPrivate: Regime = {
      family: FAMILY,
      inequalities: [
        { group: ZETA, op: '<', bound: 0.25 },
        { group: 'theta0', op: '<', bound: 0.1 },
      ],
      groupDefinitions: MBK_GROUPS,
    };
    // The `theta0` constraint is invisible to a comparison against a regime
    // that never mentions `theta0`.
    expect(regimeOverlap(withPrivate, onZeta('<', 1))).toBe('nested');
  });
});

describe('intersectRegimes', () => {
  it('conjoins the inequalities of both sides', () => {
    const both = intersectRegimes(onZeta('>', 0.1), onZeta('<', 0.25));
    expect(both.inequalities).toHaveLength(2);
    expect(regimeHolds(both, { [ZETA]: 0.2 }).ok).toBe(true);
    expect(regimeHolds(both, { [ZETA]: 0.05 }).ok).toBe(false);
    expect(regimeHolds(both, { [ZETA]: 0.5 }).ok).toBe(false);
  });

  it('keeps a redundant inequality rather than simplifying it away', () => {
    const both = intersectRegimes(onZeta('<', 1), onZeta('<', 2));
    expect(both.inequalities).toHaveLength(2);
  });

  it('merges group definitions from both sides', () => {
    const withTheta: Regime = {
      family: FAMILY,
      inequalities: [{ group: 'theta0', op: '<=', bound: 0.5 }],
      groupDefinitions: deriveRegimeGroups(FAMILY, MBK, ['theta0']),
    };
    const both = intersectRegimes(onZeta('<', 0.25), withTheta);
    expect(Object.keys(both.groupDefinitions).sort()).toEqual([ZETA, 'theta0']);
  });

  it('refuses two different families', () => {
    const other: Regime = { ...onZeta('<', 1), family: 'thermo' };
    expect(() => intersectRegimes(onZeta('<', 1), other)).toThrow(/families differ/);
  });

  it('refuses a group name defined differently on the two sides', () => {
    const conflicting: Regime = {
      family: FAMILY,
      inequalities: [],
      groupDefinitions: {
        [ZETA]: { formula: ZETA, exponents: { m: 2, b: -4, k: 2 } },
      } as Regime['groupDefinitions'],
    };
    expect(() => intersectRegimes(onZeta('<', 1), conflicting)).toThrow(
      /defined differently/,
    );
  });
});

describe('collidingRegimeGroups — a path does not merge families', () => {
  const waves: Regime = {
    family: 'waves',
    inequalities: [{ group: ZETA, op: '<=', bound: 0.1 }],
    groupDefinitions: {
      [ZETA]: { formula: ZETA, exponents: { m: 2, b: -4, k: 2 } },
    } as Regime['groupDefinitions'],
  };

  it('names a shared group whose exponent vectors differ, and does not throw across families', () => {
    expect(() => intersectRegimes(onZeta('<', 1), waves)).toThrow(/families differ/);
    const collisions = collidingRegimeGroups([onZeta('<', 1), waves]);
    expect(collisions).toEqual([{ group: ZETA, families: ['oscillators', 'waves'] }]);
    // The path command drops the colliding name before regimeHolds, so the
    // supplied number is unchecked on every step that defines it.
    const values: Record<string, number> = { [ZETA]: 0.2 };
    for (const c of collisions) delete values[c.group];
    expect(regimeHolds(onZeta('<', 1), values).ok).toBe('unknown');
    expect(regimeHolds(waves, values).ok).toBe('unknown');
  });

  it('CONTROL: the same exponent vector is not a collision, so each step may use the supplied number', () => {
    const same: Regime = { ...onZeta('<=', 0.5), family: 'waves' };
    expect(collidingRegimeGroups([onZeta('<=', 0.5), same])).toEqual([]);
    expect(regimeHolds(onZeta('<=', 0.5), { [ZETA]: 0.2 }).ok).toBe(true);
    expect(regimeHolds(same, { [ZETA]: 0.2 }).ok).toBe(true);
    expect(regimeHolds(onZeta('<=', 0.5), { [ZETA]: 0.9 }).ok).toBe(false);
  });
});

describe('uncoveredRegions', () => {
  // The two limit bridges are the ones that STATE inequalities; the other
  // three record an unconstrained regime, which covers every point (see the
  // last test in this block). Passing them here would mask every gap.
  const CONSTRAINED = [AB_PENDULUM_LINEAR, AB_DAMPED_MASSLESS];

  it('reports the uncovered region at theta0 > 0.5', () => {
    const gaps = uncoveredRegions(FAMILY, CONSTRAINED, {
      theta0: [0.2, 0.5, 0.9],
    });
    expect(gaps.map((g) => g.point['theta0'])).toEqual([0.9]);
    expect(gaps[0].coveredBy).toEqual([]);
  });

  it('counts a covering regime by id', () => {
    const gaps = uncoveredRegions(FAMILY, CONSTRAINED, { theta0: [0.2] });
    expect(gaps).toEqual([]);
  });

  it("does NOT count an 'unknown' as coverage", () => {
    // `theta0` says nothing about `m k / b²`, so the damped bridge is
    // 'unknown' at every one of these cells and covers none of them.
    const gaps = uncoveredRegions(FAMILY, [AB_DAMPED_MASSLESS], {
      theta0: [0.2, 0.9],
    });
    expect(gaps).toHaveLength(2);
  });

  it('samples the cartesian product of the named axes', () => {
    const gaps = uncoveredRegions(FAMILY, CONSTRAINED, {
      theta0: [0.2, 0.9],
      [ZETA]: [0.1, 1],
    });
    // theta0 = 0.2 covers both zeta cells via the pendulum bridge; theta0 = 0.9
    // covers neither, and the damped bridge covers only zeta = 0.1.
    expect(gaps.map((g) => [g.point['theta0'], g.point[ZETA]])).toEqual([[0.9, 1]]);
  });

  it('skips records of another family', () => {
    const foreign = { id: 'x', regime: { ...PENDULUM_REGIME, family: 'thermo' } };
    expect(uncoveredRegions(FAMILY, [foreign], { theta0: [0.2] })).toHaveLength(1);
  });

  it('records that an UNCONSTRAINED regime covers every sampled cell', () => {
    // Not a gap in the algorithm: a regime with no inequalities makes no
    // restriction, so it does hold everywhere. Pinned so the behaviour is a
    // decision rather than a surprise at a call site.
    const open = { id: 'ab-spring-lc', regime: OSCILLATOR_FAMILY.bridges[0].regime };
    expect(open.regime.inequalities).toEqual([]);
    expect(uncoveredRegions(FAMILY, [open], { theta0: [0.2, 0.9] })).toEqual([]);
  });
});

describe('admitApproximation', () => {
  it('admits all five Sprint 0 oscillator bridges', () => {
    expect(OSCILLATOR_FAMILY.bridges).toHaveLength(5);
    for (const bridge of OSCILLATOR_FAMILY.bridges) {
      expect(admitApproximation(bridge)).toBe(bridge);
    }
  });

  it('admits every bridge of EVERY registered family', () => {
    const all = ATLAS_FAMILIES.flatMap((f) => f.bridges);
    expect(all.length).toBeGreaterThan(OSCILLATOR_FAMILY.bridges.length);
    for (const bridge of all) expect(admitApproximation(bridge)).toBe(bridge);
  });

  it('THROWS on an empty horizon', () => {
    const empty: AtlasBridge = {
      ...AB_PENDULUM_LINEAR,
      bound: { ...AB_PENDULUM_LINEAR.bound!, horizon: '' },
    };
    expect(() => admitApproximation(empty)).toThrow(MissingHorizonError);
  });

  it('THROWS on a whitespace-only horizon', () => {
    const blank: AtlasBridge = {
      ...AB_PENDULUM_LINEAR,
      bound: { ...AB_PENDULUM_LINEAR.bound!, horizon: '   ' },
    };
    expect(() => admitApproximation(blank)).toThrow(MissingHorizonError);
  });

  it('THROWS when horizonHolds is absent', () => {
    const { horizonHolds: _drop, ...rest } = AB_PENDULUM_LINEAR.bound!;
    const noMachine = {
      ...AB_PENDULUM_LINEAR,
      bound: rest,
    } as unknown as AtlasBridge;
    expect(() => admitApproximation(noMachine)).toThrow(MissingHorizonError);
  });

  it('THROWS when an approximation carries no bound at all', () => {
    const { bound: _drop, ...rest } = AB_PENDULUM_LINEAR;
    expect(() => admitApproximation(rest as AtlasBridge)).toThrow(MissingHorizonError);
  });

  it('admits a non-approximation with no bound', () => {
    const exact = OSCILLATOR_FAMILY.bridges.find((b) => b.relation === 'exact-equivalence');
    expect(exact).toBeDefined();
    expect(exact!.bound).toBeUndefined();
    expect(admitApproximation(exact!)).toBe(exact);
  });

  it('checks a bound on a coarse-graining too', () => {
    const coarse = OSCILLATOR_FAMILY.bridges.find((b) => b.relation === 'coarse-graining');
    expect(coarse).toBeDefined();
    if (coarse?.bound !== undefined) {
      const broken: AtlasBridge = { ...coarse, bound: { ...coarse.bound, horizon: '' } };
      expect(() => admitApproximation(broken)).toThrow(MissingHorizonError);
    }
  });
});
