/**
 * Part A step A8: wrapper refusal denylist before MathTS.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Unit } from '@danielsimonjr/mathts-core';
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

const denylistSymbols = ['dB', 'dBm', 'dBW', 'Np', 'Mach', 'mach', 'ton'] as const;

describe('wrapper refusal denylist (A8)', () => {
  it('unitReadings consults the wrapper denylist before MathTS', () => {
    expect(unitsSource).toMatch(/from '\.\/mathts-unit-wrapper\.js'/);
    expect(unitsSource).toMatch(/\buptRefusalReason\b/);
  });

  it.each(denylistSymbols)('%s is UnitRefusedError with the units.json message', (symbol) => {
    const reason = UNIT_DATA.refused.get(symbol);
    expect(reason).toBeDefined();
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

  it('ton stays refused even when MathTS parses the short ton', () => {
    expect(mathtsWouldParse('ton')).toBe(true);
    expect(() => parseUnit('ton')).toThrow(UnitRefusedError);
    expect(() => Unit.parse('ton')).not.toThrow();
  });
});
