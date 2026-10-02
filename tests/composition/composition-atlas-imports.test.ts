/**
 * Stage 3 of the layering refactor: `src/composition/` does not import the
 * atlas evidence derivation or the poster registries. Those imports are the
 * map's atlas view, and they live with the CLI.
 *
 * The scanner is the layer-order lexer, so a comment that names a module is
 * not an import. A control file that imports one of the four modules must
 * fail this check, or the test would pass on an empty read.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const composition = join(root, 'src/composition');

const FORBIDDEN = new Set(['derive-evidence', 'association', 'derivation', 'statement']);

function moduleBase(specifier: string): string {
  const file = specifier.split('/').pop() ?? specifier;
  return file.replace(/\.(js|ts)$/, '');
}

export function forbiddenCompositionImports(files: readonly { path: string; source: string }[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    for (const spec of scanFileImports(file.source)) {
      if (FORBIDDEN.has(moduleBase(spec))) hits.push(`${file.path} -> ${spec}`);
    }
  }
  return hits;
}

function compositionSources(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.ts')) out.push({ path, source: readFileSync(path, 'utf8') });
    }
  };
  walk(composition);
  return out;
}

describe('composition does not import the map atlas view', () => {
  it('no file under src/composition imports derive-evidence, association, derivation, or statement', () => {
    expect(forbiddenCompositionImports(compositionSources())).toEqual([]);
  });

  it('POSITIVE CONTROL: an import of any of the four modules is reported', () => {
    const dir = mkdtempSync(join(tmpdir(), 'composition-import-'));
    const source = [
      "import { catalogEvidenceInput } from '../atlas/derive-evidence.js';",
      "import type { Association } from '../atlas/association.js';",
      "import type { Derivation } from '../atlas/derivation.js';",
      "import type { Statement } from '../atlas/statement.js';",
      'export const unused = [catalogEvidenceInput];',
    ].join('\n');
    writeFileSync(join(dir, 'leak.ts'), source);
    const hits = forbiddenCompositionImports([{ path: 'src/composition/leak.ts', source }]);
    expect(hits).toHaveLength(4);
  });
});
