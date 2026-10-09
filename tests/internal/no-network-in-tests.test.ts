/**
 * No test fetches from the network.
 *
 * `tests/tools/criterion3-labels.test.ts` once ran `git show <commit>:corpus.json` and, when the
 * object was absent (a depth-1 clone), `git fetch --depth=1 origin <commit>`; in a shallow clone
 * the verdict depended on GitHub. The historical bytes are vendored under tests/fixtures/ now.
 * This scan keeps that shape out: a test may run git against a temp repository it created, but
 * not `git fetch`, `git pull` or `git clone` against a remote.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tests = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

// A spawned git subcommand that reaches a remote, as an argv element or a shell string.
const REMOTE_GIT = /'git'\s*,\s*\[\s*'(fetch|pull|clone)'|`git (fetch|pull|clone)\b|"git (fetch|pull|clone)\b/;

describe('tests do not reach the network', () => {
  it('no test file spawns git fetch, pull or clone', () => {
    const offenders = walk(tests)
      .filter((f) => !f.endsWith('no-network-in-tests.test.ts'))
      .filter((f) => REMOTE_GIT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(tests.length + 1));
    expect(offenders).toEqual([]);
  });

  it('control: the pattern matches the shape that was removed', () => {
    expect(REMOTE_GIT.test("execFileSync('git', ['fetch', '--depth=1', 'origin', COMMIT])")).toBe(true);
    expect(REMOTE_GIT.test("execFileSync('git', ['show', SPEC])")).toBe(false);
    expect(REMOTE_GIT.test("execFileSync('git', ['init', '-b', 'fixture'], { cwd: root })")).toBe(false);
  });
});
