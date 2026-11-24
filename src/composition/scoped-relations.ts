/**
 * Explicit consequences of paired canonical equations under stated restrictions.
 * These relations compare observables without folding graph nodes or extending
 * a restricted equality to arbitrary inputs.
 *
 * @module composition/scoped-relations
 */

import { canonicalById } from '../canonical/registry.js';
import { C_SI, M_E_SI } from '../core/constants.js';
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

interface Scope extends Omit<ScopedRelation, 'kind' | 'controls'> {
  readonly samples: readonly Readonly<Record<string, number>>[];
}

const electronMomentum = M_E_SI * C_SI;

const SCOPES: readonly Scope[] = [
  {
    id: 'compton-scattering-shift',
    a: 'compton-wavelength-shift',
    b: 'compton-wavelength-full',
    ratio: '1 - cos(scattering-angle)',
    equalityWhen: 'scattering-angle == pi/2',
    assumptions: [
      'Compton scattering from a free electron initially at rest',
      'Use the full Compton wavelength of that electron, with mass = m_e',
      'Scattering angle is in radians in [0, pi]',
    ],
    sourceEquations: ['CE-compton-shift', 'CE-compton-wavelength-full'],
    samples: [0, Math.PI / 2, Math.PI].map((angle) => ({ mass: M_E_SI, 'scattering-angle': angle })),
  },
  {
    id: 'de-broglie-full-compton',
    a: 'de-broglie-wavelength',
    b: 'compton-wavelength-full',
    ratio: 'mass * c / p',
    equalityWhen: 'p == mass * c',
    assumptions: ['Positive momentum magnitude and rest mass of the same particle', 'Both wavelengths use h'],
    sourceEquations: ['CE-de-broglie', 'CE-compton-wavelength-full'],
    samples: [0.5, 1, 2].map((factor) => ({ mass: M_E_SI, p: factor * electronMomentum })),
  },
  {
    id: 'de-broglie-reduced-compton',
    a: 'de-broglie-wavelength',
    b: 'compton-wavelength',
    ratio: '2 * pi * mass * c / p',
    equalityWhen: 'p == (2 * pi) * (mass * c)',
    assumptions: ['Positive momentum magnitude and rest mass of the same particle', 'The numerator uses h and the denominator uses ℏ'],
    sourceEquations: ['CE-de-broglie', 'CE-compton-wavelength'],
    samples: [0.5, 1, Math.PI * 2].map((factor) => ({ mass: M_E_SI, p: factor * electronMomentum })),
  },
];

function applicableScopes(edges: readonly BridgeEdge[]) {
  const byId = new Map(edges.map((edge) => [edge.id, edge]));
  return SCOPES.flatMap((scope) => {
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
