/**
 * Gap oracle: MathTS unit API vs UPT's admitted table and grammar.
 *
 * Records agreements the delegation PRs must preserve and gaps that stay in the
 * UPT wrapper until MathTS closes them (A6–A10) or by policy (bit, ton, cycles).
 *
 * Control: deleting one `expect` in `gapRows` must fail this file — the
 * assertions are wired, not decorative.
 */
import {
  Unit,
  exactScaleToNumber,
  toSiDimensionVector,
  UnitParseError,
} from '@danielsimonjr/mathts-core';
import { unit } from '@danielsimonjr/mathts-functions';
import { describe, expect, it } from 'vitest';
import {
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  UnitRefusedError,
  UnknownUnitError,
} from '../../src/dimensional/units.js';

describe('MathTS agrees with UPT on delegated readings', () => {
  it.each([
    ['1', 'g/cm^3', 'kg/m^3', 1000],
    ['72', 'mN/m', 'N/m', 0.072],
    ['1', 'kohm', 'ohm', 1000],
    ['25', 'degC', 'K', 298.15],
  ] as const)('%s %s → %s matches UPT convertValue', (n, notation, target, si) => {
    const raw = `${n} ${notation}`;
    expect(convertValue(raw, target).value).toBe(si);
    const u = unit(Number(n), notation) as { to(target: string): { toNumeric(): unknown } };
    const mt = Number(u.to(target).toNumeric());
    expect(mt).toBe(si);
  });

  it('parsec double matches the local table', () => {
    const local = convertValue('1 pc', 'm').value;
    const pc = Unit.exactScale('pc');
    expect(pc).not.toBeNull();
    expect(exactScaleToNumber(pc!)).toBe(local);
  });

  it('exactScale(Hz) is 1 on both sides', () => {
    const hz = Unit.exactScale('Hz');
    expect(hz).not.toBeNull();
    expect(exactScaleToNumber(hz!)).toBe(1);
    expect(convertValue('1 Hz', 's^-1').value).toBe(1);
  });
});

describe('MathTS gaps the UPT wrapper must keep', () => {
  const gapRows: { readonly id: string; readonly check: () => void }[] = [
    {
      id: 'bit axis-8 scale 1',
      check: () => {
        const bitEs = Unit.exactScale('bit');
        expect(bitEs).not.toBeNull();
        expect(exactScaleToNumber(bitEs!)).toBe(1);
        const u = unit(1, 'bit') as { dimensions: number[] };
        expect(() => toSiDimensionVector(u.dimensions)).toThrow();
        expect(parseUnit('bit').scale).not.toBe(1);
      },
    },
    {
      id: 'ton accepted in MathTS',
      check: () => {
        expect(() => Unit.parse('ton')).not.toThrow();
        expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
      },
    },
    {
      id: 'bare d unknown in MathTS',
      check: () => {
        expect(() => Unit.parse('d')).toThrow(UnitParseError);
        expect(parseUnit('d').scale).toBe(86400);
      },
    },
    {
      id: 'glued m2K rejected in MathTS',
      check: () => {
        expect(() => Unit.parse('m2K')).toThrow(UnitParseError);
        expect(parseUnit('m2K').dim.L).toBe(2);
      },
    },
    {
      id: 'Unicode K² rejected in MathTS',
      check: () => {
        expect(() => Unit.parse('K²')).toThrow(UnitParseError);
        expect(parseUnit('K²').dim.Theta).toBe(2);
      },
    },
    {
      id: 'degC/s accepted in MathTS',
      check: () => {
        expect(() => Unit.parse('degC/s')).not.toThrow();
        expect(() => parseUnit('degC/s')).toThrow(UnitRefusedError);
      },
    },
    {
      id: 'mol/mL single reading in MathTS',
      check: () => {
        expect(() => Unit.parse('mol/mL')).not.toThrow();
        expect(() => parseUnit('mol/mL')).toThrow(AmbiguousUnitError);
      },
    },
    {
      id: 'Hz.to(rad/s) applies 2π',
      check: () => {
        const mt = Number((unit(1, 'Hz') as { to(target: string): { toNumeric(): unknown } }).to('rad/s').toNumeric());
        expect(mt).toBeCloseTo(2 * Math.PI, 12);
        expect(convertValue('1 Hz', 'rad/s').value).toBe(1);
        expect(convertValue('1 Hz', 'rad/s').cycles).toBe(1);
      },
    },
    {
      id: 'furlong wider MathTS table',
      check: () => {
        expect(() => Unit.parse('furlong')).not.toThrow();
        expect(() => parseUnit('furlong')).toThrow(UnknownUnitError);
      },
    },
  ];

  it.each(gapRows)('$id', ({ check }) => {
    check();
  });
});
