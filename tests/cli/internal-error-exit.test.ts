/**
 * A defect (an error that is neither `UsageError` nor `CliError`) reaching `bin/upt.mjs` is
 * reported as `upt: internal error: <message>` on stderr with exit code 70 (EX_SOFTWARE), not as
 * a raw stack and an unhandled rejection.
 *
 * Found by the 2026-10-15 survey (`bin/upt.mjs:28`, `main.ts:112, :201`). The handler is
 * `reportInternalError` in `dist/cli/main.js`, which the shim calls; it is unit-tested here. The
 * end-to-end route is driven without any hook in production code: a node `--import` preload
 * (`tests/fixtures/cli/plant-internal-error.mjs`) re-registers `audit` with a throwing `run`, so
 * the error is thrown from inside the real dispatch and both catches in `runCli` rethrow it. (An
 * environment variable read inside `runCli` once planted it; that hook is gone.)
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reportInternalError } from '../../dist/cli/main.js';

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, '../../bin/upt.mjs');
// `--import` takes a module specifier: a bare Windows path (`C:\...`) reads as a URL with scheme `c:`.
const plant = pathToFileURL(resolve(here, '../fixtures/cli/plant-internal-error.mjs')).href;

function run(args: string[], preload: boolean): { status: number; stdout: string; stderr: string } {
  const node = preload ? ['--import', plant, cli, ...args] : [cli, ...args];
  try {
    const stdout = execFileSync('node', node, { stdio: 'pipe', encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? -1, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}

describe('reportInternalError — the last-resort handler', () => {
  it('prints one line, the message and not the stack, and returns 70', () => {
    const lines: string[] = [];
    const code = reportInternalError(new TypeError('boom'), { err: (l?: string) => lines.push(l ?? '') });
    expect(code).toBe(70);
    expect(lines).toEqual(['upt: internal error: boom']);
  });

  it('a thrown non-Error and an Error with no message still print one line', () => {
    const lines: string[] = [];
    const io = { err: (l?: string) => lines.push(l ?? '') };
    expect(reportInternalError('a string', io)).toBe(70);
    expect(reportInternalError(new Error(''), io)).toBe(70);
    expect(reportInternalError(undefined, io)).toBe(70);
    expect(lines).toEqual(['upt: internal error: a string', 'upt: internal error: Error', 'upt: internal error: undefined']);
  });
});

describe('bin/upt.mjs calls the handler (end to end, no hook in production code)', () => {
  it('a TypeError thrown by a command run exits 70 with one stderr line and no stack', () => {
    const r = run(['audit'], true);
    expect(r.status).toBe(70);
    expect(r.stderr).toBe('upt: internal error: planted internal error for upt audit (tests/fixtures/cli/plant-internal-error.mjs)\n');
    expect(r.stdout).toBe('');
  });

  it('CONTROL: without the preload the same command runs as usual; the preload touches only audit', () => {
    expect(run(['audit'], false).status).toBe(0);
    expect(run(['version'], true).status).toBe(0);
  });

  it('CONTROL: a usage error is still exit 2 with its own message, not an internal error', () => {
    const r = run(['audit', '--bogus'], true);
    expect(r.status).toBe(2);
    expect(r.stderr).not.toContain('internal error');
  });

  it('no source under src/ or bin/ reads a planted-error hook, and the shim calls reportInternalError', () => {
    const root = resolve(here, '../..');
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|mjs|js)$/.test(e.name) && /PLANT_INTERNAL_ERROR/.test(readFileSync(p, 'utf8'))) hits.push(p);
      }
    };
    walk(join(root, 'src'));
    walk(join(root, 'bin'));
    expect(hits).toEqual([]);
    expect(readFileSync(cli, 'utf8')).toMatch(/process\.exitCode = main\.reportInternalError\(err\)/);
  });
});
