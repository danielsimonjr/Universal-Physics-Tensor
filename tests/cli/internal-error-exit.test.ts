/**
 * A defect (an error that is neither `UsageError` nor `CliError`) reaching `bin/upt.mjs` is
 * reported as `upt: internal error: <message>` on stderr with exit code 70 (EX_SOFTWARE), not as
 * a raw stack and an unhandled rejection.
 *
 * Found by the 2026-10-15 survey (`bin/upt.mjs:28`, `main.ts:112, :201`). The error is planted
 * through `UPT_CLI_PLANT_INTERNAL_ERROR=<command>`, which `main.ts` reads inside the dispatch,
 * so the route a real defect takes (both catches rethrow it) is the one exercised.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/upt.mjs');

function run(args: string[], env: Record<string, string>): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync('node', [cli, ...args], { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, ...env } });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

describe('bin/upt.mjs last-resort handler', () => {
  it('a planted TypeError inside the dispatch exits 70 with one stderr line and no stack', () => {
    const r = run(['audit'], { UPT_CLI_PLANT_INTERNAL_ERROR: 'audit' });
    expect(r.status).toBe(70);
    expect(r.stderr).toBe("upt: internal error: planted internal error for 'upt audit' (UPT_CLI_PLANT_INTERNAL_ERROR)\n");
    expect(r.stdout).toBe('');
  });
  it('CONTROL: the hook fires only on the named command; another command runs as usual', () => {
    expect(run(['version'], { UPT_CLI_PLANT_INTERNAL_ERROR: 'audit' }).status).toBe(0);
    expect(run(['version'], {}).status).toBe(0);
  });
  it('CONTROL: a usage error is still exit 2 with its own message, not an internal error', () => {
    const r = run(['audit', '--bogus'], { UPT_CLI_PLANT_INTERNAL_ERROR: 'audit' });
    expect(r.status).toBe(2);
    expect(r.stderr).not.toContain('internal error');
  });
});
