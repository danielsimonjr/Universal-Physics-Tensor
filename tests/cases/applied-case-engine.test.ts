/**
 * Part B steps B9–B11: the catalog engine evaluates wired cases from expr, relation, and method fields.
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import {
  runCaseDampedResonator,
  runCaseKeplerRv,
  runCaseSkinDepth,
} from '../../src/cases/methods.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { evaluateFormula } from '../../src/bridges/expr-parse.js';
import { catalogSemanticProblems, readAppliedCaseFile } from '../../src/cases/catalog.js';
import { CASE_METHOD_NAMES } from '../../src/cases/methods.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';

const schema = dataSchema('applied-cases.json');

function legacyMatch(id: string, legacy: (i: Readonly<Record<string, number>>) => { outputs: unknown; checks: { id: string; holds: boolean; value: number }[] }) {
  const validArgs = APPLIED_CASES.get(id)!.examples.valid.args;
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(id)!.parameters, validArgs).inputs;
  const fromLegacy = legacy(inputs);
  const fromRegistry = runAppliedCase(id, inputs);
  for (const [key, value] of Object.entries(fromLegacy.outputs as Record<string, number | null>)) {
    const got = fromRegistry.outputs[key];
    if (value === null) expect(got).toBeNull();
    else if (Math.abs(value) > 1) expect(Math.abs((got as number) / value - 1)).toBeLessThan(1e-12);
    else expect(got).toBeCloseTo(value, 10);
  }
  expect(fromRegistry.checks.map((c) => ({ id: c.id, holds: c.holds }))).toEqual(
    fromLegacy.checks.map((c) => ({ id: c.id, holds: c.holds })),
  );
  for (let i = 0; i < fromLegacy.checks.length; i++) {
    const legacyVal = fromLegacy.checks[i]!.value;
    const gotVal = fromRegistry.checks[i]!.value;
    if (Math.abs(legacyVal) > 1) expect(Math.abs(gotVal / legacyVal - 1)).toBeLessThan(1e-12);
    else expect(gotVal).toBeCloseTo(legacyVal, 10);
  }
}

describe('applied-case engine — skin depth', () => {
  const ID = 'case-skin-depth';
  const validArgs = APPLIED_CASES.get(ID)!.examples.valid.args;

  it('matches the legacy runner on the catalog valid example', () => {
    legacyMatch(ID, runCaseSkinDepth);
  });

  it('control: mutating the skin-depth exponent moves delta_m (expression is not inert prose)', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "sqrt(2*rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
      '"expr": "sqrt(rho_ohm_m/(omega_per_s*mu_r*mu_0))"',
    );
    readAppliedCaseFile(mutated, schema);
    const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, validArgs).inputs;
    const baseline = runAppliedCase(ID, inputs).outputs.delta_m!;
    const file = JSON.parse(mutated) as { cases: { id: string; outputs: { key: string; expr?: string }[] }[] };
    const row = file.cases.find((c) => c.id === ID)!;
    const delta = row.outputs.find((o) => o.key === 'delta_m')!;
    expect(delta.expr).toContain('rho_ohm_m');
    const scope = { ...inputs, omega_per_s: 2 * Math.PI * inputs.f_Hz!, mu_r: inputs.mu_r!, mu_0: 1.25663706127e-6 };
    const wrong = Math.sqrt(scope.rho_ohm_m! / (scope.omega_per_s * scope.mu_r * scope.mu_0));
    expect(Math.abs(wrong / baseline - 1)).toBeGreaterThan(0.2);
  });
});

describe('applied-case engine — kepler RV', () => {
  it('matches the legacy runner on the catalog valid example', () => {
    legacyMatch('case-kepler-rv', runCaseKeplerRv);
  });

  it('refuses an unknown relation id at catalog validation', () => {
    const text = dataText('applied-cases.json');
    const file = JSON.parse(text) as ReturnType<typeof readAppliedCaseFile>;
    const row = file.cases.find((c) => c.id === 'case-kepler-rv')!;
    const dphi = row.outputs.find((o) => o.key === 'dphi_rad_per_orbit')!;
    dphi.relation = { relation: 'be-99999', inputs: dphi.relation!.inputs };
    expect(catalogSemanticProblems(file, CASE_METHOD_NAMES)).toContainEqual(
      expect.stringMatching(/unknown relation 'be-99999'/),
    );
  });
});

describe('applied-case engine — damped resonator', () => {
  it('matches the legacy runner on the catalog valid example', () => {
    legacyMatch('case-damped-resonator', runCaseDampedResonator);
  });

  it('control: mutating the envelope decay moves envelope_m', () => {
    const inputs = resolveEvaluatorInputs(
      APPLIED_CASES.get('case-damped-resonator')!.parameters,
      APPLIED_CASES.get('case-damped-resonator')!.examples.valid.args,
    ).inputs;
    const baseline = runAppliedCase('case-damped-resonator', inputs).outputs.envelope_m!;
    const mutatedExpr = 'abs(x0_m)*exp(-2*alpha_per_s*t_s)/sqrt(1-1/(4*Q*Q))';
    const scope = runAppliedCase('case-damped-resonator', inputs).outputs;
    const wrong = evaluateFormula(mutatedExpr, { ...inputs, ...scope } as Record<string, number>);
    expect(Math.abs(wrong / baseline - 1)).toBeGreaterThan(0.05);
  });
});
