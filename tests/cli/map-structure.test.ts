/**
 * `upt map --communities --cycles --rank-hubs` — the opt-in structure sections (proposal 19).
 *
 * Each flag prints one short deterministic section after the linkage map, and `--json` carries
 * them under their own keys. The default output stays byte-identical (the `map-*` goldens of
 * `inprocess-golden.test.ts` pin that); this file pins the sections to their own golden,
 * `tests/cli/golden/map-structure-catalog.txt`, captured once and reviewed.
 *
 * @module tests/cli/map-structure
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { json, run } from '../helpers/cli-run.js';

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name: string): string =>
  readFileSync(join(resolve(here, 'golden'), `${name}.txt`), 'utf8').replace(/\r\n/g, '\n');

describe('upt map structure sections (opt-in)', () => {
  it('--communities --cycles --rank-hubs on the catalog graph match the golden', async () => {
    const r = await run(['map', '--source=catalog', '--communities', '--cycles', '--rank-hubs']);
    expect(r.code).toBe(0);
    expect(r.stdout.replace(/\r\n/g, '\n')).toBe(golden('map-structure-catalog'));
  });

  it('each section names what it is: layout, not physics; a cycle list; betweenness on demand', async () => {
    const r = await run(['map', '--source=catalog', '--communities', '--cycles', '--rank-hubs']);
    expect(r.stdout).toContain('layout communities (Louvain, heuristic)');
    expect(r.stdout).toContain('not physics');
    expect(r.stdout).toContain('derivation cycles');
    expect(r.stdout).toContain('none');
    expect(r.stdout).toContain('betweenness');
    expect(r.stdout).toContain('temperature');
  });

  it('one flag prints one section and not the others', async () => {
    const r = await run(['map', '--source=catalog', '--cycles']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('derivation cycles');
    expect(r.stdout).not.toContain('layout communities');
    expect(r.stdout).not.toContain('betweenness');
  });

  it('--json carries the three under their own keys, and only when asked', async () => {
    const asked = await json(['map', '--source=catalog', '--communities', '--cycles', '--rank-hubs']);
    expect(asked.result.communities.method).toBe('layout communities (Louvain, heuristic)');
    expect(asked.result.communities.componentSize).toBe(50);
    expect(asked.result.communities.communities.map((c: { size: number }) => c.size)).toEqual([16, 12, 8, 6, 5, 3]);
    expect(asked.result.cycles).toEqual([]);
    expect(asked.result.hubs[0].quantity).toBe('temperature');
    expect(asked.result.hubs[0].degree).toBe(17);
    expect(asked.result.linkage).toBeDefined();
    const plain = await json(['map', '--source=catalog']);
    expect(plain.result).not.toHaveProperty('communities');
    expect(plain.result).not.toHaveProperty('cycles');
    expect(plain.result).not.toHaveProperty('hubs');
  });

  it('the sections are text or --json: a visual format refuses them (exit 2)', async () => {
    const r = await run(['map', '--source=catalog', '--format=mermaid', '--communities']);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('--communities');
    expect(r.stderr).toContain('--format=mermaid');
  });

  it('an atlas view refuses them like every graph-only flag (exit 1)', async () => {
    const r = await run(['map', '--route=model-pendulum,model-lc', '--rank-hubs']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('--rank-hubs');
  });
});
