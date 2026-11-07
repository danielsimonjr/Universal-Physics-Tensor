/**
 * Leverage plan task U3: `rationalCandidates` reduces each fraction through MathTS functions
 * `gcd`, read back through `numberFrom`. The rows hold the gcd pairs the caller can reach:
 * a zero numerator, a negative numerator, and coprime and shared-factor pairs.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rationalCandidates } from '../../../src/composition/probe/power-law.js';

const text = (x: number, tol: number) => rationalCandidates(x, tol).map((r) => `${r.numerator}/${r.denominator}`);

describe('rationalCandidates reduction', () => {
  it('reduces 0, negatives and shared factors to lowest terms', () => {
    expect(text(0, 1e-9)).toEqual(['0/1']);
    expect(text(-0.5, 1e-9)).toEqual(['-1/2']);
    expect(text(4 / 6, 1e-9)).toEqual(['2/3']);
    expect(text(-1.5, 1e-9)).toEqual(['-3/2']);
    expect(text(5 / 6, 1e-9)).toEqual(['5/6']);
  });

  it('calls MathTS gcd, with no local copy left', () => {
    const src = readFileSync(new URL('../../../src/composition/probe/power-law.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/import \{[^}]*\bgcd\b[^}]*\} from '@danielsimonjr\/mathts-functions'/);
    expect(src).not.toMatch(/function gcd\(/);
  });
});
