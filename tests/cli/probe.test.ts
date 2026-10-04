/**
 * In-process `upt probe` — experimental Product B CLI.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

const here = dirname(fileURLToPath(import.meta.url));
const pendulum = join(here, '../fixtures/discovery/pendulum-scaling/public/problem.json');
const noise = join(here, '../fixtures/discovery/pure-noise/public/problem.json');

describe('upt probe', () => {
  it('missing subverb is usage error → exit 2', async () => {
    const c = capture();
    expect(await runCli(['probe'], c.io)).toBe(2);
    expect(text(c)).toMatch(/subverb/);
  });

  it('scan --json --source=canonical returns a JSON envelope instead of throwing', async () => {
    const c = capture();
    const code = await runCli(['probe', '--json', 'scan', '--source=canonical'], c.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(text(c));
    expect(parsed.command).toBe('probe');
    expect(parsed.source).toBe('canonical');
    expect(Array.isArray(parsed.result)).toBe(true);
  });

  it('scan defaults to searchable expression gaps and hides relation-link wrappers', async () => {
    const c = capture();
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
    const c = capture();
    expect(await runCli(['probe', 'scan', '--searchable-only', '--all'], c.io)).toBe(2);
    expect(text(c)).toMatch(/--searchable-only or --all/);
  });

  it('run without a problem file is a usage error', async () => {
    const c = capture();
    expect(await runCli(['probe', 'run'], c.io)).toBe(2);
    expect(text(c)).toMatch(/--problem=FILE is required/);
  });

  it('show resolves an expression gap and a wrapper from the combined list', async () => {
    const expr = capture();
    expect(await runCli(['probe', 'show', 'fg-expr-case-skin-depth'], expr.io)).toBe(0);
    const shown = text(expr);
    expect(shown).toMatch(/searchable: true/);
    expect(shown).toMatch(/no named baseline/);
    expect(shown).toMatch(/no dataset/);
    expect(shown).toMatch(/not a detected prediction residual/);

    const scan = capture();
    expect(await runCli(['probe', 'scan', '--all', '--json'], scan.io)).toBe(0);
    const link = (JSON.parse(text(scan)).result as { id: string; kind: string }[]).find(
      (g) => g.kind === 'relation-link',
    );
    expect(link).toBeDefined();
    const wrap = capture();
    expect(await runCli(['probe', 'show', link!.id], wrap.io)).toBe(0);
    expect(text(wrap)).toMatch(/searchable: false/);
    expect(text(wrap)).toMatch(/upt discover/);
  });

  it('scan --all lists not-searchable relation-link gaps', async () => {
    const c = capture();
    expect(await runCli(['probe', 'scan', '--all'], c.io)).toBe(0);
    const t = text(c);
    expect(t).toMatch(/fg-link-/);
    expect(t).toMatch(/upt discover/);
    expect(t).toMatch(/not-searchable/);
  });

  it('scan --json reports the same catalog split as the library pin', async () => {
    const c = capture();
    expect(await runCli(['probe', 'scan', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    // 364 is the record from before be-77..87 (358 wrappers + 6 expression gaps).
    // 730 is the record from before be-88..102.
    expect(env.options.scan).toEqual({ total: 1370, searchable: 6, showing: 'searchable-only' });
    expect(env.result).toHaveLength(6);
    expect(env.result.every((g: { kind: string; observations: unknown[]; searchability: { searchable: boolean; reasons: string[] } }) =>
      g.kind === 'prediction-residual' &&
      g.searchability.searchable &&
      g.observations.length === 0 &&
      /no named baseline/.test(g.searchability.reasons.join(' ')) &&
      /no dataset/.test(g.searchability.reasons.join(' ')) &&
      /not a detected prediction residual/.test(g.searchability.reasons.join(' ')))).toBe(true);

    const all = capture();
    expect(await runCli(['probe', 'scan', '--all', '--json'], all.io)).toBe(0);
    const envAll = JSON.parse(text(all));
    expect(envAll.options.scan).toEqual({ total: 1370, searchable: 6, showing: 'all' });
    const kinds: Record<string, number> = {};
    for (const g of envAll.result as { kind: string; searchability: { searchable: boolean } }[]) {
      kinds[g.kind] = (kinds[g.kind] ?? 0) + 1;
      if (g.kind !== 'prediction-residual') expect(g.searchability.searchable).toBe(false);
    }
    // 343 relation-links is the record from before be-77..87.
    expect(kinds).toEqual({ 'relation-link': 1349, 'regime-transition': 15, 'prediction-residual': 6 });
  });

  it('show a missing gap → exit 1', async () => {
    const c = capture();
    expect(await runCli(['probe', 'show', 'fg-does-not-exist'], c.io)).toBe(1);
  });

  it('show a real gap from scan --all --json', async () => {
    const c = capture();
    expect(await runCli(['probe', 'scan', '--all', '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    const id = env.result[0].id as string;
    const c2 = capture();
    expect(await runCli(['probe', 'show', id], c2.io)).toBe(0);
    expect(text(c2)).toContain(id);
  });

  it('run pendulum fixture recovers a known corpus relation', async () => {
    const c = capture();
    expect(await runCli(['probe', 'run', `--problem=${pendulum}`], c.io)).toBe(0);
    expect(text(c)).toMatch(/CE-pendulum-period|equivalent|experimental/);
  });

  it('run --json on pure noise abstains', async () => {
    const c = capture();
    expect(await runCli(['probe', 'run', `--problem=${noise}`, '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.stopReason).toBe('no-credible-candidate');
  });

  it('design abstains without variables and never enters a forbidden region', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-probe-cli-'));
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
    const c = capture();
    expect(await runCli(['probe', 'design', `--h1=${h1}`, `--h2=${h2}`, `--bounds=${bounds}`], c.io)).toBe(0);
    expect(text(c)).toMatch(/discrimination/);
  });

  it('help probe documents Product B vs discover', async () => {
    const c = capture();
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
