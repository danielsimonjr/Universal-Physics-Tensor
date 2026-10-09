/**
 * The pre-push hook's gates must be able to FAIL (AGENTS law 2).
 *
 * `bun run docs:deps >/dev/null 2>&1 || true` followed by `git diff --quiet` is a gate that
 * passes when the generator crashes: the tree is unchanged, so the diff is empty, so the hook
 * prints OK and CI's docs-fresh job fails instead. The same shape hid a crash of the code-docs
 * checker. A gate's own command must fail the hook; only a tool that is NOT INSTALLED may skip,
 * and it must say so. The checks here read the hook's text, because the hook is a shell script
 * and TypeScript 7 has no shell parser either; each pattern is paired with the line it forbids.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hook = readFileSync(resolve(root, '.githooks/pre-push'), 'utf8');
const lines = hook.split('\n');

describe('pre-push hook: a gate command that fails must fail the hook', () => {
  it('does not swallow the exit status of docs:deps or bun install', () => {
    const swallowed = lines.filter((l) => /bun (run docs:deps|install)\b.*\|\|\s*true/.test(l));
    expect(swallowed, swallowed.join('\n')).toEqual([]);
  });

  it('does not discard the output of docs:deps (a crash must be readable)', () => {
    const silenced = lines.filter((l) => /bun run docs:deps.*>\/dev\/null/.test(l));
    expect(silenced, silenced.join('\n')).toEqual([]);
  });

  it('reads the code-docs verdict from the PASS/FAIL line, and a crash is neither', () => {
    // The checker exits 1 whenever MUST issues exist, so its status cannot be the verdict; the
    // hook must still fail when there is NO verdict line. Both halves are already in the hook;
    // this pins them.
    expect(hook).toMatch(/gave neither a PASS nor a FAIL line/);
    expect(hook).toMatch(/\^FAIL -- \[0-9\]\+ MUST/);
  });
});

describe('pre-push hook: the private checkers are found by an overridable path and skip aloud', () => {
  it('locates the skills checkout through UPT_SKILLS_DIR, defaulting to $HOME/Github/skills', () => {
    expect(hook).toMatch(/UPT_SKILLS_DIR/);
    const hardCoded = lines.filter((l) => /\$HOME\/Github\/skills\/(code-docs|architecture-docs)/.test(l));
    expect(hardCoded, hardCoded.join('\n')).toEqual([]);
  });

  it('runs the checkers with python3 (a bare `python` is python 2 or absent on many hosts)', () => {
    const bare = lines.filter((l) => /\bpython\s+"?\$/.test(l));
    expect(bare, bare.join('\n')).toEqual([]);
    expect(hook).toMatch(/python3 "\$CODE_DOCS"/);
    expect(hook).toMatch(/python3 "\$REPO_MAP"/);
  });

  it('names the path it looked for when it skips', () => {
    expect(hook).toMatch(/code-docs SKIPPED \(not found: \$CODE_DOCS/);
    expect(hook).toMatch(/architecture-docs claims SKIPPED \(not found: \$REPO_MAP/);
  });
});

describe('pre-push hook: no stale cost claim', () => {
  it('does not claim the full suite runs in about a minute', () => {
    // CI measured 654 s wall for the 9.0.0 suite; a local warm run is minutes, not 58 s. The
    // first run after a reboot was once used to justify a scoped subset (TOOLS.md), so the hook
    // states the CI figure and its date rather than a number from an older, smaller suite.
    expect(hook).not.toMatch(/58 ?s for 4,144 tests/);
    expect(hook).not.toMatch(/~60s warm/);
    expect(hook).toMatch(/654 s/);
  });
});
