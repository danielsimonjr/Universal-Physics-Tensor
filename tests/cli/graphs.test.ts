import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { resolveGraph } from '../../dist/cli/graphs.js';
import { CliError } from '../../dist/cli/errors.js';
import * as api from '../../dist/cli-api.js';

function flagsFor(source?: string): Map<string, string[]> {
  const flags = new Map<string, string[]>();
  if (source !== undefined) flags.set('source', [source]);
  return flags;
}

describe('resolveGraph', () => {
  it('defaults to the catalog graph when --source is not given', () => {
    const result = resolveGraph(api, flagsFor());
    expect(result.source).toBe('catalog');
    // The count is derived from the catalog, so it cannot go stale as bridges are added.
    expect(result.label).toBe(`catalog (${api.BRIDGE_EQUATIONS.length}-bridge)`);
    expect(api.BRIDGE_EQUATIONS.length).toBeGreaterThan(0);
    expect(result.graph).toEqual(api.CATALOG_GRAPH);
  });

  it("--source=catalog resolves the catalog graph explicitly", () => {
    const result = resolveGraph(api, flagsFor('catalog'));
    expect(result.source).toBe('catalog');
    expect(result.graph).toEqual(api.CATALOG_GRAPH);
  });

  it("--source=canonical resolves the canonical (bridge-free) graph", () => {
    const result = resolveGraph(api, flagsFor('canonical'));
    expect(result.source).toBe('canonical');
    expect(result.label).toBe('canonical (standard-physics L-layer, bridges excluded)');
    expect(result.graph).toEqual(api.CANONICAL_GRAPH);
  });

  it("--source=both concatenates catalog + canonical", () => {
    const result = resolveGraph(api, flagsFor('both'));
    expect(result.source).toBe('both');
    expect(result.label).toBe('catalog + canonical');
    expect(result.graph).toEqual([...api.CATALOG_GRAPH, ...api.CANONICAL_GRAPH]);
    expect(result.graph.length).toBe(api.CATALOG_GRAPH.length + api.CANONICAL_GRAPH.length);
  });

  it('returns a fresh array, not the original readonly graph reference', () => {
    const result = resolveGraph(api, flagsFor('catalog'));
    expect(result.graph).not.toBe(api.CATALOG_GRAPH);
  });

  it('throws a CliError with the exact documented message for an unknown --source value', () => {
    expect(() => resolveGraph(api, flagsFor('nonsense'))).toThrow(CliError);
    try {
      resolveGraph(api, flagsFor('nonsense'));
      expect.fail('expected resolveGraph to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as Error).message).toBe(
        "upt: unknown --source='nonsense' (expected: catalog | canonical | both)"
      );
    }
  });
});
