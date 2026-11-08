/**
 * Each shared helper that replaced a code duplicate exists, and every former
 * copy calls it. A copy that comes back fails here before it drifts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hermiteCrossingFraction } from '../../src/numerical/hermite-crossing.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (rel: string): string => readFileSync(join(root, rel), 'utf8');

describe('hermiteCrossingFraction', () => {
  it('finds the root of the linear interpolant p0 = 1, p1 = -1 with matching slopes at s = 0.5', () => {
    expect(hermiteCrossingFraction(1, -2, -1, -2)).toBeCloseTo(0.5, 14);
  });

  it('is the one copy: both oscillator witnesses call it and keep no local interpolant', () => {
    for (const file of ['src/atlas/oscillators/limit-witnesses.ts', 'src/atlas/oscillators/norm-transport-witness.ts']) {
      const text = src(file);
      expect(text, file).toContain('hermiteCrossingFraction(');
      expect(text, file).not.toMatch(/const dp = \(s: number\)/);
    }
  });
});
