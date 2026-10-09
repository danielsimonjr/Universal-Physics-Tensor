/**
 * Product B (expression / residual search) experimental types.
 * Orthogonal to Product A quantity identification (`discovery.ts`).
 * Not re-exported from `src/index.ts`.
 *
 * @module composition/probe/types
 */

import type { Dimension } from '../../dimensional/types.js';
import type { ExprNode } from '../../dimensional/ast-types.js';
import type { IdentifiabilityResult } from '../identifiability.js';

/** Experimental probe JSON schema major. @internal */
export const SCHEMA_VERSION = '0';
/** Alias of {@link SCHEMA_VERSION}. @internal */
export const PROBE_SCHEMA_VERSION = SCHEMA_VERSION;

/** Conservative Product B candidate lifecycle. Orthogonal to `AdjudicationVerdict`. @internal */
export type ProbeCandidateStatus =
  | 'generated' | 'structurally-valid' | 'empirically-fit' | 'heldout-supported'
  | 'falsification-survivor' | 'expert-review-required' | 'rejected' | 'falsified'
  | 'equivalent-known' | 'insufficient-evidence';

/** Kind of a named scientific relation this overlay may point at. @internal */
export type RelationKind =
  | 'definition' | 'canonical-equation' | 'bridge-equation' | 'approximation'
  | 'effective-relation' | 'phenomenological-relation' | 'computational-predicate'
  | 'candidate-hypothesis' | 'quantity-identification';

/** Audit completeness of a metadata claim. @internal */
export type AuditState =
  | 'verified' | 'partially-verified' | 'not-yet-audited' | 'unknown' | 'not-applicable';

/** Mathematical meaning of a residual / discrepancy. @internal */
export type DiscrepancyKind =
  | 'additive' | 'relative' | 'log-ratio' | 'standardized' | 'likelihood'
  | 'vector' | 'tensor' | 'distributional' | 'operator' | 'custom';

/** How a dataset may be used. Holdout must not influence generation. @internal */
export type DatasetRole =
  | 'exploratory-fit' | 'validation-holdout' | 'external-replication' | 'falsification-only';

/** Why a bounded search terminated. `no-credible-candidate` is a success. @internal */
export type SearchStopReason =
  | 'exhausted-space' | 'candidate-limit' | 'evaluation-limit' | 'time-limit'
  | 'memory-limit' | 'cancelled' | 'sufficient-candidates' | 'non-identifiable'
  | 'no-credible-candidate';

/** Typed frontier gap. `relation-link` wraps Product A; residual is Product B. @internal */
export type FrontierGapKind =
  | 'prediction-residual' | 'relation-link' | 'regime-transition' | 'parameter-tension'
  | 'assumption-conflict' | 'missing-operator' | 'unexplained-observation'
  | 'model-disagreement' | 'causal-mechanism' | 'other';

/** Graph-structural vs parametric (Jacobian / design-matrix) identifiability. @internal */
export type IdentifiabilityKind = 'graph-structural' | 'parametric';

/** Hard caps on a Product B search. No search is unbounded. @internal */
export interface SearchBudget {
  readonly maxCandidates: number;
  readonly maxAstDepth: number;
  readonly maxOperators: number;
  readonly maxDerivativeOrder: number;
  readonly maxEvaluations: number;
  readonly maxWallClockMs: number;
  readonly maxResidentMemoryBytes?: number;
  readonly maxExternalProcesses?: number;
}

/** Default native-enumerator budget. @internal */
export const DEFAULT_SEARCH_BUDGET: SearchBudget = {
  maxCandidates: 1000,
  maxAstDepth: 6,
  maxOperators: 12,
  maxDerivativeOrder: 2,
  maxEvaluations: 10000,
  maxWallClockMs: 5000,
  maxResidentMemoryBytes: 256 * 1024 * 1024,
  maxExternalProcesses: 1,
};

/** Explicit residual semantics for a run or correction. @internal */
export interface DiscrepancyDefinition {
  readonly kind: DiscrepancyKind;
  readonly observableIds: readonly string[];
  readonly covarianceRef?: string;
  readonly implementationRef?: string;
}

/** Pointer at an existing relation; not a registry. @internal */
export interface ScientificRelationRef {
  readonly kind: RelationKind;
  readonly id: string;
}

/** Identifiability of a gap — two different questions; do not translate. @internal */
export interface IdentifiabilityAssessment {
  readonly kind: IdentifiabilityKind;
  /** Product A / relation-link: reuse `classifyIdentifiability()`. */
  readonly graph?: IdentifiabilityResult;
  /** Product B: Jacobian / design-matrix rank vs locked observations. */
  readonly parametric?: {
    readonly status: 'identifiable' | 'partially-identifiable' | 'non-identifiable' | 'unknown';
    readonly rank?: number;
    readonly nParameters?: number;
    readonly nIndependentObservations?: number;
    readonly reasons: readonly string[];
  };
}

/** Whether an expensive search is even warranted. @internal */
export interface SearchabilityAssessment {
  readonly searchable: boolean;
  readonly reasons: readonly string[];
}

/** Human-readable gap evidence with source ids. @internal */
export interface GapEvidence {
  readonly summary: string;
  readonly sourceIds: readonly string[];
}

/** Typed scientific gap (`fg-*`). Most `relation-link` / regime gaps wrap Product A. @internal */
export interface FrontierGap {
  readonly id: string;
  readonly kind: FrontierGapKind;
  readonly participants: readonly ScientificRelationRef[];
  readonly observations: readonly string[];
  readonly regimes: readonly string[];
  readonly assumptions: readonly string[];
  readonly constraints: readonly string[];
  readonly discrepancy?: DiscrepancyDefinition;
  readonly evidence: GapEvidence;
  readonly identifiability: IdentifiabilityAssessment;
  readonly searchability: SearchabilityAssessment;
  readonly status: 'identified' | 'searchable' | 'underdetermined' | 'resolved' | 'retired';
}

/** How a probe candidate entered the store. @internal */
export type ProbeCandidateOrigin =
  | { readonly kind: 'grammar-enumerator'; readonly runId: string }
  | { readonly kind: 'external-backend'; readonly backendId: string; readonly runId: string }
  | { readonly kind: 'human-authored'; readonly source: string };

/** Discriminated candidate payload. Identifications stay `VettedCandidate`. @internal */
export type ProbeCandidateBody =
  | { readonly kind: 'scalar-expr'; readonly expression: ExprNode }
  | {
      readonly kind: 'correction';
      readonly baselineRef: ScientificRelationRef;
      readonly correction: ExprNode;
      readonly discrepancy: DiscrepancyDefinition;
    };

/** Append-only status transition. Reloading uses last `to`. @internal */
export interface StatusEvent {
  readonly at: string;
  readonly from: ProbeCandidateStatus | 'none';
  readonly to: ProbeCandidateStatus;
  readonly reason: string;
  readonly runId: string;
}

/** Cheap-to-strong fingerprint layers for equivalence / rejection. @internal */
export interface CandidateFingerprint {
  readonly syntaxHash: string;
  readonly canonicalAstHash: string;
  readonly dimensionalSignature: string;
  readonly regimeSignature: string;
  readonly assumptionSignature: string;
}

/** Parsimony / complexity of a candidate expression. @internal */
export interface ComplexityMetrics {
  readonly astNodes: number;
  readonly operators: number;
  readonly freeParameters: number;
  readonly derivativeOrder: number;
  readonly tensorRank?: number;
  readonly descriptionLength?: number;
}

/** Persisted Product B candidate (`h-*`). Status is the last history `to`. @internal */
export interface ProbeCandidateRecord {
  readonly id: string;
  readonly gapId: string;
  readonly body: ProbeCandidateBody;
  readonly origin: ProbeCandidateOrigin;
  readonly assumptions: readonly string[];
  readonly status: ProbeCandidateStatus;
  readonly statusHistory: readonly StatusEvent[];
  readonly evaluations: readonly string[];
  readonly fingerprint: CandidateFingerprint;
  readonly complexity: ComplexityMetrics;
  readonly schemaVersion: string;
}

/** Negative-result memory keyed by fingerprint + evaluation context. @internal */
export interface ProbeRejectionRecord {
  readonly fingerprint: CandidateFingerprint;
  readonly reason: string;
  readonly counterexample?: {
    readonly predicted: number;
    readonly expected: number;
    readonly tolerance: number;
    readonly point: Readonly<Record<string, number>>;
  };
  readonly context: string;
  readonly timestamp: string;
}

/** Untrusted worker identity. Capabilities are opaque strings. @internal */
export interface DiscoveryBackendDescriptor {
  readonly protocolVersion: string;
  readonly backendId: string;
  readonly backendVersion: string;
  readonly capabilities: readonly string[];
  readonly deterministic: 'yes' | 'seeded' | 'no' | 'unknown';
}

/** Host environment captured in a run manifest. @internal */
export interface EnvironmentFingerprint {
  readonly node: string;
  readonly platform: string;
  readonly arch: string;
}

/** Declared source of non-bitwise reproducibility. @internal */
export interface NondeterminismSource {
  readonly kind: string;
  readonly detail: string;
}

/** Reproducible Product B search artifact (`dr-*`). @internal */
export interface DiscoveryRunManifest {
  readonly schemaVersion: string;
  readonly runId: string;
  readonly repositoryCommit: string;
  readonly problemHash: string;
  readonly datasetHashes: readonly string[];
  readonly backendDescriptors: readonly DiscoveryBackendDescriptor[];
  readonly randomSeeds: Readonly<Record<string, string | number>>;
  readonly tolerances: Readonly<Record<string, number>>;
  readonly environment: EnvironmentFingerprint;
  readonly searchBudget: SearchBudget;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly stopReason?: SearchStopReason;
  readonly nondeterminism: readonly NondeterminismSource[];
}

/** Named SI-dimensioned variable in a search problem. @internal */
export interface DimensionalVariableRef {
  readonly name: string;
  readonly dim: Dimension;
}

/** One numeric observation keyed by variable name. @internal */
export type ObservationRow = Readonly<Record<string, number>>;

/** In-memory probe dataset. Not a rewrite of `upt confront` observations. @internal */
export interface ProbeDataset {
  readonly id: string;
  readonly role: DatasetRole;
  readonly rows: readonly ObservationRow[];
  readonly observable: string;
  readonly sigma?: number;
  readonly schemaVersion: string;
}

/** Inputs to a bounded Product B search. @internal */
export interface SearchProblem {
  readonly gap: FrontierGap;
  readonly target: DimensionalVariableRef;
  readonly governing: readonly DimensionalVariableRef[];
  readonly exploratory?: ProbeDataset;
  readonly holdout?: ProbeDataset;
  readonly baseline?: ExprNode;
  readonly discrepancy?: DiscrepancyDefinition;
  readonly assumptions?: readonly string[];
  readonly regimeSignature?: string;
  /** Declared limits; failed limits are fatal only in a claimed domain. */
  readonly limits?: readonly DeclaredLimit[];
  /** Regime the candidate claims, used for limit fatality. */
  readonly claimedRegimes?: Readonly<Record<string, string>>;
  readonly observationalBoundIds?: readonly string[];
}

/** Named regime restriction a candidate may claim. @internal */
export interface DeclaredLimit {
  readonly id: string;
  readonly regime: Readonly<Record<string, string>>;
  readonly description?: string;
}

/** One falsification battery name. @internal */
export type FalsificationBattery =
  | 'dimensional'
  | 'finiteness'
  | 'limits';

/** Outcome of one falsification battery. @internal */
export interface FalsificationRecord {
  readonly battery: FalsificationBattery;
  readonly outcome: 'pass' | 'fail' | 'inconclusive';
  readonly detail: string;
}

/** Optional overlay metadata — not a registry, not imported by `canonical/`. @internal */
export interface ScientificRelationRecord {
  readonly ref: ScientificRelationRef;
  readonly evidence?: EvidenceProfile;
  readonly audit?: AuditState;
  readonly notes?: string;
}

/** Pareto scores on [0, 1]; not a single magic ranking. @internal */
export interface ScoreVector {
  readonly validity: number;
  readonly empirical: number;
  readonly parsimony: number;
  readonly corpusDistance: number;
  readonly robustness: number;
}

/** One evidence axis. Never a substitute for a quantitative residual. @internal */
export interface EvidenceAssessment {
  readonly state: 'supported' | 'mixed' | 'unsupported' | 'unknown' | 'not-applicable';
  readonly rationale?: string;
  readonly sourceIds?: readonly string[];
}

/** Vector evidence profile for overlay metadata. @internal */
export interface EvidenceProfile {
  readonly theoretical: EvidenceAssessment;
  readonly empirical: EvidenceAssessment;
  readonly replication: EvidenceAssessment;
  readonly regimeCoverage: EvidenceAssessment;
  readonly provenanceQuality: EvidenceAssessment;
}
