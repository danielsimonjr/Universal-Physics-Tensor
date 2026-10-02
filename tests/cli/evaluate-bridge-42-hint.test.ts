/**
 * `evaluateBridge(42)` has no id-keyed evaluator. The error must name a
 * command and an API that actually return a finite Hawking temperature.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { evaluateBridge } from '../../src/bridges/evaluators.js';
import { BridgeEquations } from '../../src/bridges/bridge-equations.js';

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

describe('evaluateBridge(42) names a working Hawking temperature', () => {
  it('the named API and the named CLI command both return a finite temperature', async () => {
    const message = messageOf(() => evaluateBridge(42, { M_kg: 1.989e30 }));
    expect(message).toMatch(/BridgeEquations\.hawkingTemperature/);
    expect(message).not.toMatch(/upt evaluate` with no args/);

    const command = message.match(/upt explain hawking-temperature mass=([0-9.eE+-]+)/);
    expect(command, message).not.toBeNull();
    const mass = Number(command![1]);
    expect(Number.isFinite(mass)).toBe(true);
    expect(mass).toBeGreaterThan(0);

    const fromApi = BridgeEquations.hawkingTemperature({ M_kg: mass });
    expect(Number.isFinite(fromApi)).toBe(true);
    expect(fromApi).toBeGreaterThan(0);

    const explained = capture();
    expect(await runCli(['explain', '--json', 'hawking-temperature', `mass=${command![1]}`], explained.io)).toBe(0);
    const envelope = JSON.parse(explained.lines.join('')) as {
      result: { summary: string };
    };
    const recovered = envelope.result.summary.match(/Recovered value: ([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);
    expect(recovered, envelope.result.summary).not.toBeNull();
    const fromCli = Number(recovered![1]);
    expect(Number.isFinite(fromCli)).toBe(true);
    expect(Math.abs(fromCli - fromApi) / fromApi).toBeLessThan(1e-3);

    const cli = capture();
    expect(await runCli(['evaluate', 'be-42'], cli.io)).toBe(1);
    expect(cli.err.join('')).toContain('BridgeEquations.hawkingTemperature');
    expect(cli.err.join('')).toContain(`upt explain hawking-temperature mass=${command![1]}`);
  });

  it('an id that truly has no evaluator still points at upt evaluate with no args', () => {
    const message = messageOf(() => evaluateBridge(11, { x: 1 }));
    expect(message).toMatch(/upt evaluate` with no args/);
  });
});
