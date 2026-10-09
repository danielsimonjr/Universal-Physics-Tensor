/**
 * The 9.0.0 audit, §6 CLI (docs/audit/2026-10-09-codebase-audit-9.0.0.md).
 *
 * Each block is one audit item. Every test here was run RED on the tree the
 * audit measured before its fix landed; the commit messages quote the red
 * lines. The CLI is exercised in-process against the built `dist/`, so a src
 * change needs `bun run build` before this file reports on it.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { listCommandNames, resolveCommand } from '../../dist/cli/command.js';
import { ADJUDICATIONS, candidateIdIfSlug } from '../../dist/composition/adjudication.js';

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

const DERIVE = ['derive', 'period:time', 'length:length', 'gravity:acceleration'];

describe('K2: derive --json carries no prefactor for a formula the text says does not match', () => {
  it('a non-matching formula: exit 3, prefactor null, matchesMonomial false', async () => {
    const r = await run([...DERIVE, '--formula', 'length*gravity', '--json']);
    expect(r.code).toBe(3);
    const env = JSON.parse(r.out);
    expect(env.result.matchesMonomial).toBe(false);
    expect(env.result.prefactor).toBeNull();
  });
  it('a matching formula: prefactor is the number the text prints, matchesMonomial true', async () => {
    const r = await run([...DERIVE, '--formula', '2*pi*sqrt(length/gravity)', '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.out);
    expect(env.result.matchesMonomial).toBe(true);
    expect(env.result.prefactor).toBeCloseTo(2 * Math.PI, 9);
  });
});

describe('derive and eval classify a formula failure by its kind, not by one catch-all label', () => {
  it('a formula that is singular at generic inputs is reported as that, not as an undeclared variable', async () => {
    const r = await run(['derive', 'x:length', 'y:length', '--formula', 'y/0']);
    expect(r.code).toBe(2);
    expect(r.err).not.toMatch(/undeclared variable/);
    expect(r.err).toMatch(/could not be evaluated at generic inputs/);
  });
  it('an undeclared symbol exits 2 on both branches and says how to declare it', async () => {
    const unique = await run(['derive', 'x:length', 'y:length', '--formula', 'y*c']);
    const notUnique = await run(['derive', 'x:length', 'y:length', 'z:time', '--formula', 'y*c']);
    for (const r of [unique, notUnique]) {
      expect(r.code).toBe(2);
      expect(r.err).toMatch(/undeclared symbol 'c'/);
      expect(r.err).toMatch(/c:c/);
      expect(r.err).not.toMatch(/Undefined symbol/);
    }
  });
  it('a parse error is labelled once', async () => {
    const e = await run(['eval', '2*(']);
    expect(e.code).toBe(2);
    expect(e.err.match(/parse error:/g)?.length).toBe(1);
    const d = await run(['derive', 'x:length', 'y:length', '--formula', '2*(']);
    expect(d.code).toBe(2);
    expect(d.err.match(/parse error:/g)?.length).toBe(1);
  });
});

describe('K3: a result carries the envelope and exits 0 or 3; an error (1, 2) writes nothing to stdout', () => {
  it('search with no match is a result: exit 0, the empty match list and the scope searched', async () => {
    const text = await run(['search', 'zzzzqqq']);
    expect(text.code).toBe(0);
    expect(text.out).toMatch(/no entry matches every word of 'zzzzqqq'/);
    expect(text.out).toMatch(/searched \d+ catalog bridges/);
    const json = await run(['search', 'zzzzqqq', '--json']);
    expect(json.code).toBe(0);
    expect(JSON.parse(json.out).result.matches).toEqual([]);
  });
  it('confront be-53 is a refusal the command computed: exit 0, status refused, no residual', async () => {
    const text = await run(['confront', 'be-53']);
    expect(text.code).toBe(0);
    expect(text.out).toMatch(/refused/);
    const json = await run(['confront', 'be-53', '--json']);
    expect(json.code).toBe(0);
    const env = JSON.parse(json.out);
    expect(env.result.status).toBe('refused');
    expect(env.result).not.toHaveProperty('residual');
  });

  // One failing invocation per registered command. A new command must add its row.
  const ERRORS: Record<string, string[]> = {
    atlas: ['atlas', 'ab-no-such-bridge'],
    audit: ['audit', '--source=nope'],
    axes: ['axes', '--bogus'],
    candidates: ['candidates', '--source=nope'],
    canonical: ['canonical', '--bogus'],
    chain: ['chain'],
    confront: ['confront', '--rigor=nope'],
    connectors: ['connectors', '--source=nope'],
    coverage: ['coverage', '--bogus'],
    derive: ['derive', 'x:length', 'y:length', '--formula', 'y*c'],
    discover: ['discover', '--source=nope'],
    eval: ['eval', 'x', 'x=nope'],
    evaluate: ['evaluate', 'be-999'],
    explain: ['explain', 'not-a-quantity-xyz'],
    frontier: ['frontier', '--bogus'],
    ground: ['ground', 'no-such-quantity', 'mass'],
    map: ['map', '--source=nope'],
    metric: ['metric', 'schwarzschild', 'M=0'],
    path: ['path', 'model-no-such', 'model-spring'],
    predict: ['predict', '--bogus'],
    priority: ['priority', '--source=nope'],
    probe: ['probe', 'show', 'fg-no-such-gap'],
    recover: ['recover', '--bogus'],
    regime: ['regime', 'no-such-family'],
    retrieve: ['retrieve'],
    search: ['search'],
    symbolic: ['symbolic', '--bogus'],
    testplan: ['testplan', 'nope'],
  };
  it('the error table names every registered command', () => {
    expect(Object.keys(ERRORS).sort()).toEqual(listCommandNames());
  });
  it.each(Object.entries(ERRORS))('%s: a failing invocation exits 1 or 2 with empty stdout, --json or not', async (_name, argv) => {
    const text = await run(argv);
    expect([1, 2]).toContain(text.code);
    expect(text.out).toBe('');
    if (_name !== 'chain') {
      const json = await run([...argv, '--json']);
      expect([1, 2]).toContain(json.code);
      expect(json.out).toBe('');
    }
  });
  it('no command returns 1 or 2 after writing an envelope (static scan of every emitJson site)', () => {
    const hits: string[] = [];
    const dir = join(SRC, 'cli/commands');
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const text = readFileSync(join(dir, name), 'utf8');
      let from = 0;
      for (;;) {
        const i = text.indexOf('emitJson(', from);
        if (i < 0) break;
        const ret = /return\s+([^;]+);/.exec(text.slice(i));
        if (ret !== null && /(^|[^\w.])[12]([^\w.]|$)/.test(ret[1]!)) hits.push(`${name}: return ${ret[1]!.trim()}`);
        from = i + 1;
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('K4 and the map Lows: --out is honoured in every output form, poster is gone, --proposed lists, one unit mode', () => {
  it('map --out=PATH writes the text report (and the --json envelope) to PATH; stdout stays empty', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'upt-map-out-'));
    try {
      const text = await run(['map', '--source=catalog', '--out=' + join(dir, 'map.txt')]);
      expect(text.code).toBe(0);
      expect(text.out).toBe('');
      expect(text.err).toMatch(/wrote text to/);
      expect(readFileSync(join(dir, 'map.txt'), 'utf8')).toMatch(/Linkage map/);
      const json = await run(['map', '--source=catalog', '--json', '--out=' + join(dir, 'map.json')]);
      expect(json.code).toBe(0);
      expect(json.out).toBe('');
      expect(JSON.parse(readFileSync(join(dir, 'map.json'), 'utf8')).command).toBe('map');
      const empty = await run(['map', '--source=catalog', '--out=']);
      expect(empty.code).toBe(1);
      expect(existsSync(join(dir, 'none'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('--source=poster is not a value: it exits 1 and the message lists the vocabulary', async () => {
    const r = await run(['map', '--source=poster']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/catalog \| canonical \| both/);
    expect(r.err).not.toMatch(/Poster index/);
  });
  it('map --proposed in text mode lists the proposed relations it overlays', async () => {
    const r = await run(['map', '--proposed', '--source=catalog']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/proposed relations \(\d+/);
  });
  it('--natural and --geometrized together are refused on eval and map', async () => {
    const e = await run(['eval', 'x', 'x=1', '--natural', '--geometrized']);
    expect(e.code).toBe(2);
    expect(e.err).toMatch(/one unit mode/);
    const m = await run(['map', '--equation', 'period = mass', '--natural', '--geometrized']);
    expect(m.code).toBe(2);
    expect(m.err).toMatch(/one unit mode/);
  });
  it('a bare -- ends the options: what follows is positional, even --help', async () => {
    const r = await run(['search', '--', '--bogus']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/no entry matches every word of '--bogus'|match/);
    const h = await run(['search', '--', '--help']);
    expect(h.code).toBe(0);
    expect(h.out).not.toMatch(/Flags:/);
  });
});

describe('K6: -h is --help on every command and on help itself', () => {
  it('upt map -h prints the map help and does not draw the map', async () => {
    const r = await run(['map', '-h']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^upt map \[--source/);
    expect(r.out).not.toMatch(/Linkage map/);
  });
  it('upt help -h and upt help --help print the command list', async () => {
    for (const argv of [['help', '-h'], ['help', '--help']]) {
      const r = await run(argv);
      expect(r.code).toBe(0);
      expect(r.out).toMatch(/upt <command>|Commands/);
    }
  });
  it('upt confront -h prints help without running a confrontation', async () => {
    const r = await run(['confront', '-h']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/Real-data confrontations/);
  });
});

describe('K5: candidates reads its examples from the adjudication ledger, not from prose', () => {
  it('no hand-written "genuinely motivated" example; a ledgered pair carries its verdict on its row', async () => {
    const r = await run(['candidates']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/genuinely motivated/);
    const rows = r.out.split('\n').filter((l) => l.includes(' ≟ '));
    expect(rows.length).toBeGreaterThan(10);
    const ledger = new Set(ADJUDICATIONS.map((a) => a.id));
    let ledgered = 0;
    for (const line of rows) {
      const m = /^\s+(\S+) ≟ (\S+)/.exec(line);
      expect(m, line).not.toBeNull();
      const id = candidateIdIfSlug(m![1]!, m![2]!);
      if (id !== undefined && ledger.has(id)) {
        ledgered++;
        const verdict = ADJUDICATIONS.find((a) => a.id === id)!.verdict;
        expect(line).toContain(`[adjudicated: ${verdict}`);
      } else {
        expect(line).not.toContain('[adjudicated:');
      }
    }
    expect(r.out).toMatch(new RegExp(`adjudicated: ${ledgered} of ${rows.length}`));
  });
  it('the canonical graph, where the coarsening pair does not exist, does not name it', async () => {
    const r = await run(['candidates', '--source=canonical']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/coarsening-length/);
    expect(r.out).toMatch(/adjudicated: \d+ of \d+ carry a recorded verdict/);
  });
});

/** A registered example, split as a shell would (double quotes group; no escapes). */
function argvOf(example: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(example)) !== null) out.push(m[1] ?? m[2]!);
  expect(out[0]).toBe('upt');
  return out.slice(1);
}

describe('K7: every registered example is a real invocation', () => {
  it.each(listCommandNames())('%s: its example exits 0', async (name) => {
    const command = resolveCommand(name)!;
    const r = await run(argvOf(command.example!));
    expect(r.code, r.err).toBe(0);
  });
});

describe('K8: metric', () => {
  it('upt metric kerr --geodesic integrates at the default parameters', async () => {
    const r = await run(['metric', 'kerr', '--geodesic']);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/geodesic: circular orbit/);
  });
  it('a point the metric refuses is a bad value (exit 1); a malformed parameter is usage (exit 2)', async () => {
    expect((await run(['metric', 'schwarzschild', 'r=1km'])).code).toBe(1);
    expect((await run(['metric', 'schwarzschild', 'r=0'])).code).toBe(1);
    expect((await run(['metric', 'schwarzschild', 'M=0'])).code).toBe(1);
    expect((await run(['metric', 'schwarzschild', 'r'])).code).toBe(2);
  });
});

describe('K9 and K10: one binding reader; a repeated key is refused (1), a missing = is usage (2), a bad value is 1', () => {
  const TWICE: Record<string, string[]> = {
    eval: ['eval', 'x', 'x=1', 'x=2'],
    explain: ['explain', 'hawking-temperature', 'mass=1', 'mass=2'],
    'evaluate --sigma': ['evaluate', 'be-58', 'T_K=300', 'R_ohm=1', '--sigma', 'T_K=3', '--sigma', 'T_K=4'],
    'regime --at': ['regime', 'oscillators', '--at', 'theta0=0.1', '--at', 'theta0=0.2'],
    'path --at': ['path', 'model-pendulum', 'model-spring', '--at', 'theta0=0.1', 'theta0=0.2'],
    'discover --anchor': ['discover', '--source=catalog', '--anchor=mass=1', '--anchor=mass=2'],
    metric: ['metric', 'schwarzschild', 'r=1e8', 'r=2e8'],
  };
  it.each(Object.entries(TWICE))('%s: a key given twice exits 1 and names it', async (_label, argv) => {
    const r = await run(argv);
    expect(r.code, r.out + r.err).toBe(1);
    expect(r.err).toMatch(/twice/);
  });
  it('a bad value on explain is exit 1, like eval and evaluate; a missing = stays usage', async () => {
    for (const value of ['mass=nope', 'mass=', 'mass=1e500']) {
      expect((await run(['explain', 'hawking-temperature', value])).code, value).toBe(1);
    }
    expect((await run(['regime', 'oscillators', '--at', 'theta0=nope'])).code).toBe(1);
    expect((await run(['regime', 'oscillators', '--at', 'theta0'])).code).toBe(2);
    expect((await run(['eval', 'x', 'x'])).code).toBe(2);
  });
});

describe('K11: a missing evaluator is not the same message as a missing catalog id', () => {
  it('be-999 is not a catalog id; be-53 is a catalog id with no evaluator; neither names a function', async () => {
    const none = await run(['evaluate', 'be-999']);
    expect(none.code).toBe(1);
    expect(none.err).toMatch(/not a catalog id/);
    const noEval = await run(['evaluate', 'be-53']);
    expect(noEval.code).toBe(1);
    expect(noEval.err).toMatch(/be-53 .* has no evaluator/);
    expect(noEval.err).not.toMatch(/not a catalog id/);
    for (const r of [none, noEval]) expect(r.err).not.toMatch(/evaluateBridge/);
  });
});

describe('K13: symbolic', () => {
  it('--json carries the confidence of a graded chain, as the text does', async () => {
    const r = await run(['symbolic', '--json']);
    expect(r.code).toBe(0);
    const env = JSON.parse(r.out);
    const graded = env.result.filter((c: { confidence?: string }) => c.confidence !== undefined);
    expect(graded.length).toBeGreaterThan(0);
    for (const c of graded) expect(['speculative', 'highly-speculative', 'established']).toContain(c.confidence);
  });
  it('the text never says MathTS is absent: MathTS is a required dependency', () => {
    expect(readFileSync(join(SRC, 'cli/commands/symbolic.ts'), 'utf8')).not.toMatch(/MathTS absent/);
  });
});

describe('§6 Lows and §7 Low: one number formatter, one definitions block, the unspannable row, and the small ones', () => {
  it('no command formats a number on its own: every value goes through formatQuantity', () => {
    const hits: string[] = [];
    const dirs = [join(SRC, 'cli'), join(SRC, 'cli/commands')];
    for (const dir of dirs) {
      for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
        const text = readFileSync(join(dir, name), 'utf8');
        for (const [i, line] of text.split('\n').entries()) {
          if (/\.(toExponential|toFixed|toPrecision)\(/.test(line)) hits.push(`${name}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
  it('audit: an open row whose target is outside the span prints ∞ (unspannable), and definitions appear once', async () => {
    const text = await run(['audit']);
    expect(text.out).not.toMatch(/cplx=Infinity/);
    expect(text.out).toMatch(/cplx=∞ \(unspannable\)  be-150/);
    const env = JSON.parse((await run(['audit', '--json'])).out);
    expect(env.definitions.decoy).toBeTruthy();
    expect(env.result.definitions).toBeUndefined();
    expect(env.result.open.find((o: { id: string }) => o.id === 'be-150').unspannable).toBe(true);
  });
  it('explain: a domain violation with no recovered value exits 1, as evaluate does', async () => {
    const r = await run(['explain', 'hawking-temperature', 'mass=-1']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/validity domain/);
  });
  it('explain NOT COVERED does not search a stop word', async () => {
    const r = await run(['explain', 'not-a-quantity-xyz']);
    expect(r.code).toBe(1);
    expect(r.err).not.toMatch(/`upt search not`/);
  });
  it('testplan takes a case id in either letter case, as evaluate does', async () => {
    const r = await run(['testplan', 'CASE-SKIN-DEPTH']);
    expect(r.code, r.err).toBe(0);
  });
  it('regime: the usage line names --assume and --deny; a family with no inequality reads VACUOUS, not UNCHECKED', async () => {
    const help = await run(['help', 'regime']);
    expect(help.out).toMatch(/^upt regime <family>.*--assume.*--deny/);
    const r = await run(['regime', 'plasma']);
    expect(r.code).toBe(0);
    expect(r.out).not.toMatch(/UNCHECKED/);
    expect(r.out).toMatch(/states no inequality: every record is VACUOUS/);
  });
  it('confront --bridge --json: rigorDistribution counts the confrontations run, not the whole registry', async () => {
    const env = JSON.parse((await run(['confront', '--bridge=be-37', '--json'])).out);
    const total = Object.values(env.rigorDistribution as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
    const all = JSON.parse((await run(['confront', '--json'])).out);
    expect(Object.values(all.rigorDistribution as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(all.result.length);
  });
  it('probe run on a JSON file that is not a problem file says so, by error class', async () => {
    const r = await run(['probe', 'run', '--problem=package.json']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/is not a problem file/);
    expect(r.err).not.toMatch(/^upt probe: Cannot read properties/);
  });
  it('evaluate labels a derived output in a coherent SI unit, and the JSON keeps the base form and the dimension', async () => {
    const text = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1']);
    expect(text.out).toMatch(/voltage-noise-density \[V\^2\/Hz\]/);
    const env = JSON.parse((await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1', '--json'])).out);
    expect(env.result.output.unit).toBe('kg^2*m^4/(s^5*A^2)');
    expect(env.result.output.dimension).toEqual({ L: 4, M: 2, T: -5, I: -2, Theta: 0, N: 0, J: 0 });
  });
  it('evaluate prints one number at one precision: the inputs line and the converted line agree', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=10eV', 'R_ohm=1']);
    expect(r.out).toMatch(/inputs: T_K=116045\.181215501,/);
  });
});
