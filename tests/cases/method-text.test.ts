/**
 * The method sentences an applied case prints name the method the code runs.
 * After the MathTS routing the half-power point and the eigenvalues are
 * MathTS `findRoot` (Brent) and the parent integrals are MathTS `quad`
 * (adaptive Gauss–Kronrod); the sentences that said "by bisection" and
 * "adaptive Simpson" were the record from before that routing.
 */
import { describe, expect, it } from 'vitest';
import { DAMPED_RESONATOR_CASE } from '../../src/cases/damped-resonator.js';
import { LUMPED_COOLING_CASE } from '../../src/cases/lumped-cooling.js';
import { RESISTOR_NOISE_CASE } from '../../src/cases/resistor-noise.js';

describe('the comparison method names the method the code runs', () => {
  it('case-damped-resonator: the half-power point is a Brent root (findRoot), not a bisection', () => {
    const method = DAMPED_RESONATOR_CASE.comparison!.method;
    expect(method).toMatch(/findRoot|Brent/);
    expect(method).not.toMatch(/bisection/);
  });

  it('case-lumped-cooling: the eigenvalues are Brent roots (findRoot), not bisections', () => {
    const method = LUMPED_COOLING_CASE.comparison!.method;
    expect(method).toMatch(/findRoot|Brent/);
    expect(method).not.toMatch(/bisection/);
  });

  it('case-resistor-noise: the parent integral is adaptive Gauss–Kronrod (quad), not adaptive Simpson', () => {
    const method = RESISTOR_NOISE_CASE.comparison!.method;
    expect(method).toMatch(/Gauss–Kronrod|quad/);
    expect(method).not.toMatch(/Simpson/);
    const parent = RESISTOR_NOISE_CASE.outputs.find((o) => o.key === 'V_rms_parent_V');
    expect(parent?.meaning).toMatch(/Gauss–Kronrod|quad/);
    expect(parent?.meaning).not.toMatch(/Simpson/);
  });
});
