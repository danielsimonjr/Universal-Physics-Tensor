/**
 * Loading a module does no derivation and compiles no validity condition.
 *
 * Every CLI command and every README fence starts a new process that imports
 * the package. Work at module load runs in each of those processes. The tests
 * count the work, so no test reads a clock.
 */
import { describe, expect, it, vi } from 'vitest';

const ranks = vi.hoisted(() => ({ calls: 0 }));

vi.mock('../../src/composition/discovery.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/composition/discovery.js')>();
  return {
    ...actual,
    rankDiscoveries: (...args: Parameters<typeof actual.rankDiscoveries>) => {
      ranks.calls += 1;
      return actual.rankDiscoveries(...args);
    },
  };
});

describe('proposedBridges', () => {
  it('loading proposed-bridges runs no discovery; the first call does, and later calls reuse its result', async () => {
    const mod = await import('../../src/composition/proposed-bridges.js');
    expect(ranks.calls).toBe(0);
    const first = mod.proposedBridges();
    expect(ranks.calls).toBe(1);
    expect(first.length).toBeGreaterThan(0);
    expect(mod.proposedBridges()).toBe(first);
    expect(ranks.calls).toBe(1);
  });
});

describe('withBoundAliases', () => {
  it('does not read domain.description until a caller reads it', async () => {
    const { withBoundAliases } = await import('../../src/composition/edge.js');
    const { CATALOG_GRAPH } = await import('../../src/composition/catalog-graph.js');
    const base = CATALOG_GRAPH[0]!;
    let reads = 0;
    const edge = {
      ...base,
      aliases: { [base.sources[0]!.name]: ['alias-key'] },
      domain: {
        get description() {
          reads += 1;
          return 'stated domain';
        },
        predicate: () => true,
        violations: () => [],
      },
    };
    const bound = withBoundAliases(edge);
    expect(reads).toBe(0);
    expect(bound.domain.description).toBe('stated domain');
    expect(reads).toBe(1);
  });
});
