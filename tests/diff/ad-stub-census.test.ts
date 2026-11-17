/**
 * Census of the bridges that exact automatic differentiation (AD) cannot
 * differentiate through. The registry RHS of every encoded bridge lies in the
 * differentiable grammar, so no integral, tensor or opaque-function node remains.
 * The only blockers are leaf symbols that stand for physics: BE-29 and BE-26.
 * BE-38 is a closed form already. Each claim carries a control that fails.
 */
import { describe, expect, it } from 'vitest';
import {
  astDifferentiableBridgeIds,
  bridgeGradientAST,
  bridgeGradientASTById,
} from '../../src/diff/bridge-ast-gradient.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { BRIDGE_EQUATIONS } from '../../src/bridges/index.js';
import { primaryRelation } from '../../src/bridges/catalog-load.js';
import { parseCatalogExpression } from '../../src/bridges/expr-parse.js';
import { forEachScalarLeaf, isDecimalLiteral } from '../../src/dimensional/ast-leaves.js';
import { constantScope, isRegisteredConstant } from '../../src/dimensional/symbolic-constants.js';
import { equals, format } from '../../src/dimensional/algebra.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const scope = constantScope();
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

/** The reason each semantic stub stays. The tests below pin the set. */
const STUBS = {
  26: { symbol: 'biological-rate-correction', reason: 'phenomenological prefactor; known_issues fixes no closed form' },
  29: { symbol: 'ln_avg_exp_minus_betaW', reason: 'ensemble average; the row fixes no work distribution' },
} as const;

/** True when MathTS can lower the whole tree: the grammar test, run through the public AD entry. */
function inGrammar(rhs: ExprNode): boolean {
  const names: string[] = [];
  const bindings: Record<string, number> = {};
  forEachScalarLeaf(rhs, (l) => { names.push(l.name); bindings[l.name] = 1; }, { transcendental: true, abs: true });
  try {
    bridgeGradientAST(rhs, names[0] ?? 'x', { ...bindings, x: 1 });
    return true;
  } catch (e) {
    return !(e instanceof TypeError && /unsupported node kind/.test(e.message));
  }
}

/** Ids whose RHS holds a dimensionless leaf that is no constant, no literal and no declared source. */
function undeclaredStubIds(map: ReadonlyMap<number, ExprNode>): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const [id, rhs] of map) {
    const sources = new Set(primaryRelation(id)?.sources ?? []);
    const hits: string[] = [];
    forEachScalarLeaf(rhs, (l) => {
      if (equals(l.dim, DIMENSIONLESS) && !isRegisteredConstant(l.name) && !(l.name in scope) &&
        !isDecimalLiteral(l.name) && !sources.has(l.name)) hits.push(l.name);
    }, { transcendental: true, abs: true });
    if (hits.length > 0) out.set(id, hits);
  }
  return out;
}

describe('grammar census', () => {
  it('all 156 encoded RHS trees are AD-eligible and the eligible list is the registry', () => {
    const ids = [...BRIDGE_RHS_BY_ID.keys()].sort((a, b) => a - b);
    expect(ids).toHaveLength(156);
    expect(astDifferentiableBridgeIds()).toEqual(ids);
    expect(ids.filter((id) => !inGrammar(BRIDGE_RHS_BY_ID.get(id)!))).toEqual([]);
  });

  it('control: a registry with one injected integral loses exactly that id', () => {
    const one = BRIDGE_RHS_BY_ID.get(38)!;
    const integral = { kind: 'integral', integrand: one, over: one, lower: one, upper: one } as unknown as ExprNode;
    expect(inGrammar(integral)).toBe(false);
    const injected = new Map(BRIDGE_RHS_BY_ID).set(38, integral);
    const ineligible = [...injected].filter(([, r]) => !inGrammar(r)).map(([id]) => id);
    expect(ineligible).toEqual([38]);
  });
});

describe('semantic stub set', () => {
  it('the undeclared dimensionless leaves are exactly BE-29 ln_avg_exp_minus_betaW', () => {
    expect([...undeclaredStubIds(BRIDGE_RHS_BY_ID)]).toEqual([[29, ['ln_avg_exp_minus_betaW']]]);
  });

  it('BE-26 stub is a declared source, so the leaf scan alone cannot find it; the pin names it', () => {
    expect(primaryRelation(26)!.sources).toContain(STUBS[26].symbol);
    expect(undeclaredStubIds(BRIDGE_RHS_BY_ID).has(26)).toBe(false);
  });

  it('control: the set {26, 29, 38} is wrong, because BE-38 holds no stub leaf', () => {
    const found = [...new Set<number>([...undeclaredStubIds(BRIDGE_RHS_BY_ID).keys(), 26])].sort((a, b) => a - b);
    expect(found).not.toEqual([26, 29, 38]);
    expect(found).toEqual([26, 29]);
  });

  it.each([[26], [29]] as const)('BE-%i: the stub is a leaf of the RHS and AD with respect to it is exact', (id) => {
    const { symbol, reason } = STUBS[id];
    expect(reason.length).toBeGreaterThan(0);
    let leaf = false;
    forEachScalarLeaf(BRIDGE_RHS_BY_ID.get(id)!, (l) => { if (l.name === symbol) leaf = true; }, { transcendental: true, abs: true });
    expect(leaf).toBe(true);
    const inputs: Record<string, number> = id === 26
      ? { ...primaryRelation(26)!.reference!.inputs }
      : { [symbol]: -2, temperature: 300 };
    const { value, gradient } = bridgeGradientASTById(id, symbol, inputs);
    if (id === 26) expect(rel(gradient, value / inputs[symbol])).toBeLessThan(1e-12); // linear in the stub
    else expect(rel(gradient, -scope.k_B * 300)).toBeLessThan(1e-12); // d/dstub = -k_B T
  });
});

describe('BE-38 is the closed Milgrom form', () => {
  const r = primaryRelation(38)!;
  const ref = r.reference!.inputs as Record<string, number>;
  const VARS = ['newtonian-force', 'mass', 'mond-acceleration-scale'] as const;
  const at = (z: number): Record<string, number> => ({ ...ref, 'newtonian-force': z * ref.mass * ref['mond-acceleration-scale'] });
  const value = (rhs: ExprNode, b: Record<string, number>): number => bridgeGradientAST(rhs, 'mass', b).value;
  /** Central difference with a relative step. An absolute step is wrong at 1e-10 N. */
  const fd = (rhs: ExprNode, v: string, b: Record<string, number>): number => {
    const h = Math.abs(b[v]) * 1e-5;
    return (value(rhs, { ...b, [v]: b[v] + h }) - value(rhs, { ...b, [v]: b[v] - h })) / (2 * h);
  };
  const rhs = BRIDGE_RHS_BY_ID.get(38)!;
  const deep = (e: ExprNode): number => {
    const d = at(1e-4);
    return value(e, d) / Math.sqrt(d['newtonian-force'] * d.mass * d['mond-acceleration-scale']);
  };

  it.each([['reference', ref], ['deep-MOND z=1e-4', at(1e-4)], ['Newtonian z=1e4', at(1e4)]] as const)(
    'AD equals finite differences at %s for every source', (_name, b) => {
      for (const v of VARS) {
        // Scale by the value: at z=1e4 the gradient w.r.t. mass is ~1e-8 of F/m, so FD round-off
        // (1e-16/step) is only meaningful relative to the value, not to the tiny gradient.
        const ad = bridgeGradientAST(rhs, v, { ...b });
        expect(Math.abs(ad.gradient - fd(rhs, v, { ...b })) * Math.abs(b[v]) / ad.value, v).toBeLessThan(1e-6);
      }
    });

  it('limits: deep MOND F -> sqrt(F_N m a0); Newtonian F -> F_N', () => {
    expect(Math.abs(deep(rhs) - 1)).toBeLessThan(1e-3);
    const n = at(1e4);
    expect(Math.abs(value(rhs, n) / n['newtonian-force'] - 1)).toBeLessThan(1e-3);
  });

  it.each([['4/z', '4/ZZ'], ['2/z^2', '2/(ZZ^2)']])('control: the wrong form %s fails both checks', (_n, term) => {
    const zx = '(newtonian-force/(mass*mond-acceleration-scale))';
    const wrong = parseCatalogExpression(`newtonian-force*sqrt((1+sqrt(1+${term.replace('ZZ', zx)}))/2)`);
    const trueFd = fd(rhs, 'newtonian-force', { ...ref });
    expect(rel(bridgeGradientAST(wrong, 'newtonian-force', { ...ref }).gradient, trueFd)).toBeGreaterThan(1e-2);
    expect(Math.abs(deep(wrong) - 1)).toBeGreaterThan(1e-3);
  });
});

describe('round trip and reference value', () => {
  it.each([[26, '[frequency]'], [29, '[energy]'], [38, '[force]']] as const)(
    'BE-%i: format(infer(rhs)) equals the dimensional_signature', (id, sig) => {
      expect(BRIDGE_EQUATIONS.find((e) => e.id === id)!.dimensional_signature).toBe(sig);
      const v = validate(BRIDGE_RHS_BY_ID.get(id)!);
      expect(v.ok).toBe(true);
      expect(format(v.inferredDimension!)).toBe(sig);
    });

  it.each([26, 38] as const)('BE-%i: the AD value equals the reference value of the relation', (id) => {
    const r = primaryRelation(id)!.reference!;
    const v = bridgeGradientASTById(id, Object.keys(r.inputs)[0], { ...r.inputs }).value;
    expect(rel(v, r.value)).toBeLessThan(1e-12);
  });

  it('BE-29: the AD value is -k_B T ln<exp(-bW)> (the sign fixed in the catalog)', () => {
    const v = bridgeGradientASTById(29, STUBS[29].symbol, { [STUBS[29].symbol]: -2, temperature: 300 }).value;
    expect(rel(v, 2 * scope.k_B * 300)).toBeLessThan(1e-12);
  });
});
