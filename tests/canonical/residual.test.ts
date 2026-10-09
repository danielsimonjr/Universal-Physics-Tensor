/**
 * Residual form of a canonical equation (`src/canonical/residual.ts`).
 *
 * A canonical entry stores the right-hand side of one target (`scalarAst`), while a claim is written
 * as a relation, `lhs − rhs`. The structural key of a residual and of a right-hand side can never be
 * equal, so a typed structural search compared them and never matched: 0 of 11,125 query × record
 * pairs in the criterion 3 study (pre-registration Amendment 8). The fix puts BOTH sides in residual
 * form: `target − scalarAst` for a canonical entry.
 */

import { describe, expect, it } from 'vitest';
import { canonicalResidual } from '../../src/canonical/residual.js';
import { CANONICAL_EQUATIONS, canonicalById } from '../../src/canonical/registry.js';
import { leakageKey } from '../../src/atlas/benchmark/leakage.js';
import { validate } from '../../src/dimensional/validator.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import type { Dimension } from '../../src/dimensional/types.js';
import { sym, dim } from '../../src/dimensional/ast-builders.js';

const op = (o: '-' | '*' | '/', ...args: ExprNode[]): ExprNode => ({ kind: 'op', op: o, args }) as ExprNode;

// A claim in the benchmark's form: physics notation, as a residual F − m·a.
const claim = op('-', sym('F', dim(1, 1, -2)), op('*', sym('m', dim(0, 1, 0)), sym('a', dim(1, 0, -2))));
const newton = canonicalById('CE-newton-second-law')!;

describe('canonical residual form', () => {
  it('THE DEFECT: a residual claim does not key-match the right-hand side its entry stores', () => {
    expect(newton.scalarAst).toBeDefined();
    expect(leakageKey(claim)).not.toBe(leakageKey(newton.scalarAst!));
  });

  it('THE FIX: the claim key-matches the entry in residual form, target − scalarAst', () => {
    expect(leakageKey(claim)).toBe(leakageKey(canonicalResidual(newton)!));
  });

  it('CONTROL: a claim of a different relation (F − m·v) still does not match', () => {
    const wrong = op('-', sym('F', dim(1, 1, -2)), op('*', sym('m', dim(0, 1, 0)), sym('v', dim(1, 0, -1))));
    expect(leakageKey(wrong)).not.toBe(leakageKey(canonicalResidual(newton)!));
  });

  it('is the target as a symbol, minus the scalarAst, and nothing more', () => {
    const r = canonicalResidual(newton)! as { kind: string; op: string; args: ExprNode[] };
    expect(r.kind).toBe('op');
    expect(r.op).toBe('-');
    expect(r.args[0]).toEqual({ kind: 'symbol', name: newton.dimensional.target.name, dim: newton.dimensional.target.dim });
    expect(r.args[1]).toBe(newton.scalarAst);
  });

  it('is undefined for an entry with no scalarAst', () => {
    const noAst = CANONICAL_EQUATIONS.find((e) => e.scalarAst === undefined)!;
    expect(noAst).toBeDefined();
    expect(canonicalResidual(noAst)).toBeUndefined();
  });

  it('is dimensionally valid for every canonical entry that has a scalarAst', () => {
    const bad = CANONICAL_EQUATIONS.filter((e) => e.scalarAst !== undefined).filter((e) => !validate(canonicalResidual(e)!).ok);
    expect(bad.map((e) => e.id)).toEqual([]);
  });
});
