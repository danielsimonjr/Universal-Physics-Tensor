/**
 * The applied-case registry (audit §14 I20): every case is complete — parent
 * and scalar equations, an observable among its outputs, conditions, a route to
 * a measurement — and its worked examples do what they say: the valid one
 * passes every regime check, each failure example violates exactly the checks
 * it names.
 */
import { describe, expect, it } from 'vitest';
import { APPLIED_CASES, runAppliedCase } from '../../src/cases/index.js';
import { resolveEvaluatorInputs } from '../../src/bridges/evaluator-inputs.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { ATLAS_FAMILIES } from '../../src/atlas/families.js';
import { canonicalById } from '../../src/canonical/registry.js';
import { parseUnit } from '../../src/dimensional/units.js';
import { MissingInputError, NonFiniteInputError, UnknownInputError } from '../../src/bridges/evaluation-errors.js';

const cases = [...APPLIED_CASES.values()];
const runExample = (id: string, args: readonly string[]) =>
  runAppliedCase(id, resolveEvaluatorInputs(APPLIED_CASES.get(id)!.parameters, args).inputs);

describe('APPLIED_CASES', () => {
  it('registers the cases by id', () => {
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) expect(APPLIED_CASES.get(c.id)).toBe(c);
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s states parent and scalar equations, an observable, conditions and a measurement route', (_, c) => {
    expect(c.governing.parent.length).toBeGreaterThan(0);
    expect(c.governing.scalar.length).toBeGreaterThan(0);
    for (const s of c.governing.scalar) expect(c.governing.parent).not.toContain(s);
    expect(c.governing.distinction.length).toBeGreaterThan(40);
    expect(c.outputs.map((o) => o.key)).toContain(c.observable);
    expect(c.conditions.length).toBeGreaterThan(0);
    expect(c.measurement.length).toBeGreaterThan(0);
    expect(c.notIncluded.length).toBeGreaterThan(0);
    expect(c.examples.failures.length).toBeGreaterThan(0);
    for (const o of c.outputs) expect(() => parseUnit(o.unit), `${c.id} ${o.key}`).not.toThrow();
    expect(new Set(c.parameters.map((p) => p.key)).size).toBe(c.parameters.length);
    if (c.comparison !== undefined) {
      const keys = c.outputs.map((o) => o.key);
      for (const k of [c.comparison.valueKey, c.comparison.referenceKey, c.comparison.deviationKey]) expect(keys).toContain(k);
    }
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s: the valid example passes every check and reports every declared output', (_, c) => {
    const r = runExample(c.id, c.examples.valid.args);
    expect(Object.keys(r.outputs).sort()).toEqual(c.outputs.map((o) => o.key).sort());
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.checks.filter((k) => !k.holds).map((k) => k.id)).toEqual([]);
    expect(c.examples.valid.fails).toEqual([]);
    for (const o of c.outputs) {
      const v = r.outputs[o.key];
      expect(v === null || Number.isFinite(v), `${c.id} ${o.key}`).toBe(true);
    }
    expect(r.outputs[c.observable]).not.toBeNull();
    if (c.comparison !== undefined) {
      const { valueKey, referenceKey, deviationKey } = c.comparison;
      expect(r.outputs[deviationKey]).toBeCloseTo(r.outputs[valueKey]! / r.outputs[referenceKey]! - 1, 12);
    }
  });

  it.each(cases.map((c) => [c.id, c] as const))('%s: each failure example violates exactly the checks it names', (_, c) => {
    for (const ex of c.examples.failures) {
      const r = runExample(c.id, ex.args);
      expect(ex.fails.length, ex.note).toBeGreaterThan(0);
      expect(r.checks.filter((k) => !k.holds).map((k) => k.id).sort(), ex.args.join(' ')).toEqual([...ex.fails].sort());
    }
  });

  // A second source for each link: the catalog, the atlas and the canonical registry themselves.
  it.each(cases.map((c) => [c.id, c] as const))('%s links only records that exist', (_, c) => {
    const catalog = new Set(BRIDGE_EQUATIONS.map((b) => `be-${b.id}`));
    const atlas = new Set(
      ATLAS_FAMILIES.flatMap((f) => [...f.models.map((m) => m.id), ...f.bridges.map((b) => b.id), ...f.rejections.map((r) => r.id)]),
    );
    for (const { id } of c.links) {
      if (id.startsWith('be-')) expect(catalog.has(id), id).toBe(true);
      else if (id.startsWith('CE-')) expect(canonicalById(id), id).toBeDefined();
      else expect(atlas.has(id), id).toBe(true);
    }
  });

  it('control: the link check fails on a record that does not exist', () => {
    const atlas = new Set(ATLAS_FAMILIES.flatMap((f) => f.bridges.map((b) => b.id)));
    expect(atlas.has('ab-no-such-bridge')).toBe(false);
    expect(canonicalById('CE-no-such-entry')).toBeUndefined();
  });

  it('refuses an unknown case and a missing input', () => {
    expect(() => runAppliedCase('case-none', {})).toThrow(/no case 'case-none'/);
    expect(() => runAppliedCase(cases[0]!.id, {})).toThrow(MissingInputError);
  });

  it('checks a case input through the same contract as an evaluator: unknown key, non-finite, missing', () => {
    for (const c of cases) {
      const valid = resolveEvaluatorInputs(c.parameters, c.examples.valid.args).inputs;
      const first = Object.keys(valid)[0]!;
      expect(() => runAppliedCase(c.id, { ...valid, no_such_input: 1 })).toThrow(UnknownInputError);
      for (const bad of [NaN, Infinity, -Infinity]) {
        expect(() => runAppliedCase(c.id, { ...valid, [first]: bad })).toThrow(NonFiniteInputError);
      }
      const { [first]: _dropped, ...rest } = valid;
      const required = c.parameters.find((p) => p.key === first)?.optional !== true;
      if (required) expect(() => runAppliedCase(c.id, rest)).toThrow(MissingInputError);
    }
  });
});
