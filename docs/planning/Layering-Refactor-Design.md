# Layering refactor

> **Status as of 2026-10-02.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../NOTES.md): ten atlas bridges and fourteen catalog ids (be-12, 16, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `2e09357f9674bc60b60b378155a1623c27dc7b04`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](Bridge-Gap-Inference.md). Stage 4 still says a catalog reference passed into `deriveEvidence` lights `formally-proved`, including a property and a cross-check, and the fifteen `physjsFormalRef` keys are this note's starting allowlist.

This note specifies a staged refactor of import direction. It changes no
code, no public export, and no cell of the composition table. Approval is
recorded outside this file. Landing the note does not authorize a stage.
A stage becomes work when Daniel accepts this note and an `ACTIVE.md` task
names that stage. Publishing the package is the owner's job and is not part
of any stage.

The order below is the one the gate will enforce. It is stricter than the
cycle rule `src/atlas/index.ts` already states. That comment stays true:
`bridges/` and `composition/` import atlas leaf modules and leave the atlas
barrel alone, and `bun run docs:deps` reports no cycle on that graph. The
curvature cycles further down are invisible to that tool for a separate
reason. This note adds a direction rule on top of the barrel rule.

It builds on the module map in `docs/architecture/ARCHITECTURE.md`, the
generated graph in `docs/architecture/DEPENDENCY_GRAPH.md`, the Phase 1
overlay in `ROADMAP.md` ("Relation contracts as an additive overlay"), and
the public-surface decision in `docs/planning/Atlas-API-Review.md` (S6.7).

## What this keeps

Phase 1 put relation contracts on the records that already existed.
`BridgeEdge` gains an optional `relation`. Evidence tags are derived.
`Conventions` are compared, and an undeclared key is unknown. This refactor
keeps that overlay. It moves the vocabulary the overlay is written in, so a
lower layer can name a contract without importing `src/atlas/`.

S6.7 stays in force. The public atlas surface is one namespace:

```ts
export * as atlas from './atlas/public.js';
```

`src/atlas/public.ts` is the only list of that namespace. The subpath
`universal-physics-tensor/atlas` stays the `@internal` surface. No stage
adds or removes a name on either surface. Promoting the deferred Tier 2
set is a separate owner decision and is not a stage here.

## The order

```text
core
  → dimensional | numerical
  → relations          (stage 2 inserts this directory)
  → canonical | bridges | cases | diff
  → composition
  → atlas
  → cli
```

A tier may import its own tier and any tier written earlier in that list
(`composition` may import `bridges`; `bridges` may import `dimensional`).
An import of a tier written later (`bridges` importing `composition`,
`numerical` importing `composition`) is a violation. A cycle is a violation
inside a tier as well. `tests/` is outside the rule.

Placements the picture has to name, because the dependency-graph tool's
module list is wider:

| Path | Where it sits |
|---|---|
| `src/index.ts` | The package barrel, not a tier. It may import any tier. Its only atlas import is the namespace line above. The barrel also exports the rest of the library. |
| `src/cli-api.ts` | With `cli`. The dependency-graph tool calls this file `root`. It is the CLI's internal barrel. |
| `src/diff/` | With `canonical` / `bridges` / `cases`. It imports `core`, `dimensional`, `numerical`, and `bridges`. It does not import `composition` or `atlas`. |
| `src/composition/probe/` | With `composition`. |
| `src/relations/` | Added by stage 2, between the numerical tier and the catalog tier. The catalog tier may import it. It may import `dimensional`, because `Regime` carries a `PiGroup` and `deriveRegimeGroups` calls `buckinghamPi`. |

Peers inside a tier may import each other. `dimensional` importing
`numerical`, and `canonical` importing `bridges`, are peer edges.

`core`, `dimensional`, and `numerical` do not import `atlas`. No static
import and no dynamic `import()` in those trees names an atlas module.

## Starting allowlist

Stage 1 records the violations below and refuses any other upward edge or
any other cycle. After that stage, the checker's allowlist file is what CI
enforces. This table is the set that file is reviewed against. Later stages
delete rows from the file. This table is the starting set, and it is not
rewritten as rows disappear.

An estimate of about 25 upward edges in about 10 files, all of them reaching
atlas, mixes two sets. The atlas set is 14 import declarations and 29
bindings in 7 files. The same order also forbids 12 further declarations in
6 other files. Those 12 do not import `atlas`. Stage 1 allowlists both, or
the gate cannot go green.

### Imports of `atlas` from a lower tier

| File | Module | Bindings |
|---|---|---|
| `src/bridges/index.ts` | `atlas/types.ts` | `Conventions`, `Counterexample`, `FormalRef`, `Regime`, `RelationContract` (types) |
| `src/bridges/index.ts` | `atlas/physjs-ref.ts` | `physjsFormalRef` (value). Fifteen call sites, keys `be-11`, `be-13`, `be-16`, `be-19`, `be-24`, `be-29`, `be-34`, `be-38`, `be-42`, `be-51`, `be-53`, `be-58`, `be-61`, `be-64`, `be-65` |
| `src/bridges/index.ts` | `atlas/regime.ts` | `deriveRegimeGroups` (value) |
| `src/canonical/canonical-equation.ts` | `atlas/types.ts` | `Conventions` (type) |
| `src/composition/compose.ts` | `atlas/composition-table.ts` | `composeRelation`, `NO_COMPOSITE_CLAIM` |
| `src/composition/compose.ts` | `atlas/conventions.ts` | `checkConventions` |
| `src/composition/compose.ts` | `atlas/types.ts` | `Conventions`, `RelationContract`, `RelationType` (types) |
| `src/composition/edge.ts` | `atlas/types.ts` | `Conventions`, `Counterexample`, `Regime`, `RelationContract` (types) |
| `src/composition/uncertainty.ts` | `atlas/types.ts` | `ApproximationBound` (type) |
| `src/composition/graph-viz.ts` | `atlas/types.ts` | `EvidenceTag`, `RelationType` (types) |
| `src/composition/graph-viz.ts` | `atlas/derive-evidence.ts` | `catalogEvidenceInput`, `deriveEvidenceForVerdict`, `NO_PASSING_WITNESSES` |
| `src/composition/poster-source.ts` | `atlas/association.ts` | `Association` (type) |
| `src/composition/poster-source.ts` | `atlas/derivation.ts` | `Derivation`, `DerivationId` (types) |
| `src/composition/poster-source.ts` | `atlas/statement.ts` | `Statement`, `StatementId` (types) |

`cli` importing `atlas` follows the order. `src/cli-api.ts`,
`src/cli/commands/_atlas-map.ts`, `src/cli/commands/map.ts`, and
`src/cli/commands/retrieve.ts` are those imports.

The fill colours in `graph-viz.ts` (`STATUS_STYLE`) are keyed by catalog
confidence and by `law` / `proposed` / `poster` / `association`. The atlas
imports in that file are the evidence filter (`deriveEdgeEvidence` and
`EvidenceTag`) and the relation filter (`RelationType`). Stage 2 takes the
types. Stage 3 takes the derive-evidence call. The fill-colour table stays
in `graph-viz.ts`.

### Other upward imports

| File | Imports |
|---|---|
| `src/bridges/confrontation-coverage.ts` | `composition/catalog-graph.ts` (`CATALOG_GRAPH`) |
| `src/bridges/descriptor.ts` | `composition/catalog-graph.ts` (`CATALOG_GRAPH`), `composition/edge.ts` (`BridgeEdge`, type) |
| `src/canonical/linkage.ts` | `composition/expr-eval.ts` (`evalExpr`), `composition/symbolic-constants.ts` (`CONSTANTS`) |
| `src/canonical/normal-form.ts` | `composition/symbolic-constants.ts` (`CONSTANTS`, `piMultipleValue`) |
| `src/core/labeled-tensor.ts` | `numerical/tensor-engine.ts` (`EngineTensor`, `TensorEngine`, `EinsumSpec`, types), `dimensional/errors.ts` (`UPTError`) |
| `src/numerical/binding-value.ts` | `composition/formula-names.ts` (`FORMULA_NAMED`), `composition/unit-convention.ts` (`quantityConventionUnit`), `composition/natural-units.ts` (`naturalConstantOverrides`, `UnitMode`), `composition/symbolic-constants.ts` (`CONSTANTS`) |

Stages 2, 3, and 4 do not remove these rows. Stage 5 may. See the open
questions for the rows it does not have a specified fix for.

### A peer edge, allowed

Nine canonical entry modules import `sym` from
`src/bridges/equations/_be-helpers.ts`: `mechanics`, `fluids-waves`,
`thermo-nuclear-cosmo`, `condensed-matter`, `electromagnetism`,
`nonmonomial`, `atomic`, `relativity`, `statistical-mechanics`.
`_be-helpers.ts` re-exports `sym` from `dimensional/ast-builders.ts`.
`dimensional-classics.ts` and `_l1-build.ts` already import the dimensional
module. The nine are a same-tier edge, so the gate allows them. `todo.md`
records the earlier dedup that left this re-export in place so those
importers would keep compiling. Retargeting them at `ast-builders.ts` is
optional cleanup, because loading `_be-helpers` also loads the bridge
dimension checker.

### Cycles

`madge`, over `src/` with `tsconfig.json`, reports six cycles. All six
are closed by the dynamic import at `src/dimensional/curvature.ts:511`
(`await import('../numerical/index.js')` inside `bianchiResidual`):

1. `dimensional/validator.ts` → `dimensional/validator-registry.ts` → `dimensional/curvature.ts` → `numerical/index.ts`
2. `dimensional/curvature.ts` → `numerical/index.ts` → `numerical/lowering.ts`
3. `dimensional/validator.ts` → `validator-registry.ts` → `curvature.ts` → `numerical/index.ts` → `numerical/lowering.ts`
4. `dimensional/curvature.ts` → `numerical/index.ts` → `numerical/lowering.ts` → `numerical/curvature-lowering-helpers.ts`
5. `dimensional/validator.ts` → `validator-registry.ts` → `curvature.ts` → `numerical/index.ts` → `numerical/lowering.ts` → `numerical/derivative-lowering.ts`
6. `dimensional/validator.ts` → `validator-registry.ts` → `curvature.ts` → `numerical/index.ts` → `numerical/metric-inverse.ts`

`numerical/index.ts` imports `dimensional/validator.ts`. The static imports
from `curvature.ts` into `numerical` are type-only (`TensorEngine`,
`NumericalInputs`, `NestedArray`) and are not this cycle.
`docs:deps` does not record dynamic `import()` in source files, on purpose,
so a cycle closed only by that import is invisible to it and the generated
graph reports none. The dynamic import is what keeps module initialization
acyclic: a static import of `numerical/index.ts` from `curvature.ts` would
load `validator.ts` while `validator.ts` is still loading. Stage 1's cycle
check has to see dynamic `import()` in `src/`. It is a separate pass from
the one that writes `docs/architecture/`. Folding it into `docs:deps` would
change the committed cycle count.

These six are peer cycles inside `dimensional | numerical`. They are
allowlisted until an optional stage 5 split.

## Stage 1 — enforce the order

One pull request. Tests and green CI. No moves.

Add a checker, either dependency-cruiser or an extension of
`tools/create-dependency-graph`. Extend the existing tool, as a separate
pass that does not rewrite `DEPENDENCY_GRAPH.md`. One import grammar, and
the generated architecture docs stay on the parser they have. Dependency-cruiser
is acceptable if the extension cannot allowlist a row and prove a forbidden
row fails.

The checker:

- Scans `src/` only.
- Counts static imports, including `import type` and `export … from`.
- Counts dynamic `import()` with a string literal.
- Assigns tiers as in the picture above, including `diff` and `cli-api.ts`.
- Treats `src/index.ts` as the barrel.
- Fails when an upward edge is absent from the allowlist.
- Fails when an allowlist row names an edge the tree no longer has.
- Fails on a cycle absent from the six-cycle allowlist.

The shrinking rule is the second failure. A later stage deletes the rows it
removed, in the same pull request, from the allowlist file. If the tree's
upward set differs from the table above when stage 1 is opened, that pull
request amends this note in the same commit. After stage 1, the allowlist
file is the set CI enforces, and this table stays the reviewed starting set.

The test proves the checker can fail. A fixture graph with one extra upward
edge, and a fixture that drops a real allowlist row, both fail. A fixture of
the starting set passes. The law wants that control: a checker that cannot
fail does not guard the order.

## Stage 2 — `src/relations/`

One pull request based on stage 1. Tests and green CI. The allowlist file
shrinks by every row whose import now lands in `relations`.

`src/relations/` is the shared vocabulary. It is the seed a later category
layer would be written in. Objects, morphisms, and a functor are the open
question at the end of this note.

Move these declarations out of `src/atlas/types.ts`. Leave a re-export shim
so existing import paths keep working:

| Moves | Why it is in the set |
|---|---|
| `RelationType`, `EvidenceTag`, `ALL_EVIDENCE_TAGS` | The contract and the tag union. The const is the value list of the union; leaving it behind splits them. |
| `FormalFidelity`, `FormalRefKind`, `FormalRef` | `FormalRef.fidelity` is `FormalFidelity` and `FormalRef.kind` is `FormalRefKind`. Moving the interface without either union leaves `relations` importing `atlas`. |
| `RegimeInequality`, `Regime` | `Regime.inequalities` is `RegimeInequality`. |
| `LimitCharacter`, `ApproximationBound` | `ApproximationBound.limitCharacter` is `LimitCharacter`. The bound is named by `RelationContract` and by `uncertainty.ts`. Moving the bound without the union leaves `relations` importing `atlas`. |
| `Counterexample` | `witness` is a string, so `Witness` can stay. |
| `RelationContract` | The Phase 1 overlay union. |
| `Conventions` | The sign and unit record. |

Stay in `src/atlas/types.ts`, and import the moved names from `relations`
(a downward edge): `Witness`, `NormTransport`,
`AtlasBridge`, `AtlasRejection`, `MissingHorizonError`,
`MissingDeltaAtError`, `MissingLipschitzError`. The two public error
classes stay on `src/atlas/public.ts` through the existing re-export.

Move these modules, again with shims at the old paths:

| Module | Imports today | Note |
|---|---|---|
| `conventions.ts` | `Conventions` only | `checkConventions` moves with it. |
| `composition-table.ts` | `RelationType` only | The 8×8 table. It does not import `src/composition/`. |
| The leaf half of `regime.ts` | `buckinghamPi`, `DIMENSIONLESS`, `PiGroup`, `Regime` | `deriveRegimeGroups`, `regimeHolds`, `intersectRegimes`, `collidingRegimeGroups`, `regimeOverlap`, `uncoveredRegions`, and the types those signatures use. |

`admitApproximation` stays in `atlas`. It is generic over `AtlasBridge`.
Moving `regime.ts` as a whole would drag `AtlasBridge` into `relations`,
and `AtlasBridge` is a record, not vocabulary. `src/atlas/public.ts` keeps
exporting `regimeHolds` and `RegimeCheck` from the shim.

`physjs-ref.ts` stays in `atlas` through this stage. Outside `atlas`, only
`bridges/index.ts` imports it. Stage 4 removes that import. Moving the file
here would edit the same module the formal-reference work edits, for an
edge the next stage deletes.

Shims:

- `src/atlas/types.ts`, `conventions.ts`, `composition-table.ts`, and
  `regime.ts` re-export what moved.
- `src/atlas/index.ts` and `src/atlas/public.ts` keep their export lists.
  `public.ts` is not edited. The namespace and the subpath are unchanged.
- A test asserts a moved value (`composeRelation`, `NO_COMPOSITE_CLAIM`,
  `checkConventions`, `deriveRegimeGroups`) is the same binding through the
  shim and through `relations`.
- The existing public-surface tests and `atlas-public-closure` stay green
  with no new public name.

Among the tiers in the picture, `relations` imports `dimensional` only.

After this stage the lower-tier atlas imports that remain are:
`physjsFormalRef` from `bridges/index.ts`, the derive-evidence imports in
`graph-viz.ts`, and the poster types in `poster-source.ts`.

## Stage 3 — lift the map's atlas view

One pull request. Tests and green CI. The allowlist loses the
`graph-viz.ts` derive-evidence row and the three `poster-source.ts` rows.

Move `deriveEdgeEvidence` and the evidence-filter path that calls it out of
`composition/graph-viz.ts`. Move `composition/poster-source.ts` with it.

Destination: `cli`. Both modules exist to feed `upt map`. `poster-source.ts`
imports `VizJunction` from `graph-viz.ts`. Placing it in `atlas` would make
`atlas` depend on the composition view type, and `deriveEdgeEvidence` reads
`BRIDGE_EQUATIONS` and `adjudicateBridgeEntry`, which `atlas` does not
import today. `cli` may import `atlas`, `bridges`, and `composition`. The
fill-colour table stays in `graph-viz.ts`.

The relation filter can stay in `composition` once `RelationType` lives in
`relations`.

Tests: `upt map` still filters by a derived evidence tag and still draws
poster junctions; a search under `src/composition/` finds no import of
`derive-evidence`, `association`, `derivation`, or `statement`.

## Stage 4 — catalog formal references as an atlas overlay

One pull request. Tests and green CI. The allowlist loses the
`bridges/index.ts` → `physjs-ref.ts` row. Stage 2 has already retargeted
the type imports in `bridges/index.ts` at `relations`. This stage removes
the value import of `physjsFormalRef`.

Move every `physjsFormalRef(...)` initializer out of `src/bridges/index.ts`
into one atlas-side map keyed by bridge id. The map is the only place those
references are written. The catalog module does not keep a second copy.
Readers that need the reference for a catalog id call one function. Evidence
tags stay derived; the overlay does not store a tag.

This stage sequences after three pieces of formal-reference work, because
each one edits the meaning or the reader of those call sites:

1. The covers-kind rule for `deriveEvidence`. The library-API dogfood
   (`docs/dogfood/2026-10-01-library-api.md`, the `deriveEvidence` section)
   records that a catalog reference passed into `deriveEvidence` lights
   `formally-proved`, including a property and a cross-check. Teaching the
   predicate the covers kind is that work. It is not an open pull request
   on this repository.
2. Bucket-A catalog links. `docs/planning/Unproven-Bridges-Lean-Feasibility.md`
   marks a set of easy rows Bucket A. `ACTIVE.md` leaves authorizing any row
   of that triage as an owner decision. No pull request on this repository
   links them. If Daniel authorizes them, they are further
   `physjsFormalRef` lines in `bridges/index.ts`, and they land before this
   stage.
3. Pull request 252, "Show catalog formalRefs from `upt atlas be-<n>`",
   which teaches the CLI to read a catalog formal reference. It does not
   edit `bridges/index.ts`. This stage still follows it, because the CLI
   then reads the overlay instead of a field initialized inside the catalog
   module.

The stage's test is that `bridges/index.ts` no longer imports
`physjs-ref.ts`, and that each key which had a call still resolves through
the overlay. A key the overlay does not contain resolves to no reference.
The set of keys is whatever call sites are in the file when the stage
starts, after the three pieces above.

## Stage 5 — optional cleanup

Separate pull requests, each with tests and green CI. None of them is
required for the order to be enforced. Each one deletes the allowlist rows
it actually removes.

| Item | What the change is |
|---|---|
| `numerical/binding-value.ts` | Its four imports of `composition`. Move the leaves it needs (`FORMULA_NAMED`, unit convention, natural-unit overrides, `CONSTANTS`) down to a tier `numerical` may import, or move `binding-value.ts` up to `composition` or `cli`. |
| The six curvature cycles | Move `bianchiResidual`'s evaluator, the part that dynamic-imports `numerical/index.ts`, into `numerical`. Leave the validators in `dimensional/curvature.ts`. The type-only `TensorEngine` imports leave with the evaluator. The dynamic import goes away, and the six cycles go with it. |
| `cli/commands/_atlas-map.ts` and `cli/commands/path.ts` | Split by view, inside `cli`. Both may import `atlas`. This is cohesion. It removes no allowlist row. |
| The nine `sym` imports | Point them at `dimensional/ast-builders.ts`. Same tier either way. |

`src/core/labeled-tensor.ts` is the remaining upward edge from `core`. An
optional fix gives it a local error type, or moves `UPTError` to `core`, and
stops it importing `numerical/tensor-engine.ts` for the three engine types.
That fix is not specified further here.

## Rows the stages above do not remove

These stay on the allowlist until a later note specifies them. They are
upward under the order, and no stage above has a specified move for them:

| Edge | Why it is still there |
|---|---|
| `bridges/descriptor.ts` and `bridges/confrontation-coverage.ts` → `composition` | A join of the catalog and `CATALOG_GRAPH`. `composition` already imports `bridges`, so the join could live in `composition`. That move is not one of the stages. |
| `canonical/linkage.ts` and `canonical/normal-form.ts` → `composition` | They need `evalExpr` and the symbolic-constant table. Those two leaves could move down, or the linkage could move up. `composition` already imports `normal-form.ts`, so moving `normal-form.ts` up would cycle. |

## Out of scope

Splitting `atlas` into its own npm package. The subpath stays an export of
`universal-physics-tensor`. S6.7's namespace stays the public surface.

Also out of scope: editing `src/atlas/public.ts`, promoting Tier 2,
changing the composition table, and any release.

## Open questions for Daniel

1. **The thin tensor core.** `UniversalTensor` is defined in
   `src/core/tensor.ts`. Four modules import it: the package barrel, which
   re-exports it; `src/canonical/seed-l-layer.ts`;
   `src/composition/bridge-prediction.ts`; and
   `src/bridges/catalog-adapter.ts`, as a type. The numeric tensor is
   `LabeledTensor`, which is the `core` → `numerical` edge above. Whether
   the catalog facade stays is a product decision. No stage deletes it.

2. **A category and functor layer.** `src/relations/` is the vocabulary
   that layer would be written in: relation types, the composition table,
   regimes, bounds. Building the layer — objects, morphisms, a functor
   between models — is not a stage of this refactor. Say whether it should
   be designed, and whether `relations` is the module it should grow in.

3. **The allowlist rows no stage removes.** Whether the catalog/graph join
   and the canonical use of `evalExpr` and `CONSTANTS` are in scope, or
   whether they stay allowlisted.
