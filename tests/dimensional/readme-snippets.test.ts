/**
 * The code fences in `src/dimensional/README.md` run as a user would run them.
 *
 * `ExprNode` is a type-only export. A value import fails under Node's type
 * stripper. The energy-plus-length fence is a mismatch. `sin` of a
 * dimensionless argument is homogeneous.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readme = readFileSync(resolve(root, 'src/dimensional/README.md'), 'utf8');
const fences = [...readme.matchAll(/```ts\n([\s\S]*?)```/g)].map((match) => match[1]!);

function runFence(source: string): { status: number; stdout: string; stderr: string } {
  const dir = mkdtempSync(join(tmpdir(), 'upt-dim-readme-'));
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'));
  writeFileSync(join(dir, 'snippet.ts'), source);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'snippet.ts'], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('src/dimensional/README.md', () => {
  it('describes the live catalog and the transcendental node', () => {
    expect(readme).toContain('55 entries, ids 11–65');
    expect(readme).not.toContain('44 entries');
    expect(readme).toContain("fn: 'sin'");
    expect(readme).toContain('import type { ExprNode }');
    expect(fences).toHaveLength(3);
  });

  it('the validateEquation fence runs', () => {
    const result = runFence(fences[0]!);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('true');
  });

  it('the energy-plus-length fence is a mismatch', () => {
    const source =
      fences[1]! +
      "\nif (r.ok !== false) throw new Error('expected a mismatch');\n" +
      "if (!r.violations[0].note.includes('Cannot add')) throw new Error(r.violations[0].note);\n";
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
  });

  it('sin of a dimensionless argument is ok', () => {
    const source = fences[2]! + "\nif (r.ok !== true) throw new Error('sin should be homogeneous');\n";
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
  });
});
