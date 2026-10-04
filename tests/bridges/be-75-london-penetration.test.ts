/**
 * BE-75 filename pin. The catalog-integrity check requires
 * `be-75-*.test.ts`. The cross-checks live in `be-74-76.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { evaluateLondonPenetration } from '../../src/bridges/be75-london-penetration.js';
import { E_SI } from '../../src/core/constants.js';
import { MU0_SI } from '../../src/dimensional/formula-names.js';

describe('BE-75 London penetration depth', () => {
  it('is the screened root, and replacing e by 2e is not that depth', () => {
    const m = 9.1093837015e-31;
    const n = 1e28;
    const lambda = evaluateLondonPenetration({ m_kg: m, n_per_m3: n }).lambda_m;
    const screened = Math.sqrt(m / (MU0_SI * n * E_SI * E_SI));
    const other = (MU0_SI * E_SI * E_SI) / m;
    expect(lambda).toBe(screened);
    expect(lambda / other).toBeGreaterThan(100);
    const doubled = Math.sqrt(m / (MU0_SI * n * (2 * E_SI) * (2 * E_SI)));
    expect(lambda / doubled).toBeCloseTo(2, 12);
  });
});
