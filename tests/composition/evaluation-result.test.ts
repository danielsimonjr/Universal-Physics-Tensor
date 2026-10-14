/**
 * The evaluation result carries what the evaluator knows, from one builder.
 *
 * `evaluateRelation` and `upt evaluate` build their result with the same
 * `evaluateResolved`: the value, its dimension, the quantity it is (`name`), its
 * SI unit, the relation it comes from (`meaning`, a sign convention included),
 * and every extra output whose inputs were given (`extras`). The CLI prints and
 * serializes that object; it computes no label of its own. Before, the library
 * returned the value and dimension alone and dropped be-52's 43″/century, while
 * the CLI rebuilt the labels on its own path.
 *
 * The class checks run over every catalog evaluator, not the reported ones.
 */
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { BRIDGE_EVALUATORS } from '../../src/bridges/evaluators.js';
import { primaryRelation } from '../../src/bridges/catalog-load.js';
import { formulaVariables } from '../../src/bridges/expr-parse.js';
import { evaluateRelation, evaluateResolved, resolveEvaluable } from '../../src/composition/evaluate-relation.js';
import { equals } from '../../src/dimensional/algebra.js';
import { parseUnit } from '../../src/dimensional/units.js';
import type { EvaluatorSpec } from '../../src/bridges/evaluators.js';

function capture() {
  const lines: string[] = [];
  const err: string[] = [];
  return {
    lines,
    err,
    io: {
      out: (s?: string) => lines.push((s ?? '') + '\n'),
      err: (s?: string) => err.push((s ?? '') + '\n'),
      write: (s: string) => lines.push(s),
    },
  };
}

async function cli(args: string[]) {
  const cap = capture();
  const code = await runCli(args, cap.io);
  return { code, text: cap.lines.join(''), err: cap.err.join('') };
}

/** The parameter keys an extra output reads, read here from its expression. */
const readsOf = (spec: EvaluatorSpec, expression: string): string[] => {
  const reads = new Set(formulaVariables(expression));
  return spec.parameters.filter((p) => reads.has(p.key.replaceAll('-', '_'))).map((p) => p.key);
};

/**
 * Inputs at which every output of `spec` can be computed: the relation's reference inputs, with
 * any input only an output reads filled by 1 (a positive value inside every recorded domain).
 */
function fullInputs(spec: EvaluatorSpec): Record<string, number> | undefined {
  const reference = primaryRelation(spec.bridgeId)?.reference?.inputs;
  if (reference === undefined) return undefined;
  // Keyed by the contract key, the name the CLI reads (the reference is keyed by source names).
  const keyOf = (name: string): string => spec.contract.slots.find((slot) => slot.spellings.includes(name))?.key ?? name;
  // A source no parameter declares (a named constant's default) is not a CLI input: leave it to its default.
  const listed = new Set(spec.contract.slots.filter((slot) => slot.listed).map((slot) => slot.key));
  const inputs: Record<string, number> = Object.fromEntries(
    Object.entries(reference)
      .map(([k, v]) => [keyOf(k), v] as const)
      .filter(([k]) => listed.has(k)),
  );
  for (const output of spec.outputs) for (const key of readsOf(spec, output.expression)) inputs[key] ??= 1;
  return inputs;
}

const WITH_REFERENCE = [...BRIDGE_EVALUATORS.values()].filter((spec) => fullInputs(spec) !== undefined);
const WITH_OUTPUTS = [...BRIDGE_EVALUATORS.values()].filter((spec) => spec.outputs.length > 0);

describe('every evaluation names its quantity, unit and meaning', () => {
  it('the sweep is not vacuous', () => {
    expect(WITH_REFERENCE.length).toBeGreaterThan(100);
    expect(WITH_OUTPUTS.length).toBeGreaterThanOrEqual(5);
    expect(WITH_OUTPUTS.every((spec) => WITH_REFERENCE.includes(spec))).toBe(true);
  });

  it.each(WITH_REFERENCE.map((spec) => [spec.bridgeId, spec] as const))('be-%i', (id, spec) => {
    const relation = primaryRelation(id)!;
    const result = evaluateRelation(`be-${id}`, fullInputs(spec)!);
    if (result.kind === 'unset') return;
    expect(result.name).toBe(relation.target);
    expect(result.meaning).toBe(relation.label);
    // The unit is the dimension written out, in the form the unit reader reads back.
    expect(equals(parseUnit(result.unit).dim, result.dimension), `${result.unit}`).toBe(true);
  });
});

describe('every extra output reaches the library result (the class of be-52 per century)', () => {
  it.each(WITH_OUTPUTS.map((spec) => [spec.bridgeId, spec] as const))('be-%i returns each output whose inputs are given', (id, spec) => {
    const inputs = fullInputs(spec)!;
    const result = evaluateRelation(`be-${id}`, inputs);
    expect(result.kind).toBe('value');
    if (result.kind !== 'value') return;
    const raw = spec.run(inputs);
    expect(result.extras.map((e) => e.name)).toEqual(spec.outputs.map((o) => o.name));
    for (const output of spec.outputs) {
      const extra = result.extras.find((e) => e.name === output.name)!;
      expect(extra).toEqual({ name: output.name, value: raw[output.name], unit: output.unit, meaning: output.meaning });
    }
    // Leave out one input an output reads: that output, and only the outputs that read it, drop out.
    for (const output of spec.outputs) {
      for (const key of readsOf(spec, output.expression).filter((k) => !spec.inputKeys.includes(k) || spec.parameters.find((p) => p.key === k)?.optional === true)) {
        const { [key]: _dropped, ...fewer } = inputs;
        const partial = evaluateRelation(`be-${id}`, fewer);
        if (partial.kind !== 'value') continue;
        expect(partial.extras.map((e) => e.name)).toEqual(
          spec.outputs.filter((o) => !readsOf(spec, o.expression).includes(key)).map((o) => o.name),
        );
      }
    }
  });
});

describe('upt evaluate --json is the serialized library result', () => {
  it.each(WITH_REFERENCE.map((spec) => [spec.bridgeId, spec] as const))('be-%i', async (id, spec) => {
    const inputs = fullInputs(spec)!;
    const r = await cli(['evaluate', `be-${id}`, ...Object.entries(inputs).map(([k, v]) => `${k}=${v}`), '--json']);
    if (r.code !== 0) {
      // The CLI refuses exactly what the library refuses at the same inputs.
      expect(() => evaluateResolved(resolveEvaluable(id), inputs, 'all')).toThrow();
      return;
    }
    const library = JSON.parse(JSON.stringify(evaluateResolved(resolveEvaluable(id), inputs, 'all')));
    expect(JSON.parse(r.text).result.output).toEqual(library);
  });
});

describe('the dogfood repros', () => {
  const MERCURY = { M_kg: 1.989e30, a_m: 5.79e10, eccentricity: 0.2056 };

  it('evaluateRelation returns be-52 per century when T_yr is given, as the CLI prints it', async () => {
    const result = evaluateRelation('be-52', { ...MERCURY, T_yr: 0.2408 });
    expect(result.kind).toBe('value');
    if (result.kind !== 'value') return;
    const perCentury = result.extras.find((e) => e.name === 'precession_arcsec_per_century')!;
    expect(perCentury.unit).toBe('arcsec/century');
    expect(perCentury.value).toBeGreaterThan(42.9);
    expect(perCentury.value).toBeLessThan(43.1);
    const r = await cli(['evaluate', 'be-52', 'M_kg=1.989e30', 'a_m=5.79e10', 'eccentricity=0.2056', 'T_yr=0.2408']);
    expect(r.text).toContain(`precession_arcsec_per_century [arcsec/century] = ${perCentury.value} — ${perCentury.meaning}`);
    // Without T_yr the value is the same and there is no extra.
    const plain = evaluateRelation('be-52', MERCURY);
    expect(plain.kind === 'value' && plain.extras).toEqual([]);
  });

  it('evaluateRelation names be-120 and be-67 the way the CLI line does', async () => {
    const standoff = evaluateRelation('be-120', { B_E_T: 3.1e-5, rho_kg_per_m3: 8.36e-21, v_m_per_s: 4e5 });
    expect(standoff).toMatchObject({ kind: 'value', name: 'standoff-sixth', unit: '1' });
    const alfven = evaluateRelation('be-67', { B_T: 1e-8, rho_kg_per_m3: 1.67e-21 });
    expect(alfven).toMatchObject({ kind: 'value', name: 'alfven-speed', unit: 'm/s' });
    const r = await cli(['evaluate', 'be-67', 'B_T=1e-8', 'rho_kg_per_m3=1.67e-21']);
    if (alfven.kind === 'value') expect(r.text).toContain(`alfven-speed [m/s] = ${alfven.value} — ${alfven.meaning}`);
  });

  it('be-119 states its sign convention beside the signed value', async () => {
    const inputs = { Omega_rad_s: 2.7e-6, r_m: 1.5e11, theta_rad: 1.5708, v_r_m_per_s: 4e5 };
    const result = evaluateRelation('be-119', inputs);
    expect(result.kind === 'value' && result.value < 0).toBe(true);
    expect(result.kind === 'value' && result.meaning).toContain('B_φ/B_r = −Ω r sinθ / v_r');
    const r = await cli(['evaluate', 'be-119', ...Object.entries(inputs).map(([k, v]) => `${k}=${v}`)]);
    expect(r.text).toMatch(/spiral-ratio \[1\] = -1\.01\d* — Parker spiral B_φ\/B_r = −Ω r sinθ \/ v_r/);
  });
});
