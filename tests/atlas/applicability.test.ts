/**
 * Atlas Phase 4, S4.1 — the applicability checker.
 *
 * Design note: `docs/planning/Atlas-Phase-4-Design.md` §1.
 */

import { describe, expect, it } from 'vitest';
import { dim, sym } from '../../src/dimensional/ast-builders.js';
import type { ExprNode } from '../../src/dimensional/ast-types.js';
import {
  blockingFindings,
  checkApplicability,
} from '../../src/atlas/applicability.js';
import type { AtlasModel } from '../../src/atlas/model.js';
import type { Regime } from '../../src/atlas/types.js';

const DIMENSIONLESS = dim();
const LENGTH = dim(1);

const EMPTY_REGIME: Regime = { family: 'test', inequalities: [], groupDefinitions: {} };

function model(id: string, family: string): AtlasModel {
  return {
    id,
    family,
    stateSpace: 'ℝ',
    dynamics: 'ẋ = 0',
    observables: [],
    parameters: [],
    dimensionlessInputs: [],
    canonicalRefs: [],
    regime: EMPTY_REGIME,
  };
}

const kinds = (fs: readonly { kind: string }[]): string[] => fs.map((f) => f.kind);

describe('checkApplicability — side conditions over the AST', () => {
  const aOverB: ExprNode = {
    kind: 'op',
    op: '/',
    args: [sym('a', LENGTH), sym('b', LENGTH)],
  };

  it('reports a division whose divisor has no stated non-vanishing side condition', () => {
    const findings = checkApplicability({ ast: aOverB, sideConditions: [] });
    expect(kinds(findings)).toContain('division-unguarded');
    // A silence, never a contradiction.
    expect(findings.find((f) => f.kind === 'division-unguarded')?.severity).toBe('question');
    expect(blockingFindings(findings)).toHaveLength(0);
  });

  it('stays silent when the divisor IS guarded', () => {
    const findings = checkApplicability({ ast: aOverB, sideConditions: ['b ≠ 0'] });
    expect(kinds(findings)).not.toContain('division-unguarded');
  });

  it('accepts the ASCII and prose spellings of the same guard', () => {
    for (const guard of ['b != 0', 'b <> 0', 'b is nonzero', 'b > 0', 'b positive']) {
      const findings = checkApplicability({ ast: aOverB, sideConditions: [guard] });
      expect(kinds(findings), guard).not.toContain('division-unguarded');
    }
  });

  it('does NOT clear a divisor whose name is only a SUBSTRING of a word in the prose', () => {
    // `a` is not guarded by "the amplitude is positive": the matcher must read
    // whole tokens, or every one-letter divisor is cleared by any sentence that
    // contains its letter beside a marker.
    const xOverA: ExprNode = { kind: 'op', op: '/', args: [sym('x', LENGTH), sym('a', LENGTH)] };
    const findings = checkApplicability({ ast: xOverA, sideConditions: ['the amplitude is positive'] });
    expect(kinds(findings)).toContain('division-unguarded');
    const named = checkApplicability({ ast: xOverA, sideConditions: ['a is positive'] });
    expect(kinds(named)).not.toContain('division-unguarded');
    const symbolic = checkApplicability({ ast: xOverA, sideConditions: ['x/a with a > 0'] });
    expect(kinds(symbolic)).not.toContain('division-unguarded');
  });

  it('does NOT clear a divisor the prose never mentions — the asymmetry that matters', () => {
    // A guard on a DIFFERENT symbol must not clear `b`. This is the false-clearance
    // case design note §1.3 says the shallow matcher cannot produce; pinning it here
    // so a future widening of the marker list cannot introduce one.
    const findings = checkApplicability({ ast: aOverB, sideConditions: ['a ≠ 0'] });
    expect(kinds(findings)).toContain('division-unguarded');
  });

  it('a literal non-zero divisor needs no side condition; a literal 0 blocks', () => {
    const overTwo: ExprNode = {
      kind: 'op',
      op: '/',
      args: [sym('a', LENGTH), sym('2', DIMENSIONLESS)],
    };
    expect(kinds(checkApplicability({ ast: overTwo, sideConditions: [] }))).toEqual([]);

    const overZero: ExprNode = {
      kind: 'op',
      op: '/',
      args: [sym('a', LENGTH), sym('0', DIMENSIONLESS)],
    };
    const findings = checkApplicability({ ast: overZero, sideConditions: [] });
    expect(kinds(findings)).toContain('division-by-zero');
    expect(blockingFindings(findings)).toHaveLength(1);
  });

  it('descends into nested subtrees', () => {
    const nested: ExprNode = {
      kind: 'abs',
      arg: { kind: 'op', op: '*', args: [sym('c', DIMENSIONLESS), aOverB] },
    };
    const findings = checkApplicability({ ast: nested, sideConditions: [] });
    expect(kinds(findings)).toContain('division-unguarded');
    expect(findings.find((f) => f.kind === 'division-unguarded')?.where)
      .toBe('args[0].args[1].args[1]');
  });
});

describe('checkApplicability — the squaring rule', () => {
  const square = (name: string): ExprNode => ({
    kind: 'op',
    op: '^',
    args: [sym(name, LENGTH), sym('2', DIMENSIONLESS)],
  });

  it('flags a difference of two equal even powers as solution-adding', () => {
    const xSqMinusYSq: ExprNode = { kind: 'op', op: '-', args: [square('x'), square('y')] };
    const findings = checkApplicability({ ast: xSqMinusYSq, sideConditions: [] });
    const f = findings.find((x) => x.kind === 'squaring-adds-solutions');
    expect(f).toBeDefined();
    expect(f?.severity).toBe('question');
    expect(f?.detail).toContain('2');
  });

  it('does NOT flag an isolated even power — only equating two of them', () => {
    // Design note §1.4: a rule that fired on every square would fire on nearly
    // every record in the atlas and be switched off within a week.
    const alone: ExprNode = { kind: 'op', op: '*', args: [square('x'), sym('k', DIMENSIONLESS)] };
    expect(kinds(checkApplicability({ ast: alone, sideConditions: [] })))
      .not.toContain('squaring-adds-solutions');
  });

  it('does NOT flag a difference of ODD powers', () => {
    const cube = (name: string): ExprNode => ({
      kind: 'op',
      op: '^',
      args: [sym(name, LENGTH), sym('3', DIMENSIONLESS)],
    });
    const diff: ExprNode = { kind: 'op', op: '-', args: [cube('x'), cube('y')] };
    expect(kinds(checkApplicability({ ast: diff, sideConditions: [] })))
      .not.toContain('squaring-adds-solutions');
  });

  it('does NOT flag a difference of DIFFERENT even powers', () => {
    const fourth: ExprNode = {
      kind: 'op',
      op: '^',
      args: [sym('y', DIMENSIONLESS), sym('4', DIMENSIONLESS)],
    };
    const diff: ExprNode = {
      kind: 'op',
      op: '-',
      args: [
        { kind: 'op', op: '^', args: [sym('x', DIMENSIONLESS), sym('2', DIMENSIONLESS)] },
        fourth,
      ],
    };
    expect(kinds(checkApplicability({ ast: diff, sideConditions: [] })))
      .not.toContain('squaring-adds-solutions');
  });
});

describe('checkApplicability — dimensions', () => {
  it('reports an inhomogeneous sum as blocking', () => {
    const bad: ExprNode = { kind: 'op', op: '+', args: [sym('L', LENGTH), sym('t', dim(0, 0, 1))] };
    const findings = checkApplicability({ ast: bad, sideConditions: [] });
    expect(kinds(findings)).toContain('dimensional-inconsistency');
    expect(blockingFindings(findings).length).toBeGreaterThan(0);
  });

  it('reports nothing dimensional for a homogeneous expression', () => {
    const good: ExprNode = { kind: 'op', op: '+', args: [sym('L', LENGTH), sym('R', LENGTH)] };
    expect(kinds(checkApplicability({ ast: good, sideConditions: [] })))
      .not.toContain('dimensional-inconsistency');
  });
});

describe('checkApplicability — conventions', () => {
  it('a DECLARED disagreement blocks', () => {
    const findings = checkApplicability({
      sideConditions: [],
      premiseConventions: { metricSignature: '-+++' },
      conclusionConventions: { metricSignature: '+---' },
    });
    expect(kinds(findings)).toEqual(['convention-mismatch']);
    expect(findings[0]?.severity).toBe('blocking');
    expect(findings[0]?.where).toBe('metricSignature');
  });

  it('a ONE-SIDED declaration is a question, not a mismatch', () => {
    const findings = checkApplicability({
      sideConditions: [],
      premiseConventions: { metricSignature: '-+++' },
      conclusionConventions: { unitSystem: 'SI' },
    });
    expect(kinds(findings).sort()).toEqual(['convention-undeclared', 'convention-undeclared']);
    expect(blockingFindings(findings)).toHaveLength(0);
  });

  it('agreement produces nothing', () => {
    const findings = checkApplicability({
      sideConditions: [],
      premiseConventions: { unitSystem: 'SI' },
      conclusionConventions: { unitSystem: 'SI' },
    });
    expect(findings).toEqual([]);
  });
});

describe('checkApplicability — model compatibility', () => {
  it('same-family premises and conclusion produce nothing', () => {
    const findings = checkApplicability({
      sideConditions: [],
      premises: [model('model-spring', 'oscillators'), model('model-lc', 'oscillators')],
      conclusion: model('model-damped', 'oscillators'),
    });
    expect(findings).toEqual([]);
  });

  it('an unrecorded cross-family step is a question', () => {
    const findings = checkApplicability({
      sideConditions: [],
      premises: [model('model-spring', 'oscillators')],
      conclusion: model('model-heat', 'diffusion'),
    });
    expect(kinds(findings)).toEqual(['model-incompatibility']);
    expect(findings[0]?.severity).toBe('question');
  });

  it('a DECLARED family bridge clears it, in either order', () => {
    for (const pair of [
      ['oscillators', 'diffusion'],
      ['diffusion', 'oscillators'],
    ] as const) {
      const findings = checkApplicability({
        sideConditions: [],
        premises: [model('model-spring', 'oscillators')],
        conclusion: model('model-heat', 'diffusion'),
        declaredBridges: [pair],
      });
      expect(findings, pair.join('|')).toEqual([]);
    }
  });
});

describe('checkApplicability — the empty result', () => {
  it('an empty finding list means "no rule fired", and the module has no verdict', () => {
    // Pinned so nobody reads `[]` as "valid". The checker is given nothing here:
    // no AST, no conventions, no models. It cannot possibly have checked anything,
    // and it still returns [] — which is exactly why [] is not a clearance.
    expect(checkApplicability({ sideConditions: [] })).toEqual([]);
  });
});
