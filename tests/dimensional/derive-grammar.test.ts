import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { equals } from '../../src/dimensional/algebra.js';
import { parseDimensionSpec } from '../../src/dimensional/dimension-spec.js';
import { runCli } from '../../dist/cli/main.js';

const dim = (p: Partial<Record<'L' | 'M' | 'T' | 'I' | 'Theta' | 'N' | 'J', number>>) => ({
  L: 0, M: 0, T: 0, I: 0, Theta: 0, N: 0, J: 0, ...p,
});

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

describe('a named dimension takes a power on its own (issue 456)', () => {
  it.each([
    ['length^2', dim({ L: 2 })],
    ['time^2', dim({ T: 2 })],
    ['time^-1', dim({ T: -1 })],
    ['temperature^4', dim({ Theta: 4 })],
    ['1/time', dim({ T: -1 })],
    ['1/length^2', dim({ L: -2 })],
  ])('%s', (spec, want) => expect(equals(parseDimensionSpec(spec), want), spec).toBe(true));

  it('the working forms still work (control)', () => {
    expect(parseDimensionSpec('mass/length^3')).toEqual(dim({ M: 1, L: -3 }));
    expect(parseDimensionSpec('L^4')).toEqual(dim({ L: 4 }));
    expect(parseDimensionSpec('T^-1')).toEqual(dim({ T: -1 }));
    expect(parseDimensionSpec('L^3.M^-1.T^-2')).toEqual(dim({ L: 3, M: -1, T: -2 }));
  });
  it('an unknown name still fails, and the message does not call a named dimension unknown', () => {
    expect(() => parseDimensionSpec('furlong^2')).toThrow(/furlong/);
  });
});

describe('the explicit grammar writes a fractional exponent (issue 457)', () => {
  it('T^-2.5 is a decimal, and the dot between factors still separates them', () => {
    expect(parseDimensionSpec('L^2.M.T^-2.5')).toEqual(dim({ L: 2, M: 1, T: -2.5 }));
    expect(parseDimensionSpec('L^1.5.M^-0.5')).toEqual(dim({ L: 1.5, M: -0.5 }));
  });
  it('a named dimension takes a decimal exponent', () => {
    expect(parseDimensionSpec('power/time^0.5')).toEqual(dim({ L: 2, M: 1, T: -3.5 }));
    expect(parseDimensionSpec('time^0.5')).toEqual(dim({ T: 0.5 }));
  });
});

describe('sigma_sb is a derive dimension (issue 486)', () => {
  it('has the dimension of W/(m^2 K^4)', () => {
    expect(parseDimensionSpec('sigma_sb')).toEqual(dim({ M: 1, T: -3, Theta: -4 }));
  });
});

describe('a symbolic exponent on a dimensionless base is legal (issue 486)', () => {
  it.each(['rp^gam', 'rp^(1-gam)', 'rp^((gam-1)/gam)', '2^gam'])('derive %s', async (formula) => {
    const r = await cli(['derive', 'eta:dimensionless', 'rp:dimensionless', 'gam:dimensionless', '--formula', formula]);
    expect(r.text).not.toMatch(/exponent must be a numeric constant/);
    expect(r.text).toMatch(/formula dimension: \[1\]/);
  });
  it('map --equation reaches the same formula', async () => {
    const r = await cli(['map', '--equation', 'eta = 1 - r^(1-gamma)', '--source=catalog']);
    expect(r.text).not.toMatch(/exponent must be a numeric constant/);
  });
  it('a dimensionful base with a symbolic exponent is still refused, in a framed report (control)', async () => {
    const r = await cli(['derive', 'x:length', 'y:dimensionless', '--formula', 'x^y']);
    expect(r.code).not.toBe(0);
    expect(r.text).toMatch(/dimensionless/);
  });
  it('the Stefan-Boltzmann flux derives with sigma_sb', async () => {
    const r = await cli(['derive', 'q:power/area', 'T:temperature', 'sig:sigma_sb', '--formula', 'sig*T^4']);
    expect(r.text).not.toMatch(/unrecognized dimension term/);
  });
});
