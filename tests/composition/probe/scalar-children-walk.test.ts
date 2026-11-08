/**
 * The four scalar-child walks that `scalarChildren` (`dimensional/ast-leaves.ts`)
 * replaced give the same answers on a tree that holds every node kind they read,
 * a variational derivative and a tensor product included. The expected values
 * were measured on the walks before the change.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ExprNode } from '../../../src/dimensional/ast-types.js';
import { DIMENSIONLESS, LENGTH } from '../../../src/dimensional/types.js';
import { countAstNodes, countOperators } from '../../../src/composition/probe/fingerprint.js';
import { formulaShape } from '../../../src/composition/formula-shape.js';
import { checkApplicability } from '../../../src/atlas/applicability.js';

const s = (name: string, dim = DIMENSIONLESS): ExprNode => ({ kind: 'symbol', name, dim });
const div = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '/', args: [a, b] });
const sum = (a: ExprNode, b: ExprNode): ExprNode => ({ kind: 'op', op: '+', args: [a, b] });

/** A dimensional sum and a division hidden in each arm. */
const arm = (tag: string): ExprNode => div(s(`n_${tag}`), sum(s(`x_${tag}`, LENGTH), s(`y_${tag}`, LENGTH)));

const TREE: ExprNode = {
  kind: 'op',
  op: '*',
  args: [
    { kind: 'variational-derivative', functional: arm('F'), field: arm('phi'), over: arm('mu') },
    { kind: 'integral', over: s('t'), integrand: arm('int'), lower: arm('lo'), upper: arm('hi') },
    { kind: 'derivative', of: arm('of'), wrt: s('w') },
    { kind: 'transcendental', fn: 'exp', arg: arm('exp') },
    { kind: 'abs', arg: arm('abs') },
    { kind: 'dirac-delta', arg: arm('dd') },
    { kind: 'tensor-product', args: [arm('tp')] },
  ],
} as ExprNode;

const VARIATIONAL_ONLY: ExprNode = { kind: 'variational-derivative', functional: arm('F'), field: arm('phi'), over: arm('mu') };

describe('scalarChildren: the same answers before and after', () => {
  it('countAstNodes and countOperators', () => {
    expect(countAstNodes(TREE)).toBe(60);
    expect(countOperators(TREE)).toBe(18);
    expect(countOperators(VARIATIONAL_ONLY)).toBe(0);
    expect(countAstNodes(VARIATIONAL_ONLY)).toBe(16);
  });

  it('formulaShape', () => {
    expect(formulaShape(TREE)).toBe('dimensional-sum');
    expect(formulaShape(VARIATIONAL_ONLY)).toBe('dimensional-sum');
    expect(formulaShape({ kind: 'tensor-product', args: [arm('tp')] } as ExprNode)).toBe('monomial');
  });

  it('checkApplicability AST findings, with their paths', () => {
    expect(checkApplicability({ ast: TREE, sideConditions: [] }).map((f) => [f.kind, f.where])).toEqual([
      ['dimensional-inconsistency', 'args[1].lower'],
      ['division-unguarded', 'args[0].args[0].args[1]'],
      ['division-unguarded', 'args[0].args[1].args[1]'],
      ['division-unguarded', 'args[0].args[2].args[1]'],
      ['division-unguarded', 'args[1].args[1].args[1]'],
      ['division-unguarded', 'args[1].args[2].args[1]'],
      ['division-unguarded', 'args[1].args[3].args[1]'],
      ['division-unguarded', 'args[2].args[0].args[1]'],
      ['division-unguarded', 'args[3].args[0].args[1]'],
      ['division-unguarded', 'args[4].args[0].args[1]'],
      ['division-unguarded', 'args[5].args[0].args[1]'],
    ]);
  });

  it('the four walks call scalarChildren', () => {
    const read = (rel: string): string => readFileSync(new URL(`../../../src/${rel}`, import.meta.url), 'utf8');
    expect(read('composition/probe/fingerprint.ts').match(/scalarChildren\(/g)).toHaveLength(2);
    expect(read('atlas/applicability.ts')).toContain('scalarChildren(node, ALL_SCALAR_ARMS)');
    expect(read('composition/formula-shape.ts')).toContain('scalarChildren(');
  });
});
