/**
 * `upt retrieve --expr FILE` gives the atlas search an expression. A text claim has none, so
 * only a typed expression reaches `rankByStructure`. A help example must print a non-empty list.
 */
import '../helpers/dist.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureMerged, text } from '../helpers/cli.js';
import { runCli } from '../../dist/cli/main.js';
import { command as retrieveCommand } from '../../dist/cli/commands/retrieve.js';
import { parseArgs } from '../../dist/cli/args.js';
import * as api from '../../dist/cli-api.js';
import { CliError } from '../../dist/cli/errors.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { canonicalResidual } from '../../src/canonical/residual.js';

const RECORD = 'CE-mass-energy';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHIM = join(ROOT, 'bin', 'upt.mjs');
const EXAMPLE_FILE = join('data', 'examples', 'retrieve-mass-energy.json');
const LABEL = /ranked by structure \(atlas search\), top (\d+) of (\d+):/;
let dir = '';
let exprFile = '';
let badFile = '';

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'upt-retrieve-expr-'));
  const equation = CANONICAL_EQUATIONS.find((e) => e.id === RECORD);
  const residual = equation === undefined ? undefined : canonicalResidual(equation);
  if (residual === undefined) throw new Error(`${RECORD} has no residual`);
  exprFile = join(dir, 'mass-energy.json');
  badFile = join(dir, 'not-an-expr.json');
  writeFileSync(exprFile, JSON.stringify(residual));
  writeFileSync(badFile, JSON.stringify({ hello: 'world' }));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** The ranked ids of a text-mode run: the lines under the ranked (or the empty accepted) header. */
function acceptedLines(out: string): string[] {
  const lines = out.split('\n');
  const at = lines.findIndex((l) => LABEL.test(l) || l.includes('accepted (atlas search):'));
  return lines.slice(at + 1).filter((l) => l.startsWith('    '));
}

describe('upt retrieve --expr', () => {
  it('T1: ranks the record whose residual is the query first', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'rest', 'energy', `--expr=${exprFile}`], c.io)).toBe(0);
    expect(acceptedLines(text(c))[0]?.trim()).toBe(RECORD);
  });

  it('the text label says it is a ranking: top 10 of N, N the full ranked count', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', `--expr=${exprFile}`], c.io)).toBe(0);
    const j = captureMerged();
    expect(await runCli(['retrieve', `--expr=${exprFile}`, '--json'], j.io)).toBe(0);
    const n = JSON.parse(text(j)).result.accepted.length;
    expect(text(c)).toContain(`top 10 of ${n}:`);
    expect(text(c)).not.toContain('accepted (atlas search):');
  });

  it('the help example runs as written from a directory outside the package', () => {
    const line = retrieveCommand.example ?? '';
    expect(line).toContain('--expr=package:');
    const cwd = mkdtempSync(join(tmpdir(), 'upt-retrieve-cwd-'));
    try {
      const argv = line.slice('upt '.length).split(/\s+/);
      const stdout = execFileSync('node', [SHIM, ...argv], { cwd, encoding: 'utf8', stdio: 'pipe' });
      expect(stdout).toMatch(LABEL);
      expect(acceptedLines(stdout)[0]?.trim()).toBe(RECORD);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('every package: path in the help names a file that package.json files ships', () => {
    const files: string[] = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).files;
    const paths = [...`${retrieveCommand.help}\n${retrieveCommand.example}`.matchAll(/package:([^\s`]+)/g)].map((m) => m[1]!);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(files.some((f) => p === f || p.startsWith(`${f}/`)), p).toBe(true);
      expect(() => readFileSync(join(ROOT, p))).not.toThrow();
    }
  });

  it('a loader TypeError is a CliError that names the file, with no stack', async () => {
    const parseExprJson = () => {
      throw new TypeError('zqx is not a function');
    };
    const ctx = {
      args: parseArgs('retrieve', [`--expr=${exprFile}`], retrieveCommand.flags, retrieveCommand.positionals),
      api: { ...api, parseExprJson },
      out: () => {},
      err: () => {},
      write: () => {},
    };
    const error = await Promise.resolve()
      .then(() => retrieveCommand.run(ctx as never))
      .then(() => undefined, (e: unknown) => e);
    expect(error).toBeInstanceOf(CliError);
    const message = (error as Error).message;
    expect(message).toContain(exprFile);
    expect(message).toContain('internal: zqx is not a function');
    expect(message).not.toMatch(/\n\s+at /);
  });

  it('T1b: --json keeps the full ranked list and the first id', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'rest', 'energy', `--expr=${exprFile}`, '--json'], c.io)).toBe(0);
    const env = JSON.parse(text(c));
    expect(env.result.accepted[0]).toBe(RECORD);
    expect(env.result.accepted.length).toBeGreaterThan(10);
  });

  it('T2: every help example without --embed prints a non-empty accepted list', async () => {
    const shown = [...retrieveCommand.help.split('\n'), `e.g. ${retrieveCommand.example}`]
      .map((l) => l.replace(/^\s*(e\.g\.)?\s*/, ''))
      .filter((l) => l.startsWith('upt retrieve ') && !l.includes('--embed') && !l.includes('--fetch-model') && !l.includes('<claim>'));
    expect(shown.length).toBeGreaterThan(0);
    let withExpr = 0;
    for (const line of shown) {
      const argv = line
        .slice('upt '.length)
        .split(/\s+/)
        .map((a) => (a.startsWith('--expr=') && !a.startsWith('--expr=package:') ? `--expr=${exprFile}` : a));
      if (line.includes('--expr=')) withExpr += 1;
      const c = captureMerged();
      expect(await runCli(argv, c.io)).toBe(0);
      const accepted = acceptedLines(text(c));
      // A line without --expr is the documented text-only case and prints "none".
      if (line.includes('--expr=')) expect(accepted[0]?.trim()).toBe(RECORD);
    }
    expect(withExpr).toBeGreaterThan(0);
    expect(retrieveCommand.example).toContain('--expr=');
  });

  it('the example file is the residual of the record the help names', () => {
    expect(JSON.parse(readFileSync(join(ROOT, EXAMPLE_FILE), 'utf8'))).toEqual(
      JSON.parse(readFileSync(exprFile, 'utf8')),
    );
  });

  it('T3: a text claim without --expr still accepts nothing', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'period', 'of', 'a', 'pendulum'], c.io)).toBe(0);
    expect(text(c)).toContain('none — the claim has no expression to rank by structure');
  });

  it('T4: a file that is not an ExprNode is exit 1, names the file, has no stack', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'x', `--expr=${badFile}`], c.io)).toBe(1);
    const t = text(c);
    expect(t).toContain(badFile);
    expect(t).not.toMatch(/\n\s+at /);
  });

  it('T4b: a missing file is exit 1 and names the file', async () => {
    const missing = join(dir, 'zqx-missing.json');
    const c = captureMerged();
    expect(await runCli(['retrieve', 'x', `--expr=${missing}`], c.io)).toBe(1);
    expect(text(c)).toContain(missing);
  });

  it('a package: path that leaves the package root is a usage error (exit 2) that names the value', async () => {
    for (const value of ['package:../zqx.json', 'package:', `package:${resolve(tmpdir(), 'zqx.json')}`]) {
      const c = captureMerged();
      expect(await runCli(['retrieve', `--expr=${value}`], c.io), value).toBe(2);
      expect(text(c), value).toContain(value);
      expect(text(c), value).toContain('inside the package root');
    }
  });

  it('--expr alone, with no claim text, is accepted', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', `--expr=${exprFile}`], c.io)).toBe(0);
    expect(acceptedLines(text(c))[0]?.trim()).toBe(RECORD);
  });
});
