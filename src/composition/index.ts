/**
 * Composition graph (v0.8.0) — graph-lite `Quantity` / `BridgeEdge` /
 * `composeEdges()` beside the catalog (NOT replacing it; the catalog
 * in `src/bridges/index.ts` stays authoritative).
 *
 * See docs/planning/v0.8.0-Design.md and the calibration edges in
 * `./edges/calibration.js` for the pre-registered CT-1/CT-1b/CT-2
 * targets.
 *
 * @module composition
 */

export type { Quantity, RegimeAttributes } from './quantity.js';
export { regimesDiffer } from './quantity.js';

export type { BridgeEdge, EdgeConfidence, ValidityDomain } from './edge.js';
export {
  CompositionAliasError,
  CompositionDimensionError,
  CompositionJunctionError,
  DomainViolationError,
  UndefinedCompositionError,
  evaluateEdge,
} from './edge.js';

export type { ComposeOptions, QuantityIdentification } from './compose.js';
export {
  composeEdges,
  minConfidence,
  QUANTITY_IDENTIFICATIONS,
  SOURCE_ALIAS_DISPOSITIONS,
} from './compose.js';
export type { AliasDisposition } from './compose.js';

export { consistencyRatio } from './consistency.js';

export {
  be11ZurekEdge,
  be12Edge,
  be16Edge,
  be37Edge,
  be42Edge,
  be42ViaRsEdge,
  be51Edge,
  be52Edge,
  lawSchwarzschildRadius,
  M_SUN_KG,
} from './edges/calibration.js';

export {
  be14Edge,
  be19Edge,
  be21Edge,
  be48Edge,
  be53Edge,
  be54Edge,
} from './edges/catalog-tranche.js';

/** Composition edges for the applied-physicist catalog rows, BE-66 through BE-73. */
export {
  be66Edge,
  be67Edge,
  be68Edge,
  be69Edge,
  be70Edge,
  be71Edge,
  be72Edge,
  be73Edge,
  APPLIED_PHYSICIST_EDGES,
} from './edges/applied-physicist.js';

export {
  be11Edge,
  be13Edge,
  be15Edge,
  be17Edge,
  be18Edge,
  be20Edge,
  be22Edge,
  be23Edge,
  be24Edge,
  be25Edge,
  be26Edge,
  be27Edge,
  be30Edge,
  be31Edge,
  be33Edge,
  be34Edge,
  be36Edge,
  be38Edge,
  be39Edge,
  be41Edge,
  be43Edge,
  be45Edge,
  be46Edge,
  be47Edge,
  be49Edge,
  be50Edge,
  CATALOG_FULL_EDGES,
} from './edges/catalog-full.js';

export { CATALOG_GRAPH } from './catalog-graph.js';
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

export type {
  RetrodictionOutcome,
  RetrodictionPrediction,
  RetrodictionResult,
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
  resolveToCatalogName,
  suggestQuantities,
  suggestByDimension,
  equationLanding,
  analyzeUserEquation,
  UserEquationError,
} from './user-equation.js';
// formatConnectedSummary stays internal — CLI reaches it via cli-api.