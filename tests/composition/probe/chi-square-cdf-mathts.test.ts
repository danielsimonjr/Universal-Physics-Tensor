/**
 * Leverage plan task U4: `chiSquareCdf` is MathTS functions `chiSquaredCDF`. The agreement rows
 * hold the measured sweep (880 of 891 grid points bit-equal, worst 1.4e-15 relative) at the
 * points the local tests use, and the far lower tail, where the two are bit-equal.
 */
import { readFileSync } from 'node:fs';
import { chiSquaredCDF } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import { chiSquareCdf } from '../../../src/composition/probe/study.js';

describe('chiSquareCdf through MathTS', () => {
  it('equals MathTS chiSquaredCDF bit for bit, far lower tail included', () => {
    for (const [x, nu] of [[1e-9, 4], [1e-14, 2], [1e-6, 4], [0.3, 1], [3, 2], [7, 5], [40, 30], [20, 4]] as const) {
      expect(chiSquareCdf(x, nu), `x=${x} nu=${nu}`).toBe(chiSquaredCDF(x, nu));
    }
  });

  it('keeps its own edge results: 0 at chi2 <= 0, and a RangeError for dof <= 0', () => {
    expect(chiSquareCdf(0, 3)).toBe(0);
    expect(chiSquareCdf(-1, 3)).toBe(0);
    expect(() => chiSquareCdf(1, 0)).toThrow(RangeError);
  });

  it('is the MathTS call, not the incomplete-gamma branch', () => {
    const src = readFileSync(new URL('../../../src/composition/probe/study.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/numberFrom\('chiSquaredCDF', chiSquaredCDF\(chi2, dof\)\)/);
  });
});
