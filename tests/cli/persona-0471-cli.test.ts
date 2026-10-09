/**
 * CLI pins for the 0.47.1 applied-physicist persona findings that are not
 * covered by the canonical-compare or probe suites (L2, Q1).
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) }, text: () => lines.join('') };
}

describe('L2: upt canonical --vars prints the formula vocabulary', () => {
  it('lists CE-mass-energy target and variables including c', async () => {
    const c = capture();
    expect(await runCli(['canonical', '--vars'], c.io)).toBe(0);
    const t = c.text();
    expect(t).toMatch(/CE-mass-energy\s+rest-energy\s+mass, c/);
    expect(t).toMatch(/CE-wien\s+peak-wavelength\s+b, temperature/);
    expect(t).toMatch(/Use these names in `upt map --equation`/);
  });
});

describe('Q1: discover PROMISING lists consequence/magnitude before bare inconclusive', () => {
  it('the first printed PROMISING row is not an inconclusive + no-magnitude coincidence when a better one exists', async () => {
    const c = capture();
    expect(await runCli(['discover'], c.io)).toBe(0);
    const t = c.text();
    const block = t.split('PROMISING')[1] ?? '';
    const rows = [...block.matchAll(/^\s{4}(\S.+?)\s+\[\[/gm)].map((m) => m[1]!.trim());
    expect(rows.length).toBeGreaterThan(0);
    // Under the Q1 sort, a novel-consequence or magnitude-backed row precedes
    // landauer ≟ inflation-hubble-energy (inconclusive, no representative value).
    const inflationIdx = rows.findIndex((r) => /landauer-erasure-energy\s*≟\s*inflation-hubble-energy/.test(r));
    const novelIdx = rows.findIndex((r) => /landauer-erasure-energy\s*≟\s*dark-fermion-mass/.test(r));
    const barrierIdx = rows.findIndex((r) => /landauer-erasure-energy\s*≟\s*barrier-height/.test(r));
    if (inflationIdx >= 0 && (novelIdx >= 0 || barrierIdx >= 0)) {
      const better = Math.min(...[novelIdx, barrierIdx].filter((i) => i >= 0));
      expect(better).toBeLessThan(inflationIdx);
    }
  });
});
