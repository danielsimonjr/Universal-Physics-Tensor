/**
 * Git runs a hook only when the file is executable. `.githooks/pre-push` was
 * stored as 100644, so `git push` printed "hook was ignored because it's not
 * set as executable" and the gate never ran. The mode in the index is the
 * fact that travels with the clone; a worktree chmod that is not committed
 * does not.
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('pre-push hook mode', () => {
  it('is executable in the git index, so the gate is not silently skipped', () => {
    const line = execFileSync('git', ['ls-files', '-s', '.githooks/pre-push'], {
      encoding: 'utf8',
    }).trim();
    expect(line.startsWith('100755 '), `index mode: ${line}`).toBe(true);
  });
});
