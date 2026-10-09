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
import '../helpers/dist.js';
import { describe, it, expect } from 'vitest';
import * as root from '../../src/index.js';

// ---------------------------------------------------------------------------
// Runtime value exports (functions, classes, constants)
// ---------------------------------------------------------------------------
const PRESENT = [
  'UniversalTensor',
  'BRIDGE_EQUATIONS',
  'evaluateRelation',
  'CoefficientUnsetError',
  'evaluateCovariantEikonalNumerical',
  'requestCallerTableConfrontation',
  'CATALOG_GRAPH',
  'SHAPIRO_DELAY_DIFF',
  'PERIHELION_ADVANCE_DIFF',
  'HAWKING_TEMPERATURE_DIFF',
  'DECOHERENCE_RATE_DIFF',
  'DIFFERENTIABLE_RELATIONS',
] as const;

const ABSENT = [
  'evaluateBohmSheath',
  'evaluateBE37CovariantEikonalNumerical',
  'CATALOG_FULL_EDGES',
  'APPLIED_PHYSICIST_EDGES',
  'BE37_SHAPIRO_DIFF',
  'BE52_PERIHELION_DIFF',
  'BE42_HAWKING_DIFF',
  'BE11_DECOHERENCE_DIFF',
  'DIFFERENTIABLE_BRIDGE_SPECS',
  'be42Edge',
  'confrontBE52',
  'lawSchwarzschildRadius',
] as const;

const REMOVED_IN_6 = [
  'BRIDGE_EVALUATORS',
  'evaluateBridge',
  'BridgeEquations',
  'evaluateGravitationalLensing',
  'evaluatePerihelionPrecession',
  'evaluateQuantumHall',
  'evaluateCasimir',
  'evaluateUnruh',
  'evaluateJohnsonNyquist',
  'evaluateACJosephson',
  'evaluateFractionalQH',
  'evaluateWiedemannFranz',
  'evaluateBCSGap',
  'evaluateChandrasekharMass',
  'evaluateEddingtonLuminosity',
  'evaluateJeansMass',
  'evaluateRadiationPressure',
  'evaluateAlfvenSpeed',
  'evaluateTolmanEhrenfest',
  'evaluateFastMagnetosonic',
  'evaluateEinsteinRelation',
  'evaluateClapeyron',
  'evaluateGravitationalRedshift',
  'evaluateKelvinPeltier',
  'evaluateMagneticPressure',
  'evaluateLondonPenetration',
  'evaluatePlasmaBeta',
  'evaluateHagenPoiseuille',
  'evaluateEulerBuckling',
  'evaluatePullIn',
  'evaluateMottGurney',
  'evaluateChildLangmuir',
  'evaluateShockleyDiode',
  'evaluateThomsonCoefficient',
  'evaluateFourPointSheet',
  'evaluateShotNoise',
  'evaluateReynoldsAnalogy',
  'evaluateCapacitorNoise',
  'evaluateFermiSea',
  'evaluateDebyeCutoff',
  'evaluateDebyeHeat',
  'evaluateEinsteinSolid',
  'evaluateSommerfeldHeat',
  'evaluateCurieWeiss',
  'evaluatePauliParamagnetism',
  'evaluateGinzburgLandau',
  'evaluateUpperCritical',
  'evaluateAmbegaokarBaratoff',
  'evaluateBcsJump',
  'evaluateMassAction',
  'evaluateLyddaneSachsTeller',
  'evaluateBktJump',
  'evaluateLandauerConductance',
];

describe('Public API stability — 6.0.0 surface', () => {
  it('removes the per-bridge evaluators and exports evaluateRelation', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const indexSrc = readFileSync(fileURLToPath(new URL('../../src/index.ts', import.meta.url)), 'utf8');
    for (const name of REMOVED_IN_6) {
      expect(name in root, name).toBe(false);
      expect(indexSrc, name).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect('evaluateRelation' in root).toBe(true);
    expect('CoefficientUnsetError' in root).toBe(true);
    expect(indexSrc).toContain('export type { Evaluation }');
    expect('VON_KLITZING_SI' in root).toBe(true);
    expect('CarrierSignError' in root).toBe(true);
    for (const name of ABSENT) expect(name in root, name).toBe(false);
    for (const name of REMOVED_IN_6.filter((n) => n.startsWith('evaluate') && n !== 'evaluateBridge')) {
      const inputs = `${name.replace(/^evaluate/, '')}Inputs`;
      // A later name can contain these letters. GorterCasimirInputs contains
      // CasimirInputs. The removed identifier is a whole word.
      expect(indexSrc, `${name}Inputs`).not.toMatch(new RegExp(`\\b${inputs}\\b`));
    }
  });
});

describe('Public API stability — v0.4.0 surface', () => {
  it('runtime exports match the v0.4.0 snapshot', () => {
    const actual = Object.keys(root).sort();
    for (const key of PRESENT) {
      expect(actual, `Expected runtime export "${key}" to be present`).toContain(key);
    }
    for (const key of ABSENT) {
      expect(actual, `Runtime export "${key}" was removed`).not.toContain(key);
    }
    for (const key of actual) {
      expect(key, key).not.toMatch(/^be\d+Edge$/);
      expect(key, key).not.toMatch(/^confrontBE\d/);
      expect(key, key).not.toMatch(/^evaluateBE\d/);
    }
    // Snapshot the full set so accidental additions are also caught.
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
  // 6.0.0 evaluation
  'Evaluation',
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
    for (const typeName of ['CassiniObservation', 'BE37ConfrontationResult', 'CollapseBoundObservation', 'BE48ConfrontationResult']) {
      expect(indexSrc, typeName).not.toContain(typeName);
    }
  });
});

describe('Public API stability — v0.4.0 type-only surface (dist/index.d.ts post-build)', () => {
  // `tests/helpers/dist.js` (the first import of this file) throws on an absent or stale build;
  // this test once warned and returned when dist/index.d.ts was missing, which vitest reported
  // as a pass.
  it('dist/index.d.ts contains every v0.4.0 type-only symbol', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const dtsPath = fileURLToPath(new URL('../../dist/index.d.ts', import.meta.url));
    const dtsSrc = readFileSync(dtsPath, 'utf8');
    for (const typeName of V040_TYPE_EXPORTS) {
      expect(dtsSrc, `dist/index.d.ts must declare type "${typeName}"`).toContain(typeName);
    }
  });

  it('dist/index.d.ts does NOT declare isChristoffelSymmetric', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const dtsPath = fileURLToPath(new URL('../../dist/index.d.ts', import.meta.url));
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
