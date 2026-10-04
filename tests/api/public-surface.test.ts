/**
 * v0.4.0 Public API stability snapshot test.
 *
 * Two-pronged guard (matches v0.3.5 Task 16 pattern):
 *   1. Runtime export surface — Object.keys(root) covers every value-export
 *      (functions, classes, constants). TS erases nothing from these.
 *   2. Type-only export surface — source-text grep on dist/index.d.ts ensures
 *      type-only exports (erased at runtime) are not silently dropped.
 *
 * isChristoffelSymmetric is intentionally absent — removed per E9 adversarial
 * review (μ↔ν symmetry of Γ holds by construction of the symmetric metric).
 *
 * See docs/planning/v0.4.0-api-surface.md for per-symbol rationale.
 *
 * @module tests/api/public-surface
 */
import { describe, it, expect } from 'vitest';
import * as root from '../../src/index.js';

// ---------------------------------------------------------------------------
// Runtime value exports (functions, classes, constants)
// ---------------------------------------------------------------------------
const EXPECTED_RUNTIME_EXPORTS = [
  // Core
  'UniversalTensor',
  'PhysicalConstants',
  // Bridge catalog
  'BRIDGE_EQUATIONS',
  // v0.3.0 dimensional constants
  'DIMENSIONLESS', 'LENGTH', 'AREA', 'TIME', 'FREQUENCY', 'MASS',
  'VELOCITY', 'ACCELERATION', 'FORCE', 'ENERGY', 'POWER', 'ACTION',
  'TEMPERATURE', 'ENTROPY', 'CHARGE',
  // v0.3.0 dimensional algebra
  'multiply', 'divide', 'power', 'add', 'subtract', 'equals', 'format',
  'DimensionMismatchError',
  // v0.3.0 validator
  'validate', 'validateEquation', 'validateInverseMetricPair',
  'inferDimensionForBridge',
  // v0.3.5 numerical surface
  'evaluateNumerical', 'evaluateNumericalRaw', 'evaluateMetricInverse',
  'getActiveEngine', 'setActiveEngine',
  'NumericalBackendError',
  // v0.4.0 bridge implementations
  'evaluateGravitationalLensing',
  'evaluatePerihelionPrecession',
  // v0.14 bridge-equations facade
  'BridgeEquations',
  // v0.14 G-9 increment 2 — geometrized boundary adapters
  'toGeometrized',
  'fromGeometrized',
  'geometrizedFactor',
  'NonGeometrizableDimensionError',
  // v0.4.0 connection layer
  'christoffel',
  // v0.4.0 geodesic integrator
  'integrateGeodesic',
  // v0.4.0 numerical additions
  'DuplicateCoordinateWarning',
  'EngineCapabilityError',
  'hasAutogradSupport',
  'evaluateBE37CovariantEikonalNumerical',
  // v0.5.0 GL4 symplectic integrator (Task 3)
  'integrateGeodesicGL4',
  // v0.5.0 perihelion finder (Task 4)
  'findPerihelion',
  // v0.5.0 curvature layer (Task 7)
  'ricci',
  // v0.5.0 curvature layer (Task 8)
  'einstein',
  // v0.5.0 curvature layer (Task 9)
  'bianchiResidual',
  // v0.5.1 flat CODATA / SI constants (Task 0)
  'C_SI', 'G_SI', 'H_SI', 'HBAR_SI', 'K_B_SI', 'E_SI',
  'ALPHA', 'M_P_SI', 'L_P_SI', 'T_P_SI', 'H0_SI',
  // v0.6.0 Killing-vector machinery (Task 1.3)
  'verifyKillingEquation', 'checkKillingEquation', 'evaluateConservedCharge',
  // v0.6.0 Einstein field-equation node + numerical residual (Tasks 2.3, 2.4)
  'validateEinsteinFieldEquation', 'evaluateEinsteinEquationResidual',
  // v0.6.0 Kretschmann curvature invariant (Tasks 3.5, 3.6)
  'validateKretschmannScalar', 'computeKretschmann',
  // v0.7 Proposal 3 — Cell-union factory (Phase 2 Task 2.2)
  'compose',
  // v0.7 Proposal 2 — sparse semantic catalog (Phase 4a Task 4a.1)
  'FluxViolationError', 'catalogToCells', 'scanCatalog',
  'ingestCatalog', 'ingestionReportToFluxReport', 'CatalogIngestionError',
  // v0.7 Proposal 1 — Intelligent Index layer (Phase 4 Task 4)
  'makeIndex', 'Axes', 'LabeledTensor',
  'LabeledTensorConstructionError', 'AxisMismatchError',
  'IdentityConflictError', 'IndexNameMismatchError', 'RankPreservationError', 'AxisOrderError',
  'AxisMergeError', 'AxisSplitError',
  // v0.8 Proposal 5 — RegimeType extension system
  'defineRegime', 'defineScale', 'defineForce', 'defineSymmetry',
  'defineInformation', 'defineDimension', 'defineTopology',
  'lookupRegime', 'listRegimesByAxis', 'provenanceFor',
  'attachRegimesToCell', 'getCellRegimes', 'RegimeCollisionError',
  // v0.9 Proposal 8 — Bridge Parameter Differentiation
  'bridgeGradient', 'bridgeGradientNumerical', 'gradientToNamed',
  'bridgeGradientAST', 'bridgeGradientASTById', 'astDifferentiableBridgeIds',
  'BE37_SHAPIRO_DIFF', 'BE52_PERIHELION_DIFF',
  'BE42_HAWKING_DIFF', 'BE11_DECOHERENCE_DIFF',
  'DIFFERENTIABLE_BRIDGE_SPECS',
  // v0.7.1 M-1 Surface restoration — 5 v0.7 dimensional primitives
  'validateTensorTrace',
  'validateFriedmannEquation',
  'rgCoupling', 'validateRGCoupling', 'validateBetaFunction',
  'validateGaugeField', 'validateTimeSymmetryPredicate',
  'validateKleinGordonEquation',
  // v0.8.0 — Composition graph (composeEdges, NOT compose — that is the
  // v0.7 Cell factory; see docs/planning/v0.8.0-Design.md r2-1)
  'composeEdges', 'consistencyRatio', 'evaluateEdge', 'minConfidence',
  'regimesDiffer', 'QUANTITY_IDENTIFICATIONS',
  'CompositionDimensionError', 'CompositionJunctionError',
  'DomainViolationError',
  'be11ZurekEdge', 'be12Edge', 'be37Edge',
  'be16Edge', 'be42Edge', 'be42ViaRsEdge', 'be51Edge', 'be52Edge',
  'lawSchwarzschildRadius', 'M_SUN_KG',
  // v0.10.0 T5 — catalog-tranche edges (BE-14/19/21/48/53/54)
  'be14Edge', 'be19Edge', 'be21Edge', 'be48Edge', 'be53Edge', 'be54Edge',
  'be66Edge', 'be67Edge', 'be68Edge',
  'be69Edge', 'be70Edge', 'be71Edge', 'be72Edge', 'be73Edge',
  'be74Edge', 'be75Edge', 'be76Edge',
  'be77Edge', 'be78Edge', 'be79Edge', 'be80Edge', 'be81Edge', 'be82Edge',
  'be83Edge', 'be84Edge', 'be85Edge', 'be86Edge', 'be87Edge',
  'evaluateFastMagnetosonic', 'evaluateEinsteinRelation', 'evaluateClapeyron',
  'evaluateGravitationalRedshift', 'evaluateKelvinPeltier',
  'evaluateMagneticPressure', 'evaluateLondonPenetration', 'evaluatePlasmaBeta',
  'evaluateHagenPoiseuille', 'evaluateEulerBuckling', 'evaluatePullIn',
  'evaluateMottGurney', 'evaluateChildLangmuir', 'evaluateShockleyDiode',
  'evaluateThomsonCoefficient', 'evaluateFourPointSheet', 'evaluateShotNoise',
  'evaluateReynoldsAnalogy', 'evaluateCapacitorNoise',
  'APPLIED_PHYSICIST_EDGES',
  // v0.8.0 — membership criterion + negative catalog (G-2 / P-4)
  'adjudicateBridgeEntry', 'adjudicateCatalog',
  'REJECTED_BRIDGE_ADJUDICATIONS', 'REJECTED_BRIDGE_IDS',
  // v0.8.0 — GW170817 → BE-36 real-data confrontation (G-3)
  'confrontBE36', 'GW170817',
  // BE-52 → Mercury perihelion real-data confrontation (established bridge)
  'confrontBE52', 'MERCURY',
  // v0.8.0 punch-list — solar mass promoted to core constants
  'M_SUN_SI',
  // IAU 2015 solar GM, and the unit reader the CLI uses
  'GM_SUN_SI',
  'parseUnit',
  'convertValue',
  'UnitError',
  // v0.10.0 T3/T4 — Phase-D enumeration + uncertainty propagation
  'enumerateCompositions', 'REGISTERED_COMPOSITION_IDS',
  'propagateUncertainty', 'confrontBE36WithUncertainty',
  // identifiability classifier (structural over/exactly/under-determined)
  'classifyIdentifiability', 'classifyAll', 'forwardClosure',
  // retrodiction harness (the framework's own falsification benchmark)
  'retrodict', 'retrodictNode',
  // Buckingham-π enumerator (dimensional-analysis inference primitive)
  'buckinghamPi', 'dimensionallyDetermines', 'RationalizationError',
  // unified "explain this quantity" entry point
  'explainQuantity',
  // v0.11 — namespacing gate (Option D) + KG dispersion evaluator + m_e
  'CompositionAliasError', 'SOURCE_ALIAS_DISPOSITIONS',
  'evaluateKGDispersionResidual', 'verifyKleinGordonPlaneWave',
  'M_E_SI',
  // v0.11 — full catalog→graph migration + BE-23 data confrontation
  'CATALOG_FULL_EDGES',
  // the full 41-edge graph as a single constant (lean-sprint S1)
  'CATALOG_GRAPH',
  'confrontBE23', 'confrontBE23WithUncertainty',
  'PLANCKIAN_CUPRATES', 'PLANCKIAN_O1_BAND',
  // v0.12 — symbolic bridge composition (the Observable contract)
  'composeSymbolic', 'SymbolicCompositionError', 'SymbolicEvalError',
  // canonical-only graph — the standard-physics counterpart to CATALOG_GRAPH,
  // so the discovery funnel can run on textbook physics alone (no bridges)
  'CANONICAL_GRAPH', 'canonicalToEdges', 'CANONICAL_CONSTANTS',
  // physics-map visualization — bipartite/clustered render model + serializers
  'buildVizModel', 'edgeToJunction',
  // SVG rendering via the optional @viz-js/viz peer
  'renderDotToSvg', 'SvgRendererUnavailableError',
  // user-equation injection
  'parseUserEquation', 'resolveToCatalogName', 'suggestQuantities',
  'equationLanding', 'UserEquationError',
  // Phase 1 — parsePhysics + dimensional inference
  'parsePhysics', 'FormulaDimensionError', 'suggestByDimension',
  'inferUnknownDimension', 'substituteSymbolDim',
  // dimension-adjacency review surface
  'dimensionAdjacency',
  // v0.33.0 — `upt confront` real-data confrontation subsystem
  'residualInSigma', 'combineInQuadrature',
  'confrontBE37', 'CASSINI',
  'confrontBE48', 'LISA_PATHFINDER_CSL',
  'CONFRONTATIONS', 'listConfrontations', 'runConfrontation',
  'decidingMeasurement',
  // Adjudication ledger — human verdicts on discovery-funnel candidates
  'candidateId', 'ADJUDICATIONS', 'adjudicationFor', 'annotateAdjudications',
  // Discovery funnel — entry point + consequence-propagation annotator
  'rankDiscoveries', 'annotateConsequences', 'classifyProposal',
  // Atlas public namespace (Atlas API review, Tier 1) — ONE key; its members are
  // pinned in atlas-public-closure.test.ts, derived from src/atlas/public.ts.
  'atlas',
].sort();

describe('Public API stability — v0.4.0 surface', () => {
  it('runtime exports match the v0.4.0 snapshot', () => {
    const actual = Object.keys(root).sort();
    // Check every expected key is present
    for (const key of EXPECTED_RUNTIME_EXPORTS) {
      expect(actual, `Expected runtime export "${key}" to be present`).toContain(key);
    }
    // Snapshot the full set so accidental additions are also caught
    expect(actual).toMatchSnapshot();
  });

  it('isChristoffelSymmetric is NOT in the runtime surface', () => {
    expect('isChristoffelSymmetric' in root).toBe(false);
  });

  it('RepeatedDummyLabelError is NOT in the runtime surface (removed deprecated alias)', () => {
    expect('RepeatedDummyLabelError' in root).toBe(false);
  });

  it('Float64Tensor is NOT in the runtime surface (marked @internal, export removed)', () => {
    // Float64Tensor is not in src/index.ts and was never a documented
    // public export. Consumers use the TensorEngine interface and the
    // opaque EngineTensor handle. The concrete class is an impl detail.
    expect('Float64Tensor' in root).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type-only exports — asserted via src/index.ts source text (pre-build guard)
// and via dist/index.d.ts text (post-build guard).
// Type exports are erased by tsc and never appear in Object.keys(root).
// ---------------------------------------------------------------------------

// v0.4.0 type-only symbols
const V040_TYPE_EXPORTS = [
  'CovariantDerivativeNode',
  'ForwardGradResult',
  'ReverseGradResult',
];

// v0.5.0 type-only symbols
const V050_TYPE_EXPORTS = [
  'GL4State',
  'GL4Snapshot',
  'GL4Options',
  // Task 4 perihelion-finder types
  'PerihelionResult',
  'FindPerihelionOptions',
  // Task 7 curvature types
  'RicciTensorNode',
  // Task 8 curvature types
  'EinsteinTensorNode',
  // Task 9 curvature types
  'BianchiResidualNode',
];

// All type exports (v0.3.x + v0.4.0 + v0.5.0)
const ALL_TYPE_EXPORTS = [
  // Core types
  'TensorConfig', 'TensorIndices', 'PhysicalLaw', 'BridgeEquation',
  'EmergentPhenomenon', 'PhysicalScale', 'Force', 'Symmetry', 'InformationMeasure',
  // Bridge catalog types
  'BridgeEquationEntry', 'BridgeEquationStatus', 'BridgeIssueSeverity',
  'BridgeIssueFixable', 'KnownIssue',
  // Bridge input/result types
  'GravitationalLensingInputs', 'GravitationalLensingResult',
  'PerihelionPrecessionInputs', 'PerihelionPrecessionResult',
  // Geodesic types
  'GeodesicIntegratorInputs', 'GeodesicIntegratorResult',
  // Dimensional types
  'Dimension', 'ExprNode', 'TranscendentalFn', 'ValidationResult', 'Violation',
  // v0.3.5 numerical types
  'NumericalResult', 'NumericalRawResult', 'EvaluateOptions', 'NumericalInputs',
  'TensorEngine', 'EngineTensor', 'EinsumSpec', 'NestedArray', 'GridField',
  // v0.4.0 type additions
  'CovariantDerivativeNode',
  'ForwardGradResult',
  'ReverseGradResult',
  // v0.5.0 type additions (Task 3)
  'GL4State',
  'GL4Snapshot',
  'GL4Options',
  // v0.5.0 type additions (Task 4)
  'PerihelionResult',
  'FindPerihelionOptions',
  // v0.5.0 type additions (Task 7)
  'RicciTensorNode',
  // v0.5.0 type additions (Task 8)
  'EinsteinTensorNode',
  // v0.5.0 type additions (Task 9)
  'BianchiResidualNode',
  // v0.6.0 Killing-vector type additions (Task 1.3)
  'KillingEquationOptions',
  'KillingEquationCheck',
  'ChristoffelAccess',
  // v0.6.0 Einstein-equation type additions (Tasks 2.3, 2.4)
  'EinsteinEquationResidualInput',
  'MetricClosure',
  'Vec4',
  'EinsteinFieldEquationNode',
  'EinsteinFieldEquationValidationResult',
  // v0.6.0 Kretschmann type additions (Tasks 3.5, 3.6)
  'KretschmannScalarNode',
  'KretschmannScalarValidationResult',
  // v0.7 Proposal 3 — Typed Cell discriminated union (Phase 1+2)
  'Cell',
  'CellBase',
  'CellConfidence',
  'LawCell',
  'BridgeCell',
  'EmergenceCell',
  // v0.7 Proposal 2 — Flux rules + catalog adapter (Phase 4a Task 4a.1)
  'FluxDiagnostic',
  'FluxReport',
  'CatalogEntryStatus',
  'CatalogIngestionReport',
  // v0.7 Proposal 1 — Intelligent Index layer (Phase 4 Task 4)
  'AxisName',
  'UniversalIndex',
  'UniversalIndexId',
  'MakeIndexOptions',
  'AxesRegistry',
  // v0.8 Proposal 5 — RegimeType extension system
  'RegimeProvenance',
  'RegimeValueBase',
  'RegimeSpec',
  // v0.9 Proposal 8 — Bridge Parameter Differentiation
  'BridgeDiffSpec',
  'BridgeGradientResult',
  'BridgeNumericalGradientResult',
  'ASTGradientResult',
  // v0.7.1 M-1 Surface restoration — 5 v0.7 dimensional primitives
  // tensor-trace
  'TracableTensorNode',
  'TensorTraceNode',
  'TensorTraceValidationResult',
  'TensorTraceOptions',
  // friedmann-equation
  'FriedmannVariant',
  'FriedmannEquationNode',
  'FriedmannEquationValidationResult',
  // rg-flow
  'RGCouplingNode',
  'BetaFunctionNode',
  'BetaFunctionValidationResult',
  // gauge-field
  'ArrowOfTime',
  'GaugeFieldNode',
  'TimeSymmetryPredicateNode',
  'TimeSymmetryPredicateValidationResult',
  // klein-gordon-equation
  'ScalarFieldNode',
  'KleinGordonEquationNode',
  'KleinGordonEquationValidationResult',
  // v0.12 — symbolic bridge composition (the Observable contract)
  'Observable',
  'ComposeSymbolicOptions',
  // physics-map visualization
  'VizStatus',
  'VizJunction',
  'VizCluster',
  'VizOptions',
  'VizModel',
  // user-equation injection
  'UserEquation',
  'EquationLanding',
  'EquationAnalysis',
  'EquationHint',
  // Phase 1 — parsePhysics
  'ParsedPhysics',
  // dimension-adjacency
  'DimensionAdjacency',
  // v0.33.0 — `upt confront` real-data confrontation subsystem
  'ObservationProvenance', 'SigmaComponent', 'ObservationKind', 'ConfrontationOutcome',
  'CassiniObservation', 'BE37ConfrontationResult',
  'CollapseBoundObservation', 'BE48ConfrontationResult',
  'ConfrontationEntry', 'Elasticity',
];

describe('Public API stability — v0.4.0 type-only surface (src/index.ts source text)', () => {
  it('src/index.ts source re-exports every v0.4.0 type-only symbol', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const indexSrc = readFileSync(
      fileURLToPath(new URL('../../src/index.ts', import.meta.url)), 'utf8',
    );
    for (const typeName of ALL_TYPE_EXPORTS) {
      expect(indexSrc, `src/index.ts must re-export type "${typeName}"`).toContain(typeName);
    }
  });

  it('isChristoffelSymmetric is NOT mentioned in src/index.ts', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const indexSrc = readFileSync(
      fileURLToPath(new URL('../../src/index.ts', import.meta.url)), 'utf8',
    );
    expect(indexSrc).not.toContain('isChristoffelSymmetric');
  });
});

describe('Public API stability — v0.4.0 type-only surface (dist/index.d.ts post-build)', () => {
  it('dist/index.d.ts contains every v0.4.0 type-only symbol', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const dtsPath = fileURLToPath(new URL('../../dist/index.d.ts', import.meta.url));
    if (!existsSync(dtsPath)) {
      // dist not yet built — skip the post-build check (pre-build TDD phase)
      console.warn('dist/index.d.ts not found — skipping post-build type check. Run npm run build first.');
      return;
    }
    const dtsSrc = readFileSync(dtsPath, 'utf8');
    for (const typeName of V040_TYPE_EXPORTS) {
      expect(dtsSrc, `dist/index.d.ts must declare type "${typeName}"`).toContain(typeName);
    }
  });

  it('dist/index.d.ts does NOT declare isChristoffelSymmetric', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const dtsPath = fileURLToPath(new URL('../../dist/index.d.ts', import.meta.url));
    if (!existsSync(dtsPath)) {
      console.warn('dist/index.d.ts not found — skipping post-build check.');
      return;
    }
    const dtsSrc = readFileSync(dtsPath, 'utf8');
    expect(dtsSrc).not.toContain('isChristoffelSymmetric');
  });
});

/**
 * `VizStatus` is on the published surface, and the manifest above pins its
 * NAME. That is not enough: a union's MEMBERS are what callers switch on, and
 * adding or removing one changes the contract while the name-level check stays
 * green. Measured during S3.4: adding two members broke nothing here.
 *
 * This block is the member-level pin. It is an INDEPENDENT anchor — a literal
 * list, not a re-read of `ALL_VIZ_STATUSES` — because a check that reads the
 * same array the code emits from cannot report a member being dropped from
 * both places at once.
 */
describe('Public API stability — VizStatus MEMBERS', () => {
  const EXPECTED_VIZ_STATUSES = [
    'law',
    'established',
    'speculative',
    'highly-speculative',
    'proposed',
    'user',
    // v0.46 / Atlas Phase 3 (S3.4) — `upt map --source=poster`. Widening this
    // union is a deliberate public-API change; update this list WITH the change.
    'poster',
    'association',
  ];

  it('ALL_VIZ_STATUSES matches the pinned member list exactly, in order', async () => {
    const { ALL_VIZ_STATUSES } = await import('../../src/composition/graph-viz.js');
    expect([...ALL_VIZ_STATUSES]).toEqual(EXPECTED_VIZ_STATUSES);
  });

  it('every pinned member is a key of STATUS_STYLE, proven through rendering', async () => {
    const { buildVizModel } = await import('../../src/composition/graph-viz.js');
    const mermaid = buildVizModel([], {
      extraJunctions: EXPECTED_VIZ_STATUSES.map((status, i) => ({
        id: `j-${status}`,
        label: status,
        status: status as never,
        sources: [`in-${i}`],
        target: `out-${i}`,
      })),
    }).toMermaid();
    for (const status of EXPECTED_VIZ_STATUSES) {
      expect(mermaid, `no classDef emitted for '${status}'`).toContain(`classDef ${status} `);
    }
  });
});
