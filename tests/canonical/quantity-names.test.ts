/**
 * One physical quantity has one name inside a canonical entry. The governing
 * list is that name. A scalar AST that spells the same dimension differently
 * (`M` beside `mass`, `T` beside `temperature`, `m_1`/`m_2` beside
 * `mass`/`secondary-mass`) is a second name for the same quantity.
 *
 * A dimensionless symbol the governing list does not carry (`N`,
 * `one_minus_e_sq`) is a stub, not a second name for a dimensioned quantity.
 */
import { describe, expect, it } from 'vitest';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { CONSTANTS, piMultipleValue } from '../../src/dimensional/symbolic-constants.js';
import { equals } from '../../src/dimensional/algebra.js';
import type { ExprNode } from '../../src/dimensional/validator.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { DIMENSIONLESS } from '../../src/dimensional/types.js';

function symbols(node: ExprNode, out: Map<string, Dimension>): void {
  if (node.kind === 'symbol') {
    const literal = Number.isFinite(Number(node.name));
    if (!literal && CONSTANTS[node.name] === undefined && piMultipleValue(node.name) === undefined) {
      out.set(node.name, node.dim);
    }
    return;
  }
  const args = (node as { args?: readonly ExprNode[] }).args;
  if (args) for (const a of args) symbols(a, out);
}

describe('canonical quantity names', () => {
  it('a dimensioned AST symbol uses the governing name, not a second spelling', () => {
    const mismatches: string[] = [];
    for (const entry of CANONICAL_EQUATIONS) {
      if (entry.scalarAst === undefined) continue;
      const found = new Map<string, Dimension>();
      symbols(entry.scalarAst, found);
      const governing = new Map(entry.dimensional.governing.map((g) => [g.name, g.dim]));
      for (const [name, dim] of found) {
        const declared = governing.get(name);
        if (declared !== undefined) {
          if (!equals(declared, dim)) mismatches.push(`${entry.id}: '${name}' is ${JSON.stringify(dim)} in the AST and ${JSON.stringify(declared)} in the governing list`);
          continue;
        }
        if (equals(dim, DIMENSIONLESS)) continue;
        mismatches.push(`${entry.id}: '${name}' is not a governing name`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
