/**
 * The command modules in the integration note's finding 5 do not import
 * those library files. Values are read from `ctx.api`. A value import of
 * `cli-api` is refused, because loading the barrel follows every re-export.
 * `import type` from the barrel is allowed. The barrel does not import a
 * command.
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

/** Value names each command reads from `ctx.api`. */
const VALUE_NAMES: Record<string, readonly string[]> = {
  'src/cli/commands/atlas.ts': ['catalogFormalRef'],
  'src/cli/commands/recover.ts': ['scanCompositionRecovery'],
  'src/cli/commands/metric.ts': [
    'curvatureReport',
    'kerrEquatorialCircular',
    'kerrGeodesic',
    'kerrTurningPointOrbit',
    'schwarzschildCircularOrbit',
  ],
  'src/cli/commands/eval.ts': ['builtinFormulaDimensionChecker', 'readBinding', 'UnitError'],
  'src/cli/commands/evaluate.ts': ['bindingInUnit', 'C_SI', 'G_SI', 'missingEvaluatorMessage'],
  'src/cli/commands/regime.ts': ['readBinding'],
  'src/cli/commands/path.ts': ['readBinding'],
  'src/cli/commands/map.ts': [],
};

function sourceOf(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

/** A value import of the barrel. `import type` does not load it. */
function valueImportsCliApi(source: string): boolean {
  const statements = source.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? [];
  return statements.some((stmt) => /cli-api\.js['"]/.test(stmt) && !/^\s*import\s+type\b/.test(stmt));
}

describe('commands read finding-5 names from ctx.api', () => {
  it('the finding-5 modules do not import those library files or the barrel as a value', () => {
    const hits: string[] = [];
    for (const [path, forbidden] of Object.entries(LIBRARY_SPECIFIERS)) {
      const text = sourceOf(path);
      const specs = new Set(scanFileImports(text));
      for (const spec of forbidden) {
        if (specs.has(spec)) hits.push(`${path} -> ${spec}`);
      }
      if (valueImportsCliApi(text)) hits.push(`${path} value-imports cli-api`);
      for (const name of VALUE_NAMES[path] ?? []) {
        if (!text.includes(`api.${name}`)) hits.push(`${path} missing api.${name}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('cli-api does not import a command, and the root barrel does not export it', () => {
    const specs = scanFileImports(sourceOf('src/cli-api.ts'));
    expect(specs.some((spec) => spec.includes('/commands/'))).toBe(false);
    const index = sourceOf('src/index.ts');
    expect(index).not.toContain("from './cli-api.js'");
    expect(index).not.toContain('from "./cli-api.js"');
    expect(sourceOf('src/cli-api.ts')).toContain("export { C_SI, G_SI } from './core/constants.js'");
    expect(sourceOf('src/cli-api.ts')).not.toContain("export { C_SI, G_SI } from './index.js'");
  });
});
