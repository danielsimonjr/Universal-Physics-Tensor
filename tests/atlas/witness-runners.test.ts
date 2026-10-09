/**
 * Atlas Phase 4, S4.2 — the symbolic and numeric witness runners.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §2.
 *
 * ⚠ **No test here touches `src/numerical/formula-registry.ts`.** Its selection
 * is cached in module scope with no reset hook, so a registered stub would leak
 * into every later test in the same worker. The simplifier is injected instead.
 */

import { describe, expect, it } from 'vitest';
import { dim, sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import { runSymbolicWitness } from '../../src/atlas/witness-symbolic.js';
import type { SymbolicSimplifier } from '../../src/atlas/witness-symbolic.js';
import { runNumericWitness } from '../../src/atlas/witness-numeric.js';
import { passingWitnessIds } from '../../src/atlas/witness-result.js';
import type { WitnessRunResult } from '../../src/atlas/witness-result.js';
import { isSimplifierAvailable, simplifyExpr } from '../../src/composition/expr-simplify.js';

const DIMENSIONLESS = dim();
const LENGTH = dim(1);

const x = sym('x', LENGTH);
const spec = { id: 'W-test', lhs: x, rhs: x };

// Gate on the SIMPLIFIER peer, not the parser registry: they are different
// packages, and gating on the wrong one would skip or run for the wrong reason.
const simplifierPresent = await isSimplifierAvailable();
const peerRequired = process.env.UPT_REQUIRE_PEERS === '1';

/** A simplifier that always returns the literal `value`, ignoring its input. */
const constantSimplifier = (value: string): SymbolicSimplifier =>
  async () => ({ expr: sym(value, DIMENSIONLESS), simplified: true });

describe('runSymbolicWitness', () => {
  it('reports peer-absent as UNRESOLVED when the simplifier is null', async () => {
    const r = await runSymbolicWitness(spec, null);
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('peer-absent');
    // The whole point: absence is not a refutation.
    expect(r.status).not.toBe('refuted');
  });

  it('reports CHECKED when the difference simplifies to literal 0', async () => {
    const r = await runSymbolicWitness(spec, constantSimplifier('0'));
    expect(r.status).toBe('checked');
    expect(r.reason).toBeUndefined();
  });

  it('reports REFUTED when the difference simplifies to a non-zero constant', async () => {
    const r = await runSymbolicWitness(spec, constantSimplifier('3'));
    expect(r.status).toBe('refuted');
    expect(r.detail).toContain('3');
  });

  it('reports UNRESOLVED/not-simplified when the difference stays symbolic', async () => {
    const stillSymbolic: SymbolicSimplifier = async (e) => ({ expr: e, simplified: false });
    const r = await runSymbolicWitness(spec, stillSymbolic);
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('not-simplified');
  });

  it('a THROWING simplifier is UNRESOLVED/parse-error, never refuted, and never rethrows', async () => {
    const boom: SymbolicSimplifier = async () => {
      throw new Error('CAS exploded');
    };
    const r = await runSymbolicWitness(spec, boom);
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('parse-error');
    expect(r.detail).toContain('CAS exploded');
  });

  it('a budget that elapses is UNRESOLVED/timeout', async () => {
    // A simplifier that never settles: the budget is then the only thing that can end the
    // wait, so the outcome does not depend on two timers racing (a 200 ms reply against a
    // 10 ms budget was the previous shape; it could not lose, but the proof was a margin).
    const never: SymbolicSimplifier = () => new Promise(() => {});
    const r = await runSymbolicWitness({ ...spec, budgetMs: 10 }, never);
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('timeout');
    // The doc comment's claim, pinned: the budget bounds the WAIT, not the CAS.
    expect(r.detail).toContain('bounds the WAIT');
  });

  it('forms the DIFFERENCE lhs − rhs, not something else', async () => {
    let seen: ExprNode | undefined;
    const spy: SymbolicSimplifier = async (e) => {
      seen = e;
      return { expr: sym('0', DIMENSIONLESS), simplified: true };
    };
    await runSymbolicWitness({ id: 'W-diff', lhs: sym('a', LENGTH), rhs: sym('b', LENGTH) }, spy);
    expect(seen).toEqual({
      kind: 'op',
      op: '-',
      args: [sym('a', LENGTH), sym('b', LENGTH)],
    });
  });

  it('an OMITTED simplifier reports peer-absent — not not-simplified — when the peer is missing', async () => {
    // The default path must carry the right REASON. simplifyExpr alone returns
    // simplified:false for both absence and failure, so this pins the presence
    // check that separates them.
    const r = await runSymbolicWitness(spec);
    if (await isSimplifierAvailable()) {
      expect(r.status).not.toBe('refuted');
      expect(r.reason).not.toBe('peer-absent');
    } else {
      expect(r.status).toBe('unresolved');
      expect(r.reason).toBe('peer-absent');
    }
  });

  // Peer absent and not required: the injected-null test above already covers
  // that path, and this one is reported as skipped, not passed.
  it.skipIf(!simplifierPresent && !peerRequired)('runs against the REAL peer under the skip-when-absent pattern', async () => {
    // x − x must vanish. This is the one test that uses the real `simplifyExpr`,
    // and it still does not touch the registry: it calls the default directly.
    const r = await runSymbolicWitness({ id: 'W-real', lhs: x, rhs: x }, simplifyExpr);
    // CHECKED, not merely "not refuted". The weaker assertion passed for a whole
    // afternoon while every dimensioned claim came back unresolved/parse-error:
    // the CAS returns a dimensionless 0 for a zero LENGTH and simplifyExpr's
    // dimension guard threw. A test that cannot fail does not pin anything.
    expect(r.status).toBe('checked');
    // A commuted sum must also cancel, and a genuinely different pair must not check.
    const y = sym('y', LENGTH);
    const commuted = await runSymbolicWitness(
      {
        id: 'W-comm',
        lhs: { kind: 'op', op: '+', args: [x, y] },
        rhs: { kind: 'op', op: '+', args: [y, x] },
      },
      simplifyExpr,
    );
    expect(commuted.status).toBe('checked');
    const distinct = await runSymbolicWitness({ id: 'W-xy', lhs: x, rhs: y }, simplifyExpr);
    expect(distinct.status).not.toBe('checked');
  });
});

describe('runNumericWitness', () => {
  /** Error ~ 1/resolution: a first-order scheme. */
  const firstOrder = (resolution: number): number => 1 + 1 / resolution;

  it('reports CHECKED with a convergence record when refinement helps', () => {
    const r = runNumericWitness({
      id: 'N1',
      evaluate: firstOrder,
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 0.05,
    });
    expect(r.status).toBe('checked');
    expect(r.convergence?.coarse).toBeCloseTo(0.1, 12);
    expect(r.convergence?.fine).toBeCloseTo(0.01, 12);
    expect(r.convergence?.ratio).toBeCloseTo(10, 9);
  });

  it('reports REFUTED when the FINE value misses the stated tolerance', () => {
    const r = runNumericWitness({
      id: 'N2',
      evaluate: firstOrder,
      target: 1,
      coarseResolution: 10,
      fineResolution: 20,
      tolerance: 1e-6,
    });
    expect(r.status).toBe('refuted');
    expect(r.convergence).toBeDefined();
  });

  it('a fine value inside tolerance that does NOT converge is UNRESOLVED, not checked', () => {
    // The defect this guards: a scheme stuck at a constant offset lands inside a
    // generous tolerance and looks verified. Agreement that does not improve with
    // refinement is agreement by accident.
    const stuck = (): number => 1.001;
    const r = runNumericWitness({
      id: 'N3',
      evaluate: stuck,
      target: 1,
      coarseResolution: 10,
      fineResolution: 1000,
      tolerance: 0.01,
    });
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('no-convergence');
    expect(r.convergence?.ratio).toBe(1);
  });

  it('an EXACT fine value is checked, with an infinite ratio rather than a failure', () => {
    const exactWhenFine = (resolution: number): number => (resolution >= 100 ? 1 : 1.5);
    const r = runNumericWitness({
      id: 'N4',
      evaluate: exactWhenFine,
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 1e-9,
    });
    expect(r.status).toBe('checked');
    expect(r.convergence?.ratio).toBe(Infinity);
  });

  it('a THROWING evaluation is UNRESOLVED/parse-error and never rethrows', () => {
    const r = runNumericWitness({
      id: 'N5',
      evaluate: () => {
        throw new Error('integrator diverged');
      },
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 0.1,
    });
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('parse-error');
    expect(r.convergence).toBeUndefined();
  });

  it('a NON-FINITE evaluation is UNRESOLVED, not refuted', () => {
    const r = runNumericWitness({
      id: 'N6',
      evaluate: () => Number.NaN,
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 0.1,
    });
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('parse-error');
  });

  it('a NaN target, a NaN tolerance, or a negative tolerance is UNRESOLVED, never checked', () => {
    const base = { evaluate: firstOrder, coarseResolution: 10, fineResolution: 100 };
    for (const [id, spec] of [
      ['N7', { ...base, target: Number.NaN, tolerance: 0.05 }],
      ['N8', { ...base, target: 1, tolerance: Number.NaN }],
      ['N9', { ...base, target: 1, tolerance: -0.05 }],
      ['N10', { ...base, target: Number.POSITIVE_INFINITY, tolerance: 0.05 }],
    ] as const) {
      const r = runNumericWitness({ id, ...spec });
      expect(r.status, id).toBe('unresolved');
      expect(r.reason, id).toBe('parse-error');
      expect(r.convergence, id).toBeUndefined();
    }
    // The same evaluator with a finite target and tolerance IS checked, so the guard is doing the deciding.
    expect(runNumericWitness({ id: 'N7c', ...base, target: 1, tolerance: 0.05 }).status).toBe('checked');
  });

  it('a scheme exact at BOTH resolutions is UNRESOLVED with its own reason, not "refinement did not reduce the error"', () => {
    const r = runNumericWitness({
      id: 'N11',
      evaluate: () => 1,
      target: 1,
      coarseResolution: 10,
      fineResolution: 100,
      tolerance: 1e-9,
    });
    expect(r.status).toBe('unresolved');
    expect(r.reason).toBe('no-error-to-reduce');
    expect(r.convergence?.coarse).toBe(0);
    expect(r.convergence?.fine).toBe(0);
    expect(r.convergence?.ratio).toBeNaN();
    expect(r.detail).not.toMatch(/did not reduce/);
  });
});

describe('passingWitnessIds', () => {
  it('admits ONLY checked runs — not "everything that was not refuted"', () => {
    const results: WitnessRunResult[] = [
      { witnessId: 'a', kind: 'symbolic', status: 'checked', detail: '', elapsedMs: 0 },
      {
        witnessId: 'b',
        kind: 'symbolic',
        status: 'unresolved',
        reason: 'peer-absent',
        detail: '',
        elapsedMs: 0,
      },
      { witnessId: 'c', kind: 'numeric', status: 'refuted', detail: '', elapsedMs: 0 },
    ];
    expect([...passingWitnessIds(results)]).toEqual(['a']);
  });
});
