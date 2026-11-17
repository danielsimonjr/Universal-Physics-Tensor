/**
 * Census of the bridges that exact automatic differentiation (AD) cannot
 * differentiate through. The registry RHS of every encoded bridge lies in the
 * differentiable grammar, so no integral, tensor or opaque-function node remains.
 * The only blockers are leaf symbols that stand for physics: BE-29 and BE-26.
 * BE-38 is a closed form already. Each claim carries a control that fails.
 *
 * How the stub set is decided. BE-29 is found by machine: its stub is the one
 * dimensionless leaf in the registry that is no constant, no literal and no
 * declared source. BE-26 is a hand pin: its stub is a declared source, one of
 * about 84 dimensionless source leaves (model parameters such as
 * `curie-g-factor`), and no rule in the data tells a parameter from a hidden
 * function. A new undeclared stub fails the machine test below. A new declared
 * stub needs a hand entry in `STUBS`; the leaf-owner snapshot
 * (`tests/atlas/__snapshots__/scalar-leaf-owners.test.ts.snap`) pins every
 * registry leaf, so a new leaf cannot land unseen.
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

/** Catalog rows with no encoded RHS: operator-valued or functional formulas. A row that loses its RHS lands here by id. */
const UNENCODED = [28, 32, 35, 44];

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

/** Dimensionless leaves of `rhs` that are no constant and no literal. */
function freeDimensionlessLeaves(rhs: ExprNode): string[] {
  const hits: string[] = [];
  forEachScalarLeaf(rhs, (l) => {
    if (equals(l.dim, DIMENSIONLESS) && !isRegisteredConstant(l.name) && !(l.name in scope) && !isDecimalLiteral(l.name)) hits.push(l.name);
  }, { transcendental: true, abs: true });
  return hits;
}

/** Ids whose RHS holds a dimensionless leaf that is no constant, no literal and no declared source. */
function undeclaredStubIds(map: ReadonlyMap<number, ExprNode>): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const [id, rhs] of map) {
    const sources = new Set(primaryRelation(id)?.sources ?? []);
    const hits = freeDimensionlessLeaves(rhs).filter((name) => !sources.has(name));
    if (hits.length > 0) out.set(id, hits);
  }
  return out;
}

describe('grammar census', () => {
  it('every encoded RHS is AD-eligible; the encoded set is the catalog minus the four un-encoded rows', () => {
    const ids = [...BRIDGE_RHS_BY_ID.keys()].sort((a, b) => a - b);
    const missing = BRIDGE_EQUATIONS.map((e) => e.id).filter((id) => !BRIDGE_RHS_BY_ID.has(id)).sort((a, b) => a - b);
    expect(missing).toEqual(UNENCODED);
    expect(ids).toHaveLength(BRIDGE_EQUATIONS.length - UNENCODED.length);
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
    expect(freeDimensionlessLeaves(BRIDGE_RHS_BY_ID.get(26)!)).toContain(STUBS[26].symbol);
  });

  it('BE-38 holds no stub leaf: every dimensionless leaf of its RHS is a constant or a literal', () => {
    expect(freeDimensionlessLeaves(BRIDGE_RHS_BY_ID.get(38)!)).toEqual([]);
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
  const POINTS = [['reference', ref], ['deep-MOND z=1e-4', at(1e-4)], ['Newtonian z=1e4', at(1e4)]] as const;
  const CELLS = POINTS.flatMap(([name, b]) => VARS.map((v) => [name, v, b] as const));
  const value = (rhs: ExprNode, b: Record<string, number>): number => bridgeGradientAST(rhs, 'mass', b).value;
  /**
   * Central difference with a relative step of 1e-3. An absolute step is wrong at 1e-10 N.
   * The step is 1e-3, not 1e-5, because of the Newtonian point: there the gradient with
   * respect to the mass is about 1e-8 of value/mass, and FD round-off (about 1e-16·value/h)
   * leaves a relative error of 6e-4 at step 1e-5 and 2e-6 at step 1e-3 (measured).
   */
  const fd = (rhs: ExprNode, v: string, b: Record<string, number>): number => {
    const h = Math.abs(b[v]) * 1e-3;
    return (value(rhs, { ...b, [v]: b[v] + h }) - value(rhs, { ...b, [v]: b[v] - h })) / (2 * h);
  };
  /** The largest measured AD-FD relative error over the nine cells is 2e-6. */
  const TOL = 1e-5;
  const rhs = BRIDGE_RHS_BY_ID.get(38)!;
  const deep = (e: ExprNode): number => {
    const d = at(1e-4);
    return value(e, d) / Math.sqrt(d['newtonian-force'] * d.mass * d['mond-acceleration-scale']);
  };

  it.each(CELLS)('AD equals finite differences at %s with respect to %s', (_name, v, b) => {
    expect(rel(bridgeGradientAST(rhs, v, { ...b }).gradient, fd(rhs, v, { ...b }))).toBeLessThan(TOL);
  });

  it.each(CELLS)('control: a gradient 1e-4 off fails at %s with respect to %s', (_name, v, b) => {
    const ad = bridgeGradientAST(rhs, v, { ...b }).gradient;
    expect(rel(ad * (1 + 1e-4), fd(rhs, v, { ...b }))).toBeGreaterThan(TOL);
  });

  it('limits: deep MOND F -> sqrt(F_N m a0); Newtonian F -> F_N', () => {
    expect(Math.abs(deep(rhs) - 1)).toBeLessThan(1e-3);
    const n = at(1e4);
    expect(Math.abs(value(rhs, n) / n['newtonian-force'] - 1)).toBeLessThan(1e-3);
  });

  /**
   * The wrong forms are compared with respect to the mass. With respect to the Newtonian
   * force at z=1e4 both wrong forms are within 2e-8 of the true gradient (measured 1.1e-8 and 2.5e-9), so
   * that variable cannot tell the forms apart there; the mass gradient differs by at
   * least 0.16 relative at every point.
   */
  it.each([['4/z', '4/ZZ'], ['2/z^2', '2/(ZZ^2)']])('control: the wrong form %s fails the gradient at every point and the deep limit', (_n, term) => {
    const zx = '(newtonian-force/(mass*mond-acceleration-scale))';
    const wrong = parseCatalogExpression(`newtonian-force*sqrt((1+sqrt(1+${term.replace('ZZ', zx)}))/2)`);
    for (const [, b] of POINTS) {
      const trueGrad = bridgeGradientAST(rhs, 'mass', { ...b }).gradient;
      expect(rel(bridgeGradientAST(wrong, 'mass', { ...b }).gradient, trueGrad)).toBeGreaterThan(1e-2);
    }
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
