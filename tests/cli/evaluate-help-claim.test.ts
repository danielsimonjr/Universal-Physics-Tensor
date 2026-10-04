/**
 * The `upt evaluate` help quotes the Chandrasekhar mass it prints (persona finding D4, 2026-09-25).
 *
 * The help said "~1.44 M_sun" while `upt evaluate be-63 mu_e=2` prints 1.4559: the ideal
 * degenerate-gas value with the atomic mass unit m_u and M☉ = 1.989e30 kg (recomputed
 * independently: ω₃√(3π)/2 (ħc/G)^{3/2}/(2 m_u)² = 2.8957e30 kg). The number in each help text is
 * read back here and compared with the evaluator.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateChandrasekharMass } from '../../src/bridges/be63-chandrasekhar-mass.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const printed = evaluateChandrasekharMass({ mu_e: 2 }).M_Ch_solar;

describe('the be-63 example in the evaluate help', () => {
  it('the evaluator prints 1.4559 M☉ for mu_e = 2 (m_u, M☉ = 1.989e30)', () => {
    expect(printed).toBeCloseTo(1.45587, 5);
  });

  // Top-level help is this command's own help. There is no second copy in main.ts.
  for (const file of ['src/cli/commands/evaluate.ts']) {
    it(`${file} quotes the printed value, to three decimals`, () => {
      const text = readFileSync(resolve(root, file), 'utf-8');
      const m = text.match(/upt evaluate be-63 mu_e=2 +→ Chandrasekhar mass ≈ ([\d.]+) M/);
      expect(m, 'the example line').not.toBeNull();
      expect(Number(m![1])).toBeCloseTo(printed, 3);
    });
  }
});
