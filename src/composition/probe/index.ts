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

export { canonicalJson, sha256Hex, hashCanonical, captureEnvironment } from '../canonical-json.js';
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
export { openManifest, closeManifest } from './run-manifest.js';
export { canTransition, applyStatus, statusRank, ProbeCandidateStore } from './candidate-store.js';
export { monomialToExpr, generateNative } from './generator.js';
export type { RawCandidate } from './generator.js';
/** The rational power law over the π-groups, and the log-design rank the frontier reads. */
export { powerLawDetermination, powerLawWording, rationalizeExponent, piStructure, logDesign, logDesignRank } from './power-law.js';
/** The power-law types: the determination, one fitted exponent, a recovered fit, the π-structure and the log-design. */
export type { PowerLawDetermination, PowerLawExponent, PowerLawFit, PiStructure, LogDesign } from './power-law.js';
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
/** What a declared-limit check found: held, failed, or undecided on too few evaluable rows. */
export type { LimitOutcome } from './limits.js';
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
/** The strict cell reader (a finite number or a decimal string, never a coercion) and the error a dataset raises by row and column. */
export { readDatasetNumber, DatasetError } from './dataset.js';
export type { SplitFileDatasets } from './dataset.js';
export { suggestDiscriminatingPoint, parseDesignBounds } from './experiment-design.js';
export type { DesignBounds, DesignSuggestion } from './experiment-design.js';
export {
  detectMeanChangepoint,
  estimateScaleExponent,
  probeConservation,
} from './structure.js';
export type { ChangepointInput, ChangepointResult, ScaleSymmetryInput } from './structure.js';
/** The scale-exponent result (slope, standard error, direct p) and the conservation verdict (slope against k·stdErr). */
export type { ScaleExponentResult, ConservationResult } from './structure.js';
/** The direct two-sided Student t tail the probes consume instead of MathTS's `2·(1 − CDF)`. */
export { studentTwoSidedP } from './t-tail.js';
export { runBackendWorker } from './backend-protocol.js';
export type { BackendRequest, BackendCandidate, BackendResponse } from './backend-protocol.js';
export {
  setRelationMetadata,
  getRelationMetadata,
  listRelationMetadata,
  clearRelationMetadata,
} from './metadata.js';
/** The problem-file readers and the error a file that is not a problem file raises, naming its field. */
export { makeResidualGap, loadSearchProblemFromJson, searchProblemFromFile, resolveObservationsPath, parseExprJson, ProblemFileError } from './problem.js';
export type { ProblemFile } from './problem.js';
/** The search pipeline and the argv a Node worker is spawned with. */
export { runProbeSearch, nodeWorkerArgv } from './pipeline.js';
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
/** One fitted correction coefficient with its standard error and, when declared, the reference it is compared with. */
export type { CorrectionCoefficient } from './study.js';
