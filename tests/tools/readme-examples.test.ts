/**
 * The TypeScript fences in the root `README.md` run as a user would run them:
 * each imports from `universal-physics-tensor` (the built package, linked into
 * a scratch `node_modules`), so a fence that names a non-root export fails to
 * import. The composing and unit fences also print the values their comments
 * state, and the test reads those back.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
const fences = [...readme.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) => match[1]!);
const fence = (needle: string): string => {
  const found = fences.filter((source) => source.includes(needle));
  expect(found, needle).toHaveLength(1);
  return found[0]!;
};

function runFence(source: string): { status: number; stdout: string; stderr: string } {
  const dir = mkdtempSync(join(tmpdir(), 'upt-readme-'));
  mkdirSync(join(dir, 'node_modules'));
  symlinkSync(root, join(dir, 'node_modules', 'universal-physics-tensor'));
  writeFileSync(join(dir, 'snippet.ts'), source);
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'snippet.ts'], { cwd: dir, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('README.md TypeScript fences', () => {
  it('every fence imports only from the package root', () => {
    expect(fences.length).toBeGreaterThanOrEqual(3);
    for (const source of fences) {
      for (const match of source.matchAll(/from '([^']+)'/g)) expect(match[1]).toBe('universal-physics-tensor');
    }
  });

  it('every fence runs', () => {
    for (const source of fences) {
      const result = runFence(source);
      expect(result.status, result.stderr).toBe(0);
    }
  });

  it('the composing fence gives the erasure cost and confidence its comments state', () => {
    const source = fence('composeEdges') + '\nconsole.log(JSON.stringify([erasureCost.evaluate({ mass: M_SUN_KG }), erasureCost.confidence]));\n';
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
    const [value, confidence] = JSON.parse(result.stdout.trim()) as [number, string];
    expect(value).toBeCloseTo(5.9e-31, 32);
    expect(confidence).toBe('highly-speculative');
  });

  it('the unit fence prints the conversion its comment states', () => {
    const source = fence('convertValue') + "\nconsole.log(JSON.stringify(convertValue('25degC', 'K')));\n";
    const result = runFence(source);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({ value: 298.15, given: 'degC', affine: 'celsius' });
    expect(source).toContain("{ value: 298.15, given: 'degC', affine: 'celsius' }");
  });
});
