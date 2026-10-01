/**
 * The bridge catalog does not import `physjs-ref`. Catalog formal references
 * live in `src/atlas/catalog-formal-ref.ts`, which calls `physjsFormalRef`.
 *
 * The scanner is the layer-order lexer, so a comment that names the module
 * is not an import. A control source that imports `physjs-ref` must fail
 * this check.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const catalogPath = join(root, 'src/bridges/index.ts');

function physjsRefImports(source: string): string[] {
  return scanFileImports(source).filter((spec) => spec.split('/').includes('physjs-ref.js') || spec.includes('physjs-ref'));
}

describe('the bridge catalog does not import physjs-ref', () => {
  it('src/bridges/index.ts has no physjs-ref import', () => {
    const source = readFileSync(catalogPath, 'utf8');
    expect(physjsRefImports(source).map((spec) => `src/bridges/index.ts -> ${spec}`)).toEqual([]);
  });

  it('POSITIVE CONTROL: an import of physjs-ref is reported, and a comment is not', () => {
    const source = [
      "import { physjsFormalRef } from '../atlas/physjs-ref.js';",
      "const note = 'see physjs-ref.ts';",
      'export const unused = physjsFormalRef;',
    ].join('\n');
    expect(physjsRefImports(source)).toEqual(["../atlas/physjs-ref.js"]);
    expect(physjsRefImports("// import { physjsFormalRef } from '../atlas/physjs-ref.js';\n")).toEqual([]);
  });
});
