/**
 * BE-76 filename pin. The catalog-integrity check requires
 * `be-76-*.test.ts`. The composition checks live in `be-74-76.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { evaluatePlasmaBeta } from '../../src/bridges/be76-plasma-beta.js';
import { K_B_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';

describe('BE-76 plasma beta', () => {
  it('is n k_B T over the magnetic pressure, and B²/μ0 is half of that', () => {
    const n = 1e20;
    const T = 1e6;
    const B = 0.2;
    const pB = (B * B) / (2 * MU0_SI);
    const beta = evaluatePlasmaBeta({ n_per_m3: n, T_K: T, p_B_Pa: pB }).beta;
    const substituted = (2 * MU0_SI * n * K_B_SI * T) / (B * B);
    const half = (n * K_B_SI * T) / ((B * B) / MU0_SI);
    expect(beta).toBeCloseTo(substituted, 12);
    expect(Math.abs(beta - half)).toBeGreaterThan(Math.abs(beta - substituted));
  });
});