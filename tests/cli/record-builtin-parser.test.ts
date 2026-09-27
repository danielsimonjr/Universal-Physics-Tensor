/**
 * `upt --record` / `--replay` on the BUILTIN formula parser (audit I17). The optional MathTS peer is
 * installed as a devDependency, so the builtin path is reached here by mocking the peer's module
 * to a namespace without `parse`: `getFormulaParserKind()` then falls back exactly as it does when
 * the peer is absent. A child process without the mock is the paired control (it selects
 * `mathts`), and replays the same record across the parser change.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('@danielsimonjr/mathts-functions', () => ({}));

const { runCli } = await import('../../dist/cli/main.js');
const api = await import('../../dist/cli-api.js');

const bin = fileURLToPath(new URL('../../bin/upt.mjs', import.meta.url));

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  });
  return { code, ...o };
}

const child = (argv: string[]) => {
  const r = spawnSync(process.execPath, [bin, ...argv], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
};

const readEntries = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l));

const PLAIN = ['eval', '2*x+1', 'x=3'];
const FAILED_LN = ['eval', 'ln(x)', 'x=-1'];

let dir: string;
let builtinRecord: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'upt-record-builtin-'));
  builtinRecord = join(dir, 'builtin.jsonl');
  for (const argv of [PLAIN, FAILED_LN]) await run([`--record=${builtinRecord}`, ...argv]);
});

describe('record and replay under the builtin formula parser', () => {
  it('PRECONDITION: the mock selects builtin here; without it a child process selects mathts', async () => {
    expect(await api.getFormulaParserKind()).toBe('builtin');
    const control = join(dir, 'control.jsonl');
    expect(child([`--record=${control}`, ...PLAIN]).code).toBe(0);
    expect(readEntries(control)[0].environment.formulaParser).toBe('mathts');
  });

  it('records the builtin parser and the unavailable simplifier', () => {
    for (const e of readEntries(builtinRecord)) {
      expect(e.environment.formulaParser).toBe('builtin');
      expect(e.environment.simplifier).toBe(false);
    }
    expect(readEntries(builtinRecord)[1].result.stderr).toMatch(/evaluated to a non-finite value \(NaN\)/);
  });

  it('replays under the same parser: every entry reproduced, nothing changed', async () => {
    const r = await run([`--replay=${builtinRecord}`, '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.stdout);
    expect(env.result.summary).toMatchObject({ reproduced: 2, differs: 0, environmentChanged: 0, integrityFindings: 0 });
  });

  it('replayed under mathts: the parser change is named on each entry, and the failed ln(x) DIFFERS on stderr', () => {
    const r = child([`--replay=${builtinRecord}`, '--json']);
    expect(r.code).toBe(3);
    const [plain, ln] = JSON.parse(r.stdout).result.entries;
    for (const e of [plain, ln]) {
      expect(e.environmentChanges).toEqual(
        expect.arrayContaining([{ fact: 'formulaParser', recorded: 'builtin', current: 'mathts' }]),
      );
      expect(e.integrity).toEqual([]);
    }
    expect(plain.outcome).toBe('reproduced');
    expect(ln.outcome).toBe('differs');
    expect(ln.differences.map((d: { stream: string }) => d.stream)).toEqual(['stderr']);
    expect(ln.differences[0].recorded).toMatch(/non-finite value \(NaN\)/);
    expect(ln.differences[0].replayed).toMatch(/did not evaluate to a finite number/);
  });

  it('the reverse: recorded under mathts, replayed here under builtin', async () => {
    const mathtsRecord = join(dir, 'mathts.jsonl');
    expect(child([`--record=${mathtsRecord}`, ...FAILED_LN]).code).toBe(2);
    const r = await run([`--replay=${mathtsRecord}`, '--json']);
    expect(r.code).toBe(3);
    const [ln] = JSON.parse(r.stdout).result.entries;
    expect(ln.outcome).toBe('differs');
    expect(ln.environmentChanges).toEqual(expect.arrayContaining([{ fact: 'formulaParser', recorded: 'mathts', current: 'builtin' }]));
  });
});
