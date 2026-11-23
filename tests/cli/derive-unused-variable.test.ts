/**
 * `upt derive --formula` checks the formula against the declared variables it uses, and names
 * each declared variable it does not use (issue 685).
 */
import { capture } from '../helpers/cli.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

async function cli(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, out: cap.lines.join(''), err: cap.err.join('') };
}

const BASE = ['derive', 'tau:time', 'm:mass', 'b:M.T^-1'];

describe('upt derive with a declared variable that the formula does not use', () => {
  it('names the unused variable and checks the formula against the used ones: exit 0', async () => {
    const r = await cli([...BASE, 'k:M.T^-2', '--formula', 'm/b']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('declared but not in the formula: k — checked against {m, b}');
    expect(r.out).toContain('tau ∝ m·b^-1');
    expect(r.out).toContain('formula MATCHES');
    expect(r.out).toMatch(/prefactor ≈ 1\b/);
  });
  it('names every unused variable', async () => {
    const r = await cli([...BASE, 'k:M.T^-2', 'zq:length', '--formula', 'm/b']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('declared but not in the formula: k, zq');
  });
  it('--json lists the unused variables and the determination over the used ones', async () => {
    const r = await cli([...BASE, 'k:M.T^-2', '--formula', 'm/b', '--json']);
    const j = JSON.parse(r.out);
    expect(j.result.unusedVariables).toEqual(['k']);
    expect(j.result.determination.determined).toBe(true);
  });
  it('control: without --formula the declared set decides, exit 3', async () => {
    const r = await cli([...BASE, 'k:M.T^-2']);
    expect(r.code).toBe(3);
    expect(r.out).toContain('NOT a unique monomial');
    expect(r.out).not.toContain('declared but not in the formula');
  });
  it('control: a formula that uses every variable prints no unused line and no key', async () => {
    const args = ['derive', 'period:time', 'length:length', 'gravity:acceleration', '--formula', '2*pi*sqrt(length/gravity)'];
    const r = await cli(args);
    expect(r.out).not.toContain('declared but not in the formula');
    const j = JSON.parse((await cli([...args, '--json'])).out);
    expect(j.result).not.toHaveProperty('unusedVariables');
  });
  it('the exit follows the used variables: not unique among them is still exit 3', async () => {
    const r = await cli(['derive', 'tau:time', 'm:mass', 'b:M.T^-1', 'c2:M.T^-1', 'k:M.T^-2', '--formula', 'm/b + m/c2']);
    expect(r.code).toBe(3);
    expect(r.out).toContain('declared but not in the formula: k');
    expect(r.out).toContain('NOT a unique monomial');
  });
  it('a target in its own formula still exits 2', async () => {
    // `tau` is the constant 2*pi in a formula, so this test names the target `zq`.
    const r = await cli(['derive', 'zq:time', 'm:mass', 'b:M.T^-1', 'k:M.T^-2', '--formula', 'zq*b/m']);
    expect(r.code).toBe(2);
  });
  it('includes explicitly declared elementary charge in the dimensional form', async () => {
    const r = await cli(['derive', 'R_H:L^3.T^-1.I^-1', 'n:L^-3', 'e:e', '--formula=1/(n*e)']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('R_H ∝ n^-1·e^-1');
    expect(r.out).toMatch(/prefactor ≈ 1\b/);
    expect(r.out).not.toContain('declared but not in the formula');
  });

  it('distinguishes an unreachable target dimension from redundant inputs', async () => {
    const r = await cli(['derive', 'F:force', 'Th:temperature', 'Tc:temperature']);
    expect(r.code).toBe(3);
    expect(r.out).toContain("target's dimension is not in the span");
    expect(r.out).not.toContain('NOT a unique monomial');
  });
  it('a wrong formula is still caught', async () => {
    const r = await cli([...BASE, 'k:M.T^-2', '--formula', 'm*b']);
    expect(r.code).toBe(3);
    expect(r.out).toContain('homogeneous but ≠ target');
  });
});
