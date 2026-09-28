/**
 * Audit I3: every graph command names the source it used and what its result is anchored to, in
 * text and in `--json`, and `upt help explain` lists the `--source` flag it accepts.
 *
 * Two anchors exist and the test keeps them apart. The discovery ground truth (`--anchor=k=v`,
 * default one solar mass) is what `discover`, `ground` and `map --proposed` compare magnitudes to.
 * The anchored core (the clusters holding an established-confidence edge) is what `map`,
 * `candidates` and `connectors` mean by "anchored". Each printed count is re-derived here from the
 * graph itself, and each anchor is checked in both states (default and overridden, present and
 * absent), so a line printed unconditionally would fail.
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (x: string) => void (o.stdout += x),
  });
  return { code, ...o };
}
async function json(argv: string[]) {
  const r = await run([...argv, '--json']);
  expect(r.code, r.stderr).toBe(0);
  return JSON.parse(r.stdout) as Record<string, any>;
}

const established = (g: readonly { confidence?: string }[]) => g.filter((e) => e.confidence === 'established').length;
const SOLAR_MASS_KG = 1.989e30; // textbook value, independent of the constant the CLI reads

describe('audit I3 — explain names its source', () => {
  it('help lists --source', async () => {
    const r = await run(['help', 'explain']);
    expect(r.stdout).toMatch(/--source=catalog\|canonical\|both/);
    const top = await run(['help']);
    const block = top.stdout.slice(top.stdout.indexOf('upt explain'), top.stdout.indexOf('upt priority'));
    expect(block).toMatch(/--source=catalog\|canonical\|both/);
  });

  it('text and JSON name the effective source, default and overridden', async () => {
    const quantity = CANONICAL_GRAPH.find((e) => CATALOG_GRAPH.some((c) => c.target.name === e.target.name))?.target.name;
    expect(quantity, 'a quantity both graphs hold').toBeDefined();
    const def = await run(['explain', quantity!]);
    expect(def.stdout).toContain(`● ${quantity}  [source: catalog (`);
    const can = await run(['explain', quantity!, '--source=canonical']);
    expect(can.stdout).toContain(`● ${quantity}  [source: canonical (`);
    expect((await json(['explain', quantity!, '--source=canonical'])).source).toBe('canonical');
    expect((await json(['explain', quantity!])).source).toBe('catalog');
  });

  it('a bridge id is answered from the catalog, and says so whatever --source says', async () => {
    const r = await run(['explain', 'be-11', '--source=canonical']);
    expect(r.stdout).toMatch(/\[source: catalog bridge registry/);
    expect((await json(['explain', 'be-11', '--source=canonical'])).source).toBe('catalog');
  });
});

describe('audit I3 — the discovery ground truth', () => {
  it('discover prints the default anchor, and an --anchor override replaces it', async () => {
    const def = await run(['discover']);
    expect(def.stdout).toMatch(/\[source: catalog \(/);
    const m = /anchor: mass=([0-9.e+]+) \(the default; --anchor=k=v replaces it\)/.exec(def.stdout);
    expect(m, def.stdout.slice(0, 600)).not.toBeNull();
    expect(Math.abs(Number(m![1]) / SOLAR_MASS_KG - 1)).toBeLessThan(1e-3);
    const over = await run(['discover', '--anchor=mass=2e30']);
    expect(over.stdout).toContain('anchor: mass=2e+30 (from --anchor)');
    expect(over.stdout).not.toContain('(the default; --anchor=k=v replaces it)');

    const j = await json(['discover', '--anchor=mass=2e30']);
    expect(j.anchor.groundTruth).toEqual({ values: { mass: 2e30 }, isDefault: false });
    const jd = await json(['discover']);
    expect(jd.anchor.groundTruth.isDefault).toBe(true);
    expect(Math.abs(jd.anchor.groundTruth.values.mass / SOLAR_MASS_KG - 1)).toBeLessThan(1e-3);
  });

  it('discover --derive prints the anchor too', async () => {
    const r = await run(['discover', '--derive', '--source=canonical']);
    expect(r.stdout).toMatch(/\[source: canonical/);
    expect(r.stdout).toMatch(/anchor: mass=[0-9.e+]+ \(the default/);
  });

  it('ground prints the source and anchor of the funnel it re-ran', async () => {
    const pair = (await json(['discover'])).result[0] as { a: string; b: string };
    const r = await run(['ground', pair.a, pair.b]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/\[source: catalog \(/);
    expect(r.stdout).toMatch(/anchor: mass=[0-9.e+]+ \(the default/);
    const j = await json(['ground', pair.a, pair.b, '--anchor=mass=2e30']);
    expect(j.source).toBe('catalog');
    expect(j.anchor.groundTruth).toEqual({ values: { mass: 2e30 }, isDefault: false });
  });

  it('map shows the ground truth only when --proposed ran the funnel', async () => {
    const plain = await json(['map']);
    expect(plain.anchor.groundTruth).toBeUndefined();
    expect((await run(['map'])).stdout).not.toMatch(/proposals: anchor:/);
    const prop = await json(['map', '--proposed', '--anchor=mass=2e30']);
    expect(prop.anchor.groundTruth).toEqual({ values: { mass: 2e30 }, isDefault: false });
    expect((await run(['map', '--proposed'])).stdout).toMatch(/proposals: anchor: mass=[0-9.e+]+ \(the default/);
  });
});

describe('audit I3 — the anchored core', () => {
  const both = [...CATALOG_GRAPH, ...CANONICAL_GRAPH];
  const cases: { argv: string[]; graph: readonly { confidence?: string }[]; source: string }[] = [
    { argv: ['map'], graph: both, source: 'both' },
    { argv: ['map', '--source=catalog'], graph: CATALOG_GRAPH, source: 'catalog' },
    { argv: ['candidates'], graph: CATALOG_GRAPH, source: 'catalog' },
    { argv: ['candidates', '--source=canonical'], graph: CANONICAL_GRAPH, source: 'canonical' },
    { argv: ['connectors'], graph: both, source: 'both' },
    { argv: ['connectors', '--source=catalog'], graph: CATALOG_GRAPH, source: 'catalog' },
  ];
  for (const c of cases) {
    it(`${c.argv.join(' ')} counts the established edges of the graph it used`, async () => {
      const n = established(c.graph);
      expect(n).toBeGreaterThan(0);
      const t = await run(c.argv);
      expect(t.stdout).toContain(`anchored core: the clusters holding at least one of the ${n} established-confidence edge(s) of the ${c.graph.length} in this graph`);
      const j = await json(c.argv);
      expect(j.source).toBe(c.source);
      expect(j.anchor.core).toEqual({ establishedEdges: n, edges: c.graph.length });
    });
  }

  it('the counts differ between sources, so a constant line would fail one case', () => {
    expect(new Set(cases.map((c) => `${established(c.graph)}/${c.graph.length}`)).size).toBeGreaterThan(1);
  });
});
