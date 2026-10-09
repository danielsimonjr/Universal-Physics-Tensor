/**
 * The PUBLIC atlas surface — reached as the `atlas` namespace of the package
 * root (`import { atlas } from 'universal-physics-tensor'`).
 *
 * This file is the SINGLE list of what is public. Nothing else states the set
 * or its size: the tests derive both from the re-exports below. Decision and
 * criteria: `docs/planning/Atlas-API-Review.md` (Tier 1 — contracts unchanged
 * across Sprints 4–6, independently tested, no repository coupling, and CLOSED
 * under type references: no public type may name a non-public one).
 *
 * The full `@internal` surface stays on the `universal-physics-tensor/atlas`
 * subpath. Every symbol below is tagged `@public` where it is declared;
 * `tests/api/namespace-facade-invariant.test.ts` fails otherwise.
 *
 * @module atlas/public
 */

export type {
  ApproximationBound,
  AtlasRejection,
  Counterexample,
  EvidenceTag,
  LimitCharacter,
  Regime,
  RegimeInequality,
  RelationType,
  Witness,
} from './types.js';
/** Thrown by a bound whose `deltaAt`, `horizonHolds` or Lipschitz constant is missing. */
export { MissingDeltaAtError, MissingHorizonError, MissingLipschitzError } from './types.js';
export type { AtlasModel } from './model.js';
export { regimeHolds } from './regime.js';
export type { RegimeCheck } from './regime.js';
export { composeBoundPath, composeBounds, IDENTITY_BOUND } from './error-algebra.js';
export type { BoundPair, ComposedPath } from './error-algebra.js';
export { composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM } from './composition-table.js';
export type { CompositionResult, NoCompositeClaim } from './composition-table.js';
