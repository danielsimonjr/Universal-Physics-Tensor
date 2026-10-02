/**
 * In-process CLI tests importing from `src/cli` so vitest coverage instruments
 * the TypeScript sources (spawn-based tests only exercise the built shim).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runCli } from '../../src/cli/main.js';

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}
const text = (c: ReturnType<typeof capture>) => c.lines.join('');

const pkgPath = new URL('../../package.json', import.meta.url);
const version = (JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }).version;

describe('runCli from src — coverage path', () => {
  it('version/help/demo paths', async () => {
    const v = capture();
    expect(await runCli(['--version'], v.io)).toBe(0);
    expect(text(v)).toContain(version);

    const h = capture();
    expect(await runCli(['help', 'eval'], h.io)).toBe(0);
    expect(text(h)).toMatch(/upt eval/);

    const d = capture();
    expect(await runCli([], d.io)).toBe(0);
    expect(text(d)).toMatch(/hawking-temperature/);
  });

  it('eval rejects a bad value (exit 1) and a missing = (exit 2)', async () => {
    const bad = capture();
    expect(await runCli(['eval', 'x', 'x=nope'], bad.io)).toBe(1);
    expect(text(bad)).toMatch(/x=nope/);

    const usage = capture();
    expect(await runCli(['eval', 'x', 'x'], usage.io)).toBe(2);
  });

  it('evaluate rejects a bad value (exit 1)', async () => {
    const c = capture();
    expect(await runCli(['evaluate', 'be-63', 'mu_e=nope'], c.io)).toBe(1);
    expect(text(c)).toMatch(/mu_e=nope|nope/);
  });

  it('evaluate lists bridges and evaluates be-55', async () => {
    const list = capture();
    expect(await runCli(['evaluate'], list.io)).toBe(0);
    expect(text(list)).toMatch(/be-55/);

    const ev = capture();
    expect(await runCli(['evaluate', 'be-55', 'C=1', '--json'], ev.io)).toBe(0);
    expect(JSON.parse(text(ev)).result.bridgeId).toBe(55);
  });

  it('axes and ground commands', async () => {
    const ax = capture();
    expect(await runCli(['axes', '--json'], ax.io)).toBe(0);
    expect(JSON.parse(text(ax)).result.length).toBeGreaterThan(0);

    const gr = capture();
    expect(await runCli(['ground', 'landauer-erasure-energy', 'dark-fermion-mass'], gr.io)).toBe(0);
    expect(text(gr)).toMatch(/mechanism-tested/);
  });

  it('probe holdout-tol validation', async () => {
    const c = capture();
    expect(
      await runCli(
        [
          'probe',
          'run',
          `--problem=${fileURLToPath(new URL('../fixtures/discovery/pendulum-scaling/public/problem.json', import.meta.url))}`,
          '--holdout-tol=not-a-number',
        ],
        c.io,
      ),
    ).toBe(2);
    expect(text(c)).toMatch(/--holdout-tol/);
  });

  it('exercises additional commands with --json', async () => {
    for (const args of [
      ['map', '--json'],
      ['discover', '--json', '--max-orders=1'],
      ['confront', '--json'],
      ['coverage', '--json'],
      ['canonical', '--json'],
      ['connectors', '--json'],
      ['priority', '--json'],
      ['audit', '--json'],
      ['recover', '--json'],
      ['symbolic', '--json'],
      ['candidates', '--json'],
      ['predict', '--json'],
      ['eval', '2+2', '--json'],
      ['derive', 'x:time', '--json'],
    ] as const) {
      const c = capture();
      const code = await runCli([...args], c.io);
      expect(code).toBe(0);
      expect(() => JSON.parse(text(c))).not.toThrow();
    }
  });
});
