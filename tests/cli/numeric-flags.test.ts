/**
 * A numeric flag is read by one strict grammar, never by `Number()`.
 *
 * Found by the 2026-10-15 survey: `Number()` accepts hex, binary, octal and exponent forms, so
 * `upt map --max-routes=0x10` ran with 16 and `--depth=1e1` with 10 (`map.ts`, `path.ts`,
 * `probe.ts`, `_discovery-opts.ts`). An integer flag is `/^[+-]?\d+$/`; a real flag is a decimal
 * with an optional exponent. A token outside the grammar is a usage error (exit 2) naming the
 * flag and the token; a well-formed value outside the flag's range stays a value refusal (exit 1).
 * `''` and whitespace are not the literal 0 either (`expr-print.ts`, `symbolic.ts`).
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { runCli } from '../../dist/cli/main.js';
import { integerFlag, isDecimalLiteral, realFlag } from '../../dist/cli/numeric-flag.js';
import { latexName } from '../../dist/cli/expr-print.js';
import { UsageError } from '../../dist/cli/errors.js';

async function run(args: string[]): Promise<{ code: number; stderr: string }> {
  const err: string[] = [];
  const sink = () => {};
  const code = await runCli(args, { out: sink, err: (s?: string) => err.push((s ?? '') + '\n'), write: sink });
  return { code, stderr: err.join('') };
}

const PROBLEM = join(import.meta.dirname, '../fixtures/discovery/pendulum-scaling/public/problem.json');
const STUDY = join(import.meta.dirname, '../fixtures/probe-study/pendulum-small-angle.synthetic.json');

describe('the grammar', () => {
  it.each(['3', '-2', '+7', '0', '010'])('integer: accepts %s', (s) => {
    expect(integerFlag('x', '--n', s)).toBe(Number(s));
  });
  it.each(['0x10', '1e1', '2.5', '', ' 3', '3 ', 'abc', 'Infinity', 'NaN', '0b1', '0o7', '1_000', '--1'])(
    'integer: refuses %j as a usage error naming the flag and the token',
    (s) => {
      expect(() => integerFlag('map', '--max-routes', s)).toThrow(UsageError);
      expect(() => integerFlag('map', '--max-routes', s)).toThrow(`upt map: --max-routes '${s}' is not an integer`);
    },
  );
  it.each(['3', '-2.5', '.5', '5.', '1e-3', '2E+4', '0.0'])('real: accepts %s', (s) => {
    expect(realFlag('x', '--r', s)).toBe(Number(s));
  });
  it.each(['0x10', '', ' 1', 'abc', 'Infinity', 'NaN', '1e', 'e3', '1.2.3', '0b1', '1_0'])(
    'real: refuses %j as a usage error naming the flag and the token',
    (s) => {
      expect(() => realFlag('probe', '--alpha', s)).toThrow(UsageError);
      expect(() => realFlag('probe', '--alpha', s)).toThrow(`upt probe: --alpha '${s}' is not a number`);
    },
  );
  it('a command of "" hints at `upt help` with no command word', () => {
    expect(() => realFlag('', '--max-orders', 'abc')).toThrow(/see upt help\)$/);
    expect(() => realFlag('discover', '--max-orders', 'abc')).toThrow(/see upt help discover\)$/);
  });
  it('isDecimalLiteral: a decimal literal and nothing else (not "", not whitespace, not hex)', () => {
    for (const s of ['2', '0.5', '1e-3', '-1', '.5']) expect(isDecimalLiteral(s), s).toBe(true);
    for (const s of ['', ' ', '0x10', 'x', '2pi', 'Infinity']) expect(isDecimalLiteral(s), JSON.stringify(s)).toBe(false);
  });
  it('latexName: a hex token is a name, not a number', () => {
    expect(latexName('1e-3')).toBe('1e-3');
    expect(latexName('0x10')).not.toBe('0x10');
    expect(latexName('')).not.toBe('');
  });
});

describe('map', () => {
  const ROUTE = ['map', '--route=model-pendulum,model-lc', '--all-routes'];
  it.each(['0x10', '1e1', '2.5', 'x'])('--max-routes=%s is a usage error (exit 2)', async (bad) => {
    const r = await run([...ROUTE, `--max-routes=${bad}`]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`--max-routes '${bad}' is not an integer`);
  });
  it.each(['0', '1001'])('--max-routes=%s is out of range: a value refusal (exit 1)', async (bad) => {
    const r = await run([...ROUTE, `--max-routes=${bad}`]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/--max-routes=.* must be an integer from 1 to 1000/);
  });
  it('--depth=1e1 is a usage error; --depth=0 stays a value refusal', async () => {
    const hex = await run(['map', '--around=temperature', '--depth=1e1', '--source=catalog']);
    expect(hex.code).toBe(2);
    expect(hex.stderr).toContain("--depth '1e1' is not an integer");
    const zero = await run(['map', '--around=temperature', '--depth=0', '--source=catalog']);
    expect(zero.code).toBe(1);
    expect(zero.stderr).toMatch(/--depth=0 must be an integer from 1 to 10/);
  });
});

describe('path --sweep', () => {
  it('a hex sample count is a usage error; 1 and 201 stay value refusals', async () => {
    const base = ['path', 'model-pendulum', 'model-spring', '--at', 'T0=1', 't=10'];
    const hex = await run([...base, '--sweep', 'theta0=0.1:0.5:0x5']);
    expect(hex.code).toBe(2);
    expect(hex.stderr).toContain("--sweep sample count '0x5' is not an integer");
    expect((await run([...base, '--sweep', 'theta0=0.1:0.5:1'])).code).toBe(1);
    expect((await run([...base, '--sweep', 'theta0=0.1:0.5:201'])).code).toBe(1);
  });
});

describe('probe', () => {
  it.each(['--budget-ms=0x10', '--budget-ms=abc', '--holdout-tol=0x1'])('run %s is a usage error (exit 2)', async (flag) => {
    const r = await run(['probe', 'run', `--problem=${PROBLEM}`, flag]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/upt probe: --(budget-ms|holdout-tol) '.*' is not a number/);
  });
  it.each(['--budget-ms=0', '--holdout-tol=-1'])('run %s is a value refusal (exit 1)', async (flag) => {
    const r = await run(['probe', 'run', `--problem=${PROBLEM}`, flag]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/must be a positive number/);
  });
  it('study --alpha=0x1 is a usage error; --alpha=2 stays a value refusal', async () => {
    const hex = await run(['probe', 'study', `--data=${STUDY}`, '--alpha=0x1']);
    expect(hex.code).toBe(2);
    expect(hex.stderr).toContain("--alpha '0x1' is not a number");
    const two = await run(['probe', 'study', `--data=${STUDY}`, '--alpha=2']);
    expect(two.code).toBe(1);
    expect(two.stderr).toMatch(/--alpha must be a number in \(0, 1\)/);
  });
});

describe('discover --max-orders', () => {
  it.each(['0x3', 'abc', ''])('--max-orders=%j is a usage error (exit 2)', async (bad) => {
    const r = await run(['discover', '--source=canonical', `--max-orders=${bad}`]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain(`--max-orders '${bad}' is not a number`);
  });
  it('a negative value stays the pinned value refusal (exit 1)', async () => {
    const r = await run(['discover', '--source=canonical', '--max-orders=-1']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('upt: --max-orders must be a non-negative finite number, got "-1".');
  });
  it('map --proposed shares the parser (exit 2 on the same token)', async () => {
    const r = await run(['map', '--proposed', '--max-orders=0x3', '--format=dot']);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--max-orders '0x3' is not a number");
  });
});

describe('evaluate --corr', () => {
  it('a hex rho is a usage error; 1.5 stays a value refusal', async () => {
    const base = ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=1', '--sigma', 'R_ohm=1', '--corr'];
    const hex = await run([...base, 'T_K,R_ohm=0x1']);
    expect(hex.code).toBe(2);
    expect(hex.stderr).toContain("--corr rho '0x1' is not a number");
    const big = await run([...base, 'T_K,R_ohm=1.5']);
    expect(big.code).toBe(1);
    expect(big.stderr).toMatch(/rho in \[-1, 1\]/);
  });
});
