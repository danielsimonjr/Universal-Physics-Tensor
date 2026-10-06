/**
 * v0.11 namespacing gate, acceptance criterion 6 — centralized
 * Quantity nodes with pinned name uniqueness (Adam vet A-2: the
 * per-module definitions had drifted into duplicate-name
 * distinct-object pairs).
 */
import { describe, it, expect } from 'vitest';
import { allQuantities } from '../../src/composition/quantities.js';
import type { Quantity } from '../../src/composition/index.js';

const nodes: [string, Quantity][] = allQuantities().map((q) => [q.name, q]);

describe('centralized Quantity registry (v0.11 criterion 6)', () => {
  it('exports at least the 30 unique nodes from the centralization', () => {
    expect(nodes.length).toBeGreaterThanOrEqual(30);
  });

  it('NAME UNIQUENESS: one node object per canonical name', () => {
    const byName = new Map<string, Quantity>();
    for (const [, q] of nodes) {
      const existing = byName.get(q.name);
      if (existing) {
        // Same name must be the SAME object (re-export), never a twin.
        expect(existing, `duplicate distinct node for '${q.name}'`).toBe(q);
      }
      byName.set(q.name, q);
    }
    expect(byName.size).toBe(nodes.length);
  });

  it('kebab-case canonical names, finite dims', () => {
    for (const [, q] of nodes) {
      expect(q.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const v of Object.values(q.dim)) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('catalog edges share THE mass object', async () => {
    const { catalogEdge } = await import('../../src/composition/catalog-graph.js');
    const { catalogEdgeKey } = await import('../../src/bridges/catalog-load.js');
    const hawking = catalogEdge(catalogEdgeKey(42));
    const collapse = catalogEdge(catalogEdgeKey(48));
    expect(collapse.sources[0]).toBe(hawking.sources[0]);
  });
});
