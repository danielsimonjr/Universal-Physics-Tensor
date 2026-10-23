/**
 * The pre-push hook's gates must be able to FAIL (AGENTS law 2).
 *
 * `bun run docs:deps >/dev/null 2>&1 || true` followed by `git diff --quiet` is a gate that
 * passes when the generator crashes: the tree is unchanged, so the diff is empty, so the hook
 * prints OK and CI's docs-fresh job fails instead. The same shape hid a crash of the code-docs
 * checker. A gate's own command must fail the hook; only a tool that is NOT INSTALLED may skip,
 * and it must say so. The checks here read the hook's text, because the hook is a shell script
 * and TypeScript 7 has no shell parser either; each pattern is paired with the line it forbids.
 * The last gate block is also run under `sh` against a stub executable, so a text pattern that
 * still matches cannot hide a block that no longer fails.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { requirePeers } from '../helpers/peers.js';

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

  it('reads the code-docs verdict from the exit status AND a PASS line', () => {
    // `repo-tools docs check` exits 0 on PASS and non-zero on a MUST issue or when it cannot
    // measure the root, so the status is a verdict. The hook still wants the PASS line: a tool
    // that exits 0 and prints no verdict (a changed command, an empty run) measured nothing and
    // must not read as a pass.
    expect(hook).toMatch(/"\$REPO_TOOLS" docs check src/);
    expect(hook).toMatch(/\^PASS -- /);
    expect(hook).toMatch(/PRE-PUSH GATE FAILED: code-docs exited 0 but printed no PASS line/);
    expect(hook).toMatch(/PRE-PUSH GATE FAILED: code-docs found MUST issues, or the checker did not run/);
  });

  it('keeps no baseline: the count is zero, so a rise is not the test', () => {
    const baselineLines = lines.filter((l) => /baseline|ratchet|-gt\b/i.test(l) && !/^\s*#/.test(l));
    expect(baselineLines, baselineLines.join('\n')).toEqual([]);
    expect(existsSync(resolve(root, '.githooks/code-docs-baseline.txt'))).toBe(false);
  });
});

describe('pre-push hook: the checker is found by an overridable path and skips aloud', () => {
  it('names no private skills checkout and no private script', () => {
    expect(hook).not.toMatch(/UPT_SKILLS_DIR|SKILLS_DIR|code_docs\.py|\$CODE_DOCS|repo_map\.py|\$REPO_MAP\b/);
    const hardCoded = lines.filter((l) => /\$HOME\/Github\/skills\//.test(l));
    expect(hardCoded, hardCoded.join('\n')).toEqual([]);
  });

  it('locates repo-tools through UPT_REPO_TOOLS, defaulting to the name on PATH', () => {
    expect(hook).toMatch(/REPO_TOOLS="\$\{UPT_REPO_TOOLS:-repo-tools\}"/);
    // A path to the executable, on a line that runs something (the skip message names the npm scope).
    const hardCoded = lines.filter((l) => !/^\s*(#|echo\b)/.test(l) && /[/\\]repo-tools\b/.test(l));
    expect(hardCoded, hardCoded.join('\n')).toEqual([]);
  });

  it('runs no Python (a missing interpreter used to be able to read as "no findings")', () => {
    const python = lines.filter((l) => !/^\s*#/.test(l) && /\bpython/i.test(l));
    expect(python, python.join('\n')).toEqual([]);
  });

  it('runs the architecture-docs claims through repo-tools check', () => {
    expect(hook).toMatch(/"\$REPO_TOOLS" check \. --docs=docs\/architecture/);
  });

  it('fails the hook when a repo-tools command fails (the status is not swallowed)', () => {
    const swallowed = lines.filter((l) => /"\$REPO_TOOLS" (check|docs)\b.*\|\|\s*(true|:)/.test(l));
    expect(swallowed, swallowed.join('\n')).toEqual([]);
    expect(hook).toMatch(/PRE-PUSH GATE FAILED: architecture-docs claims do not match the source/);
  });

  it('says that the repo-tools command needs version 2.2.2 or later when it fails', () => {
    // 2.2.0 and 2.2.1 have the `docs` command but report the implementation signature of an
    // overloaded function (`classifyStructure`, `captureEnvironment`) as undocumented, so they
    // fail on this tree. Measured by running each version against `src/`.
    expect(hook).toMatch(/@danielsimonjr\/repo-tools 2\.2\.2 or later/);
    expect(hook).not.toMatch(/repo-tools 2\.2 or later/);
  });

  it('names the executable it looked for when it skips, once for each gate', () => {
    expect(hook).toMatch(/code-docs SKIPPED \(not found: \$REPO_TOOLS/);
    expect(hook).toMatch(/architecture-docs claims SKIPPED \(not found: \$REPO_TOOLS/);
  });
});

describe('pre-push hook: the repo-tools block, run under sh against a stub executable', () => {
  // The text checks above can still match a block that no longer fails. This runs the block itself.
  // The block is cut from the `REPO_TOOLS=` line to the line before the final OK echo, and the
  // anchors are asserted, so a restructured hook fails here instead of testing an empty string.
  const start = lines.findIndex((l) => l.startsWith('REPO_TOOLS="${UPT_REPO_TOOLS'));
  const end = lines.findIndex((l) => l.startsWith('echo "pre-push gate: OK"'));
  const block = lines.slice(start, end).join('\n');
  const hasSh = spawnSync('sh', ['-c', 'exit 0']).status === 0;
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  /** Runs the block with `stub` as the repo-tools executable (null: a path that does not exist). */
  const run = (stub: string[] | null) => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-prepush-'));
    dirs.push(dir);
    const exe = join(dir, 'repo-tools-stub').replace(/\\/g, '/');
    if (stub) {
      writeFileSync(exe, ['#!/bin/sh', 'echo "$@" >> "$(dirname "$0")/calls.txt"', ...stub, ''].join('\n'));
      chmodSync(exe, 0o755);
    }
    const r = spawnSync('sh', ['-c', `set -e\n${block}`], {
      cwd: dir,
      env: { ...process.env, UPT_REPO_TOOLS: stub ? exe : `${dir.replace(/\\/g, '/')}/absent/repo-tools` },
      encoding: 'utf8',
    });
    // A hook that fails before it calls the stub leaves no calls.txt; the output must still show.
    const callsFile = join(dir, 'calls.txt');
    const calls = existsSync(callsFile) ? readFileSync(callsFile, 'utf8') : '';
    return { status: r.status, out: `${r.stdout}${r.stderr}`, calls };
  };

  const dispatch = (docs: string[], check: string[]) => [
    'case "$1" in',
    '  docs) ' + docs.join('; ') + ' ;;',
    '  check) ' + check.join('; ') + ' ;;',
    '  *) echo "unknown command" >&2; exit 2 ;;',
    'esac',
  ];
  const passDocs = ['echo "checked 1 file(s) via git ls-files"', 'echo "PASS -- 1/1 exported symbols documented, 0 MUST issues"', 'exit 0'];
  const passCheck = ['echo "claims match"', 'exit 0'];

  it('finds the block it is about to run', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });

  it('has a shell to run the block with when peers are required', () => {
    // The cases below skip without `sh`; a skip reads as "not run", not as a pass. A run that
    // demands its peers (CI sets UPT_REQUIRE_PEERS) must fail instead.
    if (requirePeers) expect(hasSh, 'UPT_REQUIRE_PEERS is set and `sh` cannot run').toBe(true);
  });

  it.skipIf(!hasSh)('passes, and calls both commands with the repository arguments', () => {
    const r = run(dispatch(passDocs, passCheck));
    expect(r.status, r.out).toBe(0);
    expect(r.out).toMatch(/^PASS -- 1\/1 exported symbols documented, 0 MUST issues$/m);
    expect(r.out).not.toMatch(/SKIPPED/);
    expect(r.calls).toMatch(/^docs check src$/m);
    expect(r.calls).toMatch(/^check \. --docs=docs\/architecture$/m);
  });

  it.skipIf(!hasSh)('fails when code-docs reports a MUST issue (exit 1)', () => {
    const failDocs = ['echo "FAIL -- 1 MUST issue(s):"', 'echo "  a.ts:1 undocumented: M1 exported symbol has no doc comment"', 'exit 1'];
    const r = run(dispatch(failDocs, passCheck));
    expect(r.status, r.out).toBe(1);
    expect(r.out).toMatch(/PRE-PUSH GATE FAILED: code-docs found MUST issues/);
    expect(r.out).toMatch(/a\.ts:1 undocumented/);
    // It stops at the first failing gate, with that gate's diagnosis alone.
    expect(r.out).not.toMatch(/exited 0 but printed no PASS line/);
  });

  it.skipIf(!hasSh)('prints the whole MUST-issue list, header and first issue included', () => {
    // A long list must not be cut at its head: the FAIL header and the first issues are what a
    // reader needs first, and a `tail` keeps only the end.
    const longDocs = [
      'echo "FAIL -- 60 MUST issue(s):"',
      'i=0; while [ $i -lt 60 ]; do i=$((i+1)); echo "  f$i.ts:1 undocumented: M1 exported symbol has no doc comment"; done',
      'exit 1',
    ];
    const r = run(dispatch(longDocs, passCheck));
    expect(r.status, r.out).toBe(1);
    expect(r.out).toMatch(/^FAIL -- 60 MUST issue\(s\):$/m);
    expect(r.out).toMatch(/^ {2}f1\.ts:1 undocumented/m);
    expect(r.out).toMatch(/^ {2}f60\.ts:1 undocumented/m);
  });

  it.skipIf(!hasSh)('fails when code-docs exits 0 but prints no PASS line', () => {
    const r = run(dispatch(['echo "checked 0 file(s) via git ls-files"', 'exit 0'], passCheck));
    expect(r.status, r.out).toBe(1);
    expect(r.out).toMatch(/exited 0 but printed no PASS line/);
  });

  it.skipIf(!hasSh)('fails, naming the version, when an installed repo-tools has no docs command', () => {
    // An older install exits non-zero for an unknown command, as repo-tools 2.1 does. It is
    // installed, so the hook must not skip it.
    const r = run(['echo "repo-tools: unknown subcommand or option \'docs\'" >&2', 'exit 1']);
    expect(r.status, r.out).toBe(1);
    expect(r.out).toMatch(/PRE-PUSH GATE FAILED: code-docs/);
    expect(r.out).toMatch(/unknown subcommand or option 'docs'/);
    expect(r.out).toMatch(/2\.2\.2 or later/);
    expect(r.out).not.toMatch(/SKIPPED/);
  });

  it.skipIf(!hasSh)('fails when the architecture-docs claims do not match', () => {
    const r = run(dispatch(passDocs, ['echo "claim totalSourceFiles is stale"', 'exit 1']));
    expect(r.status, r.out).toBe(1);
    expect(r.out).toMatch(/PRE-PUSH GATE FAILED: architecture-docs claims do not match the source/);
    expect(r.out).toMatch(/totalSourceFiles is stale/);
  });

  it.skipIf(!hasSh)('skips both gates aloud, naming the path, only when the executable is missing', () => {
    const r = run(null);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toMatch(/code-docs SKIPPED \(not found: .*\/absent\/repo-tools;/);
    expect(r.out).toMatch(/architecture-docs claims SKIPPED \(not found: .*\/absent\/repo-tools;/);
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
