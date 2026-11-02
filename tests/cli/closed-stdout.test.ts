/**
 * A reader that closes the pipe early (`upt map | head -1`) must end the run quietly, not crash
 * with an unhandled `write EPIPE` stack trace.
 */
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const cli = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/upt.mjs');

// The pipe needs a POSIX bash with PIPESTATUS. On Windows, `bash` on PATH is usually the WSL
// launcher, which cannot see this checkout or its node, so Git for Windows' bash is used when it
// is installed and the suite is skipped otherwise. Every other host runs it unchanged.
const GIT_BASH = 'C:\\Program Files\\Git\\bin\\bash.exe';
const bash = process.platform !== 'win32' ? 'bash' : existsSync(GIT_BASH) ? GIT_BASH : null;

function piped(args: string, reader: string): { upt: number; stderr: string; out: string } {
  const r = spawnSync(bash!, ['-c', `node "${cli.replace(/\\/g, '/')}" ${args} | ${reader}; echo "upt=\${PIPESTATUS[0]}" >&2`], {
    encoding: 'utf8',
  });
  const upt = Number(/upt=(\d+)/.exec(r.stderr)![1]);
  return { upt, stderr: r.stderr.replace(/upt=\d+\n?$/, ''), out: r.stdout };
}

describe.skipIf(bash === null)('closed stdout', () => {
  it('`upt map | head -3` exits 0 with no EPIPE trace', () => {
    const r = piped('map', 'head -3');
    expect(r.out.split('\n')).toHaveLength(4);
    expect(r.out.trim()).not.toBe('');
    expect(r.stderr).not.toMatch(/EPIPE|Unhandled/);
    expect(r.upt).toBe(0);
  });

  it('control: with a reader that drains everything, the exit code is still the command’s own', () => {
    const r = piped('nosuchcommand', 'cat');
    expect(r.upt).toBe(2);
    expect(r.stderr).toMatch(/Unknown command 'nosuchcommand'/);
  });
});
