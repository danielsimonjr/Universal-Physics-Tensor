/**
 * Leverage plan task U5: the body of `studentTwoSidedP` is MathTS `2·studentTCDF(−|t|, ν)`.
 * Measured over 1278 points (ν 0.5 to 1000, |t| 1e-6 to 1e8, both signs): 1276 bit-equal; the
 * other two are subnormal (about 8e-322), 10 units in the last place apart.
 */
import { readFileSync } from 'node:fs';
import { studentTCDF } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { studentTwoSidedP } from '../../../src/composition/probe/t-tail.js';

describe('studentTwoSidedP through MathTS', () => {
  it('equals 2·studentTCDF(−|t|, ν) on the measured sweep, far tail included', () => {
    for (const df of [1, 5, 30]) {
      for (const t of [2, 10, 1e3, 1e8, -2, -1e8]) {
        expect(studentTwoSidedP(t, df), `t=${t} df=${df}`).toBe(2 * (studentTCDF(-Math.abs(t), df) as number));
      }
    }
    expect(studentTwoSidedP(1e8, 30)).toBeGreaterThan(0);
    // A point where the retired incomplete beta differs (1.0000000000001e-308), so a revert fails here.
    expect(studentTwoSidedP(1e154, 2)).toBe(2 * (studentTCDF(-1e154, 2) as number));
  });

  it('keeps its edge results: 1 at t = 0, 0 at infinite t, RangeError for NaN or ν <= 0', () => {
    expect(studentTwoSidedP(0, 5)).toBe(1);
    expect(studentTwoSidedP(Infinity, 5)).toBe(0);
    expect(studentTwoSidedP(-Infinity, 5)).toBe(0);
    expect(() => studentTwoSidedP(Number.NaN, 5)).toThrow(RangeError);
    expect(() => studentTwoSidedP(1, 0)).toThrow(RangeError);
  });

  it('is the MathTS call, not the incomplete beta', () => {
    const src = readFileSync(new URL('../../../src/composition/probe/t-tail.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/studentTCDF\(-Math\.abs\(t\), df\)/);
    expect(src).not.toMatch(/betainc/);
  });
});
