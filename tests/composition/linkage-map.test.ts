/**
 * Catalog linkage map (src/composition/bridge-analysis.ts) — pins the
 * connected-component structure: one dominant anchored cluster hubbed on
 * mass/temperature, two small thematic clusters, and an isolated tail.
 */
import { describe, it, expect } from 'vitest';
import { linkageMap } from '../../src/composition/bridge-analysis.js';
import { CATALOG_GRAPH } from '../../src/composition/index.js';

const GRAPH = CATALOG_GRAPH;

const m = linkageMap(GRAPH);

describe('linkageMap — component structure', () => {
  it('partitions the 57-edge graph into 32 components (28 isolated)', () => {
    expect(m.componentCount).toBe(32);
    expect(m.isolated.length).toBe(28);
    expect(m.clusters.reduce((n, c) => n + c.size, 0)).toBe(GRAPH.length);
  });

  it('reports the 22 directed compositions over the graph', () => {
    expect(m.compositions).toBe(22);
  });

  it('has one dominant ANCHORED cluster of 22, hubbed on mass + temperature', () => {
    const big = m.clusters[0];
    expect(big.size).toBe(22);
    expect(big.anchored).toBe(true);
    expect(big.hubs).toEqual(expect.arrayContaining(['mass', 'temperature', 'schwarzschild-radius']));
    // it links established GR to speculative thermal/quantum bridges
    expect(big.edges).toEqual(expect.arrayContaining(['be-42', 'be-51', 'be-52', 'be-16', 'be-12', 'be-63']));
    // 6 is the record from before be-67 and be-69 joined this cluster with be-74..76.
    expect(big.statusMix.established).toBe(11);
  });

  it('has the cosmological-constant cluster (be-13/be-20/be-31)', () => {
    const cc = m.clusters.find((c) => c.edges.includes('be-13'));
    expect(cc?.size).toBe(3);
    expect(cc?.edges).toEqual(expect.arrayContaining(['be-13', 'be-20', 'be-31']));
    expect(cc?.hubs).toEqual(expect.arrayContaining(['ricci-scalar']));
  });

  it('has the Friedmann/Hubble cluster (be-19/be-54)', () => {
    const fr = m.clusters.find((c) => c.edges.includes('be-19'));
    expect(fr?.size).toBe(2);
    expect(fr?.edges).toEqual(expect.arrayContaining(['be-19', 'be-54']));
  });

  it('joins Alfvén, the fast mode, and magnetic pressure in the anchored cluster, and leaves redshift isolated from Tolman', () => {
    const big = m.clusters[0];
    expect(big.edges).toEqual(expect.arrayContaining(['be-67', 'be-69', 'be-74', 'be-76']));
    expect(m.isolated).toContain('be-68');
    expect(m.isolated).toContain('be-72');
    expect(m.isolated).not.toContain('be-67');
    expect(m.isolated).not.toContain('be-74');
  });

  it('joins the integer and fractional Hall edges on hall-conductance', () => {
    const hall = m.clusters.find((c) => c.edges.includes('be-55'));
    expect(hall?.size).toBe(2);
    expect(hall?.edges).toEqual(expect.arrayContaining(['be-55', 'be-60']));
    expect(hall?.hubs).toEqual(['hall-conductance']);
  });

  it('lists the isolated bridges (e.g. nucleosynthesis, swampland, Yang-Mills)', () => {
    expect(m.isolated).toEqual(expect.arrayContaining(['be-47', 'be-41', 'be-53', 'be-40', 'be-59']));
    expect(m.isolated).not.toContain('be-63');
    expect(m.isolated).not.toContain('be-55');
    // clusters are sorted largest-first
    for (let i = 1; i < m.clusters.length; i++) {
      expect(m.clusters[i].size).toBeLessThanOrEqual(m.clusters[i - 1].size);
    }
  });
});
