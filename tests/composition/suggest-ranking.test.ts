/**
 * One "did you mean?" ranking for `upt map` and `upt explain`: edit distance first (0.47.0 persona
 * findings N2 and N5).
 *
 * N5: `suggestQuantities` ranked a substring before a near spelling, so `hawkng-temperature` listed
 * `temperature` (contained in it) before `hawking-temperature` (one edit away).
 * N2: `suggestByDimension` listed the same-dimension quantities alphabetically, so `lenght` got
 * "a, amplitude, barrier-width, bohr-radius, boundary-length" and never `length`. The dimension
 * stays a filter; the typed name now ranks what passes it, with the same ranker.
 */
import { describe, it, expect } from 'vitest';
import { suggestQuantities, suggestByDimension } from '../../src/composition/user-equation.js';
import { LENGTH, TEMPERATURE } from '../../src/dimensional/types.js';

describe('N5: suggestQuantities ranks by edit distance first', () => {
  it('`hawkng-temperature` suggests `hawking-temperature` before the contained `temperature`', () => {
    const got = suggestQuantities('hawkng-temperature', ['temperature', 'reheating-temperature', 'hawking-temperature']);
    expect(got[0]).toBe('hawking-temperature');
    expect(got).toContain('temperature');
  });
});

describe('N2: suggestByDimension ranks the same-dimension set by the typed name', () => {
  const cat = new Map([
    ['a', LENGTH],
    ['amplitude', LENGTH],
    ['barrier-width', LENGTH],
    ['bohr-radius', LENGTH],
    ['boundary-length', LENGTH],
    ['length', LENGTH],
    ['temperature', TEMPERATURE],
  ]);

  it('`lenght` puts `length` first among the length-dimension quantities', () => {
    const got = suggestByDimension(LENGTH, cat, 5, 'lenght');
    expect(got[0]).toBe('length');
    expect(got).not.toContain('temperature');
  });

  it('a swapped letter pair is ONE edit: `lenght` ranks `length` before `height`', () => {
    // Plain Levenshtein counts ht→th as 2, the same as lenght→height (l→h, n→i), and the tie
    // then fell to the alphabet: the real catalog printed "height, length, …".
    const got = suggestByDimension(LENGTH, new Map([['height', LENGTH], ['length', LENGTH]]), 5, 'lenght');
    expect(got).toEqual(['length', 'height']);
  });

  it('the dimension is a filter, not a relevance gate: a far name still gets same-dimension suggestions', () => {
    expect(suggestByDimension(LENGTH, cat, 5, 'uu')).toHaveLength(5);
  });

  it('without a name the order stays alphabetical (the public contract)', () => {
    expect(suggestByDimension(LENGTH, cat, 3)).toEqual(['a', 'amplitude', 'barrier-width']);
  });
});

// Audit I5 residual: containment let every one-letter name through for a long input
// (`schrodinger-equation` contains a, g, q, r). A contained name counts only from 3 characters.
describe('audit I5 residual: containment needs at least three characters', () => {
  it('a long input is not "near" a one-letter name it happens to contain', () => {
    const got = suggestQuantities('schrodinger-equation', ['a', 'A', 'g', 'q', 'r', 'energy']);
    expect(got.filter((s) => s.length < 3)).toEqual([]);
  });

  it('a one-letter input finds its exact name and one-edit neighbours, not every name holding the letter', () => {
    expect(suggestQuantities('a', ['a', 'b', 'acceleration'])).toEqual(['a', 'b']);
  });

  it('control: a contained name of three or more characters still counts (temperature in hawkng-temperature)', () => {
    expect(suggestQuantities('hawkng-temperature', ['temperature', 'mass'])).toEqual(['temperature']);
  });
});
