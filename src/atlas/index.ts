/**
 * Atlas Phase 0 barrel — the oscillator pilot.
 *
 * Reachable only through the `universal-physics-tensor/atlas` subpath. Not
 * re-exported from the root `universal-physics-tensor` entry before Phase 6.
 *
 * All symbols are `@internal`: these are throwaway pilot types (design note
 * §4), not a stability contract.
 *
 * ⚠ **THE INVARIANT IS: NEVER THE BARREL.** `src/bridges/` and
 * `src/composition/` must not import THIS FILE — `src/atlas/` imports
 * `bridges/*` and `composition/*`, so a barrel import closes a cycle that
 * `bun run docs:deps` reports. Importing a leaf module (`./types.js`,
 * `./regime.js`, `./composition-table.js`, …) is fine and the tree has always
 * done it, VALUES INCLUDED: `bridges/index.ts:40`, `composition/compose.ts`,
 * `composition/graph-viz.ts`.
 *
 * This comment used to say "TYPES ONLY, and only from `src/atlas/types.js`",
 * which the tree HAS NEVER SATISFIED while `docs:deps` reported 0 cycles.
 * A rule stricter than the invariant it protects gets silently violated by
 * correct code, and the next reader either believes a false description of
 * the tree or "fixes" code that was right. Corrected 2026-09-22 against the
 * same measurement that corrected `CLAUDE.md`.
 *
 * @module atlas
 */

export type {
  RelationType,
  EvidenceTag,
  LimitCharacter,
  RegimeInequality,
  Regime,
  ApproximationBound,
  Witness,
  Counterexample,
  AtlasBridge,
  AtlasRejection,
  FormalFidelity,
  FormalRef,
  FormalRefKind,
  NormTransport,
} from './types.js';
export { MissingHorizonError, MissingLipschitzError } from './types.js';
export { ALL_EVIDENCE_TAGS } from './types.js';

// The Phase 1–3 core. Absent from this barrel until the S6.7 API review found
// the gap: subpath users could not reach evidence derivation, the composition
// table or path bounding at all (tests/atlas/barrel-completeness.test.ts).
export { deriveCompositeEvidence, deriveEvidence, deriveEvidenceForVerdict, NO_PASSING_WITNESSES, provedWithUnresolvedCounterexample } from './derive-evidence.js';
export type {
  CounterexampleLike,
  EvidenceInput,
  MembershipVerdict,
  RejectionLike,
  WitnessLike,
} from './derive-evidence.js';
export { composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM } from './composition-table.js';
export type { CompositionResult, NoCompositeClaim } from './composition-table.js';
export { boundPath, findAtlasPath, findPath, horizonOnRoute, routeEntryModels } from './path-bound.js';
export type { AppliedTransport, NoClaimReason, PathBoundClaim, PathBoundResult, PathNoClaim } from './path-bound.js';

export type { AtlasModel, ModelId } from './model.js';

export { composeBounds, composeBoundPath, IDENTITY_BOUND } from './error-algebra.js';
export type { BoundPair, ComposedPath } from './error-algebra.js';

export { deriveRegimeGroups, regimeHolds } from './regime.js';
export type { RegimeCheck } from './regime.js';

export {
  CAPACITANCE,
  CUBIC_STIFFNESS,
  DAMPING,
  INDUCTANCE,
  RESISTANCE,
  SPRING_CONSTANT,
} from './oscillators/dimensions.js';

export { ATLAS_MODELS, getAtlasModel } from './oscillators/models.js';

export { OSCILLATOR_FAMILY } from './oscillators/index.js';
export type { AtlasFamily } from './oscillators/index.js';

export { toAtlasJson, ATLAS_RECORD_SCHEMA_VERSION } from './serialize.js';
export type { AtlasRecordJson, JsonValue } from './serialize.js';

export {
  blockingFindings,
  checkApplicability,
} from './applicability.js';
export type {
  ApplicabilityFinding,
  ApplicabilityFindingKind,
  ApplicabilityInput,
  ApplicabilitySeverity,
} from './applicability.js';

export { passingWitnessIds } from './witness-result.js';
export type {
  UnresolvedReason,
  WitnessRunResult,
  WitnessStatus,
} from './witness-result.js';

export { ATLAS_FAMILIES } from './families.js';
export { runLinkPrediction } from './link-prediction.js';
export { ATLAS_ID_PREFIX, toAtlasJsonLd, toCombinedAtlasJson } from './export.js';
export type { QudtResolution } from './export.js';
export type { LinkPredictionResult, LinkPredictionTrial } from './link-prediction.js';
export { DIFFUSION_FAMILY } from './diffusion/index.js';
export {
  BRIDGE_HEAT_DIFFUSION,
  BRIDGE_SCHRODINGER_DIFFUSION,
  BRIDGE_WALK_DIFFUSION,
  DIFFUSION_BRIDGES,
} from './diffusion/bridges.js';
export { DIFFUSION_MODELS, getDiffusionModel } from './diffusion/models.js';
export { WAVES_FAMILY } from './waves/index.js';
export {
  BRIDGE_KLEIN_GORDON_WAVE,
  BRIDGE_SOUND_SPEED,
  BRIDGE_STRING_WAVE,
  BRIDGE_WAVE_DALEMBERT,
  WAVE_BRIDGES,
} from './waves/bridges.js';
export { WAVE_MODELS } from './waves/models.js';
export { DIFFUSION_CLOSURE_BRIDGES } from './diffusion/bridges-closure.js';
export { WAVE_CLOSURE_BRIDGES } from './waves/bridges-closure.js';

// Phase 5 benchmark: the PURE parts only. `benchmark/loader.ts` reads files and is
// deliberately not re-exported, so importing this barrel never pulls in file I/O.
export { FAILURE_KINDS, HELD_OUT_FAMILY, HELD_OUT_MARKERS } from './benchmark/types.js';
export type { Authorship, BenchmarkItem, BenchmarkSplit, FailureKind } from './benchmark/types.js';
export { checkRenamedVariants, findCrossSplitLeakage, leakageKey } from './benchmark/leakage.js';
export type { LeakageCollision, VariantProblem } from './benchmark/leakage.js';
export {
  ABLATION_CONFIGS,
  FULL_CONFIG,
  runAtlasCondition,
  runAtlasOnItem,
} from './benchmark/run-atlas.js';
export type { AtlasRunConfig, AtlasVerdict } from './benchmark/run-atlas.js';
export {
  rankBySymbolOverlap,
  rankByStructure,
  rankByTextOverlap,
  recallAtK,
} from './benchmark/baselines.js';
export type { CorpusRecord, Ranking, RetrievalQuery } from './benchmark/baselines.js';
export {
  ATLAS_ONLY_NOTE,
  EMBEDDING_INSTRUCTION,
  FROZEN_VECTOR_DIMS,
  FROZEN_VECTOR_SHA256,
  OLLAMA_EMBEDDING_MODEL,
  OLLAMA_TIMEOUT_MS,
  PROPOSAL_NOTE,
  EmbeddingUnavailable,
  canonicalRetrievalCorpus,
  cosine,
  decodeFloat32,
  ollamaEmbedder,
  queryInput,
  rankByCosine,
  retrieveHybrid,
  stubEmbedder,
  stubVector,
} from './benchmark/hybrid-retrieval.js';
export type { Embedder, EmbeddingFallbackReason, HybridRetrieval, OllamaEmbedderOptions } from './benchmark/hybrid-retrieval.js';
export { parseBackendResponse } from './benchmark/backend-shapes.js';
export {
  cohensKappa,
  mcnemar,
  pairedDifferenceInterval,
  powerReport,
  wilsonInterval,
  Z95,
} from './benchmark/stats.js';
export type { Interval, McNemarResult, PairedTable, PowerReport } from './benchmark/stats.js';
export { pairedRejection, scoreAblation, scoreCondition } from './benchmark/study.js';
export type {
  AblationRow,
  ConditionAnswer,
  ConditionMetrics,
  ItemLabel,
  PairedRejection,
} from './benchmark/study.js';
export type {
  BackendShapeError,
  BenchmarkBackendRequest,
  BenchmarkBackendResponse,
} from './benchmark/backend-shapes.js';

export { runWitnessRegistry, artifactPassingWitnessIds } from './witness-artifact.js';
export type { WitnessResultRecord, WitnessResultsArtifact } from './witness-artifact.js';

export { WITNESS_REGISTRY } from './witness-specs.js';
export type {
  RegisteredNumericWitness,
  RegisteredSymbolicWitness,
  RegisteredWitness,
} from './witness-specs.js';

export { runSymbolicWitness } from './witness-symbolic.js';
export type { SymbolicSimplifier, SymbolicWitnessSpec } from './witness-symbolic.js';

export { runNumericWitness } from './witness-numeric.js';
export type {
  Convergence,
  NumericWitnessRunResult,
  NumericWitnessSpec,
} from './witness-numeric.js';

export { contextUnion, statementContextUnion } from './statement.js';
export type {
  Context,
  ContextUnionFormed,
  ContextUnionRefused,
  ContextUnionResult,
  NoUnionReason,
  Statement,
  StatementId,
} from './statement.js';

export {
  composeDerivations,
  composeDerivationsOrThrow,
  DerivationCompositionError,
  makeDerivation,
} from './derivation.js';
export type {
  CompositeFormed,
  CompositeRefused,
  Derivation,
  DerivationCompositionResult,
  DerivationId,
  DerivationSpec,
  NoCompositeReason,
} from './derivation.js';
