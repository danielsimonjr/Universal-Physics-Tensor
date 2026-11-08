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

  it('glued products and superscripts parse on both sides (closed by 0.22.0)', () => {
    for (const [text, dim] of [['m2K', { L: 2, Theta: 1 }], ['K²', { Theta: 2 }], ['Vs', {}], ['cm^2/Vs', {}]] as const) {
      expect(() => Unit.parse(text)).not.toThrow();
      const local = parseUnit(text);
      expect(symmetricRelDiff(exactScaleToNumber(Unit.exactScale(text)!), local.scale)).toBeLessThan(1e-15);
      for (const [axis, power] of Object.entries(dim)) expect(local.dim[axis as 'L'], `${text} ${axis}`).toBe(power);
    }
  });

  it('an affine unit inside a compound is refused on both sides (closed by 0.22.0)', () => {
    expect(() => Unit.parse('degC/s')).toThrow(/affine/);
    expect(() => parseUnit('degC/s')).toThrow(UnitRefusedError);
  });

  it('a difference reading omits the offset on both sides (closed by 0.22.0)', () => {
    const mt = Number((unit(25, 'degC') as { to(t: string, o: object): { toNumeric(): unknown } }).to('K', { reading: 'difference' }).toNumeric());
    expect(mt).toBe(25);
    expect(convertValue('25 degC', 'K', 'difference').value).toBe(25);
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
      id: 'ton ambiguous in MathTS, refused in UPT',
      check: () => {
        // From 0.22.0 MathTS names the readings (short, long, metric) instead of picking one.
        expect(() => Unit.parse('ton')).toThrow(/ambiguous/);
        expect(exactScaleToNumber(Unit.exactScale('shortton')!)).toBe(907.18474);
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
      id: 'a spaced affine spelling inside a compound parses in MathTS, refused in UPT',
      check: () => {
        // MathTS refuses `degC/s` but reads `deg C/s` as a product of other units.
        for (const text of ['deg C/s', '° C/s']) {
          expect(() => Unit.parse(text)).not.toThrow();
          expect(() => parseUnit(text)).toThrow(UnitRefusedError);
        }
      },
    },
    {
      // M6 (core 0.23.0) exports `Unit.readings`. It cannot replace the local splitter yet:
      // over 13,496 glued tokens, 280 lose a reading and none gains one. These two rows are
      // the two classes. Control: `mAs` has readings, so an empty result is a real gap.
      id: 'Unit.readings: a glued token with °R has no reading in MathTS',
      check: () => {
        expect(Unit.readings('mAs').length).toBe(2);
        expect(Unit.readings('m°R')).toEqual([]);
        expect(parseUnit('J/m°R').scale).toBe(1.8);
      },
    },
    {
      id: 'Unit.readings: a glued token omits a sub-kilo prefix on pc',
      check: () => {
        expect(Unit.readings('Hzpc').map((r) => r.map((f) => f.name).join('·'))).toEqual(['Hz·pc']);
        // The local splitter also reads H·zpc (henry, zeptoparsec), so the text stays ambiguous.
        expect(() => parseUnit('1/Hzpc')).toThrow(AmbiguousUnitError);
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
