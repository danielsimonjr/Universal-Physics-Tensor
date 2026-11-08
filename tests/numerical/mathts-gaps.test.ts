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

  it('M4: Wilson and Newcombe intervals and Cohen kappa are not exported (UPT keeps stats.ts)', () => {
    for (const name of ['wilsonInterval', 'newcombeInterval', 'cohensKappa']) {
      expect(exported(name), name).toBe(false);
    }
    // Control: the reader sees an export that exists.
    expect(exported('mcnemar')).toBe(true);
  });
});
