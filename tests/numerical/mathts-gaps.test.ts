/**
 * Gap rows for the MathTS leverage plan (`docs/superpowers/plans/2026-11-07-mathts-leverage.md`,
 * task U0). Each row asserts a present MathTS limitation that keeps a UPT routine local. A row
 * fails on the day a MathTS release removes the limitation. The matching M task then turns the
 * row into an agreement test and deletes the UPT copy.
 */
import * as functions from '@danielsimonjr/mathts-functions';
import { mcnemar, rootsLegendre } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { GAUSS_LEGENDRE_16 } from '../../src/numerical/quadrature.js';
import { studentTwoSidedP } from '../../src/composition/probe/t-tail.js';
import { chiSquareSurvival, fSurvival } from '../../src/composition/probe/study.js';
import { cohensKappa, pairedDifferenceInterval, wilsonInterval } from '../../src/atlas/benchmark/stats.js';

const exported = (name: string): boolean => Object.prototype.hasOwnProperty.call(functions, name);

describe('MathTS gaps that keep UPT routines local', () => {
  it('M1 (agreement): MathTS studentTTwoSidedP is exported and equals UPT studentTwoSidedP on normal tails', () => {
    // UPT keeps 2·studentTCDF(−|t|, ν) (task U5, t-tail-mathts.test.ts): at t = 1e154, ν = 2 the two
    // differ by about 1e-13 relative in the subnormal range, and neither is nearer the true 1e-308.
    expect(exported('studentTTwoSidedP')).toBe(true);
    for (const [t, df] of [[0.3, 1], [-1.7, 3], [2.5, 10], [12, 4], [40, 10], [80, 30]] as const) {
      expect(studentTwoSidedP(t, df), `t=${t} df=${df}`).toBe(functions.studentTTwoSidedP(t, df));
    }
    // 2(1 - CDF) rounds this tail to 0; the direct tail does not.
    expect(studentTwoSidedP(80, 30)).toBeGreaterThan(0);
    expect(studentTwoSidedP(80, 30)).toBeLessThan(1e-30);
  });

  it('M2 (agreement): mcnemar p and the study survival tails are direct upper tails, not 1 - CDF', () => {
    // 100 discordant pairs on one side: chi2 = 99^2 / 100 = 98.01, true upper tail ~ 4e-23.
    const r = mcnemar([[0, 100], [0, 0]]);
    expect(r.chi2).toBeCloseTo(98.01, 10);
    expect(r.pValue).toBe(functions.chiSquaredSF(98.01, 1));
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(1e-20);
    // The study tails: 1 - CDF rounds each of these to 0.
    expect(chiSquareSurvival(400, 3)).toBe(functions.chiSquaredSF(400, 3));
    expect(chiSquareSurvival(400, 3)).toBeGreaterThan(0);
    expect(fSurvival(1e4, 2, 40)).toBe(functions.fSF(1e4, 2, 40));
    expect(fSurvival(1e4, 2, 40)).toBeGreaterThan(0);
    // The UPT guards refuse a bad degree of freedom, where MathTS returns NaN or 1.
    expect(() => chiSquareSurvival(1, 0)).toThrow(RangeError);
    expect(() => fSurvival(1, 0, 3)).toThrow(RangeError);
  });

  it('M3 (agreement): UPT GAUSS_LEGENDRE_16 is MathTS rootsLegendre(16), within 5e-16 of a 40-digit reference', () => {
    // Half of the symmetric weight set, from mpmath at 40 digits (the weights at the refined roots of P16).
    const reference = [
      0.02715245941175409485178057, 0.06225352393864789286284384, 0.09515851168249278480992511,
      0.1246289712555338720524763, 0.1495959888165767320815017, 0.1691565193950025381893121,
      0.1826034150449235888667637, 0.1894506104550684962853967,
    ];
    const { nodes, weights } = rootsLegendre(16);
    let worst = 0;
    GAUSS_LEGENDRE_16.forEach((n, i) => {
      expect(n.node).toBe(nodes[i]);
      expect(n.weight).toBe(weights[i]);
      const ref = reference[i < 8 ? i : 15 - i]!;
      worst = Math.max(worst, Math.abs(n.weight - ref) / ref);
    });
    // The retired closed form 2 / ((1 - x^2) P16'(x)^2) was 1.9e-15 off; MathTS 0.75.1 is 2.7e-16.
    expect(worst).toBeLessThan(5e-16);
    const sum = GAUSS_LEGENDRE_16.reduce((s, n) => s + n.weight, 0);
    expect(Math.abs(sum - 2)).toBeLessThan(1e-15);
  });

  it('M4 (agreement): UPT Wilson, Newcombe and kappa equal MathTS on the pinned cases', () => {
    for (const name of ['wilsonInterval', 'newcombePairedInterval', 'cohensKappa']) {
      expect(exported(name), name).toBe(true);
    }
    const wilsonCases = [[48, 60], [160, 200], [0, 10], [10, 10], [1, 3], [7, 97], [2, 4]] as const;
    for (const [s, n] of wilsonCases) {
      expect(wilsonInterval(s, n), `wilson ${s}/${n}`).toEqual(functions.wilsonInterval(s, n, 0.95));
      expect(wilsonInterval(s, n, 0.9), `wilson90 ${s}/${n}`).toEqual(functions.wilsonInterval(s, n, 0.9));
    }
    // The textbook value 48/60 -> [0.682, 0.882] holds through the MathTS call.
    expect(wilsonInterval(48, 60).lower).toBeCloseTo(0.682, 3);
    expect(wilsonInterval(48, 60).upper).toBeCloseTo(0.882, 3);
    const tables = [
      { a: 40, b: 12, c: 3, d: 5 }, { a: 1, b: 97, c: 1, d: 1 }, { a: 0, b: 1, c: 1, d: 1 },
      { a: 27, b: 0, c: 0, d: 27 }, { a: 40, b: 6, c: 6, d: 8 }, { a: 0, b: 0, c: 0, d: 5 },
    ];
    for (const t of tables) {
      expect(pairedDifferenceInterval(t), JSON.stringify(t)).toEqual(functions.newcombePairedInterval(t, 0.95));
    }
    const matrices = [[[20, 5], [10, 15]], [[10, 0], [0, 10]], [[25, 25], [25, 25]], [[3, 1, 0], [2, 9, 4], [0, 1, 7]]];
    for (const m of matrices) expect(cohensKappa(m), JSON.stringify(m)).toBe(functions.cohensKappa(m));
    // Chance agreement 1: both return NaN, never 1.
    expect(cohensKappa([[10, 0], [0, 0]])).toBeNaN();
    // UPT keeps its own input checks and messages in front of the MathTS call.
    expect(() => wilsonInterval(11, 10)).toThrow(/^wilsonInterval: successes/);
    expect(() => pairedDifferenceInterval({ a: 0, b: 0, c: 0, d: 0 })).toThrow(/^pairedDifferenceInterval: empty table/);
    expect(() => cohensKappa([[1, 2]])).toThrow(/^cohensKappa: matrix must be square/);
  });
});
