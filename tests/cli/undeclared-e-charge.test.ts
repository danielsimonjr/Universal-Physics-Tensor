/**
 * An undeclared `1-e^2` must not print 1, and `upt map` must not stop at a
 * bare dimension mismatch. `e` is the elementary charge unless it is declared
 * or bound. Euler's number is `exp(x)`.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { E_SI } from '../../src/core/constants.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { builtinFormulaDimensionChecker } from '../../src/numerical/formula-dimension.js';

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
const text = (c: ReturnType<typeof capture>) => c.lines.join('');
const errText = (c: ReturnType<typeof capture>) => c.err.join('');

const PERIHELION = 'perihelion_precession = 6*pi*G*mass/(c^2*a*(1-e^2))';

describe('undeclared 1-e^2 names the elementary charge', () => {
  it('upt eval refuses 1-e^2 and still evaluates a bound e, a bare e, and exp(1)', async () => {
    const mixed = capture();
    expect(await runCli(['eval', '1-e^2'], mixed.io)).toBe(2);
    const message = errText(mixed);
    expect(message).toMatch(/elementary charge/);
    expect(message).toMatch(/declare|bind/i);
    expect(message).toMatch(/exp\(x\)/);
    expect(text(mixed).trim()).not.toBe('1');

    const bound = capture();
    expect(await runCli(['eval', '1-e^2', 'e=0.2'], bound.io)).toBe(0);
    expect(Number(text(bound).trim())).toBeCloseTo(1 - 0.04, 12);

    const charge = capture();
    expect(await runCli(['eval', 'e'], charge.io)).toBe(0);
    expect(Number(text(charge).trim())).toBeCloseTo(E_SI, 15);

    const euler = capture();
    expect(await runCli(['eval', 'exp(1)'], euler.io)).toBe(0);
    expect(Number(text(euler).trim())).toBeCloseTo(Math.E, 12);
  });

  it('upt map names the charge, the binding, and exp(x)', async () => {
    const map = capture();
    expect(await runCli(['map', '--equation-only', '--equation', PERIHELION], map.io)).toBe(2);
    const message = errText(map);
    expect(message).toMatch(/elementary charge/);
    expect(message).toMatch(/declare|bind/i);
    expect(message).toMatch(/exp\(x\)/);
    expect(message).toMatch(/one_minus_e_sq/);
    expect(message).not.toMatch(/^Cannot subtract/);
  });

  it('a declared dimensionless e stays dimensionless', () => {
    const declared = builtinFormulaDimensionChecker().check('1-e^2', { e: DIMENSIONLESS });
    expect(declared.ok).toBe(true);
  });
});
