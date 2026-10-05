/**
 * A pure re-export is one local definition. The dependency graph marks
 * `export { name } from` as `reExported`. Names that remain in more than
 * one file after that mark are a second declaration.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface GraphFile {
  exports?: string[];
  reExported?: string[];
}

interface Graph {
  modules: Record<string, Record<string, GraphFile>>;
}

/** Names whose second file was an assign-and-reexport, or a second `MASS_DENSITY`. */
const ONE_LOCAL = [
  'COMPOSITION_TABLE',
  'composeRelation',
  'NO_COMPOSITE_CLAIM',
  'regimeHolds',
  'IDENTITY_BOUND',
  'DimensionMismatchError',
  'EngineCapabilityError',
  'DEFAULT_SEARCH_BUDGET',
  'M_PROTON_SI',
  'evaluateMetricInverse',
  'dim',
  'PHYSJS_COMMIT',
  'MASS_DENSITY',
] as const;

function localDeclarations(graph: Graph): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const layer of Object.values(graph.modules)) {
    for (const [file, info] of Object.entries(layer)) {
      const reExported = new Set(info.reExported ?? []);
      for (const name of info.exports ?? []) {
        if (reExported.has(name)) continue;
        const files = byName.get(name) ?? [];
        files.push(file);
        byName.set(name, files);
      }
    }
  }
  return byName;
}

describe('re-export locals', () => {
  const graph = JSON.parse(
    readFileSync(resolve(root, 'docs/architecture/dependency-graph.json'), 'utf8'),
  ) as Graph;
  const locals = localDeclarations(graph);

  it('lists a pure re-export in one file', () => {
    const still: Record<string, string[]> = {};
    for (const name of ONE_LOCAL) {
      const files = locals.get(name) ?? [];
      if (files.length !== 1) still[name] = files;
    }
    expect(still).toEqual({});
  });

  it('still reports getBridge, command, and BCS_GAP_RATIO in more than one file', () => {
    // The walker is not vacant. These three stay more than one file:
    // two real getBridge functions, the command registration, and the
    // citation-quote lexer hit.
    const stayed: Record<string, string[]> = {};
    for (const name of ['getBridge', 'command', 'BCS_GAP_RATIO'] as const) {
      const files = locals.get(name) ?? [];
      if (files.length < 2) stayed[name] = files;
    }
    expect(stayed).toEqual({});
  });
});
