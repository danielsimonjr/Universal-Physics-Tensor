import { describe, expect, it } from 'vitest';
import { DomainViolationError } from '../../src/composition/edge.js';
import { evaluateRelation, evaluatorOutput } from '../../src/composition/evaluate-relation.js';
import { BRIDGE_EVALUATORS, unusedInputKeys } from '../../src/bridges/evaluators.js';
import { siUnitOf } from '../../src/cli/expr-print.js';
import { runCli } from '../../dist/cli/main.js';

const DAMPING_INPUTS = { c_kg_per_s: 2, k_N_per_m: 1, m_kg: 1 };
const MERCURY = { M_kg: 1.989e30, a_m: 5.7909e10, e: 0.2056 };

function capture() {
  const lines: string[] = [];
  const sink = (s?: string) => lines.push((s ?? '') + '\n');
  return { lines, io: { out: sink, err: sink, write: (s: string) => lines.push(s) } };
}

describe('a missing input is not a domain violation (issue 454)', () => {
  it('names the missing key and lists the inputs', () => {
    expect(() => evaluateRelation('be-133', { c_kg_per_s: 2, k_N_per_m: 1 })).toThrow(/missing input 'm_kg'/);
    expect(() => evaluateRelation('be-133', { c_kg_per_s: 2, k_N_per_m: 1 })).toThrow(/c_kg_per_s, k_N_per_m, m_kg/);
    expect(() => evaluateRelation('be-133', { c_kg_per_s: 2, k_N_per_m: 1 })).not.toThrow(DomainViolationError);
  });
  it('a call with no inputs names every missing key, not only the first', () => {
    expect(() => evaluateRelation('be-126', {})).toThrow(/missing input.*n.*eps_F_per_m/s);
  });
  it('a physically bad value is still a domain violation (control)', () => {
    expect(() => evaluateRelation('be-133', { ...DAMPING_INPUTS, m_kg: 0 })).toThrow(DomainViolationError);
  });
});

describe('an unknown key and a non-number are refused (issue 455)', () => {
  it('rejects zzz and names the inputs', () => {
    expect(() => evaluateRelation('be-133', { ...DAMPING_INPUTS, zzz: 3 })).toThrow(/'zzz' is not an input/);
    expect(() => evaluateRelation('be-133', { ...DAMPING_INPUTS, zzz: 3 })).toThrow(/c_kg_per_s/);
  });
  it('rejects a typo of a key (T_k for T_K)', () => {
    expect(() => evaluateRelation('be-87', { T_k: 300, C_F: 1e-12 })).toThrow(/'T_k' is not an input/);
  });
  it('names the key whose value is not a number', () => {
    expect(() => evaluateRelation('be-133', { ...DAMPING_INPUTS, c_kg_per_s: '2' as unknown as number })).toThrow(
      /c_kg_per_s.*number/,
    );
  });
  it('accepts the declared keys and the edge quantity names (control)', () => {
    expect(evaluateRelation('be-133', DAMPING_INPUTS).kind).toBe('value');
  });
});

describe('a declared alternate works in the library, and T_yr is not an input (issue 479)', () => {
  it('major_axis_m is 2a', () => {
    const a = evaluateRelation('be-52', MERCURY);
    const b = evaluateRelation('be-52', { M_kg: 1.989e30, major_axis_m: 2 * 5.7909e10, e: 0.2056 });
    expect(a.kind === 'value' && b.kind === 'value' && a.value === b.value).toBe(true);
  });
  it('a_m and major_axis_m together are an error', () => {
    expect(() => evaluateRelation('be-52', { ...MERCURY, major_axis_m: 3e10 })).toThrow(/given twice/);
  });
  it('T_yr has no effect on the value, so it is not an input', () => {
    expect(() => evaluateRelation('be-52', { ...MERCURY, T_yr: 0.2408 })).toThrow(/'T_yr' is not an input/);
    expect(BRIDGE_EVALUATORS.get(52)!.parameters.map((p) => p.key)).not.toContain('T_yr');
  });
});

describe('the output carries its name and unit (issue 460)', () => {
  it('evaluatorOutput names the target and its SI unit', () => {
    const o = evaluatorOutput(BRIDGE_EVALUATORS.get(120)!);
    expect(o.name).toBe('standoff-sixth');
    expect(siUnitOf(o.dimension!)).toBe('1');
    expect(siUnitOf(evaluatorOutput(BRIDGE_EVALUATORS.get(67)!).dimension!)).toBe('m/s');
  });
  it('the text line names it', async () => {
    const cap = capture();
    await runCli(['evaluate', 'be-67', 'B_T=1e-8', 'rho_kg_per_m3=1.67e-21'], cap.io);
    expect(cap.lines.join('')).toMatch(/\n {2}alfven-speed \[m\/s\] = 2\d{5}/);
  });
  it('the JSON output keeps value and adds name, unit, and dimension', async () => {
    const cap = capture();
    await runCli(['evaluate', 'be-67', 'B_T=1e-8', 'rho_kg_per_m3=1.67e-21', '--json'], cap.io);
    const out = JSON.parse(cap.lines.join('')).result.output;
    expect(typeof out.value).toBe('number');
    expect(out.unit).toBe('m/s');
    expect(typeof out.name).toBe('string');
  });
});

describe('the help names what be-55 prints (issue 448)', () => {
  it('says the conductance e²/h, with R_K = h/e² as its reciprocal', async () => {
    const cap = capture();
    await runCli(['help', 'evaluate'], cap.io);
    const text = cap.lines.join('');
    expect(text).toMatch(/be-55 C=1.*e²\/h/);
    expect(text).not.toMatch(/be-55 C=1\s+→ quantum Hall R_H = von Klitzing constant/);
  });
});

describe('a required input that does not enter the formula is said so (issue 451)', () => {
  it.each([
    [88, ['m_kg']],
    [139, ['Nc_per_m3', 'ND_per_m3']],
    [144, ['C_ohm_m_s']],
    [146, ['lambda0_m']],
  ])('be-%i', (id, keys) => {
    expect(unusedInputKeys(BRIDGE_EVALUATORS.get(id)!)).toEqual(expect.arrayContaining(keys));
  });
  it('be-133 uses every input (control)', () => {
    expect(unusedInputKeys(BRIDGE_EVALUATORS.get(133)!)).toEqual([]);
  });
  it('the unused list is exactly the five evaluators above, so a new one is a decision (control against a blanket flag)', () => {
    const rows = [...BRIDGE_EVALUATORS].filter(([, spec]) => unusedInputKeys(spec).length > 0).map(([id]) => id);
    expect(rows).toEqual([88, 139, 144, 146, 170]);
  });
  it('the CLI prints the note', async () => {
    const cap = capture();
    await runCli(['evaluate', 'be-88', 'n_per_m3=8.47e28', 'm_kg=9.1093837015e-31'], cap.io);
    expect(cap.lines.join('')).toMatch(/m_kg.*does not enter/);
  });
});
