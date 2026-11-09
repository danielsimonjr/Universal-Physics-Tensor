/**
 * The `pc` prefix override: MathTS 0.21.0 admits only the k-and-up prefixes on
 * `pc` (its row is `SHORT_UP_ONLY` — `mpc` beside `Mpc` is a typo trap there),
 * while UPT's prefix table applies to every prefixable row in
 * `data/units.json`. The sub-k parsec spellings stay on the local grammar by
 * policy; the k-and-up spellings read through MathTS.
 *
 * Control: the override assertions fail if the sub-k spellings ever route to
 * MathTS (they would throw there), and the delegation assertions fail if the
 * k-and-up spellings stop agreeing with `Unit.exactScale`.
 */
import { exactScaleToNumber, Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { isSubKiloParsec } from '../../src/dimensional/mathts-unit-delegation.js';
import { mathtsWouldParse } from '../../src/dimensional/mathts-unit-wrapper.js';
import { parseUnit, readUnit, unitReadingsSource } from '../../src/dimensional/units.js';

const PC_SCALE = parseUnit('pc').scale;

describe('MathTS delegates the k-and-up parsec spellings', () => {
  it.each(['kpc', 'Mpc', 'Gpc', 'Tpc', 'Ppc', 'Epc'])('%s reads through MathTS', (text) => {
    expect(mathtsWouldParse(text)).toBe(true);
    expect(unitReadingsSource(text)).toBe('mathts');
    expect(readUnit(text).scale).toBe(exactScaleToNumber(Unit.exactScale(text)!));
  });

  it('Mpc keeps the table value: pc × 1e6', () => {
    expect(parseUnit('Mpc').scale).toBe(parseUnit('pc').scale * 1e6);
    expect(parseUnit('Mpc').dim).toEqual(parseUnit('pc').dim);
  });
});

describe('the sub-k parsec spellings stay UPT policy (the override)', () => {
  it('MathTS admits only k and up on pc', () => {
    expect(mathtsWouldParse('Mpc')).toBe(true);
    expect(mathtsWouldParse('mpc')).toBe(false);
  });

  it('the wrapper names the sub-k spellings', () => {
    for (const prefix of ['d', 'c', 'm', 'u', 'µ', 'μ', 'n', 'p', 'f', 'a', 'z', 'y', 'r', 'q', 'h', 'da']) {
      expect(isSubKiloParsec(`${prefix}pc`)).toBe(true);
    }
    for (const text of ['Mpc', 'kpc', 'Rpc', 'Qpc', 'pc', 'mp', 'km', 'min']) {
      expect(isSubKiloParsec(text)).toBe(false);
    }
  });

  it.each(['mpc', 'cpc', 'dpc', 'hpc', 'dapc', 'mpc', 'µpc', 'npc', 'ppc', 'fpc', 'apc', 'zpc', 'ypc', 'rpc', 'qpc'])(
    '%s parses at its prefix times the parsec, on the local grammar',
    (text) => {
      const factor = parseUnit(text).scale / PC_SCALE;
      expect(factor).toBeGreaterThan(0);
      expect(Math.log10(factor)).toBeCloseTo(Math.log10(parseUnit(text.replace(/pc$/, '') + 'm').scale), 9);
      expect(parseUnit(text).dim).toEqual(parseUnit('pc').dim);
      expect(unitReadingsSource(text)).toBe('local');
    },
  );

  it('mpc is a milliparsec and sits beside Mpc without colliding', () => {
    expect(parseUnit('mpc').scale / PC_SCALE).toBeCloseTo(1e-3, 12);
    expect(parseUnit('Mpc').scale / PC_SCALE).toBeCloseTo(1e6, 6);
  });
});
