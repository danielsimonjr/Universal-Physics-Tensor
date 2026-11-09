/**
 * Issues 543, 544 and 528: `upt evaluate` and `evaluateRelation` read one
 * spelling table (the input contract), `upt explain` names a given input that
 * no derivation used, and be-37 has one answer on both surfaces.
 */
import '../helpers/dist.js';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../dist/cli/main.js';
import { evaluateRelation } from '../../src/index.js';
import { SynonymDisagreementError } from '../../src/dimensional/formula-names.js';

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  const code = await runCli(args, { out: sink, err: sink, write: (s: string) => lines.push(s) });
  return { code, text: lines.join('') };
}

const valueOf = (id: string, bindings: Record<string, number>): number => {
  const r = evaluateRelation(id, bindings);
  if (r.kind !== 'value') throw new Error(`${id}: ${r.kind}`);
  return r.value;
};

/** The CLI value line `<name> [<unit>] = <number>`, the first one printed. */
const cliValue = (text: string): number | undefined => {
  const m = /] = (-?[0-9.]+(?:e[+-]?[0-9]+)?)/.exec(text);
  return m === null ? undefined : Number(m[1]);
};

/** Each row: id, the declared key, the other inputs, and every temperature spelling. */
const CASES: readonly [string, string, Record<string, number>][] = [
  ['be-164', 'T_K', { nu_Hz: 5e14 }],
  ['be-58', 'T_K', { R_ohm: 1000 }],
  ['be-16', 'temperature_K', {}],
];
const SPELLINGS = ['temperature', 'T', 'temp', 'T_K'];
const T = 300;

describe('issue 543: one temperature spelling table for the library and the CLI', () => {
  for (const [id, key, rest] of CASES) {
    const reference = valueOf(id, { ...rest, [key]: T });
    it.each(SPELLINGS)(`${id}: evaluateRelation reads %s as ${key}`, (spelling) => {
      expect(valueOf(id, { ...rest, [spelling]: T })).toBe(reference);
    });
    it.each(SPELLINGS)(`${id}: upt evaluate reads %s as ${key}`, async (spelling) => {
      const args = Object.entries({ ...rest, [spelling]: T }).map(([k, v]) => `${k}=${v}`);
      const r = await cli(['evaluate', id, ...args]);
      expect(r.code, r.text).toBe(0);
      expect(Math.abs(cliValue(r.text)! / reference - 1)).toBeLessThan(1e-12);
    });
  }
  it('two temperature spellings with different numbers are refused on both surfaces', async () => {
    expect(() => evaluateRelation('be-58', { T_K: 300, temperature: 400, R_ohm: 1000 })).toThrow(SynonymDisagreementError);
    const r = await cli(['evaluate', 'be-58', 'T_K=300', 'temperature=400', 'R_ohm=1000']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/are one quantity and disagree/);
  });
  it('two temperature spellings with one number bind once on both surfaces', async () => {
    expect(valueOf('be-58', { T_K: 300, temperature: 300, R_ohm: 1000 })).toBe(valueOf('be-58', { T_K: 300, R_ohm: 1000 }));
    const r = await cli(['evaluate', 'be-58', 'T_K=300', 'temperature=300', 'R_ohm=1000']);
    expect(r.code, r.text).toBe(0);
  });
  it('a name outside the group is still unknown (control)', async () => {
    expect(() => evaluateRelation('be-58', { Tc_K: 300, R_ohm: 1000 })).toThrow(/is not an input here/);
    const r = await cli(['evaluate', 'be-58', 'Tc_K=300', 'R_ohm=1000']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/is not an input here/);
  });
});

describe('issue 544: a photon frequency and a plain frequency given together must agree', () => {
  it.each([
    ['photon-energy', 'nu=5e14', 'frequency=6e14'],
    ['photon-energy', 'photon-frequency=5e14', 'frequency=6e14'],
    ['speed', 'frequency=5e14', 'nu=6e14', 'wavelength=500nm'],
  ])('upt explain %s %s %s refuses the two numbers', async (...args) => {
    const r = await cli(['explain', ...args, '--source=canonical']);
    expect(r.code, r.text).toBe(1);
    expect(r.text).toMatch(/are one quantity and disagree/);
    expect(r.text).not.toMatch(/Recovered value/);
  });
  it('a plain frequency alone still does not bind the photon frequency (control, issue 473)', async () => {
    const r = await cli(['explain', 'photon-energy', 'frequency=5e14', '--source=canonical']);
    expect(r.text).not.toMatch(/Recovered value/);
  });
});

describe('issue 544: explain names a given input that the derivation did not use', () => {
  it('photon-energy from nu with a plain frequency also given says frequency was not used', async () => {
    const r = await cli(['explain', 'photon-energy', 'nu=5e14', 'frequency=5e14', '--source=canonical']);
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/not used: \{frequency\}/);
    expect(r.text).not.toMatch(/determined from \{nu, frequency\}/);
  });
  it('speed from frequency and wavelength with nu also given says photon-frequency was not used', async () => {
    const r = await cli(['explain', 'speed', 'frequency=5e14', 'nu=5e14', 'wavelength=500nm', '--source=canonical']);
    expect(r.code, r.text).toBe(0);
    expect(r.text).toMatch(/not used: \{photon-frequency\}/);
  });
  it('a derivation that uses every input names none as unused (control)', async () => {
    const r = await cli(['explain', 'photon-energy', 'nu=5e14', '--source=canonical']);
    expect(r.code, r.text).toBe(0);
    expect(r.text).not.toMatch(/not used/);
  });
});

describe('issue 528: be-37 has an evaluator on both surfaces, and the ray is radial', () => {
  const sun = { M_kg: 1.989e30, R_near_m: 6.957e8, R_far_m: 1.495978707e11 };
  it('upt evaluate be-37 prints the value evaluateRelation returns', async () => {
    const reference = valueOf('be-37', sun);
    const r = await cli(['evaluate', 'be-37', ...Object.entries(sun).map(([k, v]) => `${k}=${v}`)]);
    expect(r.code, r.text).toBe(0);
    expect(Math.abs(cliValue(r.text)! / reference - 1)).toBeLessThan(1e-12);
  });
  it('an impact parameter is refused on both surfaces: the relation is the radial delay', async () => {
    expect(() => evaluateRelation('be-37', { ...sun, b_m: 6.957e8 })).toThrow(/'b_m' is not an input here.*evaluateCovariantEikonalNumerical.*b_m/);
    const r = await cli(['evaluate', 'be-37', ...Object.entries({ ...sun, b_m: 6.957e8 }).map(([k, v]) => `${k}=${v}`)]);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/'b_m' is not an input here.*evaluateCovariantEikonalNumerical.*b_m/);
  });
});
