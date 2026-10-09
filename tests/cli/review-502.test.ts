/**
 * Tom's review of #502, CLI pass: each finding reproduced by running the command and
 * pinned here. Every case was red against the dist built before the fix (the review's
 * reproductions), then green.
 *
 * @module tests/cli/review-502
 */
import '../helpers/dist.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { runFunnel } from '../helpers/discover-cache.js';

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

describe('1. a 1/s output is labelled by its dimension, never as Hz', () => {
  it('the upper-hybrid frequency (rad/s) and the Josephson frequency (Hz) both read [s^-1]: the label is the dimension', async () => {
    const uh = await run(['evaluate', 'be-105', 'n_per_m3=1e18', 'B_T=1', 'm_kg=9.109e-31']);
    expect(uh.code, uh.err).toBe(0);
    expect(uh.out).toMatch(/upper-hybrid-frequency \[s\^-1\] = /);
    expect(uh.out).not.toMatch(/\[Hz\]/);
    const josephson = await run(['evaluate', 'be-59', 'V_volts=1e-6']);
    expect(josephson.out).toMatch(/frequency \[s\^-1\] = /);
  });
  it('control: a named coherent unit that counts no cycles is still the label', async () => {
    const r = await run(['evaluate', 'be-74', 'B_T=1']);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/\[Pa\] = /);
  });
});

describe('2. search drops no query word: "every word matched" is true of every word given', () => {
  it('`search a b` does not list a quantity matched by `b` alone', async () => {
    const r = await run(['search', 'a', 'b']);
    expect(r.code).toBe(0);
    // Every match carries both words (a catalog description can): a symbol `b` alone is not one.
    expect(r.out).not.toMatch(/impact-parameter/);
  });
  it('`search truncation coefficient a` does not list truncation-coefficient-b', async () => {
    const r = await run(['search', 'truncation', 'coefficient', 'a']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/truncation-coefficient-a/);
    expect(r.out).not.toMatch(/truncation-coefficient-b/);
  });
  it('control: a phrase still matches, and a stop word of the old six is still dropped', async () => {
    const r = await run(['search', 'thermal', 'noise']);
    expect(r.out).toMatch(/be-58/);
    const speed = await run(['search', 'speed', 'of', 'sound']);
    expect(speed.out).toMatch(/sound-speed/);
  });
});

describe('3. and 4. a statistic prints at three significant digits', () => {
  it('discover: "orders apart" is a magnitude estimate, ~ and three digits', async () => {
    const r = await runFunnel(['discover', '--source=canonical']);
    expect(r.code, r.stderr).toBe(0);
    const lines = r.stdout.split('\n').filter((l) => l.includes('orders apart'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l).toMatch(/ ~\d+(\.\d{1,2})? orders apart/);
  });
  it('evaluate --sigma: σ, the relative %, c and c·u are three digits; the value stays exact', async () => {
    const r = await run(['evaluate', 'be-58', 'T_K=300', 'R_ohm=1000', '--sigma', 'T_K=3', '--sigma', 'R_ohm=10']);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/value = 1\.6567788e-17 ± 2\.34e-19 \(1σ; relative 1\.41%\)/);
    expect(r.out).toMatch(/from T_K: c = 5\.52e-20, c·u = 1\.66e-19, curvature\/linear at ±u = 1\.86e-14/);
  });
});

describe('5. ground: a valid pair with no candidate is a computed absence, exit 0', () => {
  it('text and --json exit 0 and say no candidate pairs the two', async () => {
    const text = await runFunnel(['ground', 'temperature', 'mass']);
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toMatch(/no discovery candidate pairs 'temperature' with 'mass'/);
    const json = await runFunnel(['ground', 'temperature', 'mass', '--json']);
    expect(json.code, json.stderr).toBe(0);
    const env = JSON.parse(json.stdout);
    expect(env.result.candidate).toBeNull();
    expect(env.result.searched).toEqual(['catalog', 'canonical', 'both']);
  });
  it('a name no graph holds is still exit 1', async () => {
    const r = await runFunnel(['ground', 'not-a-name', 'mass']);
    expect(r.code).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toMatch(/'not-a-name' is not a quantity of any graph/);
  });
});

describe('nits', () => {
  it('--anchor=mass= (an empty value) is a bad value, exit 1, like every other empty value', async () => {
    const r = await run(['discover', '--anchor=mass=']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--anchor/);
  });
  it('eval: a non-finite result is a bad value (exit 1); an unknown function stays a malformed formula (exit 2)', async () => {
    const nonFinite = await run(['eval', 'ln(-1)']);
    expect(nonFinite.code).toBe(1);
    expect(nonFinite.err).toMatch(/^upt eval: formula did not evaluate to a finite number/);
    expect((await run(['eval', '1/0'])).code).toBe(1);
    expect((await run(['eval', 'foo(2)'])).code).toBe(2);
  });
  it('eval: a cycle-counting unit prints its note, and is not silently multiplied by 2π', async () => {
    const r = await run(['eval', 'omega*r', 'omega=60rpm', 'r=1m']);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/^1\b/m);
    expect(r.err).toMatch(/rpm counts revolutions.*2π/);
  });
  it('derive: the undeclared-symbol message separates its two sentences', async () => {
    const r = await run(['derive', 'period:time', 'length:length', '--formula', 'sqrt(lenght/g)']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/x:length\)\. Declare it as an argument/);
  });
  it('derive: a formula parse error carries the command prefix and no leading spaces', async () => {
    const r = await run(['derive', 'period:time', 'length:length', '--formula', 'sqrt(length/']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/^upt derive: --formula: parse error:/);
  });
  it('map --out into a missing directory names the command', async () => {
    const r = await run(['map', '--out=/nonexistent/dir/x']);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^upt map: .*ENOENT/);
  });
  it('map --proposed: a relation with no sources says what that means', async () => {
    const r = await run(['map', '--proposed']);
    expect(r.code, r.err).toBe(0);
    const bare = r.out.split('\n').filter((l) => l.includes('← {}'));
    for (const l of bare) expect(l).toMatch(/← \{\} \(no sources: /);
  });
  it('path: the sweep table prints its value and error cells at six digits', async () => {
    const r = await run(['path', 'model-pendulum', 'model-lc', '--at', 'T0=1', 't=10', '--sweep', 'theta0=0.1:0.3:3']);
    expect(r.code, r.err).toBe(0);
    const rows = r.out.split('\n').filter((l) => /^  0\.[123]\s+holds/.test(l));
    expect(rows).toHaveLength(3);
    // Six significant digits: 0.000625358, 0.00250574, 0.00565418 (not 0.000625358307736468).
    for (const l of rows) expect(l).toMatch(/holds\s+0\.0*[1-9]\d{0,5}$/);
    expect(r.out).toMatch(/0\.000625358$/m);
  });
  it('source: confront.ts has one doc comment on `percent`, and ground.ts spreads its options instead of casting', () => {
    const confront = readFileSync(join(SRC, 'cli/commands/confront.ts'), 'utf8');
    expect(confront).not.toMatch(/\*\/\n\/\*\*[^\n]*\*\/\nfunction percent/);
    const ground = readFileSync(join(SRC, 'cli/commands/ground.ts'), 'utf8');
    expect(ground).not.toMatch(/opts as Record/);
  });
});
