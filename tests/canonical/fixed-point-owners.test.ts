/**
 * Two more callers sample through the one fixed-point owner (`canonical/fixed-points.ts`).
 *
 * `src/composition/probe/corpus.ts` (`corpusPrefactor`) sampled `(1.7 + i)^p` at p = 1, 1.3, 1.6
 * and tested the ratio to 1e-9 by hand; `src/cli/commands/derive.ts` recovered a monomial
 * prefactor by its own loop over `(1.7 + i)^(1 + 0.3 j)` with a coefficient of variation under
 * 1e-9. Both now call the owner with exactly those parameters (`fixedPoint` and
 * `constantRatio`; `recoverMonomialPrefactor` through the CLI barrel), so no verdict moves:
 * `tests/composition/probe/batch-pins.test.ts` and the derive goldens are the pins. This file
 * fails while either keeps a hand sampler.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixedPoint, recoverMonomialPrefactor } from '../../src/canonical/fixed-points.js';

const ROOT = join(import.meta.dirname, '../..');
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8');
const HAND_SAMPLER = /Math\.pow\(\s*1\.7\s*\+\s*i\b/;

describe('the fixed-point owner is the one sampler', () => {
  it('corpus.ts samples through fixedPoint and decides through constantRatio', () => {
    const src = read('src/composition/probe/corpus.ts');
    expect(src).not.toMatch(HAND_SAMPLER);
    expect(src).toMatch(/fixedPoint\(/);
    expect(src).toMatch(/constantRatio\(/);
  });

  it('upt derive recovers its prefactor through api.recoverMonomialPrefactor', () => {
    const src = read('src/cli/commands/derive.ts');
    expect(src).not.toMatch(HAND_SAMPLER);
    expect(src).toMatch(/api\.recoverMonomialPrefactor\(/);
  });

  it("derive's exponent schedule 1 + 0.3·j is the doubles 1, 1.3, 1.6, so either spelling samples the same points", () => {
    expect([0, 1, 2].map((j) => 1 + 0.3 * j)).toEqual([1, 1.3, 1.6]);
    expect(fixedPoint(['a', 'b'], 1.3, { base: 1.7, step: 1 })).toEqual({ a: Math.pow(1.7, 1.3), b: Math.pow(2.7, 1.3) });
  });

  it('recoverMonomialPrefactor recovers 2π from 2π·√(ℓ/g) on the derive scheme', () => {
    const r = recoverMonomialPrefactor(
      (p) => 2 * Math.PI * Math.sqrt(p.length! / p.gravity!),
      { length: 0.5, gravity: -0.5 },
      ['length', 'gravity'],
      { base: 1.7, step: 1, exponents: [1, 1.3, 1.6], tolerance: 1e-9, statistic: 'cv' },
    );
    expect(r.matches).toBe(true);
    expect(r.prefactor).toBeCloseTo(2 * Math.PI, 12);
  });
});
