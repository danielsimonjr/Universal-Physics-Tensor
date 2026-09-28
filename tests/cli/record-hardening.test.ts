/**
 * `upt --record` / `--replay` hardening (audit I17 limits): the arguments and the whole entry are
 * hashed, each constant table is fingerprinted under its own name, and each entry carries a static
 * attribution of the constants its command's code can reach. Design:
 * `docs/planning/Experiment-Record-Replay-Design-Note.md`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../../dist/cli/main.js';
import { listCommandNames } from '../../dist/cli/command.js';

const repo = fileURLToPath(new URL('../../', import.meta.url));

async function run(argv: string[]) {
  const o = { stdout: '', stderr: '' };
  const code = await runCli(argv, {
    out: (l?: string) => void (o.stdout += (l ?? '') + '\n'),
    err: (l?: string) => void (o.stderr += (l ?? '') + '\n'),
    write: (s: string) => void (o.stdout += s),
  });
  return { code, ...o };
}

const readEntries = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l));

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** An independent canonical form: keys sorted at every depth. */
function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted);
  if (typeof v === 'object' && v !== null) {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted((v as Record<string, unknown>)[k])]));
  }
  return v;
}

const THERMAL = ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000'];
const FORMULA = ['eval', '2*x+1', 'x=3'];

let dir: string;
let session: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'upt-record-hardening-'));
  session = join(dir, 'session.jsonl');
  for (const argv of [THERMAL, FORMULA, ['version']]) await run([`--record=${session}`, ...argv]);
});

function tampered(name: string, edit: (entries: any[]) => void): string {
  const entries = readEntries(session);
  edit(entries);
  const file = join(dir, name);
  writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return file;
}

async function replayJson(file: string) {
  const r = await run([`--replay=${file}`, '--json']);
  return { code: r.code, env: JSON.parse(r.stdout), text: (await run([`--replay=${file}`])).stdout };
}

describe('argument and entry hashes', () => {
  it('each entry hashes its argv and itself (checked by an independent canonical SHA-256)', () => {
    for (const e of readEntries(session)) {
      expect(e.schema).toBe('upt-record/2');
      expect(e.argvSha256).toBe(sha(JSON.stringify(e.argv)));
      const { entrySha256, ...rest } = e;
      expect(entrySha256).toBe(sha(JSON.stringify(sorted(rest))));
    }
  });

  it('an untouched record raises no integrity finding', async () => {
    const { code, env } = await replayJson(session);
    expect(code).toBe(0);
    expect(env.result.entries.map((e: { integrity: string[] }) => e.integrity)).toEqual([[], [], []]);
  });

  it('an edited ARGUMENT is an integrity finding, not only a difference', async () => {
    const file = tampered('argv.jsonl', (e) => {
      e[0].argv[2] = 'T_K=301';
    });
    const { code, env, text } = await replayJson(file);
    expect(code).toBe(3);
    const [first] = env.result.entries;
    expect(first.outcome).toBe('differs');
    expect(first.integrity).toEqual([
      'recorded argv does not match its recorded argvSha256',
      'recorded entry does not match its recorded entrySha256',
    ]);
    expect(text).toContain('    record integrity: recorded argv does not match its recorded argvSha256');
  });

  it('an edit to a field no other hash covers is caught by the entry hash alone', async () => {
    const file = tampered('parsed.jsonl', (e) => {
      e[1].parsed.positionals = ['2*x+2', 'x=3'];
    });
    const { code, env } = await replayJson(file);
    expect(code).toBe(1);
    expect(env.result.entries[1].outcome).toBe('reproduced');
    expect(env.result.entries[1].integrity).toEqual(['recorded entry does not match its recorded entrySha256']);
  });

  it('a removed hash is a finding, not a pass', async () => {
    const file = tampered('nohash.jsonl', (e) => {
      delete e[1].argvSha256;
      delete e[1].entrySha256;
    });
    const { env } = await replayJson(file);
    expect(env.result.entries[1].integrity).toEqual(['entry has no argvSha256', 'entry has no entrySha256']);
  });

  it('a superseded upt-record/1 line is not replayable, with the reason', async () => {
    const file = join(dir, 'v1.jsonl');
    writeFileSync(file, JSON.stringify({ ...readEntries(session)[1], schema: 'upt-record/1' }) + '\n');
    const { env } = await replayJson(file);
    expect(env.result.entries[0].outcome).toBe('not-replayable');
    expect(env.result.entries[0].reason).toMatch(/upt-record\/1 entry, written before its arguments, the entry and each constant table were hashed/);
  });
});

describe('named constant tables', () => {
  it('fingerprints each table separately (checked by an independent sorted-key SHA-256)', () => {
    const tables = readEntries(session)[0].environment.constantTables;
    for (const name of ['core/constants', 'dimensional/units', 'composition/symbolic-constants', 'composition/canonical-graph']) {
      expect(Object.keys(tables)).toContain(name);
    }
    for (const t of Object.values(tables) as { values: Record<string, unknown>; sha256: string }[]) {
      expect(t.sha256).toBe(sha(JSON.stringify(sorted(t.values))));
    }
    expect(tables['dimensional/units'].values['eV.scale']).toBe(1.602176634e-19);
    expect(tables['dimensional/units'].values['Msun.scale']).toBe(1.989e30);
    expect(tables['composition/symbolic-constants'].values['k_B.value']).toBe(1.380649e-23);
    expect(tables['composition/canonical-graph'].values['e.value']).toBe(1.602176634e-19);
  });

  it('every exported numeric constant of src/bridges and src/cases is in its module’s table (found from the source text)', async () => {
    const tables = readEntries(session)[0].environment.constantTables;
    const walk = (d: string): string[] =>
      readdirSync(join(repo, 'src', d), { withFileTypes: true }).flatMap((f) =>
        f.isDirectory() ? walk(join(d, f.name)) : f.name.endsWith('.ts') && f.name !== 'index.ts' ? [join(d, f.name)] : [],
      );
    let checked = 0;
    for (const rel of [...walk('bridges'), ...walk('cases')]) {
      const names = [...readFileSync(join(repo, 'src', rel), 'utf8').matchAll(/^export const ([A-Z][A-Z0-9_]*)\s*=/gm)].map((m) => m[1]);
      if (names.length === 0) continue;
      const mod = await import(join(repo, 'dist', rel.replace(/\.ts$/, '.js')));
      for (const n of names) {
        if (typeof mod[n] !== 'number') continue;
        expect(tables[rel.replace(/\\/g, '/').replace(/\.ts$/, '')]?.values[n], `${rel} ${n}`).toBe(mod[n]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(10);
    expect(tables['bridges/be58-johnson-nyquist-confrontation'].values.K_B_CODATA_2014).toBe(1.38064852e-23);
  });

  it('replay names the table and the key that changed', async () => {
    const file = tampered('units.jsonl', (e) => {
      e[0].environment.constantTables['dimensional/units'].values['eV.scale'] = 1.6e-19;
    });
    const { env } = await replayJson(file);
    expect(env.result.entries[0].environmentChanges).toEqual([
      { fact: 'constant dimensional/units eV.scale', recorded: 1.6e-19, current: 1.602176634e-19, reach: 'reachable' },
    ]);
    expect(env.result.entries[0].integrity).toContain('recorded table dimensional/units does not match its recorded sha256');
  });
});

describe('static attribution', () => {
  it('records what each command’s code can reach, labelled as a static upper bound', () => {
    const [thermal, formula, version] = readEntries(session);
    expect(thermal.attribution.method).toBe('static-import-reach');
    expect(thermal.attribution.command).toBe('evaluate');
    expect(thermal.attribution.tables['core/constants']).toContain('K_B_SI');
    expect(thermal.attribution.tables['dimensional/units']).toEqual(['*']);
    expect(formula.attribution.command).toBe('eval');
    expect(formula.attribution.tables['core/constants']).not.toContain('K_B_SI');
    expect(formula.attribution.tables['dimensional/units']).toBeUndefined();
    expect(version.attribution).toBeNull();
  });

  it('every registered command has a module to attribute from', async () => {
    const file = join(dir, 'all.jsonl');
    for (const name of listCommandNames()) await run([`--record=${file}`, name, '--no-such-flag']);
    const entries = readEntries(file);
    expect(entries.length).toBe(listCommandNames().length);
    for (const e of entries) expect(e.attribution?.command, e.argv[0]).toBe(e.argv[0]);
  });

  it('a changed constant is marked reachable or not reachable per entry', async () => {
    const file = tampered('kb.jsonl', (e) => {
      for (const x of e) x.environment.constantTables['core/constants'].values.K_B_SI = 1.38e-23;
    });
    const { env, text } = await replayJson(file);
    const reach = env.result.entries.map((e: { environmentChanges: { fact: string; reach?: string }[] }) =>
      e.environmentChanges.filter((c) => c.fact === 'constant core/constants K_B_SI').map((c) => c.reach),
    );
    expect(reach).toEqual([['reachable'], ['not-reachable'], ['unattributed']]);
    expect(text).toContain(
      "      constant core/constants K_B_SI: 1.38e-23 -> 1.380649e-23 — not reachable from 'eval' by static import analysis",
    );
  });

  it('SECOND METHOD — a real change to K_B_SI in a copy of dist: the unreachable entry reproduces, the reachable one differs', () => {
    const copy = mkdtempSync(join(tmpdir(), 'upt-perturbed-'));
    cpSync(join(repo, 'dist'), join(copy, 'dist'), { recursive: true, filter: (s) => !/\.(d\.ts|map)$/.test(s) });
    mkdirSync(join(copy, 'bin'));
    cpSync(join(repo, 'bin', 'upt.mjs'), join(copy, 'bin', 'upt.mjs'));
    cpSync(join(repo, 'package.json'), join(copy, 'package.json'));
    symlinkSync(join(repo, 'node_modules'), join(copy, 'node_modules'));
    const constants = join(copy, 'dist', 'core', 'constants.js');
    const before = readFileSync(constants, 'utf8');
    const after = before.replace('export const K_B_SI = 1.380649e-23;', 'export const K_B_SI = 1.38e-23;');
    expect(after).not.toBe(before);
    writeFileSync(constants, after);

    const r = spawnSync(process.execPath, [join(copy, 'bin', 'upt.mjs'), `--replay=${session}`, '--json'], { encoding: 'utf8' });
    const env = JSON.parse(r.stdout);
    expect(r.status).toBe(3);
    const [thermal, formula] = env.result.entries;
    const kb = (e: { environmentChanges: { fact: string }[] }) => e.environmentChanges.find((c) => c.fact === 'constant core/constants K_B_SI');
    expect(thermal.outcome).toBe('differs');
    expect(kb(thermal)).toMatchObject({ recorded: 1.380649e-23, current: 1.38e-23, reach: 'reachable' });
    expect(formula.outcome).toBe('reproduced');
    expect(kb(formula)).toMatchObject({ reach: 'not-reachable' });
    const tableSha = (e: { environmentChanges: { fact: string; reach?: string }[] }) =>
      e.environmentChanges.find((c) => c.fact === 'table core/constants sha256')?.reach;
    expect(tableSha(thermal)).toBe('reachable');
    expect(tableSha(formula)).toBe('not-reachable');
    expect(thermal.integrity).toEqual([]);
    expect(formula.integrity).toEqual([]);
    // A copy of dist plus a real replay process: about 10 s alone, 73 s measured under a parallel
    // run of four test directories, past the 60 s default. Same budget as the golden spawns.
  }, 180_000);
});
