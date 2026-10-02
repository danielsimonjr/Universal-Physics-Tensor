/**
 * `bridges/` may not import `composition/`. The catalog/graph join
 * (`BRIDGE_DESCRIPTORS`, `getBridge`, and the `CATALOG_GRAPH` scan inside
 * `auditCoverage`) lives in `composition/`, which already imports `bridges/`
 * and owns the graph. A shim under `bridges/` that re-imports `composition/`
 * would keep the upward edge.
 *
 * The scanner is the layer-order lexer, so a comment that names a module is
 * not an import. A control source that imports `composition` must fail this
 * check.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bridges = join(root, 'src/bridges');

function importsComposition(specifier: string): boolean {
  return specifier.split('/').includes('composition');
}

export function bridgesCompositionImports(files: readonly { path: string; source: string }[]): string[] {
  const hits: string[] = [];
  for (const file of files) {
    for (const spec of scanFileImports(file.source)) {
      if (importsComposition(spec)) hits.push(`${file.path} -> ${spec}`);
    }
  }
  return hits;
}

function toRepo(abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

function bridgesSources(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
        out.push({ path: toRepo(path), source: readFileSync(path, 'utf8') });
      }
    }
  };
  walk(bridges);
  return out;
}

describe('bridges does not import composition', () => {
  it('no file under src/bridges imports composition', () => {
    expect(bridgesCompositionImports(bridgesSources())).toEqual([]);
  });

  it('POSITIVE CONTROL: a value import and a type import of composition are reported', () => {
    const source = [
      "import { CATALOG_GRAPH } from '../composition/catalog-graph.js';",
      "import type { BridgeEdge } from '../composition/edge.js';",
      'export const unused = CATALOG_GRAPH;',
      '',
    ].join('\n');
    expect(bridgesCompositionImports([{ path: 'src/bridges/leak.ts', source }])).toEqual([
      'src/bridges/leak.ts -> ../composition/catalog-graph.js',
      'src/bridges/leak.ts -> ../composition/edge.js',
    ]);
  });

  it('a comment that names composition is not an import', () => {
    const source = "// import { CATALOG_GRAPH } from '../composition/catalog-graph.js';\nexport const ok = 1;\n";
    expect(bridgesCompositionImports([{ path: 'src/bridges/note.ts', source }])).toEqual([]);
  });
});
