/**
 * Part A step A2: exact-scale arithmetic delegates to MathTS. The source scan
 * fails while `rationalToNumber` is still the rounding implementation; the
 * throw tests fail while `addScales` and `powerScale` still fall back to floats.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  addScales,
  irrationalScale,
  powerScale,
  ratioScale,
} from '../../src/dimensional/exact-scale.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exactScaleSource = readFileSync(resolve(root, 'src/dimensional/exact-scale.ts'), 'utf8');

describe('exact-scale.ts delegates arithmetic to MathTS (A2)', () => {
  it('rounds through exactScaleToNumber, not a local rationalToNumber', () => {
    expect(exactScaleSource).toMatch(/\bexactScaleToNumber\b/);
    expect(exactScaleSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')).not.toMatch(/function rationalToNumber\b/);
  });

  it('addScales throws when pi and ln2 would be merged as floats', () => {
    expect(() => addScales(irrationalScale(Math.PI), irrationalScale(Math.LN2))).toThrow(RangeError);
  });

  it('powerScale throws on a fractional exponent', () => {
    expect(() => powerScale(ratioScale(2, 3), 0.5)).toThrow(RangeError);
  });

  it('addScales of two rationals stays exact (the throw is not the only path)', () => {
    expect(addScales(ratioScale(1, 2), ratioScale(1, 3))).toEqual({
      num: 5n,
      den: 6n,
      irrational: 1,
    });
  });

  it('does not import units.ts or unit-data.ts (A2 file boundary)', () => {
    const code = exactScaleSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/from ['"]\.\/units\.js['"]/);
    expect(code).not.toMatch(/from ['"]\.\/unit-data\.js['"]/);
  });

  it('readScaleExpression delegates to MathTS: no local factor product stays in the file', () => {
    const code = exactScaleSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).toMatch(/readScaleExpression/);
    expect(code).not.toMatch(/const FACTOR|const product =/);
  });
});
