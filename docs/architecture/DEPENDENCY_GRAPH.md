<!-- repo-map:no-verification -->
<!-- GENERATED FILE -- do not edit by hand.
     Regenerate with `repo-tools map`. -->

# universal-physics-tensor - Dependency Graph

**Version**: 15.0.0

This document provides a comprehensive dependency graph of all files, components, imports, functions, and variables in the codebase.

---

## Table of Contents

1. [Overview](#overview)
2. [Package Dependencies](#package-dependencies)
3. [Bin Dependencies](#bin-dependencies)
4. [Atlas Dependencies](#atlas-dependencies)
5. [Bridges Dependencies](#bridges-dependencies)
6. [Canonical Dependencies](#canonical-dependencies)
7. [Cases Dependencies](#cases-dependencies)
8. [Cli Dependencies](#cli-dependencies)
9. [Root Dependencies](#root-dependencies)
10. [Composition Dependencies](#composition-dependencies)
11. [Core Dependencies](#core-dependencies)
12. [Diff Dependencies](#diff-dependencies)
13. [Dimensional Dependencies](#dimensional-dependencies)
14. [Entry Dependencies](#entry-dependencies)
15. [Numerical Dependencies](#numerical-dependencies)
16. [Relations Dependencies](#relations-dependencies)
17. [Dependency Matrix](#dependency-matrix)
18. [Circular Dependency Analysis](#circular-dependency-analysis)
19. [Visual Dependency Graph](#visual-dependency-graph)
20. [Summary Statistics](#summary-statistics)

---

<a id="overview"></a>
## Overview

The codebase is organized into the following modules:

- **bin**: 1 file
- **atlas**: 77 files
- **bridges**: 25 files
- **canonical**: 20 files
- **cases**: 7 files
- **cli**: 59 files
- **root**: 1 file
- **composition**: 83 files
- **core**: 18 files
- **diff**: 3 files
- **dimensional**: 45 files
- **entry**: 1 file
- **numerical**: 44 files
- **relations**: 8 files

---

<a id="bin-dependencies"></a>

## Bin Dependencies

### `bin/upt.mjs` - upt — thin launcher. All logic lives in src/cli/ (compiled to dist/cli/).

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `url` | `fileURLToPath, pathToFileURL` |
| `path` | `dirname, join` |

---

<a id="atlas-dependencies"></a>

## Atlas Dependencies

### `src/atlas/applicability.ts` - Atlas Phase 4, S4.1 — the applicability checker.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `./model.js` | `AtlasModel` | Import (type-only) |
| `./types.js` | `Conventions` | Import (type-only) |
| `./conventions.js` | `checkConventions, unknownConventionKeys` | Import |
| `../dimensional/ast-leaves.js` | `ALL_SCALAR_ARMS, forEachScalarLeaf, isDecimalLiteral, literalValue, scalarChildren` | Import |

**Exports:**
- Interfaces: `ApplicabilityFinding`, `ApplicabilityInput`
- Types: `ApplicabilitySeverity`, `ApplicabilityFindingKind`
- Functions: `checkApplicability`, `blockingFindings`

---

### `src/atlas/association.ts` - Atlas Phase 1 — the association registry.

**Exports:**
- Interfaces: `Association`
- Types: `AssociationKind`
- Functions: `associationFor`
- Constants: `ASSOCIATIONS`

---

### `src/atlas/benchmark/backend-shapes.ts` - Atlas Phase 5, S5.3 — request and response SHAPES for the out-of-process

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../types.js` | `RelationType` | Import (type-only) |

**Exports:**
- Interfaces: `BenchmarkBackendRequest`, `BenchmarkBackendResponse`, `BackendShapeError`
- Functions: `parseBackendResponse`

---

### `src/atlas/benchmark/baselines.ts` - Atlas Phase 5, S5.3 — the deterministic, in-tree BASELINE conditions and the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `./leakage.js` | `leakageKey` | Import |

**Exports:**
- Interfaces: `CorpusRecord`, `RetrievalQuery`
- Types: `Ranking`
- Functions: `rankByTextOverlap`, `rankBySymbolOverlap`, `rankByStructure`, `recallAtK`

---

### `src/atlas/benchmark/hybrid-retrieval.ts` - Optional embedding retrieval. An embedder proposes an order. `rankByStructure`

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `pairwiseDot` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/compare.js` | `compareCodepoint` | Import |
| `../../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../../canonical/residual.js` | `canonicalResidual, monomialResidual` | Import |
| `./baselines.js` | `rankByStructure, CorpusRecord, RetrievalQuery` | Import |

**Exports:**
- Classes: `EmbeddingUnavailable`
- Interfaces: `OllamaEmbedderOptions`, `HybridRetrieval`
- Types: `EmbeddingFallbackReason`, `Embedder`
- Functions: `queryInput`, `stubVector`, `cosine`, `rankByCosine`, `decodeFloat32`, `canonicalRetrievalCorpus`, `ollamaEmbedder`, `retrieveHybrid`
- Constants: `EMBEDDING_INSTRUCTION`, `OLLAMA_EMBEDDING_MODEL`, `FROZEN_VECTOR_DIMS`, `FROZEN_VECTOR_SHA256`, `OLLAMA_TIMEOUT_MS`, `ATLAS_ONLY_NOTE`, `PROPOSAL_NOTE`, `stubEmbedder`

---

### `src/atlas/benchmark/leakage.ts` - Atlas Phase 5, S5.1 — leakage checks for the invalid-bridge benchmark.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../canonical/normal-form.js` | `normalForm` | Import |
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `BenchmarkItem` | Import (type-only) |

**Exports:**
- Interfaces: `LeakageCollision`, `VariantProblem`
- Functions: `leakageKey`, `findCrossSplitLeakage`, `checkRenamedVariants`

---

### `src/atlas/benchmark/loader.ts` - Atlas Phase 5, S5.1 — load and validate benchmark items.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `path` | `join` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/data-file.js` | `readJsonFile` | Import |
| `./types.js` | `HELD_OUT_FAMILY` | Import |
| `./types.js` | `BenchmarkItem` | Import (type-only) |

**Exports:**
- Classes: `BenchmarkAdmissionError`
- Interfaces: `ItemProblem`
- Functions: `validateItems`, `loadFrozenItems`, `loadContestedDrafts`

---

### `src/atlas/benchmark/onnx-embedder.ts` - The in-process ONNX embedder. It runs the default Qwen3 embedding model

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `crypto` | `createHash, randomBytes` |
| `fs` | `createReadStream, existsSync, readdirSync, statSync` |
| `fs/promises` | `mkdir, readFile, rename, rm, stat, writeFile` |
| `path` | `join` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/compare.js` | `compareCodepoint` | Import |
| `../../core/hash.js` | `sha256Hex` | Import |
| `./hybrid-retrieval.js` | `EmbeddingUnavailable, Embedder` | Import |

**Exports:**
- Interfaces: `TransformersLibrary`, `OnnxEmbedderOptions`, `OnnxModelFile`, `OnnxModelReport`
- Types: `OnnxDtype`
- Functions: `onnxEmbedder`, `fetchOnnxModel`
- Constants:

  ```text
  ONNX_EMBEDDING_MODEL, ONNX_DTYPES, ONNX_DEFAULT_DTYPE, ONNX_VECTOR_DIMS, ONNX_BATCH_SIZE,
  ONNX_CACHE_ENV, VECTOR_CACHE_ENV, VECTOR_CACHE_SUBDIR, ONNX_LOAD_TIMEOUT_MS,
  ONNX_PER_TEXT_TIMEOUT_MS
  ```


---

### `src/atlas/benchmark/run-atlas.ts` - Atlas Phase 5, S5.2 — the ATLAS condition of the invalid-bridge benchmark.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../applicability.js` | `checkApplicability` | Import |
| `../applicability.js` | `ApplicabilityFindingKind` | Import (type-only) |
| `../composition-table.js` | `composeRelation, NO_COMPOSITE_CLAIM` | Import |
| `../regime.js` | `regimeHolds` | Import |
| `../types.js` | `RelationType` | Import (type-only) |
| `./types.js` | `BenchmarkItem, FailureKind` | Import (type-only) |

**Exports:**
- Interfaces: `AtlasVerdict`, `AtlasRunConfig`
- Functions: `runAtlasOnItem`, `runAtlasCondition`
- Constants: `FULL_CONFIG`, `ABLATION_CONFIGS`

---

### `src/atlas/benchmark/stats.ts` - Atlas Phase 5, S5.4 — the benchmark's statistics and power report.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `binomialTest, cohensKappa, newcombePairedInterval, wilsonInterval` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/mathts-read.js` | `numberFrom` | Import |

**Exports:**
- Interfaces: `Interval`, `PairedTable`, `McNemarResult`, `PowerReport`
- Functions: `wilsonInterval`, `mcnemar`, `pairedDifferenceInterval`, `cohensKappa`, `powerReport`

---

### `src/atlas/benchmark/study.ts` - Atlas Phase 6, S6.1 — scoring a benchmark condition against the answer key.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `FAILURE_KINDS` | Import |
| `./types.js` | `FailureKind` | Import (type-only) |
| `./stats.js` | `mcnemar, pairedDifferenceInterval, wilsonInterval` | Import |
| `./stats.js` | `Interval, McNemarResult` | Import (type-only) |

**Exports:**
- Interfaces: `ConditionAnswer`, `ItemLabel`, `LabelProblem`, `ConditionMetrics`, `PairedRejection`, `AblationRow`
- Functions: `validateLabels`, `scoreCondition`, `pairedRejection`, `scoreAblation`

---

### `src/atlas/benchmark/types.ts` - Atlas Phase 5, S5.1 — the invalid-bridge benchmark's item schema.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../types.js` | `Conventions, RegimeInequality, RelationType` | Import (type-only) |

**Exports:**
- Interfaces: `BenchmarkItem`
- Types: `FailureKind`, `Authorship`, `BenchmarkSplit`
- Constants: `FAILURE_KINDS`, `HELD_OUT_FAMILY`, `HELD_OUT_MARKERS`

---

### `src/atlas/bridge-record.ts` - One catalog bridge, joined to the canonical foreign key and the generated

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/evaluators.js` | `BRIDGE_EVALUATORS` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../composition/descriptor.js` | `getBridge` | Import |
| `./catalog-formal-ref.js` | `catalogFormalRef` | Import |

**Exports:**
- Functions: `catalogBridgeRecord`

---

### `src/atlas/catalog-formal-ref.ts` - Catalog formal references.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/types.js` | `FormalRef` | Import (type-only) |
| `../bridges/catalog-types.js` | `CatalogEntry, ProofStatus` | Import (type-only) |
| `../bridges/catalog-load.js` | `catalogEntries, catalogEntry` | Import |
| `./physjs-ref.js` | `physjsFormalRef` | Import |

**Exports:**
- Functions: `catalogFormalRef`, `deriveProofStatus`, `catalogProofProblems`

---

### `src/atlas/chain-pipeline.ts` - Internal bridge-discovery pipeline.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `byKey` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, isRegisteredConstant` | Import |
| `../dimensional/ast-leaves.js` | `isDecimalLiteral` | Import |
| `../composition/edge.js` | `BridgeEdge` | Import (type-only) |
| `../composition/enumerate.js` | `enumerateCompositionsWithRefusals` | Import |
| `../composition/buckingham-filter.js` | `buckinghamFilter` | Import |
| `../composition/chain-match.js` | `matchChain` | Import |
| `../composition/chain-candidate.js` | `compareChainEdgeIds, ChainCandidate` | Import |
| `../composition/chain-result.js` | `chainOrderKey, orderChainRecords, ChainRecord` | Import |
| `../composition/chain-regime.js` | `joinRegimeMismatch, ChainRegimeMismatch` | Import |
| `./physjs-ref.js` | `bridgeSeedKeys, physjsTheorem` | Import |
| `./proof-target.js` | `emitProofTarget` | Import |
| `../composition/mathts-scalar-symbols.js` | `scalarSymbolsFromMathTs` | Import |

**Exports:**
- Interfaces: `ChainConfirmationRecord`, `ChainRestatementRecord`, `ChainStubRecord`, `ChainCompositionRefusal`
- Types: `ChainPipelineResult`
- Functions: `governingOf`, `renderChainRecord`, `runChainPipeline`

---

### `src/atlas/composition-table.ts` - Re-export of the composition table. The table lives in

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/composition-table.js` | `COMPOSITION_TABLE, composeRelation, NO_COMPOSITE_CLAIM, NoCompositeClaim, CompositionResult` | Re-export |

**Exports:**
- Types: `NoCompositeClaim`, `CompositionResult`
- Re-exports: `COMPOSITION_TABLE`, `composeRelation`, `NO_COMPOSITE_CLAIM`

---

### `src/atlas/conventions.ts` - Re-export of the convention comparison. The implementation lives in

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/conventions.js` | `checkConventions, unknownConventionKeys` | Re-export |
| `../relations/conventions.js` | `ConventionKey` | Re-export (type-only) |

**Exports:**
- Re-exports: `checkConventions`, `unknownConventionKeys`, `ConventionKey`

---

### `src/atlas/coverage.ts` - Atlas Phase 1, S1.3 — evidence coverage, counted BY TAG.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `ALL_EVIDENCE_TAGS` | Import |
| `./types.js` | `EvidenceTag` | Import (type-only) |
| `./types.js` | `ALL_EVIDENCE_TAGS` | Re-export |

**Exports:**
- Interfaces: `EvidenceCoverage`, `OverlayCoverage`, `OverlayBearing`, `ReviewStatusBearing`
- Functions: `summarizeEvidence`, `overlayCoverage`
- Re-exports: `ALL_EVIDENCE_TAGS`

---

### `src/atlas/derivation.ts` - Atlas Phase 3 — `Derivation` (a hyperedge) and multicategory composition.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./composition-table.js` | `composeRelation, NO_COMPOSITE_CLAIM` | Import |
| `./composition-table.js` | `CompositionResult` | Import (type-only) |
| `./statement.js` | `statementContextUnion` | Import |
| `./statement.js` | `ContextUnionResult, Statement, StatementId` | Import (type-only) |
| `./types.js` | `RelationType` | Import (type-only) |

**Exports:**
- Classes: `DerivationCompositionError`
- Interfaces: `Derivation`, `CompositeFormed`, `CompositeRefused`
- Types: `DerivationId`, `DerivationSpec`, `NoCompositeReason`, `DerivationCompositionResult`
- Functions: `makeDerivation`, `composeDerivations`, `composeDerivationsOrThrow`

---

### `src/atlas/derive-evidence.ts` - Atlas Phase 1, S1.3 — evidence tags, DERIVED AT READ TIME.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Conventions, EvidenceTag, FormalFidelity, FormalRefKind` | Import (type-only) |
| `./catalog-formal-ref.js` | `catalogFormalRef` | Import |

**Exports:**
- Interfaces: `WitnessLike`, `CounterexampleLike`, `RejectionLike`, `EvidenceInput`
- Types: `MembershipVerdict`
- Functions: `counterexamplesWithRejection`, `deriveEvidence`, `provedWithUnresolvedCounterexample`, `catalogEvidenceInput`, `deriveEvidenceForVerdict`, `deriveCompositeEvidence`
- Constants: `NO_PASSING_WITNESSES`

---

### `src/atlas/diffusion/bridges-closure.ts` - Atlas Phase 4 — the five diffusion-family bridges added to close Sprint 4's

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `ENERGY, LENGTH, MASS, TIME, Dimension` | Import |
| `../oscillators/bridges-limits.js` | `makeApproximation` | Import |
| `../oscillators/dimensions.js` | `DAMPING` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../physjs-ref.js` | `physjsFormalRef` | Import |
| `../types.js` | `AtlasBridge` | Import (type-only) |
| `../waves/models.js` | `WAVENUMBER` | Import |
| `./dimensions.js` | `DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY` | Import |
| `./models.js` | `DIFFUSION_FAMILY_NAME` | Import |
| `./numerics.js` | `telegraphSlowRateExcess, telegraphWaveFrequencyRatio` | Import |

**Exports:**
- Constants: `TELEGRAPH_FICK_MAX_EPS`, `TELEGRAPH_WAVE_MIN_EPS`, `BRIDGE_LANGEVIN_DIFFUSION`, `BRIDGE_STOKES_EINSTEIN`, `BRIDGE_TELEGRAPH_DIFFUSION`, `BRIDGE_TELEGRAPH_WAVE`, `BRIDGE_HEAT_LAPLACE`, `DIFFUSION_CLOSURE_BRIDGES`

---

### `src/atlas/diffusion/bridges.ts` - Atlas Phase 4, S4.4 — the three bridges of the diffusion family.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `LENGTH, MASS, ACTION, TIME` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../types.js` | `AtlasBridge` | Import (type-only) |
| `./dimensions.js` | `DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY` | Import |
| `./models.js` | `DIFFUSION_FAMILY_NAME` | Import |

**Exports:**
- Constants: `WALK_MAX_STEP_FRACTION`, `BRIDGE_WALK_DIFFUSION`, `BRIDGE_HEAT_DIFFUSION`, `BRIDGE_SCHRODINGER_DIFFUSION`, `DIFFUSION_BRIDGES`

---

### `src/atlas/diffusion/dimensions.ts` - Dimension constants the diffusion family needs: the named shapes of

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../../dimensional/types.js` | `MASS_DENSITY` | Import |
| `../../dimensional/types.js` | `DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY` | Re-export |

**Exports:**
- Constants: `DENSITY`
- Re-exports: `DIFFUSIVITY`, `SPECIFIC_HEAT`, `THERMAL_CONDUCTIVITY`

---

### `src/atlas/diffusion/index.ts` - Diffusion-family assembly (Atlas Phase 4, S4.4).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../family.js` | `AtlasFamily` | Import (type-only) |
| `./bridges.js` | `DIFFUSION_BRIDGES` | Import |
| `./bridges-closure.js` | `DIFFUSION_CLOSURE_BRIDGES` | Import |
| `./models.js` | `DIFFUSION_FAMILY_NAME, DIFFUSION_MODELS` | Import |

**Exports:**
- Constants: `DIFFUSION_FAMILY`

---

### `src/atlas/diffusion/models.ts` - Atlas Phase 4, S4.4 — the four models of the diffusion family.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `../../dimensional/types.js` | `ACTION, ENERGY, LENGTH, MASS, TIME, VISCOSITY` | Import |
| `../oscillators/dimensions.js` | `DAMPING` | Import |
| `../model.js` | `AtlasModel` | Import (type-only) |
| `../regime.js` | `makeRegime` | Import |
| `./dimensions.js` | `DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY` | Import |

**Exports:**
- Functions: `getDiffusionModel`
- Constants: `DIFFUSION_FAMILY_NAME`, `DIFFUSION_MODELS`

---

### `src/atlas/diffusion/numerics.ts` - Atlas Phase 4, S4.4 — the numerics behind the diffusion family's witnesses.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `trapz` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../numerical/null-ray-integrator.js` | `integrateRK4` | Import |
| `../../numerical/statistics.js` | `logChoose` | Import |

**Exports:**
- Interfaces: `HeatFixture`, `WickFixture`, `LangevinFixture`, `SteadyStateFixture`
- Functions:

  ```text
  diffusionKernel, randomWalkCentralDensity, randomWalkDensity, gaussianSpread, heatFtcsCentre,
  wickHeatResidual, wickKernelSquaredNorm, langevinMsdRatio, telegraphSlowRateRatio,
  telegraphSlowRateExcess, telegraphWaveFrequencyRatio, heatSteadyDeviation
  ```


---

### `src/atlas/error-algebra.ts` - The Phase 0 error algebra: composition of Lipschitz-plus-offset bounds.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `MissingLipschitzError` | Import |

**Exports:**
- Interfaces: `BoundPair`, `ComposedPath`
- Functions: `composeBounds`, `composeBoundPath`
- Constants: `IDENTITY_BOUND`

---

### `src/atlas/export.ts` - Atlas Phase 6, S6.4 — the versioned export: one combined JSON artifact for

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./family.js` | `AtlasFamily` | Import (type-only) |
| `./serialize.js` | `AtlasRecordJson` | Import (type-only) |
| `./serialize.js` | `toAtlasJson` | Import |
| `./witness-artifact.js` | `WitnessResultsArtifact` | Import (type-only) |

**Exports:**
- Interfaces: `QudtResolution`, `CombinedAtlasJson`
- Types: `CombinedFamilyRecord`
- Functions: `toCombinedAtlasJson`, `toAtlasJsonLd`
- Constants: `ATLAS_ID_PREFIX`

---

### `src/atlas/families.ts` - Every registered atlas family, in the order they were built.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./diffusion/index.js` | `DIFFUSION_FAMILY` | Import |
| `./oscillators/index.js` | `OSCILLATOR_FAMILY` | Import |
| `./waves/index.js` | `WAVES_FAMILY` | Import |
| `./family.js` | `AtlasFamily` | Import (type-only) |
| `./regime.js` | `admitApproximation` | Import |

**Exports:**
- Functions: `admitFamilies`
- Constants: `ATLAS_FAMILIES`

---

### `src/atlas/family.ts` - The shape of one atlas family. A leaf module: every family index, the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./model.js` | `AtlasModel` | Import (type-only) |
| `./types.js` | `AtlasBridge, AtlasRejection` | Import (type-only) |

**Exports:**
- Interfaces: `AtlasFamily`

---

### `src/atlas/formal-ref-carriers.ts` - The one list of records that can carry a formal reference.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../relations/types.js` | `FormalRef` | Import (type-only) |
| `./catalog-formal-ref.js` | `catalogFormalRef` | Import |
| `./families.js` | `ATLAS_FAMILIES` | Import |
| `./physjs-ref.js` | `physjsFormalRef, physjsTheorem` | Import |

**Exports:**
- Functions: `formalRefCarriers`

---

### `src/atlas/index.ts` - Atlas Phase 0 barrel — the oscillator pilot.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `RelationType, EvidenceTag, LimitCharacter, RegimeInequality, Regime, ApproximationBound, Witness, Counterexample, AtlasBridge, AtlasRejection, FormalFidelity, FormalRef, FormalRefKind, NormTransport` | Re-export (type-only) |
| `./types.js` | `MissingDeltaAtError, MissingHorizonError, MissingLipschitzError` | Re-export |
| `./types.js` | `ALL_EVIDENCE_TAGS` | Re-export |
| `./derive-evidence.js` | `deriveCompositeEvidence, deriveEvidence, deriveEvidenceForVerdict, NO_PASSING_WITNESSES, provedWithUnresolvedCounterexample` | Re-export |
| `./derive-evidence.js` | `CounterexampleLike, EvidenceInput, MembershipVerdict, RejectionLike, WitnessLike` | Re-export (type-only) |
| `./composition-table.js` | `composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM` | Re-export |
| `./composition-table.js` | `CompositionResult, NoCompositeClaim` | Re-export (type-only) |
| `./path-bound.js` | `boundPath, findAtlasPath, findPath, horizonOnRoute, routeEntryModels` | Re-export |
| `./path-bound.js` | `AppliedTransport, NoClaimReason, PathBoundClaim, PathBoundResult, PathNoClaim` | Re-export (type-only) |
| `./model.js` | `AtlasModel, ModelId` | Re-export (type-only) |
| `./error-algebra.js` | `composeBounds, composeBoundPath, IDENTITY_BOUND` | Re-export |
| `./error-algebra.js` | `BoundPair, ComposedPath` | Re-export (type-only) |
| `./regime.js` | `deriveRegimeGroups, regimeHolds` | Re-export |
| `./regime.js` | `RegimeCheck` | Re-export (type-only) |
| `./oscillators/dimensions.js` | `CAPACITANCE, CUBIC_STIFFNESS, DAMPING, INDUCTANCE, RESISTANCE, SPRING_CONSTANT` | Re-export |
| `./oscillators/models.js` | `ATLAS_MODELS, getAtlasModel` | Re-export |
| `./oscillators/index.js` | `OSCILLATOR_FAMILY` | Re-export |
| `./family.js` | `AtlasFamily` | Re-export (type-only) |
| `./serialize.js` | `toAtlasJson, ATLAS_RECORD_SCHEMA_VERSION` | Re-export |
| `./serialize.js` | `AtlasRecordJson, JsonValue` | Re-export (type-only) |
| `./applicability.js` | `blockingFindings, checkApplicability` | Re-export |
| `./applicability.js` | `ApplicabilityFinding, ApplicabilityFindingKind, ApplicabilityInput, ApplicabilitySeverity` | Re-export (type-only) |
| `./witness-result.js` | `passingWitnessIds` | Re-export |
| `./witness-result.js` | `UnresolvedReason, WitnessRunResult, WitnessStatus` | Re-export (type-only) |
| `./families.js` | `ATLAS_FAMILIES` | Re-export |
| `./link-prediction.js` | `runLinkPrediction` | Re-export |
| `./export.js` | `ATLAS_ID_PREFIX, toAtlasJsonLd, toCombinedAtlasJson` | Re-export |
| `./export.js` | `QudtResolution` | Re-export (type-only) |
| `./link-prediction.js` | `LinkPredictionResult, LinkPredictionTrial` | Re-export (type-only) |
| `./diffusion/index.js` | `DIFFUSION_FAMILY` | Re-export |
| `./diffusion/bridges.js` | `BRIDGE_HEAT_DIFFUSION, BRIDGE_SCHRODINGER_DIFFUSION, BRIDGE_WALK_DIFFUSION, DIFFUSION_BRIDGES` | Re-export |
| `./diffusion/models.js` | `DIFFUSION_MODELS, getDiffusionModel` | Re-export |
| `./waves/index.js` | `WAVES_FAMILY` | Re-export |
| `./waves/bridges.js` | `BRIDGE_KLEIN_GORDON_WAVE, BRIDGE_SOUND_SPEED, BRIDGE_STRING_WAVE, BRIDGE_WAVE_DALEMBERT, WAVE_BRIDGES` | Re-export |
| `./waves/models.js` | `WAVE_MODELS` | Re-export |
| `./diffusion/bridges-closure.js` | `DIFFUSION_CLOSURE_BRIDGES` | Re-export |
| `./waves/bridges-closure.js` | `WAVE_CLOSURE_BRIDGES` | Re-export |
| `./benchmark/types.js` | `FAILURE_KINDS, HELD_OUT_FAMILY, HELD_OUT_MARKERS` | Re-export |
| `./benchmark/types.js` | `Authorship, BenchmarkItem, BenchmarkSplit, FailureKind` | Re-export (type-only) |
| `./benchmark/leakage.js` | `checkRenamedVariants, findCrossSplitLeakage, leakageKey` | Re-export |
| `./benchmark/leakage.js` | `LeakageCollision, VariantProblem` | Re-export (type-only) |
| `./benchmark/run-atlas.js` | `ABLATION_CONFIGS, FULL_CONFIG, runAtlasCondition, runAtlasOnItem` | Re-export |
| `./benchmark/run-atlas.js` | `AtlasRunConfig, AtlasVerdict` | Re-export (type-only) |
| `./benchmark/baselines.js` | `rankBySymbolOverlap, rankByStructure, rankByTextOverlap, recallAtK` | Re-export |
| `./benchmark/baselines.js` | `CorpusRecord, Ranking, RetrievalQuery` | Re-export (type-only) |
| `./benchmark/hybrid-retrieval.js` | `ATLAS_ONLY_NOTE, EMBEDDING_INSTRUCTION, FROZEN_VECTOR_DIMS, FROZEN_VECTOR_SHA256, OLLAMA_EMBEDDING_MODEL, OLLAMA_TIMEOUT_MS, PROPOSAL_NOTE, EmbeddingUnavailable, canonicalRetrievalCorpus, cosine, decodeFloat32, ollamaEmbedder, queryInput, rankByCosine, retrieveHybrid, stubEmbedder, stubVector` | Re-export |
| `./benchmark/hybrid-retrieval.js` | `Embedder, EmbeddingFallbackReason, HybridRetrieval, OllamaEmbedderOptions` | Re-export (type-only) |
| `./benchmark/backend-shapes.js` | `parseBackendResponse` | Re-export |
| `./benchmark/stats.js` | `cohensKappa, mcnemar, pairedDifferenceInterval, powerReport, wilsonInterval` | Re-export |
| `./benchmark/stats.js` | `Interval, McNemarResult, PairedTable, PowerReport` | Re-export (type-only) |
| `./benchmark/study.js` | `pairedRejection, scoreAblation, scoreCondition` | Re-export |
| `./benchmark/study.js` | `AblationRow, ConditionAnswer, ConditionMetrics, ItemLabel, PairedRejection` | Re-export (type-only) |
| `./benchmark/backend-shapes.js` | `BackendShapeError, BenchmarkBackendRequest, BenchmarkBackendResponse` | Re-export (type-only) |
| `./witness-artifact.js` | `runWitnessRegistry, artifactPassingWitnessIds` | Re-export |
| `./witness-artifact.js` | `WitnessResultRecord, WitnessResultsArtifact` | Re-export (type-only) |
| `./witness-specs.js` | `WITNESS_REGISTRY` | Re-export |
| `./witness-specs.js` | `RegisteredNumericWitness, RegisteredSymbolicWitness, RegisteredWitness` | Re-export (type-only) |
| `./witness-symbolic.js` | `runSymbolicWitness` | Re-export |
| `./witness-symbolic.js` | `SymbolicSimplifier, SymbolicWitnessSpec` | Re-export (type-only) |
| `./witness-numeric.js` | `runNumericWitness` | Re-export |
| `./witness-numeric.js` | `Convergence, NumericWitnessRunResult, NumericWitnessSpec` | Re-export (type-only) |
| `./statement.js` | `contextUnion, statementContextUnion` | Re-export |
| `./statement.js` | `Context, ContextUnionFormed, ContextUnionRefused, ContextUnionResult, NoUnionReason, Statement, StatementId` | Re-export (type-only) |
| `./derivation.js` | `composeDerivations, composeDerivationsOrThrow, DerivationCompositionError, makeDerivation` | Re-export |
| `./derivation.js` | `CompositeFormed, CompositeRefused, Derivation, DerivationCompositionResult, DerivationId, DerivationSpec, NoCompositeReason` | Re-export (type-only) |

**Exports:**
- Re-exports:

  ```text
  RelationType, EvidenceTag, LimitCharacter, RegimeInequality, Regime, ApproximationBound, Witness,
  Counterexample, AtlasBridge, AtlasRejection, FormalFidelity, FormalRef, FormalRefKind,
  NormTransport, MissingDeltaAtError, MissingHorizonError, MissingLipschitzError, ALL_EVIDENCE_TAGS,
  deriveCompositeEvidence, deriveEvidence, deriveEvidenceForVerdict, NO_PASSING_WITNESSES,
  provedWithUnresolvedCounterexample, CounterexampleLike, EvidenceInput, MembershipVerdict,
  RejectionLike, WitnessLike, composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM,
  CompositionResult, NoCompositeClaim, boundPath, findAtlasPath, findPath, horizonOnRoute,
  routeEntryModels, AppliedTransport, NoClaimReason, PathBoundClaim, PathBoundResult, PathNoClaim,
  AtlasModel, ModelId, composeBounds, composeBoundPath, IDENTITY_BOUND, BoundPair, ComposedPath,
  deriveRegimeGroups, regimeHolds, RegimeCheck, CAPACITANCE, CUBIC_STIFFNESS, DAMPING, INDUCTANCE,
  RESISTANCE, SPRING_CONSTANT, ATLAS_MODELS, getAtlasModel, OSCILLATOR_FAMILY, AtlasFamily,
  toAtlasJson, ATLAS_RECORD_SCHEMA_VERSION, AtlasRecordJson, JsonValue, blockingFindings,
  checkApplicability, ApplicabilityFinding, ApplicabilityFindingKind, ApplicabilityInput,
  ApplicabilitySeverity, passingWitnessIds, UnresolvedReason, WitnessRunResult, WitnessStatus,
  ATLAS_FAMILIES, runLinkPrediction, ATLAS_ID_PREFIX, toAtlasJsonLd, toCombinedAtlasJson,
  QudtResolution, LinkPredictionResult, LinkPredictionTrial, DIFFUSION_FAMILY, BRIDGE_HEAT_DIFFUSION,
  BRIDGE_SCHRODINGER_DIFFUSION, BRIDGE_WALK_DIFFUSION, DIFFUSION_BRIDGES, DIFFUSION_MODELS,
  getDiffusionModel, WAVES_FAMILY, BRIDGE_KLEIN_GORDON_WAVE, BRIDGE_SOUND_SPEED, BRIDGE_STRING_WAVE,
  BRIDGE_WAVE_DALEMBERT, WAVE_BRIDGES, WAVE_MODELS, DIFFUSION_CLOSURE_BRIDGES, WAVE_CLOSURE_BRIDGES,
  FAILURE_KINDS, HELD_OUT_FAMILY, HELD_OUT_MARKERS, Authorship, BenchmarkItem, BenchmarkSplit,
  FailureKind, checkRenamedVariants, findCrossSplitLeakage, leakageKey, LeakageCollision,
  VariantProblem, ABLATION_CONFIGS, FULL_CONFIG, runAtlasCondition, runAtlasOnItem, AtlasRunConfig,
  AtlasVerdict, rankBySymbolOverlap, rankByStructure, rankByTextOverlap, recallAtK, CorpusRecord,
  Ranking, RetrievalQuery, ATLAS_ONLY_NOTE, EMBEDDING_INSTRUCTION, FROZEN_VECTOR_DIMS,
  FROZEN_VECTOR_SHA256, OLLAMA_EMBEDDING_MODEL, OLLAMA_TIMEOUT_MS, PROPOSAL_NOTE,
  EmbeddingUnavailable, canonicalRetrievalCorpus, cosine, decodeFloat32, ollamaEmbedder, queryInput,
  rankByCosine, retrieveHybrid, stubEmbedder, stubVector, Embedder, EmbeddingFallbackReason,
  HybridRetrieval, OllamaEmbedderOptions, parseBackendResponse, cohensKappa, mcnemar,
  pairedDifferenceInterval, powerReport, wilsonInterval, Interval, McNemarResult, PairedTable,
  PowerReport, pairedRejection, scoreAblation, scoreCondition, AblationRow, ConditionAnswer,
  ConditionMetrics, ItemLabel, PairedRejection, BackendShapeError, BenchmarkBackendRequest,
  BenchmarkBackendResponse, runWitnessRegistry, artifactPassingWitnessIds, WitnessResultRecord,
  WitnessResultsArtifact, WITNESS_REGISTRY, RegisteredNumericWitness, RegisteredSymbolicWitness,
  RegisteredWitness, runSymbolicWitness, SymbolicSimplifier, SymbolicWitnessSpec, runNumericWitness,
  Convergence, NumericWitnessRunResult, NumericWitnessSpec, contextUnion, statementContextUnion,
  Context, ContextUnionFormed, ContextUnionRefused, ContextUnionResult, NoUnionReason, Statement,
  StatementId, composeDerivations, composeDerivationsOrThrow, DerivationCompositionError,
  makeDerivation, CompositeFormed, CompositeRefused, Derivation, DerivationCompositionResult,
  DerivationId, DerivationSpec, NoCompositeReason
  ```


---

### `src/atlas/link-prediction.ts` - Atlas Phase 6, S6.3 — link prediction over the typed model graph: ONE result,

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `bootstrapCI, inv, permutationTest` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./family.js` | `AtlasFamily` | Import (type-only) |
| `./model.js` | `AtlasModel` | Import (type-only) |
| `./types.js` | `AtlasBridge` | Import (type-only) |
| `./text-overlap.js` | `jaccard, rankBy, tokens` | Import |
| `./benchmark/stats.js` | `mcnemar` | Import |
| `../numerical/statistics.js` | `meanOf` | Import |

**Exports:**
- Interfaces: `LinkPredictionTrial`, `BootstrapInterval`, `LinkPredictionIntervals`, `ReciprocalRankPermutation`, `LinkPredictionResult`, `KatzTrial`, `KatzLinkPredictionResult`
- Functions: `runLinkPrediction`, `runKatzLinkPrediction`
- Constants: `PERMUTATION_KIND`, `POST_HOC_LABEL`

---

### `src/atlas/model.ts` - The `Model` record — Phase 3's promotion of the Phase 0 `AtlasModel`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `./types.js` | `Regime` | Import (type-only) |

**Exports:**
- Interfaces: `AtlasModel`
- Types: `ModelId`

---

### `src/atlas/oscillators/bridges-coarse.ts` - Bridge 5 of the oscillator pilot: the COARSE-GRAINING bridge from the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `LENGTH, MASS` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../types.js` | `AtlasBridge, RelationContract` | Import (type-only) |
| `./bridges-exact.js` | `relationContractOf` | Import |
| `./dimensions.js` | `SPRING_CONSTANT` | Import |

**Exports:**
- Functions: `latticeDispersion`, `continuumDispersion`, `chainWaveSpeed`, `latticeBandEdge`, `dispersionErrorApproximation`, `dispersionDeviationBound`
- Constants: `BRIDGE_CHAIN_WAVE`, `CONTRACT_CHAIN_WAVE`

---

### `src/atlas/oscillators/bridges-exact.ts` - The two Phase 0 `exact-equivalence` bridges of design note §3.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../physjs-ref.js` | `physjsFormalRef` | Import |
| `../regime.js` | `makeRegime` | Import |
| `./models.js` | `getAtlasModel` | Import |
| `../types.js` | `AtlasBridge, Regime, RelationContract` | Import (type-only) |
| `./norm-transport.js` | `SPRING_LC_RELATIVE_PERIOD_TRANSPORT` | Import |

**Exports:**
- Functions: `relationContractOf`
- Constants: `BRIDGE_SPRING_LC`, `BRIDGE_DAMPED_RLC`, `CONTRACT_SPRING_LC`, `CONTRACT_DAMPED_RLC`

---

### `src/atlas/oscillators/bridges-limits.ts` - The two Phase 0 APPROXIMATION bridges — design note §3, bridges 3 and 4.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `ellipticK` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/mathts-read.js` | `numberFrom` | Import |
| `../physjs-ref.js` | `physjsFormalRef` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../types.js` | `MissingHorizonError` | Import |
| `../types.js` | `ApproximationBound, AtlasBridge, RelationContract, Regime` | Import (type-only) |
| `./bridges-exact.js` | `relationContractOf` | Import |
| `./dimensions.js` | `DAMPING, SPRING_CONSTANT` | Import |
| `./norms.js` | `RELATIVE_PERIOD_NORM` | Import |
| `../../dimensional/types.js` | `ACCELERATION, LENGTH, MASS` | Import |

**Exports:**
- Functions: `makeApproximation`, `pendulumPeriodErrorAt`, `dampedOffsetBoundAt`
- Constants: `AB_PENDULUM_LINEAR`, `AB_DAMPED_MASSLESS`, `LIMIT_BRIDGES`, `LIMIT_CONTRACTS`

---

### `src/atlas/oscillators/dimensions.ts` - Dimension constants the oscillator pilot needs.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-builders.js` | `dim` | Import |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../../dimensional/types.js` | `CAPACITANCE, INDUCTANCE, RESISTANCE, SPRING_CONSTANT` | Re-export |

**Exports:**
- Constants: `DAMPING`, `CUBIC_STIFFNESS`
- Re-exports: `CAPACITANCE`, `INDUCTANCE`, `RESISTANCE`, `SPRING_CONSTANT`

---

### `src/atlas/oscillators/index.ts` - Oscillator-family assembly (Atlas Phase 0, S0.6).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../family.js` | `AtlasFamily` | Import (type-only) |
| `./models.js` | `ATLAS_MODELS` | Import |
| `./bridges-exact.js` | `BRIDGE_SPRING_LC, BRIDGE_DAMPED_RLC` | Import |
| `./bridges-limits.js` | `LIMIT_BRIDGES` | Import |
| `./bridges-coarse.js` | `BRIDGE_CHAIN_WAVE` | Import |
| `./rejections.js` | `ATLAS_REJECTIONS` | Import |

**Exports:**
- Constants: `OSCILLATOR_FAMILY`

---

### `src/atlas/oscillators/limit-witnesses.ts` - The measurements behind the in-process witnesses of the three oscillator

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../numerical/hermite-crossing.js` | `hermiteCrossingFraction` | Import |
| `../../numerical/rk4-trajectory.js` | `rk4Trajectory` | Import |
| `./norm-transport-witness.js` | `quarterPeriod` | Import |

**Exports:**
- Functions: `measurePendulumPeriodRatio`, `measureMasslessOffset`, `measureChainDispersionError`
- Constants: `W7_FIXTURE`, `W8B_FIXTURE`, `W9_FIXTURE`

---

### `src/atlas/oscillators/models.ts` - The nine oscillator models of design note §3.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `ACCELERATION, LENGTH, MASS, VELOCITY` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../model.js` | `AtlasModel` | Import (type-only) |
| `../../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `./dimensions.js` | `CAPACITANCE, CUBIC_STIFFNESS, DAMPING, INDUCTANCE, RESISTANCE, SPRING_CONSTANT` | Import |

**Exports:**
- Functions: `getAtlasModel`
- Constants: `ATLAS_MODELS`

---

### `src/atlas/oscillators/norm-transport-witness.ts` - The measurement behind W1τ, `ab-spring-lc`'s relative-period norm transport

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../numerical/hermite-crossing.js` | `hermiteCrossingFraction` | Import |
| `./pendulum-motion.js` | `rk4Step` | Import |
| `./norm-transport.js` | `W1TAU_FIXTURE` | Import |

**Exports:**
- Interfaces: `TransportCircuit`
- Functions: `quarterPeriod`, `measureTransportedPeriodError`

---

### `src/atlas/oscillators/norm-transport.ts` - `ab-spring-lc`'s declared norm transport: the spring → LC map carries a bound

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../types.js` | `NormTransport` | Import (type-only) |
| `./norms.js` | `RELATIVE_PERIOD_NORM` | Import |

**Exports:**
- Constants: `SPRING_LC_TRANSPORT_TEST`, `W1TAU_FIXTURE`, `SPRING_LC_RELATIVE_PERIOD_TRANSPORT`

---

### `src/atlas/oscillators/norms.ts` - Norm names the oscillator records share, so a bound and the transport that

**Exports:**
- Constants: `RELATIVE_PERIOD_NORM`

---

### `src/atlas/oscillators/pendulum-motion.ts` - The pendulum and its linear oscillator, integrated and read off, for the

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `ellipticK, findRoot, jacobiSN` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/mathts-read.js` | `numberFrom` | Import |
| `../../numerical/null-ray-integrator.js` | `integrateRK4` | Import |
| `./bridges-limits.js` | `pendulumPeriodErrorAt` | Import |

**Exports:**
- Functions: `rk4Step`, `crossingTimes`, `phaseAt`, `theta0OfPeriodError`, `pendulumNome`, `exactPendulumAngle`
- Constants: `TWO_PI`, `W2`, `pendulumAccel`, `linearAccel`

---

### `src/atlas/oscillators/phase-carriage.ts` - `ab-spring-lc`'s declaration that its map carries the PHASE unchanged, so

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../translation.js` | `ObservableCarriage` | Import (type-only) |
| `../witness-numeric.js` | `NumericWitnessSpec` | Import (type-only) |
| `./pendulum-motion.js` | `phaseAt, rk4Step` | Import |

**Exports:**
- Functions: `measureCarriedPhaseError`
- Constants: `SPRING_LC_PHASE_CARRIAGE`

---

### `src/atlas/oscillators/phase-translation.ts` - `ab-pendulum-linear`'s declared translation from its bound's quantity, the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../translation.js` | `ObservableTranslation` | Import (type-only) |
| `./bridges-limits.js` | `pendulumPeriodErrorAt` | Import |
| `./pendulum-motion.js` | `crossingTimes, linearAccel, pendulumAccel, phaseAt, theta0OfPeriodError, TWO_PI` | Import |

**Exports:**
- Constants: `PHASE_POINT_MAX_PERIODS`, `PENDULUM_PHASE_TRANSLATION`

---

### `src/atlas/oscillators/position-translation.ts` - `ab-pendulum-linear`'s declared translation from its bound's quantity, the

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `rfft` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../translation.js` | `ObservableTranslation` | Import (type-only) |
| `../witness-dominance.js` | `DominanceWitnessSpec` | Import (type-only) |
| `../witness-numeric.js` | `NumericWitnessSpec` | Import (type-only) |
| `./bridges-limits.js` | `pendulumPeriodErrorAt` | Import |
| `./pendulum-motion.js` | `exactPendulumAngle, linearAccel, pendulumAccel, pendulumNome, rk4Step, theta0OfPeriodError, TWO_PI` | Import |

**Exports:**
- Functions: `waveformBound`, `fundamentalCoefficient`, `exactDominanceSpec`, `fourierCoefficient`, `fourierSeriesExactDeviation`, `fourierCoefficientsByFft`, `fourierSeriesCheck`
- Constants: `FOURIER_SERIES_THETA0S`, `FOURIER_SERIES_EXACT_GRID`, `FOURIER_SERIES_EXACT_TOLERANCE`, `FOURIER_SERIES_EXACT_TIGHT`, `PENDULUM_POSITION_TRANSLATION`

---

### `src/atlas/oscillators/rejections.ts` - The Phase 0 REJECTION record: a claimed bridge the atlas records as refuted,

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../types.js` | `AtlasRejection` | Import (type-only) |

**Exports:**
- Constants: `ATLAS_REJECTIONS`

---

### `src/atlas/path-bound.ts` - Routes through an atlas family, and the error bound a route carries.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./error-algebra.js` | `composeBoundPath, IDENTITY_BOUND` | Import |
| `./error-algebra.js` | `BoundPair` | Import (type-only) |
| `./composition-table.js` | `composeRelation, NO_COMPOSITE_CLAIM` | Import |
| `./composition-table.js` | `CompositionResult` | Import (type-only) |
| `./types.js` | `AtlasBridge, NormTransport, RelationType` | Import (type-only) |
| `./families.js` | `ATLAS_FAMILIES` | Import |
| `./family.js` | `AtlasFamily` | Import (type-only) |
| `./error-algebra.js` | `IDENTITY_BOUND` | Re-export |

**Exports:**
- Interfaces: `RouteEnumeration`, `PathBoundClaim`, `AppliedTransport`, `PathNoClaim`
- Types: `NoClaimReason`, `PathBoundResult`
- Functions:

  ```text
  findPath, findAtlasPath, allAtlasBridges, enumerateAtlasRoutes, enumerateRoutes, boundPath,
  routeEntryModels, familyChangeBlocksHorizon, horizonOnRoute
  ```

- Re-exports: `IDENTITY_BOUND`

---

### `src/atlas/physjs-entries.generated.ts` - Generated from `formal/lean/manifest.json`, `formal/lean/theorem-files.json`

**Exports:**
- Constants: `LEAN_SOURCE_TAG`, `LEAN_TOOLCHAIN`, `LEAN_MATHLIB`, `LEAN_PHYSLIB`, `PHYSJS_ENTRIES`

---

### `src/atlas/physjs-ref.ts` - Reviewed `formalRef`s keyed by this repository's Lean manifest.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/hash.js` | `sha256Hex` | Import |
| `./types.js` | `FormalFidelity, FormalRef, FormalRefKind` | Import (type-only) |
| `../relations/types.js` | `FORMAL_REF_KINDS` | Import |
| `../bridges/catalog-load.js` | `catalogEntries, catalogIdNumber` | Import |
| `./physjs-reviewed.js` | `PHYSJS_REVIEWED_ROWS, PHYSJS_SANITY_LEMMA_KEYS` | Import |
| `./physjs-entries.generated.js` | `LEAN_MATHLIB, LEAN_PHYSLIB, LEAN_SOURCE_TAG, LEAN_TOOLCHAIN, PHYSJS_ENTRIES` | Import |
| `./physjs-entries.generated.js` | `LEAN_SOURCE_TAG` | Re-export |

**Exports:**
- Interfaces: `PhysjsManifestEntry`, `PhysjsManifestFile`, `PhysjsReviewedRow`
- Functions:

  ```text
  physjsNestedStatements, physjsTheorem, physjsLeanFile, physjsFileUrl, physjsAheadOfCatalog,
  bridgeSeedKeys, physjsKeysAheadOfCatalog, physjsManifestRow, physjsRowHash, physjsFidelity,
  physjsFormalRef, physjsManifestProblems
  ```

- Re-exports: `LEAN_SOURCE_TAG`

---

### `src/atlas/physjs-reviewed.ts` - The reviewed Lean manifest rows (`formal/lean/manifest.json`), pinned per key.

**Exports:**
- Constants: `PHYSJS_SANITY_LEMMA_KEYS`, `PHYSJS_REVIEWED_ROWS`

---

### `src/atlas/poster/associations.ts` - Atlas Phase 3 — the poster's two association-only lines.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../association.js` | `Association` | Import (type-only) |
| `../statement.js` | `StatementId` | Import (type-only) |

**Exports:**
- Constants: `UNSPECIFIED_TARGET`, `POSTER_ASSOCIATIONS`, `ASSOCIATION_ONLY_PAIRS`

---

### `src/atlas/poster/derivations.ts` - Atlas Phase 3 — the poster's typed edges.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../derivation.js` | `makeDerivation` | Import |
| `../derivation.js` | `Derivation, DerivationId` | Import (type-only) |
| `../statement.js` | `StatementId` | Import (type-only) |
| `../types.js` | `Witness` | Import (type-only) |
| `./associations.js` | `POSTER_ASSOCIATIONS, ASSOCIATION_ONLY_PAIRS` | Import |
| `./statements.js` | `POSTER_REGISTRY, posterId` | Import |

**Exports:**
- Interfaces: `PosterConstraint`, `PosterLine`, `PosterProblem`
- Types: `LineContainer`
- Functions: `validatePosterRelations`
- Constants: `POSTER_DERIVATIONS`, `POSTER_CONSTRAINTS`, `POSTER_WITNESSES`, `POSTER_LINES`

---

### `src/atlas/poster/statements.ts` - Atlas Phase 3 — the poster's sixteen entries, its five hidden supporting

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../statement.js` | `Context, Statement, StatementId` | Import (type-only) |
| `../model.js` | `ModelId` | Import (type-only) |

**Exports:**
- Classes: `PosterStatementError`
- Interfaces: `PosterEntry`
- Types: `Identification`
- Functions: `buildPosterRegistry`, `posterEntry`, `posterId`
- Constants: `POSTER_MODEL_UNRECORDED`, `UNIDENTIFIED`, `POSTER_ENTRIES`, `HIDDEN_NODES`, `SUPPORTING_STATEMENTS`, `POSTER_ALL_STATEMENTS`, `POSTER_REGISTRY`

---

### `src/atlas/proof-target.ts` - Lean statement skeleton for one chain candidate.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../composition/chain-candidate.js` | `ChainCandidate` | Import (type-only) |
| `../relations/types.js` | `FormalRefKind` | Import (type-only) |
| `./physjs-ref.js` | `physjsTheorem` | Import |

**Exports:**
- Interfaces: `ProofTargetDraft`
- Functions: `proofTargetDraft`, `emitProofTarget`
- Constants: `PROOF_TARGET_DRAFT_BEGIN`, `PROOF_TARGET_DRAFT_END`

---

### `src/atlas/public.ts` - The PUBLIC atlas surface — reached as the `atlas` namespace of the package

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `ApproximationBound, AtlasBridge, AtlasRejection, Counterexample, EvidenceTag, FormalFidelity, FormalRef, FormalRefKind, LimitCharacter, NormTransport, Regime, RegimeInequality, RelationType, Witness` | Re-export (type-only) |
| `./types.js` | `MissingDeltaAtError, MissingHorizonError, MissingLipschitzError` | Re-export |
| `./model.js` | `AtlasModel` | Re-export (type-only) |
| `./regime.js` | `regimeHolds` | Re-export |
| `./regime.js` | `RegimeCheck` | Re-export (type-only) |
| `./error-algebra.js` | `composeBoundPath, composeBounds, IDENTITY_BOUND` | Re-export |
| `./error-algebra.js` | `BoundPair, ComposedPath` | Re-export (type-only) |
| `./composition-table.js` | `composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM` | Re-export |
| `./composition-table.js` | `CompositionResult, NoCompositeClaim` | Re-export (type-only) |
| `./families.js` | `ATLAS_FAMILIES` | Re-export |
| `./family.js` | `AtlasFamily` | Re-export (type-only) |
| `./serialize.js` | `ATLAS_RECORD_SCHEMA_VERSION` | Re-export |

**Exports:**
- Re-exports:

  ```text
  ApproximationBound, AtlasBridge, AtlasRejection, Counterexample, EvidenceTag, FormalFidelity,
  FormalRef, FormalRefKind, LimitCharacter, NormTransport, Regime, RegimeInequality, RelationType,
  Witness, MissingDeltaAtError, MissingHorizonError, MissingLipschitzError, AtlasModel, regimeHolds,
  RegimeCheck, composeBoundPath, composeBounds, IDENTITY_BOUND, BoundPair, ComposedPath,
  composeRelation, COMPOSITION_TABLE, NO_COMPOSITE_CLAIM, CompositionResult, NoCompositeClaim,
  ATLAS_FAMILIES, AtlasFamily, ATLAS_RECORD_SCHEMA_VERSION
  ```


---

### `src/atlas/regime.ts` - Regime admission, and the re-export of the vocabulary half.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/regime.js` | `collidingRegimeGroups, deriveRegimeGroups, intersectRegimes, makeRegime, regimeOverlap, uncoveredRegions` | Re-export |
| `../relations/regime.js` | `RegimeBearing, RegimeOverlap, RegionSample, RegimeCheck` | Re-export (type-only) |
| `./types.js` | `AtlasBridge` | Import (type-only) |
| `./types.js` | `MissingDeltaAtError, MissingHorizonError` | Import |
| `../relations/regime.js` | `regimeHolds` | Re-export |

**Exports:**
- Types: `RegimeCheck`
- Functions: `admitApproximation`
- Re-exports:

  ```text
  collidingRegimeGroups, deriveRegimeGroups, intersectRegimes, makeRegime, regimeOverlap,
  uncoveredRegions, RegimeBearing, RegimeOverlap, RegionSample, regimeHolds
  ```


---

### `src/atlas/serialize.ts` - JSON projection of an atlas family (Atlas Phase 0, S0.6).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/buckingham.js` | `PiGroup` | Import (type-only) |
| `./types.js` | `ApproximationBound, AtlasBridge, AtlasRejection, Regime` | Import (type-only) |
| `./model.js` | `AtlasModel` | Import (type-only) |
| `./family.js` | `AtlasFamily` | Import (type-only) |
| `./derive-evidence.js` | `deriveEvidence` | Import |
| `./witness-artifact.js` | `WitnessResultsArtifact` | Import (type-only) |
| `./witness-artifact.js` | `artifactPassingWitnessIds` | Import |

**Exports:**
- Interfaces: `AtlasRecordJson`
- Types: `JsonValue`
- Functions: `normTransportFields`, `toAtlasJson`
- Constants: `ATLAS_RECORD_SCHEMA_VERSION`

---

### `src/atlas/statement.ts` - Atlas Phase 3 — `Statement`, `Context`, and the CHECKED context union.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./conventions.js` | `checkConventions` | Import |
| `./conventions.js` | `ConventionKey` | Import (type-only) |
| `./types.js` | `Conventions` | Import (type-only) |
| `./model.js` | `ModelId` | Import (type-only) |
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Interfaces: `Context`, `Statement`, `ContextUnionFormed`, `ContextUnionRefused`
- Types: `StatementId`, `NoUnionReason`, `ContextUnionResult`
- Functions: `contextUnion`, `statementContextUnion`

---

### `src/atlas/text-overlap.ts` - Word-token overlap: the text baseline's tokenizer, Jaccard similarity and the rank comparator.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `compareCodepoint` | Import |

**Exports:**
- Functions: `rankBy`
- Constants: `tokens`, `jaccard`

---

### `src/atlas/translation-registry.ts` - Every declared observable translation (`./translation.ts`), and every

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./oscillators/phase-carriage.js` | `SPRING_LC_PHASE_CARRIAGE` | Import |
| `./oscillators/phase-translation.js` | `PENDULUM_PHASE_TRANSLATION` | Import |
| `./oscillators/position-translation.js` | `PENDULUM_POSITION_TRANSLATION` | Import |
| `./translation.js` | `ObservableCarriage, ObservableTranslation, TranslationCheck` | Import (type-only) |
| `./witness-dominance.js` | `runDominanceWitness` | Import |
| `./witness-numeric.js` | `runNumericWitness` | Import |
| `./witness-result.js` | `WitnessRunResult` | Import (type-only) |

**Exports:**
- Functions: `translationsOf`, `carriageOf`, `runTranslationCheck`
- Constants: `OBSERVABLE_TRANSLATIONS`, `OBSERVABLE_CARRIAGES`

---

### `src/atlas/translation.ts` - A bridge's declared translation of its bound's quantity into ANOTHER

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Witness` | Import (type-only) |
| `./witness-dominance.js` | `DominanceWitnessSpec` | Import (type-only) |
| `./witness-numeric.js` | `NumericWitnessSpec` | Import (type-only) |

**Exports:**
- Interfaces: `PointCheck`, `ObservableTranslation`, `ObservableCarriage`
- Types: `TranslationCheck`

---

### `src/atlas/types.ts` - Atlas record types.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/types.js` | `FormalRef, RelationType, EvidenceTag, LimitCharacter, RegimeInequality, Regime, ApproximationBound, Counterexample` | Import (type-only) |
| `../relations/types.js` | `Conventions, FormalFidelity, FormalRef, FormalRefKind, RelationContract` | Re-export (type-only) |
| `../relations/types.js` | `ALL_EVIDENCE_TAGS` | Re-export |

**Exports:**
- Classes: `MissingHorizonError`, `MissingDeltaAtError`, `MissingLipschitzError`
- Interfaces: `Witness`, `NormTransport`, `AtlasBridge`, `AtlasRejection`
- Types: `RelationType`, `EvidenceTag`, `LimitCharacter`, `RegimeInequality`, `Regime`, `ApproximationBound`, `Counterexample`
- Re-exports: `Conventions`, `FormalFidelity`, `FormalRef`, `FormalRefKind`, `RelationContract`, `ALL_EVIDENCE_TAGS`

---

### `src/atlas/waves/bridges-closure.ts` - Atlas Phase 4 — the three wave-family bridges added to close Sprint 4's

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../../dimensional/types.js` | `FORCE, FREQUENCY, MASS, VELOCITY` | Import |
| `../oscillators/bridges-limits.js` | `makeApproximation` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../physjs-ref.js` | `physjsFormalRef` | Import |
| `../types.js` | `AtlasBridge` | Import (type-only) |
| `./models.js` | `FLEXURAL_RIGIDITY, LINEAR_DENSITY, WAVENUMBER, WAVES_FAMILY_NAME` | Import |
| `./numerics.js` | `kgNonrelativisticError, stiffStringPhaseError` | Import |

**Exports:**
- Constants: `KG_NR_MAX_X`, `STIFF_MAX_BETA`, `BRIDGE_KG_SCHRODINGER`, `BRIDGE_KG_OSCILLATOR`, `BRIDGE_STIFF_STRING`, `WAVE_CLOSURE_BRIDGES`

---

### `src/atlas/waves/bridges.ts` - Atlas Phase 4, S4.5 — the four bridges of the wave family.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `FORCE, FREQUENCY, VELOCITY` | Import |
| `../diffusion/dimensions.js` | `DENSITY` | Import |
| `../oscillators/bridges-limits.js` | `makeApproximation` | Import |
| `../regime.js` | `makeRegime` | Import |
| `../physjs-ref.js` | `physjsFormalRef` | Import |
| `../types.js` | `AtlasBridge` | Import (type-only) |
| `./models.js` | `LINEAR_DENSITY, PRESSURE, WAVENUMBER, WAVES_FAMILY_NAME` | Import |
| `./numerics.js` | `kleinGordonPhaseError` | Import |

**Exports:**
- Constants: `SOUND_MAX_PERTURBATION`, `KG_MAX_DISPERSION_RATIO`, `BRIDGE_STRING_WAVE`, `BRIDGE_WAVE_DALEMBERT`, `BRIDGE_SOUND_SPEED`, `BRIDGE_KLEIN_GORDON_WAVE`, `WAVE_BRIDGES`

---

### `src/atlas/waves/index.ts` - Wave-family assembly (Atlas Phase 4, S4.5).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../family.js` | `AtlasFamily` | Import (type-only) |
| `./bridges.js` | `WAVE_BRIDGES` | Import |
| `./bridges-closure.js` | `WAVE_CLOSURE_BRIDGES` | Import |
| `./models.js` | `WAVE_MODELS, WAVES_FAMILY_NAME` | Import |

**Exports:**
- Constants: `WAVES_FAMILY`

---

### `src/atlas/waves/models.ts` - Atlas Phase 4, S4.5 — the models of the wave family.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-builders.js` | `dim` | Import |
| `../../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../../dimensional/types.js` | `FORCE, FREQUENCY, LINEAR_DENSITY, PRESSURE, VELOCITY` | Import |
| `../diffusion/dimensions.js` | `DENSITY` | Import |
| `../model.js` | `AtlasModel` | Import (type-only) |
| `../regime.js` | `makeRegime` | Import |
| `../../dimensional/types.js` | `WAVENUMBER` | Re-export |

**Exports:**
- Constants: `WAVES_FAMILY_NAME`, `FLEXURAL_RIGIDITY`, `WAVE_MODELS`
- Re-exports: `WAVENUMBER`

---

### `src/atlas/waves/numerics.ts` - Atlas Phase 4, S4.5 — the numerics behind the wave family's witnesses.

**Exports:**
- Interfaces: `StringFixture`, `DalembertFixture`, `AcousticFixture`
- Functions:

  ```text
  stringLeapfrogMidpoint, dalembert, dalembertResidual, adiabaticSlope, acousticLeapfrogQuarter,
  soundSpeeds, kleinGordonPhaseError, kleinGordonPhaseVelocity, kgNonrelativisticError,
  kgUniformModeValue, stiffStringPhaseError, stiffStringPhaseVelocity
  ```


---

### `src/atlas/witness-artifact.ts` - Atlas Phase 4, S4.3 — the witness-results ARTIFACT: its shape, the run that

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./witness-numeric.js` | `Convergence` | Import (type-only) |
| `./witness-numeric.js` | `runNumericWitness` | Import |
| `./witness-result.js` | `UnresolvedReason, WitnessRunResult, WitnessStatus` | Import (type-only) |
| `./witness-symbolic.js` | `SymbolicSimplifier` | Import (type-only) |
| `./witness-symbolic.js` | `runSymbolicWitness` | Import |
| `./witness-specs.js` | `RegisteredWitness` | Import (type-only) |
| `./witness-specs.js` | `WITNESS_REGISTRY` | Import |

**Exports:**
- Interfaces: `WitnessResultRecord`, `WitnessResultsArtifact`
- Functions: `runWitnessRegistry`, `artifactPassingWitnessIds`

---

### `src/atlas/witness-dominance.ts` - The dominance witness runner: a claimed UPPER BOUND checked against a

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./witness-result.js` | `WitnessRunResult` | Import (type-only) |

**Exports:**
- Interfaces: `DominanceWitnessSpec`, `DominanceRunResult`
- Functions: `runDominanceWitness`

---

### `src/atlas/witness-numeric.ts` - Atlas Phase 4, S4.2 — the numeric witness runner.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `linearRegression` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./witness-result.js` | `WitnessRunResult` | Import (type-only) |

**Exports:**
- Interfaces: `Convergence`, `ObservedOrder`, `NumericWitnessSpec`, `NumericWitnessRunResult`
- Functions: `runNumericWitness`

---

### `src/atlas/witness-result.ts` - Atlas Phase 4, S4.2 — the shape a witness run reports.

**Exports:**
- Interfaces: `WitnessRunResult`
- Types: `WitnessStatus`, `UnresolvedReason`
- Functions: `passingWitnessIds`

---

### `src/atlas/witness-specs.ts` - Atlas Phase 4, S4.3 — the EXECUTABLE witness registry.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-builders.js` | `sym` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS, ENERGY, LENGTH, MASS` | Import |
| `../composition/expr-subst.js` | `substitute` | Import |
| `./oscillators/dimensions.js` | `CAPACITANCE, DAMPING, INDUCTANCE, RESISTANCE, SPRING_CONSTANT` | Import |
| `./diffusion/numerics.js` | `heatSteadyDeviation, langevinMsdRatio, telegraphSlowRateRatio, telegraphWaveFrequencyRatio, diffusionKernel, gaussianSpread, heatFtcsCentre, randomWalkCentralDensity, wickHeatResidual` | Import |
| `./diffusion/numerics.js` | `HeatFixture, LangevinFixture, SteadyStateFixture, WickFixture` | Import (type-only) |
| `./diffusion/dimensions.js` | `DENSITY, DIFFUSIVITY, SPECIFIC_HEAT, THERMAL_CONDUCTIVITY` | Import |
| `./diffusion/models.js` | `VISCOSITY` | Import |
| `./witnesses/quantum-support.js` | `wickRotatedFreeKernel` | Import |
| `./waves/numerics.js` | `kgNonrelativisticError, kgUniformModeValue, stiffStringPhaseVelocity, acousticLeapfrogQuarter, dalembertResidual, kleinGordonPhaseVelocity, stringLeapfrogMidpoint` | Import |
| `./waves/numerics.js` | `AcousticFixture, DalembertFixture, StringFixture` | Import (type-only) |
| `./oscillators/bridges-limits.js` | `pendulumPeriodErrorAt` | Import |
| `./oscillators/norm-transport.js` | `SPRING_LC_RELATIVE_PERIOD_TRANSPORT, W1TAU_FIXTURE` | Import |
| `./oscillators/norm-transport-witness.js` | `measureTransportedPeriodError` | Import |
| `./oscillators/bridges-limits.js` | `dampedOffsetBoundAt` | Import |
| `./oscillators/bridges-coarse.js` | `dispersionDeviationBound, dispersionErrorApproximation` | Import |
| `./oscillators/limit-witnesses.js` | `measureChainDispersionError, measureMasslessOffset, measurePendulumPeriodRatio, W7_FIXTURE, W8B_FIXTURE, W9_FIXTURE` | Import |
| `./witness-numeric.js` | `NumericWitnessSpec` | Import (type-only) |
| `./witness-symbolic.js` | `SymbolicWitnessSpec` | Import (type-only) |

**Exports:**
- Interfaces: `RegisteredSymbolicWitness`, `RegisteredNumericWitness`
- Types: `WitnessClaim`, `RegisteredWitness`
- Constants:

  ```text
  WD1_FIXTURE, WD2_FIXTURE, WD3_FIXTURE, WS1_FIXTURE, WS2_FIXTURE, WS3_FIXTURE, WS4_FIXTURE,
  WD4_FIXTURE, WD6_FIXTURE, WD7_FIXTURE, WD8_FIXTURE, WS5_FIXTURE, WS6_FIXTURE, WS7_FIXTURE,
  WITNESS_REGISTRY
  ```


---

### `src/atlas/witness-symbolic.ts` - Atlas Phase 4, S4.2 — the symbolic witness runner.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `random, seedProbabilityRng` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-builders.js` | `sym` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../composition/expr-eval.js` | `evalExpr` | Import |
| `../composition/expr-simplify.js` | `isSimplifierAvailable, simplifyExpr` | Import |
| `../composition/mathts-scalar-symbols.js` | `scalarSymbolsFromMathTs` | Import |
| `./witness-result.js` | `WitnessRunResult` | Import (type-only) |
| `../dimensional/ast-leaves.js` | `literalValue` | Import |

**Exports:**
- Interfaces: `SymbolicWitnessSpec`, `NumericProbe`, `SymbolicWitnessRunResult`
- Types: `SymbolicSimplifier`, `NumericProbeKind`
- Functions: `probeSymbolicWitness`, `tallySymbolicResults`, `runSymbolicWitness`
- Constants: `NUMERIC_PROBE_POINTS`, `NUMERIC_PROBE_TOLERANCE`

---

### `src/atlas/witnesses/quantum-support.ts` - Quantum-side support functions for Phase 3's `deformation-quantization` and

**Exports:**
- Interfaces: `WickRotatedCoefficients`
- Functions: `chirpedGaussianUncertaintyProduct`, `wickRotatedSchrodingerCoefficients`, `wickRotatedFreeKernel`

---

<a id="bridges-dependencies"></a>

## Bridges Dependencies

### `src/bridges/caller-table.ts` - A confrontation that exists only when the caller supplies a measured table

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./observations/types.js` | `residualInSigma, ConfrontationOutcome` | Import |

**Exports:**
- Interfaces: `MeasuredCouplingRow`, `RunningProcedureRecord`, `RunningProcedure`, `CallerTableRequest`, `CallerTableRefusal`, `CallerTableHit`
- Types: `CallerTableResult`
- Functions: `requestCallerTableConfrontation`

---

### `src/bridges/carrier-sign.ts` - One sign rule for a positive transport coefficient built from a carrier

**Exports:**
- Classes: `CarrierSignError`
- Functions: `resetCarrierSignPolicyCalls`, `readCarrierSignPolicyCalls`, `applyCarrierSignPolicy`

---

### `src/bridges/catalog-adapter.ts` - Catalog adapter: ingests `BRIDGE_EQUATIONS` into the v0.7-p2 sparse

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./index.js` | `BridgeEquationEntry, BridgeEquationStatus` | Import (type-only) |
| `../core/cell.js` | `BridgeCell, CellConfidence` | Import (type-only) |
| `../core/tensor.js` | `UniversalTensor` | Import (type-only) |
| `../core/flux-rules.js` | `FluxDiagnostic, FluxReport` | Import (type-only) |
| `../dimensional/bridge-check.js` | `EXPECTED_DIMENSION_BY_BRIDGE` | Import |
| `./catalog-load.js` | `catalogEntries` | Import |
| `../dimensional/algebra.js` | `format` | Import |
| `../core/types.js` | `PhysicalScale, TensorIndices` | Import (type-only) |

**Exports:**
- Classes: `CatalogIngestionError`
- Interfaces: `CatalogEntryStatus`, `CatalogIngestionReport`
- Functions: `catalogToCells`, `scanCatalog`, `ingestCatalog`, `ingestionReportToFluxReport`

---

### `src/bridges/catalog-load.ts` - The catalog loader. This module is the only place that parses a bridge id

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./observations/types.js` | `residualInSigma` | Import |
| `../core/compare.js` | `withinMixed` | Import |
| `../core/data-file.js` | `checkedDataFile` | Import |
| `./catalog-types.js` | `CatalogConfrontation, CatalogConfrontationRecord, CatalogEntry, CatalogEvaluator, CatalogEvaluatorParameter, CatalogFile, CatalogFileRecord, CatalogRejection, CatalogRelation` | Import (type-only) |
| `./observations/types.js` | `ConfrontationOutcome` | Import (type-only) |

**Exports:**
- Functions:

  ```text
  loadCatalog, bridgeCatalog, catalogEntries, catalogRelations, catalogEvaluators,
  catalogConfrontations, catalogRejections, catalogEntry, relationsForCatalog, primaryRelation,
  catalogIdNumber, parseBridgeId, catalogEdgeKey
  ```


---

### `src/bridges/catalog-types.ts` - Catalog record shapes. The file `data/bridge-catalog.json` is the source.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./observations/types.js` | `ConfrontationOutcome` | Import (type-only) |
| `./types.js` | `BridgeEquationEntry, BridgeEquationStatus` | Import (type-only) |

**Exports:**
- Interfaces:

  ```text
  CatalogEntry, CatalogReference, CatalogRelation, CatalogEvaluatorParameter, CatalogEvaluatorOutput,
  CatalogEvaluator, CatalogPrediction, CatalogConfrontation, CatalogRejection, CatalogFile,
  CatalogAdjudication
  ```

- Types: `CatalogFiling`, `ProofStatus`, `CatalogConfrontationRecord`, `CatalogRelationRecord`, `CatalogFileRecord`, `AdjudicationVerdict`
- Constants: `PROOF_STATUSES`

---

### `src/bridges/coefficient-statement.ts` - Sign of the one-loop coefficient, read from the catalog expression.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./catalog-load.js` | `catalogEntries, primaryRelation` | Import |
| `./expr-parse.js` | `evaluateFormula` | Import |

**Exports:**
- Interfaces: `OneLoopCoefficientStatement`
- Types: `OneLoopCoefficientSign`
- Functions: `oneLoopCoefficientStatement`

---

### `src/bridges/confrontation-coverage.ts` - Catalog ids with a committed real-data confrontation.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./confrontations.js` | `CONFRONTATIONS` | Import |

**Exports:**
- Constants: `DATA_CONFRONTED_IDS`

---

### `src/bridges/confrontations.ts` - Confrontations projected from the catalog. The outcome is the recorded

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./observations/types.js` | `ConfrontationOutcome, ObservationKind` | Import (type-only) |
| `./catalog-load.js` | `catalogConfrontations` | Import |

**Exports:**
- Interfaces: `ConfrontationEntry`
- Types: `RigorTier`
- Functions: `confrontationRigor`, `rigorDistribution`, `listConfrontations`, `runConfrontation`
- Constants: `CONFRONTATION_RIGOR`, `CONFRONTATIONS`

---

### `src/bridges/evaluation-errors.ts` - The errors one evaluation throws, in the order it checks: the bindings

**Exports:**
- Classes: `MissingInputError`, `UnknownInputError`, `InputTypeError`, `NonFiniteInputError`, `ConstantInputError`, `DuplicateInputError`, `DomainViolationError`
- Interfaces: `DomainInput`, `DomainViolation`
- Functions: `isInputContractError`

---

### `src/bridges/evaluator-inputs.ts` - `key=value[unit]` arguments → an evaluator's numeric inputs, through the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/assignment.js` | `splitAssignment` | Import |
| `../core/format.js` | `formatQuantity` | Import |
| `../dimensional/units.js` | `affineReadingNote, unitConventionNotes, UnitError, TemperatureReading` | Import |
| `../dimensional/formula-names.js` | `temperatureQuantityRole` | Import |
| `../numerical/binding-value.js` | `readNamedBinding, NamedBindingSibling` | Import |
| `./evaluators.js` | `EvaluatorParameter` | Import (type-only) |
| `./evaluation-errors.js` | `UnknownInputError` | Import |
| `./input-contract.js` | `parameterContract, repeatedInput, slotForSpelling, InputContract` | Import |

**Exports:**
- Interfaces: `ResolvedInput`
- Functions: `resolveEvaluatorInputs`

---

### `src/bridges/evaluators.ts` - Closed-form evaluators projected from the catalog. `run` evaluates the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/formula-names.js` | `FORMULA_NAMED` | Import |
| `./catalog-load.js` | `catalogEntries, catalogEntry, catalogEvaluators, primaryRelation` | Import |
| `./catalog-types.js` | `CatalogEvaluator, CatalogEvaluatorOutput, CatalogEvaluatorParameter, CatalogRelation` | Import (type-only) |
| `./expr-parse.js` | `evaluateFormula, formulaVariables, parseCatalogExpression, reservedFormulaNames` | Import |
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `./relation-eval.js` | `evaluateCatalogRelation, relationDomain` | Import |
| `./evaluation-errors.js` | `DomainViolationError, DomainViolation` | Import |
| `./input-contract.js` | `checkInputs, inputContract, EvaluationWant, InputContract, InputSlot` | Import |

**Exports:**
- Interfaces: `ParameterAlternate`, `EvaluatorParameter`, `EvaluatorSpec`
- Types: `GeometryRole`
- Functions: `unusedInputKeys`, `buildEvaluatorSpec`, `missingEvaluatorMessage`, `evaluateBridge`
- Constants: `BRIDGE_EVALUATORS`

---

### `src/bridges/expr-parse.ts` - One expression parser for a catalog formula: MathTS.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `DIMENSIONLESS, Dimension` | Import |
| `../dimensional/ast-types.js` | `ExprNode, TranscendentalFn` | Import (type-only) |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, isRegisteredConstant` | Import |
| `../dimensional/formula-names.js` | `FORMULA_NAMED` | Import |
| `../dimensional/hyphen-names.js` | `rewriteCatalogHyphens` | Import |
| `../dimensional/quantity-registry.js` | `allQuantityRecords` | Import |
| `../numerical/formula-mathts.js` | `parseFormula` | Import |
| `../numerical/formula-dimension.js` | `parseFormulaPNode, FormulaPNode` | Import |
| `./evaluation-errors.js` | `ConstantInputError` | Import |

**Exports:**
- Functions: `formulaNames`, `reservedFormulaNames`, `formulaScope`, `formulaVariables`, `expressionNames`, `withoutUnreadConstants`, `evaluateFormula`, `parseCatalogExpression`

---

### `src/bridges/holds.ts` - Interpreter for a catalog validity condition.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `parse` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/hyphen-names.js` | `rewriteCatalogHyphens` | Import |
| `./evaluation-errors.js` | `ConstantInputError` | Import |
| `./expr-parse.js` | `expressionNames` | Import |

**Exports:**
- Classes: `HoldsError`
- Interfaces: `HoldsCondition`
- Functions: `holdsConditions`, `conditionReads`, `holdsScope`, `holds`

---

### `src/bridges/index.ts` - Bridge catalog projection. The rows are loaded from

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `BridgeEquationEntry` | Import (type-only) |
| `./catalog-load.js` | `catalogEntries` | Import |
| `./types.js` | `BridgeEquationEntry, BridgeEquationStatus, BridgeIssueFixable, BridgeIssueSeverity, KnownIssue` | Re-export (type-only) |
| `../core/constants.js` | `BCS_GAP_RATIO, JOSEPHSON_CONSTANT_SI, LANE_EMDEN_OMEGA3, LORENZ_NUMBER_SI, M_PROTON_SI, THOMSON_CROSS_SECTION_SI, VON_KLITZING_SI` | Re-export |
| `./carrier-sign.js` | `CarrierSignError` | Re-export |
| `./evaluation-errors.js` | `ConstantInputError` | Re-export |

**Exports:**
- Constants: `BRIDGE_EQUATIONS`
- Re-exports:

  ```text
  BridgeEquationEntry, BridgeEquationStatus, BridgeIssueFixable, BridgeIssueSeverity, KnownIssue,
  BCS_GAP_RATIO, JOSEPHSON_CONSTANT_SI, LANE_EMDEN_OMEGA3, LORENZ_NUMBER_SI, M_PROTON_SI,
  THOMSON_CROSS_SECTION_SI, VON_KLITZING_SI, CarrierSignError, ConstantInputError
  ```


---

### `src/bridges/input-contract.ts` - The one check of a binding record against an id's declared inputs.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./evaluation-errors.js` | `DuplicateInputError, InputTypeError, MissingInputError, NonFiniteInputError, UnknownInputError` | Import |
| `../dimensional/quantity-registry.js` | `foldName` | Import |
| `../dimensional/formula-names.js` | `synonymDisagreement, synonymGroup` | Import |

**Exports:**
- Interfaces: `ContractAlternate`, `InputSlot`, `InputContract`
- Types: `EvaluationWant`
- Functions: `slotForSpelling`, `repeatedInput`, `parameterContract`, `inputContract`, `checkInputs`

---

### `src/bridges/membership.ts` - Bridge-membership criterion (v0.8.0 G-2) — the computable form.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./index.js` | `BridgeEquationEntry` | Import (type-only) |
| `./rejected.js` | `REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS, RejectedBridgeAdjudication` | Import |

**Exports:**
- Interfaces: `CatalogAdjudicationReport`
- Types: `BridgeVerdict`
- Functions: `adjudicateBridgeEntry`, `adjudicateCatalog`

---

### `src/bridges/notices.ts` - The caveats printed beside a relation's value: the record's own notice, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/symbolic-constants.js` | `constantNotes` | Import |
| `./catalog-types.js` | `CatalogRelation` | Import (type-only) |
| `./expr-parse.js` | `expressionNames` | Import |

**Exports:**
- Functions: `relationNotices`

---

### `src/bridges/observations/types.ts` - Typed observation + confrontation-outcome layer for `upt confront`.

**Exports:**
- Interfaces: `ObservationProvenance`, `SigmaComponent`, `ConfrontationDataHandling`, `ConsistencyComparison`
- Types: `ObservationKind`, `SourceRef`, `SourceRefs`, `ConfrontationPreprocessing`, `ConfrontationIndependence`, `ConfrontationOutcome`
- Functions: `residualInSigma`, `consistencyComparison`, `combineInQuadrature`

---

### `src/bridges/rejected.ts` - Negative catalog — NOT-A-BRIDGE adjudications, projected from the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./catalog-load.js` | `catalogRejections` | Import |

**Exports:**
- Interfaces: `RejectedBridgeAdjudication`
- Constants: `REJECTED_BRIDGE_ADJUDICATIONS`, `REJECTED_BRIDGE_IDS`

---

### `src/bridges/relation-eval.ts` - Evaluate one catalog relation: validity condition, carrier-sign policy,

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/quantity-registry.js` | `quantityRecord` | Import |
| `../core/compare.js` | `withinSymmetric` | Import |
| `./carrier-sign.js` | `applyCarrierSignPolicy, CarrierSignError` | Import |
| `./catalog-types.js` | `CatalogRelation` | Import (type-only) |
| `./expr-parse.js` | `evaluateFormula, formulaNames, formulaScope` | Import |
| `./validity.js` | `conditionDomain, ConditionDomain` | Import |

**Exports:**
- Functions: `relationDomain`, `evaluateCatalogRelation`

---

### `src/bridges/rhs-registry.ts` - Right-hand side of each catalog id that has a relation, projected from

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `./catalog-load.js` | `catalogEntries, parseBridgeId, primaryRelation` | Import |
| `./expr-parse.js` | `parseCatalogExpression` | Import |

**Exports:**
- Constants: `BRIDGE_RHS_BY_ID`

---

### `src/bridges/sensitivity.ts` - Deciding-measurement elasticity for value-kind confrontations. For each

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../numerical/finite-difference.js` | `centralPartial` | Import |
| `./catalog-load.js` | `catalogConfrontations` | Import |
| `./catalog-types.js` | `CatalogPrediction` | Import (type-only) |
| `./evaluators.js` | `BRIDGE_EVALUATORS` | Import |

**Exports:**
- Interfaces: `Elasticity`
- Functions: `predictedAt`, `decidingMeasurement`

---

### `src/bridges/tensor-index.ts` - §VI.6.1 tensor-index component for a catalog category.

**Exports:**
- Types: `TensorIndexComponent`
- Functions: `tensorIndexComponent`
- Constants: `TENSOR_INDEX_PATTERN`, `TENSOR_INDEX_BY_CATEGORY`

---

### `src/bridges/types.ts` - Catalog entry types. The rows themselves live in `data/bridge-catalog.json`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/types.js` | `Conventions, Counterexample, Regime, RelationContract` | Import (type-only) |

**Exports:**
- Interfaces: `KnownIssue`, `BridgeEquationEntry`
- Types: `BridgeEquationStatus`, `BridgeIssueSeverity`, `BridgeIssueFixable`

---

### `src/bridges/validity.ts` - A validity domain read from one condition text, the record's `holds`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./evaluation-errors.js` | `DomainViolation` | Import (type-only) |
| `./holds.js` | `conditionReads, holdsConditions, holdsScope, HoldsError, HoldsCondition` | Import |

**Exports:**
- Interfaces: `ConditionDomain`
- Functions: `conditionDomain`

---

<a id="canonical-dependencies"></a>

## Canonical Dependencies

### `src/canonical/canonical-equation.ts` - Canonical (textbook) physics equations — the ground-truth L-layer of the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `../core/types.js` | `TensorIndices` | Import (type-only) |
| `../dimensional/einstein-equation.js` | `EinsteinFieldEquationNode` | Import (type-only) |
| `../relations/types.js` | `Conventions` | Import (type-only) |

**Exports:**
- Interfaces: `CanonicalForms`, `SourcedPrefactor`, `SourcedGroupPrefactor`, `CanonicalEquation`
- Types: `CanonicalDomain`, `EpistemicStatus`, `FieldEquationNode`

---

### `src/canonical/dimensional-fields.ts` - Compute the L0 dimensional fields of a canonical entry FROM the Buckingham-π

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/buckingham.js` | `dimensionallyDetermines, buckinghamPi` | Import |
| `../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |

**Exports:**
- Functions: `dimensionalFields`

---

### `src/canonical/entries/_l1-build.ts` - Shared builders for L1 (scalar-AST) canonical entries. Keeps the entry files

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `../../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../dimensional-fields.js` | `dimensionalFields` | Import |
| `../../dimensional/ast-builders.js` | `dim` | Re-export |

**Exports:**
- Constants: `op`, `pow`, `l1`
- Re-exports: `dim`

---

### `src/canonical/entries/atomic.ts` - L1 (scalar-AST) canonical entries — atomic-scale derived constants and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ENERGY, LENGTH, AREA, ACTION, CHARGE, FREQUENCY, DIMENSIONLESS, PERMITTIVITY, MOMENTUM` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `ATOMIC`

---

### `src/canonical/entries/condensed-matter.ts` - L1 (scalar-AST) canonical entries — condensed-matter physics. The PILOT batch

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ENERGY, TIME, FREQUENCY, CHARGE, ELECTRIC_FIELD, RESISTIVITY, ACTION, PERMITTIVITY` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `CONDENSED_MATTER`

---

### `src/canonical/entries/dimensional-classics.ts` - L0 (dimensional) canonical entries — the 9 textbook equations recovered by

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/types.js` | `LENGTH, TIME, MASS, VELOCITY, ACCELERATION, FORCE, ACTION, ENTROPY, TEMPERATURE, GRAVITATIONAL_CONSTANT, LINEAR_DENSITY` | Import |

**Exports:**
- Constants: `DIMENSIONAL_CLASSICS`

---

### `src/canonical/entries/electromagnetism.ts` - L1 (scalar-AST) canonical entries — electromagnetism & circuits. The standard

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ACCELERATION, ENERGY, POWER, LENGTH, AREA, TIME, FREQUENCY, CHARGE, FORCE, DIMENSIONLESS, RESISTANCE, RESISTIVITY, CAPACITANCE, INDUCTANCE, ELECTRIC_FIELD, PERMITTIVITY, ENERGY_FLUX, WAVENUMBER, PRESSURE` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `ELECTROMAGNETISM`

---

### `src/canonical/entries/fluids-waves.ts` - L1 (scalar-AST) canonical entries — fluids & waves (classical mechanics).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ACCELERATION, FORCE, LENGTH, AREA, FREQUENCY, ENERGY, PRESSURE, MASS_DENSITY, VOLUME, VISCOSITY, SPRING_CONSTANT` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `FLUIDS_WAVES`

---

### `src/canonical/entries/mechanics.ts` - L1 (scalar-AST) canonical entries — classical mechanics. The foundational

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ENERGY, FORCE, ACCELERATION, LENGTH, TIME, POWER, FREQUENCY, DIMENSIONLESS, MOMENTUM, ACTION, SPRING_CONSTANT, GRAVITATIONAL_CONSTANT` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `MECHANICS`

---

### `src/canonical/entries/nonmonomial.ts` - L1-sum tier — the FIRST canonical entries whose RHS is a genuine

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `DIMENSIONLESS, TIME, PRESSURE, MASS_DENSITY, VELOCITY, ACCELERATION, LENGTH, FREQUENCY, ENERGY, ACTION, TEMPERATURE, ENTROPY, MASS, WAVENUMBER, ENERGY_FLUX` | Import |
| `./_l1-build.js` | `op, pow, l1` | Import |

**Exports:**
- Constants: `NONMONOMIAL`

---

### `src/canonical/entries/relativity.ts` - Relativity canonical entries: the Einstein field equation (L2 — a structural

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/einstein-equation.js` | `EinsteinFieldEquationNode` | Import (type-only) |
| `../../dimensional/curvature.js` | `EinsteinTensorNode` | Import (type-only) |
| `../../dimensional/stress-energy-validators.js` | `StressEnergyTensorNode, CosmologicalConstantNode` | Import (type-only) |
| `../../dimensional/metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `../../dimensional/connection-validators.js` | `RiemannTensorNode` | Import (type-only) |
| `../../dimensional/metric.js` | `metric` | Import |
| `../../dimensional/tensor.js` | `tsym` | Import |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `LENGTH, DIMENSIONLESS, MASS, VELOCITY, ACTION, ENTROPY, TEMPERATURE, AREA, FORCE, PRESSURE, GRAVITATIONAL_CONSTANT, MASS_DENSITY` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `RELATIVITY`

---

### `src/canonical/entries/statistical-mechanics.ts` - L1 (scalar-AST) canonical entries — statistical mechanics. 4 standard

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ENERGY, TEMPERATURE` | Import |
| `./_l1-build.js` | `dim, op, l1` | Import |

**Exports:**
- Constants: `STATISTICAL_MECHANICS`

---

### `src/canonical/entries/thermo-nuclear-cosmo.ts` - L1 (scalar-AST) canonical entries — thermodynamic, statistical, nuclear, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../../dimensional/ast-builders.js` | `sym` | Import |
| `../../dimensional/types.js` | `MASS, VELOCITY, ENERGY, LENGTH, TIME, FREQUENCY, TEMPERATURE, ENTROPY, DIMENSIONLESS, SPECIFIC_HEAT, ENERGY_FLUX, PRESSURE, VOLUME, THERMAL_CONDUCTIVITY, MASS_DENSITY, DIFFUSIVITY` | Import |
| `./_l1-build.js` | `dim, op, pow, l1` | Import |

**Exports:**
- Constants: `THERMO_NUCLEAR_COSMO`

---

### `src/canonical/fixed-points.ts` - One owner for "a constant times that one".

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../numerical/statistics.js` | `ratioSpread` | Import |

**Exports:**
- Interfaces: `FixedPointScheme`, `ConstantRatioOptions`, `ConstantRatio`, `PrefactorRecoveryScheme`, `PrefactorRecovery`
- Types: `RatioStatistic`
- Functions: `fixedPoint`, `constantRatio`, `recoverMonomialPrefactor`
- Constants: `FIXED_POINT_EXPONENTS`

---

### `src/canonical/linkage.ts` - Bridge↔canonical linkage (Sub-project B) — the "validate against standard

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/algebra.js` | `isDimensionless` | Import |
| `../composition/expr-eval.js` | `evalExpr` | Import |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf, isDecimalLiteral` | Import |
| `../dimensional/symbolic-constants.js` | `isRegisteredConstant` | Import |
| `./canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `./registry.js` | `CANONICAL_EQUATIONS, canonicalById` | Import |
| `./normal-form.js` | `canonicalQuantityName, normalForm` | Import |
| `./structural.js` | `bridgeShapes, classifyStructure` | Import |
| `./structural.js` | `BridgeShape` | Import (type-only) |
| `./fixed-points.js` | `FIXED_POINT_EXPONENTS, constantRatio, fixedPoint` | Import |

**Exports:**
- Interfaces: `RecoveryOutcome`, `LinkageResult`
- Functions: `numericalRecovery`, `classifyLinkage`, `scanLinkages`

---

### `src/canonical/normal-form.ts` - Normalized structural form of a scalar `ExprNode`, **up to dimensionless

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/algebra.js` | `equals, isDimensionless` | Import |
| `../dimensional/formula-names.js` | `DIMENSION_RENAMES, quantityIdForSpelling` | Import |
| `../dimensional/symbolic-constants.js` | `isRegisteredConstant, piMultipleValue` | Import |
| `../dimensional/ast-leaves.js` | `isDecimalLiteral` | Import |

**Exports:**
- Functions: `canonicalQuantityName`, `normalForm`, `structurallyEqual`

---

### `src/canonical/registry.ts` - The canonical-equation registry — the queryable index of the L-layer.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./canonical-equation.js` | `CanonicalEquation, CanonicalDomain` | Import (type-only) |
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `./entries/dimensional-classics.js` | `DIMENSIONAL_CLASSICS` | Import |
| `./entries/relativity.js` | `RELATIVITY` | Import |
| `./entries/mechanics.js` | `MECHANICS` | Import |
| `./entries/electromagnetism.js` | `ELECTROMAGNETISM` | Import |
| `./entries/fluids-waves.js` | `FLUIDS_WAVES` | Import |
| `./entries/thermo-nuclear-cosmo.js` | `THERMO_NUCLEAR_COSMO` | Import |
| `./entries/atomic.js` | `ATOMIC` | Import |
| `./entries/condensed-matter.js` | `CONDENSED_MATTER` | Import |
| `./entries/statistical-mechanics.js` | `STATISTICAL_MECHANICS` | Import |
| `./entries/nonmonomial.js` | `NONMONOMIAL` | Import |

**Exports:**
- Functions: `canonicalById`, `canonicalByDomain`, `canonicalByTarget`, `partneredBridgeIds`, `bridgesWithoutCanonicalPartner`
- Constants: `CANONICAL_EQUATIONS`, `CANONICAL_BY_ID`

---

### `src/canonical/residual.ts` - Residual form of a canonical equation: `target − scalarAst`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-builders.js` | `dim, sym, symbolPower` | Import |
| `./canonical-equation.js` | `CanonicalEquation` | Import (type-only) |

**Exports:**
- Functions: `canonicalResidual`, `monomialResidual`

---

### `src/canonical/seed-l-layer.ts` - Seed the canonical-equation registry into the tensor's L-layer (Π = L + B + E)

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../core/types.js` | `PhysicalLaw, TensorConfig` | Import (type-only) |
| `../core/tensor.js` | `UniversalTensor` | Import |
| `./registry.js` | `CANONICAL_EQUATIONS` | Import |

**Exports:**
- Functions: `canonicalToLaw`, `seedCanonicalLaws`
- Constants: `CANONICAL_TENSOR_CONFIG`

---

### `src/canonical/structural.ts` - Structural half of a bridge↔canonical comparison, shared with the chain

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `compareCodepoint` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/algebra.js` | `exactlyEquals` | Import |
| `../dimensional/validator.js` | `validate` | Import |
| `../bridges/rhs-registry.js` | `BRIDGE_RHS_BY_ID` | Import |
| `./registry.js` | `CANONICAL_EQUATIONS` | Import |
| `./normal-form.js` | `normalForm` | Import |

**Exports:**
- Interfaces: `StructuralPair`, `StructuralOptions`, `StructuralRelation`, `ChainConfirmation`, `ChainRestatement`, `ChainProvisional`, `BridgeShape`
- Types: `ChainClassification`
- Functions: `bridgeShapes`, `classifyStructure`

---

<a id="cases-dependencies"></a>

## Cases Dependencies

### `src/cases/catalog-checks.ts` - Check records (expr + bound) for the applied-case catalog. Declarative prose lives

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./catalog.js` | `AppliedCaseCheckRecord` | Import (type-only) |

**Exports:**
- Constants: `CHECKS_BY_CASE_ID`

---

### `src/cases/catalog.ts` - The applied-case catalog: `data/applied-cases.json`, validated at load.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/data-file.js` | `checkedDataFile, dataSchema, parseDataFile` | Import |
| `../bridges/catalog-load.js` | `catalogRelations` | Import |
| `../core/json-schema.js` | `JsonSchema` | Import (type-only) |
| `../bridges/evaluators.js` | `EvaluatorParameter` | Import (type-only) |
| `./types.js` | `AppliedCase, CaseComparison, CaseExample` | Import (type-only) |

**Exports:**
- Interfaces: `AppliedCaseCheckRecord`, `AppliedCaseOutputRecord`, `AppliedCaseRecord`, `AppliedCaseFile`
- Functions: `isForbiddenCaseModule`, `readAppliedCaseFile`, `catalogSemanticProblems`, `appliedCaseCatalog`, `appliedCaseRecord`, `projectAppliedCaseRecord`, `assembleAppliedCase`, `appliedCaseIds`
- Constants: `FORBIDDEN_PER_CASE_MODULES`

---

### `src/cases/engine.ts` - Evaluate applied-case outputs and checks from catalog `expr`, `relation`, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/catalog-load.js` | `catalogRelations` | Import |
| `../bridges/relation-eval.js` | `evaluateCatalogRelation` | Import |
| `../bridges/expr-parse.js` | `evaluateFormula` | Import |
| `../dimensional/units.js` | `convertValue` | Import |
| `./catalog.js` | `AppliedCaseCheckRecord, AppliedCaseOutputRecord, AppliedCaseRecord` | Import (type-only) |
| `./types.js` | `check, requirePositive, CaseCheck, CaseResult` | Import |

**Exports:**
- Types: `CaseOutputMethod`
- Functions: `registerCaseMethods`, `usesCatalogEngine`, `runAppliedCaseEngine`

---

### `src/cases/index.ts` - The applied-case registry behind `upt evaluate case-<id>`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./catalog.js` | `appliedCaseCatalog` | Import |
| `./methods.js` | `APPLIED_CASE_RUNNERS` | Import |
| `./types.js` | `AppliedCase, CaseResult` | Import (type-only) |
| `../bridges/input-contract.js` | `checkInputs, parameterContract, InputContract` | Import |
| `./types.js` | `AppliedCase, CaseCheck, CaseComparison, CaseExample, CaseOutput, CaseResult` | Re-export (type-only) |

**Exports:**
- Functions: `runAppliedCase`
- Constants: `APPLIED_CASES`, `CASE_CONTRACTS`
- Re-exports: `AppliedCase`, `CaseCheck`, `CaseComparison`, `CaseExample`, `CaseOutput`, `CaseResult`

---

### `src/cases/methods.ts` - Numeric methods and case runners for applied cases (Part B catalog).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `findRoot` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `C_SI, EPS0_SI, G_SI, H_SI, K_B_SI, MU0_SI, SIGMA_SB_SI` | Import |
| `../dimensional/units.js` | `convertValue` | Import |
| `../bridges/catalog-load.js` | `catalogRelations` | Import |
| `../bridges/relation-eval.js` | `evaluateCatalogRelation` | Import |
| `../numerical/null-ray-integrator.js` | `integrateRK4` | Import |
| `./quadrature.js` | `adaptiveQuadrature` | Import |
| `./catalog.js` | `appliedCaseCatalog, appliedCaseRecord, assembleAppliedCase, catalogSemanticProblems` | Import |
| `./engine.js` | `runAppliedCaseEngine, usesCatalogEngine, registerCaseMethods` | Import |
| `./types.js` | `check, requirePositive, signedRelativeDifference, AppliedCase, CaseResult, LumpedRadiating` | Import |
| `./types.js` | `LumpedRadiating` | Re-export (type-only) |
| `../core/constants.js` | `SIGMA_SB_SI` | Re-export |

**Exports:**
- Functions:

  ```text
  maxwellDepthFactor, skinDeltaMaxwellM, runCaseSkinDepth, runCaseKeplerRv, windowedLinewidthHz,
  windowedLinewidthCatalogHz, runCaseDampedResonator, runCaseResistorNoise,
  lumpedRadiatingTemperature, sphereEigenvalues, sphereSeries, runCaseLumpedCooling, ballisticDeficit,
  hydrodynamicMsdRatio, faxenParallel, brennerPerpendicular, brownianSphereRegimeAt,
  runCaseBrownianSphere
  ```

- Constants:

  ```text
  MAX_DISPLACEMENT_RATIO, MAX_MFP_RATIO, MAX_OMEGA_TAU, MIN_THICKNESS_RATIO, JULIAN_YEAR_S,
  MAX_MASS_RATIO, MAX_RADIUS_RATIO, MAX_WEAK_FIELD, MAX_APSIDAL_MISFIT, MIN_Q_LORENTZIAN,
  MAX_RESOLUTION_RATIO, MAX_THERMAL_RATIO, CLASSICAL_MAX_X, FLAT_BAND_MAX_WRC,
  AMPLIFIER_MAX_REL_SIGMA, MAX_BIOT, MAX_RADIATION_RATIO, G_STANDARD, MAX_RE, MAX_TAU_P_RATIO,
  MAX_MEMORY_CORRECTION, MAX_DRIFT_RATIO, MAX_WALL_CORRECTION, MAX_FAXEN_LAST_TERM,
  MAX_WALL_EXCURSION, APPLIED_CASE_RUNNERS, CASE_METHOD_NAMES, CASE_METHODS, SKIN_DEPTH_CASE,
  KEPLER_RV_CASE, DAMPED_RESONATOR_CASE, RESISTOR_NOISE_CASE, LUMPED_COOLING_CASE,
  BROWNIAN_SPHERE_CASE
  ```

- Re-exports: `LumpedRadiating`, `SIGMA_SB_SI`

---

### `src/cases/quadrature.ts` - Adaptive quadrature for the parent-model comparisons of the applied cases:

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `quad` |

**Exports:**
- Functions: `adaptiveQuadrature`

---

### `src/cases/types.ts` - An applied case: one complete measurement problem, qualified end to end.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/evaluators.js` | `EvaluatorParameter` | Import (type-only) |

**Exports:**
- Interfaces: `CaseOutput`, `CaseCheck`, `CaseComparison`, `CaseExample`, `CaseResult`, `LumpedRadiating`, `AppliedCase`
- Functions: `signedRelativeDifference`, `requirePositive`
- Constants: `check`

---

<a id="cli-dependencies"></a>

## Cli Dependencies

### `src/cli/args.ts` - Hand-written declarative flag parser for the UPT CLI.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `UsageError` | Import |

**Exports:**
- Interfaces: `FlagSpec`, `ParsedArgs`, `PositionalArity`
- Functions: `optionTokens`, `refuseExtraPositionals`, `parseArgs`
- Constants: `END_OF_OPTIONS`, `NO_POSITIONALS`

---

### `src/cli/bindings.ts` - The one reader of `name=value` tokens for every command that takes them

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/assignment.js` | `splitAssignment` | Import |
| `./errors.js` | `CliError, UsageError` | Import |

**Exports:**
- Interfaces: `Assignment`
- Functions: `splitAssignments`

---

### `src/cli/closed-form-range.ts` - The closed-form range `upt evaluate` prints, read from the evaluator

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/evaluators.js` | `BRIDGE_EVALUATORS` | Import |

**Exports:**
- Functions: `formatClosedFormRange`, `closedFormRangeLabel`

---

### `src/cli/command.ts` - Command registry + the `Command`/`CommandCtx` contract for the UPT CLI.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./args.js` | `ParsedArgs, FlagSpec, PositionalArity` | Import (type-only) |
| `../cli-api.js` | `*` | Import (type-only) |

**Exports:**
- Interfaces: `CommandCtx`, `CommandSub`, `Command`
- Types: `CommandGroup`
- Functions: `registerCommand`, `resolveCommand`, `listCommandNames`, `registerForTest`, `clearRegistryForTest`

---

### `src/cli/commands/_atlas-map.ts` - `upt map --route=FROM,TO` and `upt map --family=NAME` — focused maps of the

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `child_process` | `execFileSync` |
| `fs` | `readFileSync` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../command.js` | `CommandCtx` | Import (type-only) |
| `../errors.js` | `CliError` | Import |
| `../published-url.js` | `publishedUrl` | Import |
| `../stored-results.js` | `repoRoot, STORED_RESULTS_PATH, storedResultsFile` | Import |
| `../../cli-api.js` | `AppliedTransport, AtlasBridge, AtlasModel` | Import (type-only) |
| `../../atlas/types.js` | `EvidenceTag, RelationType` | Import (type-only) |
| `./regime.js` | `showInequality` | Import |
| `./_atlas-route.js` | `claimReport, explainsRefusal, missingForComposite, routeClaim, selectRoute, transportReport, TransportReport` | Import |

**Exports:**
- Interfaces:

  ```text
  EquationLink, ModelView, EvidenceView, WitnessResultRow, StoredProvenance, WitnessResults,
  WitnessOutcomes, ResultsTally, BridgeView, RouteView, CompositeEvidenceView, RoutesView,
  ObservableView, AtlasEvidenceView, AtlasFilter, AtlasFilterStats, FamilyView
  ```

- Types: `ResultsMode`, `TransportResult`, `AtlasView`
- Functions:

  ```text
  loadStoredResults, runResults, parseRoute, buildRouteView, buildRoutesView, buildObservableView,
  buildAtlasEvidenceView, atlasEvidenceText, bridgeIdsOf, buildFamilyView, routeText, familyText,
  routesText, observableText, viewLegend, toMermaid, toDot
  ```

- Constants: `DEFAULT_MAX_ROUTES`, `MAX_ROUTES_CEILING`

---

### `src/cli/commands/_atlas-route.ts` - The atlas route between two models, and what composing it yields — shared by

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../command.js` | `CommandCtx` | Import (type-only) |
| `../errors.js` | `CliError` | Import |
| `../../cli-api.js` | `AppliedTransport, AtlasBridge` | Import (type-only) |
| `../published-url.js` | `publishedUrl` | Import |

**Exports:**
- Types: `RouteClaim`, `TransportReport`
- Functions: `selectRoute`, `routeClaim`, `missingForComposite`, `explainsRefusal`, `transportReport`, `claimReport`

---

### `src/cli/commands/_discovery-opts.ts` - Shared `--max-orders`/`--anchor` parsing — used by both `discover` and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `ParsedArgs` | Import (type-only) |
| `../command.js` | `CommandCtx` | Import (type-only) |
| `../errors.js` | `CliError, UsageError` | Import |
| `../numeric-flag.js` | `realFlag` | Import |
| `../../composition/discovery.js` | `DiscoveryOptions` | Import (type-only) |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Functions: `parseDiscoveryOpts`

---

### `src/cli/commands/atlas.ts` - `upt atlas [<bridge-id>]` — one atlas bridge with EVERY qualification visible.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, EXIT_CHECK_FAILED` | Import |
| `../output.js` | `emitJson` | Import |
| `./_atlas-map.js` | `atlasEvidenceText, buildAtlasEvidenceView, loadStoredResults, runResults, WitnessResults` | Import |
| `../published-url.js` | `publishedUrl` | Import |

**Exports:**
- Functions: `summarizeWitnessRuns`
- Constants: `command`

---

### `src/cli/commands/audit.ts` - `upt audit` — try to derive every bridge equation by dimensions. Transposed

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/axes.ts` - `upt axes` — the axis-discrimination audit. Reproduces from the CLI the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../published-url.js` | `publishedUrl` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/candidates.ts` - `upt candidates` — propose candidate cross-cluster links (quantities of the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph, coreAnchor, coreLine` | Import |
| `../output.js` | `emitJson` | Import |
| `../published-url.js` | `adjudicationSourceUrls` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/canonical.ts` - `upt canonical` — list the canonical-equation (standard-physics L-layer)

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/chain.ts` - `upt chain` names the chain orchestrator and does not run it.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command` | Import |
| `../flag-help.js` | `commandHelp` | Import |
| `../published-url.js` | `publishedUrl` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/confront.ts` - `upt confront` — run the catalog's committed real-data confrontations and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, UsageError` | Import |
| `../output.js` | `emitJson` | Import |
| `../published-url.js` | `publishedUrl` | Import |
| `../../cli-api.js` | `RigorTier` | Import (type-only) |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/connectors.ts` - `upt connectors` — of the isolated bridges, which could connect to the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph, coreAnchor, coreLine` | Import |
| `../output.js` | `emitJson` | Import |
| `../published-url.js` | `publishedUrl` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/coverage.ts` - `upt coverage` — audit the catalog's empirical grounding. Transposed

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/derive.ts` - `upt derive` — derive the caller's own equation's dimensional form, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `UsageError` | Import |
| `../determination.js` | `classifyDetermination` | Import |
| `../version.js` | `formulaParserLabel` | Import |
| `../euler-guard.js` | `FormulaUsageError` | Import |
| `../conventions.js` | `canonicalCheckFailed, conventionLines` | Import |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../library-defaults.js` | `NAMED_DIMENSIONS_HELP` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/discover.ts` - `upt discover` — vet the link candidates through the inference suite, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph, groundTruthAnchor, groundTruthLine` | Import |
| `../output.js` | `emitJson` | Import |
| `./_discovery-opts.js` | `parseDiscoveryOpts` | Import |
| `../../composition/discovery.js` | `VettedCandidate` | Import (type-only) |
| `../../composition/adjudication.js` | `AnnotatedCandidate` | Import (type-only) |
| `../../bridges/catalog-types.js` | `AdjudicationVerdict` | Import (type-only) |
| `../library-defaults.js` | `DISCOVER_MAX_ORDERS_DEFAULT` | Import |
| `../published-url.js` | `adjudicationSourceUrls` | Import |
| `../../composition/consequence.js` | `ConsequenceSignal, ConsequenceEvidence` | Import (type-only) |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/eval.ts` - `upt eval` — evaluate the caller's own scalar formula (safe — arithmetic

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `CliError, UsageError` | Import |
| `../version.js` | `formulaParserLabel` | Import |
| `../euler-guard.js` | `FormulaUsageError` | Import |
| `../eval-numbers.js` | `codataScope` | Import |
| `../bindings.js` | `splitAssignments` | Import |
| `../../dimensional/natural-units.js` | `UnitMode` | Import (type-only) |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/evaluate.ts` - `upt evaluate <be-NN | case-id> key=value …` — numerically evaluate a closed-form /

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson, emitJsonError` | Import |
| `../expr-print.js` | `primaryUnitLabel` | Import |
| `../bindings.js` | `splitAssignments` | Import |
| `../numeric-flag.js` | `realFlag` | Import |
| `../errors.js` | `UsageError` | Import |
| `../errors.js` | `CliError` | Import |
| `../../cli-api.js` | `AppliedCase, CaseResult, EvaluatorParameter, PropagatedOutput` | Import (type-only) |
| `../closed-form-range.js` | `closedFormRangeLabel` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/explain.ts` - `upt explain` — explain how the graph determines a quantity: the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph` | Import |
| `../output.js` | `emitJson` | Import |
| `../bindings.js` | `splitAssignments` | Import |
| `../errors.js` | `UsageError, CliError` | Import |
| `../search-index.js` | `searchNameWords` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/frontier.ts` - `upt frontier` — the two lists from the frontier and null-result design.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/ground.ts` - `upt ground <quantityA> <quantityB>` — the epistemic-grounding ledger for a

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph, groundTruthAnchor, groundTruthLine, SourceName` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `UsageError, CliError` | Import |
| `./_discovery-opts.js` | `parseDiscoveryOpts` | Import |
| `../library-defaults.js` | `DISCOVER_MAX_ORDERS_DEFAULT` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/index.ts` - Side-effect barrel: importing this module registers every ported CLI

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./priority.js` | `` | Import |
| `./audit.js` | `` | Import |
| `./coverage.js` | `` | Import |
| `./canonical.js` | `` | Import |
| `./recover.js` | `` | Import |
| `./connectors.js` | `` | Import |
| `./predict.js` | `` | Import |
| `./candidates.js` | `` | Import |
| `./frontier.js` | `` | Import |
| `./explain.js` | `` | Import |
| `./symbolic.js` | `` | Import |
| `./eval.js` | `` | Import |
| `./derive.js` | `` | Import |
| `./map.js` | `` | Import |
| `./discover.js` | `` | Import |
| `./confront.js` | `` | Import |
| `./axes.js` | `` | Import |
| `./evaluate.js` | `` | Import |
| `./ground.js` | `` | Import |
| `./probe.js` | `` | Import |
| `./regime.js` | `` | Import |
| `./path.js` | `` | Import |
| `./atlas.js` | `` | Import |
| `./chain.js` | `` | Import |
| `./search.js` | `` | Import |
| `./retrieve.js` | `` | Import |
| `./metric.js` | `` | Import |
| `./testplan.js` | `` | Import |

---

### `src/cli/commands/map.ts` - `upt map` — how the equations LINK: the text linkage map, the visual

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `writeFileSync` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec, ParsedArgs` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph, coreAnchor, coreLine, groundTruthAnchor, groundTruthLine, AnchorScope` | Import |
| `../output.js` | `emitJson` | Import |
| `../published-url.js` | `publishedUrl` | Import |
| `../errors.js` | `UsageError, CliError, EXIT_CHECK_FAILED` | Import |
| `../numeric-flag.js` | `integerFlag` | Import |
| `../determination.js` | `classifyDetermination, Determination` | Import |
| `./_discovery-opts.js` | `parseDiscoveryOpts` | Import |
| `./_atlas-map.js` | `*` | Import |
| `../../cli-api.js` | `BridgeEdge, CanonicalComparison, CommunityReport, DerivationCycle, EquationAnalysis, EvidenceTag, HubRank, RelationType, VizJunction, VizModel` | Import (type-only) |
| `../conventions.js` | `canonicalCheckFailed, conventionLines` | Import |
| `../../cli-api.js` | `UnitMode` | Import (type-only) |
| `../map-evidence.js` | `withCatalogEvidence` | Import |
| `../library-defaults.js` | `DISCOVER_MAX_ORDERS_DEFAULT` | Import |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Functions: `neighbourhood`
- Constants: `command`

---

### `src/cli/commands/metric.ts` - `upt metric` — Christoffel symbols and curvature scalars for a named metric.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `CliError, UsageError` | Import |
| `../bindings.js` | `splitAssignments` | Import |
| `../../cli-api.js` | `MetricId` | Import (type-only) |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/path.ts` - `upt path` — the route between two models of a family, and what that route

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, EXIT_CHECK_FAILED, UsageError` | Import |
| `../output.js` | `emitJson` | Import |
| `../numeric-flag.js` | `integerFlag` | Import |
| `./regime.js` | `parseAt, resolveAtPoint, showInequality` | Import |
| `./_atlas-route.js` | `explainsRefusal, missingForComposite, routeClaim, selectRoute, transportReport, RouteClaim` | Import |
| `../../cli-api.js` | `AtlasBridge, Witness, ObservableTranslation, ObservableCarriage` | Import (type-only) |

**Exports:**
- Classes: `TranslationWithoutBoundError`
- Interfaces: `ToleranceRequest`
- Functions: `parseSweep`, `translatedBound`, `judgeTolerance`, `parseTolerance`, `judgeObservable`, `judgeAtPoint`
- Constants: `command`

---

### `src/cli/commands/predict.ts` - `upt predict` — project the catalog onto the (scale × force) regime plane

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/priority.ts` - `upt priority` — triage the speculative bridges by structural decidability

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/probe.ts` - `upt probe <subverb>` — experimental Product B expression/residual search.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `readFileSync, statSync` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `refuseExtraPositionals, FlagSpec` | Import |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../numeric-flag.js` | `realFlag` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG, sourceFlag` | Import |
| `../graphs.js` | `resolveGraph` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `UsageError, CliError` | Import |
| `../published-url.js` | `publishedUrl` | Import |
| `../file-errors.js` | `mapFileError` | Import |
| `../library-defaults.js` | `PROBE_BUDGET_MS_DEFAULT, PROBE_CORRECTION_TERMS_MAX, PROBE_HOLDOUT_TOL_DEFAULT, PROBE_STUDY_ALPHA_DEFAULT` | Import |

**Exports:**
- Functions: `emptySearchableWarning`
- Constants: `command`

---

### `src/cli/commands/recover.ts` - `upt recover` — validate bridges against standard physics (bridge↔canonical

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/regime.ts` - `upt regime` — where in parameter space a family's models are claimed to

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, EXIT_CHECK_FAILED, UsageError` | Import |
| `../output.js` | `emitJson` | Import |
| `../bindings.js` | `splitAssignments` | Import |

**Exports:**
- Functions: `parseAt`, `resolveAtPoint`, `showInequality`
- Constants: `command`

---

### `src/cli/commands/retrieve.ts` - `upt retrieve <claim>` — optional embedding proposals, atlas acceptance.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `statSync` |
| `path` | `isAbsolute, relative, resolve` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, UsageError` | Import |
| `../output.js` | `emitJson` | Import |
| `../file-errors.js` | `mapFileError` | Import |
| `../stored-results.js` | `repoRoot` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/search.ts` - `upt search <word> ...` — find a law, model, bridge or quantity by the words

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../errors.js` | `CliError, UsageError` | Import |
| `../output.js` | `emitJson` | Import |
| `../search-index.js` | `buildSearchIndex, fold, matchEveryWord, queryWords, SEARCH_SECTIONS, STOP_WORDS` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/symbolic.ts` - `upt symbolic` — compose bridges' SYMBOLIC (AST) forms, not just their

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../expr-print.js` | `EVAL_STUBS, primaryUnitLabel, printDisplay, printEval, printLatex, latexName` | Import |

**Exports:**
- Constants: `command`

---

### `src/cli/commands/testplan.ts` - `upt testplan` — the measurement plan already stored on a case or a

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../args.js` | `FlagSpec` | Import (type-only) |
| `../command.js` | `registerCommand, Command, CommandCtx` | Import |
| `../flag-help.js` | `commandHelp, JSON_FLAG` | Import |
| `../output.js` | `emitJson` | Import |
| `../errors.js` | `UsageError, CliError` | Import |
| `../../cases/types.js` | `AppliedCase` | Import (type-only) |
| `../../bridges/observations/types.js` | `ConfrontationOutcome` | Import (type-only) |

**Exports:**
- Constants: `command`

---

### `src/cli/conventions.ts` - Convention lines the CLI prints beside a comparison.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical/registry.js` | `canonicalById` | Import |

**Exports:**
- Functions: `canonicalCheckFailed`, `conventionLines`

---

### `src/cli/determination.ts` - One exit for a result the user asked to have determined.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `EXIT_CHECK_FAILED` | Import |

**Exports:**
- Interfaces: `Determination`
- Functions: `classifyDetermination`

---

### `src/cli/errors.ts` - Typed error classes and exit codes for the UPT CLI.

**Exports:**
- Classes: `UsageError`, `CliError`
- Constants: `EXIT_CHECK_FAILED`

---

### `src/cli/euler-guard.ts` - Name the active formula parser on an error a script can read.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `UsageError` | Import |

**Exports:**
- Classes: `FormulaUsageError`

---

### `src/cli/eval-numbers.ts` - Numbers `upt eval` understands: a bare numeral, a numeral with a unit, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/symbolic-constants.js` | `constantScope` | Import |
| `../dimensional/natural-units.js` | `naturalConstantOverrides, UnitMode` | Import |

**Exports:**
- Functions: `codataScope`

---

### `src/cli/expr-print.ts` - The three printed forms of a scalar composed AST (`upt symbolic`, audit F12 and I10):

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/algebra.js` | `BASES, exactlyEquals, isDimensionless, SI_BASE, siUnitOf` | Import |
| `../dimensional/ast-leaves.js` | `isDecimalLiteral` | Import |

**Exports:**
- Interfaces: `CoherentUnit`
- Functions: `latexName`, `printLatex`, `primaryUnitLabel`
- Constants: `EVAL_STUBS`, `printDisplay`, `printEval`

---

### `src/cli/file-errors.ts` - Maps a failure to read or parse an input file to a `CliError`, so no stack trace reaches the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./command.js` | `CommandCtx` | Import (type-only) |
| `./errors.js` | `CliError, UsageError` | Import |

**Exports:**
- Functions: `mapFileError`

---

### `src/cli/flag-help.ts` - Flag text for `upt help` and for `docs/CLI.md`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./args.js` | `FlagSpec` | Import (type-only) |

**Exports:**
- Functions: `sourceFlag`, `flagHeading`, `renderFlagCatalog`, `commandHelp`, `undocumentedFlags`
- Constants: `JSON_FLAG`, `GLOBAL_FLAGS`, `BUILTIN_VERBS`

---

### `src/cli/graphs.ts` - Shared `--source=catalog|canonical|both` graph resolution — replaces

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../composition/edge.js` | `BridgeEdge` | Import (type-only) |
| `./args.js` | `ParsedArgs` | Import (type-only) |
| `./command.js` | `CommandCtx` | Import (type-only) |
| `./errors.js` | `CliError` | Import |

**Exports:**
- Interfaces: `AnchorScope`
- Types: `SourceName`
- Functions: `resolveGraph`, `groundTruthAnchor`, `coreAnchor`, `groundTruthLine`, `coreLine`

---

### `src/cli/library-defaults.ts` - The defaults and limits a command's help states, read from the library constants that hold

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../composition/discovery.js` | `DEFAULT_MAX_ORDERS_OF_MAGNITUDE` | Import |
| `../composition/probe/types.js` | `DEFAULT_HOLDOUT_TOL, DEFAULT_SEARCH_BUDGET` | Import |
| `../composition/probe/study.js` | `DEFAULT_ALPHA, MAX_CORRECTION_TERMS` | Import |
| `../dimensional/dimension-spec.js` | `NAMED_DIMENSION_NAMES` | Import |

**Exports:**
- Constants: `DISCOVER_MAX_ORDERS_DEFAULT`, `PROBE_BUDGET_MS_DEFAULT`, `PROBE_HOLDOUT_TOL_DEFAULT`, `PROBE_STUDY_ALPHA_DEFAULT`, `PROBE_CORRECTION_TERMS_MAX`, `NAMED_DIMENSIONS_HELP`

---

### `src/cli/main.ts` - Verb-first dispatcher for the UPT CLI — `upt <command> [args...]`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../cli-api.js` | `*` | Import |
| `./errors.js` | `UsageError, CliError` | Import |
| `./args.js` | `optionTokens, parseArgs` | Import |
| `./version.js` | `packageVersion` | Import |
| `./statuses.js` | `glossaryText` | Import |
| `./command.js` | `listCommandNames, resolveCommand, Command, CommandCtx` | Import |
| `./flag-help.js` | `GLOBAL_FLAGS` | Import |
| `./top-level-help.js` | `renderTopLevelHelp` | Import |
| `./record.js` | `recordInvocation, replayRecord, showRecord, Io` | Import |
| `./commands/index.js` | `` | Import |

**Exports:**
- Functions: `reportInternalError`, `runCli`

---

### `src/cli/map-evidence.ts` - Catalog evidence for `upt map`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../relations/types.js` | `EvidenceTag` | Import (type-only) |
| `../atlas/derive-evidence.js` | `catalogEvidenceInput, deriveEvidenceForVerdict, NO_PASSING_WITNESSES` | Import |
| `../bridges/membership.js` | `adjudicateBridgeEntry` | Import |
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |

**Exports:**
- Functions: `deriveEdgeEvidence`, `withCatalogEvidence`

---

### `src/cli/numeric-flag.ts` - The one reader of a numeric flag value for the UPT CLI.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-leaves.js` | `DECIMAL_LITERAL` | Import |
| `./errors.js` | `UsageError` | Import |

**Exports:**
- Functions: `integerFlag`, `realFlag`

---

### `src/cli/output.ts` - JSON output envelope for the UPT CLI.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./statuses.js` | `definitionsFor` | Import |
| `./errors.js` | `UsageError, CliError` | Import |
| `./graphs.js` | `AnchorScope` | Import (type-only) |

**Exports:**
- Interfaces: `JsonErrorEnvelope`, `JsonEnvelope`
- Functions: `emitJsonError`, `sanitize`, `emitJson`

---

### `src/cli/published-url.ts` - A path in this repository, as a GitHub blob URL on `master`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../composition/adjudication.js` | `ADJUDICATIONS` | Import |

**Exports:**
- Functions: `publishedUrl`, `adjudicationSourceUrls`

---

### `src/cli/record-reach.ts` - Static attribution for an experiment record: which constants a command's code can reach

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `existsSync, readFileSync` |
| `path` | `dirname, join, resolve, sep` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/hash.js` | `sha256Hex` | Import |
| `./record-tables.js` | `MODULE_EXT, SOURCE_ROOT, tableName, TableKind` | Import |

**Exports:**
- Interfaces: `Attribution`
- Functions: `sourceHash`, `moduleSources`, `staticReach`
- Constants: `REACH_METHOD`

---

### `src/cli/record-tables.ts` - The constant tables an experiment record fingerprints, each under its own name so replay can

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `readdirSync, statSync` |
| `path` | `extname, join, relative, sep` |
| `url` | `fileURLToPath, pathToFileURL` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `compareCodepoint` | Import |
| `../core/hash.js` | `sha256Hex` | Import |
| `../composition/canonical-graph.js` | `CANONICAL_CONSTANTS` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANTS` | Import |
| `../dimensional/algebra.js` | `BASES` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/units.js` | `unitTables` | Import |

**Exports:**
- Interfaces: `ConstantTable`
- Types: `TableValue`, `TableKind`
- Functions: `constantTables`
- Constants: `SOURCE_ROOT`, `MODULE_EXT`, `tableFingerprint`, `tableName`

---

### `src/cli/record.ts` - Experiment record and replay for the UPT CLI — the global options

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `appendFileSync, closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync` |
| `os` | `tmpdir` |
| `path` | `basename, join` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/data-file.js` | `readJsonFile` | Import |
| `../core/hash.js` | `sha256Hex` | Import |
| `../cli-api.js` | `*` | Import (type-only) |
| `./args.js` | `parseArgs` | Import |
| `./command.js` | `resolveCommand` | Import |
| `./stored-results.js` | `storedResultsFile` | Import |
| `./errors.js` | `CliError, UsageError` | Import |
| `./output.js` | `emitJson` | Import |
| `./record-reach.js` | `moduleSources, staticReach, Attribution` | Import |
| `./record-tables.js` | `constantTables, tableFingerprint, ConstantTable` | Import |
| `../composition/canonical-json.js` | `canonicalJson, captureEnvironment` | Import |
| `./version.js` | `packageVersion, peerVersions` | Import |

**Exports:**
- Interfaces: `RecordEnvironment`, `RecordResult`, `RecordEntry`, `RecordInput`, `EnvironmentChange`, `StreamDifference`, `ReplayEntryReport`
- Types: `Io`, `Dispatch`, `Reach`, `ReplayOutcome`
- Functions: `recordInvocation`, `replayRecord`, `showRecord`

---

### `src/cli/search-index.ts` - The word index behind `upt search`, shared with `upt explain`'s NOT COVERED answer (audit I5).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./command.js` | `CommandCtx` | Import (type-only) |

**Exports:**
- Interfaces: `SearchEntry`, `PrefixMatch`, `SearchMatch`
- Types: `SearchKind`
- Functions: `queryWords`, `buildSearchIndex`, `matchEveryWord`, `searchNameWords`
- Constants: `SEARCH_SECTIONS`, `STOP_WORDS`, `fold`

---

### `src/cli/statuses.ts` - The status words the CLI prints, defined once (audit I13).

**Exports:**
- Interfaces: `StatusDefinition`
- Functions: `definitionsFor`, `glossaryText`
- Constants: `STATUS_GLOSSARY`

---

### `src/cli/stored-results.ts` - Where the committed witness-results artifact is: the one owner of the path that

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `path` | `join` |
| `url` | `fileURLToPath` |

**Exports:**
- Functions: `repoRoot`, `storedResultsFile`
- Constants: `STORED_RESULTS_PATH`

---

### `src/cli/top-level-help.ts` - `upt --help` is the registered commands' own help, not a second copy.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./args.js` | `FlagSpec` | Import (type-only) |
| `./command.js` | `Command` | Import (type-only) |
| `./flag-help.js` | `renderFlagCatalog` | Import |

**Exports:**
- Functions: `renderTopLevelHelp`

---

### `src/cli/version.ts` - Runtime package-version lookup for the UPT CLI (`upt --version`, etc.).

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `existsSync` |
| `module` | `createRequire` |
| `path` | `join` |
| `url` | `fileURLToPath` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/data-file.js` | `readJsonFile` | Import |

**Exports:**
- Functions: `packageVersion`, `peerVersions`, `formulaParserLabel`

---

<a id="root-dependencies"></a>

## Root Dependencies

### `src/cli-api.ts` - CLI-facing barrel — the single stable entrypoint `bin/upt.mjs` imports.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./relations/domain-regimes.js` | `` | Import |
| `./index.js` | `explainQuantity, CATALOG_GRAPH, CANONICAL_GRAPH, M_SUN_KG, composeSymbolic, format, equals, buildVizModel, renderDotToSvg, equationLanding, analyzeUserEquation, suggestQuantities, buckinghamPi, dimensionallyDetermines` | Re-export |
| `./index.js` | `composeEdges` | Re-export |
| `./composition/user-equation.js` | `formatConnectedSummary` | Re-export |
| `./composition/bridge-analysis.js` | `bridgePriority, attemptDerivation, dimensionalFreedom, linkageMap, proposeLinkCandidates, proposeOrphanConnectors` | Re-export |
| `./numerical/formula-registry.js` | `getFormulaParser, getFormulaParserKind, getFormulaDimensionChecker` | Re-export |
| `./dimensional/dimension-spec.js` | `parseDimensionSpec` | Re-export |
| `./composition/bridge-prediction.js` | `predictMissingBridges` | Re-export |
| `./composition/frontier-account.js` | `catalogFrontierAccount, formatFrontierAccount` | Re-export |
| `./composition/discovery.js` | `rankDiscoveries, ANCHOR_DEFAULT` | Re-export |
| `./composition/discovery.js` | `hasMagnitudeEvidence, isPromisingTier` | Re-export |
| `./bridges/index.js` | `BRIDGE_EQUATIONS` | Re-export |
| `./composition/audit-coverage.js` | `auditCoverage` | Re-export |
| `./bridges/confrontations.js` | `CONFRONTATIONS, listConfrontations, runConfrontation, confrontationRigor, rigorDistribution` | Re-export |
| `./bridges/caller-table.js` | `requestCallerTableConfrontation` | Re-export |
| `./bridges/catalog-load.js` | `catalogEntry, catalogIdNumber, parseBridgeId, primaryRelation` | Re-export |
| `./bridges/catalog-load.js` | `catalogEdgeKey` | Re-export |
| `./dimensional/quantity-registry.js` | `foldName, quantityRecord` | Re-export |
| `./composition/catalog-graph.js` | `demonstrationEdges` | Re-export |
| `./bridges/confrontations.js` | `ConfrontationEntry, RigorTier` | Re-export (type-only) |
| `./bridges/observations/types.js` | `consistencyComparison` | Re-export |
| `./bridges/observations/types.js` | `ConfrontationOutcome` | Re-export (type-only) |
| `./bridges/sensitivity.js` | `decidingMeasurement` | Re-export |
| `./bridges/evaluators.js` | `BRIDGE_EVALUATORS, evaluateBridge` | Re-export |
| `./bridges/evaluation-errors.js` | `DuplicateInputError, InputTypeError, isInputContractError, MissingInputError, NonFiniteInputError, UnknownInputError` | Re-export |
| `./bridges/evaluators.js` | `EvaluatorSpec, EvaluatorParameter` | Re-export (type-only) |
| `./bridges/evaluator-inputs.js` | `resolveEvaluatorInputs` | Re-export |
| `./cases/index.js` | `APPLIED_CASES, runAppliedCase` | Re-export |
| `./cases/index.js` | `CASE_CONTRACTS` | Re-export |
| `./bridges/input-contract.js` | `slotForSpelling` | Re-export |
| `./cases/index.js` | `AppliedCase, CaseCheck, CaseResult` | Re-export (type-only) |
| `./dimensional/units.js` | `convertValue, UnitError, unitRows` | Re-export |
| `./composition/axis-audit.js` | `auditAxisDiscrimination, AUDIT_ALPHA` | Re-export |
| `./composition/axis-audit.js` | `AxisDiscrimination` | Re-export (type-only) |
| `./composition/axes.js` | `AXES` | Re-export |
| `./composition/axes.js` | `AxisSpec` | Re-export (type-only) |
| `./composition/expr-simplify.js` | `simplifyObservable, isSimplifierAvailable` | Re-export |
| `./canonical/registry.js` | `CANONICAL_EQUATIONS, bridgesWithoutCanonicalPartner` | Re-export |
| `./canonical/linkage.js` | `scanLinkages` | Re-export |
| `./composition/proposed-bridges.js` | `deriveProposedBridges` | Re-export |
| `./composition/consequence.js` | `describeDerivedClaim` | Re-export |
| `./composition/graph-viz.js` | `filterEdges, formatFilterLegend` | Re-export |
| `./cli/map-evidence.js` | `deriveEdgeEvidence` | Re-export |
| `./composition/graph-structure.js` | `communitiesOf, derivationCycles, rankHubs` | Re-export |
| `./composition/graph-structure.js` | `CommunityReport, DerivationCycle, HubRank` | Re-export (type-only) |
| `./composition/probe/index.js` | `DEFAULT_SEARCH_BUDGET, scanFrontier, findFrontierGap, expressionSearchGaps, scanWithExpressionGaps, problemFromResidualGap, makeResidualGap, loadSearchProblemFromJson, resolveObservationsPath, parseExprJson, ProblemFileError, runProbeSearch, nodeWorkerArgv, formatProbeReport, loadStudyFromJson, loadStudyFile, runProbeStudy, formatProbeStudy, formatFrontierScan, formatFrontierGap, suggestDiscriminatingPoint, parseDesignBounds, runFalsification, rankPareto` | Re-export |
| `./composition/adjudication.js` | `annotateAdjudications, adjudicationFor, candidateId, ADJUDICATIONS` | Re-export |
| `./composition/adjudication.js` | `AnnotatedCandidate` | Re-export (type-only) |
| `./bridges/catalog-types.js` | `CatalogAdjudication` | Re-export (type-only) |
| `./composition/consequence.js` | `annotateConsequences` | Re-export |
| `./composition/consequence.js` | `ConsequenceAnnotatedCandidate, ConsequenceSignal, ConsequenceEvidence` | Re-export (type-only) |
| `./atlas/conventions.js` | `checkConventions, unknownConventionKeys` | Re-export |
| `./atlas/conventions.js` | `ConventionKey` | Re-export (type-only) |
| `./composition/grounding.js` | `describeGrounding, describeReadiness` | Re-export |
| `./composition/representative-values.js` | `REPRESENTATIVE_VALUES` | Re-export |
| `./composition/canonical-compare.js` | `compareWithCanonical, compareUserEquation, describeComparison, describeComparisons, describeKnownRelation, matchingCatalogEdges` | Re-export |
| `./composition/canonical-compare.js` | `CanonicalComparison, CatalogEdgeMatch, ExponentDifference` | Re-export (type-only) |
| `./composition/canonical-compare.js` | `describeExponentDifference` | Re-export |
| `./canonical/fixed-points.js` | `FIXED_POINT_EXPONENTS, constantRatio, fixedPoint, recoverMonomialPrefactor` | Re-export |
| `./canonical/fixed-points.js` | `ConstantRatio, ConstantRatioOptions, FixedPointScheme, PrefactorRecovery, PrefactorRecoveryScheme, RatioStatistic` | Re-export (type-only) |
| `./dimensional/symbolic-constants.js` | `CONSTANTS, CONSTANT_PROVENANCE` | Re-export |
| `./dimensional/ast-leaves.js` | `isDecimalLiteral` | Re-export |
| `./dimensional/ast-leaves.js` | `forEachScalarLeaf` | Re-export |
| `./composition/grounding.js` | `CandidateGrounding, CandidateReadiness` | Re-export (type-only) |
| `./atlas/oscillators/index.js` | `OSCILLATOR_FAMILY` | Re-export |
| `./atlas/families.js` | `ATLAS_FAMILIES` | Re-export |
| `./atlas/serialize.js` | `normTransportFields` | Re-export |
| `./atlas/derive-evidence.js` | `deriveEvidence, deriveCompositeEvidence, NO_PASSING_WITNESSES, provedWithUnresolvedCounterexample` | Re-export |
| `./atlas/coverage.js` | `summarizeEvidence, ALL_EVIDENCE_TAGS` | Re-export |
| `./atlas/witness-artifact.js` | `runWitnessRegistry` | Re-export |
| `./atlas/witness-specs.js` | `WITNESS_REGISTRY` | Re-export |
| `./atlas/witness-numeric.js` | `runNumericWitness` | Re-export |
| `./atlas/translation-registry.js` | `OBSERVABLE_CARRIAGES, OBSERVABLE_TRANSLATIONS, carriageOf, runTranslationCheck, translationsOf` | Re-export |
| `./atlas/translation.js` | `ObservableCarriage, ObservableTranslation, PointCheck` | Re-export (type-only) |
| `./atlas/family.js` | `AtlasFamily` | Re-export (type-only) |
| `./atlas/regime.js` | `collidingRegimeGroups, regimeHolds, regimeOverlap, uncoveredRegions` | Re-export |
| `./relations/regime-registration.js` | `domainRegimeRegistrations` | Re-export |
| `./atlas/regime.js` | `RegimeCheck, RegimeOverlap, RegionSample` | Re-export (type-only) |
| `./atlas/path-bound.js` | `familyChangeBlocksHorizon, findPath, findAtlasPath, enumerateAtlasRoutes, boundPath, horizonOnRoute, routeEntryModels` | Re-export |
| `./atlas/path-bound.js` | `allAtlasBridges` | Re-export |
| `./atlas/composition-table.js` | `composeRelation` | Re-export |
| `./atlas/path-bound.js` | `PathBoundResult, PathBoundClaim, PathNoClaim, AppliedTransport` | Re-export (type-only) |
| `./atlas/types.js` | `AtlasBridge, RegimeInequality, Witness` | Re-export (type-only) |
| `./atlas/types.js` | `MissingLipschitzError` | Re-export |
| `./atlas/model.js` | `AtlasModel, ModelId` | Re-export (type-only) |
| `./atlas/catalog-formal-ref.js` | `catalogFormalRef` | Re-export |
| `./composition/composition-recovery.js` | `scanCompositionRecovery` | Re-export |
| `./numerical/spacetime-metrics.js` | `curvatureReport, kerrEquatorialCircular, kerrGeodesic, kerrTurningPointOrbit, MetricMassError, MetricValueError, schwarzschildCircularOrbit, MetricId` | Re-export |
| `./core/assignment.js` | `splitAssignment` | Re-export |
| `./numerical/binding-value.js` | `readBinding, bindingInUnit, readNamedBinding, BindingNumberError, TemperatureBindingError` | Re-export |
| `./numerical/evaluator-uncertainty.js` | `propagateEvaluatorUncertainty, correlationIsPositiveSemidefinite` | Re-export |
| `./numerical/evaluator-uncertainty.js` | `PropagatedOutput, UncertaintyContribution` | Re-export (type-only) |
| `./dimensional/symbolic-constants.js` | `constantAgreement, ConstantDisagreementError` | Re-export |
| `./numerical/formula-contract.js` | `FormulaError, FormulaValueError` | Re-export |
| `./composition/aliases.js` | `aliasesForTarget, nearQuantityNames, shareSynonyms` | Re-export |
| `./dimensional/formula-names.js` | `assertSynonymAgreement, expandSynonymValues` | Re-export |
| `./composition/canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS` | Re-export |
| `./composition/explain.js` | `formatQuantity, formatExact` | Re-export |
| `./core/format.js` | `formatPercent` | Re-export |
| `./bridges/carrier-sign.js` | `CarrierSignError` | Re-export |
| `./dimensional/natural-units.js` | `naturalConstantOverrides` | Re-export |
| `./dimensional/natural-units.js` | `UnitMode` | Re-export (type-only) |
| `./dimensional/hyphen-names.js` | `escapeRegExp, rewriteCatalogHyphens` | Re-export |
| `./composition/adjudication.js` | `candidateIdIfSlug` | Re-export |
| `./index.js` | `resolveQuantityName` | Re-export |
| `./composition/evaluate-relation.js` | `evaluateResolved, resolveEvaluable` | Re-export |
| `./dimensional/algebra.js` | `siUnitOf` | Re-export |
| `./bridges/evaluators.js` | `unusedInputKeys` | Re-export |
| `./dimensional/formula-names.js` | `SynonymDisagreementError` | Re-export |
| `./atlas/benchmark/hybrid-retrieval.js` | `canonicalRetrievalCorpus, EmbeddingUnavailable, ollamaEmbedder, retrieveHybrid` | Re-export |
| `./atlas/benchmark/onnx-embedder.js` | `fetchOnnxModel, onnxEmbedder` | Re-export |
| `./numerical/formula-dimension.js` | `builtinFormulaDimensionChecker` | Re-export |
| `./bridges/evaluators.js` | `missingEvaluatorMessage` | Re-export |
| `./bridges/notices.js` | `relationNotices` | Re-export |
| `./dimensional/symbolic-constants.js` | `constantNotes, constantRecord` | Re-export |
| `./composition/edge.js` | `BridgeEdge` | Re-export (type-only) |
| `./composition/graph-viz.js` | `VizJunction, VizModel` | Re-export (type-only) |
| `./atlas/types.js` | `EvidenceTag, RelationType` | Re-export (type-only) |
| `./composition/user-equation.js` | `EquationAnalysis` | Re-export (type-only) |

**Exports:**
- Re-exports:

  ```text
  explainQuantity, CATALOG_GRAPH, CANONICAL_GRAPH, M_SUN_KG, composeSymbolic, format, dimensionsEqual,
  buildVizModel, renderDotToSvg, equationLanding, analyzeUserEquation, suggestQuantities,
  buckinghamPi, dimensionallyDetermines, composeEdges, formatConnectedSummary, bridgePriority,
  attemptDerivation, dimensionalFreedom, linkageMap, proposeLinkCandidates, proposeOrphanConnectors,
  getFormulaParser, getFormulaParserKind, getFormulaDimensionChecker, parseDimensionSpec,
  predictMissingBridges, catalogFrontierAccount, formatFrontierAccount, rankDiscoveries,
  ANCHOR_DEFAULT, hasMagnitudeEvidence, isPromisingTier, BRIDGE_EQUATIONS, auditCoverage,
  CONFRONTATIONS, listConfrontations, runConfrontation, confrontationRigor, rigorDistribution,
  requestCallerTableConfrontation, catalogEntry, catalogIdNumber, parseBridgeId, primaryRelation,
  catalogEdgeKey, foldName, quantityRecord, demonstrationEdges, ConfrontationEntry, RigorTier,
  consistencyComparison, ConfrontationOutcome, decidingMeasurement, BRIDGE_EVALUATORS, evaluateBridge,
  DuplicateInputError, InputTypeError, isInputContractError, MissingInputError, NonFiniteInputError,
  UnknownInputError, EvaluatorSpec, EvaluatorParameter, resolveEvaluatorInputs, APPLIED_CASES,
  runAppliedCase, CASE_CONTRACTS, slotForSpelling, AppliedCase, CaseCheck, CaseResult, convertValue,
  UnitError, unitRows, auditAxisDiscrimination, AUDIT_ALPHA, AxisDiscrimination, AXES, AxisSpec,
  simplifyObservable, isSimplifierAvailable, CANONICAL_EQUATIONS, bridgesWithoutCanonicalPartner,
  scanLinkages, deriveProposedBridges, describeDerivedClaim, filterEdges, formatFilterLegend,
  deriveEdgeEvidence, communitiesOf, derivationCycles, rankHubs, CommunityReport, DerivationCycle,
  HubRank, DEFAULT_SEARCH_BUDGET, scanFrontier, findFrontierGap, expressionSearchGaps,
  scanWithExpressionGaps, problemFromResidualGap, makeResidualGap, loadSearchProblemFromJson,
  resolveObservationsPath, parseExprJson, ProblemFileError, runProbeSearch, nodeWorkerArgv,
  formatProbeReport, loadStudyFromJson, loadStudyFile, runProbeStudy, formatProbeStudy,
  formatFrontierScan, formatFrontierGap, suggestDiscriminatingPoint, parseDesignBounds,
  runFalsification, rankPareto, annotateAdjudications, adjudicationFor, candidateId, ADJUDICATIONS,
  AnnotatedCandidate, CatalogAdjudication, annotateConsequences, ConsequenceAnnotatedCandidate,
  ConsequenceSignal, ConsequenceEvidence, checkConventions, unknownConventionKeys, ConventionKey,
  describeGrounding, describeReadiness, REPRESENTATIVE_VALUES, compareWithCanonical,
  compareUserEquation, describeComparison, describeComparisons, describeKnownRelation,
  matchingCatalogEdges, CanonicalComparison, CatalogEdgeMatch, ExponentDifference,
  describeExponentDifference, FIXED_POINT_EXPONENTS, constantRatio, fixedPoint,
  recoverMonomialPrefactor, ConstantRatio, ConstantRatioOptions, FixedPointScheme, PrefactorRecovery,
  PrefactorRecoveryScheme, RatioStatistic, CONSTANTS, CONSTANT_PROVENANCE, isDecimalLiteral,
  forEachScalarLeaf, CandidateGrounding, CandidateReadiness, OSCILLATOR_FAMILY, ATLAS_FAMILIES,
  normTransportFields, deriveEvidence, deriveCompositeEvidence, NO_PASSING_WITNESSES,
  provedWithUnresolvedCounterexample, summarizeEvidence, ALL_EVIDENCE_TAGS, runWitnessRegistry,
  WITNESS_REGISTRY, runNumericWitness, OBSERVABLE_CARRIAGES, OBSERVABLE_TRANSLATIONS, carriageOf,
  runTranslationCheck, translationsOf, ObservableCarriage, ObservableTranslation, PointCheck,
  AtlasFamily, collidingRegimeGroups, regimeHolds, regimeOverlap, uncoveredRegions,
  domainRegimeRegistrations, RegimeCheck, RegimeOverlap, RegionSample, familyChangeBlocksHorizon,
  findPath, findAtlasPath, enumerateAtlasRoutes, boundPath, horizonOnRoute, routeEntryModels,
  allAtlasBridges, composeRelation, PathBoundResult, PathBoundClaim, PathNoClaim, AppliedTransport,
  AtlasBridge, RegimeInequality, Witness, MissingLipschitzError, AtlasModel, ModelId,
  catalogFormalRef, scanCompositionRecovery, curvatureReport, kerrEquatorialCircular, kerrGeodesic,
  kerrTurningPointOrbit, MetricMassError, MetricValueError, schwarzschildCircularOrbit, MetricId,
  splitAssignment, readBinding, bindingInUnit, readNamedBinding, BindingNumberError,
  TemperatureBindingError, propagateEvaluatorUncertainty, correlationIsPositiveSemidefinite,
  PropagatedOutput, UncertaintyContribution, constantAgreement, ConstantDisagreementError,
  FormulaError, FormulaValueError, aliasesForTarget, nearQuantityNames, shareSynonyms,
  assertSynonymAgreement, expandSynonymValues, CANONICAL_GROUP_PREFACTORS, formatQuantity,
  formatExact, formatPercent, CarrierSignError, naturalConstantOverrides, UnitMode, escapeRegExp,
  rewriteCatalogHyphens, candidateIdIfSlug, resolveQuantityName, evaluateResolved, resolveEvaluable,
  siUnitOf, unusedInputKeys, SynonymDisagreementError, canonicalRetrievalCorpus, EmbeddingUnavailable,
  ollamaEmbedder, retrieveHybrid, fetchOnnxModel, onnxEmbedder, builtinFormulaDimensionChecker,
  missingEvaluatorMessage, relationNotices, constantNotes, constantRecord, BridgeEdge, VizJunction,
  VizModel, EvidenceTag, RelationType, EquationAnalysis
  ```


---

<a id="composition-dependencies"></a>

## Composition Dependencies

### `src/composition/adjudication.ts` - Adjudication ledger for machine-surfaced discovery candidates.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./discovery.js` | `VettedCandidate` | Import (type-only) |
| `../bridges/catalog-load.js` | `bridgeCatalog` | Import |
| `../bridges/catalog-types.js` | `CatalogAdjudication` | Import (type-only) |

**Exports:**
- Types: `AnnotatedCandidate`
- Functions: `candidateId`, `candidateIdIfSlug`, `adjudicationFor`, `annotateAdjudications`
- Constants: `ADJUDICATIONS`

---

### `src/composition/algebraic-equivalence.ts` - Equality of two scalar expressions up to a dimensionless constant, decided

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `parse, simplify` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-leaves.js` | `mapScalarLeaves` | Import |
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, isRegisteredConstant, piMultipleValue` | Import |
| `./expr-simplify.js` | `renderGensym, LeafMeta` | Import |
| `./mathts-quiet.js` | `quietlySync` | Import |

**Exports:**
- Types: `AlgebraicEquivalence`
- Functions: `equalUpToConstant`

---

### `src/composition/aliases.ts` - One record of what a typed name means.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `../dimensional/formula-names.js` | `DIMENSION_RENAMES, SYNONYM_GROUPS, synonymDisagreement, DimensionRename` | Import |
| `../dimensional/quantity-registry.js` | `foldName` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |

**Exports:**
- Functions: `aliasesForTarget`, `editDistance`, `nearQuantityNames`, `shareSynonyms`, `collapseSynonymGovernors`
- Constants: `NAME_TABLE`

---

### `src/composition/audit-coverage.ts` - Empirical-spine coverage audit (Direction 4).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `../bridges/confrontation-coverage.js` | `DATA_CONFRONTED_IDS` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |

**Exports:**
- Types: `GroundingTier`
- Functions: `auditCoverage`

---

### `src/composition/axes.ts` - The extensible tensor-axis registry — the single source for UPT's classification

**Exports:**
- Interfaces: `AxisSpec`
- Types: `ScaleAxis`, `ForceAxis`, `InformationAxis`, `SymmetryAxis`, `TopologyAxis`, `StatisticsAxis`
- Constants: `SCALE_AXIS_VALUES`, `FORCE_AXIS_VALUES`, `SYMMETRY_AXIS_VALUES`, `AXES`, `GATE_AXES`

---

### `src/composition/axis-audit.ts` - Axis-discrimination audit — the anti-inert-metadata gate for the extensible

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `fisherExact` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./quantity.js` | `RegimeAttributes` | Import (type-only) |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./axes.js` | `AXES` | Import |
| `./bridge-analysis.js` | `proposeLinkCandidates` | Import |
| `./compose.js` | `effectiveAttributes, QUANTITY_IDENTIFICATIONS` | Import |
| `./discovery.js` | `buildDiscoveryContext, magnitudeGate, REGISTRY_ATTRIBUTES_BY_NAME` | Import |
| `./discovery.js` | `DiscoveryOptions` | Import (type-only) |

**Exports:**
- Interfaces: `AxisEvidence`, `AxisDiscrimination`
- Types: `AxisAuditOptions`
- Functions: `auditAxisDiscrimination`
- Constants: `AUDIT_ALPHA`

---

### `src/composition/bridge-analysis.ts` - Bridge-analysis — structural triage signals over the composition graph.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/symbolic-constants.js` | `constantRecord` | Import |
| `../canonical/fixed-points.js` | `constantRatio, fixedPoint` | Import |
| `./rational-exponent.js` | `formatRational, rationalize` | Import |
| `../dimensional/buckingham.js` | `buckinghamPi, dimensionallyDetermines` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/algebra.js` | `equals, format` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./formula-shape.js` | `formulaShape` | Import |
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `./enumerate.js` | `enumerateCompositions` | Import |
| `../bridges/confrontation-coverage.js` | `DATA_CONFRONTED_IDS` | Import |
| `./quantity-clusters.js` | `clusterBySharedKeys, quantityCanonicalizer` | Import |

**Exports:**
- Interfaces: `LinkCandidate`
- Functions: `dimensionalFreedom`, `cleanPrefactorForm`, `attemptDerivation`, `bridgePriority`, `linkageMap`, `proposeLinkCandidates`, `proposeOrphanConnectors`

---

### `src/composition/bridge-prediction.ts` - Bridge prediction — make the namesake `UniversalTensor` operational

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/tensor.js` | `UniversalTensor` | Import |
| `../core/types.js` | `PhysicalScale, Force, TensorIndices` | Import (type-only) |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./quantity.js` | `Quantity` | Import (type-only) |
| `./axes.js` | `FORCE_AXIS_VALUES, SCALE_AXIS_VALUES` | Import |

**Exports:**
- Functions: `regimeKey`, `placeQuantity`, `buildRegimeTensor`, `predictMissingBridges`

---

### `src/composition/buckingham-filter.ts` - Buckingham filter for one target and the variables that govern it.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/buckingham.js` | `DimensionalDeterminationResult, DimensionalVariable` | Import (type-only) |
| `../dimensional/buckingham.js` | `buckinghamPi, dimensionallyDetermines` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |

**Exports:**
- Interfaces: `BuckinghamFilterRecord`
- Functions: `buckinghamFilter`

---

### `src/composition/canonical-compare.ts` - Compare a user's formula with the canonical (textbook) equation it restates.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `matrixRank, ols` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/algebra.js` | `equals` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../canonical/canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, isRegisteredConstant, piMultipleValue` | Import |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf, isDecimalLiteral` | Import |
| `./expr-eval.js` | `evalExpr` | Import |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS, canonicalPrefactor` | Import |
| `../dimensional/formula-names.js` | `formulaNameDimensions` | Import |
| `./aliases.js` | `NAME_TABLE` | Import |
| `./user-equation.js` | `parseUserEquation` | Import |
| `../dimensional/formula-names.js` | `resolveQuantityName` | Import |
| `../numerical/formula-registry.js` | `getFormulaParser, parsePhysics` | Import |
| `../numerical/formula-dimension.js` | `formulaSymbolDimension` | Import |
| `../numerical/formula-contract.js` | `CompiledFormula` | Import (type-only) |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../canonical/fixed-points.js` | `FIXED_POINT_EXPONENTS, constantRatio, fixedPoint` | Import |
| `./rational-exponent.js` | `formatRational, rationalize` | Import |

**Exports:**
- Interfaces: `ExponentDifference`, `CanonicalComparison`, `CatalogEdgeMatch`
- Types: `ComparisonSource`
- Functions: `diagnoseExponentDifference`, `describeExponentDifference`, `compareWithCanonical`, `compareUserEquation`, `describeComparisons`, `matchingCatalogEdges`, `describeKnownRelation`, `describeComparison`

---

### `src/composition/canonical-graph.ts` - Canonical-only graph — project the standard-physics L-layer

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `validityDomain, BridgeEdge, ValidityDomain` | Import |
| `./quantity.js` | `Quantity, RegimeAttributes` | Import (type-only) |
| `./quantity.js` | `regimeAttributesOf` | Import |
| `./axes.js` | `AXES` | Import |
| `../canonical/canonical-equation.js` | `CanonicalEquation` | Import (type-only) |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../bridges/carrier-sign.js` | `applyCarrierSignPolicy` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANT_REGISTRY, CONSTANTS, isRegisteredConstant, piMultipleValue` | Import |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../core/types.js` | `InformationMeasure` | Import (type-only) |
| `../dimensional/types.js` | `CHARGE, DIMENSIONLESS, MASS` | Import |
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS, canonicalGroupPrefactor, canonicalPrefactor` | Import |
| `./expr-eval.js` | `evalExpr` | Import |
| `./formula-shape.js` | `monomialExponents` | Import |

**Exports:**
- Interfaces: `ConstantDef`
- Functions: `canonicalToEdges`
- Constants: `CANONICAL_CONSTANTS`, `CANONICAL_GRAPH`

---

### `src/composition/canonical-json.ts` - One canonical-JSON serializer with two named profiles.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/hash.js` | `sha256Hex` | Import |
| `./probe/types.js` | `EnvironmentFingerprint` | Import (type-only) |

**Exports:**
- Interfaces: `RecordEnvironmentSources`, `RecordEnvironmentSnapshot`
- Types: `JsonProfile`
- Functions: `canonicalJson`, `hashCanonical`, `captureEnvironment`

---

### `src/composition/canonical-prefactors.ts` - Sourced prefactors of canonical equations, projected from the entries.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |

**Exports:**
- Interfaces: `CanonicalGroupPrefactor`
- Functions: `canonicalPrefactor`, `canonicalGroupPrefactor`
- Constants: `CANONICAL_GROUP_PREFACTORS`

---

### `src/composition/catalog-graph.ts` - The composition graph is the relation projection of the bridge catalog.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/catalog-load.js` | `catalogEntry, catalogRelations` | Import |
| `../bridges/expr-parse.js` | `parseCatalogExpression` | Import |
| `../bridges/relation-eval.js` | `evaluateCatalogRelation, relationDomain` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./edge.js` | `withBoundAliases` | Import |
| `./quantities.js` | `quantityByName` | Import |

**Exports:**
- Functions: `catalogEdge`, `demonstrationEdges`
- Constants: `CATALOG_GRAPH`

---

### `src/composition/chain-candidate.ts` - A chain candidate and the order the pipeline reads candidates in.

**Exports:**
- Interfaces: `ChainCandidate`
- Types: `ChainCandidateKind`
- Functions: `chainClassIndex`, `compareChainEdgeIds`, `orderChainCandidates`, `compareChainOrder`

---

### `src/composition/chain-match.ts` - Pipeline match for a chain of proved edges.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../canonical/structural.js` | `classifyStructure, ChainClassification` | Import |
| `./algebraic-equivalence.js` | `equalUpToConstant` | Import |

**Exports:**
- Functions: `matchChain`

---

### `src/composition/chain-regime.ts` - Regime gate for a chain that meets on a quantity name.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `../bridges/tensor-index.js` | `tensorIndexComponent, TensorIndexComponent` | Import |
| `../relations/regime.js` | `regimeOverlap` | Import |
| `./axes.js` | `GATE_AXES` | Import |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./quantity.js` | `Quantity` | Import (type-only) |

**Exports:**
- Interfaces: `ChainRegimeMismatch`
- Functions: `joinRegimeMismatch`
- Constants: `REGIME_MISMATCH_KIND`

---

### `src/composition/chain-result.ts` - One internal chain record.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical/structural.js` | `ChainClassification` | Import (type-only) |
| `../relations/composition-table.js` | `CompositionResult` | Import (type-only) |
| `./buckingham-filter.js` | `BuckinghamFilterRecord` | Import (type-only) |
| `./chain-candidate.js` | `compareChainOrder, ChainCandidateKind` | Import |
| `./chain-regime.js` | `ChainRegimeMismatch` | Import (type-only) |

**Exports:**
- Interfaces: `ChainRecord`
- Functions: `chainOrderKey`, `orderChainRecords`

---

### `src/composition/compose-surface.ts` - v0.11 surface barrel for the namespacing-gate symbols (keeps

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `CompositionAliasError` | Re-export |
| `./compose.js` | `SOURCE_ALIAS_DISPOSITIONS` | Re-export |
| `./compose.js` | `AliasDisposition` | Re-export (type-only) |
| `./enumerate.js` | `DispositionRequired` | Re-export (type-only) |

**Exports:**
- Re-exports: `CompositionAliasError`, `SOURCE_ALIAS_DISPOSITIONS`, `AliasDisposition`, `DispositionRequired`

---

### `src/composition/compose-symbolic.ts` - Symbolic bridge composition (v0.12 — the Observable contract).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/algebra.js` | `equals, format` | Import |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `./expr-subst.js` | `substitute` | Import |
| `./expr-eval.js` | `evalExpr, SymbolicEvalError` | Import |
| `../dimensional/symbolic-constants.js` | `isRegisteredConstant` | Import |
| `../dimensional/ast-leaves.js` | `isDecimalLiteral` | Import |
| `./mathts-scalar-symbols.js` | `scalarSymbolsFromMathTs` | Import |

**Exports:**
- Classes: `SymbolicCompositionError`
- Interfaces: `Observable`, `ComposeSymbolicOptions`
- Functions: `makeObservable`, `composeSymbolic`

---

### `src/composition/compose.ts` - Composition graph — the composition operator (v0.8.0 T2/T4, per

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/algebra.js` | `equals, format` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./edge.js` | `BridgeEdge, EdgeConfidence, ValidityDomain` | Import (type-only) |
| `./quantity.js` | `Quantity, RegimeAttributes` | Import (type-only) |
| `./quantity.js` | `regimeAttributesOf` | Import |
| `./axes.js` | `AXES` | Import |
| `../dimensional/unit-convention.js` | `conventionFactor` | Import |
| `./edge.js` | `assertCoefficientSet, CompositionAliasError, CompositionDimensionError, CompositionJunctionError, UndefinedCompositionError` | Import |
| `../bridges/evaluation-errors.js` | `DomainViolationError` | Import |
| `./expr-subst.js` | `substitute` | Import |
| `./formula-shape.js` | `monomialExponents` | Import |
| `../relations/composition-table.js` | `composeRelation, NO_COMPOSITE_CLAIM` | Import |
| `../relations/conventions.js` | `checkConventions` | Import |
| `../relations/regime.js` | `intersectRegimes` | Import |
| `../relations/types.js` | `Conventions, Regime, RelationContract, RelationType` | Import (type-only) |

**Exports:**
- Interfaces: `QuantityIdentification`, `AliasDisposition`, `ComposeOptions`
- Functions: `effectiveAttributes`, `minConfidence`, `junctionDimensionsMatch`, `composeEdges`
- Constants: `QUANTITY_IDENTIFICATIONS`, `SOURCE_ALIAS_DISPOSITIONS`

---

### `src/composition/composition-recovery.ts` - Composition-derived recovery.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `byKey, compareCodepoint` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../canonical/normal-form.js` | `normalForm` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./compose-symbolic.js` | `composeSymbolic, SymbolicCompositionError` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |

**Exports:**
- Interfaces: `CompositionRecoveryPair`, `CompositionRecoveryHit`, `CompositionRecoveryScan`
- Functions: `scanCompositionRecovery`

---

### `src/composition/consequence.ts` - Consequence propagation — the machine pre-classifier for the human

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./discovery.js` | `VettedCandidate` | Import (type-only) |
| `./discovery.js` | `isPromisingTier` | Import |
| `./proposed-bridges.js` | `ProposedBridge` | Import (type-only) |
| `./proposed-bridges.js` | `deriveProposedBridges` | Import |
| `../canonical/normal-form.js` | `normalForm` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../canonical/canonical-equation.js` | `CanonicalEquation` | Import (type-only) |

**Exports:**
- Interfaces: `ConsequenceEvidence`, `DerivedClaim`
- Types: `ConsequenceSignal`, `ConsequenceAnnotatedCandidate`
- Functions: `classifyProposal`, `describeDerivedClaim`, `annotateConsequences`

---

### `src/composition/consistency.ts` - Composition graph — shared-source consistency relations (v0.8.0

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./edge.js` | `evaluateEdge` | Import |

**Exports:**
- Functions: `consistencyRatio`

---

### `src/composition/descriptor.ts` - Unified per-bridge descriptor — one lookup that JOINS the catalog's three

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridges/index.js` | `BRIDGE_EQUATIONS, BridgeEquationEntry` | Import |
| `../bridges/rhs-registry.js` | `BRIDGE_RHS_BY_ID, parseBridgeId` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Functions: `getBridge`
- Constants: `BRIDGE_DESCRIPTORS`

---

### `src/composition/dimension-adjacency.ts` - Dimension-adjacency — a review surface for quantities that are absent from a

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/algebra.js` | `equals, format` | Import |

**Exports:**
- Interfaces: `DimensionAdjacency`
- Functions: `dimensionAdjacency`

---

### `src/composition/discovery.ts` - Discovery loop — vet link candidates through the verification primitives

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `normalCDF` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS, effectiveAttributes` | Import |
| `./axes.js` | `GATE_AXES` | Import |
| `./quantity.js` | `RegimeAttributes` | Import (type-only) |
| `./identifiability.js` | `classifyIdentifiability, forwardClosure, propagate` | Import |
| `./retrodiction.js` | `retrodict, retrodictNode, forwardEvaluate` | Import |
| `./bridge-analysis.js` | `proposeLinkCandidates` | Import |
| `./bridge-analysis.js` | `LinkCandidate` | Import (type-only) |
| `./quantity-clusters.js` | `clusterBySharedKeys` | Import |
| `../core/constants.js` | `M_SUN_KG` | Import |
| `./representative-values.js` | `DEFAULT_SIGMA_DECADES, REPRESENTATIVE_VALUES, sigmaDecadesOf` | Import |
| `./representative-values.js` | `RepresentativeValue` | Import (type-only) |
| `../dimensional/unit-convention.js` | `conventionScaleToSI` | Import |
| `./quantities.js` | `allQuantities` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../dimensional/algebra.js` | `format` | Import |
| `./own-equation-magnitude.js` | `deriveOwnEquationMagnitudes` | Import |
| `./own-equation-magnitude.js` | `DerivedMagnitudes` | Import (type-only) |

**Exports:**
- Interfaces: `VettedCandidate`, `DiscoveryOptions`, `DiscoveryContext`, `MagnitudeGate`
- Functions:

  ```text
  hasMagnitudeEvidence, isPromisingTier, buildDiscoveryContext, dependents, magnitudeStrength,
  magnitudeGate, vetLinkCandidate, vetInContext, rankDiscoveries
  ```

- Constants: `REGISTRY_ATTRIBUTES_BY_NAME`, `ANCHOR_DEFAULT`, `DEFAULT_MAX_ORDERS_OF_MAGNITUDE`

---

### `src/composition/edge.ts` - Composition graph — edges (bridges and laws) + validity domains

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./quantity.js` | `Quantity` | Import (type-only) |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS` | Import |
| `../relations/types.js` | `Conventions, Counterexample, Regime, RelationContract` | Import (type-only) |
| `../bridges/evaluation-errors.js` | `DomainViolationError, DomainViolation` | Import |
| `../bridges/expr-parse.js` | `formulaNames, formulaScope` | Import |
| `../bridges/validity.js` | `conditionDomain` | Import |

**Exports:**
- Classes: `CompositionJunctionError`, `CompositionDimensionError`, `CoefficientUnsetError`, `CompositionAliasError`, `UndefinedCompositionError`
- Interfaces: `ValidityDomain`, `BridgeEdge`
- Types: `EdgeConfidence`
- Functions: `validityDomain`, `assertCoefficientSet`, `withBoundAliases`, `evaluateEdge`

---

### `src/composition/enumerate.ts` - Phase-D novel-candidate enumeration (v0.10.0 T3 — Part-IX §6's

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./edge.js` | `CompositionAliasError, CompositionDimensionError, CompositionJunctionError, UndefinedCompositionError` | Import |
| `./compose.js` | `composeEdges` | Import |
| `./compose.js` | `ComposeOptions` | Import (type-only) |
| `./compose-symbolic.js` | `composeSymbolic, SymbolicCompositionError` | Import |
| `./expr-eval.js` | `SymbolicEvalError` | Import |

**Exports:**
- Interfaces: `CompositionCandidate`, `DispositionRequired`, `RelationTableRefusal`, `EnumerationWithRefusals`, `EnumerationReport`
- Types: `EnumerationOptions`
- Functions: `enumerateCompositions`, `enumerateCompositionsWithRefusals`
- Constants: `REGISTERED_COMPOSITION_IDS`

---

### `src/composition/evaluate-relation.ts` - One public evaluation of a catalog id or a canonical id.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/bridge-check.js` | `EXPECTED_DIMENSION_BY_BRIDGE` | Import |
| `../dimensional/algebra.js` | `siUnitOf` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../bridges/evaluators.js` | `BRIDGE_EVALUATORS, EvaluatorSpec` | Import |
| `../bridges/input-contract.js` | `checkInputs, inputContract, EvaluationWant, InputContract` | Import |
| `../bridges/catalog-load.js` | `catalogEdgeKey, parseBridgeId, primaryRelation` | Import |
| `../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS` | Import |
| `./canonical-graph.js` | `CANONICAL_GRAPH` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./edge.js` | `CoefficientUnsetError, evaluateEdge, BridgeEdge` | Import |

**Exports:**
- Interfaces: `ExtraOutput`, `Evaluable`
- Types: `Evaluation`
- Functions: `evaluableContract`, `resolveEvaluable`, `evaluateResolved`, `evaluateRelation`

---

### `src/composition/explain.ts` - "Explain this quantity" — the unified entry point over the three

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `./identifiability.js` | `IdentifiabilityResult` | Import (type-only) |
| `./identifiability.js` | `classifyIdentifiability, forwardClosure` | Import |
| `../canonical/fixed-points.js` | `fixedPoint` | Import |
| `./retrodiction.js` | `RetrodictionResult` | Import (type-only) |
| `./retrodiction.js` | `retrodictNode` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS` | Import |
| `../canonical/registry.js` | `canonicalById` | Import |
| `../core/format.js` | `formatQuantity` | Import |
| `../core/format.js` | `formatQuantity, formatExact` | Re-export |
| `../dimensional/buckingham.js` | `DimensionalDeterminationResult` | Import (type-only) |
| `../dimensional/buckingham.js` | `dimensionallyDetermines` | Import |
| `./aliases.js` | `collapseSynonymGovernors` | Import |
| `./formula-shape.js` | `formulaShape` | Import |

**Exports:**
- Interfaces: `DerivationExplanation`, `ExplainOptions`, `QuantityExplanation`
- Functions: `explainQuantity`
- Re-exports: `formatQuantity`, `formatExact`

---

### `src/composition/expr-eval.ts` - Scalar `ExprNode` value evaluator (v0.12 symbolic composition).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-expression` | `ScalarBuildError` |
| `@danielsimonjr/mathts-functions` | `evaluateScalar, ScalarEvalError` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, piMultipleValue` | Import |
| `../dimensional/formula-names.js` | `FORMULA_NAMED` | Import |
| `../dimensional/scalar-lowering.js` | `toScalarNode` | Import |

**Exports:**
- Classes: `SymbolicEvalError`
- Functions: `evalExpr`

---

### `src/composition/expr-simplify.ts` - Symbolic simplification of a scalar `ExprNode` through MathTS, a supplement

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `parse, simplify` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `./expr-eval.js` | `evalExpr` | Import |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf, isDecimalLiteral` | Import |
| `../dimensional/symbolic-constants.js` | `isRegisteredConstant` | Import |
| `./compose-symbolic.js` | `Observable` | Import (type-only) |
| `./compose-symbolic.js` | `makeObservable` | Import |
| `./mathts-scalar-symbols.js` | `renderScalarLeaf` | Import |
| `./mathts-quiet.js` | `quietlySync` | Import |

**Exports:**
- Interfaces: `LeafMeta`
- Functions: `renderGensym`, `isSimplifierAvailable`, `simplifyExpr`, `simplifyObservable`

---

### `src/composition/expr-subst.ts` - Scalar `ExprNode` substitution (v0.12 symbolic composition).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./expr-eval.js` | `SymbolicEvalError` | Import |

**Exports:**
- Functions: `substitute`

---

### `src/composition/formula-shape.ts` - Whether an encoded formula is a product of powers, or a sum of dimensionful terms.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Fraction` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-leaves.js` | `ALL_SCALAR_ARMS, isDecimalLiteral, scalarChildren` | Import |
| `../dimensional/algebra.js` | `divide, equals, multiply, power` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `./rational-exponent.js` | `fractionToNumber, rationalize` | Import |

**Exports:**
- Functions: `rationalExponentOf`, `monomialExponentsExact`, `monomialExponents`, `formulaShape`

---

### `src/composition/frontier-account.ts` - Two lists the catalog already knows how to tell apart: records that were

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./bridge-analysis.js` | `proposeLinkCandidates` | Import |
| `../bridges/catalog-load.js` | `catalogEntries` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./probe/frontier.js` | `scanFrontier` | Import |
| `./probe/expression-gaps.js` | `expressionSearchGaps` | Import |
| `./probe/types.js` | `FrontierGap` | Import (type-only) |
| `../bridges/rejected.js` | `REJECTED_BRIDGE_ADJUDICATIONS` | Import |
| `../bridges/confrontations.js` | `listConfrontations` | Import |

**Exports:**
- Interfaces: `ConfrontationMark`, `NullResultRow`, `FrontierAccountRow`, `FrontierAccount`, `FrontierAccountOptions`
- Types: `ConfrontationMarkStatus`
- Functions: `marksFromEntries`, `accountFromGraph`, `catalogFrontierAccount`, `formatFrontierAccount`
- Constants: `CANDIDATE_NOT_A_BRIDGE_REASON`, `CONTESTED_BRIDGE_IDS`

---

### `src/composition/graph-structure.ts` - Map structure from graph algorithms, over the QUANTITY graph of a composition graph.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `betweennessCentrality, connectedComponents, louvainCommunities, stronglyConnectedComponents` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./quantity-clusters.js` | `quantityCanonicalizer` | Import |

**Exports:**
- Interfaces: `QuantityGraph`, `LayoutCommunity`, `CommunityReport`, `DerivationCycle`, `HubRank`
- Functions: `quantityGraph`, `communitiesOf`, `derivationCycles`, `rankHubs`
- Constants: `COMMUNITY_METHOD`

---

### `src/composition/graph-viz-svg.ts` - SVG rendering for the physics map — render Graphviz DOT source to an SVG

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@viz-js/viz` | `Viz` |

**Exports:**
- Classes: `SvgRendererUnavailableError`
- Functions: `renderDotToSvg`

---

### `src/composition/graph-viz.ts` - Physics-map visualization — turn the composition hypergraph into Mermaid and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./quantity-clusters.js` | `clusterBySharedKeys, quantityCanonicalizer` | Import |
| `../relations/types.js` | `EvidenceTag, RelationType` | Import (type-only) |

**Exports:**
- Interfaces: `VizJunction`, `VizFilterStats`, `VizCluster`, `VizOptions`, `VizModel`
- Types: `VizStatus`
- Functions: `edgeToJunction`, `filterEdges`, `formatFilterLegend`, `buildVizModel`
- Constants: `ALL_VIZ_STATUSES`

---

### `src/composition/grounding.ts` - PI-instrument Phase 1 — the epistemic-grounding ledger. A pure, derived view

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./discovery.js` | `VettedCandidate` | Import (type-only) |
| `./discovery.js` | `hasMagnitudeEvidence` | Import |
| `./consequence.js` | `ConsequenceSignal` | Import (type-only) |

**Exports:**
- Interfaces: `CandidateGrounding`, `CandidateReadiness`
- Types: `IndependentFalsifier`
- Functions: `describeGrounding`, `describeReadiness`

---

### `src/composition/identifiability.ts` - Identifiability classifier (Consequence 1 of

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Fraction` |
| `@danielsimonjr/mathts-functions` | `rationalNullspace` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `./formula-shape.js` | `monomialExponentsExact` | Import |
| `./rational-exponent.js` | `rationalize` | Import |
| `../canonical/registry.js` | `canonicalById` | Import |

**Exports:**
- Interfaces: `IdentifiabilityOptions`, `RankIdentifiability`, `IdentifiabilityResult`
- Types: `IdentifiabilityVerdict`, `EdgeMonomialReader`
- Functions: `forwardClosure`, `propagate`, `edgeMonomial`, `identifiabilityByRankWith`, `identifiabilityByRank`, `classifyIdentifiability`, `classifyAll`

---

### `src/composition/index.ts` - Composition graph (v0.8.0) — graph-lite `Quantity` / `BridgeEdge` /

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./quantity.js` | `Quantity, RegimeAttributes` | Re-export (type-only) |
| `./quantity.js` | `regimesDiffer` | Re-export |
| `./edge.js` | `BridgeEdge, EdgeConfidence, ValidityDomain` | Re-export (type-only) |
| `./edge.js` | `CoefficientUnsetError, CompositionAliasError, CompositionDimensionError, CompositionJunctionError, UndefinedCompositionError, evaluateEdge, validityDomain` | Re-export |
| `../bridges/evaluation-errors.js` | `DomainViolationError, DuplicateInputError, InputTypeError, MissingInputError, NonFiniteInputError, UnknownInputError` | Re-export |
| `../bridges/evaluation-errors.js` | `DomainInput, DomainViolation` | Re-export (type-only) |
| `./compose.js` | `ComposeOptions, QuantityIdentification` | Re-export (type-only) |
| `./compose.js` | `composeEdges, minConfidence, QUANTITY_IDENTIFICATIONS, SOURCE_ALIAS_DISPOSITIONS` | Re-export |
| `./compose.js` | `AliasDisposition` | Re-export (type-only) |
| `./consistency.js` | `consistencyRatio` | Re-export |
| `../core/constants.js` | `M_SUN_KG` | Re-export |
| `./catalog-graph.js` | `catalogEdge, CATALOG_GRAPH` | Re-export |
| `./canonical-graph.js` | `CANONICAL_GRAPH, canonicalToEdges, CANONICAL_CONSTANTS` | Re-export |
| `./enumerate.js` | `CompositionCandidate, EnumerationReport` | Re-export (type-only) |
| `./enumerate.js` | `enumerateCompositions, REGISTERED_COMPOSITION_IDS` | Re-export |
| `./uncertainty.js` | `UncertaintyResult` | Re-export (type-only) |
| `./uncertainty.js` | `propagateUncertainty` | Re-export |
| `./identifiability.js` | `IdentifiabilityVerdict, IdentifiabilityResult, IdentifiabilityOptions, RankIdentifiability` | Re-export (type-only) |
| `./identifiability.js` | `classifyIdentifiability, classifyAll, forwardClosure, identifiabilityByRank` | Re-export |
| `./retrodiction.js` | `RetrodictionOutcome, RetrodictionPrediction, RetrodictionResult, RetrodictionRefusal, RetrodictionReport, RetrodictionOptions` | Re-export (type-only) |
| `./retrodiction.js` | `retrodict, retrodictNode` | Re-export |
| `./explain.js` | `DerivationExplanation, ExplainOptions, QuantityExplanation` | Re-export (type-only) |
| `./explain.js` | `explainQuantity` | Re-export |
| `./evaluate-relation.js` | `Evaluation, ExtraOutput` | Re-export (type-only) |
| `./evaluate-relation.js` | `evaluateRelation` | Re-export |
| `./compose-symbolic.js` | `Observable, ComposeSymbolicOptions` | Re-export (type-only) |
| `./compose-symbolic.js` | `composeSymbolic, SymbolicCompositionError` | Re-export |
| `./expr-eval.js` | `SymbolicEvalError` | Re-export |
| `./graph-viz.js` | `VizStatus, VizJunction, VizCluster, VizOptions, VizModel, VizFilterStats` | Re-export (type-only) |
| `./graph-viz.js` | `buildVizModel, edgeToJunction` | Re-export |
| `./graph-viz-svg.js` | `renderDotToSvg, SvgRendererUnavailableError` | Re-export |
| `./dimension-adjacency.js` | `DimensionAdjacency` | Re-export (type-only) |
| `./dimension-adjacency.js` | `dimensionAdjacency` | Re-export |
| `./user-equation.js` | `UserEquation, EquationLanding` | Re-export (type-only) |
| `./user-equation.js` | `EquationAnalysis, EquationHint` | Re-export (type-only) |
| `./user-equation.js` | `parseUserEquation, suggestQuantities, suggestByDimension, equationLanding, analyzeUserEquation, UserEquationError` | Re-export |
| `../dimensional/formula-names.js` | `resolveQuantityName, SynonymDisagreementError` | Re-export |

**Exports:**
- Re-exports:

  ```text
  Quantity, RegimeAttributes, regimesDiffer, BridgeEdge, EdgeConfidence, ValidityDomain,
  CoefficientUnsetError, CompositionAliasError, CompositionDimensionError, CompositionJunctionError,
  UndefinedCompositionError, evaluateEdge, validityDomain, DomainViolationError, DuplicateInputError,
  InputTypeError, MissingInputError, NonFiniteInputError, UnknownInputError, DomainInput,
  DomainViolation, ComposeOptions, QuantityIdentification, composeEdges, minConfidence,
  QUANTITY_IDENTIFICATIONS, SOURCE_ALIAS_DISPOSITIONS, AliasDisposition, consistencyRatio, M_SUN_KG,
  catalogEdge, CATALOG_GRAPH, CANONICAL_GRAPH, canonicalToEdges, CANONICAL_CONSTANTS,
  CompositionCandidate, EnumerationReport, enumerateCompositions, REGISTERED_COMPOSITION_IDS,
  UncertaintyResult, propagateUncertainty, IdentifiabilityVerdict, IdentifiabilityResult,
  IdentifiabilityOptions, RankIdentifiability, classifyIdentifiability, classifyAll, forwardClosure,
  identifiabilityByRank, RetrodictionOutcome, RetrodictionPrediction, RetrodictionResult,
  RetrodictionRefusal, RetrodictionReport, RetrodictionOptions, retrodict, retrodictNode,
  DerivationExplanation, ExplainOptions, QuantityExplanation, explainQuantity, Evaluation,
  ExtraOutput, evaluateRelation, Observable, ComposeSymbolicOptions, composeSymbolic,
  SymbolicCompositionError, SymbolicEvalError, VizStatus, VizJunction, VizCluster, VizOptions,
  VizModel, VizFilterStats, buildVizModel, edgeToJunction, renderDotToSvg,
  SvgRendererUnavailableError, DimensionAdjacency, dimensionAdjacency, UserEquation, EquationLanding,
  EquationAnalysis, EquationHint, parseUserEquation, suggestQuantities, suggestByDimension,
  equationLanding, analyzeUserEquation, UserEquationError, resolveQuantityName,
  SynonymDisagreementError
  ```


---

### `src/composition/mathts-quiet.ts` - Load the MathTS dependency without its console chatter reaching stderr.

**Exports:**
- Functions: `quietlySync`

---

### `src/composition/mathts-scalar-symbols.ts` - Scalar leaves of an `ExprNode`, read from a MathTS AST.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `parse` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./mathts-quiet.js` | `quietlySync` | Import |
| `../dimensional/ast-leaves.js` | `isDecimalLiteral` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Interfaces: `ScalarSymbol`
- Functions: `renderScalarLeaf`, `scalarSymbolsFromMathTs`

---

### `src/composition/not-composable-seeds.ts` - Proved atlas seeds that are not composition-graph edges.

**Exports:**
- Interfaces: `NotComposableSeed`
- Constants: `NOT_COMPOSABLE_SEEDS`

---

### `src/composition/own-equation-magnitude.ts` - A magnitude for a quantity from its own equation, for the discovery magnitude gate.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./edge.js` | `evaluateEdge` | Import |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./retrodiction.js` | `evaluationInputs, refusesThePoint` | Import |
| `./representative-values.js` | `DEFAULT_SIGMA_DECADES, sigmaDecadesOf` | Import |
| `./representative-values.js` | `RepresentativeValue` | Import (type-only) |
| `../dimensional/unit-convention.js` | `conventionFactor, conventionScaleToSI` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANT_REGISTRY` | Import |
| `../numerical/finite-difference.js` | `centralPartial` | Import |
| `../core/compare.js` | `byKey, compareCodepoint` | Import |
| `../core/format.js` | `formatQuantity` | Import |

**Exports:**
- Interfaces: `DerivedMagnitude`, `DerivedMagnitudeRefusal`, `DerivedMagnitudes`, `OwnEquationSeeds`
- Functions: `deriveOwnEquationMagnitudes`
- Constants: `DERIVED_AGREEMENT`

---

### `src/composition/probe/backend-protocol.ts` - Optional NDJSON worker protocol for expression-search backends.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `child_process` | `spawn` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Interfaces: `BackendRequest`, `BackendCandidate`, `BackendResponse`, `WorkerProcess`
- Types: `WorkerLauncher`
- Functions: `runBackendWorker`

---

### `src/composition/probe/candidate-store.ts` - Append-only Product B candidate store + rejection registry.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `ProbeCandidateRecord, ProbeCandidateStatus, ProbeRejectionRecord, StatusEvent` | Import (type-only) |

**Exports:**
- Classes: `ProbeCandidateStore`
- Functions: `canTransition`, `applyStatus`, `statusRank`

---

### `src/composition/probe/corpus.ts` - In-repo corpus comparison: canonical scalarAst + normalForm.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../canonical/registry.js` | `CANONICAL_EQUATIONS` | Import |
| `../../canonical/normal-form.js` | `normalForm` | Import |
| `../../bridges/rhs-registry.js` | `BRIDGE_RHS_BY_ID` | Import |
| `./generator.js` | `monomialToExpr` | Import |
| `../expr-eval.js` | `evalExpr` | Import |
| `../../dimensional/algebra.js` | `equals` | Import |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../canonical-prefactors.js` | `canonicalPrefactor` | Import |
| `../../canonical/fixed-points.js` | `constantRatio, fixedPoint` | Import |

**Exports:**
- Interfaces: `CorpusMatch`, `CorpusComparisonResult`
- Functions: `compareToCorpus`, `corpusPrefactorNotes`, `corpusRelativeWording`

---

### `src/composition/probe/dataset.ts` - Observation adapters for Product B.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `readFileSync` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/data-file.js` | `readJsonFile` | Import |
| `./types.js` | `DatasetRole, ObservationRow, ProbeDataset` | Import (type-only) |
| `./types.js` | `SCHEMA_VERSION` | Import |

**Exports:**
- Classes: `DatasetError`
- Interfaces: `SplitFileDatasets`
- Functions: `readDatasetNumber`, `datasetFromRows`, `asDatasetSafe`, `loadDatasetFromJson`, `loadSplitDatasetsFromJson`, `loadDatasetFromCsv`, `loadSplitCsv`

---

### `src/composition/probe/experiment-design.ts` - Cheap experiment-design suggestions for two competing hypotheses.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../expr-eval.js` | `evalExpr` | Import |

**Exports:**
- Interfaces: `DesignBounds`, `DesignSuggestion`
- Functions: `parseDesignBounds`, `suggestDiscriminatingPoint`

---

### `src/composition/probe/expression-gaps.ts` - Expression gaps a `upt probe scan` can hand to Product B.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../cases/index.js` | `APPLIED_CASES` | Import |
| `./frontier.js` | `scanFrontier` | Import |
| `./problem.js` | `makeResidualGap` | Import |
| `./types.js` | `FrontierGap` | Import (type-only) |
| `../edge.js` | `BridgeEdge` | Import (type-only) |

**Exports:**
- Functions: `expressionSearchGaps`, `scanWithExpressionGaps`

---

### `src/composition/probe/falsify.ts` - Falsification batteries for probe candidates.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/validator.js` | `validate` | Import |
| `../expr-eval.js` | `evalExpr` | Import |
| `./limits.js` | `checkDeclaredLimits, LimitCheckResult` | Import |
| `./types.js` | `DeclaredLimit, FalsificationBattery, FalsificationRecord, ProbeDataset` | Import (type-only) |

**Exports:**
- Interfaces: `FalsifyInput`, `FalsifyResult`
- Functions: `runFalsification`
- Constants: `DEFAULT_BATTERIES`

---

### `src/composition/probe/fingerprint.ts` - Candidate fingerprints — `normalForm` is the cheap algebraic hash.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/ast-leaves.js` | `ALL_SCALAR_ARMS, scalarChildren` | Import |
| `../../dimensional/ast-leaves.js` | `LeafWalkArms` | Import (type-only) |
| `../../dimensional/validator.js` | `validate` | Import |
| `../../dimensional/algebra.js` | `format` | Import |
| `../../canonical/normal-form.js` | `normalForm` | Import |
| `./serialize.js` | `hashCanonical, sha256Hex` | Import |
| `./types.js` | `CandidateFingerprint, ComplexityMetrics, ProbeCandidateBody` | Import (type-only) |

**Exports:**
- Functions: `bodyExpression`, `countAstNodes`, `countOperators`, `maxPowerOrder`, `complexityOf`, `fingerprintExpr`

---

### `src/composition/probe/fit.ts` - Prefactor fit + holdout evaluation. Generation never sees holdout rows.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `norm2, pairwiseDot` |
| `@danielsimonjr/mathts-functions` | `ols` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../expr-eval.js` | `evalExpr` | Import |
| `./types.js` | `DEFAULT_HOLDOUT_TOL, ProbeDataset` | Import |
| `./residual.js` | `scalarDiscrepancy` | Import |
| `./serialize.js` | `canonicalJson` | Import |

**Exports:**
- Interfaces: `FitResult`
- Functions: `fitPrefactor`

---

### `src/composition/probe/frontier.ts` - Frontier scanners — wrap Product A surfaces; residual gaps are Product B.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../bridge-analysis.js` | `proposeLinkCandidates, proposeOrphanConnectors` | Import |
| `../bridge-prediction.js` | `predictMissingBridges` | Import |
| `../compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `../adjudication.js` | `candidateId, candidateIdIfSlug` | Import |
| `../edge.js` | `BridgeEdge` | Import (type-only) |
| `./types.js` | `FrontierGap, ProbeDataset, SearchProblem` | Import (type-only) |
| `./power-law.js` | `logDesign, logDesignRank, piStructure` | Import |

**Exports:**
- Functions: `wrapRelationLinkGaps`, `wrapConnectorGaps`, `wrapRegimeGaps`, `scanFrontier`, `findFrontierGap`, `problemFromResidualGap`

---

### `src/composition/probe/generator.ts` - Native bounded grammar enumerator — dimensional monomials via Buckingham-π.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../../dimensional/ast-builders.js` | `sym, symbolPower` | Import |
| `../../dimensional/buckingham.js` | `dimensionallyDetermines, DimensionalDeterminationResult` | Import |
| `../../dimensional/validator.js` | `validate` | Import |
| `../../dimensional/algebra.js` | `isDimensionless` | Import |
| `./types.js` | `DimensionalVariableRef, SearchBudget, SearchProblem` | Import (type-only) |
| `./search-budget.js` | `canEmitCandidate, BudgetState` | Import |
| `./power-law.js` | `powerLawDetermination, PowerLawFit` | Import |
| `./power-law.js` | `powerLawDetermination, powerLawWording, rationalizeExponent` | Re-export |
| `./power-law.js` | `PowerLawDetermination, PowerLawExponent, PowerLawFit` | Re-export (type-only) |

**Exports:**
- Interfaces: `RawCandidate`
- Functions: `monomialToExpr`, `nativeDetermination`, `withinAstCaps`
- Re-exports: `powerLawDetermination`, `powerLawWording`, `rationalizeExponent`, `PowerLawDetermination`, `PowerLawExponent`, `PowerLawFit`

---

### `src/composition/probe/index.ts` - Experimental Product B barrel — expression / residual search.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `SCHEMA_VERSION, PROBE_SCHEMA_VERSION, DEFAULT_SEARCH_BUDGET` | Re-export |
| `./types.js` | `ProbeCandidateStatus, RelationKind, AuditState, DiscrepancyKind, DatasetRole, SearchStopReason, FrontierGapKind, IdentifiabilityKind, SearchBudget, DiscrepancyDefinition, ScientificRelationRef, IdentifiabilityAssessment, SearchabilityAssessment, GapEvidence, FrontierGap, ProbeCandidateOrigin, ProbeCandidateBody, StatusEvent, CandidateFingerprint, ComplexityMetrics, ProbeCandidateRecord, ProbeRejectionRecord, DiscoveryBackendDescriptor, EnvironmentFingerprint, NondeterminismSource, DiscoveryRunManifest, DimensionalVariableRef, ObservationRow, ProbeDataset, SearchProblem, ScoreVector, EvidenceAssessment, EvidenceProfile, DeclaredLimit, FalsificationBattery, FalsificationRecord, ScientificRelationRecord` | Re-export (type-only) |
| `../canonical-json.js` | `canonicalJson, sha256Hex, hashCanonical, captureEnvironment` | Re-export |
| `./search-budget.js` | `openBudget, budgetStopReason, canEmitCandidate` | Re-export |
| `./search-budget.js` | `BudgetState` | Re-export (type-only) |
| `./fingerprint.js` | `bodyExpression, countAstNodes, countOperators, maxPowerOrder, complexityOf, fingerprintExpr` | Re-export |
| `./residual.js` | `scalarDiscrepancy, rmse, ResidualError` | Re-export |
| `./run-manifest.js` | `openManifest, closeManifest` | Re-export |
| `./candidate-store.js` | `canTransition, applyStatus, statusRank, ProbeCandidateStore` | Re-export |
| `./generator.js` | `monomialToExpr, generateNative` | Re-export |
| `./generator.js` | `RawCandidate` | Re-export (type-only) |
| `./power-law.js` | `powerLawDetermination, powerLawWording, rationalizeExponent, piStructure, logDesign, logDesignRank` | Re-export |
| `./power-law.js` | `PowerLawDetermination, PowerLawExponent, PowerLawFit, PiStructure, LogDesign` | Re-export (type-only) |
| `./frontier.js` | `wrapRelationLinkGaps, wrapConnectorGaps, wrapRegimeGaps, scanFrontier, findFrontierGap, problemFromResidualGap` | Re-export |
| `./expression-gaps.js` | `expressionSearchGaps, scanWithExpressionGaps` | Re-export |
| `./fit.js` | `fitPrefactor` | Re-export |
| `./fit.js` | `FitResult` | Re-export (type-only) |
| `./scoring.js` | `scoreCandidate, rankPareto` | Re-export |
| `./scoring.js` | `RankedCandidate` | Re-export (type-only) |
| `./corpus.js` | `compareToCorpus, corpusRelativeWording` | Re-export |
| `./corpus.js` | `CorpusMatch, CorpusComparisonResult` | Re-export (type-only) |
| `./limits.js` | `checkDeclaredLimit, checkDeclaredLimits` | Re-export |
| `./limits.js` | `LimitCheckResult` | Re-export (type-only) |
| `./limits.js` | `LimitOutcome` | Re-export (type-only) |
| `./falsify.js` | `runFalsification, DEFAULT_BATTERIES` | Re-export |
| `./falsify.js` | `FalsifyInput, FalsifyResult` | Re-export (type-only) |
| `./dataset.js` | `datasetFromRows, asDatasetSafe, loadDatasetFromJson, loadSplitDatasetsFromJson, loadDatasetFromCsv, loadSplitCsv` | Re-export |
| `./dataset.js` | `readDatasetNumber, DatasetError` | Re-export |
| `./dataset.js` | `SplitFileDatasets` | Re-export (type-only) |
| `./experiment-design.js` | `suggestDiscriminatingPoint, parseDesignBounds` | Re-export |
| `./experiment-design.js` | `DesignBounds, DesignSuggestion` | Re-export (type-only) |
| `./structure.js` | `detectMeanChangepoint, estimateScaleExponent, probeConservation` | Re-export |
| `./structure.js` | `ChangepointInput, ChangepointResult, ScaleSymmetryInput` | Re-export (type-only) |
| `./structure.js` | `ScaleExponentResult, ConservationResult` | Re-export (type-only) |
| `./t-tail.js` | `studentTwoSidedP` | Re-export |
| `./backend-protocol.js` | `runBackendWorker` | Re-export |
| `./backend-protocol.js` | `BackendRequest, BackendCandidate, BackendResponse` | Re-export (type-only) |
| `./metadata.js` | `setRelationMetadata, getRelationMetadata, listRelationMetadata, clearRelationMetadata` | Re-export |
| `./problem.js` | `makeResidualGap, loadSearchProblemFromJson, searchProblemFromFile, resolveObservationsPath, parseExprJson, ProblemFileError` | Re-export |
| `./problem.js` | `ProblemFile` | Re-export (type-only) |
| `./pipeline.js` | `runProbeSearch, nodeWorkerArgv` | Re-export |
| `./pipeline.js` | `ProbeSearchOptions, ProbeSearchResult` | Re-export (type-only) |
| `./report.js` | `formatProbeReport, formatFrontierScan, formatFrontierGap` | Re-export |
| `./study.js` | `parseStudy, loadStudyFromJson, loadStudyFile, attachReplication, studyCsvToRaw, runProbeStudy, formatProbeStudy, chiSquareSurvival, fSurvival, effectiveSigma, StudyRefusal` | Re-export |
| `./study.js` | `ProbeStudy, ProbeStudyOptions, ProbeStudyResult, StudyVerdict, ReplicationOutcome, StudyRole, StudyProvenance, StudyObservation, StudyBaseline, SetTest, ModelTest, CandidateTest, StudyDesignSuggestion, StudyCorrection, StudyCorrectionReport, CorrectionStep` | Re-export (type-only) |
| `./study.js` | `CorrectionCoefficient` | Re-export (type-only) |

**Exports:**
- Re-exports:

  ```text
  SCHEMA_VERSION, PROBE_SCHEMA_VERSION, DEFAULT_SEARCH_BUDGET, ProbeCandidateStatus, RelationKind,
  AuditState, DiscrepancyKind, DatasetRole, SearchStopReason, FrontierGapKind, IdentifiabilityKind,
  SearchBudget, DiscrepancyDefinition, ScientificRelationRef, IdentifiabilityAssessment,
  SearchabilityAssessment, GapEvidence, FrontierGap, ProbeCandidateOrigin, ProbeCandidateBody,
  StatusEvent, CandidateFingerprint, ComplexityMetrics, ProbeCandidateRecord, ProbeRejectionRecord,
  DiscoveryBackendDescriptor, EnvironmentFingerprint, NondeterminismSource, DiscoveryRunManifest,
  DimensionalVariableRef, ObservationRow, ProbeDataset, SearchProblem, ScoreVector,
  EvidenceAssessment, EvidenceProfile, DeclaredLimit, FalsificationBattery, FalsificationRecord,
  ScientificRelationRecord, canonicalJson, sha256Hex, hashCanonical, captureEnvironment, openBudget,
  budgetStopReason, canEmitCandidate, BudgetState, bodyExpression, countAstNodes, countOperators,
  maxPowerOrder, complexityOf, fingerprintExpr, scalarDiscrepancy, rmse, ResidualError, openManifest,
  closeManifest, canTransition, applyStatus, statusRank, ProbeCandidateStore, monomialToExpr,
  generateNative, RawCandidate, powerLawDetermination, powerLawWording, rationalizeExponent,
  piStructure, logDesign, logDesignRank, PowerLawDetermination, PowerLawExponent, PowerLawFit,
  PiStructure, LogDesign, wrapRelationLinkGaps, wrapConnectorGaps, wrapRegimeGaps, scanFrontier,
  findFrontierGap, problemFromResidualGap, expressionSearchGaps, scanWithExpressionGaps, fitPrefactor,
  FitResult, scoreCandidate, rankPareto, RankedCandidate, compareToCorpus, corpusRelativeWording,
  CorpusMatch, CorpusComparisonResult, checkDeclaredLimit, checkDeclaredLimits, LimitCheckResult,
  LimitOutcome, runFalsification, DEFAULT_BATTERIES, FalsifyInput, FalsifyResult, datasetFromRows,
  asDatasetSafe, loadDatasetFromJson, loadSplitDatasetsFromJson, loadDatasetFromCsv, loadSplitCsv,
  readDatasetNumber, DatasetError, SplitFileDatasets, suggestDiscriminatingPoint, parseDesignBounds,
  DesignBounds, DesignSuggestion, detectMeanChangepoint, estimateScaleExponent, probeConservation,
  ChangepointInput, ChangepointResult, ScaleSymmetryInput, ScaleExponentResult, ConservationResult,
  studentTwoSidedP, runBackendWorker, BackendRequest, BackendCandidate, BackendResponse,
  setRelationMetadata, getRelationMetadata, listRelationMetadata, clearRelationMetadata,
  makeResidualGap, loadSearchProblemFromJson, searchProblemFromFile, resolveObservationsPath,
  parseExprJson, ProblemFileError, ProblemFile, runProbeSearch, nodeWorkerArgv, ProbeSearchOptions,
  ProbeSearchResult, formatProbeReport, formatFrontierScan, formatFrontierGap, parseStudy,
  loadStudyFromJson, loadStudyFile, attachReplication, studyCsvToRaw, runProbeStudy, formatProbeStudy,
  chiSquareSurvival, fSurvival, effectiveSigma, StudyRefusal, ProbeStudy, ProbeStudyOptions,
  ProbeStudyResult, StudyVerdict, ReplicationOutcome, StudyRole, StudyProvenance, StudyObservation,
  StudyBaseline, SetTest, ModelTest, CandidateTest, StudyDesignSuggestion, StudyCorrection,
  StudyCorrectionReport, CorrectionStep, CorrectionCoefficient
  ```


---

### `src/composition/probe/limits.ts` - Declared-limit checks for probe candidates.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `norm2` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `./types.js` | `DeclaredLimit, ProbeDataset` | Import (type-only) |
| `../expr-eval.js` | `evalExpr` | Import |

**Exports:**
- Interfaces: `LimitCheckResult`
- Types: `LimitOutcome`
- Functions: `checkDeclaredLimit`, `checkDeclaredLimits`

---

### `src/composition/probe/metadata.ts` - Optional scientific-relation metadata overlay.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `ScientificRelationRecord, ScientificRelationRef` | Import (type-only) |

**Exports:**
- Functions: `setRelationMetadata`, `getRelationMetadata`, `listRelationMetadata`, `clearRelationMetadata`

---

### `src/composition/probe/pipeline.ts` - Product B search orchestrator.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/validator.js` | `validate` | Import |
| `../../dimensional/algebra.js` | `equals` | Import |
| `./types.js` | `DiscoveryBackendDescriptor, ProbeCandidateRecord, ProbeRejectionRecord, SearchBudget, SearchProblem, SearchStopReason, DiscoveryRunManifest` | Import (type-only) |
| `./types.js` | `DEFAULT_HOLDOUT_TOL, DEFAULT_SEARCH_BUDGET, SCHEMA_VERSION` | Import |
| `./search-budget.js` | `openBudget, budgetStopReason, BudgetState` | Import |
| `./generator.js` | `generateNative, nativeDetermination, powerLawDetermination, powerLawWording, withinAstCaps, RawCandidate` | Import |
| `./fingerprint.js` | `fingerprintExpr, complexityOf, bodyExpression` | Import |
| `./corpus.js` | `compareToCorpus, corpusPrefactorNotes, corpusRelativeWording, CorpusComparisonResult` | Import |
| `./fit.js` | `fitPrefactor, FitResult` | Import |
| `./falsify.js` | `runFalsification, FalsifyResult` | Import |
| `./candidate-store.js` | `applyStatus, ProbeCandidateStore` | Import |
| `./run-manifest.js` | `openManifest, closeManifest` | Import |
| `./serialize.js` | `hashCanonical` | Import |
| `./scoring.js` | `scoreCandidate, rankPareto, RankedCandidate` | Import |
| `./backend-protocol.js` | `runBackendWorker` | Import |
| `./scalar-search.js` | `SCALAR_SEARCH_ORIGIN, scalarSearchCandidates, UnsupportedScalarFunctionError, ProbeScalarSearchOptions` | Import |

**Exports:**
- Interfaces: `ProbeSearchOptions`, `ProbeSearchResult`
- Functions: `nodeWorkerArgv`, `runProbeSearch`
- Constants: `NO_HOLDOUT_WORDING`

---

### `src/composition/probe/power-law.ts` - Power-law discovery over the Buckingham π-groups (proposal 8 of

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `gcd, matrixRank, ols` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/buckingham.js` | `buckinghamPi, dimensionallyDetermines, PiGroup` | Import |
| `./types.js` | `DimensionalVariableRef, ObservationRow, SearchProblem` | Import (type-only) |

**Exports:**
- Interfaces: `PowerLawExponent`, `PowerLawFit`, `Rational`, `PiStructure`, `LogDesign`
- Types: `PowerLawDetermination`
- Functions: `rationalCandidates`, `rationalizeExponent`, `piStructure`, `logDesign`, `logDesignRank`, `powerLawDetermination`, `powerLawWording`
- Constants: `MAX_EXPONENT_DENOMINATOR`

---

### `src/composition/probe/problem.ts` - Search-problem construction and JSON loading for Product B.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `path` | `dirname, isAbsolute, resolve` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/data-file.js` | `readJsonFile` | Import |
| `../../core/json-schema.js` | `isPlainObject` | Import |
| `../../dimensional/dimension-spec.js` | `parseDimensionSpec` | Import |
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `./types.js` | `DimensionalVariableRef, DiscrepancyDefinition, FrontierGap, FrontierGapKind, ProbeDataset, SearchProblem` | Import (type-only) |
| `./frontier.js` | `problemFromResidualGap` | Import |
| `./dataset.js` | `asDatasetSafe, loadSplitDatasetsFromJson` | Import |

**Exports:**
- Classes: `ProblemFileError`
- Interfaces: `ProblemFile`
- Functions: `isGapKind`, `makeResidualGap`, `loadSearchProblemFromJson`, `resolveObservationsPath`, `searchProblemFromFile`, `parseExprJson`

---

### `src/composition/probe/report.ts` - Scientist-facing probe reports. Never prints a status stronger than the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./fingerprint.js` | `bodyExpression` | Import |
| `./corpus.js` | `corpusRelativeWording` | Import |
| `./pipeline.js` | `ProbeSearchResult` | Import (type-only) |
| `./types.js` | `FrontierGap, ProbeCandidateRecord, ProbeCandidateStatus` | Import (type-only) |

**Exports:**
- Functions: `formatProbeReport`, `formatFrontierScan`, `formatFrontierGap`

---

### `src/composition/probe/residual.ts` - Explicit residual / discrepancy evaluation. Does not replace

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `norm2` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `DiscrepancyDefinition, DiscrepancyKind` | Import (type-only) |

**Exports:**
- Classes: `ResidualError`
- Functions: `scalarDiscrepancy`, `rmse`

---

### `src/composition/probe/run-manifest.ts` - Discovery-run manifest construction (schema v0).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `DiscoveryBackendDescriptor, DiscoveryRunManifest, SearchBudget, SearchStopReason` | Import (type-only) |
| `./types.js` | `DEFAULT_HOLDOUT_TOL, DEFAULT_SEARCH_BUDGET, SCHEMA_VERSION` | Import |
| `../canonical-json.js` | `captureEnvironment, hashCanonical` | Import |
| `../canonical-json.js` | `captureEnvironment` | Re-export |

**Exports:**
- Interfaces: `ManifestDraft`
- Functions: `openManifest`, `closeManifest`
- Re-exports: `captureEnvironment`

---

### `src/composition/probe/scalar-search.ts` - MathTS scalar-search trees as UPT probe candidates (plan task P5).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-expression` | `SCALAR_FUNCTION_LOWERING, ScalarGrammar, ScalarNode, ScalarOperator` |
| `@danielsimonjr/mathts-core` | `Fraction, SiDimensionVector` |
| `@danielsimonjr/mathts-functions` | `runScalarSearch` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../rational-exponent.js` | `rationalize` | Import |
| `./generator.js` | `RawCandidate` | Import (type-only) |
| `./types.js` | `SearchProblem` | Import (type-only) |

**Exports:**
- Classes: `UnsupportedScalarFunctionError`
- Interfaces: `ProbeScalarSearchOptions`
- Functions: `scalarNodeToExpr`, `dimensionToRational`, `scalarSearchCandidates`
- Constants: `SCALAR_SEARCH_ORIGIN`

---

### `src/composition/probe/scoring.ts` - Pareto scoring for probe candidates. Does not touch `VettedCandidate.score`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `ProbeCandidateRecord, ScoreVector` | Import (type-only) |
| `./falsify.js` | `FalsifyResult` | Import (type-only) |

**Exports:**
- Interfaces: `RankedCandidate`
- Functions: `scoreCandidate`, `rankPareto`

---

### `src/composition/probe/search-budget.ts` - Search-budget accounting for Product B. Product A (`rankDiscoveries`) is

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `SearchBudget, SearchStopReason` | Import (type-only) |
| `./types.js` | `DEFAULT_SEARCH_BUDGET` | Import |
| `./types.js` | `DEFAULT_SEARCH_BUDGET` | Re-export |

**Exports:**
- Interfaces: `BudgetState`
- Functions: `openBudget`, `budgetStopReason`, `canEmitCandidate`
- Re-exports: `DEFAULT_SEARCH_BUDGET`

---

### `src/composition/probe/serialize.ts` - Probe-profile re-exports of the one canonical-JSON module.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../canonical-json.js` | `canonicalJson, sha256Hex, hashCanonical` | Re-export |

**Exports:**
- Re-exports: `canonicalJson`, `sha256Hex`, `hashCanonical`

---

### `src/composition/probe/structure.ts` - Cheap structure probes as TESTS: a regime changepoint, a scale symmetry, a

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `pairwiseSum, sumSquaredDeviations` |
| `@danielsimonjr/mathts-functions` | `gradient, linearRegression, permutationTest, studentTTest` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../numerical/statistics.js` | `meanOf` | Import |
| `./t-tail.js` | `studentTwoSidedP` | Import |

**Exports:**
- Interfaces: `ChangepointInput`, `ChangepointResult`, `ScaleSymmetryInput`, `ScaleExponentResult`, `ConservationResult`
- Functions: `detectMeanChangepoint`, `estimateScaleExponent`, `probeConservation`

---

### `src/composition/probe/study.ts` - Falsification-oriented study over calibrated observations (audit §14 I19).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `pairwiseDot, pairwiseSum` |
| `@danielsimonjr/mathts-functions` | `chiSquaredCDF, chiSquaredSF, fSF, inv, propagateUncertainty` |

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `readFileSync` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/mathts-read.js` | `numberFrom` | Import |
| `../../core/data-file.js` | `readJsonFile` | Import |
| `../../core/json-schema.js` | `isPlainObject` | Import |
| `../../dimensional/types.js` | `DIMENSIONLESS, Dimension` | Import |
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../../dimensional/algebra.js` | `equals, format` | Import |
| `../../dimensional/units.js` | `convertValue, parseUnit, UnitError` | Import |
| `../../numerical/formula-mathts.js` | `parseFormula` | Import |
| `../../numerical/formula-dimension.js` | `builtinFormulaDimensionChecker` | Import |
| `../expr-eval.js` | `evalExpr` | Import |
| `./types.js` | `SearchBudget, SearchStopReason` | Import (type-only) |
| `./types.js` | `SCHEMA_VERSION` | Import |
| `./dataset.js` | `datasetFromRows` | Import |
| `./frontier.js` | `problemFromResidualGap` | Import |
| `./problem.js` | `isGapKind, makeResidualGap` | Import |
| `./pipeline.js` | `NO_HOLDOUT_WORDING, runProbeSearch` | Import |
| `./fingerprint.js` | `bodyExpression` | Import |
| `./serialize.js` | `canonicalJson, hashCanonical` | Import |

**Exports:**
- Classes: `StudyRefusal`
- Interfaces:

  ```text
  StudyProvenance, StudyQuantity, StudyObservation, StudyCorrection, StudyBaseline, ProbeStudy,
  ClosenessTest, ReplicationIndependence, SetTest, ModelTest, CorrectionStep, CandidateTest,
  CorrectionCoefficient, StudyCorrectionReport, StudyDesignSuggestion, ProbeStudyResult,
  ProbeStudyOptions
  ```

- Types: `StudyRole`, `ModelKind`, `StudyVerdict`, `ReplicationOutcome`
- Functions:

  ```text
  parseStudy, loadStudyFromJson, loadStudyFile, attachReplication, replicationIndependence,
  studyCsvToRaw, chiSquareSurvival, chiSquareCdf, fSurvival, effectiveSigma, runProbeStudy,
  formatProbeStudy
  ```

- Constants: `DEFAULT_ALPHA`, `MAX_CORRECTION_TERMS`

---

### `src/composition/probe/t-tail.ts` - The two-sided tail of Student's t, computed directly.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `studentTCDF` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../core/mathts-read.js` | `numberFrom` | Import |

**Exports:**
- Functions: `studentTwoSidedP`

---

### `src/composition/probe/types.ts` - Product B (expression / residual search) experimental types.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../../dimensional/ast-types.js` | `ExprNode` | Import (type-only) |
| `../identifiability.js` | `IdentifiabilityResult` | Import (type-only) |

**Exports:**
- Interfaces:

  ```text
  SearchBudget, DiscrepancyDefinition, ScientificRelationRef, IdentifiabilityAssessment,
  SearchabilityAssessment, GapEvidence, FrontierGap, StatusEvent, CandidateFingerprint,
  ComplexityMetrics, ProbeCandidateRecord, ProbeRejectionRecord, DiscoveryBackendDescriptor,
  EnvironmentFingerprint, NondeterminismSource, DiscoveryRunManifest, DimensionalVariableRef,
  ProbeDataset, SearchProblem, DeclaredLimit, FalsificationRecord, ScientificRelationRecord,
  ScoreVector, EvidenceAssessment, EvidenceProfile
  ```

- Types:

  ```text
  ProbeCandidateStatus, RelationKind, AuditState, DiscrepancyKind, DatasetRole, SearchStopReason,
  FrontierGapKind, IdentifiabilityKind, ProbeCandidateOrigin, ProbeCandidateBody, ObservationRow,
  FalsificationBattery
  ```

- Constants: `SCHEMA_VERSION`, `PROBE_SCHEMA_VERSION`, `DEFAULT_SEARCH_BUDGET`, `DEFAULT_HOLDOUT_TOL`

---

### `src/composition/proposed-bridges.ts` - Identity-consequence surfacer — turns a promising (either tier) discovery identification

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Fraction` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/ast-builders.js` | `sym, symbolPower` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/algebra.js` | `equals, format` | Import |
| `../dimensional/buckingham.js` | `DimensionalVariable` | Import (type-only) |
| `../bridges/index.js` | `BridgeEquationStatus` | Import (type-only) |
| `../canonical/registry.js` | `canonicalByTarget, canonicalById` | Import |
| `../bridges/index.js` | `KnownIssue` | Import (type-only) |
| `../bridges/index.js` | `BRIDGE_EQUATIONS` | Import |
| `../bridges/catalog-load.js` | `catalogIdNumber` | Import |
| `../canonical/normal-form.js` | `normalForm` | Import |
| `../dimensional/symbolic-constants.js` | `isRegisteredConstant` | Import |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf, isDecimalLiteral, mapScalarLeaves` | Import |
| `./expr-eval.js` | `evalExpr` | Import |
| `./discovery.js` | `rankDiscoveries, isPromisingTier` | Import |
| `./discovery.js` | `VettedCandidate` | Import (type-only) |
| `./canonical-graph.js` | `CANONICAL_GRAPH` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./formula-shape.js` | `rationalExponentOf` | Import |
| `./algebraic-equivalence.js` | `equalUpToConstant` | Import |
| `./rational-exponent.js` | `formatRational, fractionToNumber` | Import |

**Exports:**
- Classes: `NotAMonomialError`, `MissingEvidenceError`
- Interfaces: `ProposedBridge`, `MonoLeaf`
- Types: `Mono`
- Functions:

  ```text
  toMonomial, fromMonomial, latexFromMono, isolateLeaf, resolveSources, deriveProposedBridges,
  dedupByNormalForm, promoteProposal, toProposedEntry, proposedBridges
  ```


---

### `src/composition/quantities.ts` - Graph quantity nodes, projected from the quantity registry.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/quantity-registry.js` | `allQuantityRecords` | Import |
| `./quantity.js` | `Quantity` | Import (type-only) |
| `./quantity.js` | `regimeAttributesOf` | Import |

**Exports:**
- Functions: `allQuantities`, `quantityByName`

---

### `src/composition/quantity-clusters.ts` - The one component owner: items that share a (canonical) quantity are one cluster.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `connectedComponents` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |

**Exports:**
- Functions: `quantityCanonicalizer`, `groupInto`, `clusterBySharedKeys`

---

### `src/composition/quantity.ts` - Composition graph — quantity nodes (v0.8.0 T2, per

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./axes.js` | `ScaleAxis, ForceAxis, InformationAxis, SymmetryAxis, TopologyAxis, StatisticsAxis` | Import (type-only) |
| `./axes.js` | `AXES` | Import |

**Exports:**
- Interfaces: `RegimeAttributes`, `Quantity`
- Functions: `regimeAttributesOf`, `regimesDiffer`

---

### `src/composition/rational-exponent.ts` - Exact rationals from doubles, for exponents and prefactors.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Fraction` |

**Exports:**
- Interfaces: `RationalizeOptions`
- Functions: `rationalize`, `fractionToNumber`, `formatRational`
- Constants: `DEFAULT_MAX_DENOMINATOR`

---

### `src/composition/representative-values.ts` - Order-of-magnitude representative values for the discovery falsifier.

**Exports:**
- Interfaces: `RepresentativeValue`
- Functions: `sigmaDecadesOf`, `representativeValue`
- Constants: `DEFAULT_SIGMA_DECADES`, `REPRESENTATIVE_VALUES`

---

### `src/composition/retrodiction.ts` - Retrodiction harness (Consequence 2 of

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./canonical-prefactors.js` | `CANONICAL_GROUP_PREFACTORS` | Import |
| `./edge.js` | `CoefficientUnsetError, evaluateEdge` | Import |
| `../bridges/evaluation-errors.js` | `DomainViolationError` | Import |
| `../bridges/carrier-sign.js` | `CarrierSignError` | Import |
| `../numerical/formula-contract.js` | `FormulaError` | Import |
| `../numerical/statistics.js` | `meanOf` | Import |
| `./compose.js` | `QuantityIdentification` | Import (type-only) |
| `./compose.js` | `QUANTITY_IDENTIFICATIONS` | Import |
| `../dimensional/unit-convention.js` | `conventionFactor` | Import |
| `./identifiability.js` | `classifyAll` | Import |

**Exports:**
- Interfaces: `RetrodictionPrediction`, `RetrodictionOptions`, `RetrodictionRefusal`, `RetrodictionResult`, `RetrodictionReport`
- Types: `RetrodictionOutcome`
- Functions: `evaluationInputs`, `refusesThePoint`, `forwardEvaluate`, `retrodictNode`, `retrodict`

---

### `src/composition/uncertainty.ts` - First-order uncertainty propagation through composition edges

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `propagateUncertainty` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./edge.js` | `BridgeEdge` | Import (type-only) |
| `./edge.js` | `evaluateEdge` | Import |
| `../relations/types.js` | `ApproximationBound` | Import (type-only) |

**Exports:**
- Interfaces: `UncertaintyOptions`, `UncertaintyResult`
- Functions: `propagateUncertainty`

---

### `src/composition/user-equation.ts` - User-equation injection — turn a free-form `TARGET = EXPR` string into a graph

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../numerical/formula-registry.js` | `getFormulaParser, parsePhysics` | Import |
| `../numerical/formula-dimension.js` | `formulaSymbolDimension` | Import |
| `../dimensional/dimension-spec.js` | `CONSTANT_SPELLINGS` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANTS, isRegisteredConstant` | Import |
| `../dimensional/formula-names.js` | `formulaNameDimensions` | Import |
| `../dimensional/natural-units.js` | `naturalNote, naturalPowers, UnitMode` | Import |
| `./aliases.js` | `aliasesForTarget, editDistance` | Import |
| `../dimensional/formula-names.js` | `resolveQuantityName` | Import |
| `./catalog-graph.js` | `CATALOG_GRAPH` | Import |
| `./graph-viz.js` | `VizModel, VizJunction` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `../dimensional/algebra.js` | `equals` | Import |
| `../dimensional/dimension-inference.js` | `inferUnknownDimension` | Import |
| `../dimensional/hyphen-names.js` | `rewriteCatalogHyphens` | Import |
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Classes: `UserEquationError`
- Interfaces: `UserEquation`, `AnalyzeUserEquationOptions`, `EquationLanding`, `EquationHint`, `ShortBinding`, `EquationAnalysis`
- Functions: `hyphenSubtractHint`, `parseUserEquation`, `suggestQuantities`, `suggestByDimension`, `equationLanding`, `formatConnectedSummary`, `analyzeUserEquation`

---

<a id="core-dependencies"></a>

## Core Dependencies

### `src/core/assignment.ts` - One split of a `name=value` token.

**Exports:**
- Interfaces: `SplitAssignment`
- Functions: `splitAssignment`

---

### `src/core/axes-registry.ts` - `Axes` singleton registry — module-load-stable `UniversalIndex`

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./universal-index.js` | `makeIndex` | Import |
| `./universal-index.js` | `UniversalIndex` | Import (type-only) |
| `./types.js` | `PhysicalScale, Force, Symmetry, InformationMeasure` | Import (type-only) |

**Exports:**
- Interfaces: `AxesRegistry`
- Types: `ScaleAxes`, `ForceAxes`, `SymmetryAxes`, `InformationAxes`
- Constants: `Axes`

---

### `src/core/cell.ts` - Typed `Cell` discriminated union for `UniversalTensor`'s cell storage.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `PhysicalScale, Force, Symmetry, InformationMeasure, TensorIndices, PhysicalLaw, BridgeEquation, EmergentPhenomenon` | Import (type-only) |

**Exports:**
- Interfaces: `CellBase`, `LawCell`, `BridgeCell`, `EmergenceCell`
- Types: `CellConfidence`, `Cell`
- Functions: `lawToCell`, `bridgeToCell`, `emergenceToCell`

---

### `src/core/compare.ts` - Numeric and string comparisons the layers above share.

**Exports:**
- Functions: `relDiff`, `symmetricRelDiff`, `withinRel`, `withinMixed`, `withinSymmetric`, `compareCodepoint`, `byKey`

---

### `src/core/constants.ts` - Canonical CODATA 2022 + SI-defined physical constants for UPT.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Unit, exactScaleToNumber` |
| `@danielsimonjr/mathts-functions` | `*` |

**Exports:**
- Constants:

  ```text
  C_SI, R_INF_SI, G_SI, H_SI, HBAR_SI, HBAR_CODATA_DISPLAY, K_B_SI, E_SI, ALPHA, EPS0_SI, MU0_SI,
  SIGMA_SB_SI, M_P_SI, L_P_SI, T_P_SI, H0_SI, M_SUN_SI, M_SUN_KG, VON_KLITZING_SI,
  JOSEPHSON_CONSTANT_SI, LORENZ_NUMBER_SI, EULER_GAMMA, BCS_GAP_RATIO, LANE_EMDEN_OMEGA3,
  THOMSON_CROSS_SECTION_SI, GM_SUN_SI, M_SUN_IAU_SI, M_E_SI, M_PROTON_SI, N_A_SI, FARADAY_SI,
  B_WIEN_SI, M_U_SI
  ```


---

### `src/core/data-file.ts` - The packaged data files under `data/`, read and checked against their schemas.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `fs` | `readFileSync` |
| `path` | `dirname, join` |
| `url` | `fileURLToPath` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./json-schema.js` | `schemaProblems, JsonSchema` | Import |

**Exports:**
- Functions: `readJsonFile`, `schemaFileOf`, `dataText`, `dataSchema`, `parseDataFile`, `checkedDataFile`

---

### `src/core/flux-rules.ts` - Flux-rule scaffolding for v0.7 Proposal 2 — Sparse Semantic Catalog.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./cell.js` | `Cell, BridgeCell, LawCell, EmergenceCell` | Import (type-only) |
| `./types.js` | `PhysicalScale` | Import (type-only) |

**Exports:**
- Classes: `FluxViolationError`
- Interfaces: `FluxDiagnostic`, `FluxReport`, `FluxRuleResult`, `FluxRule`
- Types: `FluxRuleKind`
- Functions: `checkLBECoordinate`, `checkCausality`, `runRules`, `installRegimeConsistencyRule`
- Constants: `V07_CELL_RULES`

---

### `src/core/format.ts` - The printed forms of a number.

**Exports:**
- Interfaces: `PercentDigits`
- Functions: `formatQuantity`, `formatExact`, `formatPercent`

---

### `src/core/hash.ts` - One SHA-256 digest.

**Node.js Built-in Dependencies:**
| Module | Import |
|--------|--------|
| `crypto` | `createHash` |

**Exports:**
- Functions: `sha256Hex`

---

### `src/core/json-schema.ts` - A JSON Schema reader for the keyword subset the repository's data schemas use.

**Exports:**
- Types: `JsonSchema`
- Functions: `isPlainObject`, `schemaProblems`

---

### `src/core/labeled-tensor.ts` - `LabeledTensor` — engine-level tensor wrapped with

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../numerical/tensor-engine.js` | `EngineTensor, TensorEngine, EinsumSpec` | Import (type-only) |
| `../dimensional/errors.js` | `UPTError` | Import |
| `./universal-index.js` | `AxisName, UniversalIndex, UniversalIndexId` | Import (type-only) |

**Exports:**
- Classes:

  ```text
  LabeledTensorConstructionError, AxisMismatchError, IdentityConflictError, IndexNameMismatchError,
  RankPreservationError, AxisOrderError, AxisMergeError, AxisSplitError, LabeledTensor
  ```

- Functions: `canonicalLabelOrder`

---

### `src/core/mathts-read.ts` - Readers for the typed MathTS results.

**Exports:**
- Functions: `numberFrom`, `numberMatrixFrom`

---

### `src/core/regime-registry.ts` - `RegimeType` extension system — v0.8 Proposal 5.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./universal-index.js` | `AxisName` | Import (type-only) |

**Exports:**
- Classes: `RegimeCollisionError`
- Interfaces: `RegimeProvenance`, `RegimeValueBase`, `RegimeSpec`
- Types: `AxisConvenience`
- Functions: `defineRegime`, `lookupRegime`, `listRegimesByAxis`, `provenanceFor`, `attachRegimesToCell`, `getCellRegimes`, `_resetRegistryForTesting`
- Constants: `defineScale`, `defineForce`, `defineSymmetry`, `defineInformation`, `defineDimension`, `defineTopology`

---

### `src/core/regime-rule-install.ts` - Wiring: installs P5's `RegimeConsistency` rule body into the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./flux-rules.js` | `installRegimeConsistencyRule, FluxRuleResult` | Import |
| `./regime-registry.js` | `getCellRegimes` | Import |
| `./cell.js` | `Cell` | Import (type-only) |
| `./universal-index.js` | `AxisName` | Import (type-only) |

---

### `src/core/regimes-builtins.ts` - Built-in regime registrations — Phase 2 of v0.8 Proposal 5.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./regime-registry.js` | `defineRegime` | Import |
| `./types.js` | `PhysicalScale, Force, Symmetry, InformationMeasure` | Import (type-only) |

---

### `src/core/tensor.ts` - Universal Physics Tensor

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `TensorConfig, TensorIndices, PhysicalLaw, BridgeEquation, EmergentPhenomenon, PhysicalScale, Force` | Import (type-only) |
| `./cell.js` | `Cell, CellConfidence, LawCell, BridgeCell, EmergenceCell` | Import (type-only) |
| `./cell.js` | `lawToCell, bridgeToCell, emergenceToCell` | Import |
| `./axes-registry.js` | `Axes` | Import |
| `./flux-rules.js` | `FluxRule, FluxReport, FluxDiagnostic` | Import (type-only) |
| `./flux-rules.js` | `runRules, V07_CELL_RULES, FluxViolationError` | Import |

**Exports:**
- Classes: `UniversalTensor`
- Functions: `compose`

---

### `src/core/types.ts` - Core types for Universal Physics Tensor Framework

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./constants.js` | `ALPHA, C_SI, E_SI, G_SI, H0_SI, H_SI, HBAR_SI, K_B_SI, L_P_SI, M_P_SI, T_P_SI` | Import |

**Exports:**
- Interfaces: `TensorConfig`, `TensorIndices`, `PhysicalLaw`, `BridgeEquation`, `EmergentPhenomenon`
- Types: `PhysicalScale`, `Force`, `Symmetry`, `InformationMeasure`
- Constants: `PhysicalConstants`

---

### `src/core/universal-index.ts` - Universal index — persistent-identity carrier for physics axes.

**Exports:**
- Interfaces: `UniversalIndex`, `MakeIndexOptions`
- Types: `AxisName`, `UniversalIndexId`
- Functions: `makeIndex`

---

<a id="diff-dependencies"></a>

## Diff Dependencies

### `src/diff/bridge-ast-gradient.ts` - Exact bridge-gradients over the symbolic RHS AST.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-expression` | `ScalarBuildError` |
| `@danielsimonjr/mathts-functions` | `compileScalarGradient` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/ast-leaves.js` | `forEachScalarLeaf, isDecimalLiteral` | Import |
| `../dimensional/symbolic-constants.js` | `constantScope` | Import |
| `../dimensional/scalar-lowering.js` | `toScalarNode` | Import |
| `../bridges/rhs-registry.js` | `BRIDGE_RHS_BY_ID, parseBridgeId` | Import |

**Exports:**
- Interfaces: `ASTGradientResult`
- Functions: `bridgeGradientAST`, `bridgeGradientASTById`, `astDifferentiableBridgeIds`

---

### `src/diff/bridge-gradient.ts` - Bridge-parameter differentiation by central finite differences.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../numerical/finite-difference.js` | `centralPartial` | Import |

**Exports:**
- Interfaces: `BridgeDiffSpec`, `BridgeNumericalGradientResult`
- Functions: `bridgeGradientNumerical`

---

### `src/diff/bridge-specs.ts` - Differentiable relations projected from the catalog. The scalar is the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./bridge-gradient.js` | `BridgeDiffSpec` | Import (type-only) |
| `../bridges/catalog-load.js` | `catalogEdgeKey, catalogRelations` | Import |
| `../bridges/catalog-types.js` | `CatalogRelation` | Import (type-only) |
| `../bridges/relation-eval.js` | `evaluateCatalogRelation` | Import |

**Exports:**
- Interfaces: `ShapiroInput`, `PerihelionInput`, `HawkingInput`, `DecoherenceInput`
- Functions: `requireCatalogId`
- Constants: `SHAPIRO_DELAY_DIFF`, `PERIHELION_ADVANCE_DIFF`, `HAWKING_TEMPERATURE_DIFF`, `DECOHERENCE_RATE_DIFF`, `DIFFERENTIABLE_RELATIONS`

---

<a id="dimensional-dependencies"></a>

## Dimensional Dependencies

### `src/dimensional/algebra.ts` - Dimensional algebra: per-base-exponent arithmetic.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension, NAMED_DIMENSIONS` | Import |
| `./errors.js` | `DimensionMismatchError` | Import |
| `./errors.js` | `DimensionMismatchError` | Re-export |

**Exports:**
- Functions:

  ```text
  isDimensionless, exactlyEquals, multiply, divide, power, equals, add, subtract, format, siUnitOf
  ```

- Constants: `BASES`, `EXPONENT_TOL`, `SI_BASE`
- Re-exports: `DimensionMismatchError`

---

### `src/dimensional/ast-builders.ts` - Tiny pure builders for dimensional ASTs — `sym` (a symbol leaf) and `dim`

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Functions: `sym`, `dim`, `symbolPower`

---

### `src/dimensional/ast-leaves.ts` - One owner for the scalar-leaf walk of an `ExprNode` and the literal rule.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./ast-types.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Interfaces: `LeafWalkArms`
- Types: `ScalarLeaf`
- Functions: `isDecimalLiteral`, `literalValue`, `scalarChildren`, `forEachScalarLeaf`, `mapScalarLeaves`
- Constants: `DECIMAL_LITERAL`, `ALL_SCALAR_ARMS`

---

### `src/dimensional/ast-types.ts` - The dimensional AST type system — `ExprNode` and every node/index interface

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./curvature-composite.js` | `CurvatureCompositeNode` | Import (type-only) |

**Exports:**
- Interfaces:

  ```text
  TensorIndex, CovariantIndex, UpperIndex, TensorSymbolNode, TensorProductNode, MetricTensorNode,
  KroneckerDeltaNode, TensorPartialDerivativeNode, CovariantDerivativeNode, KillingVectorNode,
  ConservedChargeNode, StressEnergyTensorNode, CosmologicalConstantNode, EinsteinFieldEquationNode
  ```

- Types:

  ```text
  Variance, Role, TranscendentalFn, RiemannTensorNode, RicciTensorNode, EinsteinTensorNode,
  BianchiResidualNode, WeylTensorNode, KretschmannScalarNode, ExprNode
  ```


---

### `src/dimensional/bridge-check.ts` - Expected catalog dimensions, projected from the catalog record.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/data-file.js` | `checkedDataFile` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./algebra.js` | `equals` | Import |
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./validator.js` | `validate` | Import |

**Exports:**
- Functions: `inferDimensionForBridge`
- Constants: `EXPECTED_DIMENSION_BY_BRIDGE`

---

### `src/dimensional/buckingham.ts` - Buckingham-π enumerator (build target 1 of

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Fraction` |
| `@danielsimonjr/mathts-functions` | `rationalNullspace` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./algebra.js` | `BASES` | Import |

**Exports:**
- Classes: `RationalizationError`
- Interfaces: `DimensionalVariable`, `PiGroup`, `BuckinghamResult`, `DimensionalDeterminationResult`
- Types: `BuckinghamVerdict`
- Functions: `buckinghamPi`, `dimensionallyDetermines`

---

### `src/dimensional/connection-validators.ts` - Per-kind validation for v0.4.0 connection-layer AST nodes.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `ExprNode` | Import (type-only) |
| `./ast-types.js` | `Role, TensorSymbolNode, MetricTensorNode, CovariantIndex, UpperIndex, CovariantDerivativeNode, RiemannTensorNode` | Import (type-only) |
| `./algebra.js` | `divide` | Import |
| `./metric-validators.js` | `PartialDerivativeChildResult` | Import (type-only) |
| `./errors.js` | `PartialDerivativeIndexVarianceError, MetricSignatureError, DuplicateCoordinateWarning, IndexLabelCollisionError` | Import |
| `./ast-types.js` | `UpperIndex, CovariantDerivativeNode, RiemannTensorNode` | Re-export (type-only) |

**Exports:**
- Functions: `validateCovariantDerivative`, `validateRiemannTensor`, `requireOneUpThreeDownVariance`, `oneUpThreeDownFreeIndices`
- Re-exports: `UpperIndex`, `CovariantDerivativeNode`, `RiemannTensorNode`

---

### `src/dimensional/connection.ts` - v0.4.0 connection-layer helpers (composite-formula builders that produce

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `DIMENSIONLESS` | Import |
| `./algebra.js` | `equals, format` | Import |
| `./tensor.js` | `contract, tsym` | Import |
| `./tensor.js` | `TensorSymbolNode` | Import (type-only) |
| `./metric.js` | `metric, pderiv` | Import |
| `./metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./fresh-label.js` | `freshLabel` | Import |

**Exports:**
- Functions: `christoffel`

---

### `src/dimensional/constant-rows.ts` - The constant registry's rows as written: name, spellings, SI value, SI unit

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `B_WIEN_SI, C_SI, E_SI, EPS0_SI, EULER_GAMMA, FARADAY_SI, G_SI, GM_SUN_SI, H_SI, HBAR_CODATA_DISPLAY, HBAR_SI, K_B_SI, LANE_EMDEN_OMEGA3, M_E_SI, M_PROTON_SI, M_SUN_IAU_SI, M_SUN_SI, M_U_SI, MU0_SI, N_A_SI, SIGMA_SB_SI, THOMSON_CROSS_SECTION_SI, R_INF_SI` | Import |

**Exports:**
- Interfaces: `ConstantRow`
- Functions: `constantRow`
- Constants: `CONSTANT_ROWS`

---

### `src/dimensional/constants.ts` - SI dimensional signatures of a few fundamental constants, projected from

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `LENGTH, Dimension` | Import |
| `./symbolic-constants.js` | `constantRecord` | Import |

**Exports:**
- Constants: `hbar`, `c`, `k_B`, `l_P`

---

### `src/dimensional/curvature-composite.ts` - Curvature composite-AST factory (v0.6.0 Phase 3, Task 3.9).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Types: `CurvatureKind`, `CurvatureCompositeNode`
- Constants: `CURVATURE_KIND_REGISTRY`

---

### `src/dimensional/curvature-invariants.ts` - Kretschmann scalar AST node + validator (v0.6.0 Phase 3, Task 3.5).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `RiemannTensorNode, MetricTensorNode, KretschmannScalarNode` | Import (type-only) |
| `./connection-validators.js` | `validateRiemannTensor` | Import |
| `./ast-types.js` | `KretschmannScalarNode` | Re-export (type-only) |

**Exports:**
- Interfaces: `KretschmannScalarValidationResult`
- Functions: `validateKretschmannScalar`
- Re-exports: `KretschmannScalarNode`

---

### `src/dimensional/curvature.ts` - Curvature-derived helpers — Ricci and Einstein (v0.5.0 Phase 1d).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `ExprNode, CovariantIndex, RiemannTensorNode, MetricTensorNode, RicciTensorNode, EinsteinTensorNode, BianchiResidualNode` | Import (type-only) |
| `./errors.js` | `IndexLabelCollisionError` | Import |
| `./ast-types.js` | `RicciTensorNode, EinsteinTensorNode, BianchiResidualNode` | Re-export (type-only) |

**Exports:**
- Types: `RiemannChildCallback`
- Functions: `validateRicciTensor`, `ricci`, `validateEinsteinTensor`, `einstein`, `validateBianchiResidual`
- Re-exports: `RicciTensorNode`, `EinsteinTensorNode`, `BianchiResidualNode`

---

### `src/dimensional/dimension-inference.ts` - Single-unknown dimensional inference.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `DIMENSIONLESS, LENGTH` | Import |
| `./algebra.js` | `BASES, divide, power, EXPONENT_TOL` | Import |
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./validator.js` | `validate` | Import |

**Exports:**
- Functions: `substituteSymbolDim`, `inferUnknownDimension`

---

### `src/dimensional/dimension-spec.ts` - Dimension-spec parser — turns a human string into a {@link Dimension},

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `DIMENSIONLESS, LENGTH, AREA, TIME, FREQUENCY, MASS, MASS_DENSITY, VELOCITY, ACCELERATION, FORCE, ENERGY, POWER, ACTION, TEMPERATURE, ENTROPY, CHARGE` | Import |
| `./algebra.js` | `divide, multiply, power` | Import |
| `./ast-builders.js` | `dim` | Import |
| `./symbolic-constants.js` | `CONSTANT_REGISTRY` | Import |
| `./units.js` | `unitDimension` | Import |
| `../numerical/formula-dimension.js` | `parseFormulaPNode, FormulaPNode` | Import |

**Exports:**
- Classes: `DimensionSpecError`
- Functions: `parseDimensionSpec`
- Constants: `NAMED_DIMENSION_NAMES`, `CONSTANT_SPELLINGS`

---

### `src/dimensional/einstein-equation.ts` - Einstein field equation AST node (v0.6.0 Phase 2, Task 2.3).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `CovariantIndex, MetricTensorNode, EinsteinTensorNode, StressEnergyTensorNode, CosmologicalConstantNode, EinsteinFieldEquationNode` | Import (type-only) |
| `./ast-types.js` | `EinsteinFieldEquationNode` | Re-export (type-only) |
| `./field-equation-helpers.js` | `validateFreeIndexLabelMatch, validateComponentDimension, validateTensorSymmetry` | Import |

**Exports:**
- Interfaces: `EinsteinFieldEquationValidationResult`
- Functions: `validateEinsteinFieldEquation`
- Re-exports: `EinsteinFieldEquationNode`

---

### `src/dimensional/errors.ts` - UPT error hierarchy. All UPT-source errors subclass UPTError so

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import |

**Exports:**
- Classes:

  ```text
  UPTError, DimensionMismatchError, DuplicateIndexLabelError, IndexLabelCollisionError,
  VarianceMismatchError, TensorInScalarOpError, FreeIndexMismatchError,
  TensorProductChildInferenceError, InvalidMetricRankError, MetricSignatureError,
  InvalidKroneckerRankError, KroneckerVarianceError, PartialDerivativeIndexVarianceError,
  DuplicateCoordinateWarning
  ```


---

### `src/dimensional/exact-scale.ts` - Exact unit scales.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `addExactScales, decimalExactScale, divideExactScales, exactScaleOf, exactScaleToNumber, LN2_EXACT_SCALE, multiplyExactScales, PI_EXACT_SCALE, powerExactScale, ratioExactScale, readScaleExpression, ExactScale` |
| `@danielsimonjr/mathts-functions` | `gcd` |

**Exports:**
- Interfaces: `ExactScale`
- Functions:

  ```text
  coreExactScaleFromUpt, uptExactScaleFromCore, decimalScale, scaleOf, ratioScale, irrationalScale,
  multiplyScales, divideScales, powerScale, addScales, scaleToNumber, solidusSides,
  readScaleExpression
  ```

- Constants: `UNIT_SCALE`

---

### `src/dimensional/field-equation-helpers.ts` - Shared validation helpers for field-equation predicate AST nodes

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Functions: `validateFreeIndexLabelMatch`, `validateComponentDimension`, `validateTensorSymmetry`

---

### `src/dimensional/formula-names.ts` - Names a formula may use that are not leaves of {@link CONSTANTS}: the

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `MASS, TEMPERATURE` | Import |
| `./symbolic-constants.js` | `CONSTANT_REGISTRY` | Import |
| `./quantity-registry.js` | `allQuantityRecords, foldName, quantityRecord, synonymGroupsFromRegistry` | Import |

**Exports:**
- Classes: `SynonymDisagreementError`
- Interfaces: `FormulaName`, `DimensionRename`
- Functions:

  ```text
  formulaNameDimensions, quantityIdForSpelling, synonymGroup, isTemperatureName,
  temperatureQuantityRole, synonymDisagreement, assertSynonymAgreement, expandSynonymValues,
  resolveQuantityName
  ```

- Constants: `FORMULA_NAMED`, `DIMENSION_RENAMES`, `SYNONYM_GROUPS`

---

### `src/dimensional/fresh-label.ts` - Shared deterministic fresh-label utility used by both metric.ts (raise/lower)

**Exports:**
- Functions: `freshLabel`

---

### `src/dimensional/friedmann-equation.ts` - Friedmann equation AST node — modified-cosmology predicate.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `MASS_DENSITY` | Import |
| `./klein-gordon-equation.js` | `ScalarFieldNode` | Import (type-only) |
| `./algebra.js` | `equals` | Import |
| `./field-equation-helpers.js` | `validateFreeIndexLabelMatch, validateComponentDimension, validateTensorSymmetry` | Import |

**Exports:**
- Interfaces: `FriedmannEquationNode`, `FriedmannEquationValidationResult`
- Types: `FriedmannVariant`
- Functions: `validateFriedmannEquation`

---

### `src/dimensional/gauge-field.ts` - Gauge-field AST primitives for Wheeler-Feynman absorber-theory

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./algebra.js` | `BASES` | Import |
| `./field-equation-helpers.js` | `validateComponentDimension` | Import |

**Exports:**
- Interfaces: `GaugeFieldNode`, `TimeSymmetryPredicateNode`, `TimeSymmetryPredicateValidationResult`
- Types: `ArrowOfTime`
- Functions: `validateGaugeField`, `validateTimeSymmetryPredicate`

---

### `src/dimensional/hyphen-names.ts` - Kebab catalog names are one token. A parser that treats `-` as subtraction

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./symbolic-constants.js` | `constantRecord` | Import |

**Exports:**
- Functions: `escapeRegExp`, `rewriteCatalogHyphens`

---

### `src/dimensional/killing-validators.ts` - Killing-vector machinery (v0.6.0 Phase 1, Tasks 1.1–1.2).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `TensorSymbolNode, MetricTensorNode, KillingVectorNode, ConservedChargeNode` | Import (type-only) |
| `./algebra.js` | `multiply` | Import |
| `./ast-types.js` | `KillingVectorNode, ConservedChargeNode` | Re-export (type-only) |

**Exports:**
- Functions: `validateKillingVector`, `validateConservedCharge`
- Re-exports: `KillingVectorNode`, `ConservedChargeNode`

---

### `src/dimensional/klein-gordon-equation.ts` - Klein-Gordon scalar field equation AST node.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./field-equation-helpers.js` | `validateFreeIndexLabelMatch, validateComponentDimension, validateTensorSymmetry` | Import |

**Exports:**
- Interfaces: `ScalarFieldNode`, `KleinGordonEquationNode`, `KleinGordonEquationValidationResult`
- Functions: `validateKleinGordonEquation`

---

### `src/dimensional/mathts-unit-delegation.ts` - MathTS unit delegation predicates (Part A steps A4–A5).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Unit, exactScaleToNumber, getUnitRow, toSiDimensionVector` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `symmetricRelDiff` | Import |
| `./algebra.js` | `equals, multiply, power` | Import |
| `./exact-scale.js` | `scaleToNumber, solidusSides, ExactScale` | Import |
| `./unit-data.js` | `superscriptPower, UNIT_DATA, sideTokens, splitPrefix` | Import |
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Functions:

  ```text
  tryOneFactorBase, everySymbolInBothTables, mathtsExactScaleAgreed, isSubKiloParsec,
  unitExactScaleViaMathts, unitParserViaMathts, mathtsParsedDimension, _powerDim, _multiplyDim
  ```


---

### `src/dimensional/mathts-unit-wrapper.ts` - UPT unit wrapper policy on top of MathTS (Part A steps A8, A11, A12 partial).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `REFUSED_UNIT_SPELLINGS, Unit, exactScaleToNumber` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./exact-scale.js` | `scaleToNumber, solidusSides, uptExactScaleFromCore, ExactScale` | Import |
| `./mathts-unit-delegation.js` | `isSubKiloParsec, mathtsParsedDimension, tryOneFactorBase` | Import |
| `./unit-data.js` | `UNIT_DATA, sideTokens` | Import |
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Interfaces: `MathtsDelegatedReading`
- Functions: `refusedTokensIn`, `uptRefusalReason`, `isA5DelegatedText`, `mathtsWouldParse`, `applyBitScaleOverride`, `tryMathtsA5Reading`
- Constants: `A5_DELEGATED_TEXTS`

---

### `src/dimensional/metric-validators.ts` - Per-kind validation for v0.3.0 metric-layer AST nodes.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `ExprNode` | Import (type-only) |
| `./ast-types.js` | `Variance, Role, TensorIndex, MetricTensorNode, KroneckerDeltaNode, CovariantIndex, TensorPartialDerivativeNode` | Import (type-only) |
| `./algebra.js` | `divide` | Import |
| `./ast-types.js` | `MetricTensorNode, KroneckerDeltaNode, CovariantIndex, TensorPartialDerivativeNode` | Re-export (type-only) |
| `./errors.js` | `InvalidMetricRankError, MetricSignatureError, InvalidKroneckerRankError, KroneckerVarianceError, PartialDerivativeIndexVarianceError, IndexLabelCollisionError` | Import |

**Exports:**
- Interfaces: `PartialDerivativeChildResult`
- Functions: `checkInverseMetricStructure`, `validateMetricTensor`, `validateKroneckerDelta`, `validatePartialDerivative`
- Re-exports: `MetricTensorNode`, `KroneckerDeltaNode`, `CovariantIndex`, `TensorPartialDerivativeNode`

---

### `src/dimensional/metric.ts` - User-facing constructors and ergonomic helpers for v0.3.0 metric-layer

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `DIMENSIONLESS` | Import |
| `./fresh-label.js` | `freshLabel` | Import |
| `./tensor.js` | `TensorIndex` | Import (type-only) |
| `./tensor.js` | `TensorProductNode` | Import (type-only) |
| `./metric-validators.js` | `MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode, CovariantIndex` | Import (type-only) |
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./validator.js` | `validate` | Import |
| `./errors.js` | `MetricSignatureError, UPTError` | Import |

**Exports:**
- Functions: `metric`, `kronecker`, `pderiv`, `raise`, `lower`

---

### `src/dimensional/natural-units.ts` - Opt-in natural units. The default comparison stays SI: an energy written as

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |

**Exports:**
- Interfaces: `NaturalPowers`
- Types: `UnitMode`
- Functions: `naturalConstantOverrides`, `naturalPowers`, `naturalNote`

---

### `src/dimensional/quantity-registry.ts` - The quantity registry. Canonical id, aliases, dimension, and whether an

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/data-file.js` | `checkedDataFile` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./symbolic-constants.js` | `CONSTANT_REGISTRY` | Import |

**Exports:**
- Interfaces: `QuantityRecord`, `QuantityFile`
- Types: `QuantityKind`, `SignRole`
- Functions: `readQuantityFile`, `quantitySpellingIndex`, `allQuantityRecords`, `quantityRecord`, `synonymGroupsFromRegistry`
- Constants: `foldName`

---

### `src/dimensional/rg-flow.ts` - Renormalization-group (RG) flow primitives — `RGCouplingNode` +

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./validator.js` | `ExprNode` | Import (type-only) |
| `./validator.js` | `validate` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `DIMENSIONLESS` | Import |
| `./field-equation-helpers.js` | `validateComponentDimension` | Import |

**Exports:**
- Interfaces: `RGCouplingNode`, `BetaFunctionNode`, `BetaFunctionValidationResult`
- Functions: `rgCoupling`, `validateRGCoupling`, `validateBetaFunction`

---

### `src/dimensional/scalar-lowering.ts` - The one lowering of a UPT scalar `ExprNode` to a MathTS `ScalarNode`.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-expression` | `createScalarBuilder, ScalarNode` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./validator.js` | `ExprNode` | Import (type-only) |

**Exports:**
- Functions: `toScalarNode`

---

### `src/dimensional/stress-energy-validators.ts` - Stress-energy tensor and cosmological constant AST nodes (v0.6.0 Phase 2).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `CovariantIndex, StressEnergyTensorNode, CosmologicalConstantNode` | Import (type-only) |
| `./ast-types.js` | `StressEnergyTensorNode, CosmologicalConstantNode` | Re-export (type-only) |

**Exports:**
- Functions: `validateStressEnergyTensor`, `validateCosmologicalConstant`
- Re-exports: `StressEnergyTensorNode`, `CosmologicalConstantNode`

---

### `src/dimensional/symbolic-constants.ts` - The constant registry: one row per physical constant a formula may name.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `withinRel` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./units.js` | `parseUnit` | Import |
| `./constant-rows.js` | `CONSTANT_ROWS, constantRow, ConstantRow` | Import |

**Exports:**
- Classes: `ConstantDisagreementError`
- Interfaces: `ConstantRecord`, `NamedConstantValue`, `ConstantProvenance`
- Functions: `constantRecord`, `constantAgreement`, `constantNotes`, `constantScope`, `isRegisteredConstant`, `piMultipleValue`
- Constants: `CONSTANT_REGISTRY`, `CONSTANTS`, `CONSTANT_PROVENANCE`

---

### `src/dimensional/tensor-trace.ts` - TensorTraceNode — structural tensor-trace operator for rank-2 tensors.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `./field-equation-helpers.js` | `validateComponentDimension, validateTensorSymmetry` | Import |

**Exports:**
- Interfaces: `TracableTensorNode`, `TensorTraceNode`, `TensorTraceValidationResult`, `TensorTraceOptions`
- Functions: `validateTensorTrace`

---

### `src/dimensional/tensor.ts` - Tensor AST node types and helpers — v0.2.0 algebra layer.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./types.js` | `DIMENSIONLESS` | Import |
| `./algebra.js` | `multiply` | Import |
| `./ast-types.js` | `ExprNode, Role, TensorIndex, TensorSymbolNode, TensorProductNode` | Import (type-only) |
| `./errors.js` | `DuplicateIndexLabelError, IndexLabelCollisionError, VarianceMismatchError` | Import |
| `./ast-types.js` | `Variance, Role, TensorIndex, TensorSymbolNode, TensorProductNode` | Re-export (type-only) |

**Exports:**
- Interfaces: `ChildValidationResult`
- Functions: `validateTensorSymbol`, `computeContraction`, `tsym`, `scale`, `contract`, `tsum`
- Re-exports: `Variance`, `Role`, `TensorIndex`, `TensorSymbolNode`, `TensorProductNode`

---

### `src/dimensional/types.ts` - SI dimensional types.

**Exports:**
- Interfaces: `Dimension`
- Constants:

  ```text
  DIMENSIONLESS, LENGTH, AREA, TIME, FREQUENCY, MASS, MASS_DENSITY, VELOCITY, ACCELERATION, FORCE,
  ENERGY, POWER, ACTION, VOLUME, MOMENTUM, PRESSURE, SPRING_CONSTANT, VISCOSITY, LINEAR_DENSITY,
  WAVENUMBER, DIFFUSIVITY, ENERGY_FLUX, GRAVITATIONAL_CONSTANT, TEMPERATURE, ENTROPY,
  THERMAL_CONDUCTIVITY, SPECIFIC_HEAT, CHARGE, CAPACITANCE, INDUCTANCE, RESISTANCE, PERMITTIVITY,
  ELECTRIC_FIELD, RESISTIVITY, NAMED_DIMENSIONS
  ```


---

### `src/dimensional/unit-convention.ts` - Per-quantity unit convention for the quantities whose dimension does not

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./algebra.js` | `equals` | Import |
| `./units.js` | `parseUnit` | Import |

**Exports:**
- Functions: `quantityConventionUnit`, `conventionScaleToSI`, `conventionFactor`

---

### `src/dimensional/unit-data.ts` - The unit table, loaded from `data/units.json` and validated once.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `REFUSED_UNIT_SPELLINGS, readScaleExpression` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/hash.js` | `sha256Hex` | Import |
| `../core/data-file.js` | `dataSchema, dataText, parseDataFile` | Import |
| `../core/json-schema.js` | `JsonSchema` | Import (type-only) |
| `./constant-rows.js` | `constantRow` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./exact-scale.js` | `coreExactScaleFromUpt, decimalScale, irrationalScale, scaleOf, uptExactScaleFromCore, ExactScale` | Import |

**Exports:**
- Interfaces: `UnitRow`, `AffineRow`, `UnitTableData`
- Functions: `readUnitFile`, `splitPrefix`, `superscriptPower`, `sideTokens`
- Constants: `UNIT_DATA`

---

### `src/dimensional/units.ts` - Unit parsing for numeric inputs: `1um`, `25degC`, `1 kohm`, `3.8e-16 kg/m^3`.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `Unit, exactScaleToNumber` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `compareCodepoint` | Import |
| `./algebra.js` | `equals, format, multiply, power` | Import |
| `./types.js` | `Dimension` | Import (type-only) |
| `./exact-scale.js` | `addScales, decimalScale, divideScales, multiplyScales, powerScale, ratioScale, scaleToNumber, solidusSides, UNIT_SCALE, ExactScale` | Import |
| `./mathts-unit-delegation.js` | `mathtsParsedDimension, unitExactScaleViaMathts, unitParserViaMathts` | Import |
| `./mathts-unit-wrapper.js` | `applyBitScaleOverride, tryMathtsA5Reading, uptRefusalReason` | Import |
| `./unit-data.js` | `superscriptPower, UNIT_DATA, sideTokens, splitPrefix, AffineRow` | Import |

**Exports:**
- Classes: `UnitError`, `UnknownUnitError`, `UnitRefusedError`, `AmbiguousUnitError`
- Interfaces: `ParsedUnit`, `FactorReading`, `UnitReading`, `QuantityLiteral`, `ConvertedValue`
- Types: `AffineTemperature`, `TemperatureReading`
- Functions:

  ```text
  affineReadingNote, formatReading, segmentations, isListedProduct, unitConventionNotes, readUnit,
  unitReadingsSource, parseUnit, readQuantityLiteral, convertValue, unitDimension, unitRows,
  unitTables
  ```


---

### `src/dimensional/validator-registry.ts` - Validator registry for curvature- and GR-object node kinds.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./connection-validators.js` | `validateRiemannTensor` | Import |
| `./curvature.js` | `validateRicciTensor, validateEinsteinTensor, validateBianchiResidual, RiemannChildCallback` | Import |
| `./killing-validators.js` | `validateKillingVector, validateConservedCharge` | Import |
| `./stress-energy-validators.js` | `validateStressEnergyTensor, validateCosmologicalConstant` | Import |
| `./einstein-equation.js` | `validateEinsteinFieldEquation` | Import |
| `./weyl-validators.js` | `validateWeylTensor` | Import |
| `./curvature-invariants.js` | `validateKretschmannScalar` | Import |

**Exports:**
- Functions: `lookupValidatorEntry`, `dispatchValidator`, `shouldPropagateFreeIndices`

---

### `src/dimensional/validator.ts` - Validator: walks an ExprNode tree and infers / checks SI dimensions.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension, DIMENSIONLESS` | Import |
| `./algebra.js` | `multiply, divide, power, add, subtract, equals, format, DimensionMismatchError` | Import |
| `./errors.js` | `TensorInScalarOpError, FreeIndexMismatchError, TensorProductChildInferenceError` | Import |
| `./ast-types.js` | `ExprNode, TranscendentalFn, TensorSymbolNode, TensorProductNode, MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode, CovariantDerivativeNode, RiemannTensorNode, RicciTensorNode, EinsteinTensorNode, BianchiResidualNode, KillingVectorNode, ConservedChargeNode, StressEnergyTensorNode, CosmologicalConstantNode, EinsteinFieldEquationNode, WeylTensorNode, KretschmannScalarNode` | Import (type-only) |
| `./tensor.js` | `ChildValidationResult` | Import (type-only) |
| `./tensor.js` | `validateTensorSymbol, computeContraction` | Import |
| `./metric-validators.js` | `PartialDerivativeChildResult` | Import (type-only) |
| `./metric-validators.js` | `validateMetricTensor, validateKroneckerDelta, validatePartialDerivative, checkInverseMetricStructure` | Import |
| `./connection-validators.js` | `validateCovariantDerivative` | Import |
| `./validator-registry.js` | `lookupValidatorEntry, dispatchValidator, shouldPropagateFreeIndices` | Import |
| `./ast-types.js` | `ExprNode, TranscendentalFn, TensorSymbolNode, TensorProductNode, TensorIndex, Variance, Role, MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode, CovariantIndex, UpperIndex, CovariantDerivativeNode, RiemannTensorNode, RicciTensorNode, EinsteinTensorNode, BianchiResidualNode, KillingVectorNode, ConservedChargeNode, StressEnergyTensorNode, CosmologicalConstantNode, EinsteinFieldEquationNode, WeylTensorNode, KretschmannScalarNode` | Re-export (type-only) |

**Exports:**
- Interfaces: `Violation`, `ValidationResult`
- Functions: `validate`, `validateInverseMetricPair`, `validateEquation`
- Re-exports:

  ```text
  ExprNode, TranscendentalFn, TensorSymbolNode, TensorProductNode, TensorIndex, Variance, Role,
  MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode, CovariantIndex, UpperIndex,
  CovariantDerivativeNode, RiemannTensorNode, RicciTensorNode, EinsteinTensorNode,
  BianchiResidualNode, KillingVectorNode, ConservedChargeNode, StressEnergyTensorNode,
  CosmologicalConstantNode, EinsteinFieldEquationNode, WeylTensorNode, KretschmannScalarNode
  ```


---

### `src/dimensional/weyl-validators.ts` - Per-kind validation for the v0.6.0 WeylTensorNode.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Dimension` | Import (type-only) |
| `./ast-types.js` | `MetricTensorNode, CovariantIndex, UpperIndex, WeylTensorNode` | Import (type-only) |
| `./ast-types.js` | `WeylTensorNode` | Re-export (type-only) |
| `./connection-validators.js` | `oneUpThreeDownFreeIndices, requireOneUpThreeDownVariance` | Import |
| `./curvature-composite.js` | `CurvatureCompositeNode` | Import (type-only) |

**Exports:**
- Functions: `validateWeylTensor`
- Re-exports: `WeylTensorNode`

---

<a id="entry-dependencies"></a>

## Entry Dependencies

### `src/index.ts` - Universal Physics Tensor Framework

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./core/tensor.js` | `UniversalTensor` | Re-export |
| `./core/constants.js` | `C_SI, G_SI, H_SI, HBAR_SI, K_B_SI, E_SI, ALPHA, M_P_SI, L_P_SI, T_P_SI, H0_SI, M_SUN_SI, GM_SUN_SI, M_E_SI, B_WIEN_SI` | Re-export |
| `./core/types.js` | `TensorConfig, TensorIndices, PhysicalLaw, BridgeEquation, EmergentPhenomenon, PhysicalScale, Force, Symmetry, InformationMeasure` | Re-export (type-only) |
| `./core/types.js` | `PhysicalConstants` | Re-export |
| `./core/cell.js` | `Cell, CellBase, CellConfidence, LawCell, BridgeCell, EmergenceCell` | Re-export (type-only) |
| `./core/tensor.js` | `compose` | Re-export |
| `./core/flux-rules.js` | `FluxDiagnostic, FluxReport` | Re-export (type-only) |
| `./core/flux-rules.js` | `FluxViolationError` | Re-export |
| `./bridges/catalog-adapter.js` | `CatalogEntryStatus, CatalogIngestionReport` | Re-export (type-only) |
| `./bridges/catalog-adapter.js` | `catalogToCells, scanCatalog, ingestCatalog, ingestionReportToFluxReport, CatalogIngestionError` | Re-export |
| `./core/universal-index.js` | `AxisName, UniversalIndex, UniversalIndexId, MakeIndexOptions` | Re-export (type-only) |
| `./core/universal-index.js` | `makeIndex` | Re-export |
| `./core/axes-registry.js` | `AxesRegistry` | Re-export (type-only) |
| `./core/axes-registry.js` | `Axes` | Re-export |
| `./core/labeled-tensor.js` | `LabeledTensor, LabeledTensorConstructionError, AxisMismatchError, IdentityConflictError, IndexNameMismatchError, RankPreservationError, AxisOrderError, AxisMergeError, AxisSplitError` | Re-export |
| `./core/regime-registry.js` | `RegimeProvenance, RegimeValueBase, RegimeSpec` | Re-export (type-only) |
| `./core/regime-registry.js` | `defineRegime, defineScale, defineForce, defineSymmetry, defineInformation, defineDimension, defineTopology, lookupRegime, listRegimesByAxis, provenanceFor, attachRegimesToCell, getCellRegimes, RegimeCollisionError` | Re-export |
| `./core/regime-rule-install.js` | `` | Import |
| `./core/regimes-builtins.js` | `` | Import |
| `./diff/bridge-gradient.js` | `BridgeDiffSpec, BridgeNumericalGradientResult` | Re-export (type-only) |
| `./diff/bridge-gradient.js` | `bridgeGradientNumerical` | Re-export |
| `./diff/bridge-ast-gradient.js` | `ASTGradientResult` | Re-export (type-only) |
| `./diff/bridge-ast-gradient.js` | `bridgeGradientAST, bridgeGradientASTById, astDifferentiableBridgeIds` | Re-export |
| `./diff/bridge-specs.js` | `SHAPIRO_DELAY_DIFF, PERIHELION_ADVANCE_DIFF, HAWKING_TEMPERATURE_DIFF, DECOHERENCE_RATE_DIFF, DIFFERENTIABLE_RELATIONS` | Re-export |
| `./bridges/index.js` | `BRIDGE_EQUATIONS` | Re-export |
| `./bridges/caller-table.js` | `requestCallerTableConfrontation` | Re-export |
| `./bridges/caller-table.js` | `MeasuredCouplingRow, RunningProcedureRecord, RunningProcedure, CallerTableRequest, CallerTableRefusal, CallerTableHit, CallerTableResult` | Re-export (type-only) |
| `./bridges/index.js` | `BridgeEquationEntry, BridgeEquationStatus, BridgeIssueSeverity, BridgeIssueFixable, KnownIssue` | Re-export (type-only) |
| `./bridges/index.js` | `VON_KLITZING_SI, JOSEPHSON_CONSTANT_SI, LORENZ_NUMBER_SI, BCS_GAP_RATIO, LANE_EMDEN_OMEGA3, THOMSON_CROSS_SECTION_SI, M_PROTON_SI, CarrierSignError` | Re-export |
| `./composition/index.js` | `evaluateRelation, CoefficientUnsetError` | Re-export |
| `./composition/index.js` | `DuplicateInputError, InputTypeError, MissingInputError, NonFiniteInputError, UnknownInputError` | Re-export |
| `./bridges/index.js` | `ConstantInputError` | Re-export |
| `./composition/index.js` | `Evaluation, ExtraOutput` | Re-export (type-only) |
| `./bridges/evaluators.js` | `EvaluatorSpec, EvaluatorParameter, ParameterAlternate, GeometryRole` | Re-export (type-only) |
| `./bridges/catalog-types.js` | `CatalogEvaluatorOutput` | Re-export (type-only) |
| `./bridges/input-contract.js` | `ContractAlternate, EvaluationWant, InputContract, InputSlot` | Re-export (type-only) |
| `./bridges/input-contract.js` | `inputContract` | Re-export |
| `./dimensional/connection.js` | `christoffel` | Re-export |
| `./dimensional/validator.js` | `CovariantDerivativeNode` | Re-export (type-only) |
| `./dimensional/curvature.js` | `ricci` | Re-export |
| `./dimensional/validator.js` | `RicciTensorNode` | Re-export (type-only) |
| `./dimensional/curvature.js` | `einstein` | Re-export |
| `./dimensional/validator.js` | `EinsteinTensorNode` | Re-export (type-only) |
| `./numerical/bianchi-residual.js` | `bianchiResidual` | Re-export |
| `./dimensional/validator.js` | `BianchiResidualNode` | Re-export (type-only) |
| `./numerical/killing.js` | `verifyKillingEquation, checkKillingEquation, evaluateConservedCharge` | Re-export |
| `./numerical/killing.js` | `KillingEquationOptions, KillingEquationCheck, ChristoffelAccess` | Re-export (type-only) |
| `./numerical/geodesic-integrator.js` | `integrateGeodesic, GeodesicIntegratorInputs, GeodesicIntegratorResult` | Re-export |
| `./numerical/geometrized.js` | `toGeometrized, fromGeometrized, geometrizedFactor, NonGeometrizableDimensionError` | Re-export |
| `./dimensional/tensor-trace.js` | `TracableTensorNode, TensorTraceNode, TensorTraceValidationResult, TensorTraceOptions` | Re-export (type-only) |
| `./dimensional/tensor-trace.js` | `validateTensorTrace` | Re-export |
| `./dimensional/friedmann-equation.js` | `FriedmannVariant, FriedmannEquationNode, FriedmannEquationValidationResult` | Re-export (type-only) |
| `./dimensional/friedmann-equation.js` | `validateFriedmannEquation` | Re-export |
| `./dimensional/rg-flow.js` | `RGCouplingNode, BetaFunctionNode, BetaFunctionValidationResult` | Re-export (type-only) |
| `./dimensional/rg-flow.js` | `rgCoupling, validateRGCoupling, validateBetaFunction` | Re-export |
| `./dimensional/gauge-field.js` | `ArrowOfTime, GaugeFieldNode, TimeSymmetryPredicateNode, TimeSymmetryPredicateValidationResult` | Re-export (type-only) |
| `./dimensional/gauge-field.js` | `validateGaugeField, validateTimeSymmetryPredicate` | Re-export |
| `./dimensional/klein-gordon-equation.js` | `ScalarFieldNode, KleinGordonEquationNode, KleinGordonEquationValidationResult` | Re-export (type-only) |
| `./dimensional/klein-gordon-equation.js` | `validateKleinGordonEquation` | Re-export |
| `./dimensional/types.js` | `Dimension` | Re-export (type-only) |
| `./dimensional/units.js` | `AmbiguousUnitError, convertValue, parseUnit, UnitError, UnitRefusedError, UnknownUnitError` | Re-export |
| `./dimensional/units.js` | `AffineTemperature, ConvertedValue, ParsedUnit, TemperatureReading` | Re-export (type-only) |
| `./dimensional/types.js` | `DIMENSIONLESS, LENGTH, AREA, TIME, FREQUENCY, MASS, VELOCITY, ACCELERATION, FORCE, ENERGY, POWER, ACTION, TEMPERATURE, ENTROPY, CHARGE` | Re-export |
| `./dimensional/algebra.js` | `multiply, divide, power, add, subtract, equals, format, DimensionMismatchError` | Re-export |
| `./dimensional/validator.js` | `ExprNode, TranscendentalFn, ValidationResult, Violation` | Re-export (type-only) |
| `./dimensional/validator.js` | `validate, validateEquation, validateInverseMetricPair` | Re-export |
| `./dimensional/bridge-check.js` | `inferDimensionForBridge` | Re-export |
| `./numerical/einstein-equation.js` | `evaluateEinsteinEquationResidual` | Re-export |
| `./numerical/einstein-equation.js` | `EinsteinEquationResidualInput, MetricClosure, Vec4` | Re-export (type-only) |
| `./dimensional/einstein-equation.js` | `validateEinsteinFieldEquation` | Re-export |
| `./dimensional/einstein-equation.js` | `EinsteinFieldEquationNode, EinsteinFieldEquationValidationResult` | Re-export (type-only) |
| `./dimensional/curvature-invariants.js` | `KretschmannScalarNode, KretschmannScalarValidationResult` | Re-export (type-only) |
| `./dimensional/curvature-invariants.js` | `validateKretschmannScalar` | Re-export |
| `./numerical/kretschmann.js` | `computeKretschmann` | Re-export |
| `./numerical/index.js` | `evaluateNumerical, evaluateNumericalRaw, evaluateMetricInverse, getActiveEngine, setActiveEngine, NumericalBackendError, DuplicateCoordinateWarning, EngineCapabilityError, hasAutogradSupport, evaluateCovariantEikonalNumerical, integrateGeodesicGL4, findPerihelion` | Re-export |
| `./numerical/index.js` | `NumericalResult, NumericalRawResult, EvaluateOptions, NumericalInputs, TensorEngine, EngineTensor, EinsumSpec, NestedArray, GridField, ForwardGradResult, ReverseGradResult, GL4State, GL4Snapshot, GL4Options, PerihelionResult, FindPerihelionOptions, CovariantEikonalInputs, CovariantEikonalResult` | Re-export (type-only) |
| `./composition/index.js` | `composeEdges, consistencyRatio, evaluateEdge, minConfidence, regimesDiffer, QUANTITY_IDENTIFICATIONS, CompositionDimensionError, CompositionJunctionError, DomainViolationError, M_SUN_KG` | Re-export |
| `./composition/index.js` | `BridgeEdge, ComposeOptions, EdgeConfidence, Quantity, QuantityIdentification, RegimeAttributes, ValidityDomain` | Re-export (type-only) |
| `./composition/index.js` | `validityDomain` | Re-export |
| `./composition/index.js` | `DomainInput, DomainViolation` | Re-export (type-only) |
| `./bridges/membership.js` | `adjudicateBridgeEntry, adjudicateCatalog` | Re-export |
| `./bridges/rejected.js` | `REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS` | Re-export |
| `./bridges/membership.js` | `BridgeVerdict, CatalogAdjudicationReport` | Re-export (type-only) |
| `./bridges/rejected.js` | `RejectedBridgeAdjudication` | Re-export (type-only) |
| `./composition/index.js` | `enumerateCompositions, REGISTERED_COMPOSITION_IDS, propagateUncertainty` | Re-export |
| `./composition/index.js` | `CompositionCandidate, EnumerationReport, UncertaintyResult` | Re-export (type-only) |
| `./composition/index.js` | `classifyIdentifiability, classifyAll, forwardClosure, identifiabilityByRank` | Re-export |
| `./composition/index.js` | `IdentifiabilityVerdict, IdentifiabilityResult, IdentifiabilityOptions, RankIdentifiability` | Re-export (type-only) |
| `./composition/index.js` | `retrodict, retrodictNode` | Re-export |
| `./composition/index.js` | `RetrodictionOutcome, RetrodictionPrediction, RetrodictionResult, RetrodictionRefusal, RetrodictionReport, RetrodictionOptions` | Re-export (type-only) |
| `./composition/index.js` | `explainQuantity` | Re-export |
| `./composition/index.js` | `DerivationExplanation, ExplainOptions, QuantityExplanation` | Re-export (type-only) |
| `./composition/index.js` | `composeSymbolic, SymbolicCompositionError, SymbolicEvalError` | Re-export |
| `./composition/index.js` | `Observable, ComposeSymbolicOptions` | Re-export (type-only) |
| `./composition/index.js` | `buildVizModel, edgeToJunction` | Re-export |
| `./composition/index.js` | `VizStatus, VizJunction, VizCluster, VizOptions, VizModel, VizFilterStats` | Re-export (type-only) |
| `./composition/index.js` | `renderDotToSvg, SvgRendererUnavailableError` | Re-export |
| `./composition/index.js` | `parseUserEquation, suggestQuantities, suggestByDimension, equationLanding, analyzeUserEquation, UserEquationError` | Re-export |
| `./composition/index.js` | `resolveQuantityName` | Re-export |
| `./composition/index.js` | `UserEquation, EquationLanding, EquationAnalysis, EquationHint` | Re-export (type-only) |
| `./numerical/formula-registry.js` | `parsePhysics` | Re-export |
| `./numerical/formula-dimension.js` | `FormulaDimensionError` | Re-export |
| `./numerical/formula-dimension.js` | `ParsedPhysics` | Re-export (type-only) |
| `./dimensional/dimension-inference.js` | `inferUnknownDimension, substituteSymbolDim` | Re-export |
| `./composition/index.js` | `dimensionAdjacency` | Re-export |
| `./composition/index.js` | `DimensionAdjacency` | Re-export (type-only) |
| `./dimensional/buckingham.js` | `buckinghamPi, dimensionallyDetermines, RationalizationError` | Re-export |
| `./dimensional/buckingham.js` | `DimensionalVariable, PiGroup, BuckinghamVerdict, BuckinghamResult, DimensionalDeterminationResult` | Re-export (type-only) |
| `./composition/compose-surface.js` | `CompositionAliasError, SOURCE_ALIAS_DISPOSITIONS` | Re-export |
| `./composition/compose-surface.js` | `AliasDisposition, DispositionRequired` | Re-export (type-only) |
| `./numerical/klein-gordon.js` | `evaluateKGDispersionResidual, verifyKleinGordonPlaneWave` | Re-export |
| `./numerical/klein-gordon.js` | `KGDispersionResidualInput, KGPlaneWaveVerifyInput, KGPlaneWaveVerifyResult` | Re-export (type-only) |
| `./composition/index.js` | `CATALOG_GRAPH` | Re-export |
| `./composition/index.js` | `CANONICAL_GRAPH, canonicalToEdges, CANONICAL_CONSTANTS` | Re-export |
| `./canonical/registry.js` | `CANONICAL_EQUATIONS, CANONICAL_BY_ID, canonicalById, canonicalByDomain, partneredBridgeIds, bridgesWithoutCanonicalPartner` | Re-export |
| `./canonical/seed-l-layer.js` | `canonicalToLaw, seedCanonicalLaws, CANONICAL_TENSOR_CONFIG` | Re-export |
| `./canonical/canonical-equation.js` | `CanonicalEquation, CanonicalDomain, EpistemicStatus, CanonicalForms, FieldEquationNode` | Re-export (type-only) |
| `./canonical/normal-form.js` | `normalForm, structurallyEqual` | Re-export |
| `./canonical/linkage.js` | `classifyLinkage, scanLinkages` | Re-export |
| `./canonical/linkage.js` | `LinkageResult, RecoveryOutcome` | Re-export (type-only) |
| `./composition/adjudication.js` | `candidateId, ADJUDICATIONS, adjudicationFor, annotateAdjudications` | Re-export |
| `./composition/adjudication.js` | `AnnotatedCandidate` | Re-export (type-only) |
| `./bridges/catalog-types.js` | `AdjudicationVerdict, CatalogAdjudication` | Re-export (type-only) |
| `./composition/consequence.js` | `annotateConsequences, classifyProposal` | Re-export |
| `./composition/consequence.js` | `ConsequenceAnnotatedCandidate, ConsequenceSignal, ConsequenceEvidence` | Re-export (type-only) |
| `./composition/grounding.js` | `describeGrounding` | Re-export |
| `./composition/grounding.js` | `CandidateGrounding` | Re-export (type-only) |
| `./composition/discovery.js` | `rankDiscoveries` | Re-export |
| `./composition/discovery.js` | `VettedCandidate` | Re-export (type-only) |
| `./bridges/observations/types.js` | `residualInSigma, combineInQuadrature, consistencyComparison` | Re-export |
| `./bridges/observations/types.js` | `ConsistencyComparison, ObservationProvenance, SigmaComponent, ObservationKind, ConfrontationOutcome, ConfrontationDataHandling, ConfrontationPreprocessing, ConfrontationIndependence, SourceRef, SourceRefs` | Re-export (type-only) |
| `./bridges/coefficient-statement.js` | `oneLoopCoefficientStatement` | Re-export |
| `./bridges/coefficient-statement.js` | `OneLoopCoefficientStatement, OneLoopCoefficientSign` | Re-export (type-only) |
| `./bridges/confrontations.js` | `CONFRONTATIONS, listConfrontations, runConfrontation, CONFRONTATION_RIGOR, confrontationRigor, rigorDistribution` | Re-export |
| `./bridges/confrontations.js` | `ConfrontationEntry, RigorTier` | Re-export (type-only) |
| `./bridges/sensitivity.js` | `decidingMeasurement` | Re-export |
| `./bridges/sensitivity.js` | `Elasticity` | Re-export (type-only) |
| `./atlas/public.js` | `*` | Re-export |
| `./dimensional/errors.js` | `UPTError` | Re-export (type-only) |
| `./dimensional/natural-units.js` | `UnitMode` | Re-export (type-only) |
| `./dimensional/ast-types.js` | `Variance, Role, TensorIndex, UpperIndex, CovariantIndex, TensorSymbolNode, TensorProductNode, MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode, RiemannTensorNode, WeylTensorNode, KillingVectorNode, ConservedChargeNode, StressEnergyTensorNode, CosmologicalConstantNode` | Re-export (type-only) |
| `./dimensional/curvature-composite.js` | `CurvatureCompositeNode, CurvatureKind` | Re-export (type-only) |
| `./core/flux-rules.js` | `FluxRuleKind` | Re-export (type-only) |
| `./core/axes-registry.js` | `ScaleAxes, ForceAxes, SymmetryAxes, InformationAxes` | Re-export (type-only) |
| `./core/regime-registry.js` | `AxisConvenience` | Re-export (type-only) |
| `./diff/bridge-specs.js` | `ShapiroInput, PerihelionInput, HawkingInput, DecoherenceInput` | Re-export (type-only) |
| `./numerical/tensor-engine.js` | `EinsumContraction, EinsumFreeAxis` | Re-export (type-only) |
| `./numerical/killing.js` | `KillingFn, KillingMetricFn, ChristoffelAtFn` | Re-export (type-only) |
| `./relations/types.js` | `RelationContract, Conventions` | Re-export (type-only) |
| `./composition/axes.js` | `ScaleAxis, ForceAxis, InformationAxis, SymmetryAxis, TopologyAxis, StatisticsAxis` | Re-export (type-only) |
| `./composition/enumerate.js` | `EnumerationOptions` | Re-export (type-only) |
| `./composition/uncertainty.js` | `UncertaintyOptions` | Re-export (type-only) |
| `./composition/user-equation.js` | `AnalyzeUserEquationOptions, ShortBinding` | Re-export (type-only) |
| `./composition/canonical-graph.js` | `ConstantDef` | Re-export (type-only) |
| `./composition/proposed-bridges.js` | `ProposedBridge` | Re-export (type-only) |
| `./composition/discovery.js` | `DiscoveryOptions` | Re-export (type-only) |
| `./composition/representative-values.js` | `RepresentativeValue` | Re-export (type-only) |
| `./canonical/canonical-equation.js` | `SourcedPrefactor, SourcedGroupPrefactor` | Re-export (type-only) |

**Exports:**
- Re-exports:

  ```text
  UniversalTensor, C_SI, G_SI, H_SI, HBAR_SI, K_B_SI, E_SI, ALPHA, M_P_SI, L_P_SI, T_P_SI, H0_SI,
  M_SUN_SI, GM_SUN_SI, M_E_SI, B_WIEN_SI, TensorConfig, TensorIndices, PhysicalLaw, BridgeEquation,
  EmergentPhenomenon, PhysicalScale, Force, Symmetry, InformationMeasure, PhysicalConstants, Cell,
  CellBase, CellConfidence, LawCell, BridgeCell, EmergenceCell, compose, FluxDiagnostic, FluxReport,
  FluxViolationError, CatalogEntryStatus, CatalogIngestionReport, catalogToCells, scanCatalog,
  ingestCatalog, ingestionReportToFluxReport, CatalogIngestionError, AxisName, UniversalIndex,
  UniversalIndexId, MakeIndexOptions, makeIndex, AxesRegistry, Axes, LabeledTensor,
  LabeledTensorConstructionError, AxisMismatchError, IdentityConflictError, IndexNameMismatchError,
  RankPreservationError, AxisOrderError, AxisMergeError, AxisSplitError, RegimeProvenance,
  RegimeValueBase, RegimeSpec, defineRegime, defineScale, defineForce, defineSymmetry,
  defineInformation, defineDimension, defineTopology, lookupRegime, listRegimesByAxis, provenanceFor,
  attachRegimesToCell, getCellRegimes, RegimeCollisionError, BridgeDiffSpec,
  BridgeNumericalGradientResult, bridgeGradientNumerical, ASTGradientResult, bridgeGradientAST,
  bridgeGradientASTById, astDifferentiableBridgeIds, SHAPIRO_DELAY_DIFF, PERIHELION_ADVANCE_DIFF,
  HAWKING_TEMPERATURE_DIFF, DECOHERENCE_RATE_DIFF, DIFFERENTIABLE_RELATIONS, BRIDGE_EQUATIONS,
  requestCallerTableConfrontation, MeasuredCouplingRow, RunningProcedureRecord, RunningProcedure,
  CallerTableRequest, CallerTableRefusal, CallerTableHit, CallerTableResult, BridgeEquationEntry,
  BridgeEquationStatus, BridgeIssueSeverity, BridgeIssueFixable, KnownIssue, VON_KLITZING_SI,
  JOSEPHSON_CONSTANT_SI, LORENZ_NUMBER_SI, BCS_GAP_RATIO, LANE_EMDEN_OMEGA3, THOMSON_CROSS_SECTION_SI,
  M_PROTON_SI, CarrierSignError, evaluateRelation, CoefficientUnsetError, DuplicateInputError,
  InputTypeError, MissingInputError, NonFiniteInputError, UnknownInputError, ConstantInputError,
  Evaluation, ExtraOutput, EvaluatorSpec, EvaluatorParameter, ParameterAlternate, GeometryRole,
  CatalogEvaluatorOutput, ContractAlternate, EvaluationWant, InputContract, InputSlot, inputContract,
  christoffel, CovariantDerivativeNode, ricci, RicciTensorNode, einstein, EinsteinTensorNode,
  bianchiResidual, BianchiResidualNode, verifyKillingEquation, checkKillingEquation,
  evaluateConservedCharge, KillingEquationOptions, KillingEquationCheck, ChristoffelAccess,
  integrateGeodesic, GeodesicIntegratorInputs, GeodesicIntegratorResult, toGeometrized,
  fromGeometrized, geometrizedFactor, NonGeometrizableDimensionError, TracableTensorNode,
  TensorTraceNode, TensorTraceValidationResult, TensorTraceOptions, validateTensorTrace,
  FriedmannVariant, FriedmannEquationNode, FriedmannEquationValidationResult,
  validateFriedmannEquation, RGCouplingNode, BetaFunctionNode, BetaFunctionValidationResult,
  rgCoupling, validateRGCoupling, validateBetaFunction, ArrowOfTime, GaugeFieldNode,
  TimeSymmetryPredicateNode, TimeSymmetryPredicateValidationResult, validateGaugeField,
  validateTimeSymmetryPredicate, ScalarFieldNode, KleinGordonEquationNode,
  KleinGordonEquationValidationResult, validateKleinGordonEquation, Dimension, AmbiguousUnitError,
  convertValue, parseUnit, UnitError, UnitRefusedError, UnknownUnitError, AffineTemperature,
  ConvertedValue, ParsedUnit, TemperatureReading, DIMENSIONLESS, LENGTH, AREA, TIME, FREQUENCY, MASS,
  VELOCITY, ACCELERATION, FORCE, ENERGY, POWER, ACTION, TEMPERATURE, ENTROPY, CHARGE, multiply,
  divide, power, add, subtract, equals, format, DimensionMismatchError, ExprNode, TranscendentalFn,
  ValidationResult, Violation, validate, validateEquation, validateInverseMetricPair,
  inferDimensionForBridge, evaluateEinsteinEquationResidual, EinsteinEquationResidualInput,
  MetricClosure, Vec4, validateEinsteinFieldEquation, EinsteinFieldEquationNode,
  EinsteinFieldEquationValidationResult, KretschmannScalarNode, KretschmannScalarValidationResult,
  validateKretschmannScalar, computeKretschmann, evaluateNumerical, evaluateNumericalRaw,
  evaluateMetricInverse, getActiveEngine, setActiveEngine, NumericalBackendError,
  DuplicateCoordinateWarning, EngineCapabilityError, hasAutogradSupport,
  evaluateCovariantEikonalNumerical, integrateGeodesicGL4, findPerihelion, NumericalResult,
  NumericalRawResult, EvaluateOptions, NumericalInputs, TensorEngine, EngineTensor, EinsumSpec,
  NestedArray, GridField, ForwardGradResult, ReverseGradResult, GL4State, GL4Snapshot, GL4Options,
  PerihelionResult, FindPerihelionOptions, CovariantEikonalInputs, CovariantEikonalResult,
  composeEdges, consistencyRatio, evaluateEdge, minConfidence, regimesDiffer,
  QUANTITY_IDENTIFICATIONS, CompositionDimensionError, CompositionJunctionError, DomainViolationError,
  M_SUN_KG, BridgeEdge, ComposeOptions, EdgeConfidence, Quantity, QuantityIdentification,
  RegimeAttributes, ValidityDomain, validityDomain, DomainInput, DomainViolation,
  adjudicateBridgeEntry, adjudicateCatalog, REJECTED_BRIDGE_ADJUDICATIONS, REJECTED_BRIDGE_IDS,
  BridgeVerdict, CatalogAdjudicationReport, RejectedBridgeAdjudication, enumerateCompositions,
  REGISTERED_COMPOSITION_IDS, propagateUncertainty, CompositionCandidate, EnumerationReport,
  UncertaintyResult, classifyIdentifiability, classifyAll, forwardClosure, identifiabilityByRank,
  IdentifiabilityVerdict, IdentifiabilityResult, IdentifiabilityOptions, RankIdentifiability,
  retrodict, retrodictNode, RetrodictionOutcome, RetrodictionPrediction, RetrodictionResult,
  RetrodictionRefusal, RetrodictionReport, RetrodictionOptions, explainQuantity,
  DerivationExplanation, ExplainOptions, QuantityExplanation, composeSymbolic,
  SymbolicCompositionError, SymbolicEvalError, Observable, ComposeSymbolicOptions, buildVizModel,
  edgeToJunction, VizStatus, VizJunction, VizCluster, VizOptions, VizModel, VizFilterStats,
  renderDotToSvg, SvgRendererUnavailableError, parseUserEquation, suggestQuantities,
  suggestByDimension, equationLanding, analyzeUserEquation, UserEquationError, resolveQuantityName,
  UserEquation, EquationLanding, EquationAnalysis, EquationHint, parsePhysics, FormulaDimensionError,
  ParsedPhysics, inferUnknownDimension, substituteSymbolDim, dimensionAdjacency, DimensionAdjacency,
  buckinghamPi, dimensionallyDetermines, RationalizationError, DimensionalVariable, PiGroup,
  BuckinghamVerdict, BuckinghamResult, DimensionalDeterminationResult, CompositionAliasError,
  SOURCE_ALIAS_DISPOSITIONS, AliasDisposition, DispositionRequired, evaluateKGDispersionResidual,
  verifyKleinGordonPlaneWave, KGDispersionResidualInput, KGPlaneWaveVerifyInput,
  KGPlaneWaveVerifyResult, CATALOG_GRAPH, CANONICAL_GRAPH, canonicalToEdges, CANONICAL_CONSTANTS,
  CANONICAL_EQUATIONS, CANONICAL_BY_ID, canonicalById, canonicalByDomain, partneredBridgeIds,
  bridgesWithoutCanonicalPartner, canonicalToLaw, seedCanonicalLaws, CANONICAL_TENSOR_CONFIG,
  CanonicalEquation, CanonicalDomain, EpistemicStatus, CanonicalForms, FieldEquationNode, normalForm,
  structurallyEqual, classifyLinkage, scanLinkages, LinkageResult, RecoveryOutcome, candidateId,
  ADJUDICATIONS, adjudicationFor, annotateAdjudications, AnnotatedCandidate, AdjudicationVerdict,
  CatalogAdjudication, annotateConsequences, classifyProposal, ConsequenceAnnotatedCandidate,
  ConsequenceSignal, ConsequenceEvidence, describeGrounding, CandidateGrounding, rankDiscoveries,
  VettedCandidate, residualInSigma, combineInQuadrature, consistencyComparison, ConsistencyComparison,
  ObservationProvenance, SigmaComponent, ObservationKind, ConfrontationOutcome,
  ConfrontationDataHandling, ConfrontationPreprocessing, ConfrontationIndependence, SourceRef,
  SourceRefs, oneLoopCoefficientStatement, OneLoopCoefficientStatement, OneLoopCoefficientSign,
  CONFRONTATIONS, listConfrontations, runConfrontation, CONFRONTATION_RIGOR, confrontationRigor,
  rigorDistribution, ConfrontationEntry, RigorTier, decidingMeasurement, Elasticity, atlas, UPTError,
  UnitMode, Variance, Role, TensorIndex, UpperIndex, CovariantIndex, TensorSymbolNode,
  TensorProductNode, MetricTensorNode, KroneckerDeltaNode, TensorPartialDerivativeNode,
  RiemannTensorNode, WeylTensorNode, KillingVectorNode, ConservedChargeNode, StressEnergyTensorNode,
  CosmologicalConstantNode, CurvatureCompositeNode, CurvatureKind, FluxRuleKind, ScaleAxes, ForceAxes,
  SymmetryAxes, InformationAxes, AxisConvenience, ShapiroInput, PerihelionInput, HawkingInput,
  DecoherenceInput, EinsumContraction, EinsumFreeAxis, KillingFn, KillingMetricFn, ChristoffelAtFn,
  RelationContract, Conventions, ScaleAxis, ForceAxis, InformationAxis, SymmetryAxis, TopologyAxis,
  StatisticsAxis, EnumerationOptions, UncertaintyOptions, AnalyzeUserEquationOptions, ShortBinding,
  ConstantDef, ProposedBridge, DiscoveryOptions, RepresentativeValue, SourcedPrefactor,
  SourcedGroupPrefactor
  ```


---

<a id="numerical-dependencies"></a>

## Numerical Dependencies

### `src/numerical/bianchi-residual.ts` - Evaluator for the second-Bianchi-identity residual.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `BianchiResidualNode, ExprNode, RiemannTensorNode` | Import (type-only) |
| `./tensor-engine.js` | `TensorEngine` | Import (type-only) |
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `./index.js` | `evaluateNumerical` | Import |

**Exports:**
- Functions: `bianchiResidual`

---

### `src/numerical/binding-value.ts` - A binding value: a bare number, a number with a unit, or an expression of

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `K_B_SI` | Import |
| `../dimensional/formula-names.js` | `assertSynonymAgreement, isTemperatureName, synonymGroup, temperatureQuantityRole` | Import |
| `../dimensional/unit-convention.js` | `quantityConventionUnit` | Import |
| `../dimensional/natural-units.js` | `naturalConstantOverrides, UnitMode` | Import |
| `../dimensional/symbolic-constants.js` | `CONSTANT_REGISTRY, constantRecord` | Import |
| `../dimensional/algebra.js` | `divide, equals, format, multiply, power` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS, ENERGY, TEMPERATURE, Dimension` | Import |
| `../dimensional/units.js` | `AmbiguousUnitError, convertValue, parseUnit, readQuantityLiteral, readUnit, unitConventionNotes, UnitError, UnitRefusedError, UnknownUnitError, AffineTemperature, TemperatureReading` | Import |
| `./formula-contract.js` | `arityMessage, EulerNumberError, FormulaError, SCALAR_FUNCTIONS, unknownFunctionMessage` | Import |
| `./formula-dimension.js` | `constantExponent, parseFormulaPNode, UnsupportedSyntaxError, FormulaPNode` | Import |
| `./formula-mathts.js` | `mathtsFormulaParser` | Import |

**Exports:**
- Classes: `TemperatureBindingError`, `BindingNumberError`
- Interfaces: `BindingValue`, `NamedBindingSibling`
- Functions: `readNamedBinding`, `readBinding`, `bindingInUnit`, `readParameter`

---

### `src/numerical/christoffel-flat.ts` - Flat-array Christoffel evaluator (v0.6.0 Phase 2, Task 2.8 — BR-2 BREAKING).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `C_SI` | Import |
| `./schwarzschild.js` | `schwarzschildRadius` | Import |

**Exports:**
- Functions: `encodeChristoffelIndex`, `christoffelFnFlat`

---

### `src/numerical/connection-lowering-helpers.ts` - Numerical helpers for covariant-derivative lowering (Task 12 [U]).

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-tensor` | `Tensor` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./tensor-engine.js` | `EngineTensor, TensorEngine` | Import (type-only) |
| `./types.js` | `NestedArray` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./strides.js` | `rowMajorStrides, flatIndex, sameShape` | Import |

**Exports:**
- Functions:

  ```text
  flattenNA, zeroTensorLike, zeroTensor, flatToNested, tensorAdd, tensorAddScaled,
  computeChristoffelTensor, contractChristoffelWithOperand, getMetricDerivFlat
  ```


---

### `src/numerical/covariant-eikonal.ts` - Covariant-eikonal method, used by catalog relation be-37.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `findRoot, hermiteInterp` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./gl4-integrator.js` | `integrateGeodesicGL4` | Import |
| `../core/constants.js` | `C_SI` | Import |
| `./schwarzschild.js` | `schwarzschildRadius` | Import |
| `./null-ic.js` | `reconstructNullPr` | Import |

**Exports:**
- Interfaces: `CovariantEikonalInputs`, `CovariantEikonalResult`
- Functions: `evaluateCovariantEikonalNumerical`

---

### `src/numerical/curvature-lowering-helpers.ts` - Numerical helpers for Riemann-curvature lowering (Task 6 [U] / v0.5.0 1c-ii).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./tensor-engine.js` | `EngineTensor, TensorEngine` | Import (type-only) |
| `./types.js` | `NestedArray, NumericalInputs` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./connection-lowering-helpers.js` | `computeChristoffelTensor, flattenNA` | Import |
| `./pderiv.js` | `pderivNumericalFn` | Import |
| `../dimensional/curvature.js` | `BianchiResidualNode` | Import (type-only) |
| `../dimensional/weyl-validators.js` | `WeylTensorNode` | Import (type-only) |
| `../dimensional/curvature-invariants.js` | `KretschmannScalarNode` | Import (type-only) |
| `./weyl-lowering.js` | `computeWeylTensor` | Import |
| `./kretschmann.js` | `computeKretschmann` | Import |
| `./lowering-utils.js` | `dimensionOf, requireValue, flattenNestedArray, requireMetricClosures` | Import |
| `./lowering-utils.js` | `MetricFn` | Import (type-only) |
| `./lowering-utils.js` | `MetricFn` | Re-export (type-only) |

**Exports:**
- Types: `MetricFnFlat`
- Functions:

  ```text
  christoffelAt, dGammaAt, buildRiemann, riemannUpperAt, lowerFirstIndex, riemannLowerAt,
  covariantDerivRiemannLowerAt, contractRiemannJS, lowerBianchiResidual, lowerWeylTensor,
  lowerKretschmannScalar, riemannUpperWithBoundAt, kretschmannWithBound, ricciWithBound,
  weylTensorWithBoundAt
  ```

- Re-exports: `MetricFn`

---

### `src/numerical/derivative-lowering.ts` - Derivative-arm lowering — extracted from `lowering.ts`'s switch

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/tensor.js` | `TensorSymbolNode` | Import (type-only) |
| `../dimensional/metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `../dimensional/connection-validators.js` | `CovariantDerivativeNode` | Import (type-only) |
| `./pderiv.js` | `pderivGrid, pderivNumericalFn, pderivSymbolic` | Import |
| `./tensor-engine.js` | `EngineTensor, TensorEngine` | Import (type-only) |
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./connection-lowering-helpers.js` | `zeroTensor, zeroTensorLike, flatToNested, tensorAdd, tensorAddScaled, computeChristoffelTensor, contractChristoffelWithOperand, getMetricDerivFlat` | Import |
| `./lowering-utils.js` | `isMetricTensorNode, dimensionOf, requireValue, flattenNestedArray` | Import |

**Exports:**
- Functions: `lowerTensorPartialDerivative`, `lowerCovariantDerivative`

---

### `src/numerical/einstein-equation.ts` - Einstein field equation residual evaluator (v0.6.0 Phase 2, Task 2.4).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `./lowering.js` | `lowerNode` | Import |
| `./mathts-engine.js` | `MathTSEngine` | Import |
| `../dimensional/metric.js` | `metric` | Import |
| `../dimensional/tensor.js` | `tsym` | Import |
| `../dimensional/types.js` | `LENGTH, DIMENSIONLESS` | Import |
| `../core/constants.js` | `C_SI, G_SI` | Import |

**Exports:**
- Interfaces: `EinsteinEquationResidualInput`
- Types: `Vec4`, `MetricClosure`
- Functions: `evaluateEinsteinEquationResidual`

---

### `src/numerical/engine-registry.ts` - Engine registry — the active TensorEngine is `MathTSEngine`.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./tensor-engine.js` | `TensorEngine` | Import (type-only) |
| `./mathts-engine.js` | `MathTSEngine` | Import |

**Exports:**
- Functions: `getActiveEngine`, `setActiveEngine`, `resetEngineForTesting`

---

### `src/numerical/errors.ts` - Numerical-backend error type. Subclass of UPTError so downstream

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/errors.js` | `UPTError` | Import |

**Exports:**
- Classes: `NumericalBackendError`, `EngineCapabilityError`, `GL4ConvergenceError`

---

### `src/numerical/evaluator-uncertainty.ts` - First-order propagation of input uncertainties through a closed-form

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `propagateUncertainty` |
| `@danielsimonjr/mathts-matrix` | `eigvals` |

**Exports:**
- Interfaces: `UncertaintyContribution`, `PropagatedOutput`
- Types: `CorrelationTable`
- Functions: `propagateEvaluatorUncertainty`, `correlationIsPositiveSemidefinite`

---

### `src/numerical/finite-difference.ts` - One central-difference rule.

**Exports:**
- Functions: `centralPartial`

---

### `src/numerical/formula-contract.ts` - Scalar-formula contract: the parser types, the refusal of `euler`, and THE

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/ast-types.js` | `TranscendentalFn` | Import (type-only) |

**Exports:**
- Classes: `FormulaError`, `FormulaValueError`, `EulerNumberError`
- Interfaces: `CompiledFormula`, `FormulaParser`, `ScalarFunction`
- Types: `ScalarFunctionDimension`
- Functions: `arityMessage`, `unknownFunctionMessage`, `callBuiltinFunction`
- Constants: `EULER_NUMBER_ERROR`, `SCALAR_FUNCTIONS`, `BUILTIN_FUNCTION_NAMES`, `FUNCTION_EQUIVALENTS`, `BUILTIN_FUNCTION_LIST`

---

### `src/numerical/formula-dimension.ts` - Formula dimensional check (MathTS Phase 2 — see

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `parse` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/types.js` | `CHARGE, DIMENSIONLESS, ENERGY` | Import |
| `../dimensional/algebra.js` | `equals, format, multiply` | Import |
| `../dimensional/validator.js` | `ExprNode, TranscendentalFn` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/ast-builders.js` | `sym` | Import |
| `./formula-contract.js` | `EULER_NUMBER_ERROR, EulerNumberError, FormulaError, SCALAR_FUNCTIONS, unknownFunctionMessage` | Import |

**Exports:**
- Classes: `FormulaDimensionError`, `UnsupportedSyntaxError`
- Interfaces: `ParsedPhysics`, `FormulaDimensionChecker`
- Types: `FormulaPNode`
- Functions: `formulaSymbolDimension`, `constantExponent`, `parseFormulaPNode`, `builtinFormulaDimensionChecker`

---

### `src/numerical/formula-mathts.ts` - MathTS-backed scalar-formula parser.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `compileExpr, parse` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `E_SI` | Import |
| `./formula-contract.js` | `CompiledFormula, FormulaParser` | Import (type-only) |
| `./formula-contract.js` | `BUILTIN_FUNCTION_NAMES, callBuiltinFunction, EulerNumberError, FormulaError, unknownFunctionMessage, FormulaValueError` | Import |

**Exports:**
- Functions: `parseFormula`
- Constants: `mathtsFormulaParser`

---

### `src/numerical/formula-registry.ts` - Formula-parser registry.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./formula-contract.js` | `FormulaParser` | Import (type-only) |
| `./formula-mathts.js` | `mathtsFormulaParser` | Import |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `./formula-dimension.js` | `FormulaDimensionChecker, ParsedPhysics` | Import (type-only) |
| `./formula-dimension.js` | `builtinFormulaDimensionChecker` | Import |

**Exports:**
- Functions: `getFormulaParser`, `getFormulaParserKind`, `getFormulaDimensionChecker`, `parsePhysics`

---

### `src/numerical/geodesic-integrator.ts` - Fixed-step RK4 integrator for the geodesic equation in an arbitrary

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `NumericalBackendError` | Import |
| `./rk4-trajectory.js` | `rk4Trajectory` | Import |

**Exports:**
- Interfaces: `GeodesicIntegratorInputs`, `GeodesicIntegratorResult`
- Functions: `integrateGeodesic`

---

### `src/numerical/geometrized.ts` - Geometrized-units boundary adapters (G-9 increment 1).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/errors.js` | `UPTError` | Import |
| `../core/constants.js` | `C_SI, G_SI` | Import |

**Exports:**
- Classes: `NonGeometrizableDimensionError`
- Functions: `geometrizedFactor`, `toGeometrized`, `fromGeometrized`

---

### `src/numerical/gl4-integrator.ts` - Gauss-Legendre 4th-order (GL4) symplectic integrator — types + Butcher

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `gaussLegendre4, GL4ConvergenceError` |
| `@danielsimonjr/mathts-functions` | `GL4_A, GL4_B, GL4_C` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `GL4ConvergenceError, NumericalBackendError` | Import |

**Exports:**
- Interfaces: `GL4State`, `GL4Snapshot`, `GL4Options`, `GL4StepResult`
- Functions: `gl4Step`, `integrateGeodesicGL4`
- Re-exports: `GL4_A`, `GL4_B`, `GL4_C`

---

### `src/numerical/grid-field.ts` - GridField — a sampled field on a regular grid, for the 'grid' numericalForm

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `GridField` | Re-export (type-only) |

**Exports:**
- Re-exports: `GridField`

---

### `src/numerical/hermite-crossing.ts` - The zero crossing inside one integrator step, read from the cubic Hermite

**Exports:**
- Functions: `hermiteCrossingFraction`

---

### `src/numerical/index.ts` - Public surface of the UPT numerical-contraction backend (v0.3.5).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/validator.js` | `ExprNode, Violation` | Import (type-only) |
| `../dimensional/validator.js` | `validate` | Import |
| `./tensor-engine.js` | `EngineTensor, TensorEngine` | Import (type-only) |
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `./lowering.js` | `lowerNode` | Import |
| `./engine-registry.js` | `getActiveEngine` | Import |
| `./errors.js` | `NumericalBackendError` | Import |
| `./metric-inverse.js` | `evaluateMetricInverse, scanForMetricPair` | Import |
| `./tensor-engine.js` | `TensorEngine, EngineTensor, EinsumSpec, ForwardGradResult, ReverseGradResult` | Re-export (type-only) |
| `./tensor-engine.js` | `hasAutogradSupport, EngineCapabilityError` | Re-export |
| `./types.js` | `NumericalInputs, NestedArray` | Re-export (type-only) |
| `./grid-field.js` | `GridField` | Re-export (type-only) |
| `./engine-registry.js` | `getActiveEngine, setActiveEngine` | Re-export |
| `./errors.js` | `NumericalBackendError` | Re-export |
| `../dimensional/errors.js` | `DuplicateCoordinateWarning` | Re-export |
| `./metric-inverse.js` | `evaluateMetricInverse` | Re-export |
| `./covariant-eikonal.js` | `evaluateCovariantEikonalNumerical` | Re-export |
| `./covariant-eikonal.js` | `CovariantEikonalInputs, CovariantEikonalResult` | Re-export (type-only) |
| `./gl4-integrator.js` | `integrateGeodesicGL4` | Re-export |
| `./gl4-integrator.js` | `GL4State, GL4Snapshot, GL4Options` | Re-export (type-only) |
| `./perihelion-finder.js` | `findPerihelion` | Re-export |
| `./perihelion-finder.js` | `PerihelionResult, FindPerihelionOptions` | Re-export (type-only) |

**Exports:**
- Interfaces: `NumericalResult`, `NumericalRawResult`, `EvaluateOptions`
- Functions: `evaluateNumerical`, `evaluateNumericalRaw`
- Re-exports:

  ```text
  TensorEngine, EngineTensor, EinsumSpec, ForwardGradResult, ReverseGradResult, hasAutogradSupport,
  EngineCapabilityError, NumericalInputs, NestedArray, GridField, getActiveEngine, setActiveEngine,
  NumericalBackendError, DuplicateCoordinateWarning, evaluateMetricInverse,
  evaluateCovariantEikonalNumerical, CovariantEikonalInputs, CovariantEikonalResult,
  integrateGeodesicGL4, GL4State, GL4Snapshot, GL4Options, findPerihelion, PerihelionResult,
  FindPerihelionOptions
  ```


---

### `src/numerical/input-validation.ts` - Runtime input validation for numeric evaluators — `validateFiniteInputs`.

**Exports:**
- Interfaces: `FieldSpec`
- Functions: `validateFiniteInputs`

---

### `src/numerical/killing.ts` - Killing-equation numerical verification (v0.6.0 Phase 1, Task 1.3).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./pderiv.js` | `pderivNumericalFn` | Import |
| `./input-validation.js` | `validateFiniteInputs` | Import |

**Exports:**
- Interfaces: `KillingEquationOptions`, `KillingEquationCheck`
- Types: `KillingFn`, `KillingMetricFn`, `ChristoffelAccess`, `ChristoffelAtFn`
- Functions: `verifyKillingEquation`, `checkKillingEquation`, `evaluateConservedCharge`

---

### `src/numerical/klein-gordon.ts` - Klein-Gordon dispersion-relation numerical evaluator (G-7 debt closure).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `C_SI, HBAR_SI` | Import |
| `./input-validation.js` | `validateFiniteInputs` | Import |

**Exports:**
- Interfaces: `KGDispersionResidualInput`, `KGPlaneWaveVerifyInput`, `KGPlaneWaveVerifyResult`
- Functions: `evaluateKGDispersionResidual`, `verifyKleinGordonPlaneWave`

---

### `src/numerical/kretschmann.ts` - Kretschmann scalar numerical contraction (v0.6.0 Phase 3, Task 3.6;

**Exports:**
- Functions: `computeKretschmann`

---

### `src/numerical/lowering-utils.ts` - Shared private utilities for the `numerical/lowering*.ts` modules.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `../dimensional/metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./connection-lowering-helpers.js` | `flattenNA` | Import |

**Exports:**
- Types: `MetricFn`
- Functions: `isMetricTensorNode`, `dimensionOf`, `requireValue`, `flattenNestedArray`, `requireMetricClosures`

---

### `src/numerical/lowering.ts` - AST → EngineTensor lowering. Walks a validated ExprNode tree and emits

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode` | Import (type-only) |
| `./formula-contract.js` | `callBuiltinFunction` | Import |
| `../dimensional/validator.js` | `validate` | Import |
| `../dimensional/tensor.js` | `TensorIndex, TensorSymbolNode` | Import (type-only) |
| `../dimensional/types.js` | `Dimension` | Import (type-only) |
| `../dimensional/tensor.js` | `computeContraction, validateTensorSymbol` | Import |
| `./pderiv.js` | `pderivGrid, pderivNumericalFn, pderivSymbolic` | Import |
| `../dimensional/metric-validators.js` | `validateMetricTensor, validateKroneckerDelta, validatePartialDerivative` | Import |
| `../dimensional/metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `../dimensional/connection-validators.js` | `CovariantDerivativeNode, RiemannTensorNode` | Import (type-only) |
| `../dimensional/curvature.js` | `RicciTensorNode, EinsteinTensorNode, BianchiResidualNode` | Import (type-only) |
| `../dimensional/weyl-validators.js` | `WeylTensorNode` | Import (type-only) |
| `../dimensional/curvature-invariants.js` | `KretschmannScalarNode` | Import (type-only) |
| `../dimensional/curvature-composite.js` | `CurvatureKind` | Import (type-only) |
| `./tensor-engine.js` | `EngineTensor, TensorEngine, EinsumSpec, EinsumContraction` | Import (type-only) |
| `./types.js` | `NumericalInputs, NestedArray` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./quadrature.js` | `integrateGaussLegendre` | Import |
| `./connection-lowering-helpers.js` | `zeroTensor, zeroTensorLike, flatToNested, flattenNA, tensorAdd, tensorAddScaled, computeChristoffelTensor, contractChristoffelWithOperand, getMetricDerivFlat` | Import |
| `./curvature-lowering-helpers.js` | `christoffelAt, dGammaAt, buildRiemann, contractRiemannJS, lowerBianchiResidual, lowerWeylTensor, lowerKretschmannScalar` | Import |
| `./lowering-utils.js` | `isMetricTensorNode, dimensionOf, requireValue, flattenNestedArray, requireMetricClosures` | Import |
| `./derivative-lowering.js` | `lowerTensorPartialDerivative, lowerCovariantDerivative` | Import |

**Exports:**
- Functions: `lowerNode`
- Constants: `DEFERRED_EVALUATOR_REGISTRY`

---

### `src/numerical/mathts-engine.ts` - MathTSEngine — a TensorEngine implementation backed by

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-tensor` | `Tensor` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./tensor-engine.js` | `EngineTensor, TensorEngine, EinsumSpec, ForwardGradResult, ReverseGradResult` | Import (type-only) |
| `./types.js` | `NestedArray` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./tensor-engine.js` | `EngineCapabilityError, isTracedTensor, tracedMode` | Import |

**Exports:**
- Classes: `MathTSEngine`

---

### `src/numerical/metric-inverse.ts` - InverseMetricInconsistencyWarning — numerical path. Builds g⁻¹ and g as

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/validator.js` | `ExprNode, Violation` | Import (type-only) |
| `../dimensional/metric-validators.js` | `MetricTensorNode` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `./tensor-engine.js` | `TensorEngine` | Import (type-only) |
| `./types.js` | `NumericalInputs` | Import (type-only) |
| `./engine-registry.js` | `getActiveEngine` | Import |
| `./errors.js` | `NumericalBackendError` | Import |

**Exports:**
- Functions: `evaluateMetricInverse`, `scanForMetricPair`

---

### `src/numerical/null-ic.ts` - Null initial-condition (null-IC) reconstruction helper (v0.6.0 Phase 1, Task 1.5).

**Exports:**
- Functions: `reconstructNullPr`

---

### `src/numerical/null-ray-integrator.ts` - Fixed-step classical RK4 integrator for affine-parameterized null

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `NumericalBackendError` | Import |
| `./rk4-trajectory.js` | `rk4Trajectory` | Import |

**Exports:**
- Functions: `integrateRK4`

---

### `src/numerical/painleve-gullstrand-metric.ts` - Painlevé-Gullstrand (PG) metric for Schwarzschild spacetime —

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./schwarzschild.js` | `schwarzschildRadius` | Import |
| `./curvature-lowering-helpers.js` | `MetricFnFlat` | Import (type-only) |

**Exports:**
- Functions: `painleveGullstrandGFn`, `painleveGullstrandGInverseFn`

---

### `src/numerical/pderiv.ts` - Numerical partial derivative — two-way dispatch (v0.3.5-Design.md §6).

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./grid-field.js` | `GridField` | Import (type-only) |
| `./types.js` | `NestedArray` | Import (type-only) |
| `./errors.js` | `NumericalBackendError` | Import |
| `./connection-lowering-helpers.js` | `flattenNA` | Import |
| `./strides.js` | `rowMajorStrides` | Import |

**Exports:**
- Functions: `pderivGrid`, `pderivNumericalFn`, `pderivSymbolic`, `metricDerivSupplied`

---

### `src/numerical/perihelion-finder.ts` - Bisection perihelion finder via cubic-Hermite interpolation on cached

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `findRoot, hermiteInterp, median` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/mathts-read.js` | `numberFrom` | Import |

**Exports:**
- Interfaces: `PerihelionResult`, `FindPerihelionOptions`
- Functions: `findPerihelion`

---

### `src/numerical/quadrature.ts` - Gauss–Legendre quadrature for the numerical AST lowering of definite

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `rootsLegendre` |

**Exports:**
- Functions: `integrateGaussLegendre`
- Constants: `GAUSS_LEGENDRE_16`

---

### `src/numerical/rk4-trajectory.ts` - Fixed-step classical RK4 that keeps EVERY state of the run: the one owner of

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `solveODESystem` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./errors.js` | `NumericalBackendError` | Import |

**Exports:**
- Functions: `rk4Trajectory`

---

### `src/numerical/schwarzschild.ts` - The Schwarzschild radius, once.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/constants.js` | `C_SI, G_SI` | Import |

**Exports:**
- Functions: `schwarzschildRadius`

---

### `src/numerical/spacetime-metrics.ts` - Curvature of a few exact metrics for `upt metric`.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `det, inv` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/assignment.js` | `splitAssignment` | Import |
| `../core/compare.js` | `relDiff, withinMixed` | Import |
| `../core/mathts-read.js` | `numberFrom, numberMatrixFrom` | Import |
| `../core/constants.js` | `C_SI, G_SI, M_SUN_SI` | Import |
| `../dimensional/types.js` | `DIMENSIONLESS, GRAVITATIONAL_CONSTANT, LENGTH, MASS, MASS_DENSITY, TIME, VELOCITY, Dimension` | Import |
| `../dimensional/units.js` | `UnitError` | Import |
| `./binding-value.js` | `readParameter` | Import |
| `./connection-lowering-helpers.js` | `computeChristoffelTensor` | Import |
| `./curvature-lowering-helpers.js` | `christoffelAt, kretschmannWithBound, lowerFirstIndex, ricciWithBound, riemannUpperWithBoundAt` | Import |
| `./geodesic-integrator.js` | `integrateGeodesic` | Import |
| `./kretschmann.js` | `computeKretschmann` | Import |
| `./mathts-engine.js` | `MathTSEngine` | Import |
| `./schwarzschild.js` | `schwarzschildRadius` | Import |
| `./types.js` | `NestedArray` | Import (type-only) |

**Exports:**
- Classes: `MetricMassError`, `MetricValueError`
- Interfaces: `Component`, `CurvatureReport`, `KerrGeodesicSample`
- Types: `MetricId`
- Functions:

  ```text
  schwarzschildKretschmann, flrwRicciScalar, friedmannSides, kerrKretschmann, curvatureReport,
  schwarzschildCircularOrbit, kerrIscoRadius, kerrPhotonRadius, kerrSphericalTimelike,
  kerrSphericalPhoton, kerrTurningPointOrbit, kerrChristoffelFdGap, kerrGeodesic,
  schwarzschildGeodesic, kerrEquatorialCircular
  ```

- Constants: `METRIC_SIGNATURE`

---

### `src/numerical/statistics.ts` - Scalar statistics read from MathTS, typed back as the numbers they are.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-functions` | `lgamma, mean, std` |

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/mathts-read.js` | `numberFrom` | Import |

**Exports:**
- Interfaces: `RatioSpread`
- Functions: `meanOf`, `logChoose`, `ratioSpread`

---

### `src/numerical/strides.ts` - Shared stride and flat-index utilities for row-major tensor storage.

**External Dependencies:**
| Package | Import |
|---------|--------|
| `@danielsimonjr/mathts-core` | `rowMajorStrides` |

**Exports:**
- Functions: `flatIndex`, `sameShape`

---

### `src/numerical/tensor-engine.ts` - The TensorEngine contract. `MathTSEngine` implements it. See docs/planning/

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `NestedArray` | Import (type-only) |
| `./errors.js` | `EngineCapabilityError` | Re-export |

**Exports:**
- Interfaces: `EngineTensor`, `TracedEngineTensor`, `EinsumContraction`, `EinsumFreeAxis`, `EinsumSpec`, `ForwardGradResult`, `ReverseGradResult`, `TensorEngine`
- Functions: `tracedMode`, `isTracedTensor`, `hasAutogradSupport`, `isEinsumSpec`
- Re-exports: `EngineCapabilityError`

---

### `src/numerical/types.ts` - Shared types for the numerical backend. Kept in a tiny module so the

**Exports:**
- Interfaces: `GridField`, `NumericalInputs`
- Types: `NestedArray`

---

### `src/numerical/weyl-lowering.ts` - Weyl tensor numerical lowering (v0.6.0 Phase 3, Task 3.2).

**Exports:**
- Functions: `computeWeylTensor`

---

<a id="relations-dependencies"></a>

## Relations Dependencies

### `src/relations/category.ts` - Objects and morphisms of the regime category.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Regime, RelationType` | Import (type-only) |
| `./composition-table.js` | `composeRelation, CompositionResult` | Import |

**Exports:**
- Interfaces: `CategoryObject`, `CategoryMorphism`
- Functions: `composeMorphisms`

---

### `src/relations/composition-table.ts` - The composition table for `RelationType` — a literal 8×8 matrix.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `RelationType` | Import (type-only) |

**Exports:**
- Types: `NoCompositeClaim`, `CompositionResult`
- Functions: `composeRelation`
- Constants: `NO_COMPOSITE_CLAIM`, `COMPOSITION_TABLE`

---

### `src/relations/conventions.ts` - Atlas Phase 1 — convention comparison.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Conventions` | Import (type-only) |

**Exports:**
- Types: `ConventionKey`
- Functions: `checkConventions`, `unknownConventionKeys`

---

### `src/relations/domain-regimes.ts` - Domains whose inequality list is empty.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./regime-registration.js` | `registerRegimeDomain` | Import |
| `./types.js` | `Regime` | Import (type-only) |

---

### `src/relations/regime-registration.ts` - Names `upt regime` can survey that are not atlas families.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `./types.js` | `Regime` | Import (type-only) |

**Exports:**
- Interfaces: `RegimeDomainRecord`, `RegimeDomainRegistration`
- Functions: `registerRegimeDomain`, `domainRegimeRegistrations`

---

### `src/relations/regime-vocabularies.ts` - Names for the three regime vocabularies. They are not one type, and

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/regime-registry.js` | `RegimeValueBase` | Import (type-only) |
| `./types.js` | `Regime` | Import (type-only) |

**Exports:**
- Types: `TensorCellRegime`, `PiGroupRegime`, `QuantityAttributeRegime`

---

### `src/relations/regime.ts` - Regime derivation — π-groups as the coordinates a regime is written in.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../core/compare.js` | `compareCodepoint` | Import |
| `../dimensional/buckingham.js` | `buckinghamPi` | Import |
| `../dimensional/buckingham.js` | `DimensionalVariable, PiGroup` | Import (type-only) |
| `../dimensional/types.js` | `DIMENSIONLESS` | Import |
| `./types.js` | `Regime, RegimeInequality` | Import (type-only) |

**Exports:**
- Interfaces: `RegimeCheck`, `RegionSample`, `RegimeBearing`
- Types: `RegimeOverlap`
- Functions: `deriveRegimeGroups`, `regimeHolds`, `intersectRegimes`, `collidingRegimeGroups`, `regimeOverlap`, `uncoveredRegions`, `makeRegime`

---

### `src/relations/types.ts` - Shared relation vocabulary.

**Internal Dependencies:**
| File | Imports | Type |
|------|---------|------|
| `../dimensional/buckingham.js` | `PiGroup` | Import (type-only) |

**Exports:**
- Interfaces: `FormalRef`, `RegimeInequality`, `Regime`, `ApproximationBound`, `Counterexample`, `Conventions`
- Types: `RelationType`, `EvidenceTag`, `FormalFidelity`, `FormalRefKind`, `LimitCharacter`, `RelationContract`
- Constants: `ALL_EVIDENCE_TAGS`, `FORMAL_REF_KINDS`

---

<a id="dependency-matrix"></a>
## Dependency Matrix

### File Import/Export Matrix

| File | Imports From | Exports To |
|------|--------------|------------|
| `src/dimensional/types` | 0 files | 105 files |
| `src/cli-api` | 83 files | 10 files |
| `src/index` | 77 files | 1 file |
| `src/dimensional/validator` | 8 files | 44 files |
| `src/dimensional/algebra` | 2 files | 45 files |
| `src/atlas/index` | 39 files | 0 files |
| `src/cli/command` | 2 files | 37 files |
| `src/dimensional/ast-types` | 2 files | 37 files |
| `src/composition/edge` | 7 files | 30 files |
| `src/cli/args` | 1 file | 35 files |
| `src/canonical/registry` | 12 files | 21 files |
| `src/atlas/types` | 1 file | 31 files |
| `src/cli/flag-help` | 1 file | 30 files |
| `src/cli/output` | 3 files | 28 files |
| `src/cli/commands/index` | 28 files | 1 file |
| `src/dimensional/symbolic-constants` | 4 files | 25 files |
| `src/cli/errors` | 0 files | 28 files |
| `src/composition/compose` | 14 files | 13 files |
| `src/composition/probe/index` | 26 files | 1 file |
| `src/composition/probe/types` | 3 files | 24 files |
| `src/composition/discovery` | 15 files | 10 files |
| `src/bridges/catalog-load` | 4 files | 20 files |
| `src/canonical/canonical-equation` | 5 files | 19 files |
| `src/composition/index` | 21 files | 1 file |
| `src/composition/expr-eval` | 5 files | 16 files |
| `src/composition/proposed-bridges` | 18 files | 3 files |
| `src/dimensional/ast-builders` | 2 files | 19 files |
| `src/numerical/lowering` | 19 files | 2 files |
| `src/relations/types` | 1 file | 20 files |
| `src/atlas/witness-specs` | 17 files | 3 files |
| `src/composition/canonical-graph` | 15 files | 5 files |
| `src/dimensional/ast-leaves` | 1 file | 19 files |
| `src/composition/canonical-compare` | 18 files | 1 file |
| `src/composition/probe/study` | 17 files | 2 files |
| `src/dimensional/buckingham` | 2 files | 17 files |
| `src/dimensional/units` | 7 files | 12 files |
| `src/bridges/expr-parse` | 9 files | 9 files |
| `src/composition/probe/pipeline` | 15 files | 3 files |
| `src/composition/user-equation` | 14 files | 4 files |
| `src/atlas/regime` | 2 files | 15 files |

---

<a id="circular-dependency-analysis"></a>
## Circular Dependency Analysis

**No circular dependencies detected.**
---

<a id="visual-dependency-graph"></a>
## Visual Dependency Graph

```mermaid
graph TD
    subgraph Bin
        N0[upt.mjs]
    end

    subgraph Atlas
        N1[applicability]
        N2[association]
        N3[backend-shapes]
        N4[baselines]
        N5[hybrid-retrieval]
        N6[leakage]
        N7[loader]
        N8[onnx-embedder]
        N9[run-atlas]
        N10[stats]
        N11[...67 more]
    end

    subgraph Bridges
        N12[caller-table]
        N13[carrier-sign]
        N14[catalog-adapter]
        N15[catalog-load]
        N16[catalog-types]
        N17[coefficient-statement]
        N18[confrontation-coverage]
        N19[confrontations]
        N20[evaluation-errors]
        N21[evaluator-inputs]
        N22[...15 more]
    end

    subgraph Canonical
        N23[canonical-equation]
        N24[dimensional-fields]
        N25[_l1-build]
        N26[atomic]
        N27[condensed-matter]
        N28[dimensional-classics]
        N29[electromagnetism]
        N30[fluids-waves]
        N31[mechanics]
        N32[nonmonomial]
        N33[...10 more]
    end

    subgraph Cases
        N34[catalog-checks]
        N35[catalog]
        N36[engine]
        N37[index]
        N38[methods]
        N39[quadrature]
        N40[types]
    end

    subgraph Cli
        N41[args]
        N42[bindings]
        N43[closed-form-range]
        N44[command]
        N45[_atlas-map]
        N46[_atlas-route]
        N47[_discovery-opts]
        N48[atlas]
        N49[audit]
        N50[axes]
        N51[...49 more]
    end

    subgraph Root
        N52[cli-api]
    end

    subgraph Composition
        N53[adjudication]
        N54[algebraic-equivalence]
        N55[aliases]
        N56[audit-coverage]
        N57[axes]
        N58[axis-audit]
        N59[bridge-analysis]
        N60[bridge-prediction]
        N61[buckingham-filter]
        N62[canonical-compare]
        N63[...73 more]
    end

    subgraph Core
        N64[assignment]
        N65[axes-registry]
        N66[cell]
        N67[compare]
        N68[constants]
        N69[data-file]
        N70[flux-rules]
        N71[format]
        N72[hash]
        N73[json-schema]
        N74[...8 more]
    end

    subgraph Diff
        N75[bridge-ast-gradient]
        N76[bridge-gradient]
        N77[bridge-specs]
    end

    subgraph Dimensional
        N78[algebra]
        N79[ast-builders]
        N80[ast-leaves]
        N81[ast-types]
        N82[bridge-check]
        N83[buckingham]
        N84[connection-validators]
        N85[connection]
        N86[constant-rows]
        N87[constants]
        N88[...35 more]
    end

    subgraph Entry
        N89[index]
    end

    subgraph Numerical
        N90[bianchi-residual]
        N91[binding-value]
        N92[christoffel-flat]
        N93[connection-lowering-helpers]
        N94[covariant-eikonal]
        N95[curvature-lowering-helpers]
        N96[derivative-lowering]
        N97[einstein-equation]
        N98[engine-registry]
        N99[errors]
        N100[...34 more]
    end

    subgraph Relations
        N101[category]
        N102[composition-table]
        N103[conventions]
        N104[domain-regimes]
        N105[regime-registration]
        N106[regime-vocabularies]
        N107[regime]
        N108[types]
    end

    N1 --> N81
    N1 --> N80
    N4 --> N81
    N4 --> N6
    N5 --> N67
    N5 --> N4
    N6 --> N81
    N7 --> N69
    N8 --> N67
    N8 --> N72
    N8 --> N5
    N9 --> N1
    N14 --> N66
    N14 --> N70
    N14 --> N82
    N14 --> N15
    N14 --> N78
    N15 --> N67
    N15 --> N69
    N15 --> N16
    N17 --> N15
    N18 --> N19
    N19 --> N15
    N21 --> N64
    N21 --> N71
    N21 --> N91
    N21 --> N20
    N23 --> N83
    N23 --> N108
    N24 --> N83
    N25 --> N23
    N25 --> N83
    N25 --> N79
    N25 --> N24
    N26 --> N23
    N26 --> N79
    N26 --> N25
    N27 --> N23
    N27 --> N79
    N27 --> N25
    N28 --> N23
    N29 --> N23
    N29 --> N79
    N29 --> N25
    N30 --> N23
    N30 --> N79
    N30 --> N25
    N31 --> N23
    N31 --> N79
    N31 --> N25
    N32 --> N23
    N32 --> N79
    N32 --> N25
    N34 --> N35
    N35 --> N69
    N35 --> N15
    N35 --> N73
    N35 --> N40
    N36 --> N15
    N36 --> N35
    N36 --> N40
    N37 --> N35
    N37 --> N38
    N37 --> N40
    N38 --> N68
    N38 --> N15
    N38 --> N39
    N38 --> N35
    N38 --> N36
    N38 --> N40
    N42 --> N64
    N44 --> N41
    N44 --> N52
    N45 --> N44
    N45 --> N52
```

---

<a id="summary-statistics"></a>
## Summary Statistics

| Category | Count |
|----------|-------|
| Total Source Files | 1239 |
| Subsystems | 14 |
| Total Lines of Code | 202903 |
| Total Exports | 3909 |
| Total Re-exports | 1407 |
| Total Classes | 87 |
| Total Interfaces | 575 |
| Total Functions | 1169 |
| Total Type Guards | 22 |
| Total Enums | 0 |
| Type-only Imports | 1112 |
| Runtime Cyclic Components | 0 |
| Type-only Cyclic Components | 0 |
| Files in Runtime Cycles | 0 |
| Files in Type-only Cycles | 0 |

---

*Version*: 15.0.0
