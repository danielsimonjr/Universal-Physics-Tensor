/**
 * Composition graph (v0.8.0) — graph-lite `Quantity` / `BridgeEdge` /
 * `composeEdges()` beside the catalog (NOT replacing it; the catalog
 * in `src/bridges/index.ts` stays authoritative).
 *
 * See docs/planning/v0.8.0-Design.md for the design. The catalog edges are
 * projected from `data/bridge-catalog.json` by `./catalog-graph.js`; the
 * pre-registered CT-* composed ids are `REGISTERED_COMPOSITION_IDS` in
 * `./enumerate.js`.
 *
 * @module composition
 */

export type { Quantity, RegimeAttributes } from './quantity.js';
export { regimesDiffer } from './quantity.js';

export type { BridgeEdge, EdgeConfidence, ValidityDomain } from './edge.js';
/** Edge evaluation and the errors it throws. An unset coefficient is `CoefficientUnsetError`. */
export {
  CoefficientUnsetError,
  CompositionAliasError,
  CompositionDimensionError,
  CompositionJunctionError,
  UndefinedCompositionError,
  evaluateEdge,
} from './edge.js';
/** The errors one evaluation throws: the input checks, then the validity domain. */
export {
  DomainViolationError,
  DuplicateInputError,
  InputTypeError,
  MissingInputError,
  NonFiniteInputError,
  UnknownInputError,
} from '../bridges/evaluation-errors.js';

export type { ComposeOptions, QuantityIdentification } from './compose.js';
export {
  composeEdges,
  minConfidence,
  QUANTITY_IDENTIFICATIONS,
  SOURCE_ALIAS_DISPOSITIONS,
} from './compose.js';
export type { AliasDisposition } from './compose.js';

export { consistencyRatio } from './consistency.js';

export { M_SUN_KG } from '../core/constants.js';
/** The catalog graph and the edge for one graph id. */
export { catalogEdge, CATALOG_GRAPH } from './catalog-graph.js';

export {
  CANONICAL_GRAPH,
  canonicalToEdges,
  CANONICAL_CONSTANTS,
} from './canonical-graph.js';

export type {
  CompositionCandidate,
  EnumerationReport,
} from './enumerate.js';
export {
  enumerateCompositions,
  REGISTERED_COMPOSITION_IDS,
} from './enumerate.js';

export type { UncertaintyResult } from './uncertainty.js';
export { propagateUncertainty } from './uncertainty.js';

export type {
  IdentifiabilityVerdict,
  IdentifiabilityResult,
  IdentifiabilityOptions,
} from './identifiability.js';
export {
  classifyIdentifiability,
  classifyAll,
  forwardClosure,
} from './identifiability.js';

/** The retrodiction harness's result, prediction, refusal, report and option types. */
export type {
  RetrodictionOutcome,
  RetrodictionPrediction,
  RetrodictionResult,
  RetrodictionRefusal,
  RetrodictionReport,
  RetrodictionOptions,
} from './retrodiction.js';
export { retrodict, retrodictNode } from './retrodiction.js';

export type {
  DerivationExplanation,
  ExplainOptions,
  QuantityExplanation,
} from './explain.js';
export { explainQuantity } from './explain.js';
/** The result of {@link evaluateRelation}. A value carries a dimension. An unset coefficient carries the formula. */
export type { Evaluation } from './evaluate-relation.js';
/** Evaluate a catalog id or a canonical id. A sourced number is `kind: 'value'`. An unset coefficient is `kind: 'unset'`. */
export { evaluateRelation } from './evaluate-relation.js';

export type { Observable, ComposeSymbolicOptions } from './compose-symbolic.js';
export { composeSymbolic, SymbolicCompositionError } from './compose-symbolic.js';
export { SymbolicEvalError } from './expr-eval.js';

export type {
  VizStatus,
  VizJunction,
  VizCluster,
  VizOptions,
  VizModel,
  VizFilterStats,
} from './graph-viz.js';
export { buildVizModel, edgeToJunction } from './graph-viz.js';
export { renderDotToSvg, SvgRendererUnavailableError } from './graph-viz-svg.js';
export type { DimensionAdjacency } from './dimension-adjacency.js';
export { dimensionAdjacency } from './dimension-adjacency.js';
export type { UserEquation, EquationLanding } from './user-equation.js';
export type { EquationAnalysis, EquationHint } from './user-equation.js';
export {
  parseUserEquation,
  suggestQuantities,
  suggestByDimension,
  equationLanding,
  analyzeUserEquation,
  UserEquationError,
} from './user-equation.js';
/** The catalog or parameter name a spelling means. Two spellings of one quantity that disagree throw {@link SynonymDisagreementError}. */
export { resolveQuantityName, SynonymDisagreementError } from '../dimensional/formula-names.js';
// formatConnectedSummary stays internal — CLI reaches it via cli-api.