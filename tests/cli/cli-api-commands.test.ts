/**
 * The command modules in the integration note's finding 5 import library
 * names from `src/cli-api.ts`, or from other CLI modules. The barrel does
 * not import a command.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanFileImports } from '../../tools/layer-order/check.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Library specifiers those command modules imported directly. */
const LIBRARY_SPECIFIERS: Record<string, readonly string[]> = {
  'src/cli/commands/atlas.ts': ['../../atlas/catalog-formal-ref.js'],
  'src/cli/commands/recover.ts': ['../../composition/composition-recovery.js'],
  'src/cli/commands/metric.ts': ['../../numerical/spacetime-metrics.js'],
  'src/cli/commands/eval.ts': [
    '../../numerical/binding-value.js',
    '../../numerical/formula-dimension.js',
    '../../dimensional/units.js',
  ],
  'src/cli/commands/evaluate.ts': [
    '../../core/constants.js',
    '../../numerical/binding-value.js',
    '../../bridges/evaluators.js',
  ],
  'src/cli/commands/regime.ts': ['../../numerical/binding-value.js'],
  'src/cli/commands/path.ts': ['../../numerical/binding-value.js'],
  'src/cli/commands/map.ts': [
    '../../composition/edge.js',
    '../../composition/graph-viz.js',
    '../../atlas/types.js',
    '../../composition/user-equation.js',
    '../../composition/canonical-compare.js',
  ],
};

function importsOf(path: string): string[] {
  return scanFileImports(readFileSync(resolve(root, path), 'utf8'));
}

describe('commands import library names through cli-api', () => {
  it('the finding-5 modules do not import those library files', () => {
    const hits: string[] = [];
    for (const [path, forbidden] of Object.entries(LIBRARY_SPECIFIERS)) {
      const specs = new Set(importsOf(path));
      for (const spec of forbidden) {
        if (specs.has(spec)) hits.push(`${path} -> ${spec}`);
      }
      if (!specs.has('../../cli-api.js')) hits.push(`${path} -> cli-api`);
    }
    expect(hits).toEqual([]);
  });

  it('cli-api does not import a command, and the root barrel does not export it', () => {
    const specs = importsOf('src/cli-api.ts');
    expect(specs.some((spec) => spec.includes('/commands/'))).toBe(false);
    const index = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
    expect(index).not.toContain("from './cli-api.js'");
    expect(index).not.toContain('from "./cli-api.js"');
  });
});
