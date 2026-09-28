/**
 * Audit I4 and persona finding W7 on the BUILTIN formula parser. The MathTS peer is a devDependency,
 * so the builtin path is reached by mocking the peer's module to a namespace without `parse`, as
 * `record-builtin-parser.test.ts` does; `eval-functions.test.ts` is the default-parser twin.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@danielsimonjr/mathts-functions', () => ({}));

const { runCli } = await import('../../dist/cli/main.js');

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  });
  return { code, ...o };
}

describe('audit I4: eval on the builtin parser', () => {
  it('the mock took: --debug names the builtin parser and the package version', async () => {
    const r = await run(['eval', '2+2', '--debug']);
    expect(r.stderr).toMatch(/\[parser: builtin \(universal-physics-tensor \d+\.\d+\.\d+\)\]/);
  });

  it('lg(100) fails with exit 2 and the same suggestion as the MathTS parser', async () => {
    const r = await run(['eval', 'lg(100)']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/unknown function 'lg'\. For the base-10 logarithm use log10\(…\)/);
  });

  it('control: an unknown function with no equivalent still fails, and no equivalent is invented', async () => {
    const r = await run(['eval', 'lnn(2)']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/unknown function 'lnn'\. Documented functions:/);
    expect(r.stderr).not.toMatch(/ use /);
  });
});

describe('W7 on the builtin parser: map --equation compares ln(2)', () => {
  it('landauer-erasure-energy = k_B*temperature*ln(2) agrees with CE-landauer', async () => {
    const r = await run(['map', '--equation', 'landauer-erasure-energy = k_B*temperature*ln(2)']);
    expect(r.code).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/✓ agrees with CE-landauer/);
  });
});
