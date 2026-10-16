/**
 * An algebraic-equivalence step behind the normal-form hash (proposal 2).
 *
 * `normalForm` flattens products only, so `a/(b/c)` and `a·c/b`, `a·a` and
 * `a²`, hash differently, and a chain that recovers a known law was filed as
 * provisional. On a hash miss with equal dimension, MathTS `simplify` is
 * asked whether `A/B` reduces to a constant node: equal up to a constant iff
 * it does. The hash stays the cheap key; the step runs only on misses, and a
 * throw from the simplifier is "not shown equal". `symbolicEqual` is not
 * used (the installed one passes an empty rule list).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { equalUpToConstant } from '../../src/composition/algebraic-equivalence.js';
import { matchChain } from '../../src/composition/chain-match.js';
import { classifyStructure } from '../../src/canonical/structural.js';
import { dedupByNormalForm, type ProposedBridge } from '../../src/composition/proposed-bridges.js';
import { normalForm } from '../../src/canonical/normal-form.js';
import { leakageKey } from '../../src/atlas/benchmark/leakage.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { validate } from '../../src/dimensional/validator.js';
import { format } from '../../src/dimensional/algebra.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const L = { ...DIMENSIONLESS, L: 1 };
const M = { ...DIMENSIONLESS, M: 1 };
const T = { ...DIMENSIONLESS, T: 1 };
const sym = (name: string, dim = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const op = (o: '+' | '-' | '*' | '/' | '^', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args });
const a = sym('a', L);
const b = sym('b', M);
const c = sym('c', T);

describe('equalUpToConstant — the verified facts', () => {
  it('a/(b/c) and a·c/b are equal with constant 1', () => {
    expect(equalUpToConstant(op('/', a, op('/', b, c)), op('/', op('*', a, c), b))).toEqual({ equal: true, constant: 1 });
  });
  it('a·a and a² are equal with constant 1', () => {
    expect(equalUpToConstant(op('*', a, a), op('^', a, sym('2')))).toEqual({ equal: true, constant: 1 });
  });
  it('4·a·b and b·a differ by the constant 4', () => {
    expect(equalUpToConstant(op('*', sym('4'), a, b), op('*', b, a))).toEqual({ equal: true, constant: 4 });
  });
  it('a+b and a·b are not shown equal', () => {
    const d = sym('d', L);
    expect(equalUpToConstant(op('+', a, d), op('*', a, d))).toEqual({ equal: false });
  });
  it('an arm the renderer does not carry (an integral) is not shown equal, and nothing throws', () => {
    const integral: ExprNode = { kind: 'integral', over: a, integrand: b };
    expect(equalUpToConstant(integral, op('*', a, b))).toEqual({ equal: false });
  });
  it('a sum inside a quotient rewrite is still equal: (a+d)/(b/c) vs (a+d)·c/b', () => {
    const d = sym('d', L);
    expect(equalUpToConstant(op('/', op('+', a, d), op('/', b, c)), op('/', op('*', op('+', a, d), c), b))).toEqual({ equal: true, constant: 1 });
  });
});

describe('a chain that recovers a known law in another spelling is one confirmation, not a provisional chain', () => {
  // Bridge 12 is h / (k_B·m·T)^0.5. The spelling h · (k_B·m·T)^-0.5 hashes differently.
  const rhs12 = BRIDGE_RHS_BY_ID.get(12)! as { args: ExprNode[] };
  const h = rhs12.args[0]!;
  const base = (rhs12.args[1] as { args: ExprNode[] }).args[0]!;
  const rewritten: ExprNode = op('*', h, op('^', base, sym('-0.5')));

  it('the two spellings hash differently and have the same dimension (the step has work to do)', () => {
    expect(normalForm(rewritten)).not.toBe(normalForm(rhs12 as ExprNode));
    expect(format(validate(rewritten).inferredDimension!)).toBe(format(validate(rhs12 as ExprNode).inferredDimension!));
  });

  it('matchChain files it as the confirmation of catalog 12', () => {
    expect(matchChain(rewritten, ['be-12', 'be-11-zurek'])).toEqual({
      kind: 'confirmation',
      catalogId: 12,
      edgeIds: ['be-12', 'be-11-zurek'],
    });
  });

  it('classifyStructure takes the step only when a caller injects it', () => {
    const pair = {
      left: rewritten,
      leftDim: validate(rewritten).inferredDimension!,
      right: rhs12 as ExprNode,
      rightDim: validate(rhs12 as ExprNode).inferredDimension,
      restatesBridge: undefined,
      bridgeId: '12',
    };
    expect(classifyStructure(pair)).toEqual({ dimMatch: true, structuralMatch: false, algebraic: false, restates: false });
    expect(classifyStructure(pair, { equivalent: (x, y) => equalUpToConstant(x, y).equal })).toEqual({
      dimMatch: true,
      structuralMatch: true,
      algebraic: true,
      restates: false,
    });
  });
});

describe('dedupByNormalForm takes the step on a hash miss', () => {
  const proposal = (id: string, scalarAst: ExprNode): ProposedBridge => ({
    id,
    derivedFrom: { identification: { a: `a-${id}`, b: `b-${id}`, dim: '[length]', magnitudeEvidence: false }, sourceEquationIds: ['E1', 'E2'], solvedFor: 'x' },
    target: { name: 'x', dim: validate(scalarAst).inferredDimension! },
    governing: [],
    formulaLatex: id,
    scalarAst,
    dimensionalSignature: format(validate(scalarAst).inferredDimension!),
    provenance: 'synthetic',
    alsoDerivableFrom: [],
    status: 'unadjudicated',
    evaluate: () => 0,
  });
  const d = sym('d', L);

  it('(a+d)/(b/c) and (a+d)·c/b are one proposal (not monomials, so the exact key cannot merge them)', () => {
    const deduped = dedupByNormalForm([
      proposal('p1', op('/', op('+', a, d), op('/', b, c))),
      proposal('p2', op('/', op('*', op('+', a, d), c), b)),
    ]);
    expect(deduped.map((p) => p.id)).toEqual(['p1']);
    expect(deduped[0]!.alsoDerivableFrom).toEqual(['a-p2 ≡ b-p2']);
  });

  it('control: (a+d)·c/b and (a·d)·c/b stay two', () => {
    const deduped = dedupByNormalForm([
      proposal('p1', op('/', op('*', op('+', a, d), c), b)),
      proposal('p2', op('/', op('*', op('*', a, d), c), b)),
    ]);
    expect(deduped.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});

describe('the criterion-3 leakage key is untouched', () => {
  it('leakage.ts does not import the step, and the two quotient spellings keep different keys', () => {
    const source = readFileSync(resolve(root, 'src/atlas/benchmark/leakage.ts'), 'utf8');
    expect(source).not.toMatch(/algebraic-equivalence/);
    expect(leakageKey(op('/', a, op('/', b, c)))).not.toBe(leakageKey(op('/', op('*', a, c), b)));
  });
});
