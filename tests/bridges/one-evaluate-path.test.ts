/**
 * One evaluation of a catalog closed form. `evaluateRelation`, `evaluateBridge`,
 * the CLI and the uncertainty probes all call the evaluator's `run`, and `run`
 * checks the bindings against the evaluator's input contract before the domain.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_EVALUATORS, evaluateBridge, unusedInputKeys } from '../../src/bridges/evaluators.js';
import { inputContract, type InputSlot } from '../../src/bridges/input-contract.js';
import { APPLIED_CASES, CASE_CONTRACTS } from '../../src/cases/index.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { evaluableContract, resolveEvaluable } from '../../src/composition/evaluate-relation.js';
import { equals } from '../../src/dimensional/algebra.js';
import { quantityRecord } from '../../src/dimensional/quantity-registry.js';
import { constantRecord } from '../../src/dimensional/symbolic-constants.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { unitDimension } from '../../src/dimensional/units.js';
import { CANONICAL_GRAPH } from '../../src/composition/canonical-graph.js';
import { primaryRelation } from '../../src/bridges/catalog-load.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';
import { evaluateEdge } from '../../src/composition/edge.js';
import {
  DomainViolationError,
  DuplicateInputError,
  evaluateRelation,
  InputTypeError,
  MissingInputError,
  NonFiniteInputError,
  UnknownInputError,
} from '../../src/index.js';

const DAMPING = { c_kg_per_s: 2, k_N_per_m: 1, m_kg: 1 };

describe('the input contract runs before the domain, on every entry', () => {
  const entries: [string, (id: number, inputs: Record<string, number>) => unknown][] = [
    ['run', (id, inputs) => BRIDGE_EVALUATORS.get(id)!.run(inputs)],
    ['evaluateBridge', (id, inputs) => evaluateBridge(id, inputs)],
    ['evaluateRelation', (id, inputs) => evaluateRelation(`be-${id}`, inputs)],
  ];

  it.each(entries)('%s: an absent input is a MissingInputError naming it', (_, call) => {
    let caught: unknown;
    try {
      call(133, { c_kg_per_s: 2, k_N_per_m: 1 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MissingInputError);
    expect((caught as MissingInputError).missing).toEqual(['m_kg']);
    expect((caught as Error).message).toBe("be-133: missing input 'm_kg'; the inputs are: c_kg_per_s, k_N_per_m, m_kg");
  });

  it.each(entries)('%s: an unknown key is an UnknownInputError, a string an InputTypeError', (_, call) => {
    expect(() => call(133, { ...DAMPING, zzz: 3 })).toThrow(UnknownInputError);
    expect(() => call(133, { ...DAMPING, m_kg: '1' as unknown as number })).toThrow(InputTypeError);
    expect(() => call(133, { ...DAMPING, m_kg: '1' as unknown as number })).toThrow(TypeError);
  });

  it.each(entries)('%s: a value outside the domain is a DomainViolationError, so the input check can fail', (_, call) => {
    expect(() => call(133, { ...DAMPING, k_N_per_m: -1 })).toThrow(DomainViolationError);
    expect(() => call(133, { ...DAMPING, k_N_per_m: -1 })).not.toThrow(MissingInputError);
  });

  it.each(entries)('%s: NaN and ±Infinity are a NonFiniteInputError, before the domain', (_, call) => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      let caught: unknown;
      try {
        call(133, { ...DAMPING, c_kg_per_s: bad });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(NonFiniteInputError);
      expect(caught).not.toBeInstanceOf(DomainViolationError);
      expect((caught as NonFiniteInputError).key).toBe('c_kg_per_s');
      expect(Object.is((caught as NonFiniteInputError).value, bad)).toBe(true);
    }
  });

  it.each(entries)('%s: a non-finite input on be-126 is refused before its formula runs', (_, call) => {
    const inputs = { ...primaryRelation(126)!.reference!.inputs };
    const key = Object.keys(inputs)[0]!;
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => call(126, { ...inputs, [key]: bad })).toThrow(NonFiniteInputError);
    }
  });

  it('evaluateRelation on an edge with no evaluator refuses a non-finite input the same way', () => {
    const edge = CANONICAL_GRAPH.find((candidate) => candidate.sources.length > 0)!;
    const bindings = Object.fromEntries(edge.sources.map((source) => [source.name, 1]));
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(() => evaluateRelation(edge.id, { ...bindings, [edge.sources[0]!.name]: bad })).toThrow(NonFiniteInputError);
    }
  });

  it('the issue 454 ids name their absent inputs, never the domain', () => {
    expect(() => BRIDGE_EVALUATORS.get(126)!.run({ n: 10, eps_F_per_m: 8.85e-12, h_m: 1e-5, V_volts: 10 })).toThrow(/missing input 'g_m'/);
    expect(() => BRIDGE_EVALUATORS.get(77)!.run({ R_m: 0.01, deltaP_Pa: 100, L_m: 1 })).toThrow(/missing input 'mu_Pa_s'/);
    expect(() => BRIDGE_EVALUATORS.get(55)!.run({})).toThrow(/missing input 'C'/);
  });

  it('a relation source and its alias bind the same input; both at once is a DuplicateInputError', () => {
    const spec = BRIDGE_EVALUATORS.get(133)!;
    const bySource = spec.run({ 'damping-dashpot': 2, 'damping-spring': 1, 'damping-inertia': 1 });
    expect(bySource.value).toBe(spec.run(DAMPING).value);
    expect(() => spec.run({ ...DAMPING, 'damping-inertia': 1 })).toThrow(DuplicateInputError);
  });

  it('an input only an extra output reads is optional: the output is left out without it', () => {
    // be-139: N_c and N_D feed only Ec_minus_EF_J. Without them the run returns the value alone;
    // the relation's value (the graph edge) does not read them. One rule for every evaluator
    // (output-only-inputs.test.ts); be-52's period was the only declared case before.
    const spec = BRIDGE_EVALUATORS.get(139)!;
    const core = { T_K: 300, mh_kg: 2, me_kg: 1 };
    expect(Object.keys(spec.run(core))).toEqual(['value']);
    expect(Object.keys(spec.run({ ...core, Nc_per_m3: 1e25, ND_per_m3: 1e22 }))).toEqual(['value', 'Ec_minus_EF_J']);
    const valueOnly = spec.run(core, 'value');
    expect(Object.keys(valueOnly)).toEqual(['value']);
    expect(valueOnly.value).toBe(spec.run({ ...core, Nc_per_m3: 1e25, ND_per_m3: 1e22 }).value);
    expect(evaluateRelation('be-139', core)).toMatchObject({ kind: 'value', value: valueOnly.value });
    // A value input is still required when only the value is wanted.
    expect(() => spec.run({ T_K: 300, mh_kg: 2 }, 'value')).toThrow(/missing input 'me_kg'/);
  });

  it('an alternate converts onto its key', () => {
    const spec = BRIDGE_EVALUATORS.get(52)!;
    const mercury = { M_kg: 1.989e30, eccentricity: 0.2056 };
    expect(spec.run({ ...mercury, major_axis_m: 2 * 5.79e10 }).value).toBe(spec.run({ ...mercury, a_m: 5.79e10 }).value);
    expect(() => spec.run({ ...mercury, a_m: 5.79e10, major_axis_m: 1.158e11 })).toThrow(/given twice/);
  });
});

describe('the closed form and the graph edge are one number', () => {
  const withReference = [...BRIDGE_EVALUATORS.keys()].filter((id) => primaryRelation(id)?.reference !== undefined);

  it('the comparison is not vacuous', () => {
    expect(withReference.length).toBeGreaterThan(100);
  });

  it.each(withReference)('be-%i: evaluateRelation at the reference inputs is the edge evaluation', (id) => {
    const relation = primaryRelation(id)!;
    const edge = CATALOG_GRAPH.find((candidate) => candidate.id === relation.id)!;
    const inputs = { ...relation.reference!.inputs };
    const viaEdge = evaluateEdge(edge, { ...inputs });
    const result = evaluateRelation(`be-${id}`, inputs);
    if (result.kind === 'value') expect(result.value).toBe(viaEdge);
    else expect(Number.isFinite(viaEdge)).toBe(false);
  });
});

describe('an input contract binds each spelling to one slot', () => {
  it('building a contract whose spelling names two slots fails at once', () => {
    const slot = (key: string, spellings: string[]) => ({ key, spellings, alternates: [], optional: false, readBy: 'value' as const, listed: true });
    expect(() => inputContract('t', [slot('a', ['a', 'x']), slot('b', ['b', 'x'])])).toThrow(/spells 'x' for both 'a' and 'b'/);
    expect(() =>
      inputContract('t', [slot('a', ['a']), { ...slot('b', ['b']), alternates: [{ key: 'a', toKey: 2 }] }]),
    ).toThrow(/spells 'a' for both 'a' and 'b'/);
    expect(() => inputContract('t', [slot('a', ['a']), slot('b', ['b'])])).not.toThrow();
  });

  it('every catalog and canonical edge builds its contract (an absent input, never a spelling clash)', () => {
    for (const edge of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) {
      try {
        evaluateRelation(edge.id, {});
      } catch (e) {
        expect((e as Error).message).not.toMatch(/input contract spells/);
      }
    }
  });
});

describe('unusedInputKeys reads the output expressions through the formula grammar', () => {
  it('an input an extra output reads is not unused', () => {
    // be-139: Nc_per_m3 and ND_per_m3 own no relation source; an extra output reads them.
    const unused = unusedInputKeys(BRIDGE_EVALUATORS.get(139)!);
    expect(unused).not.toContain('Nc_per_m3');
    expect(unused).not.toContain('ND_per_m3');
  });
});

describe('a bare e is the elementary charge in every input contract', () => {
  const CHARGE = constantRecord('e')!.dim;
  const spellsE = (slot: InputSlot): boolean => [...slot.spellings, ...slot.alternates.map((a) => a.key)].includes('e');

  /**
   * Every slot that spells `e`, on every surface that takes keyed inputs: the
   * catalog evaluators, the applied cases, and the edges `evaluateRelation`
   * checks (catalog and canonical), with the dimension that slot reads.
   */
  function slotsSpellingE(): { where: string; dim: Dimension | undefined }[] {
    const found: { where: string; dim: Dimension | undefined }[] = [];
    const parameterDim = (parameters: readonly { key: string; unit: string }[], key: string) => {
      const parameter = parameters.find((p) => p.key === key);
      return parameter === undefined ? undefined : unitDimension(parameter.unit);
    };
    for (const [id, spec] of BRIDGE_EVALUATORS) {
      for (const slot of spec.contract.slots.filter(spellsE)) found.push({ where: `be-${id} ${slot.key}`, dim: parameterDim(spec.parameters, slot.key) });
    }
    for (const [id, contract] of CASE_CONTRACTS) {
      for (const slot of contract.slots.filter(spellsE)) found.push({ where: `${id} ${slot.key}`, dim: parameterDim(APPLIED_CASES.get(id)!.parameters, slot.key) });
    }
    for (const edge of [...CATALOG_GRAPH, ...CANONICAL_GRAPH]) {
      const governing = CANONICAL_EQUATIONS.find((e) => e.id === edge.id)?.dimensional.governing ?? [];
      for (const slot of evaluableContract(resolveEvaluable(edge.id)).slots.filter(spellsE)) {
        const dim = edge.sources.find((s) => s.name === slot.key)?.dim ?? governing.find((g) => g.name === slot.key)?.dim;
        found.push({ where: `${edge.id} ${slot.key}`, dim });
      }
    }
    return found;
  }

  it('every slot spelling e, on every keyed input surface, reads a charge', () => {
    const found = slotsSpellingE();
    // The canonical atomic entries bind e as the charge, so the walk reaches real slots.
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((slot) => slot.dim === undefined || !equals(slot.dim, CHARGE)).map((slot) => slot.where)).toEqual([]);
  });

  it('e names the elementary charge in the constant registry and no other quantity', () => {
    expect(constantRecord('e')!.unit).toBe('C');
    const quantity = quantityRecord('e');
    if (quantity !== undefined) expect(equals(quantity.dimension, CHARGE)).toBe(true);
  });

  it('be-52 reads the eccentricity as eccentricity, and e binds nothing there', () => {
    const spec = BRIDGE_EVALUATORS.get(52)!;
    const orbit = { M_kg: 1.989e30, a_m: 5.79e10 };
    expect(spec.run({ ...orbit, eccentricity: 0.2056 }).value).toBeGreaterThan(0);
    expect(() => spec.run({ ...orbit, e: 0.2056 })).toThrow(UnknownInputError);
  });
});
