/**
 * Issue #526. The radial delay from 1 AU to the solar surface, against the
 * exact tortoise form, and the refusal of a ray that does not cross R_near
 * transversally.
 *
 * Radial null geodesic in Schwarzschild: dt/dr = ±1/(c f), f = 1 − r_s/r, so the
 * excess over flat transit is (r_s/c) ln((R_far − r_s)/(R_near − r_s)) (Carroll,
 * Spacetime and Geometry §5.6, tortoise coordinate r* = r + r_s ln(r/r_s − 1)).
 * The weak-field form (2GM/c³) ln(R_far/R_near) differs from it by 7.9e-7
 * relative at the solar surface, so the 1e-6 contract is stated against the exact form.
 */
import { describe, expect, it } from 'vitest';
import { C_SI, G_SI } from '../../src/core/constants.js';
import { evaluateCovariantEikonalNumerical } from '../../src/numerical/covariant-eikonal.js';
import { quadratureDelay } from '../helpers/shapiro-quadrature.js';

const M = 1.989e30;
const R = 6.957e8;
const AU = 1.495978707e11;
const rs = (2 * G_SI * M) / (C_SI * C_SI);

describe('covariant eikonal from 1 AU to the solar surface (#526)', () => {
  it('meets 1e-6 against the exact radial form at the default step count', async () => {
    const exact = (rs / C_SI) * Math.log((AU - rs) / (R - rs));
    const r = await evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R });
    expect(Math.abs(r.shapiroDelaySec / exact - 1)).toBeLessThan(1e-6);
  });

  it('an explicit step count is used as given, and the default derives more', async () => {
    const exact = (rs / C_SI) * Math.log((AU - rs) / (R - rs));
    const given = await evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, steps: 2048 });
    const derived = await evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R });
    expect(Math.abs(given.shapiroDelaySec / exact - 1)).toBeGreaterThan(1e-6);
    expect(given.shapiroDelaySec).not.toBe(derived.shapiroDelaySec);
  });

  it('b far above R_near (the ray never reaches R_near) is the same RangeError', async () => {
    const run = () => evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: 2 * R });
    await expect(run()).rejects.toThrow(RangeError);
    await expect(run()).rejects.toThrow(/closest approach/);
  });

  it('a derived step count above the limit is a RangeError that asks for explicit steps', async () => {
    const s = 0.05;
    const b = R * Math.sqrt((1 - s * s) / (1 - rs / R));
    await expect(evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: b })).rejects.toThrow(
      /Pass steps explicitly/,
    );
  });

  it('with an impact parameter (crossing cosine 0.3) the default count meets 1e-4 against the quadrature', async () => {
    const s = 0.3;
    const b = R * Math.sqrt((1 - s * s) / (1 - rs / R));
    const r = await evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: b });
    expect(Math.abs(r.shapiroDelaySec / quadratureDelay(M, b, AU, R) - 1)).toBeLessThan(1e-4);
  });

  it('a ray that grazes R_near (b = R_near) is a RangeError that names the closest approach', async () => {
    const run = () => evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: R });
    await expect(run()).rejects.toThrow(RangeError);
    await expect(run()).rejects.toThrow(/closest approach/);
  });

  it('the grazing ray is refused at a large step count too, not returned as a number', async () => {
    const run = () => evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: R, steps: 65536 });
    await expect(run()).rejects.toThrow(RangeError);
  });

  it('b just above R_near is the same RangeError', async () => {
    const run = () => evaluateCovariantEikonalNumerical({ M_kg: M, R_far_m: AU, R_near_m: R, b_m: R * 1.0000001 });
    await expect(run()).rejects.toThrow(RangeError);
    await expect(run()).rejects.toThrow(/closest approach/);
  });
});
