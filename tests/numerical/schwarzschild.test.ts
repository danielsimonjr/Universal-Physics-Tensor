/**
 * `numerical/schwarzschild`: the one `r_s = 2GM/c²`, read by the covariant eikonal, the
 * Painlevé–Gullstrand metric, the flat Christoffel closure and the metric library. Those importers
 * reached it only through their own tests; this file tests it directly against values written out
 * by hand, so a wrong factor or power is caught here rather than inferred from a metric.
 */
import { describe, expect, it } from 'vitest';
import { schwarzschildRadius } from '../../src/numerical/schwarzschild.js';

/** The IAU nominal solar mass parameter GM☉ (m³ s⁻²) and the exact c (m/s), written out here. */
const GM_SUN = 1.3271244e20;
const C = 299792458;
/** Newton's constant, CODATA 2022 (m³ kg⁻¹ s⁻²), written out here. */
const G = 6.6743e-11;

describe('schwarzschildRadius', () => {
  it('is 2953.25 m for the Sun: 2·GM☉/c² written out, and the textbook 2.95325 km', () => {
    const rs = schwarzschildRadius(GM_SUN / G);
    const byHand = (2 * GM_SUN) / (C * C);
    expect(Math.abs(rs / byHand - 1)).toBeLessThan(1e-15);
    expect(rs).toBeCloseTo(2953.25, 3);
  });

  it('is 8.87 mm for the Earth (M = 5.972e24 kg)', () => {
    const rs = schwarzschildRadius(5.972e24);
    expect(Math.abs(rs / ((2 * G * 5.972e24) / (C * C)) - 1)).toBeLessThan(1e-15);
    expect(rs).toBeCloseTo(0.0088698, 7);
  });

  it('defaults to SI G and c, and a caller in other units passes its own (geometrized: r_s = 2M)', () => {
    expect(schwarzschildRadius(1e30)).toBe(schwarzschildRadius(1e30, G, C));
    expect(schwarzschildRadius(1.5, 1, 1)).toBe(3);
    expect(schwarzschildRadius(0.25, 1, 1)).toBe(0.5);
  });

  it('is linear in M and G, and goes as 1/c² (halving c quadruples it)', () => {
    expect(schwarzschildRadius(6, 1, 1)).toBe(3 * schwarzschildRadius(2, 1, 1));
    expect(schwarzschildRadius(1, 3, 1)).toBe(6);
    expect(schwarzschildRadius(1, 1, 0.5)).toBe(4 * schwarzschildRadius(1, 1, 1));
    expect(schwarzschildRadius(1, 1, 2)).toBe(0.5);
  });

  it('control: GM/c², 2GM/c and 2GM/c³ are each refused by the values above', () => {
    // The same assertions, against the three plausible wrong formulas: each must fail at least one.
    const wrong = [
      (M: number, g = G, c = C) => (g * M) / (c * c),
      (M: number, g = G, c = C) => (2 * g * M) / c,
      (M: number, g = G, c = C) => (2 * g * M) / (c * c * c),
    ];
    for (const f of wrong) {
      const sun = Math.abs(f(GM_SUN / G) - 2953.25) < 5e-4;
      const geometrized = f(1.5, 1, 1) === 3 && f(1, 1, 0.5) === 4 * f(1, 1, 1);
      expect(sun && geometrized).toBe(false);
    }
  });
});
