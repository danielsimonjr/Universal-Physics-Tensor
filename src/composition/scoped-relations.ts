/**
 * Explicit consequences of paired canonical equations under stated restrictions.
 * These relations compare observables without folding graph nodes or extending
 * a restricted equality to arbitrary inputs.
 *
 * @module composition/scoped-relations
 */

import { canonicalById } from '../canonical/registry.js';
import { ATOMIC_SCOPED_RELATIONS } from '../canonical/entries/atomic.js';
import { canonicalEdgeOrigin } from './canonical-graph.js';
import { evaluateEdge, validityDomain, type BridgeEdge } from './edge.js';

/** Evaluation of both original equations at one declared SI control point. @internal */
export interface ScopedRelationControl {
  readonly inputs: Readonly<Record<string, number>>;
  readonly aValue: number;
  readonly bValue: number;
  readonly ratio: number;
  readonly equalityConditionMet: boolean;
}

/** A scoped consequence entailed by named equations, outside the discovery ranking. @internal */
export interface ScopedRelation {
  readonly id: string;
  readonly kind: 'entailed';
  readonly a: string;
  readonly b: string;
  /** Right-hand side of the dimensionless ratio a/b. */
  readonly ratio: string;
  /** Predicate for equality within the stated assumptions. */
  readonly equalityWhen: string;
  readonly assumptions: readonly string[];
  /** Source equations for a and b, in order. */
  readonly sourceEquations: readonly [string, string];
  readonly controls: readonly ScopedRelationControl[];
}

function applicableScopes(edges: readonly BridgeEdge[]) {
  const byId = new Map(edges.map((edge) => [edge.id, edge]));
  return ATOMIC_SCOPED_RELATIONS.flatMap((scope) => {
    const [leftId, rightId] = scope.sourceEquations;
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    if (left === undefined || right === undefined ||
        left.target.name !== scope.a || right.target.name !== scope.b ||
        canonicalEdgeOrigin(left) !== canonicalById(leftId) ||
        canonicalEdgeOrigin(right) !== canonicalById(rightId)) return [];
    return [{ scope, left, right }];
  });
}

/** The pairs explained by a scoped relation in this graph, without running its controls. @internal */
export function scopedRelationPairs(edges: readonly BridgeEdge[]): readonly Pick<ScopedRelation, 'a' | 'b'>[] {
  return applicableScopes(edges).map(({ scope }) => ({ a: scope.a, b: scope.b }));
}

function atControl(edge: BridgeEdge, inputs: Readonly<Record<string, number>>): number {
  return evaluateEdge(edge, Object.fromEntries(edge.sources.map(({ name }) => [name, inputs[name]!])));
}

/** List the applicable scoped relations and their source-equation controls, optionally for one pair. @internal */
export function scopedRelations(edges: readonly BridgeEdge[], pair?: readonly [string, string]): ScopedRelation[] {
  return applicableScopes(edges).flatMap(({ scope: { samples, ...scope }, left, right }) => {
    if (pair !== undefined &&
        !((pair[0] === scope.a && pair[1] === scope.b) || (pair[0] === scope.b && pair[1] === scope.a))) return [];
    const names = [...left.sources, ...right.sources].map(({ name }) => name);
    const equality = validityDomain(scope.equalityWhen, names);
    const controls = samples.map((inputs): ScopedRelationControl => {
      const aValue = atControl(left, inputs);
      const bValue = atControl(right, inputs);
      return {
        inputs,
        aValue,
        bValue,
        ratio: aValue / bValue,
        equalityConditionMet: equality.predicate({ ...inputs }),
      };
    });
    return [{ ...scope, kind: 'entailed', controls }];
  });
}
