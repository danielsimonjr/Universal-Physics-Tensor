/**
 * MathTS leverage plan task U8: `flatToNested` is MathTS tensor
 * `new Tensor(shape, data).toNested()`. The local recursive slicer read a data
 * length that was not the product of the shape as a shorter stride and
 * returned a wrong nesting; the MathTS constructor refuses it, and the helper
 * re-throws that as `NumericalBackendError`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { flatToNested } from '../../src/numerical/connection-lowering-helpers.js';
import { NumericalBackendError } from '../../src/numerical/errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../../src/numerical/connection-lowering-helpers.ts'), 'utf8');

describe('flatToNested through MathTS Tensor (U8)', () => {
  it('nests row-major for ranks 0 to 3', () => {
    expect(flatToNested([7], [])).toBe(7);
    expect(flatToNested([1, 2, 3], [3])).toEqual([1, 2, 3]);
    expect(flatToNested([1, 2, 3, 4, 5, 6], [2, 3])).toEqual([[1, 2, 3], [4, 5, 6]]);
    expect(flatToNested([1, 2, 3, 4, 5, 6, 7, 8], [2, 2, 2])).toEqual([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
  });

  it('keeps an empty axis and a NaN entry', () => {
    expect(flatToNested([], [0])).toEqual([]);
    const nested = flatToNested([Number.NaN, 1], [2]) as number[];
    expect(Number.isNaN(nested[0])).toBe(true);
    expect(nested[1]).toBe(1);
  });

  it('refuses a data length that is not the product of the shape', () => {
    expect(() => flatToNested([1, 2, 3], [2, 2])).toThrow(NumericalBackendError);
    expect(() => flatToNested([1, 2, 3, 4, 5], [2, 2])).toThrow(NumericalBackendError);
    expect(() => flatToNested([], [])).toThrow(NumericalBackendError);
  });

  it('calls the MathTS Tensor and carries no recursive slicer', () => {
    expect(source).toMatch(/new Tensor\(/);
    expect(source).toMatch(/\.toNested\(\)/);
    expect(source).not.toMatch(/function flatToNestedImpl/);
  });
});
