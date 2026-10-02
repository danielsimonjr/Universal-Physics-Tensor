/**
 * Audit I4 (with F03): an unknown function names a tested equivalent, `--debug` names the parser AND
 * its version, and the help documents the logarithm bases. On the default parser (the MathTS peer is
 * a devDependency); `eval-functions-builtin.test.ts` runs the same checks on the builtin parser.
 * In-process against the built CLI (dist/cli/main.js).
 */
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { BUILTIN_FUNCTION_LIST } from '../../dist/numerical/formula-contract.js';

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  });
  return { code, ...o };
}

const collapse = (s: string) => s.replace(/\s+/g, ' ');

describe('audit I4: eval on the default parser', () => {
  it('lg(100) fails with exit 2 and names log10 as the tested equivalent', async () => {
    const r = await run(['eval', 'lg(100)']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/unknown function 'lg'\. For the base-10 logarithm use log10\(…\)/);
  });

  it('control: the named equivalent evaluates, log10(100) = 2', async () => {
    const r = await run(['eval', 'log10(100)']);
    expect(r.code).toBe(0);
    expect(Number(r.stdout.trim())).toBe(2);
  });

  it('log is the natural logarithm, as the help says: log(100) = ln(100)', async () => {
    const log = await run(['eval', 'log(100)']);
    const ln = await run(['eval', 'ln(100)']);
    expect(Number(log.stdout.trim())).toBeCloseTo(Math.log(100), 12);
    expect(log.stdout).toBe(ln.stdout);
  });

  it('--debug names the parser and its version', async () => {
    const r = await run(['eval', '2+2', '--debug']);
    expect(r.code).toBe(0);
    expect(r.stderr).toMatch(/\[parser: mathts \(@danielsimonjr\/mathts-functions \d+\.\d+\.\d+\)\]/);
  });

  it('the eval help and the top-level help list exactly the documented functions', async () => {
    const one = await run(['help', 'eval']);
    const all = await run(['help']);
    for (const h of [one.stdout, all.stdout]) {
      expect(collapse(h)).toContain(collapse(BUILTIN_FUNCTION_LIST));
      expect(collapse(h)).toMatch(/log is the NATURAL logarithm: use log10 or log2 for base 10 or 2/);
    }
  });
});
