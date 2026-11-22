/**
 * Gap oracle: MathTS unit API vs UPT's admitted table and grammar.
 *
 * Records agreements the delegation PRs must preserve and gaps that stay in the
 * UPT wrapper until MathTS closes them (A6–A10) or by policy (bit, ton, cycles).
 *
 * Control: deleting one `expect` in `gapRows` must fail this file — the
 * assertions are wired, not decorative.
 *
 * Disclosure (AGENTS.md Law 2): the gap rows below were pinned after observing
 * the installed MathTS 0.28.0 behavior (a post-hoc gap pin, not a
 * pre-registered prediction). The RED control was still run by flipping one
 * new assertion (`parseUnit('dB')` to not throw) on the unchanged tree and
 * recording the failure before restoring the real expectation. That proves the
 * assertions fire, not that they were written blind; what they pin is the
 * measured 0.28.0 behavior, checked probe-by-probe before each assertion was
 * written.
 */
import {
  Unit,
  exactScaleToNumber,
  toSiDimensionVector,
  UnitParseError,
  REFUSED_UNIT_SPELLINGS,
  getUnitRow,
  NAMED_IRRATIONALS,
  AmbiguousUnitError as MathTSAmbiguousUnitError,
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
  unitReadingsSource,
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

  it('the middle dot is a product sign on both sides, and a dotted text reads through MathTS (closed by 0.24.0)', () => {
    for (const [dotted, starred] of [['m^2/(V·s)', 'm^2/(V*s)'], ['N·m', 'N*m'], ['W/(m·K)', 'W/(m*K)'], ['cm^2/(V·s)', 'cm^2/(V*s)']] as const) {
      expect(unitReadingsSource(dotted), dotted).toBe('mathts');
      expect(parseUnit(dotted)).toEqual(parseUnit(starred));
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

describe('Unit.readings agrees with the local splitter on °R, pc and the micro sign (closed by core 0.24.1 to 0.24.4)', () => {
  const names = (t: string) => Unit.readings(t).map((r) => r.map((f) => f.name).join('·'));

  it('a glued token with °R has a reading (core 0.24.1)', () => {
    expect(names('m°R')).toEqual(['m·degR']);
    // UPT reads a glued product only from a row of data/units.json `products` (issue 676).
    expect(() => parseUnit('J/m°R')).toThrow(UnknownUnitError);
  });

  it('a glued token keeps a sub-kilo prefix on pc (core 0.24.2)', () => {
    expect(names('Hzpc')).toEqual(['H·zpc', 'Hz·pc']);
    expect(() => parseUnit('1/Hzpc')).toThrow(UnknownUnitError);
  });

  it('a micro sign is a prefix only, never the atomic mass unit u (core 0.24.3)', () => {
    // Control: MathTS splits `umK` as `u·m·K` too, but UPT reads only `um·K`, the m·K row with a prefix.
    expect(names('umK')).toContain('u·m·K');
    expect(parseUnit('W/umK').scale).toBe(1e6);
    for (const micro of ['µ', 'μ']) {
      expect(names(`${micro}mK`).some((r) => r.startsWith('u·')), micro).toBe(false);
      expect(() => Unit.parse(`5 ${micro}`), micro).toThrow();
      expect(parseUnit(`W/${micro}mK`).scale, micro).toBe(1e6);
    }
  });
  it('a caret or a superscript inside a glued token has a reading (core 0.24.4)', () => {
    expect(names('m^2K')).toEqual(['m·K']);
    for (const glued of ['m^2K', 'm²K', 'mK^2']) expect(Unit.readings(glued).length, glued).toBeGreaterThan(0);
    expect(Unit.readings('m^2K')[0]!.map((f) => f.power)).toEqual([2, 1]);
    expect(Unit.readings('mK^2')[0]!.map((f) => f.power)).toEqual([1, 2]);
    expect(parseUnit('W/m^2K')).toEqual(parseUnit('W/(m^2*K)'));
    expect(parseUnit('W/m²K')).toEqual(parseUnit('W/(m^2*K)'));
  });

  it('a superscript power above ³, ⁰ or a digit run reads on both sides (UPT grammar: a superscript reads the caret integers)', () => {
    // This was a gap row: UPT read only ¹, ² and ³, and refused `W/m⁴K` with UnknownUnitError.
    const names = (t: string) => Unit.readings(t).map((r) => r.map((f) => `${f.name}^${f.power}`).join('·'));
    expect(names('m⁴K')).toEqual(['m^4·K^1']);
    expect(names('m⁰K')).toEqual(['m^0·K^1']);
    expect(names('m¹⁰K')).toEqual(['m^10·K^1']);
    for (const [glued, caret] of [['m⁴K', 'm^4K'], ['m⁰K', 'm^0K'], ['m¹⁰K', 'm^10K']] as const) {
      expect(parseUnit(`W/${glued}`), glued).toEqual(parseUnit(`W/${caret}`));
    }
    // s·K is not a products row, so both spellings are an unknown unit.
    for (const glued of ['sK⁻⁴', 'sK^-4']) expect(() => parseUnit(`W/${glued}`), glued).toThrow(UnknownUnitError);
    expect(parseUnit('W/m⁴K')).toEqual(parseUnit('W/(m^4*K)'));
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
      id: 'pc takes only k-and-up prefixes in MathTS Unit.parse',
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
        expect(parseUnit('mol/mL').scale).toBeCloseTo(1e6, 6);
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
      id: 'furlong wider MathTS table',
      check: () => {
        expect(() => Unit.parse('furlong')).not.toThrow();
        expect(() => parseUnit('furlong')).toThrow(UnknownUnitError);
      },
    },
    {
      id: 'logarithmic units dB/dBm/dBW/Np parse in MathTS, refused in UPT',
      check: () => {
        // Measured on 0.28.0: `1 dB` → 10^0.1 (dimensionless power ratio),
        // `1 dBm` → 10^0.1 mW (the milli prefix applies), `1 dBW` → 10^0.1 W
        // (watt reference, same ratio), `1 Np` → e (1 Np = e^(1) in amplitude).
        for (const s of ['dB', 'dBm', 'dBW', 'Np']) {
          expect(getUnitRow(s), s).toBeDefined();
          expect(s in REFUSED_UNIT_SPELLINGS, s).toBe(false);
          expect(() => parseUnit(s), s).toThrow(UnitRefusedError);
        }
        const dB = (Unit.parse('1 dB') as { toSI(): { value: unknown } }).toSI().value;
        expect(dB).toBeCloseTo(10 ** 0.1, 12);
        const dBm = (Unit.parse('1 dBm') as { toSI(): { value: unknown } }).toSI().value;
        expect(dBm).toBeCloseTo(1e-3 * 10 ** 0.1, 12);
        const dBW = (Unit.parse('1 dBW') as { toSI(): { value: unknown } }).toSI().value;
        expect(dBW).toBeCloseTo(10 ** 0.1, 12);
        const np = (Unit.parse('1 Np') as { toSI(): { value: unknown } }).toSI().value;
        expect(np).toBeCloseTo(Math.E, 12);
      },
    },
    {
      id: 'Bq/Gy/Sv/kat absent from the MathTS table, present in UPT',
      check: () => {
        for (const s of ['Bq', 'Gy', 'Sv', 'kat']) {
          expect(getUnitRow(s), s).toBeUndefined();
          expect(() => Unit.parse(s), s).toThrow(UnitParseError);
          // Absent, not merely ambiguous (`AmbiguousUnitError extends
          // UnitParseError`). `not.toBeInstanceOf` on the thunk is vacuous —
          // a function is never an error instance. `not.toThrow` matches
          // the thrown value's class.
          expect(() => Unit.parse(s), s).not.toThrow(MathTSAmbiguousUnitError);
          expect(parseUnit(s).scale, s).toBe(1);
        }
      },
    },
    {
      id: 'Pas ambiguous in MathTS, single reading in UPT',
      check: () => {
        // The MathTS class, not UPT's `AmbiguousUnitError` (also imported above).
        expect(() => Unit.parse('Pas')).toThrow(MathTSAmbiguousUnitError);
        expect(parseUnit('Pas').scale).toBe(1);
      },
    },
    {
      id: 'mAs a listed glued product in UPT, unknown in MathTS',
      check: () => {
        expect(() => Unit.parse('mAs')).toThrow(UnitParseError);
        expect(() => Unit.parse('mAs')).not.toThrow(MathTSAmbiguousUnitError);
        expect(parseUnit('mAs').scale).toBe(1e-3);
      },
    },
    {
      id: 'ln2 is an irrational, not a unit spelling, on either side',
      check: () => {
        expect(() => Unit.parse('ln2')).toThrow(UnitParseError);
        // Absent, not ambiguous (`AmbiguousUnitError extends UnitParseError`),
        // matching the Bq-group and `mAs` rows.
        expect(() => Unit.parse('ln2')).not.toThrow(MathTSAmbiguousUnitError);
        expect(Number(NAMED_IRRATIONALS.ln2)).toBeCloseTo(Math.LN2, 15);
        expect(() => parseUnit('ln2')).toThrow(UnknownUnitError);
      },
    },
  ];

  it.each(gapRows)('$id', ({ check }) => {
    check();
  });
});
