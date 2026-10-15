/**
 * `core/compare`: the relative-difference quotients, the three tolerance
 * predicates (each in the product form the migrated sites used, so a verdict
 * does not move by an ulp), and the codepoint string order that the sort
 * sites spelled as a ternary.
 */
import { describe, expect, it } from 'vitest';
import {
  byKey,
  compareCodepoint,
  relDiff,
  symmetricRelDiff,
  withinMixed,
  withinRel,
  withinSymmetric,
} from '../../src/core/compare.js';

describe('relDiff and symmetricRelDiff', () => {
  it('relDiff divides by the reference, floored', () => {
    expect(relDiff(1.1, 1, 1e-30)).toBeCloseTo(0.1, 15);
    expect(relDiff(1, 1.1, 1e-30)).toBeCloseTo(0.1 / 1.1, 15);
    // A zero reference falls back to the floor: the site that compared a finite-difference Ricci
    // scalar against a closed-form 0 used 1e-30.
    expect(relDiff(2e-31, 0, 1e-30)).toBe(0.2);
    expect(relDiff(1, 1, 1e-30)).toBe(0);
  });

  it('symmetricRelDiff divides by the larger magnitude, floored', () => {
    expect(symmetricRelDiff(2, 1, 0)).toBe(0.5);
    expect(symmetricRelDiff(1, 2, 0)).toBe(0.5);
    expect(symmetricRelDiff(-2, 1, 0)).toBe(1.5);
    expect(symmetricRelDiff(1e-9, 0, 1)).toBe(1e-9);
  });
});

describe('the predicates keep the product form of their sites', () => {
  it('withinRel is |value − ref| ≤ tol·max(|ref|, floor)', () => {
    expect(withinRel(1.0000001, 1, 1e-6, 0)).toBe(true);
    expect(withinRel(1.00001, 1, 1e-6, 0)).toBe(false);
    // The constant-registry site: a zero floor, so the test is purely relative.
    expect(withinRel(0, 0, 1e-6, 0)).toBe(true);
    expect(withinRel(1e-20, 0, 1e-6, 0)).toBe(false);
  });

  it('withinMixed is |value − ref| ≤ tol·max(1, |ref|)', () => {
    expect(withinMixed(1.0005, 1, 1e-3)).toBe(true);
    expect(withinMixed(1.002, 1, 1e-3)).toBe(false);
    // Near zero the test is absolute at tol.
    expect(withinMixed(5e-4, 0, 1e-3)).toBe(true);
    expect(withinMixed(2e-3, 0, 1e-3)).toBe(false);
    // Far from one it is relative to the reference, not to the value.
    expect(withinMixed(1000.5, 1000, 1e-3)).toBe(true);
    expect(withinMixed(1000, 1001.5, 1e-3)).toBe(false);
  });

  it('withinSymmetric is |a − b| ≤ tol·max(|a|, |b|, floor)', () => {
    expect(withinSymmetric(1, 1 + 5e-9, 1e-8, 1)).toBe(true);
    expect(withinSymmetric(1, 1 + 5e-8, 1e-8, 1)).toBe(false);
    expect(withinSymmetric(1e6, 1e6 + 5e-3, 1e-8, 1)).toBe(true);
    expect(withinSymmetric(0, 5e-9, 1e-8, 1)).toBe(true);
  });
});

describe('codepoint order', () => {
  it('compareCodepoint orders by UTF-16 code unit, which is not localeCompare', () => {
    expect(compareCodepoint('a', 'b')).toBe(-1);
    expect(compareCodepoint('b', 'a')).toBe(1);
    expect(compareCodepoint('a', 'a')).toBe(0);
    // Upper case sorts before lower case by codepoint; localeCompare puts 'a' first.
    expect(compareCodepoint('a', 'B')).toBe(1);
    expect('a'.localeCompare('B')).toBe(-1);
    expect(['be-9', 'be-10'].sort(compareCodepoint)).toEqual(['be-10', 'be-9']);
  });

  it('byKey sorts records by a string key in codepoint order', () => {
    const rows = [{ id: 'b' }, { id: 'A' }, { id: 'a' }];
    expect(rows.sort(byKey((r) => r.id)).map((r) => r.id)).toEqual(['A', 'a', 'b']);
  });
});
