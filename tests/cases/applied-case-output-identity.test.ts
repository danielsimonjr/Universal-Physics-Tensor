/**
 * Falsifiable identity harness for `case-resistor-noise` on the catalog engine
 * (PR #816 F6). `upt audit` walks the bridge graph and never reads applied
 * cases, so audit stdout cannot evidence this migration. This file pins the
 * engine's outputs, checks and unchecked strings on the catalog valid example
 * and the quantum failure example against a committed golden; mutating the
 * `S_V` prefactor (`4` → `5`) fails the golden.
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
const schema = dataSchema('applied-cases.json');
const ID = 'case-resistor-noise';

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
