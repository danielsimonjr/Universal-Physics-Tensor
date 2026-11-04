/**
 * Part A step A8 (delegated): the refusal definitions for `dB`, `dBm`, `dBW`,
 * `Np`, `Mach` and `mach` are MathTS's `REFUSED_UNIT_SPELLINGS`, not a second
 * table in `data/units.json`. MathTS 0.21.0 refuses those spellings with the
 * same reasons, inside compounds too (`dB/m`); UPT's wrapper turns the MathTS
 * refusal into `UnitRefusedError` before any parse.
 *
 * Control: the message assertion fails if the wrapper stops consulting the
 * MathTS registry — the spelling falls through to the admission list and
 * throws `UnknownUnitError`, a different class with a different message.
 * `ton` is UPT policy, not MathTS's, and stays in `data/units.json`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REFUSED_UNIT_SPELLINGS, Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { UNIT_DATA } from '../../src/dimensional/unit-data.js';
import { uptRefusalReason } from '../../src/dimensional/mathts-unit-wrapper.js';
import { parseUnit, UnitRefusedError, UnknownUnitError } from '../../src/dimensional/units.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const wrapperSource = readFileSync(resolve(root, 'src/dimensional/mathts-unit-wrapper.ts'), 'utf8').replace(
  /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
  '',
);

const MATHTS_REFUSED = ['dB', 'dBm', 'dBW', 'Np', 'Mach', 'mach'] as const;

describe('refusal definitions come from MathTS (A8 delegated)', () => {
  it('the wrapper consults the MathTS refusal registry', () => {
    expect(wrapperSource).toMatch(/REFUSED_UNIT_SPELLINGS/);
    expect(wrapperSource).toMatch(/from '@danielsimonjr\/mathts-core'/);
  });

  it('data/units.json carries no MathTS-refused spelling, and ton stays', () => {
    for (const symbol of MATHTS_REFUSED) expect(UNIT_DATA.refused.has(symbol)).toBe(false);
    expect(UNIT_DATA.refused.has('ton')).toBe(true);
  });

  it.each(MATHTS_REFUSED)('%s is UnitRefusedError with the MathTS reason', (symbol) => {
    const reason = REFUSED_UNIT_SPELLINGS[symbol];
    expect(typeof reason).toBe('string');
    expect(uptRefusalReason(symbol)).toBe(reason);
    try {
      parseUnit(symbol);
      expect.fail('expected refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitRefusedError);
      expect((error as UnitRefusedError).message).toBe(reason);
    }
  });

  it.each([
    ['dB/m', 'dB'],
    ['s/dB', 'dB'],
    ['1*dBm', 'dBm'],
  ] as const)('%s is refused by the registry spelling %s inside a compound', (text, symbol) => {
    expect(() => Unit.parse(text)).toThrow();
    expect(uptRefusalReason(text)).toBe(REFUSED_UNIT_SPELLINGS[symbol]);
    expect(() => parseUnit(text)).toThrow(UnitRefusedError);
  });

  it('a spelling MathTS refuses but UPT does not admit is refused, not unknown', () => {
    // The control: with the registry consulted, the class is UnitRefusedError.
    // Deleting the registry branch leaves the admission list, and the class
    // below would change.
    expect(() => parseUnit('dB')).toThrow(UnitRefusedError);
    expect(() => parseUnit('dB')).not.toThrow(UnknownUnitError);
  });

  it('ton is UPT policy alone: MathTS parses the short ton and has no registry row', () => {
    expect(REFUSED_UNIT_SPELLINGS['ton']).toBeUndefined();
    expect(() => Unit.parse('ton')).not.toThrow();
    expect(uptRefusalReason('ton')).toBe(UNIT_DATA.refused.get('ton'));
    expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
  });
});
