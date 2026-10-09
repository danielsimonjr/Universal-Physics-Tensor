/**
 * be-16 evaluates. The sentence that named BridgeEquations.landauerEnergy
 * is the record from before this evaluator.
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { evaluateBridge } from '../../src/bridges/evaluators.js';
import { K_B_SI } from '../../src/core/constants.js';

describe('upt evaluate be-16 returns the Landauer energy', () => {
  it('the registry and the CLI both return k_B T ln 2', async () => {
    const fromApi = evaluateBridge(16, { temperature_K: 300 }) as { value: number };
    expect(fromApi.value / (K_B_SI * 300 * Math.LN2)).toBeCloseTo(1, 8);

    const cli = capture();
    expect(await runCli(['evaluate', 'be-16', 'temperature_K=300'], cli.io)).toBe(0);
    expect(cli.lines.join('')).toContain(String(fromApi.value));
    expect(cli.err.join('')).not.toContain('BridgeEquations');
  });
});
