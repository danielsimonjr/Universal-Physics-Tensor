/**
 * In-process `upt probe` — experimental Product B CLI.
 */
import '../helpers/dist.js';
import { captureMerged, text } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { runCli } from '../../dist/cli/main.js';
import { scanWithExpressionGaps } from '../../dist/composition/probe/index.js';
import { CATALOG_GRAPH } from '../../dist/composition/catalog-graph.js';
import { tempDir } from '../helpers/tmp.js';

const here = dirname(fileURLToPath(import.meta.url));
const pendulum = join(here, '../fixtures/discovery/pendulum-scaling/public/problem.json');
const noise = join(here, '../fixtures/discovery/pure-noise/public/problem.json');

describe('upt probe', () => {
  it('missing subverb is usage error → exit 2', async () => {
    const c = captureMerged();
    expect(await runCli(['probe'], c.io)).toBe(2);
    expect(text(c)).toMatch(/subverb/);
  });

  it('scan --json --source=canonical returns a JSON envelope instead of throwing', async () => {
    const c = captureMerged();
    const code = await runCli(['probe', '--json', 'scan', '--source=canonical'], c.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(text(c));
    expect(parsed.command).toBe('probe');
    expect(parsed.source).toBe('canonical');
    expect(Array.isArray(parsed.result)).toBe(true);
  });

  it('scan defaults to searchable expression gaps and hides relation-link wrappers', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'scan'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/fg-expr-case-skin-depth/);
    expect(t).toMatch(/prediction-residual \/ searchable/);
    expect(t).toMatch(/Product A wrappers hidden/);
    expect(t).toMatch(/no named baseline or dataset/);
    expect(t).toMatch(/not a problem file/);
    expect(t).not.toMatch(/0 of \d+ gaps are searchable/);
    expect(t).not.toMatch(/fg-link-/);
  });

  it('scan rejects --searchable-only together with --all', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'scan', '--searchable-only', '--all'], c.io)).toBe(2);
    expect(text(c)).toMatch(/--searchable-only or --all/);
  });

  it('run without a problem file is a usage error', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'run'], c.io)).toBe(2);
    expect(text(c)).toMatch(/--problem=FILE is required/);
  });

  it('show resolves an expression gap and a wrapper from the combined list', async () => {
    const expr = captureMerged();
    expect(await runCli(['probe', 'show', 'fg-expr-case-skin-depth'], expr.io)).toBe(0);
    const shown = text(expr);
    expect(shown).toMatch(/searchable: true/);
    expect(shown).toMatch(/no named baseline/);
    expect(shown).toMatch(/no dataset/);
    expect(shown).toMatch(/not a detected prediction residual/);

    const scan = captureMerged();
    expect(await runCli(['probe', 'scan', '--all', '--json'], scan.io)).toBe(0);
    const link = (JSON.parse(text(scan)).result as { id: string; kind: string }[]).find(
      (g) => g.kind === 'relation-link',
    );
    expect(link).toBeDefined();
    const wrap = captureMerged();
    expect(await runCli(['probe', 'show', link!.id], wrap.io)).toBe(0);
    expect(text(wrap)).toMatch(/searchable: false/);
    expect(text(wrap)).toMatch(/upt discover/);
  });

  it('scan --all lists not-searchable relation-link gaps', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'scan', '--all'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/fg-link-/);
    expect(t).toMatch(/upt discover/);
    expect(t).toMatch(/not-searchable/);
  });

  it('scan --json reports the same catalog split as the library', async () => {
    // The library's own scan is the expected value: the CLI is a projection
    // of it, and a catalog growth moves both. The typed totals this test once
    // carried, from 364 to 8260, are the record from before this comparison.
    const library = scanWithExpressionGaps(CATALOG_GRAPH);
    const byKind = (gaps: readonly { kind: string }[]) => {
      const counts: Record<string, number> = {};
      for (const g of gaps) counts[g.kind] = (counts[g.kind] ?? 0) + 1;
      return counts;
    };
    const searchable = library.filter((g) => g.searchability.searchable).length;
    expect(searchable).toBeGreaterThan(0);
    expect(library.length).toBeGreaterThan(searchable);

    const c = captureMerged();
    expect(await runCli(['probe', 'scan', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.options.scan).toEqual({ total: library.length, searchable, showing: 'searchable-only' });
    expect(env.result).toHaveLength(searchable);
    expect(env.result.every((g: { kind: string; observations: unknown[]; searchability: { searchable: boolean; reasons: string[] } }) =>
      g.kind === 'prediction-residual' &&
      g.searchability.searchable &&
      g.observations.length === 0 &&
      /no named baseline/.test(g.searchability.reasons.join(' ')) &&
      /no dataset/.test(g.searchability.reasons.join(' ')) &&
      /not a detected prediction residual/.test(g.searchability.reasons.join(' ')))).toBe(true);

    const all = captureMerged();
    expect(await runCli(['probe', 'scan', '--all', '--json'], all.io)).toBe(0);
    const envAll = JSON.parse(text(all));
    expect(envAll.options.scan).toEqual({ total: library.length, searchable, showing: 'all' });
    const kinds: Record<string, number> = {};
    for (const g of envAll.result as { kind: string; searchability: { searchable: boolean } }[]) {
      kinds[g.kind] = (kinds[g.kind] ?? 0) + 1;
      if (g.kind !== 'prediction-residual') expect(g.searchability.searchable).toBe(false);
    }
    expect(kinds).toEqual(byKind(library));
    expect(kinds['prediction-residual']).toBe(searchable);
  });

  it('show a missing gap → exit 1', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'show', 'fg-does-not-exist'], c.io)).toBe(1);
  });

  it('show a real gap from scan --all --json', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'scan', '--all', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    const id = env.result[0].id as string;
    const c2 = captureMerged();
    expect(await runCli(['probe', 'show', id], c2.io)).toBe(0);
    expect(text(c2)).toContain(id);
  });

  it('run pendulum fixture recovers a known corpus relation', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'run', `--problem=${pendulum}`], c.io)).toBe(0);
    expect(text(c)).toMatch(/CE-pendulum-period|equivalent|experimental/);
  });

  it('run --json on pure noise abstains', async () => {
    const c = captureMerged();
    expect(await runCli(['probe', 'run', `--problem=${noise}`, '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.stopReason).toBe('no-credible-candidate');
  });

  it('design abstains without variables and never enters a forbidden region', async () => {
    const dir = tempDir('upt-probe-cli-');
    const h1 = join(dir, 'h1.json');
    const h2 = join(dir, 'h2.json');
    const bounds = join(dir, 'b.json');
    const dim = { L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0 };
    writeFileSync(h1, JSON.stringify({ kind: 'symbol', name: 'x', dim }));
    writeFileSync(
      h2,
      JSON.stringify({
        kind: 'op',
        op: '*',
        args: [
          { kind: 'symbol', name: '2', dim },
          { kind: 'symbol', name: 'x', dim },
        ],
      }),
    );
    writeFileSync(
      bounds,
      JSON.stringify({
        variables: { x: { min: 0, max: 10, steps: 5 } },
        forbidden: [{ x: { min: 8, max: 10 } }],
        sigma: 1,
      }),
    );
    const c = captureMerged();
    expect(await runCli(['probe', 'design', `--h1=${h1}`, `--h2=${h2}`, `--bounds=${bounds}`], c.io)).toBe(0);
    expect(text(c)).toMatch(/discrimination/);
  });

  it('help probe documents Product B vs discover', async () => {
    const c = captureMerged();
    expect(await runCli(['help', 'probe'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/Product B/);
    expect(t).toMatch(/upt discover/);
    expect(t).toMatch(/fg-expr-<case id>/);
    expect(t).toMatch(/no named baseline and no/);
    expect(t).toMatch(/dataset/);
    expect(t).toMatch(/not a detected/);
    expect(t).toMatch(/The id is not that file/);
  });
});
