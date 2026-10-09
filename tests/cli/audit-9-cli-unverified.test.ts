/**
 * The 9.0.0 audit, §6 CLI, the "Unverified" list (docs/audit/2026-10-09-codebase-audit-9.0.0.md).
 *
 * The reviewer stopped before checking these, so each block here is one invocation (or one
 * source rule) that was run for the first time. The CLI is exercised in-process against the
 * built `dist/`, so a src change needs `bun run build` before this file reports on it.
 */
import '../helpers/dist.js';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { CliError } from '../../dist/cli/errors.js';
import { loadStoredResults } from '../../dist/cli/commands/_atlas-map.js';

const SRC = join(import.meta.dirname, '../../src');

async function run(args: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = '';
  let err = '';
  const code = await runCli(args, {
    out: (line?: string) => {
      out += (line ?? '') + '\n';
    },
    err: (line?: string) => {
      err += (line ?? '') + '\n';
    },
    write: (s: string) => {
      out += s;
    },
  });
  return { code, out, err };
}

const tmp = mkdtempSync(join(tmpdir(), 'upt-audit9-unverified-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
afterEach(() => vi.unstubAllGlobals());

function file(name: string, body: unknown): string {
  const path = join(tmp, name);
  writeFileSync(path, typeof body === 'string' ? body : JSON.stringify(body));
  return path;
}

// What a JS engine says when a field is missing, or a library function's own name, is not a
// statement about what the user gave.
const INTERNAL = /Cannot read properties|is not a function|undefined|TypeError|RangeError|makeResidualGap|parseExprJson|runWitnessRegistry|reading '/;

const GOOD_TARGET = { name: 'period', dim: 'time' };
const GOOD_GOVERNING = [{ name: 'length', dim: 'length' }];

describe('probe run: a file that is not a problem file says what is wrong with it', () => {
  it('package.json: names the missing "target", not an engine message', async () => {
    const r = await run(['probe', 'run', '--problem=package.json']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/package\.json is not a problem file/);
    expect(r.err).toMatch(/"target"/);
    expect(r.err).not.toMatch(INTERNAL);
  });

  it.each([
    ['no governing list', { target: GOOD_TARGET }, /"governing"/],
    ['a text target', { target: 'period', governing: [] }, /"target" must be/],
    ['a governing variable with no dim', { target: GOOD_TARGET, governing: [{ name: 'l' }] }, /governing\[0\].*"dim"/],
    ['a governing list that is text', { target: GOOD_TARGET, governing: 'x' }, /"governing" must be a list/],
    ['an array at the top', '[]', /must be a JSON object/],
    ['null at the top', 'null', /must be a JSON object/],
    ['a gap id without the prefix', { target: GOOD_TARGET, governing: GOOD_GOVERNING, gap: { id: 'x' } }, /gap\.id 'x' must start with "fg-"/],
    ['a gap id that is a number', { target: GOOD_TARGET, governing: GOOD_GOVERNING, gap: { id: 7 } }, /gap\.id must be text/],
    ['an unknown gap kind', { target: GOOD_TARGET, governing: GOOD_GOVERNING, gap: { kind: 'zzz' } }, /unknown gap kind 'zzz'/],
    ['a Product A gap kind', { target: GOOD_TARGET, governing: GOOD_GOVERNING, gap: { kind: 'relation-link' } }, /gap\.kind 'relation-link'.*upt discover/],
  ])('%s', async (label, body, expected) => {
    const path = file(`bad-${label.replace(/\W+/g, '-')}.json`, body);
    const r = await run(['probe', 'run', `--problem=${path}`]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/is not a problem file/);
    expect(r.err).toMatch(expected);
    expect(r.err).not.toMatch(INTERNAL);
  });

  it('control: a valid problem file still runs', async () => {
    const path = file('good.json', { target: GOOD_TARGET, governing: GOOD_GOVERNING });
    const r = await run(['probe', 'run', `--problem=${path}`]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/upt probe/);
  });

  it('design: a file that is not an expression does not name an internal function', async () => {
    const r = await run(['probe', 'design', '--h1=package.json', '--h2=package.json', '--bounds=package.json']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/package\.json/);
    expect(r.err).not.toMatch(INTERNAL);
  });
});

describe('probe: a bad value of a numeric flag is exit 1; exit 2 is only for a malformed invocation', () => {
  it.each([
    ['--budget-ms=0', /--budget-ms must be a positive number/],
    ['--budget-ms=abc', /--budget-ms must be a positive number/],
    ['--holdout-tol=-1', /--holdout-tol must be a positive number/],
  ])('probe run %s', async (flag, message) => {
    const path = file('flags.json', { target: GOOD_TARGET, governing: GOOD_GOVERNING });
    const r = await run(['probe', 'run', `--problem=${path}`, flag]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(message);
  });

  it('probe study --alpha=2 is a bad value', async () => {
    const r = await run(['probe', 'study', `--data=${join(import.meta.dirname, '../fixtures/probe-study/pendulum-small-angle.synthetic.json')}`, '--alpha=2']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--alpha must be a number in \(0, 1\)/);
  });

  it('control: a missing --problem is still a malformed invocation (exit 2)', async () => {
    expect((await run(['probe', 'run'])).code).toBe(2);
  });
});

describe('retrieve --embed with no Ollama: the fallback names its reason and exits 0', () => {
  const refuse = (): void => {
    vi.stubGlobal('fetch', async () => {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
    });
  };

  it('text mode: a sentence that reads, the reason key and the address it tried', async () => {
    refuse();
    const r = await run(['retrieve', 'mass', '--embed', '--ollama-url=http://127.0.0.1:1']);
    expect(r.code).toBe(0);
    // "Embeddings were requested. the process is not there." was two sentences, the second lower case.
    expect(r.out).not.toMatch(/\. the /);
    expect(r.out).toMatch(/Embeddings were requested, but they could not be used: the process is not there\./);
    expect(r.out).toMatch(/fallback reason: process-not-there \(Ollama at http:\/\/127\.0\.0\.1:1\)/);
    expect(r.out).toMatch(/accepted \(atlas search\):/);
  });

  it('an embedding proposal that is used is described without naming a library function', async () => {
    vi.stubGlobal('fetch', async (_url: string | URL | Request, init?: RequestInit) => {
      const count = (JSON.parse(String(init?.body)) as { input: unknown[] }).input.length;
      const embeddings = Array.from({ length: count }, (_, k) => Array.from({ length: 2560 }, (_, i) => Math.sin(i * 0.01 + k)));
      return { ok: true, status: 200, json: async () => ({ embeddings }) };
    });
    const r = await run(['retrieve', 'mass', '--embed', '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.out);
    expect(env.result.embeddings).toBe('used');
    expect(env.result.note).toMatch(/proposal, not evidence/);
    expect(env.result.note).not.toMatch(/rankByStructure/);
    expect(env.epistemics).not.toMatch(/rankByStructure/);
  });

  it('control: without --embed the output names no fallback', async () => {
    const r = await run(['retrieve', 'mass']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/fallback reason/);
  });
});

describe('confront --rigor=nope: exit 1, and the three tiers are listed', () => {
  // Read for the first time with the rest of the list; it held, so this pins it and was not red.
  it('names the value and each tier', async () => {
    const r = await run(['confront', '--rigor=nope']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/invalid --rigor='nope' \(expected stringent\|moderate\|loose\)/);
    expect(r.out).toBe('');
  });
});

describe('metric: a bad value is exit 1 and the message names the parameter and what it held', () => {
  it('M=0 names M, its value and its unit', async () => {
    const r = await run(['metric', 'schwarzschild', 'M=0']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/M = 0 kg/);
    expect(r.err).toMatch(/positive mass/);
  });

  it('r=0 names r, its value, r_s and their unit', async () => {
    const r = await run(['metric', 'schwarzschild', 'r=0']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/r must be outside the horizon \(r = 0 m, r_s = [0-9.e+]+ m\)/);
  });

  it('r=1km converts to metres and is then judged against the horizon (inside it, for one solar mass)', async () => {
    const r = await run(['metric', 'schwarzschild', 'r=1km']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/r = 1000 m/);
  });

  it('control: r=10km is outside the horizon of one solar mass and runs', async () => {
    const r = await run(['metric', 'schwarzschild', 'r=10km']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/r=10000/);
  });

  it('a unit of another dimension on r is refused with both dimensions and the parameter named', async () => {
    const r = await run(['metric', 'schwarzschild', 'r=1kg']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/parameter r: '1kg' is \[mass\], but this parameter is \[length\]/);
  });

  it('a non-number names the parameter', async () => {
    const r = await run(['metric', 'schwarzschild', 'r=nope']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/parameter r: 'nope' is not a number/);
  });

  it('exit 2 stays for a malformed invocation (no metric name, a token with no =)', async () => {
    expect((await run(['metric'])).code).toBe(2);
    expect((await run(['metric', 'schwarzschild', 'r'])).code).toBe(2);
  });
});

describe('--record, --replay and --show-record end to end', () => {
  it('a record made, shown and replayed reproduces; the same flag after the command says where it goes', async () => {
    const f = join(tmp, 'e2e.jsonl');
    const recorded = await run([`--record=${f}`, 'eval', 'k_B*T/e', 'T=300']);
    expect(recorded.code).toBe(0);
    const shown = await run([`--show-record=${f}`]);
    expect(shown.code).toBe(0);
    expect(shown.out).toMatch(/\$ upt eval 'k_B\*T\/e' T=300/);
    expect(shown.out).toContain(recorded.out.trim());
    const replayed = await run([`--replay=${f}`]);
    expect(replayed.code).toBe(0);
    expect(replayed.out).toMatch(/reproduced/);
    expect(replayed.out).toMatch(/summary: 1 reproduced, 0 differ, 0 not replayable/);
    const misplaced = await run(['eval', 'x', 'x=1', `--record=${f}`]);
    expect(misplaced.code).toBe(2);
    expect(misplaced.err).toMatch(/unknown flag '--record' for 'eval'/);
    expect(misplaced.err).toMatch(/goes before the command: upt --record=FILE eval/);
  });

  it('a recorded failure is a record too, and its replay reproduces the failure', async () => {
    const f = join(tmp, 'failure.jsonl');
    const bad = await run([`--record=${f}`, 'evaluate', 'be-16', 'T_K=300']);
    expect(bad.code).toBe(1);
    const replayed = await run([`--replay=${f}`]);
    expect(replayed.out).toMatch(/reproduced — exit 1/);
  });

  it('a record whose module source differs from the tree says which module, and that the command reaches it', async () => {
    const f = join(tmp, 'changed-tree.jsonl');
    await run([`--record=${f}`, 'eval', '2*3']);
    const entry = JSON.parse(readFileSync(f, 'utf8').trim());
    const [name] = Object.keys(entry.attribution.modules);
    entry.attribution.modules[name] = '0'.repeat(64);
    const g = join(tmp, 'changed-tree-edited.jsonl');
    writeFileSync(g, JSON.stringify(entry) + '\n');
    const r = await run([`--replay=${g}`]);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`module ${name}`);
    expect(r.out).toMatch(/reachable from 'eval'/);
    // The edit also breaks the entry's own hash, and that is said apart from the tree change.
    expect(r.out).toMatch(/record integrity: recorded entry does not match its recorded entrySha256/);
  });

  it('a record whose stdout differs from the replay is DIFFERS, exit 3, with the first differing line', async () => {
    const f = join(tmp, 'differs.jsonl');
    await run([`--record=${f}`, 'eval', '2*3']);
    const entry = JSON.parse(readFileSync(f, 'utf8').trim());
    entry.result.stdout = '7\n';
    const g = join(tmp, 'differs-edited.jsonl');
    writeFileSync(g, JSON.stringify(entry) + '\n');
    const r = await run([`--replay=${g}`]);
    expect(r.code).toBe(3);
    expect(r.out).toMatch(/DIFFERS — stdout/);
    expect(r.out).toMatch(/recorded: 7\n\s+replayed: 6/);
  });

  it('a module the record cannot read keeps the kind of failure, not one word for all of them', async () => {
    const { sourceHash } = await import('../../dist/cli/record-reach.js');
    const dir = join(tmp, 'a-directory.js');
    mkdirSync(dir);
    expect(sourceHash(dir)).toBe('unreadable (EISDIR)');
    expect(sourceHash(join(tmp, 'absent.js'))).toBe('unreadable (ENOENT)');
    expect(sourceHash(file('present.js', 'x'))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a record file that is appended to by hand with a line that is not JSON is reported, not skipped', async () => {
    const f = join(tmp, 'garbage.jsonl');
    await run([`--record=${f}`, 'eval', '2*3']);
    appendFileSync(f, 'this is not json\n');
    const r = await run([`--replay=${f}`]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/\[line 2\].*\n\s+NOT REPLAYABLE — line 2 is not valid JSON/);
  });
});

describe('map atlas views', () => {
  it('names its source as a published address, not a source file of this checkout', async () => {
    const r = await run(['map', '--route=model-pendulum,model-lc']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/\[source: atlas \(.*https:\/\/github\.com\/danielsimonjr\/Universal-Physics-Tensor\/blob\/master\/src\/atlas\/families\.ts\)\]/);
    expect(r.out).not.toMatch(/ATLAS_FAMILIES|\(ATLAS_FAMILIES, src\//);
  });

  it('--run says what ran without naming a library function', async () => {
    const r = await run(['map', '--route=model-pendulum,model-lc', '--run']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/witness results: run now — /);
    expect(r.out).not.toMatch(/runWitnessRegistry/);
  });

  it('--stored: an artifact that is absent is "not present here"; one that cannot be read says why', () => {
    const absent = (): unknown => loadStoredResults('upt map', join(tmp, 'no-such-results.json'));
    expect(absent).toThrow(CliError);
    expect(absent).toThrow(/not present here/);
    const directory = join(tmp, 'results-dir.json');
    mkdirSync(directory);
    expect(() => loadStoredResults('upt map', directory)).toThrow(/could not read .*EISDIR/);
    expect(() => loadStoredResults('upt map', directory)).not.toThrow(/not present here/);
  });

  it('--stored: valid JSON that is not the artifact is refused by name, not thrown as a TypeError', () => {
    for (const body of ['null', '[]', '7', '{}', '{"schemaVersion":"0"}']) {
      const path = file('results-wrong.json', body);
      expect(() => loadStoredResults('upt map', path), body).toThrow(CliError);
      expect(() => loadStoredResults('upt map', path), body).toThrow(/schemaVersion/);
    }
    const row = file('results-row.json', { schemaVersion: '0', results: [{ recordId: 'ab-x', witnessId: 'w', status: 'passed' }] });
    expect(() => loadStoredResults('upt map', row)).toThrow(/results\[0\] is not a witness result/);
  });

  it('--stored: a well formed artifact loads (control)', () => {
    const path = file('results-ok.json', { schemaVersion: '0', results: [{ recordId: 'ab-x', witnessId: 'w', status: 'checked' }] });
    const loaded = loadStoredResults('upt map', path);
    expect(loaded.rows).toEqual([{ recordId: 'ab-x', witnessId: 'w', status: 'checked' }]);
  });

  it('a diagram comment cannot be ended by a line break in the observable the user typed', async () => {
    const r = await run(['map', '--observable=ab\ncd', '--format=mermaid']);
    expect(r.code).toBe(0);
    const stray = r.out.split('\n').filter((l) => /cd/.test(l) && !l.startsWith('%%') && !l.includes('legend['));
    expect(stray).toEqual([]);
  });
});

describe('discover: a bad value is exit 1, a unit is checked against the quantity, and an unknown name is refused', () => {
  const FAST = ['--source=canonical', '--max-orders=1'];

  it('--max-orders that is not a number is a bad value, exit 1', async () => {
    const r = await run(['discover', '--max-orders=abc']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--max-orders must be a non-negative finite number, got "abc"/);
  });

  it('--anchor with a unit of another dimension is refused with both dimensions', async () => {
    for (const [pair, got, want] of [
      ['mass=1s', '[time]', '[mass]'],
      ['energy=1kg', '[mass]', '[energy]'],
    ] as const) {
      const r = await run(['discover', ...FAST, `--anchor=${pair}`]);
      expect(r.code, pair).toBe(1);
      expect(r.err, pair).toContain(`'${pair}' is ${got}`);
      expect(r.err, pair).toContain(`is ${want}`);
      expect(r.out, pair).toBe('');
    }
  });

  it('--anchor on a name that is no quantity is refused, not printed as the anchor and ignored', async () => {
    const r = await run(['discover', ...FAST, '--anchor=massss=1']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/'massss' is not a quantity in either graph/);
  });

  it('control: a mass with a mass unit, and a temperature in kelvin, are accepted', async () => {
    const m = await run(['discover', ...FAST, '--anchor=mass=2kg']);
    expect(m.code).toBe(0);
    expect(m.out).toMatch(/anchor: mass=2 \(from --anchor\)/);
    const t = await run(['discover', ...FAST, '--anchor=temperature=300K']);
    expect(t.code).toBe(0);
  });
});

describe('text mode: a heading over an empty list says none, and no line is indentation alone', () => {
  const WHITESPACE_ONLY = /^[ \t]+$/;
  const blankIndents = (text: string): string[] => text.split('\n').filter((l) => WHITESPACE_ONLY.test(l));

  it('CONTROL: the scan sees an indent-only line and passes a line with content or a truly empty one', () => {
    expect(blankIndents('  heading:\n    \n')).toEqual(['    ']);
    expect(blankIndents('  heading:\n    none\n\n')).toEqual([]);
  });

  it('audit: the empty sections (COEFFICIENT UNSET (0) on the catalog) print none', async () => {
    const r = await run(['audit']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/COEFFICIENT UNSET \(0\)[^\n]*:\n {4}none\n/);
    expect(blankIndents(r.out)).toEqual([]);
  });

  it('map --around with no isolated edge prints none under the isolated heading', async () => {
    const r = await run(['map', '--around=temperature', '--depth=2', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/isolated \(0\)[^\n]*:\n {5}none\n/);
    expect(blankIndents(r.out)).toEqual([]);
  });
});

describe('evaluate of a case: text mode does not speak JSON', () => {
  it('an output that needs an optional input is described without the word null', async () => {
    // No h_m: the wall outputs are undefined here, and their meanings used to end "; null without h_m".
    const r = await run([
      'evaluate', 'case-brownian-sphere',
      'T_K=293.15', 'eta_Pa_s=1e-3', 'a_m=1um', 'rho_p_kg_per_m3=2000', 'rho_f_kg_per_m3=998', 't_s=1', 'd=2',
    ]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/D_parallel_m2_per_s = undefined here/);
    expect(r.out).toMatch(/not defined without h_m/);
    expect(r.out).not.toMatch(/\bnull\b/);
  });

  it('no case prints the word null on its own example, nor lists it in the case listing', async () => {
    const listing = await run(['evaluate']);
    expect(listing.out).not.toMatch(/\bnull\b/);
    const examples = [...listing.out.matchAll(/^ {6}e\.g\. upt evaluate (case-\S+) (.*)$/gm)];
    expect(examples.length).toBeGreaterThanOrEqual(6);
    for (const [, id, rest] of examples) {
      const r = await run(['evaluate', id!, ...rest!.split(' ')]);
      expect([0, 3], `${id} exits 0, or 3 when its regime check fails`).toContain(r.code);
      expect(r.out, id).not.toMatch(/\bnull\b/);
    }
  });
});

describe('evaluate: every failure of the evaluation itself is exit 1 under the one prefix, with the bridge named', () => {
  it('a closed form that overflows names the bridge', async () => {
    const r = await run(['evaluate', 'be-82', 'I_s_A=2', 'V_volts=2', 'T_K=2']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^upt evaluate: be-82: .*finite number/);
  });

  it('a validity-domain refusal carries the prefix', async () => {
    const r = await run(['evaluate', 'be-16', 'temperature_K=-5']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^upt evaluate: be-16: inputs violate validity domain/);
  });
});

describe('the five files of the package: no bare catch without a stated reason, no cast that hides an error kind', () => {
  const FILES = [
    'cli/record.ts',
    'cli/record-reach.ts',
    'cli/commands/_atlas-map.ts',
    'cli/commands/probe.ts',
    'cli/commands/discover.ts',
  ];

  /** Lines holding `catch {` (no binding) with no comment on that line, the two before, or the next. */
  function silentCatches(text: string): number[] {
    const lines = text.split('\n');
    const hits: number[] = [];
    lines.forEach((line, i) => {
      if (!/\bcatch\s*\{/.test(line)) return;
      const near = [lines[i - 2], lines[i - 1], line, lines[i + 1]].join('\n');
      if (!/\/\/|\/\*/.test(near)) hits.push(i + 1);
    });
    return hits;
  }

  it('CONTROL: the scan flags a bare catch with no comment and passes the same catch with one', () => {
    expect(silentCatches('try {\n  x();\n} catch {\n  return null;\n}\n')).toEqual([3]);
    expect(silentCatches('try {\n  x();\n} catch {\n  // absent or unreadable are one outcome here\n  return null;\n}\n')).toEqual([]);
    expect(silentCatches('try {\n  x();\n} catch (e) {\n  throw e;\n}\n')).toEqual([]);
  });

  it('no file has an uncommented bare catch', () => {
    const hits = FILES.flatMap((f) => silentCatches(readFileSync(join(SRC, f), 'utf8')).map((n) => `${f}:${n}`));
    expect(hits).toEqual([]);
  });

  const CASTS = /\(e as Error\)|as NodeJS\.ErrnoException|as unknown as|\bas any\b|run\.exitCode as number|opts as Record/;

  it('CONTROL: the cast pattern matches each form it is written for', () => {
    for (const s of ['(e as Error).message', 'e as NodeJS.ErrnoException', 'x as unknown as T', 'x as any', 'run.exitCode as number', 'opts as Record<string, unknown>']) {
      expect(CASTS.test(s), s).toBe(true);
    }
    expect(CASTS.test('e instanceof Error ? e.message : String(e)')).toBe(false);
  });

  it('no file casts a thrown value or a result to the type it must be proven to have', () => {
    const hits = FILES.filter((f) => CASTS.test(readFileSync(join(SRC, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('a flag default that a library constant owns is not typed as a literal in the command', () => {
    for (const f of ['cli/commands/probe.ts', 'cli/commands/discover.ts', 'cli/commands/map.ts', 'cli/commands/ground.ts']) {
      const text = readFileSync(join(SRC, f), 'utf8');
      expect(text, f).not.toMatch(/defaultValue: '[0-9.]+'/);
      expect(text, f).not.toMatch(/\(default [0-9.]+[,)]/);
    }
  });

  it('a command does not reach for process.* itself (src/cli/command.ts states the rule)', () => {
    for (const f of ['cli/commands/probe.ts', 'cli/commands/discover.ts', 'cli/commands/_atlas-map.ts']) {
      expect(readFileSync(join(SRC, f), 'utf8'), f).not.toMatch(/\bprocess\.(execPath|argv|env|cwd|exit|stdout|stderr)\b/);
    }
  });
});
