/**
 * `upt eval` prints the SI unit of the result when the dimension is known.
 * A bare number has no known dimension, and the result then shows the value only.
 * In-process against the built CLI (dist/cli/main.js).
 */
import '../helpers/dist.js';
import { run } from '../helpers/cli-run.js';
import { describe, it, expect } from 'vitest';
import { parseUnit } from '../../dist/dimensional/units.js';
import { exactlyEquals } from '../../dist/dimensional/algebra.js';

const json = async (args: string[]) => JSON.parse((await run(['eval', ...args, '--json'])).stdout).result;

describe('eval prints the unit of a result with a known dimension', () => {
  it('F/m is an acceleration', async () => {
    expect((await run(['eval', 'F/m', 'F=10N', 'm=2kg'])).stdout.trim()).toBe('5 m/s^2');
  });
  it('x*y takes the named coherent unit', async () => {
    expect((await run(['eval', 'x*y', 'x=2N', 'y=3m'])).stdout.trim()).toBe('6 J');
  });
  it('a constant-only formula carries its unit', async () => {
    expect((await run(['eval', 'c'])).stdout.trim()).toBe('299792458 m/s');
  });
  it('JSON unit is the printed unit and parses back', async () => {
    const r = await json(['F/m', 'F=10N', 'm=2kg']);
    expect(r.unit).toBe('m/s^2');
    const e = await json(['x*y', 'x=2N', 'y=3m']);
    expect(e.unit).toBe('J');
    expect(exactlyEquals(parseUnit(r.unit).dim, parseUnit('m/s^2').dim)).toBe(true);
  });
  it.each([
    ['sigma_sb*T^4', ['T=300K'], 'W/m^2', 'kg/s^3'],
    ['1/(4*pi*eps0)', [], 'm/F', 'kg*m^3/(s^4*A^2)'],
    ['k_B*N_A*T/V', ['T=300K', 'V=0.0248m^3'], 'Pa/mol', 'kg/(m*s^2*mol)'],
  ] as const)('prints the compact coherent unit of %s', async (formula, bindings, label, base) => {
    const result = await json([formula, ...bindings]);
    expect(result.unit).toBe(label);
    expect(parseUnit(label)).toEqual(parseUnit(base));
  });
  const table = ['N', 'kg', 'm', 's', 'J', 'W', 'V'];
  for (const u of table) {
    it(`a single binding in ${u} prints a unit of the same dimension`, async () => {
      const r = await run(['eval', 'x', `x=1${u}`]);
      const unit = r.stdout.trim().split(' ').slice(1).join(' ');
      expect(unit).not.toBe('');
      expect(exactlyEquals(parseUnit(unit).dim, parseUnit(u).dim)).toBe(true);
      expect((await json(['x', `x=1${u}`])).unit).toBeDefined();
    });
  }
});

describe('eval prints the value only when no unit is known', () => {
  const bare: [string, string[]][] = [
    ['a*b^2', ['a=2', 'b=3']],
    ['x', ['x=1kg', '--natural']],
    ['2*pi*sqrt(1/9.81)', []],
    ['x/y', ['x=1m', 'y=2m']],
    ['x*e', ['x=2m', 'e=3']],
  ];
  for (const [expr, b] of bare) {
    it(`${expr} ${b.join(' ')}`, async () => {
      const r = await run(['eval', expr, ...b]);
      expect(r.stdout.trim()).toMatch(/^\S+$/);
      expect((await json([expr, ...b])).unit).toBeUndefined();
    });
  }
  it('a*b^2 is exactly 18', async () => {
    expect((await run(['eval', 'a*b^2', 'a=2', 'b=3'])).stdout.trim()).toBe('18');
  });
});

it('the help says the SI unit follows the value', async () => {
  expect((await run(['eval', '--help'])).stdout).toContain('the SI unit of the result');
});
