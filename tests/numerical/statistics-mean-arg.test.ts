/**
 * `meanOf` passes the caller's array to MathTS `mean` without a copy. MathTS `mean` does not
 * mutate its input, and the frozen-input row in `statistics.test.ts` fails if a release starts to.
 */
import { describe, expect, it, vi } from 'vitest';

const seen: unknown[] = [];
vi.mock('@danielsimonjr/mathts-functions', async (importOriginal) => {
  const real = await importOriginal<typeof import('@danielsimonjr/mathts-functions')>();
  return {
    ...real,
    mean: (...args: unknown[]) => {
      seen.push(args[0]);
      return (real.mean as (...a: unknown[]) => unknown)(...args);
    },
  };
});

const { meanOf } = await import('../../src/numerical/statistics.js');

describe('meanOf argument', () => {
  it('gives MathTS mean the caller array itself, not a copy', () => {
    const xs = [1, 2, 3, 4];
    expect(meanOf(xs)).toBe(2.5);
    expect(seen.at(-1)).toBe(xs);
  });
});
