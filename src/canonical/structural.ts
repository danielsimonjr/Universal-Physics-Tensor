/**
 * Structural half of a bridge↔canonical comparison, shared with the chain
 * pipeline. Same dimension, `normalForm`, and the F4 `restatesBridge` guard.
 *
 * This module does not import `composition/expr-eval.ts`. Numerical agreement
 * is not a result here and is not a confirmation. `linkage.ts` calls
 * {@link classifyStructure} and then runs its own numerical recovery.
 *
 * A chain whose normal form matches a catalog right-hand side the registry
 * did not pre-declare confirms that catalog id. The call writes nothing.
 * A chain that matches a canonical equation the registry pre-declared with
 * `restatesBridge` is a restatement. Any other chain receives a provisional
 * id, `chain-` followed by the ordered edge ids. That id is not a catalog
 * id. It enters `BRIDGE_EQUATIONS` only after a vendored PhysJS proof, which
 * this function does not record.
 *
 * @module canonical/structural
 */
import type { ExprNode } from '../dimensional/validator.js';
import type { Dimension } from '../dimensional/types.js';
import { validate } from '../dimensional/validator.js';
import { BRIDGE_RHS_BY_ID } from '../bridges/rhs-registry.js';
import { CANONICAL_EQUATIONS } from './registry.js';
import { normalForm } from './normal-form.js';

/** One side of a structural comparison, plus the F4 inputs. @internal */
export interface StructuralPair {
  readonly left: ExprNode;
  readonly leftDim: Dimension;
  /** Precomputed `normalForm(left)`. Computed here when omitted. */
  readonly leftNormal?: string;
  readonly right: ExprNode;
  /** Inferred dimension of `right`, or null when validation failed. */
  readonly rightDim: Dimension | null;
  /** Precomputed `normalForm(right)`. Computed here when omitted. */
  readonly rightNormal?: string;
  /** The canonical entry's `restatesBridge`, when it has one. */
  readonly restatesBridge: string | undefined;
  /** The bridge id this comparison is against, as `restatesBridge` spells it. */
  readonly bridgeId: string;
}

/** Dimension, normal form, and the F4 guard. No numerical recovery. @internal */
export interface StructuralRelation {
  readonly dimMatch: boolean;
  readonly structuralMatch: boolean;
  /**
   * True only when the normal forms match and `restatesBridge` names
   * `bridgeId`. A structural match the registry did not pre-declare is
   * not a restatement.
   */
  readonly restates: boolean;
}

/** A chain matched an existing catalog equation. Nothing was written. @internal */
export interface ChainConfirmation {
  readonly kind: 'confirmation';
  readonly catalogId: number;
  readonly edgeIds: readonly string[];
}

/** A chain matches a canonical equation the registry pre-declared. @internal */
export interface ChainRestatement {
  readonly kind: 'restatement';
  readonly canonicalId: string;
  readonly restatesBridge: string;
  readonly edgeIds: readonly string[];
}

/**
 * A chain that is neither a catalog confirmation nor a pre-declared
 * restatement. `id` is `chain-` plus the edge ids in chain order.
 * @internal
 */
export interface ChainProvisional {
  readonly kind: 'provisional';
  readonly id: string;
  readonly edgeIds: readonly string[];
}

/** Decision (a) for one chain. @internal */
export type ChainClassification = ChainConfirmation | ChainRestatement | ChainProvisional;

const dimEqual = (a: Dimension, b: Dimension): boolean =>
  a.L === b.L &&
  a.M === b.M &&
  a.T === b.T &&
  a.I === b.I &&
  a.Theta === b.Theta &&
  a.N === b.N &&
  a.J === b.J;

function isStructuralPair(value: ExprNode | StructuralPair): value is StructuralPair {
  return !('kind' in value) && 'bridgeId' in value;
}

function comparePair(pair: StructuralPair): StructuralRelation {
  const leftNormal = pair.leftNormal ?? normalForm(pair.left);
  const rightNormal = pair.rightNormal ?? normalForm(pair.right);
  const structuralMatch = leftNormal === rightNormal;
  return {
    dimMatch: pair.rightDim != null && dimEqual(pair.rightDim, pair.leftDim),
    structuralMatch,
    restates:
      structuralMatch &&
      pair.restatesBridge !== undefined &&
      pair.restatesBridge === pair.bridgeId,
  };
}

function bridgeRank(id: string): number {
  return /^\d+$/.test(id) ? Number(id) : Number.POSITIVE_INFINITY;
}

/**
 * A bridge RHS reduced to its comparison-ready, canonical-invariant form: its
 * validated dimension (`null` when validation failed) and its normal-form
 * hash. Both depend only on the bridge.
 *
 * @internal
 */
export interface BridgeShape {
  readonly rhs: ExprNode;
  readonly dim: Dimension | null;
  readonly normal: string;
}

let bridgeShapeTable: ReadonlyMap<number, BridgeShape> | undefined;

/**
 * Every bridge RHS, validated and normal-formed ONCE for the process.
 * `BRIDGE_RHS_BY_ID` is static, so the table is computed on first use and
 * kept; a chain classification and a linkage scan both read it instead of
 * re-validating every entry per call (9.0.0 audit §4 Low).
 *
 * @internal
 */
export function bridgeShapes(): ReadonlyMap<number, BridgeShape> {
  if (bridgeShapeTable === undefined) {
    const table = new Map<number, BridgeShape>();
    for (const [id, rhs] of BRIDGE_RHS_BY_ID) {
      const v = validate(rhs);
      table.set(id, { rhs, dim: v.ok ? v.inferredDimension : null, normal: normalForm(rhs) });
    }
    bridgeShapeTable = table;
  }
  return bridgeShapeTable;
}

/**
 * Provisional id for a chain. The edge ids stay in the order the caller
 * passed, which is the chain order. They are not sorted.
 */
function provisionalChainId(edgeIds: readonly string[]): string {
  return `chain-${edgeIds.join('-')}`;
}

function classifyChain(expr: ExprNode, edgeIds: readonly string[]): ChainClassification {
  const ordered = [...edgeIds];
  const validated = validate(expr);
  const leftDim = validated.ok ? validated.inferredDimension : null;
  if (leftDim == null) {
    return { kind: 'provisional', id: provisionalChainId(ordered), edgeIds: ordered };
  }
  const leftNormal = normalForm(expr);

  const restatements: { canonicalId: string; restatesBridge: string }[] = [];
  for (const ce of CANONICAL_EQUATIONS) {
    if (ce.scalarAst === undefined || ce.restatesBridge === undefined) continue;
    const relation = comparePair({
      left: expr,
      leftDim,
      leftNormal,
      right: ce.scalarAst,
      rightDim: ce.dimensional.target.dim,
      restatesBridge: ce.restatesBridge,
      bridgeId: ce.restatesBridge,
    });
    if (relation.restates && relation.dimMatch) {
      restatements.push({ canonicalId: ce.id, restatesBridge: ce.restatesBridge });
    }
  }
  restatements.sort((a, b) => {
    const byBridge = bridgeRank(a.restatesBridge) - bridgeRank(b.restatesBridge);
    if (byBridge !== 0) return byBridge;
    return a.canonicalId < b.canonicalId ? -1 : a.canonicalId > b.canonicalId ? 1 : 0;
  });
  const restatement = restatements[0];
  if (restatement !== undefined) {
    return {
      kind: 'restatement',
      canonicalId: restatement.canonicalId,
      restatesBridge: restatement.restatesBridge,
      edgeIds: ordered,
    };
  }

  const confirmations: number[] = [];
  for (const [id, bridge] of bridgeShapes()) {
    const relation = comparePair({
      left: expr,
      leftDim,
      leftNormal,
      right: bridge.rhs,
      rightDim: bridge.dim,
      rightNormal: bridge.normal,
      restatesBridge: undefined,
      bridgeId: String(id),
    });
    if (relation.structuralMatch && relation.dimMatch) confirmations.push(id);
  }
  confirmations.sort((a, b) => a - b);
  const catalogId = confirmations[0];
  if (catalogId !== undefined) {
    return { kind: 'confirmation', catalogId, edgeIds: ordered };
  }

  return { kind: 'provisional', id: provisionalChainId(ordered), edgeIds: ordered };
}

/**
 * The structural classifier.
 *
 * A {@link StructuralPair} returns the dimension, normal-form, and F4
 * result `classifyLinkage` uses. An expression plus the chain's ordered
 * edge ids returns the chain classification. Both calls are this function.
 *
 * @internal
 */
export function classifyStructure(pair: StructuralPair): StructuralRelation;
export function classifyStructure(expr: ExprNode, edgeIds: readonly string[]): ChainClassification;
export function classifyStructure(
  exprOrPair: ExprNode | StructuralPair,
  edgeIds?: readonly string[],
): StructuralRelation | ChainClassification {
  if (isStructuralPair(exprOrPair)) return comparePair(exprOrPair);
  if (edgeIds === undefined) {
    throw new TypeError('classifyStructure: a chain needs its ordered edge ids');
  }
  return classifyChain(exprOrPair, edgeIds);
}
