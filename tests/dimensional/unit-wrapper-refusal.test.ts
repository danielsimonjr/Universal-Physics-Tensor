/**
 * Part A step A8: the wrapper refusal layer. `ton` is UPT policy and stays in
 * `data/units.json`; the logarithmic and ratio refusals (`dB`, `dBm`, `dBW`,
 * `Np`, `Mach`, `mach`) are MathTS's `REFUSED_UNIT_SPELLINGS` since 0.21.0,
 * consulted by the wrapper before any parse, compounds included.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AmbiguousUnitError, REFUSED_UNIT_SPELLINGS, Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { UNIT_DATA } from '../../src/dimensional/unit-data.js';
import {
  mathtsWouldParse,
  refusedTokensIn,
  uptRefusalReason,
} from '../../src/dimensional/mathts-unit-wrapper.js';
import { parseUnit, UnitRefusedError } from '../../src/dimensional/units.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unitsSource = readFileSync(resolve(root, 'src/dimensional/units.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const mathtsRefused = ['dB', 'dBm', 'dBW', 'Np', 'Mach', 'mach'] as const;
const denylistSymbols = [...mathtsRefused, 'ton', 'tons'] as const;

describe('wrapper refusal layer (A8)', () => {
  it('unitReadings consults the wrapper refusal layer before MathTS', () => {
    expect(unitsSource).toMatch(/from '\.\/mathts-unit-wrapper\.js'/);
    expect(unitsSource).toMatch(/\buptRefusalReason\b/);
  });

  it.each(mathtsRefused)('%s is UnitRefusedError with the MathTS reason', (symbol) => {
    const reason = REFUSED_UNIT_SPELLINGS[symbol];
    expect(reason).toBeDefined();
    expect(UNIT_DATA.refused.has(symbol)).toBe(false);
    expect(uptRefusalReason(symbol)).toBe(reason);
    expect(refusedTokensIn(symbol)).toContain(symbol);
    try {
      parseUnit(symbol);
      expect.fail('expected refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(UnitRefusedError);
      expect((error as UnitRefusedError).message).toBe(reason);
    }
  });

  it('ton is UnitRefusedError with the units.json message', () => {
    const reason = UNIT_DATA.refused.get('ton');
    expect(reason).toBeDefined();
    expect(uptRefusalReason('ton')).toBe(reason);
    expect(REFUSED_UNIT_SPELLINGS['ton']).toBeUndefined();
    expect(refusedTokensIn('ton')).toContain('ton');
  });

  it('tons is refused like ton: MathTS 0.22 names both ambiguous', () => {
    expect(() => Unit.parse('tons')).toThrow(AmbiguousUnitError);
    expect(UNIT_DATA.refused.get('tons')).toBeDefined();
    expect(() => parseUnit('tons')).toThrow(UnitRefusedError);
  });

  it.each(denylistSymbols)('%s is refused inside a compound', (symbol) => {
    const compound = `${symbol}/s`;
    expect(uptRefusalReason(compound)).toBeDefined();
    expect(() => parseUnit(compound)).toThrow(UnitRefusedError);
  });

  it('ton stays refused while MathTS names it ambiguous', () => {
    expect(mathtsWouldParse('ton')).toBe(false);
    expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
    expect(() => Unit.parse('ton')).toThrow(/ambiguous/);
  });
});
