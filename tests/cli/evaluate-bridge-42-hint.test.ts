/**
 * be-42 evaluates. The sentence that named BridgeEquations.hawkingTemperature
 * is the record from before this evaluator.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
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

describe('upt evaluate be-42 returns a Hawking temperature', () => {
  it('the registry and the CLI both return a finite temperature', async () => {
    const mass = 1.989e30;
    const fromApi = evaluateBridge(42, { M_kg: mass }) as { value: number };
    expect(fromApi.value).toBe(BridgeEquations.hawkingTemperature({ M_kg: mass }));
    expect(fromApi.value).toBeGreaterThan(0);

    const cli = capture();
    expect(await runCli(['evaluate', 'be-42', `M_kg=${mass}`], cli.io)).toBe(0);
    expect(cli.lines.join('')).toContain(String(fromApi.value));
    expect(cli.err.join('')).not.toContain('BridgeEquations');
  });

  it('an id that truly has no evaluator still points at upt evaluate with no args', () => {
    const message = messageOf(() => evaluateBridge(11, { x: 1 }));
    expect(message).toMatch(/upt evaluate` with no args/);
    expect(message).not.toMatch(/BridgeEquations/);
  });
});
