/**
 * `--source=both` on either Landauer name prints both quantities. The two
 * recovered values are k_B T ln 2. A catalog-only or canonical-only run still
 * prints only the graph that was asked for.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { K_B_SI } from '../../src/core/constants.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

const EXPECTED = K_B_SI * 300 * Math.LN2;

function recovered(text: string, name: string): number {
  const block = text.split('●').find((part) => part.includes(name));
  expect(block, text).toBeDefined();
  const m = block!.match(/Recovered value: ([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?\d+)?)/);
  expect(m, block).not.toBeNull();
  return Number(m![1]);
}

describe('explain --source=both shows both Landauer names', () => {
  it('erasure-energy and landauer-erasure-energy both recover k_B T ln 2', async () => {
    for (const typed of ['erasure-energy', 'landauer-erasure-energy']) {
      const cap = capture();
      expect(await runCli(['explain', typed, 'temperature=300', '--source=both'], cap.io)).toBe(0);
      const text = cap.lines.join('');
      expect(text).toContain('erasure-energy');
      expect(text).toContain('landauer-erasure-energy');
      expect(text).toMatch(/CE-landauer restates be-16/);
      expect(text).toMatch(/Values agree/);
      expect(recovered(text, 'erasure-energy') / EXPECTED).toBeCloseTo(1, 3);
      expect(recovered(text, 'landauer-erasure-energy') / EXPECTED).toBeCloseTo(1, 3);
    }
  });

  it('a single source still prints only that graph', async () => {
    const canonical = capture();
    expect(await runCli(['explain', 'erasure-energy', 'temperature=300', '--source=canonical'], canonical.io)).toBe(0);
    const canonText = canonical.lines.join('');
    expect(canonText).toContain('erasure-energy');
    expect(canonText).not.toContain('landauer-erasure-energy');
    expect(recovered(canonText, 'erasure-energy') / EXPECTED).toBeCloseTo(1, 3);

    const catalog = capture();
    expect(await runCli(['explain', 'landauer-erasure-energy', 'temperature=300', '--source=catalog'], catalog.io)).toBe(0);
    const catText = catalog.lines.join('');
    expect(catText).toContain('landauer-erasure-energy');
    expect(catText).not.toContain('● erasure-energy');
    expect(recovered(catText, 'landauer-erasure-energy') / EXPECTED).toBeCloseTo(1, 3);
  });
});
