/**
 * `upt eval` keeps the dimension of a binding that carries a unit. A formula that adds or
 * compares unlike dimensions is refused (exit 1). A bare number has no dimension check.
 * In-process against the built CLI (dist/cli/main.js).
 */
import '../helpers/dist.js';
import { run } from '../helpers/cli-run.js';
import { describe, it, expect } from 'vitest';
import { builtinFormulaDimensionChecker } from '../../dist/numerical/formula-dimension.js';
import { D } from '../fixtures/dimension.js';

const LENGTH = D(1);
const TIME = D(0, 0, 1);

const REFUSED = /dimensionally homogeneous/;

describe('eval refuses a formula that is not homogeneous under the binding dimensions', () => {
  const refused: [string, string[]][] = [
    ['x+y', ['x=2kg', 'y=3m']],
    ['x+1', ['x=2m']],
    ['x-y', ['x=1m', 'y=1s']],
    ['exp(x)', ['x=2m']],
    ['x+c', ['x=1m']],
  ];
  for (const [expr, bindings] of refused) {
    it(`${expr} ${bindings.join(' ')} exits 1`, async () => {
      const r = await run(['eval', expr, ...bindings]);
      expect(r.code).toBe(1);
      expect(r.stdout).toBe('');
      expect(r.stderr).toMatch(REFUSED);
    });
  }
});

describe('controls: a formula that stays computable is not refused', () => {
  const controls: [string, string[], number][] = [
    ['x+y', ['x=2m', 'y=300cm'], 5],
    ['x*y', ['x=2kg', 'y=3m'], 6],
    ['x+y', ['x=2', 'y=3'], 5],
    ['x+y', ['x=2kg', 'y=3'], 5],
    ['E+x', ['E=5', 'x=1m'], 6],
    ['T+1', ['T=300'], 301],
    ['sin(x/y)+1', ['x=1m', 'y=2m'], Math.sin(0.5) + 1],
  ];
  for (const [expr, bindings, want] of controls) {
    it(`${expr} ${bindings.join(' ')} = ${want}`, async () => {
      const r = await run(['eval', expr, ...bindings]);
      expect(r.code).toBe(0);
      expect(Number(r.stdout.trim())).toBeCloseTo(want, 12);
    });
  }

  it('an unknown function keeps the evaluator error (exit 2), not the homogeneity refusal', async () => {
    const r = await run(['eval', 'zqxfn(x)', 'x=1m']);
    expect(r.code).toBe(2);
    expect(r.stderr).not.toMatch(REFUSED);
  });

  it('--natural runs no new check', async () => {
    const r = await run(['eval', 'x+c', 'x=1m', '--natural']);
    expect(r.code).toBe(0);
  });

  it('the help example is unchanged', async () => {
    const r = await run(['eval', 'hbar*c^3/(8*pi*G*M*k_B)', 'M=1.989e30']);
    expect(r.code).toBe(0);
    expect(Number(r.stdout.trim())).toBeGreaterThan(0);
  });

  it('1 - e^2 stays the elementary-charge refusal (exit 2)', async () => {
    const r = await run(['eval', '1 - e^2']);
    expect(r.code).toBe(2);
  });

  it('the help says a unit keeps its dimension', async () => {
    const r = await run(['eval', '--help']);
    expect(r.stdout.replace(/\s+/g, ' ')).toMatch(/A value with a unit keeps its dimension/);
  });
});

describe('check() flags a homogeneity failure only', () => {
  const checker = builtinFormulaDimensionChecker();
  it('x+y with length and time is inhomogeneous', () => {
    expect(checker.check('x+y', { x: LENGTH, y: TIME }).inhomogeneous).toBe(true);
  });
  it('exp of a length is inhomogeneous', () => {
    expect(checker.check('exp(x)', { x: LENGTH }).inhomogeneous).toBe(true);
  });
  it('unsupported syntax, unknown function and a parse error are not', () => {
    expect(checker.check('a.b', {}).inhomogeneous).toBeUndefined();
    expect(checker.check('zqxfn(1)', {}).inhomogeneous).toBeUndefined();
    expect(checker.check('1 +', {}).inhomogeneous).toBeUndefined();
    expect(checker.check('x+1', {}).inhomogeneous).toBeUndefined();
  });
});
