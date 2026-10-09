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
  // The second file was the citation-quote lexer reading a comment in
  // src/bridges/index.ts as an export. That comment now lives in
  // docs/research/phase-1-source-comments.txt, so this name is one local.
  'BCS_GAP_RATIO',
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

  it('still reports command in more than one file (the walker is not vacant)', () => {
    // The command registration is one name in every command module.
    expect((locals.get('command') ?? []).length).toBeGreaterThan(1);
  });

  it('getBridge is one function: the atlas record reader is catalogBridgeRecord', () => {
    // The sentence that two real getBridge functions stayed in more than one
    // file is the record from before the atlas one was renamed for what it
    // returns (9.0.0 audit §1).
    expect(locals.get('getBridge')).toEqual(['src/composition/descriptor.ts']);
    expect(locals.get('catalogBridgeRecord')).toEqual(['src/atlas/bridge-record.ts']);
  });
});
