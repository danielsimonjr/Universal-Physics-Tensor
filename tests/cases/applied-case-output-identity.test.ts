/**
 * Falsifiable identity harness for `case-resistor-noise` (PR #816 F6) and
 * `case-lumped-cooling` (S7) on the catalog engine. `upt audit` walks the
 * bridge graph and never reads applied cases, so audit stdout cannot evidence
 * these migrations. Each case pins the engine's outputs, checks and unchecked
 * strings on a grid of catalog inputs against a committed golden generated
 * from the deleted JS runner; mutating a wired `expr` fails the golden.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES } from '../../src/cases/index.js';
import { appliedCaseRecord, readAppliedCaseFile } from '../../src/cases/catalog.js';
import { runAppliedCaseEngine } from '../../src/cases/engine.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { dataSchema, dataText } from '../../src/core/data-file.js';
import type { CaseResult } from '../../src/cases/types.js';

const require = createRequire(import.meta.url);
const golden = require('./golden/case-resistor-noise.identity.json') as IdentityGolden;
const lumpedGolden = require('./golden/case-lumped-cooling.identity.json') as Record<string, IdentitySnapshot>;
const schema = dataSchema('applied-cases.json');
const ID = 'case-resistor-noise';
const LUMPED_ID = 'case-lumped-cooling';

interface IdentitySnapshot {
  outputs: Record<string, number | null>;
  checks: { id: string; holds: boolean; value: number; bound: number }[];
  unchecked: string[];
}

interface IdentityGolden {
  valid: IdentitySnapshot;
  failureQuantum: IdentitySnapshot;
}

function snapshot(result: CaseResult): IdentitySnapshot {
  const outputs: Record<string, number | null> = {};
  for (const key of Object.keys(result.outputs).sort()) {
    outputs[key] = result.outputs[key] ?? null;
  }
  return {
    outputs,
    checks: result.checks.map((c) => ({ id: c.id, holds: c.holds, value: c.value, bound: c.bound })),
    unchecked: [...result.unchecked],
  };
}

function runExample(args: readonly string[]): CaseResult {
  const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, [...args]).inputs;
  return runAppliedCaseEngine(appliedCaseRecord(ID), inputs);
}

function expectPinNumber(got: number, expected: number, label: string): void {
  if (expected === 0) {
    expect(Math.abs(got), label).toBeLessThanOrEqual(1e-15);
    return;
  }
  expect(Math.abs(got / expected - 1), label).toBeLessThan(1e-12);
}

function assertIdentity(got: CaseResult, expected: IdentitySnapshot, label: string): void {
  const live = snapshot(got);
  expect(Object.keys(live.outputs), `${label} output keys`).toEqual(Object.keys(expected.outputs));
  for (const [key, value] of Object.entries(expected.outputs)) {
    const gotValue = live.outputs[key];
    if (value === null) {
      expect(gotValue, `${label}.${key}`).toBeNull();
      continue;
    }
    expect(gotValue, `${label}.${key}`).not.toBeNull();
    if (key === 'parent_deviation') {
      expect(Math.abs((gotValue as number) - value), `${label}.${key}`).toBeLessThan(1e-14);
    } else {
      expectPinNumber(gotValue as number, value, `${label}.${key}`);
    }
  }
  expect(
    live.checks.map((c) => ({ id: c.id, holds: c.holds, bound: c.bound })),
    `${label} checks`,
  ).toEqual(expected.checks.map((c) => ({ id: c.id, holds: c.holds, bound: c.bound })));
  expect(live.checks).toHaveLength(expected.checks.length);
  for (let i = 0; i < expected.checks.length; i++) {
    expectPinNumber(live.checks[i]!.value, expected.checks[i]!.value, `${label}.${expected.checks[i]!.id}`);
  }
  expect(live.unchecked, `${label} unchecked`).toEqual(expected.unchecked);
}

describe('case-resistor-noise output identity (not audit)', () => {
  const examples = APPLIED_CASES.get(ID)!.examples;

  it('the catalog valid example matches the committed golden', () => {
    assertIdentity(runExample(examples.valid.args), golden.valid, 'valid');
  });

  it('the quantum failure example matches the committed golden', () => {
    assertIdentity(runExample(examples.failures[0]!.args), golden.failureQuantum, 'failureQuantum');
  });

  it('CONTROL: mutating the S_V prefactor fails the valid-example golden', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace('"expr": "4*k_B*T_K*R_eff_ohm"', '"expr": "5*k_B*T_K*R_eff_ohm"');
    expect(mutated, 'the S_V expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === ID)!;
    const inputs = resolveEvaluatorInputs(APPLIED_CASES.get(ID)!.parameters, [...examples.valid.args]).inputs;
    const got = runAppliedCaseEngine(record, inputs);
    expect(() => assertIdentity(got, golden.valid, 'mutated')).toThrow(/to be less (or equal )?than/);
  });
});

describe('case-lumped-cooling output identity (S7)', () => {
  // The grid the committed golden was generated from master's
  // runCaseLumpedCooling over: small and large t/tau (including t_s = 0),
  // Bi above and below 0.1, emissivity 0/0.05/0.8/1, T0 above and below
  // T_inf. Every value is finite (JSON cannot carry Infinity).
  const base = {
    a_m: 5e-3, rho_kg_per_m3: 8933, c_J_per_kg_K: 385, k_W_per_m_K: 401, h_W_per_m2_K: 20,
    emissivity: 0.05, T0_K: 373.15, T_inf_K: 293.15, t_s: 300,
  };
  const grid: Record<string, Record<string, number>> = {
    valid: { ...base },
    tZero: { ...base, t_s: 0 },
    largeT: { ...base, t_s: 2866 },
    warming: { ...base, T0_K: 293.15, T_inf_K: 373.15, t_s: 286.6 },
    biAbove: { a_m: 5e-2, rho_kg_per_m3: 7854, c_J_per_kg_K: 434, k_W_per_m_K: 60.5, h_W_per_m2_K: 1000, emissivity: 0, T0_K: 363.15, T_inf_K: 293.15, t_s: 600 },
    biMid: { a_m: 5e-2, rho_kg_per_m3: 7854, c_J_per_kg_K: 434, k_W_per_m_K: 60.5, h_W_per_m2_K: 100, emissivity: 0, T0_K: 363.15, T_inf_K: 293.15, t_s: 600 },
    emissivityOne: { ...base, emissivity: 1, T0_K: 1000, T_inf_K: 300, t_s: 60 },
    hotSteel: { a_m: 5e-3, rho_kg_per_m3: 7854, c_J_per_kg_K: 434, k_W_per_m_K: 60.5, h_W_per_m2_K: 10, emissivity: 0.8, T0_K: 1000, T_inf_K: 300, t_s: 60 },
  };

  for (const [name, inputs] of Object.entries(grid)) {
    it(`the ${name} grid point matches the committed golden`, () => {
      assertIdentity(runAppliedCaseEngine(appliedCaseRecord(LUMPED_ID), inputs), lumpedGolden[name]!, name);
    });
  }

  it('CONTROL: mutating the tau_s prefactor (3 → 4, a coefficient change) fails every golden point', () => {
    const text = dataText('applied-cases.json');
    const mutated = text.replace(
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(3*h_W_per_m2_K)"',
      '"expr": "rho_kg_per_m3*c_J_per_kg_K*a_m/(4*h_W_per_m2_K)"',
    );
    expect(mutated, 'the tau_s expr must occur once to replace').not.toBe(text);
    const file = readAppliedCaseFile(mutated, schema);
    const record = file.cases.find((c) => c.id === LUMPED_ID)!;
    for (const [name, inputs] of Object.entries(grid)) {
      const got = runAppliedCaseEngine(record, inputs);
      expect(() => assertIdentity(got, lumpedGolden[name]!, `mutated ${name}`)).toThrow(/to be less (or equal )?than/);
    }
  });
});
