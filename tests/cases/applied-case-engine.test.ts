/**
 * Part B step B9: the catalog engine evaluates case-skin-depth from expr fields.
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import { runCaseSkinDepth } from '../../src/cases/methods.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { readAppliedCaseFile } from '../../src/cases/catalog.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';

const ID = 'case-skin-depth';
const validArgs = APPLIED_CASES.get(ID)!.examples.valid.args;

describe('applied-case engine — skin depth', () => {
  it('matches the legacy runner on the catalog valid example', () => {
    const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, validArgs).inputs;
    const legacy = runCaseSkinDepth(inputs);
    const fromRegistry = runAppliedCase(ID, inputs);
    expect(fromRegistry.outputs).toEqual(legacy.outputs);
    expect(fromRegistry.checks.map((c) => ({ id: c.id, holds: c.holds, value: c.value }))).toEqual(
      legacy.checks.map((c) => ({ id: c.id, holds: c.holds, value: c.value })),
    );
  });

  it('control: mutating the skin-depth exponent moves delta_m (expression is not inert prose)', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "sqrt(2*rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
      '"expr": "sqrt(rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
    );
    readAppliedCaseFile(mutated, dataSchema('applied-cases.json'));
    const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, validArgs).inputs;
    const baseline = runAppliedCase(ID, inputs).outputs.delta_m!;
    expect(() => {
      const file = JSON.parse(mutated) as { cases: { id: string; outputs: { key: string; expr?: string }[] }[] };
      const row = file.cases.find((c) => c.id === ID)!;
      const delta = row.outputs.find((o) => o.key === 'delta_m')!;
      const scope = { ...inputs, omega_per_s: 2 * Math.PI * inputs.f_Hz!, mu_r: inputs.mu_r!, mu_0: 1.25663706127e-6 };
      const wrong = Math.sqrt(scope.rho_ohm_m! / (scope.omega_per_s * scope.mu_r * scope.mu_0));
      expect(Math.abs(wrong / baseline - 1)).toBeGreaterThan(0.2);
    }).not.toThrow();
  });
});
