# Refactor and integration phase

This note specifies a refactor-and-integration phase for the library as it
stands after the layering refactor and the bridge-discovery pipeline. It
changes no code, no public export, and no cell of the composition table.
Daniel approved this amendment on 2026-10-02. The step table in the
sequenced plan records which steps have a merge commit. A row marked next
is not started. The MathTS packages those steps name are published. A next step
becomes work when an `ACTIVE.md` task names it. Publishing the package is
the owner's job and is not part of any step.

Live pins, evidence counts, and package version stay in `NOTES.md`. Figures
below were read from the source while this note was written. They are
evidence for the findings. They are not a second status ledger, and nothing
in CI checks them.

The note builds on, and does not replace:

- `docs/planning/Layering-Refactor-Design.md` — the tier order and the
  shrink-only allowlist.
- `docs/planning/Bridge-Discovery-Pipeline-Design.md` — seeds, enumeration,
  the Buckingham filter, the structural classifier, chain order, the proof
  stub, and the internal orchestrator.
- `docs/planning/Regime-Aware-Join-Gate-Design.md` — the join on a shared
  quantity name.
- `docs/planning/Atlas-API-Review.md` — what may move onto the public atlas
  namespace. Tier 2 stays deferred.
- `docs/planning/MathTS-Formula-Integration-Design-Note.md` — Path A and
  Path B parsers behind one `FormulaParser`.
- `docs/architecture/duplicate-symbols.md` — the five exported-name groups
  the dependency tool already reports.
- `docs/architecture/ARCHITECTURE.md` and `docs/architecture/OVERVIEW.md` —
  the module map. Where a sentence in those files disagrees with the source
  cited below, the source wins and the sentence is a finding, not a plan to
  restate the prose.

## What this keeps

The layer order stays the one in the layering note. `tools/layer-order` may
only shrink. A step that needs a new upward edge is the wrong shape and
stops. The allowlist at the time of this note is three upward edges and no
cycle: `src/canonical/linkage.ts` to `src/composition/expr-eval.ts`, and
`src/core/labeled-tensor.ts` to `src/dimensional/errors.ts` and to
`src/numerical/tensor-engine.ts`.

Evidence tags stay derived. `deriveEvidence` is the only way a tag appears.
No step calls it on a chain candidate. A chain stays provisional until a
PhysJS proof exists. UPT does not run Lean. A bridge is proved when the
proof is in PhysJS and the formal-reference procedure in `WORKFLOWS.md` has
vendored it.

The composition table stays the under-approximation in
`src/relations/composition-table.ts`. A silent cell stays silent. Widening a
cell is a reviewed act of its own.

The public atlas surface stays the one namespace in `src/atlas/public.ts`.
No step edits that file or adds a name to the package barrel. Promoting the
deferred Tier 2 set remains the owner decision already open in
`docs/planning/Atlas-API-Review.md`.

Product A (`src/composition/discovery.ts`) and Product B
(`src/composition/probe/`) stay what they are. The chain pipeline stays a
third question. It does not enter either module.

`@danielsimonjr/mathts-*` is a required dependency. UPT does not implement
mathematics that MathTS already exports. No step republishes, repackages, or
vendors MathTS. A gap in MathTS is filed in `danielsimonjr/MathTS`, not
filled by a second implementation here. Path B and `Float64ReferenceEngine`
are the copies this phase removes. The package does not run without the
peers. That removal is the 2.0.0 break, with the migration note in the
semver section.

Bare `e` stays the elementary charge. `E` stays energy. Euler's number stays
`exp(x)`.

## Executive summary

The core is in place and layered. `src/dimensional/` is the dimension vector
and the `ExprNode` grammar. `src/numerical/` evaluates it. `src/relations/`
is the vocabulary of relation types, the composition table, π-group regimes,
and a category of morphisms. Above that sit four records that answer four
questions: the catalog row (`BridgeEquationEntry`), the quantity edge
(`BridgeEdge`), the model route (`AtlasBridge`), and the tensor cell
(`BridgeEquation` / `Cell`). The layering refactor removed import cycles.
The pipeline steps landed as separate modules and one internal orchestrator,
`runChainPipeline` in `src/atlas/chain-pipeline.ts`.

What did not land is the joint. The relation table, the category, the
quantity graph, the regime join, the proof overlay, and the CLI each have a
working local contract. They do not share a result type, and one of them
discards the other's refusal. `composeMorphisms` has a test and no
production caller. `upt chain` names the orchestrator and returns exit 2
without calling it, which is what the pipeline note required. The root
barrel re-exports on the order of five hundred names. Two functions named
`propagateUncertainty` implement different contracts. The CLI recomputes the
weak-field cut the graph edge already encodes, and several commands import
past `src/cli-api.ts`.

The phase is a sequence of small pull requests that make those contracts
meet, then a migration that makes MathTS the mathematics. That migration is
a 2.0.0. A shrink or rename of the root barrel is still not a step until
Daniel says so. The atlas public namespace stays as it is.

Rough size, `src/` only, comments included: about 420 TypeScript files and
about 92 000 lines. The large areas are `src/bridges/` (91 files, about
16 000 lines), `src/composition/` outside the probe (58 files, about 14 000),
`src/numerical/` (39 files, about 11 000), `src/cli/commands/` (32 files,
about 9 000), `src/atlas/` outside the families (35 files, about 8 000), and
`src/dimensional/` (36 files, about 7 000). Tests are about 600 files and
about 84 000 lines. `src/relations/` is about 1 000 lines and has one test
file, `tests/relations/category.test.ts`.

## How the parts fit today

A catalog id is a row in `BRIDGE_EQUATIONS` (`src/bridges/index.ts`, about
2 800 lines). Its PhysJS reference, when it has one, is not on that row. It
is `catalogFormalRef` in `src/atlas/catalog-formal-ref.ts`. `upt atlas`
prints that reference. The catalog path does not pass it to `deriveEvidence`,
so a catalog reference does not light `formally-proved`. An atlas bridge
(`ab-*`) carries its own `formalRef`, and `deriveEvidence` lights the tag
only for kind `bridge`.

A quantity edge is a `BridgeEdge` on `CATALOG_GRAPH`
(`src/composition/catalog-graph.ts`). Some of those edges also carry a
`relation` of type `RelationType`. The model route is a separate graph:
`findPath`, `findAtlasPath`, and `boundPath` in `src/atlas/path-bound.ts`,
reached from `upt path` through `src/cli/commands/_atlas-route.ts`. A path
warrant is not a substituted formula.

`runChainPipeline` does this, and only this:

1. `bridgeSeedKeys` (`src/atlas/physjs-ref.ts`) selects manifest keys whose
   derived kind is `bridge`.
2. `enumerateCompositions` (`src/composition/enumerate.ts`) walks pairs.
   `composeEdges` must accept the pair. `composeSymbolic` must accept it or
   the pair is `notSubstitutable` and is not a proof target.
3. `buckinghamFilter` (`src/composition/buckingham-filter.ts`) calls
   `dimensionallyDetermines` and `buckinghamPi`. It names a
   `PhysJS.Dimensional` theorem as a string. It does not call Lean.
4. `matchChain` (`src/composition/chain-match.ts`) calls `classifyStructure`
   (`src/canonical/structural.ts`): confirmation, restatement, or a
   provisional `chain-` id.
5. `joinRegimeMismatch` (`src/composition/chain-regime.ts`) runs only when
   the class is provisional. A confirmation or a restatement skips the gate.
6. `orderChainCandidates` (`src/composition/chain-candidate.ts`) orders the
   survivors.
7. `emitProofTarget` (`src/atlas/proof-target.ts`) returns a string: Lean
   comments, then a JSON object between two marker lines. `leanProof` is the
   string `absent`. Nothing is written to the catalog or the manifest.

`composeMorphisms` (`src/relations/category.ts`, 46 lines) is not in that
list. `boundPath` is not in that list. `deriveEvidence` is not in that list.
`upt chain` (`src/cli/commands/chain.ts`) is not in that list: it prints that
the orchestrator stays internal and returns 2.

## Findings, by impact

### 1. A relation-table refusal is erased, and the comment that says the table never runs is false

`composeEdges` applies the composition table only when both operands carry
`relation` (`src/composition/compose.ts`, the block that begins at the
overlay comment). A silent cell throws `UndefinedCompositionError`. A table
result of `approximation` also throws that error, because an edge relation
carries no norm transport and the function refuses to invent a bound.

The comment in that block says every edge in `CATALOG_GRAPH` carries no
`relation`, so the block is skipped and today's compositions are
byte-identical. Nine edges in the graph files do carry `relation`:

| Edge file | Relation type on the edge |
|---|---|
| `src/composition/edges/catalog-quantum.ts` | `coarse-graining` (the master edge) |
| `src/composition/edges/calibration.ts` | `derivation` on the lensing, perihelion, and Shapiro edges; `coarse-graining` on the Zurek edge |
| `src/composition/edges/catalog-tranche.ts` | `derivation` on two edges |
| `src/composition/edges/proved-seeds.ts` | `derivation` on the quantum-Hall and Josephson edges |

`enumerateCompositions` catches every throw from `composeEdges`. It records
`CompositionAliasError` on `requiresDisposition`. Every other throw, including
`UndefinedCompositionError`, hits the same `continue` as a junction or
dimension refusal (`src/composition/enumerate.ts`, the `try` around
`composeEdges`). A pair the table declines, and a pair whose dimensions
disagree, leave the same empty trace. The pipeline then never sees the pair,
so the Buckingham filter, the structural classifier, and the regime gate
cannot say why it is absent.

`derivation` followed by `derivation` is a defined cell, so two derivation
edges that also meet on a quantity still compose. The defect is the silent
cell and the approximation cell, not every pair.

`composeMorphisms` delegates to `composeRelation` and does not read
`source` or `target`. Two morphisms that do not meet still compose. Nothing
under `src/` calls it except the module itself. `tests/relations/category.test.ts`
is the caller. The pipeline note's step 4 asked for this module. The
orchestrator never builds a `CategoryMorphism`.

Impact: the category layer and the equation layer can disagree, and the
disagreement is invisible in `runChainPipeline`'s result.

### 2. One chain is four shapes, and the proof target is a string

The same survivor is re-encoded at each step:

| Step | Type | Kinds |
|---|---|---|
| `classifyStructure` / `matchChain` | `ChainConfirmation`, `ChainRestatement`, `ChainProvisional` in `src/canonical/structural.ts` | `confirmation`, `restatement`, `provisional` |
| `orderChainCandidates` | `ChainCandidate` in `src/composition/chain-candidate.ts` | `confirmation`, `restatement`, `unique-monomial`, `unfixed-shape` |
| `buckinghamFilter` | `BuckinghamFilterRecord` | always `derivation-step`, plus a theorem name or null |
| `runChainPipeline` | `ChainPipelineResult` in `src/atlas/chain-pipeline.ts` | `confirmation`, `restatement`, `stub`, or a `ChainRegimeMismatch` |
| `emitProofTarget` | `string` | comments, then JSON between `PROOF-TARGET-DRAFT-BEGIN` and `PROOF-TARGET-DRAFT-END` |

`toCandidate` in `chain-pipeline.ts` is the adapter from the classifier's
three kinds to the orderer's four. `emit` is the adapter from those four to
the pipeline's four, and it calls `emitProofTarget` for anything that is not
a confirmation or a restatement. The regime mismatch is appended after the
ordered list and is not a `ChainCandidate`.

The draft object inside the string uses the manifest's field names (`key`,
`bridgeId`, `theorem`, `covers`, `coverage`, `leanProof`, `axioms`) and is
not a value of the manifest schema. A reader that wants the draft parses the
markers. `chain-pipeline.ts` also has its own `collectSymbols` over
`ExprNode`. Two more private walkers of that shape live in
`src/numerical/formula.ts` and `src/composition/compose-symbolic.ts`.

Impact: a change to one kind list does not fail the others at compile time.
The PhysJS handoff is text, so a field drift is a string drift.

### 3. Proof links, the catalog, the pipeline, and the CLI are four doors

They are supposed to meet, and each door is locally honest:

- Atlas bridges derive `formally-proved` from a reviewed `formalRef`.
- Catalog equations keep the reference on the atlas overlay. Printing it
  from `upt atlas` does not derive the tag. `src/cli/commands/atlas.ts`
  imports `catalogFormalRef` from `src/atlas/catalog-formal-ref.ts` directly.
- The pipeline emits a skeleton whose own text says it is not a `formalRef`.
- `upt chain` does not call `runChainPipeline`.

`src/atlas/physjs-ref.ts` is about 1 000 lines and is the compiled copy of
the vendored manifest plus `bridgeSeedKeys` and `physjsTheorem`. The seed
rule and the theorem check are the right joint between the pipeline and
PhysJS. The missing joint is the one between a survivor and a reference: a
stub cannot become a reference inside this repository, and nothing in the
result type says which PhysJS key would have to exist before it could.

The regime gate, the composition table, and `(K, δ)` are three more doors
on the same pair of edges. `joinRegimeMismatch` reads the catalog category
through `tensorIndexComponent`, the gated scale and force axes, and
`regimeOverlap`. It does not read `composeRelation`. `boundPath` reads
`composeRelation` and declared norm transports. It does not read
`CATALOG_GRAPH`. A quantity chain and a model route can both be "a
composition" in prose and be different functions with different refusals.

Impact: a reader can confirm a catalog id, refuse a regime, and still have
no relation-type claim and no proof. That split is intended for the stub.
It is not intended that the relation-type claim be dropped on the floor
before the stub exists.

### 4. Three regime vocabularies, one word

| Vocabulary | Module | What a regime is |
|---|---|---|
| Tensor-cell registry | `src/core/regime-registry.ts` (about 280 lines) | A named value on a scale, force, symmetry, information, topology, or dimension axis, with provenance |
| π-group regime | `src/relations/regime.ts` (about 400 lines) | Inequalities on Buckingham groups. `regimeHolds` is tri-state. `regimeOverlap` reports overlap, nested, or disjoint |
| Quantity attributes | `src/composition/quantity.ts` and `src/composition/axes.ts` | Scale and force on a `Quantity`, gated by `GATE_AXES` |

`src/atlas/regime.ts` re-exports the π-group half and keeps
`admitApproximation`, which is generic over `AtlasBridge`. The join gate
consults the category letter, the quantity attributes, and `regimeOverlap`.
It does not consult the cell registry. The cell registry does not consult
π-groups. Sharing the English word without a shared type is how a later
edit "fixes" one regime and leaves the other two.

Impact: medium. Unifying the three into one type would invent physics. The
defect is the missing glossary at the type level, so a caller can see which
function they are holding.

### 5. The CLI reimplements library decisions, and exit codes are per command

`src/cli-api.ts` (about 200 lines) is the barrel `MEMORY.md` describes as
the only door from a command to library internals. These commands also
import a library module themselves:

| Command module | Direct import |
|---|---|
| `src/cli/commands/atlas.ts` | `catalogFormalRef` |
| `src/cli/commands/recover.ts` | `scanCompositionRecovery` |
| `src/cli/commands/metric.ts` | `src/numerical/spacetime-metrics.ts` |
| `src/cli/commands/eval.ts` | `readBinding`, `UnitError`, `builtinFormulaDimensionChecker` |
| `src/cli/commands/evaluate.ts` | `bindingInUnit`, `missingEvaluatorMessage`, `C_SI`, `G_SI` |
| `src/cli/commands/regime.ts`, `path.ts` | `readBinding` |
| `src/cli/commands/map.ts` | composition and atlas types, plus `withCatalogEvidence` |

`upt path` itself calls `boundPath` through `_atlas-route.ts`. The 1 400
lines in `src/cli/commands/path.ts` are presentation and `--at` handling,
not a second router. `src/cli/commands/_atlas-map.ts` is about 1 400 lines
of the same kind for `upt map` and `upt atlas`.

Two decisions are re-derived in the command:

- `propagateUncertainty` in `src/cli/commands/evaluate.ts` (about line 157,
  through the curvature and correlation block) takes an arbitrary evaluator,
  pairwise correlations, and a curvature ratio. `propagateUncertainty` in
  `src/composition/uncertainty.ts` takes a `BridgeEdge`, independent sigmas,
  and an optional `ApproximationBound` that it reports separately and does
  not fold into the variance. The CLI function does not call the library
  function. The library function is a public root export. The CLI function
  is not. `docs/architecture/duplicate-symbols.md` already names this pair.
- `weakFieldDomainNote` in `evaluate.ts` recomputes `r_s = 2GM/c²` and the
  cut `b ≤ 10 r_s` from `G_SI` and `C_SI`. The lensing edge's `domain`
  predicate in `src/composition/edges/calibration.ts` already encodes
  `b ≥ 10 r_s`. The command prints the number and a warning and returns 0.
  The edge, asked the same point, refuses the domain. Both behaviors are
  written down. They are not one function.

Exit codes are `UsageError` → 2, `CliError` → 1, `EXIT_CHECK_FAILED` → 3
(`src/cli/errors.ts`). `runCli` maps only those two classes
(`src/cli/main.ts`). Anything else escapes. Commands then wrap `Error` in
different classes:

- `upt derive` wraps a bad `name:dimension` token as `UsageError` (exit 2).
- `upt evaluate` wraps a non-numeric value as `CliError` (exit 1) and a
  missing `=` as `UsageError` (exit 2). `upt eval` now matches that split.
- `upt metric` catches every non-`UsageError` from the geodesic branch and
  rethrows `UsageError` (`src/cli/commands/metric.ts`). A non-positive Kerr
  mass and an `|a|` above the bound become exit 2, the code the rest of the
  CLI uses for a malformed invocation. A failed check that ran is exit 3 on
  `upt path`, `upt regime`, `upt derive`, and `upt map`.

`upt chain` returning 2 is a deliberate non-run, not a malformed flag. It
shares the code the parser uses for an unknown command.

Impact: medium for a script author. The library and the command can both be
right about their own contract and still disagree about a number or an exit
code.

### 6. The public surface is large, and the names collide

`src/index.ts` is about 980 lines. A count of distinct names in its export
lists, read for this note, is about 500. `src/atlas/public.ts` exports 24
names. `src/atlas/index.ts` exports about 200, and `package.json` exposes
that file as `universal-physics-tensor/atlas`. The probe subpath exposes
`src/composition/probe/index.ts`. `MathTSEngine` stays on
`universal-physics-tensor/numerical/mathts-engine`, which is the right
split and stays.

Names that a caller can confuse because they are all public or all easy to
import:

| Name | Where it lives | What it does |
|---|---|---|
| `compose` | `src/core/tensor.ts`, root export | Cell factory |
| `composeEdges` | `src/composition/compose.ts`, root export | Quantity-edge composition |
| `composeSymbolic` | `src/composition/compose-symbolic.ts`, root export | Substitutes scalar formulas |
| `composeRelation` | `src/relations/composition-table.ts`, atlas public | Table lookup |
| `composeMorphisms` | `src/relations/category.ts`, not public | Table lookup again, ignoring endpoints |
| `composeBounds`, `composeBoundPath` | `src/atlas/error-algebra.ts`, atlas public | `(K, δ)` algebra |

`BridgeEquation` is the runtime tensor record. `BridgeEquationEntry` is the
catalog row. `BridgeEdge` is the graph edge. `AtlasBridge` is the model
relation. `BridgeCell` is the cell-union member. `BridgeEquations` is the
facade of evaluator methods (`src/bridges/bridge-equations.ts`).
`BRIDGE_EVALUATORS` / `evaluateBridge` (`src/bridges/evaluators.ts`) is a
smaller registry: the closed-form and spacetime bridges the CLI evaluates.
The facade and the registry are different sets. The missing-evaluator
message points at a method on the facade when the registry has no row. That
split is documented. It is still two dispatch tables for "evaluate this
bridge."

`canonicalJson` is exported from `src/cli/record.ts` and from
`src/composition/probe/serialize.ts` with different `Date` and `undefined`
behavior. `captureEnvironment` is two different schemas, which
`duplicate-symbols.md` already calls benign.

Fifty-three exported classes match `*Error`, each name unique. The set is
wide. It is not internally duplicated by name. The CLI's two classes are the
only ones `runCli` catches.

The generated unused report (`docs/architecture/unused-analysis.md`) lists
one file and on the order of eighty exports that no other file imports.
`src/atlas/public.ts` is that file, and `src/index.ts` reaches it with
`export * as atlas`. The walker does not count that form, so the file is not
unused. A public name with no in-repo importer is the package surface, not
dead code. This phase does not delete from that list. The production symbol
with a test and no other caller is `composeMorphisms`, which finding 1
covers.

Impact: medium, and mostly an owner decision. Adding names has been the
compatible direction. Removing or renaming a root export is a major bump.
This note does not propose the removal.

### 7. MathTS and PhysJS are wrapped where the seam is clean, and re-derived where it is a string

Clean seams in the tree today. The migration section removes the fallback
beside each of them:

- `src/numerical/formula-mathts.ts` (about 200 lines) implements
  `FormulaParser` over `@danielsimonjr/mathts-functions`. Path B
  (`formula.ts`, about 400 lines) is the recursive-descent fallback. The
  registry picks Path A when the peer loads. Accepted divergences (factorial,
  `erf`, `gamma`, juxtaposition) stay the ones the architecture note already
  lists.
- `src/numerical/mathts-engine.ts` (about 230 lines) adapts
  `@danielsimonjr/mathts-tensor`. `Float64ReferenceEngine` (about 770 lines)
  is the zero-dependency `TensorEngine`, including its own dual-number
  forward mode. Both sit behind one interface and one conformance suite.
- `src/composition/expr-simplify.ts` (about 420 lines) renders an `ExprNode`
  and calls the MathTS simplifier, then checks dimension, symbol set, and a
  numeric probe. That is a use of MathTS, not a second simplifier.
- `src/composition/probe/generator.ts` calls `dimensionallyDetermines`. It
  does not reimplement the null space. `buckinghamFilter` does the same.

String seams, which are the integration debt:

- `buckinghamFilter` stores a theorem name (`PhysJS.Dimensional.monomial_form`
  and the three sibling names). PhysJS proves the shape for a hypothesized
  exponent vector. UPT chooses the vector in TypeScript. Nothing in the
  filter result is a `formalRef`, and passing that string to `deriveEvidence`
  would be asserting evidence. The pipeline correctly does not do that.
- `emitProofTarget` checks seed theorem names against `physjsTheorem` and
  then emits text. The check is real. The artifact is not a manifest entry.

The string seam stays unlabeled as proof. This phase forbids treating a
theorem name as a `formalRef`. The optional-peer fallback described above
is what the tree does today. The migration section is the decision that
removes it.

### 8. Tests cover the pieces and do not cover the joint

About 600 test files. Atlas, bridges, composition, CLI, dimensional, and
numerical each have a large suite. The chain has
`tests/atlas/chain-pipeline.test.ts`,
`tests/atlas/chain-pipeline-catalog.test.ts`,
`tests/composition/chain-regime.test.ts`,
`tests/composition/chain-candidate.test.ts`,
`tests/atlas/proof-target.test.ts`, and
`tests/cli/chain-command.test.ts`. Those tests pin the local contracts,
including that `upt chain` returns 2 and does not write the catalog.

Gaps, as absences of a failing control rather than as a coverage percentage:

- No test distinguishes `UndefinedCompositionError` from a dimension
  mismatch inside `enumerateCompositions`. Both disappear.
- `composeMorphisms` is tested against `composeRelation` and is not tested
  against an adjacent pair of real edges, because it never sees edges.
- `tests/relations/` is one file. The π-group regime is tested from
  `tests/atlas/`, through the re-export. A break in `src/relations/regime.ts`
  fails those atlas tests. A reader looking for the relations suite finds
  the category wrapper only.
- CI runs `bun run test:probe-coverage` with thresholds on
  `tests/composition/probe`. The rest of `src/` has `bun run test:coverage`
  and no threshold in `.github/workflows/ci.yml`. A probe-only gate does not
  see `chain-pipeline.ts`.
- `tests/cli/exit-codes.test.ts` pins the contracts that already exist. It
  does not pin the Kerr geodesic branch in `metric.ts` to the same table.

`tests/api/` guards the public namespace, closure under type references, and
the optional-peer absence. Those stay the gate for any export step. This
phase's default steps do not add an export, so those tests should stay
green without being edited. A step that wants to edit them is an export
step and stops for the owner.

## Target architecture

The tiers stay in the layering order. Arrows are "may call", matching that
order. The new joint is a single internal chain result that carries the
relation-table answer, the dimensional shape, the structural class, and the
regime gate as fields of one value. The CLI reads that value only if a later
owner decision adds a command. The proof draft is a typed object the string
renderer prints. It becomes a `formalRef` only through the PhysJS procedure,
outside this phase.

```mermaid
flowchart TB
  subgraph coreTier [core]
    Tensor[UniversalTensor and Cell]
    CellRegime[regime-registry]
  end
  subgraph numTier [dimensional and numerical]
    Expr[ExprNode and algebra]
    Buck[buckinghamPi]
    Engines[TensorEngine]
  end
  subgraph relTier [relations]
    Table[composeRelation]
    Pi[regimeHolds and regimeOverlap]
    Cat[composeMorphisms]
  end
  subgraph catTier [canonical and bridges]
    Rows[BRIDGE_EQUATIONS]
    Struct[classifyStructure]
    Eval[BRIDGE_EVALUATORS and BridgeEquations]
  end
  subgraph compTier [composition]
    Graph[CATALOG_GRAPH]
    Enum[enumerateCompositions]
    Gate[joinRegimeMismatch]
  end
  subgraph atlasTier [atlas]
    Seeds[bridgeSeedKeys and catalogFormalRef]
    Pipe[runChainPipeline]
    Draft[typed proof draft]
    Route[boundPath]
    Ev[deriveEvidence]
  end
  subgraph cliTier [cli]
    Api[cli-api]
    ChainCmd[upt chain stays a non-run until decided]
  end

  Tensor --> Expr
  CellRegime --> Expr
  Expr --> Buck
  Expr --> Engines
  Buck --> Pi
  Table --> Cat
  Pi --> Cat
  Rows --> Graph
  Struct --> Graph
  Eval --> Graph
  Table --> Graph
  Graph --> Enum
  Enum --> Pipe
  Buck --> Pipe
  Struct --> Pipe
  Pi --> Gate
  Gate --> Pipe
  Seeds --> Pipe
  Pipe --> Draft
  Table --> Route
  Seeds --> Ev
  Api --> Pipe
  Api --> Route
  Api --> Eval
  ChainCmd --> Api
```

`deriveEvidence` stays off the pipeline arrow. `Cell` regimes stay off the
join-gate arrow until an owner decision says a cell axis is a π-group, which
this note does not say. MathTS is the mathematics under the formula parser
and the tensor engine. It is not a node the chain calls, and it is not an
evidence tag.

## Mathematics moves to MathTS

Daniel's decision, recorded here so the sequence below can follow it: the
`@danielsimonjr/mathts-*` packages already published on npm are required.
UPT stops implementing mathematics those packages export, and calls them.
This repository does not republish, repackage, or vendor MathTS. A missing
MathTS operation is a gap. The change that fills it belongs in
`danielsimonjr/MathTS`. Until that package exports it, UPT keeps the one
routine and does not grow a second copy beside it.

Physics stays here. A dimension and the meaning of a mismatch, a natural-unit
policy, a quantity's unit convention, a relation, a regime, a bridge, a
catalog row, a canonical equation, and an evidence tag are not MathTS
objects. A curvature node, a field-equation predicate, and the rank-6
product space in `src/core/tensor.ts` stay. The arithmetic under those
nodes moves.

The peers this note means are the ones `package.json` already names:
`@danielsimonjr/mathts-core`, `@danielsimonjr/mathts-expression`,
`@danielsimonjr/mathts-functions`, `@danielsimonjr/mathts-matrix`,
`@danielsimonjr/mathts-tensor`, `@danielsimonjr/mathts-autograd`,
`@danielsimonjr/mathts-parallel`, `@danielsimonjr/mathts-wasm`, and
`@danielsimonjr/mathts-workerpool`. `@danielsimonjr/mathts-functions` also
depends on `@danielsimonjr/mathts-gpu`, which is not a direct peer today.
Making the family required pulls that package in as MathTS's own
dependency. UPT does not re-export it.

### Parser convention

Bare `e` stays the elementary charge. `E` stays energy. Euler's number stays
`exp(x)`, for example `exp(1)`. The name `euler` stays refused.

Checked against `@danielsimonjr/mathts-functions` `parse` and `evaluate`
with an empty scope:

- `e` evaluates to `2.718281828459045`.
- `exp(1)` evaluates to the same number.
- `1 - e ^ 2` evaluates to `-6.3890560989306495`.
- `E` and `euler` are undefined symbols.
- `elementaryCharge` is a `Unit` whose value is `1.602176634e-19` C. It is
  not what the symbol `e` evaluates to.
- `config` has no switch that rebinds `e`.

MathTS's parser does not implement the physics convention. Path A in
`src/numerical/formula-mathts.ts` already hides that by injecting the
elementary charge under the name `e` before evaluation, and by refusing
`euler`. That override stays for as long as the symbol `e` means Euler
inside MathTS. Deleting it when Path B is removed would make `1-e^2` a
large negative number. The fix on the MathTS side is a physics binding in
`danielsimonjr/MathTS`: the symbol `e` is the elementary charge, and Euler's
number is only `exp(x)`. This note does not patch MathTS.

### Inventory

Each row is a place UPT does mathematics, the MathTS export that covers it,
and what the migration does. "Keep" means the physics reading stays in UPT
even when the arithmetic underneath moves.

| UPT | Mathematics it implements | MathTS | Migration |
|---|---|---|---|
| `src/numerical/formula.ts` | Recursive-descent scalar parser and evaluator (Path B), including builtins | `@danielsimonjr/mathts-functions` `parse`, `evaluate`; AST from `@danielsimonjr/mathts-expression` | Delete once the peer is required. Path A is the only parser. |
| `src/numerical/formula-mathts.ts` | Adapter over `parse`, plus the `e` override and the `ln` shim | `parse`, `evaluate` | Stays as the adapter. The override stays until MathTS binds `e`. |
| `src/numerical/formula-registry.ts` | Chooses Path A when the peer loads, else Path B | — | The fallback goes. Absence of the package is an install failure. |
| `src/numerical/formula-dimension.ts` | Turns a parsed scalar into an `ExprNode` and checks SI dimension | No dimension type | Keep. Dimensional semantics. |
| `src/numerical/binding-value.ts` | A bare number, a glued unit literal (`1km`, `25degC`), or an expression of constants | `unit` parses `1km`, `25degC`, `1um`, `1 kohm`, and `3.8e-16 kg/m^3`, and `toSI` converts them. `evaluate('1 km')` throws `Undefined symbol km` | A unit literal calls `unit`. A constant expression calls `parse`. Gap: the evaluator does not see unit symbols, so the split stays in UPT. |
| `src/composition/expr-simplify.ts` | Renders a scalar `ExprNode`, calls the MathTS simplifier, then checks dimension, symbol set, and a numeric probe | `simplify`, `casSimplify`, `fullSimplify`, `simplifyConstant` | Already delegated. The checks stay. |
| `src/composition/expr-eval.ts`, `src/composition/expr-subst.ts` | Evaluate and substitute scalar `ExprNode` arms | `evaluate` on a rendered MathTS node | Scalar arms delegate. Tensor and curvature arms stay. |
| `governingOf` in `src/atlas/chain-pipeline.ts` and the symbol walk in `src/composition/compose-symbolic.ts` | A hand walk of scalar leaves | Symbol filter on the MathTS AST the renderer already builds | One walk, and it is MathTS's. Step 5. No new UPT walker. |
| `src/canonical/normal-form.ts` | Structural hash of a scalar up to a dimensionless factor | `simplify` does not know that physics equivalence | Keep. It is the linkage rule, not a CAS. |
| `src/numerical/float64-engine.ts` | Dense `Float64Array` tensor algebra and a dual-number forward mode | `@danielsimonjr/mathts-tensor`, `@danielsimonjr/mathts-matrix` (`svd`, `qr`, `det`, `transpose`), `@danielsimonjr/mathts-autograd` | Delete when `MathTSEngine` is the only engine. |
| `src/numerical/mathts-engine.ts`, `src/numerical/tensor-engine.ts`, `src/numerical/engine-registry.ts` | The `TensorEngine` seam and the optional MathTS adapter | `@danielsimonjr/mathts-tensor` | The adapter becomes the engine. The registry's zero-dependency fallback goes. |
| `src/numerical/lowering.ts` and the connection, curvature, derivative, and Weyl lowering modules | Walk a physics `ExprNode` into engine calls | The arithmetic is the engine | Keep the walk. It is the physics AST. |
| `src/numerical/strides.ts` | Row-major index arithmetic for the float64 engine | Tensor storage in `@danielsimonjr/mathts-tensor` | Leaves with the float64 engine. |
| `src/numerical/metric-inverse.ts` | Infinity-norm of `g⁻¹ g − I` | Matrix multiply through the engine | Through `MathTSEngine`. |
| `src/dimensional/buckingham.ts` | Exact rational `rref` and `nullSpace` over a fraction type, then the π-group reading | `nullspace` is numeric. No exact-fraction null space is exported | Gap. Keep the rational routine. Do not substitute the float `nullspace`. The π-group reading stays. File the exact routine in MathTS. |
| `src/core/tensor.ts`, `src/core/labeled-tensor.ts` | The physics product space and axis-tagged contraction | `@danielsimonjr/mathts-tensor` is rank-N storage, not `L + B + E` | Keep. |
| `src/numerical/quadrature.ts` | A fixed 16-point Gauss–Legendre rule | `gaussQuad`, `rootsLegendre`, `quad` | Delegate. A test pins the polynomial degree the node uses today. |
| `src/numerical/pderiv.ts` | Centered finite differences on a grid and on a function | `derivativeAt`, `numericJacobian`, `partialDerivative` | Delegate the function case. The grid sampler stays. |
| `src/numerical/geodesic-integrator.ts`, `src/numerical/null-ray-integrator.ts` | Fixed-step classical RK4 for a geodesic ODE | `solveODE`, `solveODESystem`, `odeAdaptiveStep` | Delegate when the golden orbit still matches. |
| `src/numerical/gl4-integrator.ts` | Implicit symplectic Gauss–Legendre 4, with its Butcher tableau | No symplectic or GL4 export. `gaussQuad` is a quadrature rule, not that tableau | Gap. Keep this integrator. Do not add a second generic ODE solver next to `solveODE`. File the tableau in MathTS. |
| `src/numerical/perihelion-finder.ts` | Bisection on a cubic Hermite of cached samples | No cubic-Hermite root finder in the export list | Gap. Keep. It is post-processing of the integrator's samples. |
| `src/composition/uncertainty.ts` | First-order propagation along a composition edge | No uncertainty export | Gap. Stays. The contract stays the graph-layer one. |
| `src/cli/commands/evaluate.ts` `propagateUncertainty` | A second contract under the same name | None | Rename. Do not merge the two contracts, and do not invent the function in UPT while waiting on MathTS. |
| `src/dimensional/units.ts` | Parse `1um`, `25degC`, `1 kohm`, products and powers, and convert | `unit`, `toSI`, `to`, `compareUnits`, `splitUnit`, `createUnit` | Delegate conversion. `unit('25degC').toSI()` is `298.15 K`. |
| `src/dimensional/algebra.ts` | Add and subtract the seven SI exponents | A MathTS `Unit` dimension vector has length 10. Metre sits at index 1 | Keep `Dimension`. Do not replace it with that vector. A mapping between the two vectors is a MathTS gap if one object is ever wanted. |
| `src/dimensional/natural-units.ts`, `src/numerical/geometrized.ts`, `src/dimensional/unit-convention.ts` | `ħ = c = 1`, `G = 1`, and which unit a quantity is written in | No natural-unit or geometrized mode | Keep. Policy, not unit arithmetic. |
| `src/core/constants.ts` | Bare CODATA numbers the bridges multiply | `elementaryCharge`, `speedOfLight`, `boltzmann`, and the other named `Unit` objects | Keep the bare-number table. `elementaryCharge` matches `1.602176634e-19` and is a `Unit`, which a bridge formula does not accept in place of a number. |
| Curvature, Einstein, Klein–Gordon, Friedmann, Killing, and Weyl modules under `src/dimensional/` | Physics predicates and index structure | No Riemann node, no field-equation node | Keep. Residuals call the engine. |

`src/composition/discovery.ts` and `src/composition/probe/` stay out of this
migration, as the original sequence required. The probe's grammar enumerator
already calls `dimensionallyDetermines`. It does not gain its own null space.

## Sequenced plan

Each step is one pull request, mergeable on its own, and safe to stop after.
A later step does not start by assuming an earlier step widened the
composition table or the public barrel. Tests are written to fail on the
tree before the production change, per the law in `AGENTS.md`.

Steps 1 through 4 are the joint this note already specified. They do not
import MathTS and they do not delete an engine. Step 5 is the expression
walk, and it is MathTS's walk. Steps 6 through 8 are the migration the
earlier draft held out. Steps 9 through 12 are the old steps 6 through 9.
The release that contains step 6 is 2.0.0. Steps 7, 8, and 12 ship on that
major and do not each open a new major. Steps 9, 10, and 11 merged on 1.x
before that break.

Daniel approved this amendment on 2026-10-02. The table is the record of
which steps have a merge commit. A row marked next is not started.

| Step | Work | State | Pull request | Merge |
|---|---|---|---|---|
| 1 | Record composition-table refusals | done | #303 | `f965d308a518cb44beea9ee44c64a9ebfa9af9c8` |
| 2 | One internal chain record | done | #305 | `5629cc826af6a6cb53fc5d66e908e27e43aa485f` |
| 3 | Category composition checks that the morphisms meet | done | #306 | `b2862a34abf4336e24821eaa485de30aad6d8bf0` |
| 4 | Typed proof draft | done | #307 | `c8d7d54d41736c16a28ab9ea38c8a883828c01ff` |
| 5 | The scalar walk is MathTS's | done | #311 | `85f806329371aeaa2caaa4b1ec9e22c1724607e9` |
| 6 | MathTS required; delete Path B and `Float64ReferenceEngine` | done, and this row is 2.0.0 | #312 | `e6d2dcefaa159eced0f60d9d1e87b2e60bf39859` |
| 7 | Unit conversion and quadrature call MathTS | done | #313 | `9954ff9a3a907d813a6d3de4a951e4f748a7381f` |
| 8 | ODE calls MathTS where the method exists | next | — | — |
| 9 | Rename the CLI uncertainty helper | done | #308 | `d4606c804f98d2ed0c0f1b49da812e110fdc39dc` |
| 10 | Commands go through `cli-api` | done | #309 | `6196b639fc2bd96df0a50a69ee98ac469f2abc1e` |
| 11 | Name the three regimes in one module | done | #310 | `d7f7630dea00cbb5a89fc41c19af8b02d26f1f06` |
| 12 | Exit-code alignment for the metric geodesic | next | — | — |

### Step 1 — Record why a pair was not a proof target

Scope. `enumerateCompositions` gains an internal classification of the
throws it already catches, or a sibling function the pipeline can call that
returns the same pairs plus a refusal list. `UndefinedCompositionError` is
its own list. `CompositionAliasError` stays `requiresDisposition`. A
dimension or junction failure stays the silent non-pair it is today.
`EnumerationReport` on the root barrel does not gain a required field in
this step. A new field on that public type waits for an owner decision.

Risk. Low if the new list is additive and `proofTargets` is unchanged.
Medium if a pair that throws today is moved onto `proofTargets`. This step
does not move pairs.

Tests. A fixture pair whose relations are a silent cell appears on the
refusal list and not on `proofTargets`. A fixture pair that fails
`equals` on the dimension appears on neither the refusal list nor
`proofTargets`. A `derivation` then `derivation` pair that already composes
stays a proof target when it is substitutable. The silent-cell fixture must
fail before the list exists.

Public API. Unchanged.

### Step 2 — One internal chain result

Scope. Replace the adapters in `toCandidate` and `emit` with one internal
type that can carry the classifier kind, the order key, the filter theorem,
the regime mismatch, and the edge ids together. `orderChainCandidates` can
keep its four-kind order key as a function of that type. Confirmation and
restatement still skip the regime gate, as the join-gate note requires.
`ChainPipelineResult` may remain the orchestrator's return type if it
becomes a view of the internal type rather than a second encoding.

Risk. Low. All of these types are `@internal`. Golden output of
`runChainPipeline(CATALOG_GRAPH)` stays the oracle: the same confirmations,
restatements, stubs, and regime rejections, in the same order.

Tests. The existing chain-pipeline catalog test is the oracle. A new test
builds one internal value and checks that the order key and the rendered
kind agree. It fails if `toCandidate` and `emit` can still drift.

Public API. Unchanged.

### Step 3 — Category composition checks that the morphisms meet

Scope. `composeMorphisms` returns `no-composite-claim` when
`first.target` is not `second.source`, and otherwise returns
`composeRelation` as it does now. The pipeline records that result on the
internal chain value from step 2. It does not throw, and it does not drop a
pair that `composeSymbolic` accepted. Endpoint identity is string equality
on the ids the caller stored. This step does not invent object ids for
quantity edges.

Risk. Medium for callers of `composeMorphisms` that relied on endpoint
blindness. The only caller is the category test, which must be updated in
the same pull request and must have failed first on a non-adjacent pair.
The pipeline's set of stubs does not change.

Tests. Adjacent morphisms match `composeRelation` on every cell, including
the silent ones. A non-adjacent pair returns `no-composite-claim` even when
the table cell is `derivation`. The pipeline test shows the recorded field
and an unchanged stub list.

Public API. Unchanged. `composeMorphisms` stays off `src/atlas/public.ts`
and off the root barrel.

### Step 4 — A typed proof draft, string as a rendering

Scope. `emitProofTarget` builds a typed object with the fields it already
puts in the JSON (`key`, `bridgeId`, `theorem`, `covers`, `coverage`,
`leanProof`, `axioms`) and renders the comment block from that object.
`leanProof` stays `absent`. The markers stay so existing golden text can be
compared. The object is not written to `formal/physjs/manifest.json` and is
not passed to `deriveEvidence`. `physjsManifestProblems` may be called on a
copy the test builds. The production orchestrator still does not write.

Risk. Low if the rendered string is golden-tested and unchanged. Medium if
the renderer "cleans up" a comment and the golden file moves without a
physics reason.

Tests. The existing proof-target test fails if the object and the string
disagree. A mutation that sets `leanProof` to a complete marker still fails
the manifest problem check, as it does now.

Public API. Unchanged.

### Step 5 — The scalar walk is MathTS's

Scope. `governingOf` and the symbol collector in `compose-symbolic.ts` read
leaves from the MathTS AST that `expr-simplify.ts` already renders, using
that node's symbol filter. UPT does not add a walker over `ExprNode`. The
dimension check, the symbol-set check, and the numeric probe after
`simplify` stay in `expr-simplify.ts`. Tensor and curvature node kinds
still contribute no governing symbol. The Path A override that binds `e`
to the elementary charge stays in force for this walk.

Risk. Low for the leaf set if the characterization test pins today's names.
Medium if the rendered AST treats `e` as Euler and a governing symbol
disappears or appears. The red case is a formula whose only special name
is `e`: it is the charge, and it is not a free leaf the way `x` is.

Tests. A scalar with a nested transcendental yields the same name set from
both call sites. A curvature node yields none. A formula `exp(1)` does not
add a leaf named `e`. The test fails before the shared MathTS read exists.

Public API. Unchanged.

### Step 6 — MathTS is required, and the two fallbacks go

Scope. The MathTS peers move from optional `peerDependencies` to
dependencies. `src/numerical/formula.ts` (Path B) and
`Float64ReferenceEngine` go. `getFormulaParser` and `getActiveEngine` no
longer have an absent-peer branch. The ambient declarations that exist so
`tsc` can typecheck without the packages go with them. `mathts-engine.ts`
and `formula-mathts.ts` stay, including the `e` override. No MathTS
package is republished. The changelog migration note for the release that
contains this step says: install the MathTS packages named above; the
library does not start without them; bare `e` is still the elementary
charge; Euler's number is still `exp(x)`; a deep import of the deleted
parser or the deleted engine fails.

Risk. High for anyone who installed UPT without the peers. That is the
break. Medium if a conformance test compared the two engines and has
nothing left to compare: the oracle becomes a fixture of values, not the
deleted engine.

Tests. A formula `1-e^2` with no binding evaluates near `1`, and `exp(1)`
evaluates to Euler's number. Importing the deleted modules fails. The
engine conformance cases run on `MathTSEngine` alone. The red control is
the current tree: `getActiveEngine` still constructs `Float64ReferenceEngine`
when the peer is hidden, and that test fails once the fallback is gone.

Public API. Breaking. This step is 2.0.0. The root barrel's names for
`parsePhysics` and the engine stay if they still point at the MathTS
implementations. Names that were only the deleted classes go, and the
migration note lists them.

### Step 7 — Unit conversion and quadrature call MathTS

Scope. `src/dimensional/units.ts` conversion calls `unit` and `toSI`.
`src/numerical/quadrature.ts` calls `gaussQuad` or `quad` at the degree the
integral node uses today. `Dimension`, `natural-units.ts`,
`unit-convention.ts`, and `geometrized.ts` stay. `buckingham.ts` keeps its
exact rational null space. Numeric `nullspace` is the wrong tool for an
exponent vector.

Risk. Medium where a glued literal (`25degC`, `1 kohm`) converts to a
different SI number than today. The red test is that pair of values before
the call switches. Low for quadrature if the degree is pinned.

Tests. `convertValue('25degC', 'K')` stays `298.15`. A 16-point integral
the suite already pins stays that value. A float `nullspace` substituted
for the rational one fails the Buckingham exponent test.

Public API. The conversion functions stay. Their implementation moves.
Ships on 2.0.0, after step 6.

### Step 8 — ODE calls MathTS where the method exists

Scope. The fixed-step RK4 geodesic integrators call `solveODE` when the
existing golden orbit matches. `gl4-integrator.ts` stays, and so does
`perihelion-finder.ts`. `composition/uncertainty.ts` stays. This step does
not add an ODE solver, a Hermite finder, or an uncertainty function.

Risk. Medium for the RK4 replacement if an adaptive `solveODE` drifts off
the golden samples. The step keeps the fixed step, or it does not switch.
The GL4 runs stay byte-identical.

Tests. The geodesic golden matches, or the call is not switched. A test
names `gl4-integrator.ts` as still present. The uncertainty fixture's
numbers are unchanged.

Public API. Unchanged beyond step 6. Ships on 2.0.0.

### Step 9 — Rename the CLI uncertainty helper

Scope. The function in `src/cli/commands/evaluate.ts` gets a name that is
not `propagateUncertainty`. Behavior, correlations, and the curvature ratio
stay. It still does not call the graph-layer function. MathTS has nothing
to call. `docs/architecture/duplicate-symbols.md` is generated; this step
does not hand-edit it.

Risk. Low. The public `propagateUncertainty` stays the graph-layer function.

Tests. The CLI evaluate uncertainty cases still pass under the new name. A
test that imports the old CLI name fails to compile.

Public API. Unchanged. Merged on 1.x. The step table names the commit.

### Step 10 — Commands go through `cli-api`

Scope. The direct imports in the table under finding 5 become re-exports on
`src/cli-api.ts`, and the command modules import types and values from that
barrel or from other CLI modules. `src/cli-api.ts` stays off the root
barrel. No behavior change.

Risk. Low, and mechanical. A cycle through the barrel is the failure mode.
`cli-api` already imports the root index. A command that imported `cli-api`
while `cli-api` imported the command would cycle. Commands keep importing
the barrel; the barrel does not import commands.

Tests. Existing CLI tests. `bun run layer:check` stays green. The allowlist
does not grow.

Public API. Unchanged. Merged on 1.x. The step table names the commit.

### Step 11 — Name the three regimes in one module

Scope. A short internal module under `src/relations/` that exports nothing
but type aliases and a comment naming the three vocabularies in finding 4,
each pointing at its existing function. No value conversion. No new
`Regime` type. The join gate's behavior is unchanged.

Risk. Low, provided the module does not import `src/atlas/` or
`src/core/` in a way that adds an upward edge. It may name the core
registry in a comment and import only `relations` types. If a type alias
requires importing `src/core/regime-registry.ts`, that import is upward
under the layering note and the step stops. The glossary is then a comment
in `src/relations/regime.ts` instead of a new import.

Tests. A test lists the three names and fails if a fourth export appears.
It does not assert that the three are equal.

Public API. Unchanged. Merged on 1.x. The step table names the commit.

### Step 12 — Exit-code alignment for the metric geodesic

Scope. `upt metric` geodesic failures that are a bad value (non-positive
mass, `|a|` above the bound) become `CliError` (exit 1). A missing
subcommand argument stays `UsageError` (exit 2). This step changes a CLI
contract. It ships inside 2.0.0, so it does not need a major of its own.

Risk. Medium, because it is a behavior change. The red test is the current
exit code, recorded, then the assertion is updated only after that failure
is in the pull request's history as the reason. Do not change other exit
codes in the same pull request.

Tests. `tests/cli/exit-codes.test.ts` gains the Kerr cases. The first
commit of the test expects today's exit 2 and fails once the command
returns 1, or the test is written against the desired code and shown red
on unchanged `metric.ts` before the edit.

Public API. The library barrel is unchanged. The CLI contract changes.
Covered by the 2.0.0 migration note in one line.

### Held out of the sequence

These are real, and they are not steps of this phase:

- A `upt chain` that calls `runChainPipeline`. The pipeline note left the
  orchestrator internal. Step 1's refusal list is what a future read-only
  command would print. The command itself waits for an owner decision.
- Shrinking or renaming the root barrel beyond names that step 6 deletes
  because the module is gone. `docs/planning/Atlas-API-Review.md` still
  owns the promotion question.
- Merging `BridgeEquations` with `BRIDGE_EVALUATORS`.
- Merging the two `propagateUncertainty` contracts. MathTS does not offer
  one function that could be the merge.
- Republishing or repackaging MathTS.
- Filling a gap inside this repository: exact rational null space, a
  symplectic GL4 tableau, a cubic-Hermite finder, uncertainty propagation,
  a physics binding for the symbol `e`, a length-7 dimension vector, and
  unit symbols inside `evaluate`. Those are `danielsimonjr/MathTS`.
- Running Lean, writing a manifest, or calling `deriveEvidence` on a stub.
- Widening the composition table.
- Unifying cell regimes with π-groups.
- Editing `src/composition/discovery.ts` or `src/composition/probe/`.

### MathTS gaps to file

File these in `danielsimonjr/MathTS`. None of them is a pull request in
this repository.

1. Physics binding: symbol `e` is the elementary charge; Euler's number is
   only `exp(x)`; `euler` is not a constant; `E` stays unbound.
2. Exact rational null space, so Buckingham exponent vectors need not stay
   on a private fraction type.
3. Symplectic Gauss–Legendre 4 as an ODE method, distinct from `gaussQuad`.
4. First-order uncertainty propagation.
5. `evaluate` resolving a unit symbol the way `unit('1 km')` already does.
6. A dimension vector that is the seven SI bases, or a documented map from
   the length-10 vector onto those seven.

## Semver

Step 6 is a 2.0.0. The package gains required dependencies and loses the
zero-dependency parser and the zero-dependency tensor engine. Steps 1
through 4, and steps 9 through 11, merged on 1.x. The step table names the
commits. Step 5 merged: the scalar walk is MathTS's. Step 6 merged:
MathTS is required. Step 7 merged: unit conversion and the 16-point rule
call MathTS. Steps 8 and 12 are next. Steps 7, 8, and 12 ship on
the 2.0.0 line and do not each bump the major again.

The migration note that ships with step 6 states:

- Install `@danielsimonjr/mathts-core`, `@danielsimonjr/mathts-expression`,
  `@danielsimonjr/mathts-functions`, `@danielsimonjr/mathts-matrix`,
  `@danielsimonjr/mathts-tensor`, `@danielsimonjr/mathts-autograd`,
  `@danielsimonjr/mathts-parallel`, `@danielsimonjr/mathts-wasm`, and
  `@danielsimonjr/mathts-workerpool`. `@danielsimonjr/mathts-gpu` arrives
  as MathTS's dependency, not as a UPT package.
- The library does not start when those packages are absent.
- Bare `e` is the elementary charge. `exp(1)` is Euler's number. `E` is
  energy. The name `euler` is refused. MathTS itself still evaluates `e`
  as Euler; UPT's adapter overrides that until gap 1 lands.
- A deep import of Path B or `Float64ReferenceEngine` fails.
- This repository does not publish a MathTS tarball.

A later removal or rename of a name on `src/index.ts` or
`src/atlas/public.ts`, beyond a class that existed only to be the deleted
engine, is still its own major. Step 6 lists the names it actually deletes.
The atlas Tier 2 decision in `docs/planning/Atlas-API-Review.md` stays
deferred and is not this 2.0.0.

## Open questions for Daniel

1. Should a silent composition-table cell stay indistinguishable from a
   dimension mismatch, or should step 1's refusal list become the permanent
   record? The recommendation is the refusal list, without dropping any
   pair the pipeline already returns.
2. Does `upt chain` stay a non-run that exits 2? This note does not specify
   that command.
3. The 2.0.0 in this note is the MathTS requirement. The atlas Tier 2
   review stays a separate decision. Confirm that step 6 does not also
   shrink the root barrel.
4. Do the three regime vocabularies stay three, with step 11 only naming
   them? The recommendation is yes.
5. Step 12 changes one CLI exit code inside the 2.0.0 line. Confirm it
   waits for that major and does not land on 1.x.
6. The two uncertainty functions stay two contracts. MathTS has no
   function to share. Confirm the CLI rename in step 9 is the whole of
   that work.
7. Is `composeMorphisms` worth keeping once it checks endpoints? The
   recommendation is to keep it. Deleting it is an alternative to step 3.
8. The nine catalog edges that carry `relation` stay. Step 1 records the
   false comment and does not remove the relations.
9. For each gap in the list above, confirm UPT keeps the local routine
   until MathTS exports it, and does not reimplement it under a new name
   in the meantime.

## Amendment proposal

Daniel approved this amendment on 2026-10-02. This note does not edit
`ACTIVE.md` or `ROADMAP.md`. The tasks for the done rows were filed with
those pull requests. Rows marked next are not started here. They wait for
the MathTS release. Landing the note does not start them.

### Proposed `ACTIVE.md` tasks

File these under open tasks, easiest first, and only the steps Daniel
accepts. Each line is the task title. The body of the task points back at
this note's step and does not restate the design. Tasks 1–4 and 9–11 are
the done rows of the step table. Tasks 5–8 and 12 are next and are not
started. They wait for the MathTS release.

1. Record composition-table refusals from enumeration as their own list,
   without changing which pairs are proof targets. Design:
   `docs/planning/refactor-integration-phase.md`, step 1.
2. Use one internal chain-result type in the classifier, the orderer, and
   the orchestrator. Design: step 2.
3. Make category composition refuse morphisms that do not meet, and record
   that result on the chain without dropping proof targets. Design: step 3.
4. Build the proof-target draft as a typed object and render the existing
   text from it. Design: step 4.
5. Read scalar leaves through the MathTS AST, and do not add a UPT walker.
   Design: step 5.
6. Make the MathTS packages required dependencies and remove Path B and
   `Float64ReferenceEngine`. Design: step 6. This task is the 2.0.0.
7. Delegate unit conversion and quadrature to MathTS, and keep the exact
   Buckingham null space. Design: step 7.
8. Delegate a geodesic RK4 to `solveODE` only when the golden matches, and
   leave the GL4 integrator in place. Design: step 8.
9. Rename the CLI uncertainty helper so it is not the public uncertainty
   function. Design: step 9.
10. Move command-module library imports onto the CLI barrel. Design: step 10.
11. Name the three regime vocabularies from the relations layer without
    merging them and without a new upward edge. Design: step 11.
12. Map a bad Kerr geodesic value to exit 1, on the 2.0.0 line. Design:
    step 12.

Leave these unfiled until a separate owner decision:

- A read-only chain command.
- Any edit to the root barrel beyond the classes step 6 deletes, or any
  edit to `src/atlas/public.ts`.
- Merging the evaluator facade with the evaluator registry.
- A MathTS change. That work is `danielsimonjr/MathTS`.
- Republishing or repackaging MathTS.

### Proposed `ROADMAP.md` paragraph

Place this after the phase list, as direction rather than as a new phase
number. Do not renumber Phases 0–6. Do not mark a phase met in that file.

> Integration of the catalog, the quantity graph, the relation table, the
> regime join, the proof overlay, and the CLI is a refactor phase specified
> in `docs/planning/refactor-integration-phase.md`. Mathematics in that
> phase is delegated to the published `@danielsimonjr/mathts-*` packages.
> The release that removes the zero-dependency parser and tensor engine is
> 2.0.0. The phase is authorized only by open tasks in `ACTIVE.md` that
> name a step of that note. It does not reopen Phases 0–6, does not widen
> the composition table, does not republish MathTS, and does not add a
> public export except where step 6 must drop a deleted class.

## What this note does not do

It does not move a module, delete an export, or add a command. It does not
claim a coverage percentage, a cycle count beyond the allowlist cited above,
or a catalog count. Those live in `NOTES.md` and in the generated
architecture reports. It does not authorize PhysJS work. A proof target
becomes a proof in that repository, then a vendored reference through
`WORKFLOWS.md`, and only then an evidence tag. It does not publish a MathTS
package and it does not vendor one.
