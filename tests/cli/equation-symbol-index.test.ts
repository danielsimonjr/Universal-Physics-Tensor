/**
 * The equation analysis reads the per-edge symbol table that `upt search` reads (#684, findings 1
 * and 3). A name that is a catalog symbol ranks the quantities with that symbol first, and a
 * one-letter binding names the other quantities that use the same letter.
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { analyzeUserEquation } from '../../src/composition/user-equation.js';
import { symbolIndex } from '../../src/composition/aliases.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { greekLetter } from '../../src/dimensional/formula-names.js';
import type { Dimension } from '../../src/dimensional/types.js';

function catalogDims(): Map<string, Dimension> {
  const dims = new Map<string, Dimension>();
  // The map's default graph: catalog and canonical.
  for (const e of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) for (const q of [...e.sources, e.target]) dims.set(q.name, q.dim);
  return dims;
}

async function run(args: string[]): Promise<string> {
  const cap = captureMerged();
  await runCli(args, cap.io);
  return cap.lines.join('');
}

describe('symbol index (#684 F1, F3)', () => {
  it('ranks the quantities whose symbol is the name before spelling neighbours', async () => {
    const user = await analyzeUserEquation('omega = sqrt(k/m)', catalogDims());
    const k = user.hints.find((h) => h.name === 'k');
    expect(k?.suggestions).toContain('damping-spring');
    expect(k?.suggestions).not.toContain('A');
    const bySymbol = symbolIndex(CATALOG_GRAPH).get('k') ?? new Set<string>();
    expect(bySymbol.has(k!.suggestions[0]!)).toBe(true);
    const m = user.hints.find((h) => h.name === 'm');
    expect(m?.suggestions.every((s) => (symbolIndex(CATALOG_GRAPH).get('m') ?? new Set()).has(s))).toBe(true);
  });

  it('keeps the spelling ranking for a name that is no symbol', async () => {
    const user = await analyzeUserEquation('zqx = lenght', catalogDims());
    const h = user.hints.find((x) => x.name === 'lenght');
    expect(h?.suggestions[0]).toBe('length');
  });

  it('matches a symbol case-sensitively', () => {
    const index = symbolIndex(CATALOG_GRAPH);
    expect(index.get('T')?.has('temperature')).toBe(true);
    expect(index.get('t')?.has('temperature') ?? false).toBe(false);
  });

  it('reads a Greek letter by its name, in map and in search', async () => {
    const user = await analyzeUserEquation('omega = sqrt(k/m)', catalogDims());
    const omega = user.hints.find((h) => h.name === 'omega');
    // The quantities whose symbol is ω read first, before any spelling neighbour.
    const letter = [...(symbolIndex([...CATALOG_GRAPH, ...CANONICAL_GRAPH]).get('ω') ?? [])].sort();
    expect(letter).toContain('ion-acoustic-frequency');
    expect(omega?.suggestions.slice(0, letter.length)).toEqual(letter);
    const found = await run(['search', 'omega']);
    for (const q of letter) expect(found).toContain(q);
  });

  it('leaves a name that spells no Greek letter as before', async () => {
    const user = await analyzeUserEquation('omega = sqrt(k/m)', catalogDims());
    expect(user.hints.find((h) => h.name === 'k')?.suggestions).toEqual([
      'arrhenius-rate', 'biot-k', 'damping-spring', 'eyring-rate', 'fin-conductivity',
    ]);
    expect(await run(['search', 'zqx'])).toContain('no entry matches');
  });

  it('keeps the case of a Greek name: Omega is the capital letter', () => {
    expect(greekLetter('omega')).toBe('ω');
    expect(greekLetter('Omega')).toBe('Ω');
    expect(greekLetter('omegas')).toBeUndefined();
    expect(greekLetter('k')).toBeUndefined();
  });

  it('names the other quantities of a bound one-letter name', async () => {
    const user = await analyzeUserEquation('F = m*a', catalogDims(), { bindShortNames: true });
    const a = user.shortBindings.find((b) => b.name === 'a');
    expect(a?.otherMeanings).toContain('unruh-acceleration');
    expect(a?.otherMeanings).not.toContain(a!.quantity);
    const text = await run(['map', '--equation', 'F = m*a', '--equation-only', '--bind-short']);
    expect(text).toMatch(/'a' is bound to the catalog quantity a .*also the symbol of [^\n]*unruh-acceleration/);
  });
});
