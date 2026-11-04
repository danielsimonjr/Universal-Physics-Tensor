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
  REFUSED_UNIT_SPELLINGS,
} from '@danielsimonjr/mathts-core';
import { symmetricRelDiff } from '../../src/core/compare.js';
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
    expect(symmetricRelDiff(exactScaleToNumber(pc!), local)).toBeLessThan(1e-15);
  });

  it('exactScale(Hz) is 1 on both sides', () => {
    const hz = Unit.exactScale('Hz');
    expect(hz).not.toBeNull();
    expect(exactScaleToNumber(hz!)).toBe(1);
    expect(convertValue('1 Hz', 's^-1').value).toBe(1);
  });

  it('the day symbol reads 86400 s on both sides (closed by 0.20.0)', () => {
    expect(exactScaleToNumber(Unit.exactScale('d')!)).toBe(86400);
    expect(convertValue('1 d', 's').value).toBe(86400);
    expect(parseUnit('dm').scale).toBe(0.1);
  });

  it('psi and torr take SI prefixes on both sides (closed by 0.21.0)', () => {
    for (const text of ['kpsi', 'Mpsi', 'mtorr', 'utorr']) {
      const mt = exactScaleToNumber(Unit.exactScale(text)!);
      expect(symmetricRelDiff(mt, parseUnit(text).scale)).toBeLessThan(1e-15);
    }
  });

  it('the MathTS refusal registry states the same reasons UPT prints', () => {
    for (const [symbol, reason] of Object.entries(REFUSED_UNIT_SPELLINGS)) {
      expect(() => Unit.parse(symbol)).toThrow(/refused/);
      expect(() => parseUnit(symbol)).toThrow(UnitRefusedError);
      try {
        parseUnit(symbol);
      } catch (error) {
        expect((error as Error).message).toBe(reason);
      }
    }
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
        // 0.21.0 still reads `ton` as the US short ton, 2000 lb.
        expect(exactScaleToNumber(Unit.exactScale('ton')!)).toBe(907.18474);
        expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
      },
    },
    {
      id: 'pc takes only k-and-up prefixes in MathTS',
      check: () => {
        expect(() => Unit.parse('Mpc')).not.toThrow();
        expect(() => Unit.parse('mpc')).toThrow(UnitParseError);
        expect(parseUnit('mpc').scale).toBeCloseTo(parseUnit('pc').scale / 1000, -18);
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
