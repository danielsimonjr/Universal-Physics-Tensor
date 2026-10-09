/**
 * Universal Physics Tensor Framework
 *
 * Computational framework for exploring unified physics through tensor formalism
 *
 * @packageDocumentation
 */

export { UniversalTensor } from './core/tensor.js';
// v0.5.1 — canonical flat CODATA 2018 / SI-defined constants (PC-1).
// Single source of truth across numerical, dimensional, and bridge layers.
// See src/core/constants.ts and docs/planning/v0.5.1-Implementation-Plan.md.
export {
  C_SI,
  G_SI,
  H_SI,
  HBAR_SI,
  K_B_SI,
  E_SI,
  ALPHA,
  M_P_SI,
  L_P_SI,
  T_P_SI,
  H0_SI,
  // v0.8.0 punch-list — promoted from the calibration-edges module
  M_SUN_SI,
  // IAU 2015 nominal solar GM. Not G_SI * M_SUN_SI.
  GM_SUN_SI,
  // v0.11 — electron mass (namespacing criterion-3 pin)
  M_E_SI,
  // canonical registry — Wien displacement constant (CE-wien)
  B_WIEN_SI,
} from './core/constants.js';
export type {
  TensorConfig,
  TensorIndices,
  PhysicalLaw,
  BridgeEquation,
  EmergentPhenomenon,
  PhysicalScale,
  Force,
  Symmetry,
  InformationMeasure,
} from './core/types.js';
export { PhysicalConstants } from './core/types.js';

// v0.7 Proposal 3 — Typed `Cell` discriminated union (storage-layer
// surface). `PhysicalLaw` / `BridgeEquation` / `EmergentPhenomenon`
// above remain the legacy surface (consumers haven't migrated yet);
// the new `Cell` union is the preferred forward-looking shape.
export type {
  Cell,
  CellBase,
  CellConfidence,
  LawCell,
  BridgeCell,
  EmergenceCell,
} from './core/cell.js';
export { compose } from './core/tensor.js';

// v0.7 Proposal 2 — Sparse semantic catalog (flux rules + adapter).
// Per Decision #9, only the consumer-facing types are re-exported;
// FluxRule / FluxRuleKind / FluxRuleResult stay @internal.
export type {
  FluxDiagnostic,
  FluxReport,
} from './core/flux-rules.js';
export { FluxViolationError } from './core/flux-rules.js';
export type {
  CatalogEntryStatus,
  CatalogIngestionReport,
} from './bridges/catalog-adapter.js';
export {
  catalogToCells,
  scanCatalog,
  ingestCatalog,
  ingestionReportToFluxReport,
  CatalogIngestionError,
} from './bridges/catalog-adapter.js';

// v0.7 Proposal 1 — Intelligent Index layer (UniversalIndex + Axes
// + LabeledTensor wrapper). Per Decision #10, 10 public symbols.
// MergedLabels<L,R> and canonicalLabelOrder stay @internal.
export type {
  AxisName,
  UniversalIndex,
  UniversalIndexId,
  MakeIndexOptions,
} from './core/universal-index.js';
export { makeIndex } from './core/universal-index.js';
export type { AxesRegistry } from './core/axes-registry.js';
export { Axes } from './core/axes-registry.js';
export {
  LabeledTensor,
  LabeledTensorConstructionError,
  AxisMismatchError,
  IdentityConflictError,
  IndexNameMismatchError,
  RankPreservationError,
  AxisOrderError,
  AxisMergeError,
  AxisSplitError,
} from './core/labeled-tensor.js';

// v0.8 Proposal 5 — RegimeType extension system. Per P5 Decision #1,
// ship the mechanism + the 18 v0.6-shipped values pre-registered;
// closed taxonomy of new physics-regime built-ins deferred to v0.9.
export type {
  RegimeProvenance,
  RegimeValueBase,
  RegimeSpec,
} from './core/regime-registry.js';
export {
  defineRegime,
  defineScale,
  defineForce,
  defineSymmetry,
  defineInformation,
  defineDimension,
  defineTopology,
  lookupRegime,
  listRegimesByAxis,
  provenanceFor,
  attachRegimesToCell,
  getCellRegimes,
  RegimeCollisionError,
} from './core/regime-registry.js';
// Phase 4 wiring side-effect: installs the regime-consistency rule.
import './core/regime-rule-install.js';
// Phase 2 side-effect: pre-registers the 18 built-in regimes.
import './core/regimes-builtins.js';

// v0.9 Proposal 8 — Bridge Parameter Differentiation (P8 Decision #1: lives
// in src/diff/, doesn't touch src/bridges/). `bridgeGradientNumerical` is
// central finite differences over a spec, engine-free. Engine AD of a spec
// is unreachable by construction (`evaluate` returns a number, which carries
// no tape); the exact AD path is `bridgeGradientAST` over the symbolic RHS.
export type { BridgeDiffSpec, BridgeNumericalGradientResult } from './diff/bridge-gradient.js';
export { bridgeGradientNumerical } from './diff/bridge-gradient.js';
// Exact bridge gradients via reverse-mode AD over the symbolic RHS AST
// (traced lowering through mathts-autograd; faithful encodings only).
export type { ASTGradientResult } from './diff/bridge-ast-gradient.js';
export {
  bridgeGradientAST,
  bridgeGradientASTById,
  astDifferentiableBridgeIds,
} from './diff/bridge-ast-gradient.js';
/** Differentiable relations: Shapiro delay, perihelion advance, Hawking temperature, and the decoherence rate. */
export {
  SHAPIRO_DELAY_DIFF,
  PERIHELION_ADVANCE_DIFF,
  HAWKING_TEMPERATURE_DIFF,
  DECOHERENCE_RATE_DIFF,
  DIFFERENTIABLE_RELATIONS,
} from './diff/bridge-specs.js';

// The catalog rows of `data/bridge-catalog.json`, in id order.
// `BridgeEquationEntry` is a different shape from the runtime `BridgeEquation`
// interface above: the entry is the catalog's record of an equation (status,
// known issues, references, dependencies), while `BridgeEquation` describes a
// runtime bridge between two tensor regimes.
export { BRIDGE_EQUATIONS } from './bridges/index.js';
/** Request a caller-table confrontation. The catalog status does not change. */
export {
  requestCallerTableConfrontation,
} from './bridges/caller-table.js';
/** Types of a caller-table request and of its refusal or hit. */
export type {
  MeasuredCouplingRow,
  RunningProcedureRecord,
  RunningProcedure,
  CallerTableRequest,
  CallerTableRefusal,
  CallerTableHit,
  CallerTableResult,
} from './bridges/caller-table.js';
export type {
  BridgeEquationEntry,
  BridgeEquationStatus,
  BridgeIssueSeverity,
  BridgeIssueFixable,
  KnownIssue,
} from './bridges/index.js';

/**
 * Constants that stay on the package root, and `CarrierSignError`.
 * Per-bridge evaluate functions are not on this root.
 */
export {
  VON_KLITZING_SI,
  JOSEPHSON_CONSTANT_SI,
  LORENZ_NUMBER_SI,
  BCS_GAP_RATIO,
  LANE_EMDEN_OMEGA3,
  THOMSON_CROSS_SECTION_SI,
  M_PROTON_SI,
  CarrierSignError,
} from './bridges/index.js';
/**
 * One evaluation of a catalog id or a canonical id.
 * A sourced number is `kind: 'value'`. An unset coefficient is `kind: 'unset'`.
 * @public
 */
export { evaluateRelation, CoefficientUnsetError } from './composition/index.js';
/** The input errors {@link evaluateRelation} throws before any domain check; a domain failure is `DomainViolationError`. */
export {
  DuplicateInputError,
  InputTypeError,
  MissingInputError,
  NonFiniteInputError,
  UnknownInputError,
} from './composition/index.js';
/** A caller input that names a registered constant (`G`, `k_B`, `m_p`, …) is refused on every evaluation path. */
export { ConstantInputError } from './bridges/index.js';
/** The result of {@link evaluateRelation}. A value carries a public `Dimension`. */
export type { Evaluation } from './composition/index.js';

export type { EvaluatorSpec, EvaluatorParameter, ParameterAlternate, GeometryRole } from './bridges/evaluators.js';
/** An extra output an `EvaluatorSpec` returns beside its `value`. */
export type { CatalogEvaluatorOutput } from './bridges/catalog-types.js';
/** The input contract an evaluator's `run` checks before the domain, and what a caller asks `run` for. */
export type { ContractAlternate, EvaluationWant, InputContract, InputSlot } from './bridges/input-contract.js';
/** Build an input contract; throws when one spelling or alternate would bind two slots. */
export { inputContract } from './bridges/input-contract.js';

// v0.4.0 connection layer — Christoffel formula builder and covariant derivative
// AST node type. `christoffel` is public because bridge modules and downstream
// callers compose Γ trees directly; `CovariantDerivativeNode` is the structural
// type for the new ∇_μ AST kind.
export { christoffel } from './dimensional/connection.js';
// CovariantDerivativeNode is re-exported from validator.ts (which holds the union);
// importing from there avoids creating a separate source-of-truth.
export type { CovariantDerivativeNode } from './dimensional/validator.js';

// v0.5.0 curvature layer — Ricci tensor helper (Task 7). `ricci(R)` wraps a
// RiemannTensorNode and produces the contracted R_μν = R^λ_{λμν} as a
// composite ExprNode (own validator + lowering arms).
export { ricci } from './dimensional/curvature.js';
export type { RicciTensorNode } from './dimensional/validator.js';

// v0.5.0 curvature layer — Einstein tensor helper (Task 8). `einstein(R, g,
// gInverse)` wraps a RiemannTensorNode + metric pair and produces the
// composite G_μν = R_μν − ½ R g_μν as an ExprNode (own validator +
// lowering arms — no AST rewrite). Vacuum-Einstein scope; matter-coupled
// `G_μν = κ T_μν` is deferred to v0.6.0+.
export { einstein } from './dimensional/curvature.js';
export type { EinsteinTensorNode } from './dimensional/validator.js';

// v0.5.0 curvature layer — Bianchi residual helper (Task 9). `bianchiResidual(R)`
// returns {residual, evaluate, evaluateMax} for the cyclic second-Bianchi-identity
// check ∇_{[λ} R_{μν]ρσ} = 0. The evaluator lives in numerical so curvature.ts
// does not import it. Closes Phase 1 — Foundations.
export { bianchiResidual } from './numerical/bianchi-residual.js';
export type { BianchiResidualNode } from './dimensional/validator.js';

// v0.6.0 Phase 1 — Killing-vector machinery (Task 1.3).
// `verifyKillingEquation` checks the Killing equation ∇_μ ξ_ν + ∇_ν ξ_μ = 0
// numerically at a point using a hybrid impl (exact Christoffels + analytic
// metric derivatives). `evaluateConservedCharge` evaluates Q = ξ^μ p_μ along
// a geodesic. `ChristoffelAccess` is the layout-agnostic Christoffel accessor
// type that insulates consumers from the Phase 2 BR-2 flat-layout migration.
export {
  verifyKillingEquation,
  checkKillingEquation,
  evaluateConservedCharge,
} from './numerical/killing.js';
export type {
  KillingEquationOptions,
  KillingEquationCheck,
  ChristoffelAccess,
} from './numerical/killing.js';

// v0.4.0 geodesic integrator (RK4 solver — headline feature of v0.4.0)
export {
  integrateGeodesic,
  type GeodesicIntegratorInputs,
  type GeodesicIntegratorResult,
} from './numerical/geodesic-integrator.js';

// v0.14 G-9 increment 2 — geometrized-units boundary adapters. Convert a scalar
// between SI and geometrized (G = c = 1) units, driven by its `Dimension`
// exponent vector (factor G^M·c^(T−2M)). For consumers running the GR pipeline
// in geometrized units; the default-pipeline migration is a later increment.
export {
  toGeometrized,
  fromGeometrized,
  geometrizedFactor,
  NonGeometrizableDimensionError,
} from './numerical/geometrized.js';

// v0.7.1 M-1 — Surface restoration: five v0.7 dimensional primitives were
// @public-tagged during the BE-X re-encoding sprint but absent from this
// manifest. Re-exported here per Phase 1 Task 1.2 (Decision #2 guard).
// Mirrors the v0.6.0 EinsteinFieldEquationNode / KretschmannScalarNode /
// RicciTensorNode pattern — predicate-node types + validators are @public.
export type {
  TracableTensorNode,
  TensorTraceNode,
  TensorTraceValidationResult,
  TensorTraceOptions,
} from './dimensional/tensor-trace.js';
export { validateTensorTrace } from './dimensional/tensor-trace.js';

export type {
  FriedmannVariant,
  FriedmannEquationNode,
  FriedmannEquationValidationResult,
} from './dimensional/friedmann-equation.js';
export { validateFriedmannEquation } from './dimensional/friedmann-equation.js';

export type {
  RGCouplingNode,
  BetaFunctionNode,
  BetaFunctionValidationResult,
} from './dimensional/rg-flow.js';
export { rgCoupling, validateRGCoupling, validateBetaFunction } from './dimensional/rg-flow.js';

export type {
  ArrowOfTime,
  GaugeFieldNode,
  TimeSymmetryPredicateNode,
  TimeSymmetryPredicateValidationResult,
} from './dimensional/gauge-field.js';
export { validateGaugeField, validateTimeSymmetryPredicate } from './dimensional/gauge-field.js';

export type {
  ScalarFieldNode,
  KleinGordonEquationNode,
  KleinGordonEquationValidationResult,
} from './dimensional/klein-gordon-equation.js';
export { validateKleinGordonEquation } from './dimensional/klein-gordon-equation.js';

// Dimensional analyzer (Tier 4) — SI dimension propagation through bridge
// equations expressed as ExprNode trees. See src/dimensional/README.md.
// Every symbol re-exported in this block is `@public` — the consumer-facing
// dimensional/metric surface (stabilised in v0.3.0).
export type { Dimension } from './dimensional/types.js';
/** The one unit reader: parse a unit, convert a value exactly, and the typed errors it throws. */
export {
  AmbiguousUnitError,
  convertValue,
  parseUnit,
  UnitError,
  UnitRefusedError,
  UnknownUnitError,
} from './dimensional/units.js';
/** A parsed unit, a converted value, and how a temperature is read. */
export type { AffineTemperature, ConvertedValue, ParsedUnit, TemperatureReading } from './dimensional/units.js';
export {
  DIMENSIONLESS,
  LENGTH,
  AREA,
  TIME,
  FREQUENCY,
  MASS,
  VELOCITY,
  ACCELERATION,
  FORCE,
  ENERGY,
  POWER,
  ACTION,
  TEMPERATURE,
  ENTROPY,
  CHARGE,
} from './dimensional/types.js';
export {
  multiply,
  divide,
  power,
  add,
  subtract,
  equals,
  format,
  DimensionMismatchError,
} from './dimensional/algebra.js';
export type { ExprNode, TranscendentalFn, ValidationResult, Violation } from './dimensional/validator.js';
export { validate, validateEquation, validateInverseMetricPair } from './dimensional/validator.js';
export { inferDimensionForBridge } from './dimensional/bridge-check.js';

// v0.6.0 Phase 2 Task 2.4 — Einstein-equation numerical evaluator.
// `evaluateEinsteinEquationResidual` computes the scale-normalized max residual
// |G_μν + Λ g_μν − κ T_μν| / |g_μν| at a coordinate point. Accepts metric
// closures + stress-energy closure; returns a dimensionless relative residual.
// For Schwarzschild vacuum (T=0, Λ=0) the residual is the FD truncation floor
// (~1e-10 relative at 4th-order stencil accuracy).
export {
  evaluateEinsteinEquationResidual,
} from './numerical/einstein-equation.js';
export type {
  EinsteinEquationResidualInput,
  MetricClosure,
  Vec4,
} from './numerical/einstein-equation.js';

// v0.6.0 Phase 2 Task 2.3 — EinsteinFieldEquationNode predicate AST + validator.
// Represents G_μν + Λ g_μν = (8πG/c⁴) T_μν as a structurally-validated AST node.
// Validator checks: free-index agreement, per-component dim equality [L⁻²],
// and symmetry agreement (Decision #3 + #11).
export { validateEinsteinFieldEquation } from './dimensional/einstein-equation.js';
export type {
  EinsteinFieldEquationNode,
  EinsteinFieldEquationValidationResult,
} from './dimensional/einstein-equation.js';

// v0.6.0 Phase 3 Task 3.5 — KretschmannScalarNode AST + validator.
// K = R_{ρσμν} R^{ρσμν} is the canonical curvature invariant; scalar (rank-0),
// dim [L⁻⁴]. Diverges at genuine singularities; finite at coordinate ones.
export type {
  KretschmannScalarNode,
  KretschmannScalarValidationResult,
} from './dimensional/curvature-invariants.js';
export { validateKretschmannScalar } from './dimensional/curvature-invariants.js';

// v0.6.0 Phase 3 Task 3.6 — Kretschmann scalar numerical contraction.
// O(4⁸) = 65536 multiplications per call — diagnostic/sample-point use only.
export { computeKretschmann } from './numerical/kretschmann.js';

// Numerical-contraction backend (v0.3.5+). See docs/planning/v0.3.5-Design.md
// and docs/planning/v0.4.0-Implementation-Plan.md (v0.4.0 additions below).
// Every symbol below is `@public` — the consumer-facing (TensorJS) surface.
// `MathTSEngine` is intentionally NOT re-exported here. It is reachable only
// via the `universal-physics-tensor/numerical/mathts-engine` subpath. The
// MathTS packages are required dependencies.
/** Numerical evaluation, the covariant eikonal integrator, the GL4 geodesic integrator, and the perihelion finder. */
export {
  evaluateNumerical,
  evaluateNumericalRaw,
  evaluateMetricInverse,
  getActiveEngine,
  setActiveEngine,
  NumericalBackendError,
  // v0.4.0 additions to the numerical surface
  DuplicateCoordinateWarning,
  EngineCapabilityError,
  hasAutogradSupport,
  evaluateCovariantEikonalNumerical,
  // v0.5.0 GL4 symplectic integrator
  integrateGeodesicGL4,
  // v0.5.0 perihelion finder (Task 4)
  findPerihelion,
} from './numerical/index.js';
/** Types for numerical evaluation, gradients, the GL4 integrator, the perihelion finder, and the covariant eikonal. */
export type {
  NumericalResult,
  NumericalRawResult,
  EvaluateOptions,
  NumericalInputs,
  TensorEngine,
  EngineTensor,
  EinsumSpec,
  NestedArray,
  GridField,
  // v0.4.0 type additions
  ForwardGradResult,
  ReverseGradResult,
  // v0.5.0 GL4 type additions
  GL4State,
  GL4Snapshot,
  GL4Options,
  // v0.5.0 perihelion-finder type additions (Task 4)
  PerihelionResult,
  FindPerihelionOptions,
  CovariantEikonalInputs,
  CovariantEikonalResult,
} from './numerical/index.js';

// ---------------------------------------------------------------------------
// v0.8.0 — Composition graph (graph-lite Quantity/BridgeEdge/composeEdges
// beside the catalog; see docs/planning/v0.8.0-Design.md). The operator is
// `composeEdges`, NOT `compose` — `compose` is the v0.7 Cell factory above.
// ---------------------------------------------------------------------------
export {
  composeEdges,
  consistencyRatio,
  evaluateEdge,
  minConfidence,
  regimesDiffer,
  QUANTITY_IDENTIFICATIONS,
  CompositionDimensionError,
  CompositionJunctionError,
  DomainViolationError,
  // Calibration edges (pre-registered CT-1/CT-1b/CT-2/CT-3 targets)
  M_SUN_KG,
} from './composition/index.js';
export type {
  BridgeEdge,
  ComposeOptions,
  EdgeConfidence,
  Quantity,
  QuantityIdentification,
  RegimeAttributes,
  ValidityDomain,
} from './composition/index.js';

// v0.8.0 — Bridge-membership criterion + negative catalog (G-2 / P-4)
export { adjudicateBridgeEntry, adjudicateCatalog } from './bridges/membership.js';
export { REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS } from './bridges/rejected.js';
export type { BridgeVerdict, CatalogAdjudicationReport } from './bridges/membership.js';
export type { RejectedBridgeAdjudication } from './bridges/rejected.js';

// v0.8.0 — GW170817 → BE-36 real-data confrontation (G-3)

// v0.28+ — Mercury perihelion → BE-52 real-data confrontation (established bridge)

// v0.10.0 — Phase-D enumeration + uncertainty propagation (T3/T4)
export {
  enumerateCompositions,
  REGISTERED_COMPOSITION_IDS,
  propagateUncertainty,
} from './composition/index.js';
export type {
  CompositionCandidate,
  EnumerationReport,
  UncertaintyResult,
} from './composition/index.js';

// Identifiability classifier (structural over/exactly/under-determined
// over the composition graph — Consequence 1 of the bridge-inference
// epistemics note)
export {
  classifyIdentifiability,
  classifyAll,
  forwardClosure,
} from './composition/index.js';
export type {
  IdentifiabilityVerdict,
  IdentifiabilityResult,
  IdentifiabilityOptions,
} from './composition/index.js';

// Retrodiction harness (the framework's own falsification benchmark —
// Consequence 2 of the bridge-inference epistemics note)
export { retrodict, retrodictNode } from './composition/index.js';
/** The retrodiction harness's result, prediction, refusal, report and option types. */
export type {
  RetrodictionOutcome,
  RetrodictionPrediction,
  RetrodictionResult,
  RetrodictionRefusal,
  RetrodictionReport,
  RetrodictionOptions,
} from './composition/index.js';

// Unified "explain this quantity" entry point over the three inference
// primitives (identifiability + retrodiction + Buckingham-π)
export { explainQuantity } from './composition/index.js';
export type {
  DerivationExplanation,
  ExplainOptions,
  QuantityExplanation,
} from './composition/index.js';

// v0.12 — symbolic bridge composition (the Observable contract). Composes
// bridges' symbolic ExprNode forms (not just numeric closures), dimensionally
// validated and numerically evaluable.
export { composeSymbolic, SymbolicCompositionError, SymbolicEvalError } from './composition/index.js';
export type { Observable, ComposeSymbolicOptions } from './composition/index.js';

// Physics-map visualization — render the bipartite, clustered hypergraph
// (quantities = nodes, equations = junctions) as Mermaid / Graphviz-DOT source.
export { buildVizModel, edgeToJunction } from './composition/index.js';
export type {
  VizStatus,
  VizJunction,
  VizCluster,
  VizOptions,
  VizModel,
  VizFilterStats,
} from './composition/index.js';
// SVG rendering via the optional @viz-js/viz peer (separate module so the
// graph-viz model stays pure/synchronous/dependency-free).
export { renderDotToSvg, SvgRendererUnavailableError } from './composition/index.js';

// User-equation injection — parse a free-form "TARGET = EXPR" and place it into
// the map as a connected 'user' junction (with a "did you mean?" hint).
export {
  parseUserEquation,
  suggestQuantities,
  suggestByDimension,
  equationLanding,
  analyzeUserEquation,
  UserEquationError,
} from './composition/index.js';
/** The catalog or parameter name a spelling means. One owner for a target and an input. */
export { resolveQuantityName } from './composition/index.js';
export type { UserEquation, EquationLanding, EquationAnalysis, EquationHint } from './composition/index.js';

// Phase 1 — string → dimensional ExprNode parser + single-unknown dimensional
// inference (the front-end to the physics AST).
export { parsePhysics } from './numerical/formula-registry.js';
export { FormulaDimensionError } from './numerical/formula-dimension.js';
export type { ParsedPhysics } from './numerical/formula-dimension.js';
export { inferUnknownDimension, substituteSymbolDim } from './dimensional/dimension-inference.js';
// Dimension-adjacency review surface (name-divergent but same-dimension quantities).
export { dimensionAdjacency } from './composition/index.js';
export type { DimensionAdjacency } from './composition/index.js';


// Buckingham-π enumerator (the principled primitive for the exactly-
// determined case — build target 1 of the bridge-inference epistemics
// note; FORM only, never the dimensionless constant)
export {
  buckinghamPi,
  dimensionallyDetermines,
  RationalizationError,
} from './dimensional/buckingham.js';
export type {
  DimensionalVariable,
  PiGroup,
  BuckinghamVerdict,
  BuckinghamResult,
  DimensionalDeterminationResult,
} from './dimensional/buckingham.js';

// v0.11 — namespacing gate (Option D: name-collision rule + dispositions)
export {
  CompositionAliasError,
  SOURCE_ALIAS_DISPOSITIONS,
} from './composition/compose-surface.js';
export type {
  AliasDisposition,
  DispositionRequired,
} from './composition/compose-surface.js';

// v0.11 — Klein-Gordon dispersion evaluator (G-7 closure, plane-wave sector)
export {
  evaluateKGDispersionResidual,
  verifyKleinGordonPlaneWave,
} from './numerical/klein-gordon.js';
export type {
  KGDispersionResidualInput,
  KGPlaneWaveVerifyInput,
  KGPlaneWaveVerifyResult,
} from './numerical/klein-gordon.js';

// v0.11 — BE-23 Planckian-dissipation data confrontation (2nd real-data check)

// The composition graph is the relation projection of the catalog.
export { CATALOG_GRAPH } from './composition/index.js';

// The standard-physics counterpart: the canonical L-layer projected into the
// composition-graph edge vocabulary, so the discovery/analysis funnel can run
// on textbook physics ALONE (bridges excluded). See `composition/canonical-graph`.
export {
  CANONICAL_GRAPH,
  canonicalToEdges,
  CANONICAL_CONSTANTS,
} from './composition/index.js';

// ── Canonical-equation registry (the L-layer ground truth) ──────────────────
// Textbook physics equations bridges are validated against. Multi-fidelity
// (L0 dimensional / L1 scalar-AST / L2 field-equation) with epistemic-honesty
// and provenance fields. See docs/planning/Canonical-Equation-Registry-A-*.
export {
  CANONICAL_EQUATIONS,
  CANONICAL_BY_ID,
  canonicalById,
  canonicalByDomain,
  partneredBridgeIds,
  bridgesWithoutCanonicalPartner,
} from './canonical/registry.js';
export {
  canonicalToLaw,
  seedCanonicalLaws,
  CANONICAL_TENSOR_CONFIG,
} from './canonical/seed-l-layer.js';
export type {
  CanonicalEquation,
  CanonicalDomain,
  EpistemicStatus,
  CanonicalForms,
  FieldEquationNode,
} from './canonical/canonical-equation.js';
// Sub-project B — bridge↔canonical linkage (validate vs standard physics).
// `normalForm` is the structural hash up to dimensionless factors;
// `classifyLinkage`/`scanLinkages` recover/contain bridges against canonicals
// with the F4 circularity guard (`restates-canonical` vs genuine `recovers`).
export { normalForm, structurallyEqual } from './canonical/normal-form.js';
export { classifyLinkage, scanLinkages } from './canonical/linkage.js';
export type { LinkageResult, RecoveryOutcome } from './canonical/linkage.js';

// Adjudication ledger — human verdicts on discovery-funnel identification
// hypotheses (review memory the funnel must not re-surface as fresh).
// Precedent: SOURCE_ALIAS_DISPOSITIONS/AliasDisposition above is the repo's
// other reviewable judgment registry, and is index-exported the same way.
export {
  candidateId,
  ADJUDICATIONS,
  adjudicationFor,
  annotateAdjudications,
} from './composition/adjudication.js';
export type { AnnotatedCandidate } from './composition/adjudication.js';
/** The adjudication ledger's verdict and record types, exported from their owner, the catalog file's types. */
export type { AdjudicationVerdict, CatalogAdjudication } from './bridges/catalog-types.js';

// Consequence propagation — the machine pre-classifier for the human
// adjudication ledger. Annotates discovery candidates with the
// entailed/novel-consequence/inconclusive signal; never mutates the
// catalog/graph, never re-orders or re-scores.
export { annotateConsequences, classifyProposal } from './composition/consequence.js';
export type {
  ConsequenceAnnotatedCandidate,
  ConsequenceSignal,
  ConsequenceEvidence,
} from './composition/consequence.js';

// Epistemic-grounding ledger (PI-instrument Phase 1). A pure, derived view over
// a candidate's falsifier results: which gates passed vs abstained, plus the
// honest no-mechanism/no-data ceiling. Annotation-only; changes no verdict.
export { describeGrounding } from './composition/grounding.js';
export type { CandidateGrounding } from './composition/grounding.js';

// Discovery funnel — vet link-candidate identifications against the inference
// suite (Direction 2). rankDiscoveries is the entry point; VettedCandidate is
// the output type. Required to feed annotateAdjudications from the public API.
export { rankDiscoveries } from './composition/discovery.js';
export type { VettedCandidate } from './composition/discovery.js';

// v0.33.0 — `upt confront` real-data confrontation subsystem: typed
// observations + a normalized ConfrontationOutcome (discriminated on `kind`)
// wrap the per-bridge confrontation modules (be-23/36/37/48/52) behind one
// registry, plus deciding-measurement elasticity for value-kind entries.
export {
  residualInSigma,
  combineInQuadrature,
  consistencyComparison,
} from './bridges/observations/types.js';
export type {
  ConsistencyComparison,
  ObservationProvenance,
  SigmaComponent,
  ObservationKind,
  ConfrontationOutcome,
  ConfrontationDataHandling,
  ConfrontationPreprocessing,
  ConfrontationIndependence,
  SourceRef,
  SourceRefs,
} from './bridges/observations/types.js';

// BE-53 — one-loop coefficient, and a confrontation only when the caller supplies both inputs.
export { oneLoopCoefficientStatement } from './bridges/coefficient-statement.js';
export type { OneLoopCoefficientStatement, OneLoopCoefficientSign } from './bridges/coefficient-statement.js';

// The confrontation registry: every committed confrontation of
// `data/bridge-catalog.json`, the single lookup surface for `upt confront`.
export {
  CONFRONTATIONS,
  listConfrontations,
  runConfrontation,
  // Rigor hierarchy of the evidence spine (2026-07-05) — stringent/moderate/loose.
  CONFRONTATION_RIGOR,
  confrontationRigor,
  rigorDistribution,
} from './bridges/confrontations.js';
export type { ConfrontationEntry, RigorTier } from './bridges/confrontations.js';

// Deciding-measurement elasticity — which input a value-kind confrontation's
// prediction depends on most strongly (central-difference log-sensitivity).
export { decidingMeasurement } from './bridges/sensitivity.js';
export type { Elasticity } from './bridges/sensitivity.js';

// The PUBLIC atlas surface as a namespace (Atlas API review, Tier 1). The full
// @internal surface stays on the universal-physics-tensor/atlas subpath.
export * as atlas from './atlas/public.js';

// ---------------------------------------------------------------------------
// Closure under type references (tests/api/root-public-closure.test.ts).
// Every type a root export names is itself importable from the root or from
// a package.json subpath; the names below were reachable only through the
// public declarations that mention them.
// ---------------------------------------------------------------------------
/** The base class of every error this package throws. */
export type { UPTError } from './dimensional/errors.js';
/** Which constants a natural-unit evaluation sets to one. */
export type { UnitMode } from './dimensional/natural-units.js';
/** The tensor and curvature node family of the dimensional AST. */
export type {
  Variance,
  Role,
  TensorIndex,
  UpperIndex,
  CovariantIndex,
  TensorSymbolNode,
  TensorProductNode,
  MetricTensorNode,
  KroneckerDeltaNode,
  TensorPartialDerivativeNode,
  RiemannTensorNode,
  WeylTensorNode,
  KillingVectorNode,
  ConservedChargeNode,
  StressEnergyTensorNode,
  CosmologicalConstantNode,
} from './dimensional/ast-types.js';
/** The generic shape the curvature node types instantiate, and its kind union (referenced by the exported node types). */
export type { CurvatureCompositeNode, CurvatureKind } from './dimensional/curvature-composite.js';
/** The kind of a flux rule. */
export type { FluxRuleKind } from './core/flux-rules.js';
/** The per-axis value tables of the core axis registry. */
export type { ScaleAxes, ForceAxes, SymmetryAxes, InformationAxes } from './core/axes-registry.js';
/** The convenience form a regime registration accepts for an axis. */
export type { AxisConvenience } from './core/regime-registry.js';
/** The named inputs of the four bridge differentiation specs. */
export type { ShapiroInput, PerihelionInput, HawkingInput, DecoherenceInput } from './diff/bridge-specs.js';
/** The contraction and free-axis records an einsum plan is made of. */
export type { EinsumContraction, EinsumFreeAxis } from './numerical/tensor-engine.js';
/** The callbacks a Killing-equation check takes: the vector field, the metric and the connection. */
export type { KillingFn, KillingMetricFn, ChristoffelAtFn } from './numerical/killing.js';
/** A relation's input contract and the sign and unit conventions it states. */
export type { RelationContract, Conventions } from './relations/types.js';
/** The classification axes of the composition registry. */
export type {
  ScaleAxis,
  ForceAxis,
  InformationAxis,
  SymmetryAxis,
  TopologyAxis,
  StatisticsAxis,
} from './composition/axes.js';
/** Options of the chain enumerator. */
export type { EnumerationOptions } from './composition/enumerate.js';
/** Options of the uncertainty propagation. */
export type { UncertaintyOptions } from './composition/uncertainty.js';
/** Options of a user-equation analysis and the short form of a binding. */
export type { AnalyzeUserEquationOptions, ShortBinding } from './composition/user-equation.js';
/** A constant as the canonical graph declares it. */
export type { ConstantDef } from './composition/canonical-graph.js';
/** An identity consequence the surfacer proposes; never written to the catalog. */
export type { ProposedBridge } from './composition/proposed-bridges.js';
/** Options of the discovery funnel. */
export type { DiscoveryOptions } from './composition/discovery.js';
/** A representative value of a quantity with its source. */
export type { RepresentativeValue } from './composition/representative-values.js';
/** A canonical prefactor, scalar or per dimensionless group, with its source. */
export type { SourcedPrefactor, SourcedGroupPrefactor } from './canonical/canonical-equation.js';
