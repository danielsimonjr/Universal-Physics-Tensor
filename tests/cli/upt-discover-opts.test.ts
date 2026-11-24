/**
 * `upt discover` option validation (Round-2 robustness): `--max-orders` and
 * `--anchor` must reject malformed values (exit 2 for a token with no `=` or a numeric token outside the
 * grammar, exit 1 for a well-formed bad value; cli/README.md §Hardening) rather than silently
 * ignoring them (or, for an empty `--max-orders=`, silently coercing to 0).
 */
import '../helpers/dist.js';
import { captureMerged } from '../helpers/cli.js';
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runCli } from '../../dist/cli/main.js';
import { json, runText } from '../helpers/cli-run.js';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');

function run(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer | string };
    return { status: err.status ?? 1, stderr: String(err.stderr ?? '') };
  }
}

// In-process harness (mirrors tests/cli/confront.test.ts's captureMerged()) for
// the consequence-propagation surfacing added in Phase 4 Unit A task 2.

describe('upt discover — option validation', () => {
  // A token outside the numeric grammar is a malformed invocation, exit 2 (one exit-code rule
  // since 2026-10-15; these two exited 1 before it).
  it('rejects a non-numeric --max-orders as a usage error (exit 2), naming the flag and the token', () => {
    const r = run(['discover', '--max-orders=abc']);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--max-orders 'abc'");
  });

  it('rejects an empty --max-orders (would silently coerce to 0) as a usage error (exit 2)', () => {
    expect(run(['discover', '--max-orders=']).status).toBe(2);
  });

  it('rejects a negative --max-orders', () => {
    expect(run(['discover', '--max-orders=-1']).status).toBe(1);
  });

  it('rejects a malformed --anchor (no value)', () => {
    expect(run(['discover', '--anchor=mass']).status).toBe(2);
  });

  it('rejects a non-numeric --anchor value as a bad value (exit 1)', () => {
    expect(run(['discover', '--anchor=mass=abc']).status).toBe(1);
  });

  it('accepts a well-formed --max-orders and --anchor', () => {
    expect(run(['discover', '--max-orders=4', '--anchor=mass=1.989e30']).status).toBe(0);
  });

  it('accepts discover with no options (default anchor)', () => {
    expect(run(['discover']).status).toBe(0);
  });
});

describe('upt discover — consequence signal surfacing', () => {
  it('discover shows a consequence signal on promising candidates', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover'], cap.io);
    expect(code).toBe(0);
    expect(cap.lines.join('')).toMatch(/consequence|novel-consequence|entailed/i);
  });

  it('discover --json carries the consequence field additively', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover', '--json'], cap.io);
    expect(code).toBe(0);
    const parsed = JSON.parse(cap.lines.join(''));
    const promising = parsed.result.filter((r: { verdict: string }) => r.verdict === 'promising');
    expect(promising.length).toBeGreaterThan(0);
    expect(promising.every((r: { consequence?: unknown }) => 'consequence' in r)).toBe(true);
  });
});

// Persona finding L4 (2026-09-25): the AXIS-CLASH header called 70 identifications
// "falsified" while the funnel line on the same screen counted "0 contradictory
// (falsified)". An axis clash compares stated scale/force LABELS; it runs no physical
// test, so it is a prior, not a falsification. The verdict enum is unchanged.
describe('upt discover — axis-clash is labelled a regime-label prior, not a falsification', () => {
  it('the header and the funnel say what each verdict tested', async () => {
    const cap = captureMerged();
    const code = await runCli(['discover'], cap.io);
    expect(code).toBe(0);
    const text = cap.lines.join('');
    expect(text).toMatch(/AXIS-CLASH \(stated scale\/force labels differ: a regime-label prior, not a physical test\)/);
    expect(text).toMatch(/\d+ contradictory \(numerically falsified\)/);
    expect(text).not.toMatch(/identification falsified/);
  });
});

describe('discovery output contracts', () => {
  async function json(args: string[]) {
    const invocation = captureMerged();
    expect(await runCli(['discover', ...args, '--json'], invocation.io)).toBe(0);
    return JSON.parse(invocation.lines.join(''));
  }

  it('documents mutually exclusive modes and the JSON adjudication inventory', () => {
    const help = execFileSync('node', [cli, 'discover', '--help'], { encoding: 'utf8' });
    expect(help).toContain('Cannot be combined with --derive');
    expect(help).toContain('JSON always retains adjudicated rows');
    expect(run(['discover', '--derive', '--substitutions']).status).toBe(2);
  });

  it('applies a downstream evaluation filter without reclassifying domain refusals', async () => {
    const all = await json(['--source=both', '--substitutions']);
    const only = await json(['--source=both', '--require-evaluated-substitution']);
    const find = (rows: typeof all.result, from: string, to: string) =>
      rows.find((r: { a: string; b: string }) => r.a === from && r.b === to);
    const refused = find(all.result, 'barrier-width', 'compton-wavelength-full');
    expect(refused.substitutionSummary.refused).toBeGreaterThan(0);
    expect(refused.substitutionSummary.evaluated).toBe(0);
    expect(find(only.result, 'barrier-width', 'compton-wavelength-full')).toBeUndefined();
    const evaluated = find(only.result, 'foerster-radius', 'bohr-radius');
    expect(evaluated.substitutionSummary.evaluated).toBeGreaterThan(0);
    expect(all.result.some((r: { substitutionSummary: { abstained: number } }) =>
      r.substitutionSummary.abstained > 0)).toBe(true);
  });

  it('carries source evidence and applies the falsifier filter before deriving', async () => {
    const all = await json(['--source=both', '--derive']);
    const filtered = await json(['--source=both', '--derive', '--require-falsifier']);
    expect(all.result.length).toBeGreaterThan(0);
    for (const row of all.result) {
      expect(row.evidence.readiness.observation).toEqual(expect.any(String));
      expect(row.evidence.grounding.gaps).toEqual(expect.any(Array));
    }
    for (const row of filtered.result) expect(row.evidence.readiness.falsifiers.survived.length).toBeGreaterThan(0);
    expect(filtered.result.length).toBeLessThan(all.result.length);
  });

  it('keeps the full adjudication inventory in JSON', async () => {
    const all = await json(['--source=canonical']);
    const explicit = await json(['--source=canonical', '--show-adjudicated']);
    expect(all.adjudicationSummary.total).toBeGreaterThan(0);
    expect(explicit).toEqual(all);
  });
});

describe('selected discovery anchor vocabulary', () => {
  it.each([
    ['discover', 'canonical', 'parker-sound=1'],
    ['discover', 'catalog', 'compton-wavelength-full=1m'],
    ['ground', 'canonical', 'parker-sound=1'],
  ])('refuses %s anchors unavailable in the %s graph', async (command, source, anchor) => {
    const pair = command === 'ground' ? ['compton-wavelength', 'hubble-distance'] : [];
    const report = await runText([command, `--source=${source}`, `--anchor=${anchor}`, ...pair]);
    expect(report.code).toBe(1);
    expect(report.text).toContain(`is not a quantity in the selected ${source} graph`);
  });

  it('accepts a catalog anchor when catalog or both is selected', async () => {
    for (const source of ['catalog', 'both']) {
      const report = await json(['discover', `--source=${source}`, '--anchor=parker-sound=1']);
      expect(report.anchor.groundTruth.values).toEqual({ 'parker-sound': 1 });
    }
  });

  it('reads alias and canonical anchor spellings in the same evaluator unit', async () => {
    const args = ['ground', '--source=both', 'compton-wavelength-full', 'schwarzschild-radius'];
    const named = await json([...args, '--anchor=vacuum-expectation-value=1J']);
    const aliased = await json([...args, '--anchor=vacuum_expectation_value=1J']);
    expect(named.anchor.groundTruth.values['vacuum-expectation-value']).toBeGreaterThan(6e9);
    expect(aliased.anchor).toEqual(named.anchor);

    const conflicting = await runText([
      ...args, '--anchor=vacuum-expectation-value=1J,vacuum_expectation_value=1GeV',
    ]);
    expect(conflicting.code).toBe(1);
    expect(conflicting.text).toContain("resolves to 'vacuum-expectation-value', which is already bound");
  });
});
