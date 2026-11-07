/**
 * Part A step A12 (partial): A5 in-set texts skip the local grammar when MathTS agrees.
 */
import { describe, expect, it } from 'vitest';
import { A5_DELEGATED_TEXTS, tryMathtsA5Reading } from '../../src/dimensional/mathts-unit-wrapper.js';
import { parseUnit, readUnit, unitReadingsSource } from '../../src/dimensional/units.js';

describe('MathTS A5 path without local grammar (A12 partial)', () => {
  it.each(A5_DELEGATED_TEXTS)('%s reads through MathTS before the local grammar', (text) => {
    const direct = tryMathtsA5Reading(text);
    expect(direct).not.toBeNull();
    const viaReader = readUnit(text);
    expect(viaReader.scale).toBeCloseTo(direct!.scale, 12);
    expect(viaReader.dim).toEqual(direct!.dim);
    expect(unitReadingsSource(text)).toBe('mathts');
    expect(parseUnit(text).scale).toBeCloseTo(direct!.scale, 12);
  });

  it('gap rows still use the local grammar', () => {
    expect(unitReadingsSource('bit')).toBe('local');
  });

  it('a single factor with a superscript reads through MathTS once MathTS parses it (K², core 0.22.0)', () => {
    // The delegation gate admits a token that is one factor. K² is one factor; m2K is two factors glued.
    expect(unitReadingsSource('K²')).toBe('mathts');
  });
});
