/**
 * `upt retrieve --expr FILE` gives the atlas search an expression. A text claim has none, so
 * only a typed expression reaches `rankByStructure`. A help example must print a non-empty list.
 */
import '../helpers/dist.js';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureMerged, text } from '../helpers/cli.js';
import { runCli } from '../../dist/cli/main.js';
import { command as retrieveCommand } from '../../dist/cli/commands/retrieve.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { canonicalResidual } from '../../src/canonical/residual.js';

const RECORD = 'CE-mass-energy';
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

/** The accepted ids of a text-mode run: the lines under "accepted (atlas search):". */
function acceptedLines(out: string): string[] {
  const lines = out.split('\n');
  const at = lines.findIndex((l) => l.includes('accepted (atlas search):'));
  return lines.slice(at + 1).filter((l) => l.startsWith('    '));
}

describe('upt retrieve --expr', () => {
  it('T1: ranks the record whose residual is the query first', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', 'rest', 'energy', `--expr=${exprFile}`], c.io)).toBe(0);
    expect(acceptedLines(text(c))[0]?.trim()).toBe(RECORD);
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
        .map((a) => (a.startsWith('--expr=') ? `--expr=${exprFile}` : a));
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
    expect(JSON.parse(readFileSync(join('examples', 'retrieve-mass-energy.json'), 'utf8'))).toEqual(
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

  it('--expr alone, with no claim text, is accepted', async () => {
    const c = captureMerged();
    expect(await runCli(['retrieve', `--expr=${exprFile}`], c.io)).toBe(0);
    expect(acceptedLines(text(c))[0]?.trim()).toBe(RECORD);
  });
});
