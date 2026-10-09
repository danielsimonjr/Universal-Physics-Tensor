/**
 * A caller input that names a registered constant is refused on every scope
 * the formula grammar builds: the relation value, the validity condition,
 * a bare formula, and an evaluator output. A relation's own declared source
 * may carry a constant's name (be-63's `lane-emden-omega-3` is a named
 * default a caller may override); nothing else may.
 *
 * Before 9.0.1, `evaluateCatalogRelation(be-42, { mass: 1, G: 1 })` returned
 * 8.19e12 K: the caller's `G` silently replaced Newton's constant.
 */
import { describe, expect, it } from 'vitest';
import { catalogRelations } from '../../src/bridges/catalog-load.js';
import { ConstantInputError } from '../../src/bridges/evaluation-errors.js';
import { BRIDGE_EVALUATORS, buildEvaluatorSpec } from '../../src/bridges/evaluators.js';
import { evaluateFormula, formulaNames, formulaScope, reservedFormulaNames } from '../../src/bridges/expr-parse.js';
import { holds, HoldsError } from '../../src/bridges/holds.js';
import { evaluateCatalogRelation, relationHolds } from '../../src/bridges/relation-eval.js';

const relation = (id: string) => catalogRelations().find((row) => row.id === id)!;

describe('a constant-named input is refused', () => {
  it('on the relation value (be-42 with G)', () => {
    const hawking = relation('be-42');
    const value = evaluateCatalogRelation(hawking, { mass: 1 });
    expect(value).toBeCloseTo(1.2269006705940173e23, -15);
    expect(() => evaluateCatalogRelation(hawking, { mass: 1, G: 1 })).toThrow(ConstantInputError);
    expect(() => evaluateCatalogRelation(hawking, { mass: 1, G: 1 })).toThrow(/'G' names a registered constant/);
  });

  it('on the validity condition that reads the constant, as a caller error, not as a false condition', () => {
    // be-51's condition reads G and c (b >= 10 r_s); be-42's reads neither.
    const lensing = relation('be-51');
    const at = { mass: 1.989e30, 'impact-parameter': 6.957e8 };
    expect(relationHolds(lensing, at)).toBe(true);
    expect(() => relationHolds(lensing, { ...at, c: -1 })).toThrow(ConstantInputError);
    expect(relationHolds(relation('be-42'), { mass: 1, c: -1 })).toBe(true);
  });

  it('a reserved key the formula does not read is an extra key, dropped as any other is on the graph path', () => {
    // A composed edge forwards every input to each component: be-63 >> be-12 hands be-12 the Lane-Emden ω₃.
    const thermal = relation('be-12');
    const at = { mass: 9.1093837015e-31, temperature: 300 };
    expect(evaluateCatalogRelation(thermal, { ...at, 'lane-emden-omega-3': 2 })).toBe(evaluateCatalogRelation(thermal, at));
    expect(relationHolds(thermal, { ...at, 'lane-emden-omega-3': 2 })).toBe(true);
    expect(() => evaluateCatalogRelation(thermal, { ...at, h: 1 })).toThrow(ConstantInputError);
  });

  it('on a bare formula, for π, a constant and a formula overlay', () => {
    expect(evaluateFormula('G*mass', { mass: 2 })).toBeCloseTo(2 * 6.6743e-11, 20);
    expect(() => evaluateFormula('G*mass', { mass: 2, G: 1 })).toThrow(ConstantInputError);
    expect(() => evaluateFormula('pi*mass', { mass: 2, pi: 3 })).toThrow(ConstantInputError);
    expect(() => evaluateFormula('m_p*mass', { mass: 2, m_p: 1 })).toThrow(ConstantInputError);
    expect(() => formulaScope({ hbar: 1 })).toThrow(ConstantInputError);
  });

  it('is a different error from an unbound name in a condition', () => {
    const names = [...formulaNames()];
    const thrown = (run: () => unknown): unknown => {
      try {
        run();
        return undefined;
      } catch (error) {
        return error;
      }
    };
    const constant = thrown(() => holds('mass * G > 0', { mass: 1, G: 1 }, formulaScope(), names));
    expect(constant).toBeInstanceOf(ConstantInputError);
    expect(constant).not.toBeInstanceOf(HoldsError);
    expect(thrown(() => holds('mass > 0', {}, formulaScope(), names))).toBeInstanceOf(HoldsError);
    // A condition that does not read G drops the key, as any other extra key.
    expect(holds('mass > 0', { mass: 1, G: 1 }, formulaScope(), names)).toBe(true);
  });

  it('a declared source may carry a constant name: be-63 overrides the Lane-Emden default', () => {
    const chandrasekhar = relation('be-63');
    expect(chandrasekhar.sources).toContain('lane-emden-omega-3');
    expect(reservedFormulaNames().has('lane_emden_omega_3')).toBe(true);
    const at = { ...chandrasekhar.reference!.inputs };
    const base = evaluateCatalogRelation(chandrasekhar, at);
    const doubled = evaluateCatalogRelation(chandrasekhar, { ...at, 'lane-emden-omega-3': 2 * at['lane-emden-omega-3']! });
    expect(doubled).toBeCloseTo(2 * base, 6);
    expect(() => holds('mass * G > 0', { mass: 1, G: 1 }, formulaScope(), [...formulaNames()], ['G'])).not.toThrow();
  });

  it('an evaluator output may not read a parameter key that names a constant', () => {
    // be-66 keys its reflectance `R`, the gas constant's name. The relation binds it by source name,
    // so the value is safe; an output expression would read the scope by key, so it is refused when built.
    const row = { catalogId: 66, name: 'fixture', parameters: BRIDGE_EVALUATORS.get(66)!.parameters, outputs: [] };
    expect(() => buildEvaluatorSpec(row)).not.toThrow();
    expect(() =>
      buildEvaluatorSpec({ ...row, outputs: [{ name: 'twice', unit: '', meaning: 'fixture', expression: '2*R' }] }),
    ).toThrow(/be-66: output 'twice' reads 'R', which names a registered constant/);
    expect(() =>
      buildEvaluatorSpec({ ...row, outputs: [{ name: 'twice', unit: '', meaning: 'fixture', expression: '2*value' }] }),
    ).not.toThrow();
  });

  it('every evaluator still returns its value at its reference inputs', () => {
    for (const [id, spec] of BRIDGE_EVALUATORS) {
      const rel = catalogRelations().find((row) => row.id === `be-${id}`)!;
      expect(() => spec.run({ ...rel.reference!.inputs }, 'value'), `be-${id}`).not.toThrow();
    }
  });
});
