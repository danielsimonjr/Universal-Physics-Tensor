/**
 * The structural hash of every canonical scalar tree, every canonical residual
 * (`target − scalarAst`) and every catalog right-hand side, pinned as one
 * SHA-256 over the sorted `[id, normalForm]` rows. Taken before the
 * dimensionless test in `normal-form.ts` moved onto `isDimensionless`
 * (`src/dimensional/algebra.ts`): the hash must not move. A change that moves
 * one form fails here and names the rows.
 */
import { describe, expect, it } from 'vitest';
import { normalForm } from '../../src/canonical/normal-form.js';
import { CANONICAL_EQUATIONS } from '../../src/canonical/registry.js';
import { BRIDGE_RHS_BY_ID } from '../../src/bridges/rhs-registry.js';
import { sha256Hex } from '../../src/core/hash.js';
import { sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';

function rows(): [string, string][] {
  const out: [string, string][] = [];
  for (const eq of CANONICAL_EQUATIONS) {
    if (eq.scalarAst === undefined) continue;
    out.push([`${eq.id}:rhs`, normalForm(eq.scalarAst)]);
    const target = sym(eq.dimensional.target.name, eq.dimensional.target.dim);
    const residual: ExprNode = { kind: 'op', op: '-', args: [target, eq.scalarAst] };
    out.push([`${eq.id}:residual`, normalForm(residual)]);
  }
  for (const [id, rhs] of BRIDGE_RHS_BY_ID) out.push([`be-${id}`, normalForm(rhs)]);
  return out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

describe('normalForm pin', () => {
  it('hashes every canonical and catalog form to the recorded value', () => {
    const all = rows();
    expect(all.length).toBe(PINNED_ROWS);
    expect(sha256Hex(JSON.stringify(all))).toBe(PINNED_HASH);
  });

  it('CONTROL: a one-symbol change of one form moves the hash', () => {
    const all = rows();
    all[0] = [all[0]![0], `${all[0]![1]}x`];
    expect(sha256Hex(JSON.stringify(all))).not.toBe(PINNED_HASH);
  });
});

const PINNED_ROWS = 342;
const PINNED_HASH = 'ff7b25dc9189419e1db0ea3dc21261fdc567a492ab3367e9e0e7052fb77dbb19';
