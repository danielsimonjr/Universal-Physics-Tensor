/**
 * `Axes` singleton registry — module-load-stable `UniversalIndex`
 * references for every physics-axis value in `src/core/types.ts`.
 *
 * Phase 1 of v0.7 Proposal 1 (Intelligent Index Layer).
 *
 * Per Decision #4 (`docs/planning/v0.7-Proposal-1-Design.md`),
 * `Axes` is computed exactly once per Node process. Both the outer
 * namespace and each per-axis sub-object are `Object.freeze`d:
 * mutation attempts in strict mode throw `TypeError`. The values
 * inside are full `UniversalIndex<Axis>` objects (with stable
 * `id`s assigned at module load); same-object identity across
 * import sites is the load-bearing guarantee.
 *
 * Census basis: `docs/architecture/archive/v0.7-p1-baseline.md` Task 0.1.
 *   - 4 scales × 5 forces × 5 symmetries × 4 information measures
 *     = 18 stable references total
 *   - dimension/topology axes are integer-valued and NOT enumerable
 *     from `TensorConfig` — no `Axes.dimension` or `Axes.topology`
 *     sub-namespace ships in v0.7.0
 *
 * @module core/axes-registry
 */

import { makeIndex } from './universal-index.js';
import type { UniversalIndex } from './universal-index.js';
import type {
  PhysicalScale,
  Force,
  Symmetry,
  InformationMeasure,
} from './types.js';

// ---------------------------------------------------------------------------
// Per-namespace records — typed so consumers get autocompletion for
// `Axes.scale.<quantum|mesoscopic|classical|cosmological>`, etc.
// ---------------------------------------------------------------------------

type ScaleAxes = { readonly [K in PhysicalScale]: UniversalIndex<'scale'> };
type ForceAxes = { readonly [K in Force]: UniversalIndex<'force'> };
type SymmetryAxes = { readonly [K in Symmetry]: UniversalIndex<'symmetry'> };
type InformationAxes = {
  readonly [K in InformationMeasure]: UniversalIndex<'information'>;
};

/**
 * Outer registry shape. Frozen at module load; per-namespace
 * sub-objects also frozen.
 *
 * @public
 */
export interface AxesRegistry {
  readonly scale: ScaleAxes;
  readonly force: ForceAxes;
  readonly symmetry: SymmetryAxes;
  readonly information: InformationAxes;
}

// ---------------------------------------------------------------------------
// Registry construction — one makeIndex call per member, frozen
// ---------------------------------------------------------------------------

const scaleAxes: ScaleAxes = Object.freeze({
  quantum: makeIndex('scale', 'quantum'),
  mesoscopic: makeIndex('scale', 'mesoscopic'),
  classical: makeIndex('scale', 'classical'),
  cosmological: makeIndex('scale', 'cosmological'),
});

const forceAxes: ForceAxes = Object.freeze({
  gravitational: makeIndex('force', 'gravitational'),
  electromagnetic: makeIndex('force', 'electromagnetic'),
  weak: makeIndex('force', 'weak'),
  strong: makeIndex('force', 'strong'),
  emergent: makeIndex('force', 'emergent'),
});

const symmetryAxes: SymmetryAxes = Object.freeze({
  poincare: makeIndex('symmetry', 'poincare'),
  gauge: makeIndex('symmetry', 'gauge'),
  conformal: makeIndex('symmetry', 'conformal'),
  susy: makeIndex('symmetry', 'susy'),
  emergent: makeIndex('symmetry', 'emergent'),
});

const informationAxes: InformationAxes = Object.freeze({
  vonNeumann: makeIndex('information', 'vonNeumann'),
  shannon: makeIndex('information', 'shannon'),
  kolmogorov: makeIndex('information', 'kolmogorov'),
  quantumDiscord: makeIndex('information', 'quantumDiscord'),
});

/**
 * The canonical `Axes` registry. Same object across all import
 * sites; entry references stable across all reads.
 *
 * Usage:
 *   import { Axes } from 'universal-physics-tensor';
 *   const myIdx = Axes.scale.quantum; // UniversalIndex<'scale'>
 *
 * Two `LabeledTensor`s contracting on `Axes.scale.quantum` produce
 * a contraction. Two fresh `makeIndex('scale', 'quantum')` calls are
 * different ids: `contract` throws `IndexNameMismatchError` and names
 * both ids. Use the registry for shared identity (Decision #4).
 *
 * @public
 */
export const Axes: AxesRegistry = Object.freeze({
  scale: scaleAxes,
  force: forceAxes,
  symmetry: symmetryAxes,
  information: informationAxes,
});
