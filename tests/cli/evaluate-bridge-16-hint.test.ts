/**
 * `evaluateBridge(16)` has no id-keyed evaluator. The error must name
 * `BridgeEquations.landauerEnergy` and `upt explain landauer-erasure-energy`,
 * the same way be-42 names the Hawking temperature.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { evaluateBridge } from '../../src/bridges/evaluators.js';
import { BridgeEquations } from '../../src/bridges/bridge-equations.js';
import { K_B_SI } from '../../src/core/constants.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return {
    lines,
    err,
    io: { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: (s: string) => lines.push(s) },
  };
}

function messageOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected a throw');
}

describe('evaluateBridge(16) names a working Landauer energy', () => {
  it('the named API and the named CLI command both return k_B T ln 2', async () => {
    const message = messageOf(() => evaluateBridge(16, { temperature_K: 300 }));
    expect(message).toMatch(/BridgeEquations\.landauerEnergy/);
    expect(message).toMatch(/upt explain landauer-erasure-energy temperature=300/);
    expect(message).not.toMatch(/upt evaluate` with no args/);

    const fromApi = BridgeEquations.landauerEnergy({ temperature_K: 300 });
    expect(fromApi / (K_B_SI * 300 * Math.LN2)).toBeCloseTo(1, 8);

    const explained = capture();
    expect(
      await runCli(['explain', '--json', 'landauer-erasure-energy', 'temperature=300'], explained.io),
    ).toBe(0);
    const envelope = JSON.parse(explained.lines.join('')) as {
      result: { summary: string };
    };
    const recovered = envelope.result.summary.match(/Recovered value: ([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);
    expect(recovered, envelope.result.summary).not.toBeNull();
    const fromCli = Number(recovered![1]);
    expect(fromCli / fromApi).toBeCloseTo(1, 3);

    const cli = capture();
    expect(await runCli(['evaluate', 'be-16'], cli.io)).toBe(1);
    expect(cli.err.join('')).toContain('BridgeEquations.landauerEnergy');
    expect(cli.err.join('')).toContain('upt explain landauer-erasure-energy temperature=300');
  });
});
