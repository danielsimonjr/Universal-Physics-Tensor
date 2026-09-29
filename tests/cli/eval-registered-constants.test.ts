/**
 * `upt eval` fills in registered constants by projecting the constant registry
 * into the formula scope. A hand list had dropped `sigma_sb`, `ln2` and `b`.
 * A bare `sigma` stays unbound: the map hint names `sigma_sb`, and it is not
 * aliased.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { codataScope } from '../../src/cli/eval-numbers.js';
import { CONSTANTS } from '../../src/composition/symbolic-constants.js';

function capture() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      out: (s?: string) => stdout.push((s ?? '') + '\n'),
      err: (s?: string) => stderr.push((s ?? '') + '\n'),
      write: (s: string) => stdout.push(s),
    },
  };
}

async function run(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, stdout: cap.stdout.join(''), stderr: cap.stderr.join('') };
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

describe('formula scope is the constant registry', () => {
  it('every registered constant is present, and a bare sigma is not', () => {
    const scope = codataScope('si');
    for (const [name, c] of Object.entries(CONSTANTS)) {
      expect(scope[name], name).toBe(c.value);
    }
    expect(scope).not.toHaveProperty('sigma');
    // Natural and geometrized overrides still replace the SI values of c, ħ, h and G.
    expect(codataScope('natural').c).toBe(1);
    expect(codataScope('natural').hbar).toBe(1);
    expect(codataScope('natural').h).toBe(2 * Math.PI);
    expect(codataScope('natural').sigma_sb).toBe(CONSTANTS.sigma_sb.value);
    expect(codataScope('geometrized').G).toBe(1);
    expect(codataScope('geometrized').sigma_sb).toBe(CONSTANTS.sigma_sb.value);
  });
});

describe('upt eval reads the registered constants', () => {
  it('sigma_sb, ln2 and b evaluate to the registered SI values', async () => {
    for (const name of Object.keys(CONSTANTS).filter((n) => IDENTIFIER.test(n))) {
      const r = await run(['eval', name]);
      expect(r.code, name).toBe(0);
      expect(Number(r.stdout.trim()), name).toBe(CONSTANTS[name]!.value);
    }
  });

  it('a Stefan–Boltzmann flux is sigma_sb T^4, checked by hand', async () => {
    const T = 300;
    const r = await run(['eval', 'sigma_sb*T^4', `T=${T}`]);
    expect(r.code).toBe(0);
    expect(Number(r.stdout.trim())).toBeCloseTo(CONSTANTS.sigma_sb.value * T ** 4, 8);
  });

  it('an explicit sigma_sb= wins over the registered value', async () => {
    const r = await run(['eval', 'sigma_sb', 'sigma_sb=2']);
    expect(r.code).toBe(0);
    expect(Number(r.stdout.trim())).toBe(2);
  });

  it('a bare sigma is refused and is not given the Stefan–Boltzmann value', async () => {
    const r = await run(['eval', 'sigma']);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/missing values for: sigma/);
    expect(r.stdout).not.toContain(String(CONSTANTS.sigma_sb.value));
  });

  it('MathTS reads 2pi, 4pi and 8pi as n·pi, the registered values', async () => {
    for (const name of ['2pi', '4pi', '8pi'] as const) {
      const r = await run(['eval', name]);
      expect(r.code, name).toBe(0);
      expect(Number(r.stdout.trim()), name).toBeCloseTo(CONSTANTS[name].value, 12);
    }
  });
});
