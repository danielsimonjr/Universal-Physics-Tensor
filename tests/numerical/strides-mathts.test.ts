/**
 * Leverage plan task U1: UPT row-major strides come from MathTS core `rowMajorStrides`, and the
 * inline copy in `pderiv.ts` is gone. The agreement rows hold the plan's edge inputs.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { rowMajorStrides } from '../../src/numerical/strides.js';

/** strides[k] = product of shape[k+1..]: the definition, written out. */
function byDefinition(shape: readonly number[]): number[] {
  return shape.map((_, k) => shape.slice(k + 1).reduce((p, n) => p * n, 1));
}

describe('rowMajorStrides', () => {
  it('agrees with the definition on the edge shapes', () => {
    for (const shape of [[], [1], [3, 0, 2], [2, 3, 4], [2, 3, 4, 5, 6, 7]]) {
      expect(rowMajorStrides(shape), JSON.stringify(shape)).toEqual(byDefinition(shape));
    }
  });

  it('is the MathTS core function, and pderiv.ts has no inline copy', () => {
    const strides = readFileSync(new URL('../../src/numerical/strides.ts', import.meta.url), 'utf8');
    expect(strides).toMatch(/import \{[^}]*\browMajorStrides\b[^}]*\} from '@danielsimonjr\/mathts-core'/);
    const pderiv = readFileSync(new URL('../../src/numerical/pderiv.ts', import.meta.url), 'utf8');
    expect(pderiv).not.toMatch(/strides\[k\]\s*=\s*acc/);
  });
});
