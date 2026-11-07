/**
 * Leverage plan task U2: `fractionToNumber` and `formatRational` are MathTS `Fraction#toNumber`
 * and `Fraction#toString`. The rows hold the plan's edge inputs; the text must be byte-identical.
 */
import { readFileSync } from 'node:fs';
import { Fraction } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { formatRational, fractionToNumber } from '../../src/composition/rational-exponent.js';

const cases: Array<[bigint, bigint, string, number]> = [
  [9n, 8n, '9/8', 1.125],
  [2n, 1n, '2', 2],
  [-1n, 3n, '-1/3', -1 / 3],
  [1n, -3n, '-1/3', -1 / 3],
  [0n, 5n, '0', 0],
  [2n ** 60n + 1n, 3n, '1152921504606846977/3', Number(2n ** 60n + 1n) / 3],
];

describe('rational-exponent helpers', () => {
  it('give the expected text and number on the edge fractions', () => {
    for (const [n, d, text, value] of cases) {
      const f = new Fraction(n, d);
      expect(formatRational(f), `${n}/${d}`).toBe(text);
      expect(fractionToNumber(f), `${n}/${d}`).toBe(value);
    }
  });

  it('are the MathTS Fraction methods, not a second copy', () => {
    const src = readFileSync(new URL('../../src/composition/rational-exponent.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/return f\.toNumber\(\);/);
    expect(src).toMatch(/return f\.toString\(\);/);
  });
});
