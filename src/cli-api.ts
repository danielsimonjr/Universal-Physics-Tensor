/**
 * CLI-facing barrel — the single stable entrypoint `bin/upt.mjs` imports.
 *
 * The CLI needs a handful of `@internal` analysis/composition/canonical
 * functions that are deliberately NOT on the public surface (so they are not in
 * the root `index.ts`). Previously `bin/upt.mjs` reached into ~10 deep `dist/`
 * module paths to get them, coupling the CLI to the internal file layout — any
 * module move silently broke the CLI. This barrel re-exports everything the CLI
 * uses from one place, so layout changes touch only this file and `bin/upt.mjs`
 * imports a single `dist/cli-api.js`.
 *
 * @internal — a CLI-support barrel; NOT re-exported from the root index, so it
 * stays off the consumer-facing public surface.
 *
 * @module cli-api
 */

// Domain names register when this barrel loads. The command reads the list.
import './relations/domain-regimes.js';

// Public-API symbols (already on the root surface).
export {
  explainQuantity,
  CATALOG_GRAPH,
  CANONICAL_GRAPH,
  M_SUN_KG,
  composeSymbolic,
  format,
  buildVizModel,
  renderDotToSvg,
  equationLanding,
  analyzeUserEquation,
  suggestQuantities,
  buckinghamPi,
  dimensionallyDetermines,
} from './index.js';
/** Numeric composition of two graph edges. The grade is the lower of the two, and a chain stays provisional. */
export { composeEdges } from './index.js';
// Landing-report summariser (persona W3) — internal, not on the public barrel.
export { formatConnectedSummary } from './composition/user-equation.js';

// Internal analysis surface (bridge-analysis.ts).
export {
  bridgePriority,
  attemptDerivation,
  dimensionalFreedom,
  linkageMap,
  proposeLinkCandidates,
  proposeOrphanConnectors,
} from './composition/bridge-analysis.js';

// Other internal modules the CLI drives.
export {
  getFormulaParser,
  getFormulaParserKind,
  getFormulaDimensionChecker,
} from './numerical/formula-registry.js';
export { parseDimensionSpec } from './dimensional/dimension-spec.js';
export { predictMissingBridges } from './composition/bridge-prediction.js';
export { catalogFrontierAccount, formatFrontierAccount } from './composition/frontier-account.js';
export { rankDiscoveries, ANCHOR_DEFAULT } from './composition/discovery.js';
export { BRIDGE_EQUATIONS } from './bridges/index.js';
export { auditCoverage } from './composition/audit-coverage.js';
export {
  CONFRONTATIONS,
  listConfrontations,
  runConfrontation,
  confrontationRigor,
  rigorDistribution,
} from './bridges/confrontations.js';
/** Ask for a caller-table confrontation. The catalog status does not change. */
export { requestCallerTableConfrontation } from './bridges/caller-table.js';
/** The catalog row, the id parser (and its non-throwing form), and the relation a numeric id evaluates. */
export { catalogEntry, catalogIdNumber, parseBridgeId, primaryRelation } from './bridges/catalog-load.js';
/** The two composition demonstrations the CLI prints. */
export { demonstrationEdges } from './composition/catalog-graph.js';
export type { ConfrontationEntry, RigorTier } from './bridges/confrontations.js';
export { consistencyComparison } from './bridges/observations/types.js';
export type { ConfrontationOutcome } from './bridges/observations/types.js';
export { decidingMeasurement } from './bridges/sensitivity.js';
// Bridge-evaluator dispatch (`upt evaluate`) + axis-discrimination audit (`upt axes`).
export { BRIDGE_EVALUATORS, evaluateBridge } from './bridges/evaluators.js';
/**
 * The input-contract errors: an absent, unknown, non-number, non-finite or twice-given input.
 * `upt evaluate` reports each as a bad value (exit 1), never a usage error (exit 2), prefixed `upt evaluate:`.
 */
export {
  DuplicateInputError,
  InputTypeError,
  isInputContractError,
  MissingInputError,
  NonFiniteInputError,
  UnknownInputError,
} from './bridges/evaluation-errors.js';
export type { EvaluatorSpec, EvaluatorParameter } from './bridges/evaluators.js';
export { resolveEvaluatorInputs } from './bridges/evaluator-inputs.js';
export { APPLIED_CASES, runAppliedCase } from './cases/index.js';
export type { AppliedCase, CaseCheck, CaseResult } from './cases/index.js';
export { convertValue, UnitError } from './dimensional/units.js';
export { auditAxisDiscrimination } from './composition/axis-audit.js';
export type { AxisDiscrimination } from './composition/axis-audit.js';
export { AXES } from './composition/axes.js';
export type { AxisSpec } from './composition/axes.js';
export { simplifyObservable, isSimplifierAvailable } from './composition/expr-simplify.js';
export {
  CANONICAL_EQUATIONS,
  bridgesWithoutCanonicalPartner,
} from './canonical/registry.js';
export { scanLinkages } from './canonical/linkage.js';
export { deriveProposedBridges } from './composition/proposed-bridges.js';
export { describeDerivedClaim } from './composition/consequence.js';
// `upt map --relation= --evidence=` overlay filtering (S2.4). Internal: the
// published surface is pinned by tests/api/public-surface.test.ts.
// Relation filtering and the legend stay in graph-viz. Catalog evidence
// derivation lives in cli/map-evidence.ts, which is what calls it.
export { filterEdges, formatFilterLegend } from './composition/graph-viz.js';
export { deriveEdgeEvidence } from './cli/map-evidence.js';
// `upt map --source=poster` (S3.4) — the Atlas Phase 3 poster index as viz
// junctions, plus its dangling-premise check. Internal, CLI only. Not on
// src/index.ts, which is the published v0.4.0 surface.
export {
  POSTER_GRAPH,
  posterJunctions,
  validatePoster,
  describePosterSource,
} from './cli/poster-source.js';
export type { PosterGraph, PosterValidation } from './cli/poster-source.js';

// Experimental Product B (expression / residual search). Not the identification
// funnel (`rankDiscoveries`). CLI `upt probe` only.
export {
  DEFAULT_SEARCH_BUDGET,
  scanFrontier,
  findFrontierGap,
  expressionSearchGaps,
  scanWithExpressionGaps,
  problemFromResidualGap,
  makeResidualGap,
  loadSearchProblemFromJson,
  resolveObservationsPath,
  parseExprJson,
  runProbeSearch,
  formatProbeReport,
  loadStudyFromJson,
  loadStudyFile,
  runProbeStudy,
  formatProbeStudy,
  formatFrontierScan,
  formatFrontierGap,
  suggestDiscriminatingPoint,
  parseDesignBounds,
  runFalsification,
  rankPareto,
} from './composition/probe/index.js';

// Adjudication ledger (composition/adjudication.ts) — annotates discovery
// candidates with recorded human verdicts; never mutates the funnel.
export {
  annotateAdjudications,
  adjudicationFor,
  candidateId,
  ADJUDICATIONS,
} from './composition/adjudication.js';
export type { AnnotatedCandidate, CandidateAdjudication } from './composition/adjudication.js';

// Consequence propagation (composition/consequence.ts) — annotates discovery
// candidates with the entailed/novel-consequence/inconclusive signal; never
// mutates the catalog/graph, never re-orders or re-scores.
export { annotateConsequences } from './composition/consequence.js';
export type {
  ConsequenceAnnotatedCandidate,
  ConsequenceSignal,
  ConsequenceEvidence,
} from './composition/consequence.js';

// Epistemic-grounding ledger (composition/grounding.ts) — a pure, derived view
// over each candidate's falsifier results: which gates passed vs abstained, plus
// the honest no-mechanism/no-data ceiling. Annotation-only; changes no verdict.
// Atlas Phase 1 convention comparison — `upt recover` uses it to flag a
// bridge↔canonical pair whose DECLARED sign/unit choices disagree. Advisory
// only: it changes no classification and no exit code.
export { checkConventions, unknownConventionKeys } from './atlas/conventions.js';
export type { ConventionKey } from './atlas/conventions.js';

export { describeGrounding, describeReadiness } from './composition/grounding.js';
export { REPRESENTATIVE_VALUES } from './composition/representative-values.js';
// User formula vs the canonical equation it restates (persona finding L2).
export {
  compareWithCanonical,
  compareUserEquation,
  describeComparison,
  describeComparisons,
  describeKnownRelation,
  matchingCatalogEdges,
} from './composition/canonical-compare.js';
export type { CanonicalComparison, CatalogEdgeMatch } from './composition/canonical-compare.js';
export { CONSTANTS, CONSTANT_PROVENANCE } from './dimensional/symbolic-constants.js';
export type { CandidateGrounding, CandidateReadiness } from './composition/grounding.js';

// Atlas Phase 2 CLI surface (`upt regime`, `upt path`). Regime admission and
// route bounds are `@internal`; the CLI is their only consumer today.
export { OSCILLATOR_FAMILY } from './atlas/oscillators/index.js';
export { ATLAS_FAMILIES } from './atlas/families.js';
export { deriveEvidence, deriveCompositeEvidence, NO_PASSING_WITNESSES, provedWithUnresolvedCounterexample } from './atlas/derive-evidence.js';
export { summarizeEvidence, ALL_EVIDENCE_TAGS } from './atlas/coverage.js';
export { runWitnessRegistry } from './atlas/witness-artifact.js';
export { WITNESS_REGISTRY } from './atlas/witness-specs.js';
export { runNumericWitness } from './atlas/witness-numeric.js';
export {
  OBSERVABLE_CARRIAGES,
  OBSERVABLE_TRANSLATIONS,
  carriageOf,
  runTranslationCheck,
  translationsOf,
} from './atlas/translation-registry.js';
export type { ObservableCarriage, ObservableTranslation, PointCheck } from './atlas/translation.js';
export type { AtlasFamily } from './atlas/oscillators/index.js';
export { collidingRegimeGroups, regimeHolds, regimeOverlap, uncoveredRegions } from './atlas/regime.js';
export { domainRegimeRegistrations } from './relations/regime-registration.js';
export type { RegimeCheck, RegimeOverlap, RegionSample } from './atlas/regime.js';
export { familyChangeBlocksHorizon, findPath, findAtlasPath, enumerateAtlasRoutes, boundPath, horizonOnRoute, routeEntryModels } from './atlas/path-bound.js';
export { composeRelation } from './atlas/composition-table.js';
export type { PathBoundResult, PathBoundClaim, PathNoClaim, AppliedTransport } from './atlas/path-bound.js';
export type { AtlasBridge, RegimeInequality, Witness } from './atlas/types.js';
export { MissingLipschitzError } from './atlas/types.js';
export type { AtlasModel, ModelId } from './atlas/model.js';

/**
 * Catalog formal reference for `upt atlas`.
 *
 * @internal
 */
export { catalogFormalRef } from './atlas/catalog-formal-ref.js';

/**
 * Composition recovery scan for `upt recover`.
 *
 * @internal
 */
export { scanCompositionRecovery } from './composition/composition-recovery.js';

/**
 * Exact metrics and geodesic integrators for `upt metric`.
 *
 * @internal
 */
export {
  curvatureReport,
  kerrEquatorialCircular,
  kerrGeodesic,
  kerrTurningPointOrbit,
  MetricMassError,
  schwarzschildCircularOrbit,
  type MetricId,
} from './numerical/spacetime-metrics.js';

/**
 * Binding readers for `upt eval`, `upt evaluate`, `upt regime`, and `upt path`.
 *
 * @internal
 */
export { readBinding, bindingInUnit, readNamedBinding, BindingNumberError, TemperatureBindingError } from './numerical/binding-value.js';
/** GUM propagation through a closed-form evaluator, and the correlation-matrix check, for `upt evaluate --sigma/--corr`. */
export { propagateEvaluatorUncertainty, correlationIsPositiveSemidefinite } from './numerical/evaluator-uncertainty.js';
/** One propagated output, and one input's share of it. */
export type { PropagatedOutput, UncertaintyContribution } from './numerical/evaluator-uncertainty.js';
/** A stated constant checked against the registry; a disagreement is its own error. */
export { constantAgreement, ConstantDisagreementError } from './dimensional/symbolic-constants.js';
/** The quantity names a target is bound under, the near names of a miss, and the synonym fold. */
export { aliasesForTarget, nearQuantityNames, shareSynonyms } from './composition/aliases.js';
/** Synonym agreement and expansion of a binding set. */
export { assertSynonymAgreement, expandSynonymValues } from './dimensional/formula-names.js';
/** A dimensionless group a canonical equation multiplies (sound-speed's gamma): an input, not a graph node. */
export { CANONICAL_GROUP_PREFACTORS } from './composition/canonical-prefactors.js';
/** The one number formatter of explain text. */
export { formatQuantity } from './composition/explain.js';
/** A monomial odd in both carrier charge and mobility with opposite signs. */
export { CarrierSignError } from './bridges/carrier-sign.js';
/** The constant values a natural-unit mode overrides. */
export { naturalConstantOverrides } from './dimensional/natural-units.js';
/** The constant-value mode a formula is evaluated in: SI, natural, or geometrized. */
export type { UnitMode } from './dimensional/natural-units.js';
/** Kebab catalog names rewritten to one symbol each before a formula is parsed. */
export { rewriteCatalogHyphens } from './dimensional/hyphen-names.js';
/** A recovered prefactor that is a vacuum constant rewritten through α. */
export { vacuumConstantThroughAlpha } from './composition/bridge-analysis.js';
/** The ledger id of an orphan-connector pair, when both names are slugs. */
export { candidateIdIfSlug } from './composition/adjudication.js';
/** The catalog or parameter name a spelling means. The commands call this, not a second table. */
export { resolveQuantityName } from './index.js';
/** The edge and the closed-form evaluator for an id. An evaluator with no edge is not unknown. */
export { evaluatorOutput, resolveEvaluable } from './composition/evaluate-relation.js';
/** The required inputs of an evaluator that no relation source reads. They do not change the value. */
export { unusedInputKeys } from './bridges/evaluators.js';
/** Two spellings of one quantity were given different numbers. The formula is not run. */
export { SynonymDisagreementError } from './dimensional/formula-names.js';

/**
 * Builtin dimension checker for `upt eval`.
 *
 * @internal
 */
export { builtinFormulaDimensionChecker } from './numerical/formula-dimension.js';

/**
 * Missing-evaluator message for `upt evaluate`.
 *
 * @internal
 */
export { missingEvaluatorMessage } from './bridges/evaluators.js';

/** The caveats printed beside a relation's value: its own notice and the notes of the constants it names. */
export { relationNotices } from './bridges/notices.js';
/** The notes of the registered constants a formula names. */
export { constantNotes } from './dimensional/symbolic-constants.js';

/** Quantity-graph edge type for `upt map`. @internal */
export type { BridgeEdge } from './composition/edge.js';

/** Visual map types for `upt map`. @internal */
export type { VizJunction, VizModel } from './composition/graph-viz.js';

/** Relation vocabulary types for `upt map`. @internal */
export type { EvidenceTag, RelationType } from './atlas/types.js';

/** User-equation analysis type for `upt map`. @internal */
export type { EquationAnalysis } from './composition/user-equation.js';
