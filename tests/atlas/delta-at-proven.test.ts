/**
 * `deltaAt(point)` is printed by `upt path` as "bound at this point" ONLY where it is PROVEN
 * (Mothership ruling on persona finding L9, 2026-09-25). A bound is proven here when `deltaAt` is
 * the exact error in closed form, so it holds with equality. `ab-damped-massless`'s
 * (m/b)(|v0| + k|x0|/b) is supported by witness W8b numerically and is NOT proven; it is labelled so,
 * and the path never prints it as a bound.
 *
 * The exact values below are computed independently of the code under test: the pendulum period
 * by Simpson quadrature of (2/π)∫₀^{π/2} dφ/√(1 − k² sin²φ), not by the AGM the code uses.
 */
import { describe, it, expect } from 'vitest';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';

const bridge = (id: string) => {
  for (const f of ATLAS_FAMILIES) {
    const b = f.bridges.find((x) => x.id === id);
    if (b !== undefined) return b;
  }
  throw new Error(`no atlas bridge ${id}`);
};

/** T/T0 for a pendulum of amplitude θ0, by composite Simpson quadrature (20 000 intervals). */
function periodRatio(theta0: number): number {
  const k2 = Math.sin(theta0 / 2) ** 2;
  const n = 20000;
  const h = Math.PI / 2 / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const f = 1 / Math.sqrt(1 - k2 * Math.sin(i * h) ** 2);
    s += f * (i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2);
  }
  return ((s * h) / 3) * (2 / Math.PI);
}

describe('deltaAt is a proven bound where it is labelled closed-form', () => {
  it('ab-pendulum-linear: deltaAt ≥ the exact period error at θ0 = 0.1, 0.2, 0.35, 0.5', () => {
    const b = bridge('ab-pendulum-linear');
    for (const theta0 of [0.1, 0.2, 0.35, 0.5]) {
      const exact = periodRatio(theta0) - 1;
      const at = b.bound!.deltaAt!({ theta0 });
      expect(at).toBeGreaterThanOrEqual(exact * (1 - 1e-10));
      expect(Math.abs(at / exact - 1)).toBeLessThan(1e-9); // equality: it IS the exact error
    }
  });

  it('the other closed-form bounds equal their exact errors at an interior point', () => {
    const cases: [string, Record<string, number>, number][] = [
      ['ab-klein-gordon-wave', { omega0: 0.05, c: 1, k: 1 }, Math.sqrt(1 + 0.05 ** 2) - 1],
      ['ab-kg-schrodinger', { c: 1, k: 0.05, omega0: 1 }, (0.05 ** 2 / 2 - (Math.sqrt(1 + 0.05 ** 2) - 1)) / (0.05 ** 2 / 2)],
      ['ab-stiff-string', { F: 1, EI: 0.004, k: 1 }, Math.sqrt(1.004) - 1],
      ['ab-telegraph-diffusion', { tau: 1, D: 0.02, q: 1 }, (1 - Math.sqrt(1 - 0.08)) / 2 / 0.02 - 1],
      ['ab-telegraph-wave', { tau: 1, D: 40, q: 1 }, (Math.sqrt(40) - Math.sqrt(159) / 2) / Math.sqrt(40)],
    ];
    for (const [id, p, exact] of cases) {
      expect(Math.abs(bridge(id).bound!.deltaAt!(p) / exact - 1), id).toBeLessThan(1e-9);
    }
  });

  it('every approximation states the basis of its deltaAt; only the damped limit is numerical', () => {
    const basis = Object.fromEntries(
      ATLAS_FAMILIES.flatMap((f) => f.bridges)
        .filter((b) => b.bound?.deltaAt !== undefined)
        .map((b) => [b.id, b.bound!.deltaAtBasis]),
    );
    expect(basis).toEqual({
      'ab-pendulum-linear': 'closed-form',
      'ab-damped-massless': 'numerically-supported',
      'ab-telegraph-diffusion': 'closed-form',
      'ab-telegraph-wave': 'closed-form',
      'ab-klein-gordon-wave': 'closed-form',
      'ab-kg-schrodinger': 'closed-form',
      'ab-stiff-string': 'closed-form',
    });
  });
});
