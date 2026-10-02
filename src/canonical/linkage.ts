/**
 * Bridge↔canonical linkage (Sub-project B) — the "validate against standard
 * physics" engine. For a canonical equation with a scalar-AST and a bridge with
 * an RHS AST, it asks:
 *   1. do they share the same dimension? (necessary)
 *   2. are they the same relation up to dimensionless factors? (`normalForm`)
 *   3. (best-effort) do they agree numerically up to a constant ratio?
 *
 * The structural half — same dimension, `normalForm`, and the F4
 * `restatesBridge` guard — is `classifyStructure` in `structural.ts`. This
 * module calls that function and then runs numerical recovery. A structural
 * match is `restates-canonical` (a trivial X≡X, NOT a discovery) only when
 * the canonical entry's `restatesBridge` actually names that bridge. A
 * structural match the registry did NOT pre-declare is a genuine `recovers`
 * correspondence. Numerical agreement is not a confirmation.
 *
 * @module canonical/linkage
 */
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import { validate } from '../dimensional/validator.js';
import { evalExpr } from '../composition/expr-eval.js';
import { CONSTANTS } from '../dimensional/symbolic-constants.js';
import { BRIDGE_RHS_BY_ID } from '../bridges/rhs-registry.js';
import type { CanonicalEquation } from './canonical-equation.js';
import { CANONICAL_EQUATIONS, canonicalById } from './registry.js';
import { canonicalQuantityName, normalForm } from './normal-form.js';
import { classifyStructure } from './structural.js';

/** Best-effort numerical-recovery outcome. */
export interface RecoveryOutcome {
  /** Both ASTs evaluated at every sample (no unresolved leaf). */
  readonly tested: boolean;
  /** Spread of the canonical/bridge value ratio across samples (0 ⇒ they agree
   *  up to a single constant factor). `NaN` when not tested. */
  readonly maxRelErr: number;
}

/** One bridge↔canonical comparison. */
export interface LinkageResult {
  readonly canonicalId: string;
  readonly bridgeId: number;
  /** Inferred dimensions agree. */
  readonly dimMatch: boolean;
  /** Same relation up to dimensionless factors (`normalForm`). */
  readonly structuralMatch: boolean;
  readonly recovery: RecoveryOutcome | null;
  readonly classification:
    | 'restates-canonical'
    | 'recovers'
    | 'dimensional-only'
    | 'unrelated';
}

const isDimensionless = (d: Dimension): boolean =>
  d.L === 0 &&
  d.M === 0 &&
  d.T === 0 &&
  d.I === 0 &&
  d.Theta === 0 &&
  d.N === 0 &&
  d.J === 0;

/**
 * Collect leaves `evalExpr` can't resolve (not a registered constant, not a
 * numeric literal), split into physical `vars` (non-dimensionless — varied
 * across samples) and `dimless` (dimensionless — held fixed: they ARE the
 * constant factor "up to" which recovery is measured).
 */
function collectLeaves(
  node: ExprNode,
  vars: Map<string, string>,
  dimless: Set<string>,
): void {
  switch (node.kind) {
    case 'symbol':
      if (!(node.name in CONSTANTS) && Number.isNaN(Number(node.name))) {
        if (isDimensionless(node.dim)) dimless.add(node.name);
        else vars.set(node.name, canonicalQuantityName(node.name, node.dim));
      }
      return;
    case 'op':
      for (const a of node.args) collectLeaves(a, vars, dimless);
      return;
    case 'transcendental':
      collectLeaves(node.arg, vars, dimless);
      return;
    case 'abs':
      collectLeaves(node.arg, vars, dimless);
      return;
    default:
      return;
  }
}

const SAMPLE_FACTORS = [1, 2, 3];

/** Best-effort check that two ASTs agree up to a constant ratio. */
function numericalRecovery(canon: ExprNode, bridge: ExprNode): RecoveryOutcome {
  const vars = new Map<string, string>();
  const dimless = new Set<string>();
  collectLeaves(canon, vars, dimless);
  collectLeaves(bridge, vars, dimless);
  // `M` and `mass` are one quantity. They share a sample, or the ratio is a
  // float artifact of two independent draws of the same mass.
  const canonicals = [...new Set(vars.values())].sort();
  const index = new Map(canonicals.map((n, i) => [n, i]));
  const ratios: number[] = [];
  for (const s of SAMPLE_FACTORS) {
    const values: Record<string, number> = {};
    for (const [raw, canonName] of vars) {
      values[raw] = (1.3 + 0.7 * index.get(canonName)!) * s;
    }
    // Hold unresolved dimensionless leaves fixed — recovery is "up to" them.
    for (const n of dimless) values[n] = 1;
    let cv: number;
    let bv: number;
    try {
      cv = evalExpr(canon, values);
      bv = evalExpr(bridge, values);
    } catch {
      return { tested: false, maxRelErr: NaN };
    }
    // Guard cv===0 too: with cv===0 the ratio is 0 at every sample, so the
    // relative-spread denominator r0===0 ⇒ NaN — a false "tested" result.
    if (!Number.isFinite(cv) || !Number.isFinite(bv) || bv === 0 || cv === 0) {
      return { tested: false, maxRelErr: NaN };
    }
    ratios.push(cv / bv);
  }
  const r0 = ratios[0];
  const maxRelErr = Math.max(...ratios.map((r) => Math.abs((r - r0) / r0)));
  return { tested: true, maxRelErr };
}

/**
 * A bridge RHS reduced to its comparison-ready, canonical-invariant form:
 * its validated dimension and its normal-form hash. Both depend only on the
 * bridge, so `scanLinkages` computes them once per bridge instead of once per
 * (canonical × bridge) pair.
 */
interface BridgePrecomp {
  readonly rhs: ExprNode;
  /** Inferred dimension when `validate` succeeded, else `null`. */
  readonly dim: Dimension | null;
  /** `normalForm(rhs)` — the structural hash. */
  readonly normal: string;
}

/** Validate + normal-form a bridge RHS once. */
function precomputeBridge(rhs: ExprNode): BridgePrecomp {
  const v = validate(rhs);
  return {
    rhs,
    dim: v.ok ? v.inferredDimension : null,
    normal: normalForm(rhs),
  };
}

/**
 * The comparison core, given a canonical entry (with its pre-computed
 * normal-form) and a pre-computed bridge. Pure: no AST re-walks except the
 * rare `numericalRecovery` that only fires on a structural match.
 */
function classifyAgainst(
  canon: CanonicalEquation,
  canonAst: ExprNode,
  canonNormal: string,
  bridgeId: number,
  bridge: BridgePrecomp,
): LinkageResult {
  const relation = classifyStructure({
    left: canonAst,
    leftDim: canon.dimensional.target.dim,
    leftNormal: canonNormal,
    right: bridge.rhs,
    rightDim: bridge.dim,
    rightNormal: bridge.normal,
    restatesBridge: canon.restatesBridge,
    bridgeId: String(bridgeId),
  });
  const recovery = relation.structuralMatch ? numericalRecovery(canonAst, bridge.rhs) : null;

  let classification: LinkageResult['classification'];
  if (relation.structuralMatch) {
    classification = relation.restates ? 'restates-canonical' : 'recovers';
  } else if (relation.dimMatch) {
    classification = 'dimensional-only';
  } else {
    classification = 'unrelated';
  }

  return {
    canonicalId: canon.id,
    bridgeId,
    dimMatch: relation.dimMatch,
    structuralMatch: relation.structuralMatch,
    recovery,
    classification,
  };
}

/** Compare one canonical entry against one bridge. */
export function classifyLinkage(
  canonicalId: string,
  bridgeId: number,
): LinkageResult {
  const canon = canonicalById(canonicalId);
  const bridgeRhs = BRIDGE_RHS_BY_ID.get(bridgeId);

  if (!canon || !bridgeRhs || !canon.scalarAst) {
    return {
      canonicalId,
      bridgeId,
      dimMatch: false,
      structuralMatch: false,
      recovery: null,
      classification: 'unrelated',
    };
  }

  return classifyAgainst(
    canon,
    canon.scalarAst,
    normalForm(canon.scalarAst),
    bridgeId,
    precomputeBridge(bridgeRhs),
  );
}

/**
 * Scan every canonical entry (with a scalar-AST) against every bridge RHS, and
 * return the non-`unrelated` results — the physicist's linkage worklist.
 *
 * Each bridge is validated and normal-formed ONCE (canonical-invariant), and
 * each canonical's normal-form is computed once per outer iteration
 * (bridge-invariant); the inner loop then only compares pre-computed strings
 * and dimensions. Reduces the per-pair AST walks (~3·C·B) to ~2·B + C.
 */
export function scanLinkages(): LinkageResult[] {
  const results: LinkageResult[] = [];
  const bridges: ReadonlyArray<readonly [number, BridgePrecomp]> = [
    ...BRIDGE_RHS_BY_ID,
  ].map(([id, rhs]) => [id, precomputeBridge(rhs)] as const);

  for (const ce of CANONICAL_EQUATIONS) {
    if (!ce.scalarAst) continue;
    const canonNormal = normalForm(ce.scalarAst);
    for (const [bridgeId, bridge] of bridges) {
      const r = classifyAgainst(
        ce,
        ce.scalarAst,
        canonNormal,
        bridgeId,
        bridge,
      );
      if (r.classification !== 'unrelated') results.push(r);
    }
  }
  return results;
}
