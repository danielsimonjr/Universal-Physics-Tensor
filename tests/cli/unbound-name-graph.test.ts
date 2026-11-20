/**
 * A graph node is a catalog quantity only when the name was bound to it (#684, finding 2).
 * An unbound name stays in the drawing under the key `<name> (unbound)`, so it never joins a
 * catalog node that happens to share its spelling. In-process against the built CLI.
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { analyzeUserEquation } from '../../src/composition/user-equation.js';
import { buildVizModel } from '../../src/composition/graph-viz.js';
import { equationLanding } from '../../src/composition/user-equation.js';
import { QUANTITY_IDENTIFICATIONS } from '../../src/composition/compose.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { quantityCanonicalizer } from '../../src/composition/quantity-clusters.js';
import { validityDomain } from '../../src/composition/edge.js';
import type { BridgeEdge } from '../../src/composition/edge.js';
import type { Quantity } from '../../src/composition/quantity.js';
import { LENGTH, MASS, TIME } from '../../src/dimensional/types.js';

async function run(args: string[], expected = 0): Promise<string> {
  const cap = captureMerged();
  expect(await runCli(args, cap.io)).toBe(expected);
  return cap.lines.join('');
}

const q = (name: string): Quantity => ({ name, symbol: name, dim: LENGTH, attributes: {} });
const edge = (id: string, src: string[], tgt: string): BridgeEdge => ({
  id, beId: null, kind: 'bridge', label: id,
  sources: src.map(q), target: q(tgt),
  confidence: 'speculative', domain: validityDomain('true'),
  evaluate: () => 0, citation: 'synthetic',
});

describe('unbound names are not graph nodes (#684 F2)', () => {
  const dims = new Map([['length', LENGTH], ['mass', MASS], ['period', TIME]]);

  it('R1: graphJunction keys an unbound name as "<name> (unbound)"; junction is unchanged', async () => {
    const a = await analyzeUserEquation('F = m*a', dims);
    expect([...a.graphJunction.sources].sort()).toEqual(['a (unbound)', 'm (unbound)']);
    expect(a.graphJunction.target).toBe('F (unbound)');
    expect(a.graphJunction.id).toBe(a.junction.id);
    expect(a.graphJunction.label).toBe(a.junction.label);
    expect(a.junction.sources).toContain('a');
    expect(a.junction.sources).toContain('m');
  });

  it('R1b: a bound name keeps its catalog key', async () => {
    const a = await analyzeUserEquation('period = length', dims);
    expect(a.graphJunction).toEqual(a.junction);
  });

  it('R2: map --equation F = m*a does not claim a cluster through the unbound a', async () => {
    const t = await run(['map', '--equation', 'F = m*a', '--equation-only'], 0);
    expect(t).not.toMatch(/joins the .* via \{/);
    expect(t).toMatch(/ISOLATED/);
    const j = JSON.parse(await run(['map', '--equation', 'F = m*a', '--equation-only', '--json']));
    expect(j.result.landing.sharedQuantities).not.toContain('a');
    expect(j.result.landing.sharedQuantities).not.toContain('F');
    expect(j.result.landing.isolated).toBe(true);
  });

  it('R3 (control): with --bind-short the bound a still joins the cluster', async () => {
    const t = await run(['map', '--equation', 'F = m*a', '--equation-only', '--bind-short'], 3);
    expect(t).toMatch(/via \{a\}/);
  });

  it('R4a: no catalog junction gains an (unbound) key; the user junction stays isolated', async () => {
    const a = await analyzeUserEquation('F = m*a', dims);
    const catalog = [edge('e1', ['a', 'm'], 'F')];
    const model = buildVizModel(catalog, { extraJunctions: [a.graphJunction] });
    for (const j of model.junctions) {
      if (j.id === 'user-equation') continue;
      for (const n of [...j.sources, j.target]) expect(n.endsWith(' (unbound)')).toBe(false);
    }
    expect(equationLanding(model, 'user-equation').isolated).toBe(true);
    // Control: the raw junction DOES collide, so the test can fail.
    const raw = buildVizModel(catalog, { extraJunctions: [a.junction] });
    expect(equationLanding(raw, 'user-equation').isolated).toBe(false);
  });

  it('R4b: an unbound key never equals a catalog name or an identification key', () => {
    const canon = quantityCanonicalizer();
    for (const id of QUANTITY_IDENTIFICATIONS) {
      expect(canon(id.from)).toBe(id.to); // control: the raw spelling is rewritten
      expect(canon(`${id.from} (unbound)`)).toBe(`${id.from} (unbound)`);
      expect(/\s/.test(id.from)).toBe(false);
      expect(/\s/.test(id.to)).toBe(false);
    }
  });

  it('R4c: no catalog quantity name holds whitespace, so no "<name> (unbound)" key can equal one', () => {
    // The same composition as `map --source=both` (src/cli/graphs.ts): CATALOG_GRAPH alone holds
    // no one-letter name, so the control below pins that the set includes the names of #684.
    const names = new Set<string>();
    for (const e of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) for (const n of [...e.sources, e.target]) names.add(n.name);
    expect(names.has('a')).toBe(true);
    expect(names.has('g')).toBe(true);
    const spaced = [...names].filter((n) => /\s/.test(n));
    expect(spaced).toEqual([]);
  });

  it('R6: a mixed equation claims only its bound names (g unbound, T bound)', async () => {
    const t = await run(['map', '--equation', 'T = 2*pi*sqrt(L/g)', '--equation-only'], 3);
    expect(t).toMatch(/via \{temperature\}/);
    expect(t).not.toMatch(/via \{[^}]*\bg\b/);
  });

  it('R5: the dot drawing shows the unbound name as its own node', async () => {
    const dot = await run(['map', '--equation', 'F = m*a', '--format=dot']);
    expect(dot).toContain('label="a (unbound)"');
    expect(dot).toContain('label="F (unbound)"');
    // The user junction has no edge to the catalog nodes `a` and `F` (the old wiring drew both).
    expect(dot).toContain('q_a__unbound_ -> j_user_equation;');
    expect(dot).not.toMatch(/^\s*q_a -> j_user_equation;/m);
    expect(dot).not.toMatch(/^\s*j_user_equation -> q_F;/m);
  });
});
