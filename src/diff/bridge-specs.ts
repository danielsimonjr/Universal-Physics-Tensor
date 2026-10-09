/**
 * Differentiable relations projected from the catalog. The scalar is the
 * catalog expression. Parameter names are the relation's aliases.
 *
 * @module diff/bridge-specs
 */

import type { BridgeDiffSpec } from './bridge-gradient.js';
import { catalogEdgeKey, catalogRelations } from '../bridges/catalog-load.js';
import type { CatalogRelation } from '../bridges/catalog-types.js';
import { evaluateCatalogRelation } from '../bridges/relation-eval.js';

/**
 * The catalog id a differentiable relation is labelled by. A relation with no
 * catalog id is not a catalog bridge and gets no `be-<n>` label; it throws
 * rather than defaulting to `be-0`.
 * @internal
 */
export function requireCatalogId(relation: CatalogRelation): number {
  if (relation.catalogId === null) {
    throw new Error(`bridge-specs: relation '${relation.id}' has no catalog id and cannot be labelled be-<n>`);
  }
  return relation.catalogId;
}

function relationWithSource(source: string): CatalogRelation {
  const found = catalogRelations().find((row) => row.sources.includes(source));
  if (found === undefined) throw new Error(`bridge-specs: no relation has source '${source}'`);
  return found;
}

function evaluateAliased(relation: CatalogRelation, input: object): number {
  const record = input as Record<string, number | undefined>;
  const bound: Record<string, number> = {};
  for (const source of relation.sources) {
    const alias = (relation.aliases[source] ?? []).find((key) => record[key] !== undefined);
    const key = alias ?? (record[source] !== undefined ? source : undefined);
    if (key === undefined) throw new Error(`${relation.id}: missing ${source}`);
    const value = record[key];
    if (value === undefined) throw new Error(`${relation.id}: missing ${source}`);
    bound[source] = value;
  }
  return evaluateCatalogRelation(relation, bound);
}

interface ShapiroInput {
  readonly M_kg: number;
  readonly R_far_m: number;
  readonly R_near_m: number;
}

interface PerihelionInput {
  readonly M_kg: number;
  readonly a_m: number;
  /** Orbital eccentricity, 0 ≤ e < 1. A bare `e` is the elementary charge, so it is not this key. */
  readonly eccentricity: number;
  readonly T_yr?: number;
}

interface HawkingInput {
  readonly M_kg: number;
}

interface DecoherenceInput {
  readonly gamma0_per_s: number;
  readonly lambda: number;
  readonly lambda0: number;
}

const shapiro = relationWithSource('far-radius');
const perihelion = relationWithSource('semi-major-axis');
const hawking = catalogRelations().find(
  (row) => row.target === 'hawking-temperature' && row.sources.length === 1 && row.sources[0] === 'mass',
);
if (hawking === undefined) throw new Error('bridge-specs: no Hawking temperature relation');
const decoherence = relationWithSource('system-environment-coupling');

/** Shapiro delay. Differentiable in mass and the two radii. @public */
export const SHAPIRO_DELAY_DIFF: BridgeDiffSpec<ShapiroInput> = {
  bridgeId: catalogEdgeKey(requireCatalogId(shapiro)),
  name: 'Shapiro time delay',
  paramNames: ['M_kg', 'R_far_m', 'R_near_m'],
  defaults: {},
  evaluate: (input) => evaluateAliased(shapiro, input),
};

/** Perihelion advance in radians per orbit. @public */
export const PERIHELION_ADVANCE_DIFF: BridgeDiffSpec<PerihelionInput> = {
  bridgeId: catalogEdgeKey(requireCatalogId(perihelion)),
  name: 'Perihelion advance (radian per orbit)',
  paramNames: ['M_kg', 'a_m', 'eccentricity'],
  defaults: {},
  evaluate: (input) => evaluateAliased(perihelion, input),
};

/** Hawking temperature. Differentiable in mass. @public */
export const HAWKING_TEMPERATURE_DIFF: BridgeDiffSpec<HawkingInput> = {
  bridgeId: catalogEdgeKey(requireCatalogId(hawking)),
  name: 'Hawking temperature',
  paramNames: ['M_kg'],
  defaults: {},
  evaluate: (input) => evaluateAliased(hawking, input),
};

/** Decoherence rate. Differentiable in the rate and the two couplings. @public */
export const DECOHERENCE_RATE_DIFF: BridgeDiffSpec<DecoherenceInput> = {
  bridgeId: catalogEdgeKey(requireCatalogId(decoherence)),
  name: 'Decoherence rate',
  paramNames: ['gamma0_per_s', 'lambda', 'lambda0'],
  defaults: {},
  evaluate: (input) => evaluateAliased(decoherence, input),
};

/** Catalog relations this module differentiates. @public */
export const DIFFERENTIABLE_RELATIONS = [
  SHAPIRO_DELAY_DIFF,
  PERIHELION_ADVANCE_DIFF,
  HAWKING_TEMPERATURE_DIFF,
  DECOHERENCE_RATE_DIFF,
] as const;
