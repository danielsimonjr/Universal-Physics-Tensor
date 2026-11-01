/**
 * Part A step A11a: `bit` stays ln 2 on the 7-vector; wrapper overrides MathTS scale 1.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactScaleToNumber, Unit } from '@danielsimonjr/mathts-core';
import { describe, expect, it } from 'vitest';
import { applyBitScaleOverride } from '../../src/dimensional/mathts-unit-wrapper.js';
import { parseUnit, readUnit } from '../../src/dimensional/units.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unitsSource = readFileSync(resolve(root, 'src/dimensional/units.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('wrapper bit scale (A11a)', () => {
  it('units.ts applies applyBitScaleOverride on delegated readings', () => {
    expect(unitsSource).toMatch(/\bapplyBitScaleOverride\b/);
  });

  it('MathTS reports bit scale 1 on axis 8', () => {
    expect(exactScaleToNumber(Unit.exactScale('bit')!)).toBe(1);
  });

  it('parseUnit("bit") keeps ln 2, not MathTS scale 1', () => {
    expect(parseUnit('bit').scale).not.toBe(1);
    expect(parseUnit('bit').scale).toBeCloseTo(Math.LN2, 12);
    expect(readUnit('bit').scale).toBeCloseTo(Math.LN2, 12);
  });

  it('applyBitScaleOverride replaces a MathTS scale of 1', () => {
    const mt = Unit.exactScale('bit')!;
    const overridden = applyBitScaleOverride('bit', { num: 1n, den: 1n, irrational: 1 }, 1);
    expect(overridden.scale).toBeCloseTo(Math.LN2, 12);
    expect(overridden.scale).not.toBe(1);
    expect(overridden.exact).not.toEqual({ num: 1n, den: 1n, irrational: 1 });
    expect(mt).not.toBeNull();
  });
});
