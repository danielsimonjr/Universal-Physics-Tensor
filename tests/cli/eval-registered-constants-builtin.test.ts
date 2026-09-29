/**
 * The same registered constants on the builtin parser, the path a published
 * install takes when the MathTS peer is absent.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@danielsimonjr/mathts-functions', () => ({}));

const { runCli } = await import('../../dist/cli/main.js');
const { CONSTANTS } = await import('../../src/composition/symbolic-constants.js');

async function run(args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runCli(args, {
    out: (s?: string) => stdout.push((s ?? '') + '\n'),
    err: (s?: string) => stderr.push((s ?? '') + '\n'),
    write: (s: string) => stdout.push(s),
  });
  return { code, stdout: stdout.join(''), stderr: stderr.join('') };
}

describe('upt eval registered constants on the builtin parser', () => {
  it('sigma_sb, ln2 and b are the registered values', async () => {
    for (const name of ['sigma_sb', 'ln2', 'b'] as const) {
      const r = await run(['eval', name, '--debug']);
      expect(r.stderr, name).toMatch(/parser: builtin/);
      expect(r.code, name).toBe(0);
      expect(Number(r.stdout.trim()), name).toBe(CONSTANTS[name].value);
    }
  });

  it('a bare sigma is refused', async () => {
    const r = await run(['eval', 'sigma']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/missing values for: sigma/);
    expect(r.stdout).not.toContain(String(CONSTANTS.sigma_sb.value));
  });
});
