/**
 * Public surface of the UPT numerical-contraction backend (v0.3.5).
 * See docs/planning/v0.3.5-Design.md §5.
 *
 * @module numerical
 */
import type { Dimension } from '../dimensional/types.js';
import type { ExprNode, Violation } from '../dimensional/validator.js';
import { validate } from '../dimensional/validator.js';
import type { EngineTensor, TensorEngine } from './tensor-engine.js';
import type { NumericalInputs, NestedArray } from './types.js';
import { lowerNode } from './lowering.js';
import { getActiveEngine } from './engine-registry.js';
import { NumericalBackendError } from './errors.js';
import { evaluateMetricInverse, scanForMetricPair } from './metric-inverse.js';

/** @public */
export type { TensorEngine, EngineTensor, EinsumSpec, ForwardGradResult, ReverseGradResult } from './tensor-engine.js';
/** @public */
export { hasAutogradSupport, EngineCapabilityError } from './tensor-engine.js';
/** @public */
export type { NumericalInputs, NestedArray } from './types.js';
/** @public — part of the `NumericalInputs.grids` public contract. */
export type { GridField } from './grid-field.js';
/** @public */
export { getActiveEngine, setActiveEngine } from './engine-registry.js';
/** @public */
export { NumericalBackendError } from './errors.js';
/** @public — re-exported from dimensional/errors to keep numerical/index.ts
 *  as the single public API surface, without creating a dimensional→numerical
 *  import cycle. See v0.4.0-Implementation-Plan Task 13 for rationale. */
export { DuplicateCoordinateWarning } from '../dimensional/errors.js';
/**
 * Evaluate a metric inverse from a detected pair.
 *
 * @public
 */
export { evaluateMetricInverse } from './metric-inverse.js';
/** @public */
export {
  evaluateBE37CovariantEikonalNumerical,
} from './be37-covariant-eikonal.js';
export type {
  BE37CovariantEikonalInputs,
  BE37CovariantEikonalResult,
} from './be37-covariant-eikonal.js';

/** @public — v0.5.0 GL4 symplectic integrator. */
export { integrateGeodesicGL4 } from './gl4-integrator.js';
/** @public — v0.5.0 GL4 types. */
export type { GL4State, GL4Snapshot, GL4Options } from './gl4-integrator.js';

/** @public — v0.5.0 perihelion finder (Task 4, Phase 1b). */
export { findPerihelion } from './perihelion-finder.js';
/** @public — v0.5.0 perihelion-finder types. */
export type { PerihelionResult, FindPerihelionOptions } from './perihelion-finder.js';

/**
 * Plain-JS result of `evaluateNumerical`.
 * @public
 */
export interface NumericalResult {
  readonly value: NestedArray;
  readonly dim: Dimension;
  readonly freeIndices: ReadonlyMap<string, { upper: number; lower: number }>;
  readonly warnings: ReadonlyArray<Violation>;
}

/**
 * Result of `evaluateNumericalRaw` — carries a live `EngineTensor` for
 * chaining workloads; the caller must `dispose()` it.
 * @public
 */
export interface NumericalRawResult {
  readonly value: EngineTensor;
  readonly dim: Dimension;
  readonly freeIndices: ReadonlyMap<string, { upper: number; lower: number }>;
  readonly warnings: ReadonlyArray<Violation>;
  dispose(): void;
}

/**
 * Per-call options for the `evaluateNumerical*` entry points.
 * @public
 */
export interface EvaluateOptions {
  readonly engine?: TensorEngine;
}

/** Validate the AST and return (engine, validation result) or throw. */
async function prepare(node: ExprNode, options?: EvaluateOptions) {
  const vr = validate(node);
  if (!vr.ok) {
    throw new NumericalBackendError(
      `evaluateNumerical: the AST is not dimensionally valid — `
      + `${vr.violations.length} violation(s): `
      + vr.violations.map((v) => `[${v.location}] ${v.note}`).join('; '),
    );
  }
  const engine = options?.engine ?? await getActiveEngine();
  const warnings = vr.violations.filter((v) => v.severity === 'warning');
  return { engine, dim: vr.inferredDimension as Dimension, freeIndices: vr.freeIndices, warnings };
}

/** If the AST contains an identifiable lower/upper metric pair, run the
 *  numerical inverse-metric check and return any warning (deduplicated —
 *  scanForMetricPair returns at most one pair). */
async function collectInverseMetricWarnings(
  node: ExprNode,
  inputs: NumericalInputs,
  engine: TensorEngine,
): Promise<Violation[]> {
  const pair = scanForMetricPair(node);
  if (!pair) return [];
  const { warning } = await evaluateMetricInverse(
    pair.gUpper, pair.gLower, inputs, undefined, { engine },
  );
  return warning ? [warning] : [];
}

/**
 * Evaluate a validated AST to plain JS.
 * @public
 */
export async function evaluateNumerical(
  node: ExprNode,
  inputs: NumericalInputs,
  options?: EvaluateOptions,
): Promise<NumericalResult> {
  const { engine, dim, freeIndices, warnings } = await prepare(node, options);
  const tensor = lowerNode(node, inputs, engine);
  const inverseMetricWarnings = await collectInverseMetricWarnings(node, inputs, engine);
  return {
    value: engine.toNested(tensor),
    dim,
    freeIndices,
    warnings: [...warnings, ...inverseMetricWarnings],
  };
}

/**
 * Evaluate to a live EngineTensor for chaining workloads.
 * @public
 */
export async function evaluateNumericalRaw(
  node: ExprNode,
  inputs: NumericalInputs,
  options?: EvaluateOptions,
): Promise<NumericalRawResult> {
  const { engine, dim, freeIndices, warnings } = await prepare(node, options);
  const tensor = lowerNode(node, inputs, engine);
  const inverseMetricWarnings = await collectInverseMetricWarnings(node, inputs, engine);
  return {
    value: tensor,
    dim,
    freeIndices,
    warnings: [...warnings, ...inverseMetricWarnings],
    dispose: () => { engine.dispose?.(tensor); },
  };
}
