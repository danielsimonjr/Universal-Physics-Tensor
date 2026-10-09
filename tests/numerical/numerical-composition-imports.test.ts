/**
 * `numerical` may not import `composition`. `binding-value.ts` used to, for
 * four leaves that do not themselves import `composition`. Those leaves live
 * in `dimensional`, which `numerical` may import.
 *
 * The scanner is the layer-order lexer, so a comment that names a module is
 * not an import. A control file that imports `composition` must fail this
 * check.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanFileImports } from '../../tools/layer-order/check.js';
import { tempDir } from '../helpers/tmp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const numerical = join(root, 'src/numerical');

function importsComposition(specifier: string): boolean {
  const parts = specifier.split('/');
  return parts.includes('composition');
}

export function numericalCompositionImports(files: readonly { path: string; source: string }[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    for (const spec of scanFileImports(file.source)) {
      if (importsComposition(spec)) hits.push(`${file.path} -> ${spec}`);
    }
  }
  return hits;
}

function numericalSources(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.ts')) out.push({ path, source: readFileSync(path, 'utf8') });
    }
  };
  walk(numerical);
  return out;
}

describe('numerical does not import composition', () => {
  it('no file under src/numerical imports composition', () => {
    expect(numericalCompositionImports(numericalSources())).toEqual([]);
  });

  it('POSITIVE CONTROL: an import of composition is reported', () => {
    const dir = tempDir('numerical-import-');
    const source = "import { evalExpr } from '../composition/expr-eval.js';\nexport const unused = evalExpr;\n";
    writeFileSync(join(dir, 'leak.ts'), source);
    const hits = numericalCompositionImports([{ path: 'src/numerical/leak.ts', source }]);
    expect(hits).toEqual(['src/numerical/leak.ts -> ../composition/expr-eval.js']);
  });
});
