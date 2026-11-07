/**
 * MathTS leverage plan task U6: McNemar's exact p is MathTS `binomialTest` on
 * the smaller discordant cell, Binomial(b + c, ½). The reference is the retired
 * local tail sum `2·Σ_{i ≤ min(b, c)} C(n, i)/2ⁿ`, written out here with exact
 * integer binomials for small n.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mcnemar } from '../../src/atlas/benchmark/stats.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../../src/atlas/benchmark/stats.ts'), 'utf8');

/** The exact two-sided tail for n ≤ 60, from integer binomial coefficients. */
function exactTail(b: number, c: number): number {
  const n = b + c;
  const k = Math.min(b, c);
  let sum = 0n;
  let choose = 1n;
  for (let i = 0; i <= k; i++) {
    sum += choose;
    choose = (choose * BigInt(n - i)) / BigInt(i + 1);
  }
  return Math.min(1, (2 * Number(sum)) / 2 ** n);
}

describe('mcnemar exact p through MathTS binomialTest (U6)', () => {
  it('matches the exact integer tail for every split with b + c ≤ 60', () => {
    for (let n = 1; n <= 60; n++) {
      for (let b = 0; b <= n; b++) {
        const p = mcnemar({ a: 0, b, c: n - b, d: 0 }).exactP;
        const ref = exactTail(b, n - b);
        expect(Math.abs(p - ref) / ref, `b=${b} c=${n - b}`).toBeLessThan(1e-12);
      }
    }
  });

  it('keeps the edge rows: no discordant pair, one pair, a large equal split, a one-sided far tail', () => {
    expect(mcnemar({ a: 3, b: 0, c: 0, d: 4 })).toEqual({ chiSquared: 0, exactP: 1 });
    expect(mcnemar({ a: 0, b: 0, c: 1, d: 0 }).exactP).toBe(1);
    expect(mcnemar({ a: 0, b: 500, c: 500, d: 0 }).exactP).toBeCloseTo(1, 12);
    // 100 discordant pairs on one side: 2/2¹⁰⁰, the tail MathTS `mcnemar` rounds to 0 (gap row M2).
    expect(mcnemar({ a: 0, b: 0, c: 100, d: 0 }).exactP).toBeCloseTo(2 / 2 ** 100, 40);
    expect(mcnemar({ a: 0, b: 0, c: 100, d: 0 }).exactP).toBeGreaterThan(0);
  });

  it('calls binomialTest and carries no tail loop of its own', () => {
    expect(source).toMatch(/binomialTest\(Math\.min\(table\.b, table\.c\), n\)/);
    expect(source).not.toMatch(/function logChoose/);
    expect(source).not.toMatch(/n \* Math\.LN2/);
  });
});
