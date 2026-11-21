/**
 * `upt version` does not pay for the heavy CLI module graph.
 *
 * The S2 baseline (plan `docs/superpowers/plans/2026-11-21-upt-optimization-docs.md`)
 * measured `upt version` at 646 ms wall clock against a 20 ms bare-Node baseline,
 * because `src/cli/main.ts` statically imported `cli-api.js` (~572 ms via
 * `mathts-functions`), `commands/index.js`, and `record.js` (~507 ms). This file
 * pins the fix at both levels: the source of `main.ts` carries no top-level
 * static `import` (other than `import type`) from those three modules, and the
 * spawned CLI still prints the exact version line and maps `upt version extra`
 * to exit 2 on the fast path.
 */

import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mainSource = readFileSync(join(root, 'src/cli/main.ts'), 'utf8');

/** The specifiers whose static import kept `upt version` at ~646 ms. */
const BANNED_SPECIFIERS = ['../cli-api.js', './commands/index.js', './record.js'] as const;

/** `src/cli/main.ts` with every `import type ...` statement removed, so a
 * type-only import of a banned specifier is allowed while a value import is not. */
const valueImportsOnly = mainSource.replaceAll(/import type[\s\S]*?from\s*'[^']*';/g, '');

describe('upt version fast path — source import graph', () => {
  it('CONTROLS: a value import of a banned specifier IS reported', () => {
    const withViolation = valueImportsOnly.replace(
      "import { UsageError, CliError } from './errors.js';",
      "import { UsageError, CliError } from './errors.js';\nimport './commands/index.js';",
    );
    expect(hasStaticImport(withViolation, './commands/index.js')).toBe(true);
  });

  it.each(BANNED_SPECIFIERS)(
    'src/cli/main.ts has no top-level static import from %s',
    (specifier) => {
      expect(hasStaticImport(valueImportsOnly, specifier)).toBe(false);
    },
  );
});

/** True when `text` contains a statement starting with `import` (not
 * `import type`, already stripped, and not a dynamic `import()` inside an
 * expression, whose statement starts with another keyword) that names
 * `specifier` before the statement's terminating semicolon. */
function hasStaticImport(text: string, specifier: string): boolean {
  const pattern = new RegExp(
    `(?:^|[\\n;])\\s*import\\b[^;'"]*['"]${specifier.replaceAll('.', '\\.')}['"]`,
  );
  return pattern.test(text);
}

describe('upt version fast path — behavior', () => {
  it('spawned `node bin/upt.mjs version` exits 0 and prints package.json version plus a newline', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    const result = spawnSync(process.execPath, [join(root, 'bin/upt.mjs'), 'version'], {
      encoding: 'utf8',
      cwd: root,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${pkg.version}\n`);
    expect(result.stderr).toBe('');
  });

  it.each([
    ['version'],
    ['--version'],
    ['-v'],
  ])('in-process `%s extra` exits 2 with the documented refusal, without needing the registry', async (verb) => {
    const out: string[] = [];
    const err: string[] = [];
    const status = await runCli([verb, 'extra'], {
      out: (line?: string) => out.push((line ?? '') + '\n'),
      err: (line?: string) => err.push((line ?? '') + '\n'),
      write: () => {},
    });
    expect(status).toBe(2);
    expect(out).toEqual([]);
    expect(err).toEqual(['upt version takes no arguments\n']);
  });

  it('in-process `version` prints the package.json version and returns 0', async () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    const out: string[] = [];
    const status = await runCli(['version'], {
      out: (line?: string) => out.push((line ?? '') + '\n'),
      err: () => {},
      write: () => {},
    });
    expect(status).toBe(0);
    expect(out).toEqual([`${pkg.version}\n`]);
  });
});
