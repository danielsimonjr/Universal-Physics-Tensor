/**
 * Part A step A4: agreed unit scales come from `Unit.exactScale`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scaleToNumber } from '../../src/dimensional/exact-scale.js';
import { mathtsExactScaleAgreed, unitExactScaleViaMathts } from '../../src/dimensional/mathts-unit-delegation.js';
import { parseUnit, readUnit } from '../../src/dimensional/units.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unitsSource = readFileSync(resolve(root, 'src/dimensional/units.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('units.ts takes agreed scales from Unit.exactScale (A4)', () => {
  it('calls Unit.exactScale in production', () => {
    expect(unitsSource).toMatch(/from '@danielsimonjr\/mathts-core'/);
    expect(unitsSource).toMatch(/\bUnit\.exactScale\b/);
  });

  it('predicate member g/cm^3 and non-member bit', () => {
    const agreed = readUnit('g/cm^3');
    expect(unitExactScaleViaMathts('g/cm^3', agreed.scale, agreed.exact, agreed.dim)).toBe(true);
    const bit = readUnit('bit');
    expect(mathtsExactScaleAgreed('bit', bit.scale, bit.exact)).toBe(false);
    expect(unitExactScaleViaMathts('bit', bit.scale, bit.exact, bit.dim)).toBe(false);
  });

  it('bit keeps the ln 2 scale, not MathTS axis-8 scale 1', () => {
    expect(parseUnit('bit').scale).not.toBe(1);
    expect(parseUnit('bit').scale).toBeCloseTo(Math.LN2, 12);
    const row = readUnit('bit');
    expect(scaleToNumber(row.exact)).toBeCloseTo(Math.LN2, 12);
  });
});
