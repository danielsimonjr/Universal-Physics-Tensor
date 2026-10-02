/**
 * `src/dimensional/curvature.ts` may not import `numerical`. The Bianchi
 * evaluator used to, by a type import and by a dynamic import of
 * `numerical/index.ts`. That import is what closed the layer-order cycles
 * between the two tiers. The evaluator lives in `numerical`; the validators
 * stay in this file.
 *
 * The scanner is the layer-order lexer, so a comment that names a module
 * is not an import. A control source that imports `numerical` must fail
 * this check.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const curvaturePath = join(root, 'src/dimensional/curvature.ts');

function importsNumerical(specifier: string): boolean {
  return specifier.split('/').includes('numerical');
}

export function curvatureNumericalImports(source: string): string[] {
  return scanFileImports(source).filter(importsNumerical);
}

describe('curvature does not import numerical', () => {
  it('src/dimensional/curvature.ts has no numerical import', () => {
    const source = readFileSync(curvaturePath, 'utf8');
    expect(curvatureNumericalImports(source)).toEqual([]);
  });

  it('POSITIVE CONTROL: a type import and a dynamic import of numerical are reported', () => {
    const source = [
      "import type { TensorEngine } from '../numerical/tensor-engine.js';",
      'export async function leak() {',
      "  return import('../numerical/index.js');",
      '}',
      '',
    ].join('\n');
    expect(curvatureNumericalImports(source)).toEqual([
      '../numerical/tensor-engine.js',
      '../numerical/index.js',
    ]);
  });

  it('a comment that names numerical is not an import', () => {
    const source = "// import type { TensorEngine } from '../numerical/tensor-engine.js';\nexport const ok = 1;\n";
    expect(curvatureNumericalImports(source)).toEqual([]);
  });
});
