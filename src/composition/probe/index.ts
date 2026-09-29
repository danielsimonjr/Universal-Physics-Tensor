/**
 * Experimental Product B barrel — expression / residual search.
 *
 * Import via `universal-physics-tensor/probe`. Not re-exported from the
 * root `universal-physics-tensor` entry. Orthogonal to Product A
 * (`upt discover` / `VettedCandidate`).
 *
 * All symbols are `@internal`: the subpath exists for CLI and experiments,
 * not as a stability contract.
 *
 * @module composition/probe
 */

export {
  SCHEMA_VERSION,
  PROBE_SCHEMA_VERSION,
  DEFAULT_SEARCH_BUDGET,
} from './types.js';
export type {
  ProbeCandidateStatus,
  RelationKind,
  AuditState,
  DiscrepancyKind,
  DatasetRole,
  SearchStopReason,
  FrontierGapKind,
  IdentifiabilityKind,
  SearchBudget,
  DiscrepancyDefinition,
  ScientificRelationRef,
  IdentifiabilityAssessment,
  SearchabilityAssessment,
  GapEvidence,
  FrontierGap,
  ProbeCandidateOrigin,
  ProbeCandidateBody,
  StatusEvent,
  CandidateFingerprint,
  ComplexityMetrics,
  ProbeCandidateRecord,
  ProbeRejectionRecord,
  DiscoveryBackendDescriptor,
  EnvironmentFingerprint,
  NondeterminismSource,
  DiscoveryRunManifest,
  DimensionalVariableRef,
  ObservationRow,
  ProbeDataset,
  SearchProblem,
  ScoreVector,
  EvidenceAssessment,
  EvidenceProfile,
  DeclaredLimit,
  FalsificationBattery,
  FalsificationRecord,
  ScientificRelationRecord,
} from './types.js';

export { canonicalJson, sha256Hex, hashCanonical } from './serialize.js';
export { openBudget, budgetStopReason, canEmitCandidate } from './search-budget.js';
export type { BudgetState } from './search-budget.js';
export {
  bodyExpression,
  countAstNodes,
  countOperators,
  maxPowerOrder,
  complexityOf,
  fingerprintExpr,
} from './fingerprint.js';
export { scalarDiscrepancy, rmse, ResidualError } from './residual.js';
export { openManifest, closeManifest, captureEnvironment } from './run-manifest.js';
export { canTransition, applyStatus, statusRank, ProbeCandidateStore } from './candidate-store.js';
export { monomialToExpr, generateNative } from './generator.js';
export type { RawCandidate } from './generator.js';
export {
  wrapRelationLinkGaps,
  wrapConnectorGaps,
  wrapRegimeGaps,
  scanFrontier,
  findFrontierGap,
  problemFromResidualGap,
} from './frontier.js';
export { expressionSearchGaps, scanWithExpressionGaps } from './expression-gaps.js';
export { fitPrefactor } from './fit.js';
export type { FitResult } from './fit.js';
export { scoreCandidate, rankPareto } from './scoring.js';
export type { RankedCandidate } from './scoring.js';
export { compareToCorpus, corpusRelativeWording } from './corpus.js';
export type { CorpusMatch, CorpusComparisonResult } from './corpus.js';
export { checkDeclaredLimit, checkDeclaredLimits } from './limits.js';
export type { LimitCheckResult } from './limits.js';
export { runFalsification, DEFAULT_BATTERIES } from './falsify.js';
export type { FalsifyInput, FalsifyResult } from './falsify.js';
export {
  datasetFromRows,
  asDatasetSafe,
  loadDatasetFromJson,
  loadSplitDatasetsFromJson,
  loadDatasetFromCsv,
  loadSplitCsv,
} from './dataset.js';
export type { SplitFileDatasets } from './dataset.js';
export { suggestDiscriminatingPoint, parseDesignBounds } from './experiment-design.js';
export type { DesignBounds, DesignSuggestion } from './experiment-design.js';
export {
  detectMeanChangepoint,
  estimateScaleExponent,
  probeConservation,
} from './structure.js';
export type { ChangepointInput, ChangepointResult, ScaleSymmetryInput } from './structure.js';
export { runBackendWorker } from './backend-protocol.js';
export type { BackendRequest, BackendCandidate, BackendResponse } from './backend-protocol.js';
export {
  setRelationMetadata,
  getRelationMetadata,
  listRelationMetadata,
  clearRelationMetadata,
} from './metadata.js';
export { makeResidualGap, loadSearchProblemFromJson, searchProblemFromFile, resolveObservationsPath, parseExprJson } from './problem.js';
export type { ProblemFile } from './problem.js';
export { runProbeSearch } from './pipeline.js';
export type { ProbeSearchOptions, ProbeSearchResult } from './pipeline.js';
export { formatProbeReport, formatFrontierScan, formatFrontierGap } from './report.js';
export {
  parseStudy,
  loadStudyFromJson,
  loadStudyFile,
  attachReplication,
  studyCsvToRaw,
  runProbeStudy,
  formatProbeStudy,
  chiSquareSurvival,
  fSurvival,
  effectiveSigma,
  StudyRefusal,
} from './study.js';
export type {
  ProbeStudy,
  ProbeStudyOptions,
  ProbeStudyResult,
  StudyVerdict,
  ReplicationOutcome,
  StudyRole,
  StudyProvenance,
  StudyObservation,
  StudyBaseline,
  SetTest,
  ModelTest,
  CandidateTest,
  StudyDesignSuggestion,
  StudyCorrection,
  StudyCorrectionReport,
  CorrectionStep,
} from './study.js';
