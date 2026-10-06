/**
 * The five `restatesBridge` links fail when the normal forms diverge.
 *
 * Bridge 52's catalog expression writes `(1 - eccentricity^2)` and
 * `semi-major-axis`. The canonical entry writes `one_minus_e_sq` and `a`,
 * because a bare `e` is the elementary charge. Those two trees are not the
 * same normal form.
 */
import { describe, expect, it } from 'vitest';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { normalForm } from '../../src/canonical/normal-form.js';
import { MASS } from '../../src/dimensional/types.js';
import type { ExprNode } from '../../src/dimensional/validator.js';

const LINKS = ['16', '29', '42', '51', '52'];

describe('restatesBridge', () => {
  it('matches the catalog right-hand side when that tree exists', () => {
    const linked = CANONICAL_EQUATIONS.filter((equation) => LINKS.includes(equation.restatesBridge ?? ''));
    expect(linked.map((equation) => equation.restatesBridge).sort()).toEqual([...LINKS].sort());
    const compared: string[] = [];
    const expanded: string[] = [];
    for (const equation of linked) {
      const rhs = BRIDGE_RHS_BY_ID.get(Number(equation.restatesBridge));
      expect(rhs, equation.id).toBeDefined();
      expect(equation.scalarAst, equation.id).toBeDefined();
      if (equation.restatesBridge === '52') {
        expect(normalForm(equation.scalarAst!), equation.id).not.toBe(normalForm(rhs!));
        expanded.push(equation.restatesBridge);
        continue;
      }
      expect(normalForm(equation.scalarAst!), equation.id).toBe(normalForm(rhs!));
      compared.push(equation.restatesBridge!);
    }
    expect(compared.sort()).toEqual(['16', '29', '42', '51']);
    expect(expanded).toEqual(['52']);
  });

  it('a tree that is not a restatement fails the comparison', () => {
    const landauer = CANONICAL_EQUATIONS.find((equation) => equation.id === 'CE-landauer');
    const rhs = BRIDGE_RHS_BY_ID.get(16);
    expect(landauer?.scalarAst).toBeDefined();
    expect(rhs).toBeDefined();
    const mutated: ExprNode = {
      kind: 'op',
      op: '*',
      args: [landauer!.scalarAst!, { kind: 'symbol', name: 'mass', dim: MASS }],
    };
    expect(normalForm(mutated)).not.toBe(normalForm(rhs!));
  });
});
