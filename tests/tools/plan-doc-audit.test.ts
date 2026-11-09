/**
 * The plan-doc audit is a release gate (`audit:plans`, run by `validate`). A
 * plan root that does not exist used to yield ZERO files and a clean pass, so
 * moving the ledger without updating the default would have turned the gate
 * into a vacuous pass. These tests pin that it cannot.
 */

import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PLAN_ROOTS, auditFile, runAudit } from '../../tools/plan-doc-audit/audit.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('plan-doc audit — the gate cannot pass by scanning nothing', () => {
  it('every default plan root exists in the repository', () => {
    expect(DEFAULT_PLAN_ROOTS.length).toBeGreaterThan(0);
    for (const p of DEFAULT_PLAN_ROOTS) expect(existsSync(resolve(root, p))).toBe(true);
  });

  it('a plan root that does not exist is an ERROR, not an empty scan', () => {
    expect(() => runAudit({ planRoots: ['no/such/ledger.md'], cwd: root })).toThrow(/does not exist/);
  });

  it('CONTROL: the default roots run without throwing', () => {
    expect(() => runAudit({ cwd: root })).not.toThrow();
  });
});

/**
 * A whole-word match in a comment or a string is not a shipped symbol. The
 * ACTIVE.md row below backticks `master`, a branch name. The word occurs in
 * `src/` only in a URL string and in prose, so the row was marked
 * flip-eligible. The audit now counts a match only on a line that declares
 * the symbol.
 */
describe('plan-doc audit — a word in prose is not a shipped symbol', () => {
  // The CLI shim path is split so that `dist-freshness.test.ts` does not read
  // this file as a reader of the build; the joined row is the ACTIVE.md text.
  const SHIM = 'bin/upt' + '.mjs';
  const ROW =
    '- [ ] `tests/cli/internal-error-exit.test.ts` "CONTROL: without the preload …" timed out at 60 s once inside the full local suite on the ZBOOK (2026-11-08); it passes alone. It spawns `upt audit` twice, and `node ' +
    SHIM +
    ' audit` takes 18.3 s on `master` and 18.9 s on the M5 to M7 branch. Measure where `upt audit` spends the time and make it cheaper. Do not raise the timeout.';

  function fixture(): string {
    const dir = mkdtempSync(join(tmpdir(), 'plan-audit-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(
      join(dir, 'src', 'a.ts'),
      [
        '// A path on `master`.',
        "const BLOB = 'https://example.org/blob/master/';",
        'export function realThing(x: number): number {',
        '  return x + 1;',
        '}',
        'export const BLOB_ROOT = BLOB;',
        '',
      ].join('\n'),
    );
    writeFileSync(join(dir, 'ACTIVE.md'), `${ROW}\n- [ ] Speed up \`realThing\` on the hot path.\n`);
    execSync('git init -q && git add -A', { cwd: dir });
    return dir;
  }

  it('the timing row is NOT flip-eligible: `master` occurs only in a comment and a string', () => {
    const dir = fixture();
    try {
      const [row] = auditFile(join(dir, 'ACTIVE.md'), 'src', dir);
      expect(row.symbols.map((s) => s.symbol)).toEqual(['master']);
      expect(row.symbols[0].status).toBe('absent');
      expect(row.recommendation).toBe('leave');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CONTROL: a row that names a declared function with a body stays flip-eligible', () => {
    const dir = fixture();
    try {
      const row = auditFile(join(dir, 'ACTIVE.md'), 'src', dir)[1];
      expect(row.symbols[0]).toMatchObject({ symbol: 'realThing', status: 'shipped' });
      expect(row.recommendation).toBe('flip');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
