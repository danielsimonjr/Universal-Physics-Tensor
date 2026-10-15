/**
 * One owner for the scalar-leaf walk and the literal rule (proposal 7 of
 * docs/planning/2026-10-15-map-maker-discoverer-proposals.md).
 *
 * Before this module six rules decided "is this name a number" (one accepted
 * `0x2`, one rejected `1e3`, several accepted the empty string) and three
 * decided "is this a registered constant" (`in` on a plain object is true for
 * `constructor`). The edge spellings are pinned here with the rule that wins,
 * and the last block proves that on every canonical and catalog expression
 * the old rules and the new one agree on every leaf, which is what keeps the
 * normal-form hash unchanged.
 */
import { describe, expect, it } from 'vitest';
import {
  DECIMAL_LITERAL,
  forEachScalarLeaf,
  isDecimalLiteral,
  literalValue,
  mapScalarLeaves,
} from '../../src/dimensional/ast-leaves.js';
import { CONSTANTS, isRegisteredConstant } from '../../src/dimensional/symbolic-constants.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';
import { normalForm } from '../../src/canonical/normal-form.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { CATALOG_GRAPH } from '../../src/composition/catalog-graph.js';

const sym = (name: string, dim = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const L = { ...DIMENSIONLESS, L: 1 };

describe('isDecimalLiteral — the one literal rule', () => {
  it('accepts the decimal spellings the validator accepts, exponent notation included', () => {
    for (const name of ['2', '0.5', '-1', '+3', '.5', '2.', '1e3', '1E-3', '-2.5e+2']) {
      expect(isDecimalLiteral(name), name).toBe(true);
      expect(DECIMAL_LITERAL.test(name), name).toBe(true);
    }
  });

  it('rejects the spellings the old rules disagreed on: 0x2, the empty string, Infinity, a padded number', () => {
    // `Number.isFinite(Number(name))` accepted every one of these except Infinity.
    for (const name of ['0x2', '', ' 2', '2 ', 'Infinity', '-Infinity', 'NaN', '1_000', 'two', 'constructor', '0b1']) {
      expect(isDecimalLiteral(name), name).toBe(false);
    }
    // The record of what the retired rule said, so the disagreement is on file.
    expect(Number.isFinite(Number('0x2'))).toBe(true);
    expect(Number.isFinite(Number(''))).toBe(true);
    expect(Number.isFinite(Number(' 2'))).toBe(true);
  });
});

describe('literalValue', () => {
  it('is the number a decimal-literal symbol names, and undefined for anything else', () => {
    expect(literalValue(sym('2'))).toBe(2);
    expect(literalValue(sym('1e3'))).toBe(1000);
    expect(literalValue(sym('-0.5'))).toBe(-0.5);
    expect(literalValue(sym('x'))).toBeUndefined();
    expect(literalValue(sym(''))).toBeUndefined();
    expect(literalValue(sym('0x2'))).toBeUndefined();
    expect(literalValue({ kind: 'op', op: '*', args: [sym('2'), sym('3')] })).toBeUndefined();
  });
});

describe('isRegisteredConstant — own property, never the prototype chain', () => {
  it('is true for a registered name and false for Object.prototype names', () => {
    expect(isRegisteredConstant('k_B')).toBe(true);
    expect(isRegisteredConstant('c')).toBe(true);
    for (const name of ['constructor', 'toString', 'hasOwnProperty', '__proto__', '', 'nope']) {
      expect(isRegisteredConstant(name), name).toBe(false);
    }
    // The record of the retired rule: `in` reads the prototype.
    expect('constructor' in CONSTANTS).toBe(true);
  });
});

const tree: ExprNode = {
  kind: 'op',
  op: '*',
  args: [
    sym('a', L),
    { kind: 'transcendental', fn: 'exp', arg: sym('b') },
    { kind: 'abs', arg: sym('c', L) },
    { kind: 'integral', over: sym('x', L), integrand: sym('f'), lower: sym('lo', L), upper: sym('hi', L) },
    { kind: 'derivative', of: sym('g'), wrt: sym('t') },
    { kind: 'dirac-delta', arg: sym('d', L) },
    { kind: 'variational-derivative', functional: sym('F'), field: sym('phi'), over: sym('mu') },
  ],
};

const names = (arms: Parameters<typeof forEachScalarLeaf>[2]): string[] => {
  const out: string[] = [];
  forEachScalarLeaf(tree, (leaf) => out.push(leaf.name), arms);
  return out;
};

describe('forEachScalarLeaf — each caller passes its arm set', () => {
  it('walks op nodes always and nothing else without arms', () => {
    expect(names({})).toEqual(['a']);
  });
  it('transcendental and abs (the evaluator and linkage set)', () => {
    expect(names({ transcendental: true, abs: true })).toEqual(['a', 'b', 'c']);
  });
  it('integral over+integrand and derivative (the simplifier set) omit the bounds', () => {
    expect(names({ integral: 'over+integrand', derivative: true })).toEqual(['a', 'x', 'f', 'g', 't']);
  });
  it('integral all includes the bounds', () => {
    expect(names({ integral: 'all' })).toEqual(['a', 'x', 'f', 'lo', 'hi']);
  });
  it('dirac-delta and the variational derivative', () => {
    expect(names({ diracDelta: true, variationalDerivative: true })).toEqual(['a', 'd', 'F', 'phi', 'mu']);
  });
  it('tensor-product args are an arm of their own', () => {
    const t: ExprNode = { kind: 'op', op: '*', args: [sym('a'), { kind: 'tensor-product', args: [sym('u'), sym('v')] }] };
    const out: string[] = [];
    forEachScalarLeaf(t, (leaf) => out.push(leaf.name), {});
    expect(out).toEqual(['a']);
    const withArm: string[] = [];
    forEachScalarLeaf(t, (leaf) => withArm.push(leaf.name), { tensorProduct: true });
    expect(withArm).toEqual(['a', 'u', 'v']);
  });
});

describe('mapScalarLeaves', () => {
  it('rebuilds the walked arms and returns the unwalked ones by reference', () => {
    const renamed = mapScalarLeaves(
      tree,
      (leaf) => (leaf.name === 'b' ? sym('B') : leaf),
      { transcendental: true },
    );
    expect(renamed).not.toBe(tree);
    const got: string[] = [];
    forEachScalarLeaf(renamed, (leaf) => got.push(leaf.name), { transcendental: true, abs: true });
    expect(got).toEqual(['a', 'B', 'c']);
    // The abs arm was not walked: it is the same object.
    expect((renamed as { args: ExprNode[] }).args[2]).toBe((tree as { args: ExprNode[] }).args[2]);
  });
  it('returns the same node when no leaf changed', () => {
    expect(mapScalarLeaves(tree, (leaf) => leaf, { transcendental: true, abs: true })).toBe(tree);
  });
});

describe('the migration changes no hash: old rules and the one rule agree on every real leaf', () => {
  const expressions: ExprNode[] = [
    ...CANONICAL_EQUATIONS.flatMap((ce) => (ce.scalarAst === undefined ? [] : [ce.scalarAst])),
    ...BRIDGE_RHS_BY_ID.values(),
    ...CATALOG_GRAPH.flatMap((edge) => (edge.symbolic === undefined ? [] : [edge.symbolic])),
  ];
  const allArms = {
    transcendental: true,
    abs: true,
    diracDelta: true,
    integral: 'all' as const,
    derivative: true,
    variationalDerivative: true,
    tensorProduct: true,
  };

  it('covers a corpus large enough to mean something', () => {
    expect(expressions.length).toBeGreaterThan(200);
  });

  it("the literal rule: isDecimalLiteral(name) === Number.isFinite(Number(name)) on every leaf", () => {
    const disagreements: string[] = [];
    for (const expr of expressions) {
      forEachScalarLeaf(
        expr,
        (leaf) => {
          if (isDecimalLiteral(leaf.name) !== Number.isFinite(Number(leaf.name))) disagreements.push(leaf.name);
        },
        allArms,
      );
    }
    expect(disagreements).toEqual([]);
  });

  it("the constant rule: isRegisteredConstant(name) === (name in CONSTANTS) on every leaf", () => {
    const disagreements: string[] = [];
    for (const expr of expressions) {
      forEachScalarLeaf(
        expr,
        (leaf) => {
          if (isRegisteredConstant(leaf.name) !== leaf.name in CONSTANTS) disagreements.push(leaf.name);
        },
        allArms,
      );
    }
    expect(disagreements).toEqual([]);
  });

  it('pins three normal-form hashes on the catalog (a changed rule would move one)', () => {
    const rhs16 = BRIDGE_RHS_BY_ID.get(16)!;
    expect(normalForm(rhs16)).toBe('*(sym:k_B,sym:temperature)');
    const landauer = CANONICAL_EQUATIONS.find((ce) => ce.id === 'CE-landauer')!.scalarAst!;
    expect(normalForm(landauer)).toBe(normalForm(rhs16));
    const rhs12 = BRIDGE_RHS_BY_ID.get(12)!;
    expect(normalForm(rhs12)).toBe('/(sym:h,^(*(sym:k_B,sym:mass,sym:temperature),s:0.5))');
  });
});
