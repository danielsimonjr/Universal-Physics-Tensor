/**
 * `upt version` does not pay for the heavy CLI module graph.
 *
 * The S2 baseline (plan `docs/superpowers/plans/2026-11-21-upt-optimization-docs.md`)
 * measured `upt version` at 646 ms wall clock against a 20 ms bare-Node baseline,
 * because `src/cli/main.ts` statically imported `cli-api.js` (~572 ms via
 * `mathts-functions`), `commands/index.js`, and `record.js` (~507 ms). This file
 * pins the fix at three levels: the source of `main.ts` carries no top-level
 * static `import` or `export … from` (other than type-only) from those three
 * modules; a spawned `upt version` never resolves those modules (or
 * `mathts-functions`); and the `version` / `version extra` contract stays on
 * the fast path. Overlapping `runCli` calls share one barrel load, and a
 * rejected barrel import is retried.
 */

import '../helpers/dist.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { tempDir } from '../helpers/tmp.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mainSource = readFileSync(join(root, 'src/cli/main.ts'), 'utf8');
const mainJs = join(root, 'dist/cli/main.js');
const bin = join(root, 'bin/upt.mjs');

/** The specifiers whose static import kept `upt version` at ~646 ms. */
const BANNED_SPECIFIERS = ['../cli-api.js', './commands/index.js', './record.js'] as const;

/** `src/cli/main.ts` with every `import type` / `export type` statement
 * removed, so a type-only import or re-export of a banned specifier is
 * allowed while a value import or `export … from` is not. */
const valueStatementsOnly = mainSource.replaceAll(
  /(?:import|export) type[\s\S]*?from\s*'[^']*';/g,
  '',
);

describe('upt version fast path — source import graph', () => {
  it('CONTROLS: a value import of a banned specifier IS reported', () => {
    const withViolation = valueStatementsOnly.replace(
      "import { UsageError, CliError } from './errors.js';",
      "import { UsageError, CliError } from './errors.js';\nimport './commands/index.js';",
    );
    expect(hasStaticLoad(withViolation, './commands/index.js')).toBe(true);
  });

  it("CONTROLS: `export * from '../cli-api.js'` IS reported", () => {
    const withViolation = `${valueStatementsOnly}\nexport * from '../cli-api.js';\n`;
    expect(hasStaticLoad(withViolation, '../cli-api.js')).toBe(true);
  });

  it.each(BANNED_SPECIFIERS)(
    'src/cli/main.ts has no top-level static import or export-from of %s',
    (specifier) => {
      expect(hasStaticLoad(valueStatementsOnly, specifier)).toBe(false);
    },
  );
});

/** True when `text` contains a statement starting with `import` or `export`
 * (not `import type` / `export type`, already stripped, and not a dynamic
 * `import()` inside an expression, whose statement starts with another
 * keyword) that names `specifier` before the statement's terminating
 * semicolon. */
function hasStaticLoad(text: string, specifier: string): boolean {
  const pattern = new RegExp(
    `(?:^|[\\n;])\\s*(?:import|export)\\b[^;'"]*['"]${specifier.replaceAll('.', '\\.')}['"]`,
  );
  return pattern.test(text);
}

describe('upt version fast path — behavior', () => {
  it('spawned `node bin/upt.mjs version` exits 0 and prints package.json version plus a newline', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    const result = spawnSync(process.execPath, [bin, 'version'], {
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

describe('upt version fast path — ensureCommands load contract', () => {
  it('two overlapping runCli calls behind a delayed barrel both exit 0', () => {
    const dir = tempDir('upt-commands-delay-');
    writeFileSync(
      join(dir, 'hook.mjs'),
      `export async function load(url, context, nextLoad) {
  if (url.includes('/cli/commands/index.js')) {
    await new Promise((r) => setTimeout(r, 300));
  }
  return nextLoad(url, context);
}
`,
    );
    writeRegister(dir);
    writeDriver(
      dir,
      `const a = sink();
const b = sink();
const [statusA, statusB] = await Promise.all([
  runCli(['help', 'explain'], a.io),
  runCli(['audit', '--help'], b.io),
]);
process.stdout.write(JSON.stringify({
  statusA, statusB, errA: a.err, errB: b.err, outA: a.out, outB: b.out,
}) + '\\n');
`,
    );
    const result = spawnHooked(dir, [join(dir, 'driver.mjs')]);
    expect(result.status, result.stderr).toBe(0);
    const body = JSON.parse(result.stdout) as {
      statusA: number;
      statusB: number;
      errA: string[];
      errB: string[];
      outA: string[];
      outB: string[];
    };
    expect(body.statusA).toBe(0);
    expect(body.statusB).toBe(0);
    expect(body.errA).toEqual([]);
    expect(body.errB).toEqual([]);
    expect(body.outA.join('\n')).toMatch(/explain/);
    expect(body.outB.join('\n')).toMatch(/audit/);
  });

  it('a rejected barrel import is retried, and a later runCli populates the registry', () => {
    const dir = tempDir('upt-commands-fail-once-');
    writeFileSync(
      join(dir, 'hook.mjs'),
      `let failed = false;
export async function resolve(specifier, context, nextResolve) {
  if (!failed && specifier.includes('commands/index.js')) {
    failed = true;
    throw new Error('simulated load failure');
  }
  return nextResolve(specifier, context);
}
`,
    );
    writeRegister(dir);
    writeDriver(
      dir,
      `const first = { threw: false, message: '', status: null };
const a = sink();
try {
  first.status = await runCli(['help'], a.io);
} catch (e) {
  first.threw = true;
  first.message = e instanceof Error ? e.message : String(e);
}
const b = sink();
const second = await runCli(['help', 'explain'], b.io);
const c = sink();
const third = await runCli(['audit', '--help'], c.io);
process.stdout.write(JSON.stringify({
  first, second, third, errB: b.err, errC: c.err,
}) + '\\n');
`,
    );
    const result = spawnHooked(dir, [join(dir, 'driver.mjs')]);
    expect(result.status, result.stderr).toBe(0);
    const body = JSON.parse(result.stdout) as {
      first: { threw: boolean; message: string; status: number | null };
      second: number;
      third: number;
      errB: string[];
      errC: string[];
    };
    expect(body.first.threw).toBe(true);
    expect(body.first.message).toMatch(/simulated load failure/);
    expect(body.second).toBe(0);
    expect(body.third).toBe(0);
    expect(body.errB).toEqual([]);
    expect(body.errC).toEqual([]);
  });
});

describe('upt version fast path — runtime module graph', () => {
  it('CONTROL: a master-style static import of the heavy graph IS observed', () => {
    const dir = tempDir('upt-static-control-');
    writeResolveLogHook(dir);
    const code = [
      `import ${JSON.stringify(pathToFileURL(join(root, 'dist/cli-api.js')).href)};`,
      `import ${JSON.stringify(pathToFileURL(join(root, 'dist/cli/commands/index.js')).href)};`,
      `import ${JSON.stringify(pathToFileURL(join(root, 'dist/cli/record.js')).href)};`,
    ].join('\n');
    const spawned = spawnHooked(dir, ['--input-type=module', '-e', code]);
    expect(spawned.status, spawned.stderr).toBe(0);
    const loaded = heavyLoads(readUrls(dir));
    expect(loaded.functions, 'CONTROL must see mathts-functions').toBe(true);
    expect(loaded.cliApi, 'CONTROL must see cli-api.js').toBe(true);
    expect(loaded.commandsIndex, 'CONTROL must see commands/index.js').toBe(true);
    expect(loaded.record, 'CONTROL must see cli/record.js').toBe(true);
  });

  it('spawned `upt version` never loads mathts-functions, cli-api, commands/index or record', () => {
    const dir = tempDir('upt-version-resolve-');
    writeResolveLogHook(dir);
    const spawned = spawnHooked(dir, [bin, 'version']);
    expect(spawned.status, spawned.stderr).toBe(0);
    const loaded = heavyLoads(readUrls(dir));
    expect(loaded.functions).toBe(false);
    expect(loaded.cliApi).toBe(false);
    expect(loaded.commandsIndex).toBe(false);
    expect(loaded.record).toBe(false);
  });
});

function writeRegister(dir: string): void {
  writeFileSync(
    join(dir, 'register.mjs'),
    `import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register(${JSON.stringify(pathToFileURL(join(dir, 'hook.mjs')).href)});
`,
  );
}

function writeDriver(dir: string, body: string): void {
  writeFileSync(
    join(dir, 'driver.mjs'),
    `import { runCli } from ${JSON.stringify(pathToFileURL(mainJs).href)};
function sink() {
  const out = [];
  const err = [];
  return {
    io: {
      out: (l) => { out.push(l ?? ''); },
      err: (l) => { err.push(l ?? ''); },
      write: () => {},
    },
    out,
    err,
  };
}
${body}
`,
  );
}

function writeResolveLogHook(dir: string): void {
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
  writeRegister(dir);
}

function spawnHooked(
  dir: string,
  args: string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ['--import', pathToFileURL(join(dir, 'register.mjs')).href, ...args],
    { encoding: 'utf8', cwd: root },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function readUrls(dir: string): string[] {
  const log = join(dir, 'urls.txt');
  if (!existsSync(log)) return [];
  return readFileSync(log, 'utf8').split('\n').filter((l) => l !== '');
}

function heavyLoads(urls: string[]): {
  functions: boolean;
  cliApi: boolean;
  commandsIndex: boolean;
  record: boolean;
} {
  return {
    functions: urls.some((u) => u.includes('@danielsimonjr/mathts-functions')),
    cliApi: urls.some((u) => /(?:^|\/)cli-api\.js(?:\?|$)/.test(u)),
    commandsIndex: urls.some((u) => u.includes('/cli/commands/index.js')),
    record: urls.some((u) => /\/cli\/record\.js(?:\?|$)/.test(u)),
  };
}
