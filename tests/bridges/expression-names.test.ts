/**
 * The names a catalog expression mentions are read once, after the kebab
 * names are rewritten to one token each (`expressionNames`). The notices
 * reader ran a bare identifier regex on the raw expression, so be-39's
 * `truncation-coefficient-b` yielded `b`, the Wien constant, and printed its
 * caveat beside a relation that never reads it.
 */
import { describe, expect, it } from 'vitest';
import { expressionNames } from '../../src/bridges/expr-parse.js';
import { relationNotices } from '../../src/bridges/notices.js';
import { primaryRelation } from '../../src/bridges/catalog-load.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';

describe('expressionNames', () => {
  it('reads a kebab quantity as one name, written with underscores', () => {
    const names = expressionNames(
      '2*newton-coupling-dimensionless + truncation-coefficient-b*newton-coupling-dimensionless^3',
    );
    expect(names.has('truncation_coefficient_b')).toBe(true);
    expect(names.has('b')).toBe(false);
    expect(names.has('truncation')).toBe(false);
  });

  it('lists π and the constants an expression reads', () => {
    const names = expressionNames('8*pi*G*rho/3');
    expect([...names]).toEqual(expect.arrayContaining(['pi', 'G', 'rho']));
  });
});

describe('relationNotices reads the rewritten names', () => {
  it.fails(
    'KNOWN DEFECT, not fixed here: hbar spelled `reduced-planck-constant` does not reach its note, because ' +
      '`rewriteCatalogHyphens` rewrites the declared quantity `planck-constant` inside it first (its lookbehind admits a ' +
      'preceding `-`), leaving `reduced`, `planck_constant`. The bare regex the notices reader used read `reduced`, ' +
      '`planck`, `constant`; neither finds `hbar`. This marker flips when hyphen-names.ts is fixed.',
    () => {
      const relation = { ...primaryRelation(56)!, expression: 'reduced-planck-constant*omega' };
      expect(relationNotices(relation).join('\n')).toMatch(/exact reduced Planck constant/);
    },
  );

  it('be-39 prints no note: its `b` is a truncation coefficient, and the Wien constant `b` carries no note anyway', () => {
    // The bare regex read `b` out of `truncation-coefficient-b`; that was not visible as a printed
    // caveat only because the Wien row has no note. `expressionNames` reads the quantity as one token.
    expect(constantRecord('b')).toBeDefined();
    expect(constantRecord('b')?.note).toBeUndefined();
    expect(relationNotices(primaryRelation(39)!)).toEqual([]);
  });

  it('the control: a relation that names hbar still prints the hbar caveat', () => {
    expect(relationNotices(primaryRelation(56)!).join('\n')).toMatch(/exact reduced Planck constant/);
  });
});
