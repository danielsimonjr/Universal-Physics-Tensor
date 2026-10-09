/**
 * Atlas Phase 5, S5.4 — statistics against values computed INDEPENDENTLY:
 * the plan's textbook Wilson intervals, a hand-computed McNemar table, and a
 * hand-computed κ. Newcombe's paired interval is checked against the PUBLISHED
 * Table III of Newcombe (1998), and pinned by properties as well.
 */

import { describe, expect, it } from 'vitest';
import {
  cohensKappa,
  mcnemar,
  pairedDifferenceInterval,
  powerReport,
  wilsonInterval,
} from '../../src/atlas/benchmark/stats.js';

describe('wilsonInterval — the plan’s textbook values', () => {
  it('48/60 = 0.80 → [0.682, 0.882]', () => {
    const w = wilsonInterval(48, 60);
    expect(w.lower).toBeCloseTo(0.682, 3);
    expect(w.upper).toBeCloseTo(0.882, 3);
  });

  it('160/200 = 0.80 → [0.739, 0.850]', () => {
    const w = wilsonInterval(160, 200);
    expect(w.lower).toBeCloseTo(0.739, 3);
    expect(w.upper).toBeCloseTo(0.850, 3);
  });

  it('stays inside [0, 1] at the extremes and refuses nonsense counts', () => {
    expect(wilsonInterval(0, 10).lower).toBe(0);
    expect(wilsonInterval(10, 10).upper).toBe(1);
    expect(() => wilsonInterval(11, 10)).toThrow();
    expect(() => wilsonInterval(1, 0)).toThrow();
  });
});

describe('mcnemar — a hand-computed table (b = 10, c = 2)', () => {
  it('χ² = (|10 − 2| − 1)²/12 = 49/12; exact p = 2·(1 + 12 + 66)/4096 = 158/4096', () => {
    const r = mcnemar({ a: 0, b: 10, c: 2, d: 0 });
    expect(r.chiSquared).toBeCloseTo(49 / 12, 12);
    expect(r.exactP).toBeCloseTo(158 / 4096, 12);
  });

  it('no discordant pairs ⇒ no evidence: χ² = 0, p = 1', () => {
    expect(mcnemar({ a: 5, b: 0, c: 0, d: 5 })).toEqual({ chiSquared: 0, exactP: 1 });
  });

  it('is symmetric in b and c', () => {
    expect(mcnemar({ a: 1, b: 3, c: 9, d: 1 })).toEqual(mcnemar({ a: 1, b: 9, c: 3, d: 1 }));
  });

  it('the continuity correction is clamped at zero: b = c gives χ² = 0, and |b − c| = 1 gives 0, never (−1)²/n', () => {
    expect(mcnemar({ a: 0, b: 3, c: 3, d: 0 }).chiSquared).toBe(0);
    expect(mcnemar({ a: 0, b: 4, c: 3, d: 0 }).chiSquared).toBe(0);
    // One past the clamp: (2 − 1)² / 7.
    expect(mcnemar({ a: 0, b: 5, c: 3, d: 0 }).chiSquared).toBeCloseTo(1 / 8, 12);
    expect(mcnemar({ a: 0, b: 3, c: 3, d: 0 }).exactP).toBe(1);
  });
});

describe('cohensKappa — a hand-computed matrix', () => {
  it('[[20, 5], [10, 15]]: po = 0.7, pe = 0.5 ⇒ κ = 0.4', () => {
    expect(cohensKappa([[20, 5], [10, 15]])).toBeCloseTo(0.4, 12);
  });

  it('perfect agreement is 1; chance-level agreement is 0', () => {
    expect(cohensKappa([[10, 0], [0, 10]])).toBe(1);
    expect(cohensKappa([[25, 25], [25, 25]])).toBe(0);
  });

  it('κ is undefined (NaN) when chance agreement is 1, never reported as perfect', () => {
    expect(Number.isNaN(cohensKappa([[10, 0], [0, 0]]))).toBe(true);
  });
});

describe('pairedDifferenceInterval — Newcombe method 10, pinned by properties', () => {
  it('contains the point difference (b − c)/n', () => {
    const r = pairedDifferenceInterval({ a: 40, b: 12, c: 3, d: 5 });
    expect(r.diff).toBeCloseTo(9 / 60, 12);
    expect(r.lower).toBeLessThan(r.diff);
    expect(r.upper).toBeGreaterThan(r.diff);
  });

  it('is antisymmetric: swapping the two methods negates and mirrors the interval', () => {
    const ab = pairedDifferenceInterval({ a: 40, b: 12, c: 3, d: 5 });
    const ba = pairedDifferenceInterval({ a: 40, b: 3, c: 12, d: 5 });
    expect(ba.lower).toBeCloseTo(-ab.upper, 12);
    expect(ba.upper).toBeCloseTo(-ab.lower, 12);
  });

  it('with φ = 0 it reduces to the unpaired square-and-add of the two Wilson intervals', () => {
    // a·d = b·c ⇒ φ = 0 (a=4, b=2, c=2, d=1).
    const t = { a: 4, b: 2, c: 2, d: 1 };
    const n = 9;
    const w1 = wilsonInterval(t.a + t.b, n);
    const w2 = wilsonInterval(t.a + t.c, n);
    const p1 = (t.a + t.b) / n;
    const p2 = (t.a + t.c) / n;
    const r = pairedDifferenceInterval(t);
    expect(r.lower).toBeCloseTo(p1 - p2 - Math.hypot(p1 - w1.lower, w2.upper - p2), 12);
    expect(r.upper).toBeCloseTo(p1 - p2 + Math.hypot(w1.upper - p1, p2 - w2.lower), 12);
  });

  it('a clearly better method on 60 paired items excludes zero; an even split does not', () => {
    expect(pairedDifferenceInterval({ a: 40, b: 12, c: 3, d: 5 }).lower).toBeGreaterThan(0);
    const even = pairedDifferenceInterval({ a: 40, b: 6, c: 6, d: 8 });
    expect(even.lower).toBeLessThan(0);
    expect(even.upper).toBeGreaterThan(0);
  });
});

describe('powerReport — the interval the frozen set can afford', () => {
  it('60 per class at 0.8 accuracy: ±10.0 points; 200 per class: ±5.5', () => {
    expect(powerReport(60).halfWidth).toBeCloseTo(0.09977, 4);
    expect(powerReport(200).halfWidth).toBeCloseTo(0.05520, 4);
    expect(powerReport(60).statement).toContain('[68.2%, 88.2%]');
  });
});

/**
 * Newcombe, "Improved confidence intervals for the difference between binomial
 * proportions based on paired data", Statistics in Medicine 17 (1998)
 * 2635–2650, Table III (pp. 2641–2642). Cells e, f, g, h are this module's
 * a, b, c, d. Each row gives the published 95% limits for method 8 (Wilson
 * marginals, uncorrected φ) and method 10 (the same, with the continuity-
 * corrected φ) — the method `pairedDifferenceInterval` implements. The values
 * are transcribed to four decimals, as printed.
 */
const NEWCOMBE_TABLE_III: ReadonlyArray<{
  readonly cells: readonly [number, number, number, number];
  readonly m8: readonly [number, number];
  readonly m10: readonly [number, number];
}> = [
  { cells: [36, 12, 2, 0], m8: [0.0569, 0.3404], m10: [0.0569, 0.3404] },
  { cells: [20, 12, 2, 16], m8: [0.0618, 0.3242], m10: [0.0562, 0.3292] },
  { cells: [18, 12, 2, 18], m8: [0.0618, 0.3239], m10: [0.0562, 0.329] },
  { cells: [36, 14, 0, 0], m8: [0.1528, 0.4167], m10: [0.1528, 0.4167] },
  { cells: [35, 14, 0, 1], m8: [0.1573, 0.4149], m10: [0.1461, 0.4175] },
  { cells: [18, 14, 0, 18], m8: [0.1504, 0.391], m10: [0.1441, 0.3963] },
  { cells: [2, 97, 1, 0], m8: [0.8721, 0.9854], m10: [0.8721, 0.9854] },
  { cells: [1, 97, 1, 1], m8: [0.8737, 0.985], m10: [0.8736, 0.985] },
  { cells: [0, 29, 1, 0], m8: [0.6666, 0.9882], m10: [0.6666, 0.9882] },
  { cells: [2, 98, 0, 0], m8: [0.9178, 0.9945], m10: [0.9178, 0.9945] },
  { cells: [1, 98, 0, 1], m8: [0.9174, 0.9916], m10: [0.9171, 0.9916] },
  { cells: [0, 30, 0, 0], m8: [0.8395, 1], m10: [0.8395, 1] },
  { cells: [54, 0, 0, 0], m8: [-0.0664, 0.0664], m10: [-0.0664, 0.0664] },
  { cells: [53, 0, 0, 1], m8: [-0.064, 0.064], m10: [-0.0729, 0.0729] },
  { cells: [30, 0, 0, 24], m8: [-0.0074, 0.0074], m10: [-0.0358, 0.0358] },
  { cells: [29, 0, 0, 25], m8: [-0.0049, 0.0049], m10: [-0.0354, 0.0354] },
  { cells: [28, 0, 0, 26], m8: [-0.0025, 0.0025], m10: [-0.0352, 0.0352] },
  { cells: [27, 0, 0, 27], m8: [0, 0], m10: [-0.0351, 0.0351] },
];

/** Half a unit in the fourth decimal: the most a correctly rounded value can differ. */
const HALF_ULP = 5e-5;

/**
 * The one row where the table is internally inconsistent: e·h ≤ f·g, so by the
 * paper's own definition method 10 EQUALS method 8, yet the printed lower limits
 * differ by one unit (0.8737 vs 0.8736). The computed 0.873672 rounds to
 * method 8's 0.8737. This row is held to one full unit, and only this row.
 */
const INCONSISTENT_ROW = '1/97/1/1';

const worstError = (r: { lower: number; upper: number }, [lo, hi]: readonly [number, number]): number =>
  Math.max(Math.abs(r.lower - lo), Math.abs(r.upper - hi));

describe('pairedDifferenceInterval — Newcombe (1998) Table III, the PUBLISHED method-10 values', () => {
  for (const row of NEWCOMBE_TABLE_III) {
    const key = row.cells.join('/');
    it(`e/f/g/h = ${key} reproduces the published method-10 limits`, () => {
      const [a, b, c, d] = row.cells;
      const r = pairedDifferenceInterval({ a, b, c, d });
      expect(worstError(r, row.m10)).toBeLessThanOrEqual(key === INCONSISTENT_ROW ? 2 * HALF_ULP : HALF_ULP);
    });
  }

  it('the inconsistent row: e·h ≤ f·g, so method 10 must equal method 8, which it matches to rounding', () => {
    const r = pairedDifferenceInterval({ a: 1, b: 97, c: 1, d: 1 });
    expect(1 * 1).toBeLessThanOrEqual(97 * 1);
    expect(worstError(r, [0.8737, 0.985])).toBeLessThanOrEqual(HALF_ULP);
  });

  it('CONTROL — the check CAN fail: on every row where the table separates method 8 from 10, the result does NOT match method 8', () => {
    const separating = NEWCOMBE_TABLE_III.filter((row) => worstError({ lower: row.m8[0], upper: row.m8[1] }, row.m10) > 2 * HALF_ULP);
    expect(separating.length).toBe(10);
    for (const row of separating) {
      const [a, b, c, d] = row.cells;
      expect(worstError(pairedDifferenceInterval({ a, b, c, d }), row.m8)).toBeGreaterThan(2 * HALF_ULP);
    }
  });

  it('CONTROL — a wrong z (90% instead of 95%) fails the same comparison on every row with a non-degenerate interval', () => {
    for (const row of NEWCOMBE_TABLE_III) {
      const [a, b, c, d] = row.cells;
      if (row.m10[0] === row.m10[1]) continue;
      expect(worstError(pairedDifferenceInterval({ a, b, c, d }, 1.6448536269514722), row.m10)).toBeGreaterThan(2 * HALF_ULP);
    }
  });
});
