/**
 * A stray untracked file must not reach a gate or a committed generated artifact.
 *
 * An untracked `tests/tmp/differential.test.ts` once sat in a working tree. The pre-push typecheck
 * compiled it and failed, and `bun run docs:deps` recorded it in the committed test-coverage docs,
 * so the docs described files that no clone and no CI run has. Two fixes, one test group each:
 *
 * - `trackedFiles` lists the git index, and `create-dependency-graph` chooses only those files, so
 *   an untracked scratch file cannot enter its output. It still reads each chosen file from disk,
 *   and a staged new file (`git add -N` included) counts as tracked.
 * - `dirtyGateInputs` lists every untracked or modified file in the working tree; the pre-push hook
 *   refuses to run while the list is not empty, so the gates read exactly HEAD.
 *
 * Each test builds a throwaway git repository, so it does not depend on this tree's state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isTracked, trackedFiles } from '../../tools/create-dependency-graph/tracked-files.js';
import { dirtyGateInputs } from '../../tools/gate-inputs/gate-inputs.js';

let repo: string;
const git = (...args: string[]) =>
  execFileSync(
    'git',
    [
      '-c',
      'user.email=t@example.invalid',
      '-c',
      'user.name=t',
      '-c',
      'core.autocrlf=false',
      // Throwaway commits must not wait on the user's signing agent. With
      // commit.gpgsign set, each beforeEach commit can exceed vitest's 10s
      // hook timeout (measured: the file then fails on the last case).
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    {
      cwd: repo,
      encoding: 'utf-8',
    },
  );
const write = (rel: string, text = 'export const x = 1;\n') => {
  const p = join(repo, rel);
  mkdirSync(resolve(p, '..'), { recursive: true });
  writeFileSync(p, text);
};

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'upt-gate-inputs-'));
  git('init', '-q');
  write('src/a.ts');
  write('tests/a.test.ts');
  write('.gitignore', 'ignored/\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('trackedFiles — the generator reads the git index only', () => {
  it('lists tracked files and omits an untracked stray', () => {
    write('tests/tmp/stray.test.ts');
    const tracked = trackedFiles(repo);
    expect(isTracked(tracked, join(repo, 'src', 'a.ts'))).toBe(true);
    expect(isTracked(tracked, join(repo, 'tests', 'a.test.ts'))).toBe(true);
    expect(isTracked(tracked, join(repo, 'tests', 'tmp', 'stray.test.ts'))).toBe(false);
  });

  it('includes a new file once it is staged', () => {
    write('src/b.ts');
    expect(isTracked(trackedFiles(repo), join(repo, 'src', 'b.ts'))).toBe(false);
    git('add', 'src/b.ts');
    expect(isTracked(trackedFiles(repo), join(repo, 'src', 'b.ts'))).toBe(true);
  });

  it('fails loudly outside a git work tree rather than reading the disk', () => {
    const plain = mkdtempSync(join(tmpdir(), 'upt-not-a-repo-'));
    try {
      expect(() => trackedFiles(plain)).toThrow(/git/);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });
});

describe('dirtyGateInputs — the pre-push gates judge the pushed commit', () => {
  it('is empty for a clean tree', () => {
    expect(dirtyGateInputs(repo)).toEqual([]);
  });

  it('names an untracked stray under a gated root', () => {
    write('tests/tmp/stray.test.ts');
    expect(dirtyGateInputs(repo)).toEqual(['tests/tmp/stray.test.ts']);
  });

  it('names a modified tracked file, staged or not', () => {
    write('src/a.ts', 'export const x = 2;\n');
    expect(dirtyGateInputs(repo)).toEqual(['src/a.ts']);
    git('add', 'src/a.ts');
    expect(dirtyGateInputs(repo)).toEqual(['src/a.ts']);
  });

  it('ignores gitignored files', () => {
    write('ignored/x.ts');
    expect(dirtyGateInputs(repo)).toEqual([]);
  });

  it('names an uncommitted change to a gate configuration file', () => {
    write('package.json', '{}\n');
    git('add', 'package.json');
    git('commit', '-q', '-m', 'pkg');
    write('package.json', '{"x":1}\n');
    expect(dirtyGateInputs(repo)).toEqual(['package.json']);
  });

  // Paths the test suite reads outside src/ and tests/. A list of gated paths once missed each of
  // these; the check now covers the whole tree, and each case plants a stray to prove it.
  it.each([
    'tools/helper.ts',
    'data/atlas/stray.json',
    'bin/stray.mjs',
    'docs/specification/stray.md',
    'formal/physlib/Stray.lean',
    'scripts/stray.mjs',
    'stray-at-root.ts',
  ])('names an untracked stray at %s', (rel) => {
    write(rel);
    expect(dirtyGateInputs(repo)).toEqual([rel]);
  });

  it('names a modified tracked file outside src/ and tests/', () => {
    write('NOTES.md', 'a\n');
    git('add', 'NOTES.md');
    git('commit', '-q', '-m', 'notes');
    write('NOTES.md', 'b\n');
    expect(dirtyGateInputs(repo)).toEqual(['NOTES.md']);
  });
});
