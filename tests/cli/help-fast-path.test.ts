/**
 * `upt help` does not pay for the MathTS function library.
 *
 * S3 of the optimization plan (`docs/superpowers/plans/2026-11-21-upt-optimization-docs.md`):
 * the command barrel (`src/cli/commands/index.ts`) is loaded for every help path, but five of
 * its transitive imports pulled `@danielsimonjr/mathts-functions` (~380 ms of eager typed-function
 * dispatch build) into `upt help`. This file pins the fix at two levels: the static import graph
 * of `dist/cli/commands/index.js` cannot reach `mathts-functions` at all, and a spawned
 * `upt help` never resolves that package (while the demo, which executes commands, still does).
 * Every control here proves its checker fires, not just that the assertion holds.
 */

import '../helpers/dist.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bin = join(root, 'bin/upt.mjs');
const TARGET = '@danielsimonjr/mathts-functions';

/** Specifiers of one module's static value imports (`import … from '…'`,
 * `export … from '…'`, bare `import '…'`), resolved to files under `root` or
 * kept as bare package specifiers. Dynamic `await import('…')` calls are NOT
 * followed: the lazy load inside a command's `run()` is the mechanism this
 * sprint installs, and a call inside `run()` executes only when a command
 * runs (the runtime check below covers the help paths end to end). Type-only
 * `import type` / `export type` statements are skipped: they are erased at
 * emit and load nothing at runtime. */
function importSpecifiers(file: string): string[] {
  let src: string;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out: string[] = [];
  const re = /(?:^|\n)(?:import|export)\s+(?!type\b)[\s\S]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const spec = m[1] ?? m[2];
    if (spec === undefined) continue;
    if (!spec.startsWith('.')) {
      out.push(spec);
      continue;
    }
    let target = resolve(dirname(file), spec);
    if (!target.endsWith('.js') && !target.endsWith('.json')) target += '.js';
    if (target.endsWith('.json')) continue;
    out.push(target);
  }
  return out;
}

/** Chains (as readable strings) by which `start` statically reaches a bare
 * package specifier, breadth-first so each reported chain is shortest for its
 * first hop. */
function chainsTo(start: string, target: string): string[] {
  const found: string[] = [];
  const queue: string[][] = [[start]];
  while (queue.length > 0 && found.length < 12) {
    const path = queue.shift()!;
    const file = path[path.length - 1]!;
    for (const spec of importSpecifiers(file)) {
      if (spec === target) {
        found.push(
          path
            .concat(spec)
            .map((x) => (x.startsWith('/') ? x.replace(`${root}/`, '') : x))
            .join(' -> '),
        );
        continue;
      }
      // Resolved file targets are absolute paths; bare package specifiers are
      // not followed (only the target package is matched).
      if (spec.startsWith('/') && !path.includes(spec)) queue.push([...path, spec]);
    }
  }
  return found;
}

describe('upt help fast path — static import graph', () => {
  it('CONTROL: the walker DOES report the chain from dist/cli-api.js to mathts-functions', () => {
    const chains = chainsTo(join(root, 'dist/cli-api.js'), TARGET);
    expect(chains.length, 'CONTROL must see mathts-functions from cli-api.js').toBeGreaterThan(0);
  });

  it('dist/cli/commands/index.js cannot reach mathts-functions through any static import', () => {
    const chains = chainsTo(join(root, 'dist/cli/commands/index.js'), TARGET);
    expect(
      chains,
      `the command barrel still reaches mathts-functions:\n${chains.join('\n')}`,
    ).toEqual([]);
  });
});

describe('upt help fast path — runtime module graph', () => {
  function spawnWithResolveLog(dir: string, args: string[]): { status: number | null; stderr: string } {
    const log = join(dir, 'urls.txt');
    writeFileSync(
      join(dir, 'hook.mjs'),
      `import { appendFileSync } from 'node:fs';
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  appendFileSync(${JSON.stringify(log)}, result.url + '\\n');
  return result;
}
`,
    );
    writeFileSync(
      join(dir, 'register.mjs'),
      `import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register(${JSON.stringify(pathToFileURL(join(dir, 'hook.mjs')).href)});
`,
    );
    const result = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(join(dir, 'register.mjs')).href, ...args],
      { encoding: 'utf8', cwd: root },
    );
    return { status: result.status, stderr: result.stderr };
  }

  function readUrls(dir: string): string[] {
    const log = join(dir, 'urls.txt');
    if (!existsSync(log)) return [];
    return readFileSync(log, 'utf8').split('\n').filter((l) => l !== '');
  }

  it('CONTROL: the demo run (which executes commands) DOES resolve mathts-functions', () => {
    const dir = tempDir('upt-help-demo-control-');
    const { status, stderr } = spawnWithResolveLog(dir, [bin, 'explain', 'hawking-temperature', 'mass=1.989e30']);
    expect(status, stderr).toBe(0);
    expect(readUrls(dir).some((u) => u.includes('@danielsimonjr/mathts-functions'))).toBe(true);
  });

  it('spawned `upt help` never resolves mathts-functions', () => {
    const dir = tempDir('upt-help-resolve-');
    const { status, stderr } = spawnWithResolveLog(dir, [bin, 'help']);
    expect(status, stderr).toBe(0);
    const urls = readUrls(dir);
    expect(urls.some((u) => u.includes('@danielsimonjr/mathts-functions'))).toBe(false);
  });
});
