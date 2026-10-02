# Bridge discovery pipeline

This note specifies how UPT discovers candidate bridge equations by chaining
Lean-proved facts, filtering the chain with dimensional analysis, and emitting
each survivor as a PhysJS proof target. It changes no code, no public export,
and no cell of the composition table. Approval is recorded outside this file.
Landing the note does not authorize a step. A step becomes work when Daniel
accepts this note and an `ACTIVE.md` task names that step. Publishing the
package is the owner's job and is not part of any step.

The premise is the one the tensor was built for. The core is the dimension
vector and the scalar formula it constrains. A category of regimes and
morphisms sits above that core and says which chains are allowed to speak.
A candidate is a hypothesis until PhysJS proves it.

This note builds on the notes named below. It does not replace them, and it
does not restate the gap analysis. Where a missing link lives — an empty
regime cell, an orphan connector, a frontier gap, a proved fact with no
symbolic form — is `docs/planning/Bridge-Gap-Inference.md`.

## What this keeps

Evidence tags stay derived. `deriveEvidence` is the only way a tag appears,
and this pipeline never calls it on a candidate. A candidate record has no
evidence field.

The composition table stays the under-approximation in
`src/relations/composition-table.ts`. A silent cell stays silent. Widening a
cell is a reviewed act of its own (`docs/planning/Atlas-Phase-1-Design.md`
§2.2, `docs/planning/ADR-transported-norm-composition.md`).

The layer order stays the one in `docs/planning/Layering-Refactor-Design.md`.
`tools/layer-order` may only shrink. A step that removes an upward edge
deletes that allowlist row in the same pull request. A step that needs a new
upward edge is the wrong shape and stops.

The public atlas surface stays the one namespace. No step edits
`src/atlas/public.ts` or adds a name to the package barrel.

Product A and Product B stay what they are.
`docs/planning/Scientific-Bridge-Discovery-v1.md` freezes quantity
identification in `src/composition/discovery.ts` and puts expression search
in `src/composition/probe/`. This pipeline is a third question — what
equation a chain of proved statements yields — and it does not enter either
module.

## Inventory

Each stage names the module that already does the work. A stage with no
module says so, and the steps below fill only that hole.

| Stage | What it does | Where it already lives |
|---|---|---|
| Proved seeds | A fact enters the chain when its formal reference has kind `bridge` | `formalRefKind` in `src/atlas/physjs-ref.ts`. An `ab-` key is a bridge. A catalog key is a bridge when the theorem states the catalogued equation. Every other catalog kind is the covers word. `catalogFormalRef` in `src/atlas/catalog-formal-ref.ts` is the only catalog copy. |
| Canon formulas | A canonical equation is a seed on the same rule | The key shape is `docs/planning/Catalog-FormalRef-Design-Note.md`: `bridgeId` may be `CanonicalEquation.id`. `src/canonical/` holds the equation. It becomes a seed when that overlay carries a kind-`bridge` reference for the id. Textbook encoding alone is not a seed. |
| Relation composition | What claim a chain of relation types may assert | `composeRelation` in `src/relations/composition-table.ts`. `src/atlas/composition-table.ts` re-exports the same bindings for the public namespace. One table. |
| Equation composition | The substituted scalar formula | `composeSymbolic` and `substitute` (`src/composition/compose-symbolic.ts`, `src/composition/expr-subst.ts`). The Observable contract is `docs/planning/v0.12.0-Symbolic-Composition-Design.md`, the scalar-substitution option beside Part IX §4. |
| Numeric cascade | A chained evaluator, with no formula | `composeEdges` in `src/composition/compose.ts`. A proof target needs a formula, so a pair that only this function accepts is not a target. |
| Pair enumeration | Every accepted pair, split into registered and novel; the enumerator proposes and never promotes | `src/composition/enumerate.ts`. |
| Route warrant | Whether a chain of atlas bridges supports a bound | `findPath`, `findAtlasPath`, and `boundPath` in `src/atlas/path-bound.ts`. `upt path` is `src/cli/commands/path.ts` with `src/cli/commands/_atlas-route.ts`. A path existing is not a formula. Tier 10 (`docs/design/tier-10-cross-family-path.md`) is the cross-family rule for that warrant. |
| Dimension junction | The two sides of a pipe have the same dimension | `equals` in `src/dimensional/algebra.ts`, called from `compose.ts`. The comment there calls it a dimension functor. It is integer-vector equality on the seven SI bases. |
| Buckingham filter | The form of a homogeneous relation, up to a dimensionless constant, or a function of the remaining π-groups | `buckinghamPi` and `dimensionallyDetermines` in `src/dimensional/buckingham.ts`. The result types carry form only. L0 fields are derived from this engine in `src/canonical/dimensional-fields.ts`. `upt derive` is the same engine on a caller's equation. |
| Lean dimension statements | The same boundary, proved | `PhysJS.Dimensional` (`PhysJS/Dimensional.lean`): `Dim`, `Homogeneous`, `monomial_form`, `ratio_shape`, `product_shape`, `ratio_power_invariant`. `monomial_form` takes the exponent vector as a hypothesis and does not choose it. The value `f(1,…,1)` is not fixed. Milestone 3 of `docs/design/roadmap-lean-proven-bridges.md` is this statement for a catalog or canonical id: the covers line is the exponent tuple, a decoy row is the negative control, and the key rule is the catalog formal-reference note. |
| Match an existing equation | Same relation up to a dimensionless factor | `normalForm` in `src/canonical/normal-form.ts`. The F4 guard in `src/canonical/linkage.ts`: a structural match is a restatement when `restatesBridge` names that bridge, and a recovery when the registry did not pre-declare it. |
| Rankers that answer a different question | Left in place | `rankDiscoveries` (quantity identification), `bridgePriority` / `upt priority` (structural decidability), `src/composition/bridge-prediction.ts` (empty regime cells on `UniversalTensor`), `src/atlas/link-prediction.ts` (a hypothesis about the model graph), probe scoring, Tier 11 retrieval (`docs/design/tier-11-hybrid-retrieval.md`). The gap note owns these. |
| Proof target | A Lean statement plus the theorems it composes | No emitter exists. The manifest shape it must fit is `physjs-bridge-manifest/v1`, copied by `physjsFormalRef`. The write path, after a proof exists, is the formal-reference procedure in `WORKFLOWS.md`. |
| Category and functor | Objects, morphisms, composition, a dimension-preserving functor | The vocabulary is `src/relations/`. The prose is Part IX §3 and Proposal 6's interpretation (b) in `docs/planning/v0.7-Proposal-6-Design.md`. The module that records a morphism and delegates composition is not in the tree. Layering's open question 2 asked whether `relations` is where it grows. This note answers yes. |

`src/composition/proposed-bridges.ts` is the algebraic consequence of an
unadjudicated quantity identification. Its status literal is outside
`BridgeEquationStatus`, so a proposal cannot sit where a catalog entry sits.
The chain candidate below follows that separation. It is not that module.

`CANONICAL_GRAPH` (`src/composition/canonical-graph.ts`) projects canonical
equations into the edge vocabulary. An edge there is a seed only through a
kind-`bridge` reference, as the canon-formula row says.

## Two graphs stay two graphs

Atlas bridges (`ab-`) are routes between models. `boundPath` says what
error a route warrants, and `no-composite-claim` carries no number.

Catalog and canonical equations are scalar formulas on `BridgeEdge`.
`composeSymbolic` substitutes one formula into another. `expr-subst.ts`
refuses a tensor arm. A field equation is not a chain step.

A kind-`bridge` atlas fact becomes an equation-chain premise when a
`BridgeEdge` with a `symbolic` form is keyed to it. With no symbolic form
it stays a route fact. The run lists it as not substitutable.
`docs/planning/Bridge-Gap-Inference.md` owns what that list means.

## The pipeline

The orchestrator lives in `src/atlas/`, because the seed decision reads
`physjs-ref.ts` and `composition/` must not import `atlas/`. `atlas/` may
import `composition/`. That is the layer order.

1. **Seeds.** Kind `bridge` only. A `derivation-step`, `reduction`, `limit`,
   `property`, or `cross-check` is a fact about a part of an entry. It is
   not a premise of a new equation.
2. **Chain.** Pairwise `composeSymbolic` on seed edges, folded while the
   composition keeps a symbolic form. `composeMorphisms` (step 4) supplies
   the relation the chain is allowed to assert. `no-composite-claim` drops
   the chain. The refusal is the result, as `upt path` already treats it.
3. **Filter.** `dimensionallyDetermines` on the composed expression's
   dimensioned variables. A failure of homogeneity drops the chain. A
   survivor records which `PhysJS.Dimensional` theorem states its shape,
   and records the hypothesis that theorem leaves open.
4. **Match.** One structural classifier, the F4 rule: confirmation of an
   existing catalog id, restatement of a pre-declared canonical equation,
   or a provisional id.
5. **Order.** The total order in step 8. No new score.
6. **Emit.** A statement stub and the ordered theorem names. The stub is
   not a manifest entry and not a `formalRef`.

A chain of proved steps is still a hypothesis. `deriveCompositeEvidence`
intersects tags of existing records. The pipeline does not use that
intersection as the status of the new statement. The new statement has a
tag when its own reviewed reference exists, and not before.

## Decisions

Daniel decided (a) and (b). The steps implement them. They are not open
questions.

**(a) A new chain stays provisional until Lean proves it.** A chain whose
normal form matches an existing catalog id confirms that entry. The run
reports the id. It writes nothing: no catalog row, no overlay entry, no
tag. A chain the registry pre-declared with `restatesBridge` is a
restatement, the F4 guard's existing word, and it is not a new equation.
A new bridge found by chaining receives a provisional id, `chain-`
followed by the ordered edge ids. That id is not a `be-` id, not an
`ab-` id, and not a `CE-` id. `parseBridgeId` rejects it. The provisional
id enters `BRIDGE_EQUATIONS` and the formal-reference overlay only once
Lean has proved the statement and that proof has been vendored by the
`WORKFLOWS.md` procedure. The catalog id is assigned then.

**(b) A units-only result is partial.** Dimensional analysis fixes the
form and leaves a dimensionless constant. That result is a
`derivation-step`. The covers line begins with `derivation-step:` and
names the hypothesis: the constant is unfixed. A unique monomial names
`PhysJS.Dimensional.monomial_form` and its unfixed `f(1,…,1)`. The
exponent vector, and the assumption that a unit change can reach every
positive tuple, are hypotheses of that theorem and are named on the same
line. One remaining ratio names `ratio_shape`. A product of two
independent magnitudes names `product_shape`. An unfixed real power names
`ratio_power_invariant`. The kind stays `derivation-step` until Lean pins
the constant. It never counts as `formally-proved`. Milestone 3's decoy,
a free π-group, remains the negative control for a uniqueness claim.

**(c) A bridge is a PhysJS proof.** Lean 4, in PhysJS, axioms
`propext`, `Classical.choice`, and `Quot.sound`, `leanProof` complete, no
`sorry`. That is the axiom list `physjs-ref.ts` already requires and the
formal gate already checks. This pipeline does not widen it. UPT does not
run Lean. The stub has no proof body.

## The category layer

Tensors and dimensional analysis stay the core.

The tensor this pipeline calculates with is the dimension matrix: seven
SI bases, rational exponents, null space in `buckingham.ts`, the same
`Dim` as `PhysJS.Dimensional`. `UniversalTensor`
(`src/core/tensor.ts`, projected by `bridge-prediction.ts`) is the
regime-plane instrument. It says where a cell is empty. It does not store
a discovered equation. `LabeledTensor` stays where the layering note left
it.

Above that core, `src/relations/category.ts` (step 4) records:

- an object, an id together with the `Regime` already defined in
  `src/relations/types.ts`;
- a morphism, a `RelationType` from one object to another;
- composition, a call to `composeRelation`, returning
  `no-composite-claim` unchanged.

The functor's concrete component is the junction check that already calls
`equals`. Step 3 gives that check a name in `compose.ts`. The relations
module does not import `BridgeEdge` and does not reimplement equality.
`relations/` may import `dimensional/`. It may not import `composition/`
or `atlas/`.

Identity morphisms and 2-cells stay out. Part IX §3 leaves identity
unspecified, and a non-commuting pair is two chains.

## Sentences this note narrows

The older notes stay the authority for their own subjects. This note
narrows only the discovery reading.

- Layering's open question 2. The category layer is designed here, and
  `src/relations/` is the module. Building it is step 4 of this note, not
  a stage of the layering refactor.
- Layering's leftover catalog/graph join. The three upward edges from
  `bridges/descriptor.ts` and `bridges/confrontation-coverage.ts` into
  `composition/` are step 2 here, because the pipeline reads
  `CATALOG_GRAPH` from its owner. The `linkage.ts` → `expr-eval.ts` row
  and the `labeled-tensor.ts` rows stay allowlisted. This note does not
  specify a new home for them.
- Part IX §4 and Proposal 6. Symbolic substitution is the equation chain,
  through the module the symbolic-composition note added. The numeric
  cascade stays the evaluator. The shared-`Observable`-or-adapter choice
  is not reopened.
- `docs/design/roadmap-lean-proven-bridges.md` §5. Composition stays the
  existing table. This note does not widen it. Milestone 3 stays the
  Buckingham monomials. A provisional chain is not a milestone 3 row.
- The catalog formal-reference note. One id, one reference. A second
  statement is a nested manifest object. A confirmation under decision (a) does
  not become that second reference.
- `docs/planning/Bridge-Inference-Epistemics-Note.md`. Dimensional matching
  filters. The generator is the chain of proved statements.
- `docs/planning/Scientific-Bridge-Discovery-v1.md`. No new search package,
  and no edit that turns `discovery.ts` into an equation generator.
- `docs/planning/Unproven-Bridges-Lean-Feasibility.md`. That triage does
  not move milestone 3. Neither does this note.
- Tier 8 (`docs/design/tier-8-probe-searchable-gaps.md`) and Tier 11
  (`docs/design/tier-11-hybrid-retrieval.md`). A chain candidate is not a
  probe problem. An embedding may propose a canonical equation to compare.
  The comparison that confirms is `normalForm`.

Which reading of composition phases B through D is in force is an owner
decision recorded in `ACTIVE.md`. The operators those phases named are
`composeEdges`, `composeSymbolic`, and `composeRelation`. The steps call
those functions. They do not pick a reading, and they do not re-run the
calibration set.

Whether a name junction is a compatible regime is
`docs/planning/Regime-Aware-Join-Gate-Design.md`. This note does not
state that rule.

## Refactor steps

Easiest first. Each step is one pull request, with tests, and green CI.
The allowlist shrinks only in step 2. Every other step is forbidden to add
an upward edge or a cycle; the existing layer-order tests already fail
when the allowlist grows or a row is stale.

A step proves its new check red on the real tree before the check is
satisfied. The control is named on the step.

### 1. Seed predicate

No move. In `src/atlas/physjs-ref.ts`, next to `formalRefKind`, a function
returns the manifest keys whose derived kind is `bridge`. A canonical id
is included by the same kind function when the overlay has a reference for
it. One function, so a second list cannot drift.

Tests. A covers word of `derivation-step`, `reduction`, `limit`,
`property`, or `cross-check` is absent. An `ab-` key is present. A catalog
key whose theorem states the catalogued equation is present. The return
value is not written onto a bridge and is not passed to `deriveEvidence`.
Control: the same fixture key, with its kind flipped to `derivation-step`,
drops out. A checker that accepts both is failing.

`src/atlas/public.ts` is not edited.

### 2. The catalog/graph join leaves `bridges/`

`BRIDGE_DESCRIPTORS`, `getBridge`, and the `CATALOG_GRAPH` scan inside
`auditCoverage` move into `src/composition/`, beside `catalog-graph.ts`.
`composition/` already imports `bridges/` and owns the graph.
`DATA_CONFRONTED_IDS` stays in `src/bridges/confrontation-coverage.ts`. It
is a projection of `CONFRONTATIONS`, and `bridge-analysis.ts` already
imports it in the allowed direction.

`src/cli-api.ts` retargets `auditCoverage` at the composition module.
`cli` may import `composition`. No shim in `bridges/` re-imports
`composition/`: a shim would keep the upward edge.

The same pull request deletes these allowlist rows when they are still
present:

- `src/bridges/confrontation-coverage.ts` → `src/composition/catalog-graph.ts`
- `src/bridges/descriptor.ts` → `src/composition/catalog-graph.ts`
- `src/bridges/descriptor.ts` → `src/composition/edge.ts`

If a row is already gone when the step opens, the step does not invent a
replacement, and it does not edit the layering note's starting table.
That table stays the reviewed starting set.

Tests. A search under `src/bridges/` finds no import of `composition/`.
The descriptor-consistency check still fails when an id is in one registry
and absent from another. The layer-order fixture with one extra upward
edge still fails, and a stale copy of a deleted row fails.

The other allowlist rows stay. This step does not move `evalExpr` and does
not move `LabeledTensor`.

### 3. Name the junction check

In `src/composition/compose.ts`, the existing `equals` check on the pipe
becomes a named function in that file. Behavior is unchanged.
`CompositionDimensionError` stays the failure.

Tests. A matching pair returns true. A mismatched pair returns false, and
`composeEdges` still throws. Control: the true and false results swapped
fail the test.

### 4. Morphisms, delegating

Add `src/relations/category.ts`. It imports `./types.js` and
`./composition-table.js` only. A morphism is an id pair plus a
`RelationType`. `composeMorphisms` returns `composeRelation`'s result.
The module contains no second copy of `COMPOSITION_TABLE`.

Tests. For every pair of relation types, `composeMorphisms` and
`composeRelation` return the same value, including `no-composite-claim`.
Control: a one-line wrapper that returns a relation on a silent cell
fails. The existing silent-cell pin on the table remains the pin. This
test compares the two functions and does not restate that pin.

No identity. No 2-cell. The allowlist is unchanged. `relations/` still
imports `dimensional/` only where `regime.ts` already does.

### 5. Seed-filtered symbolic enumeration

Extend the enumerator in `src/composition/enumerate.ts` with a
caller-supplied set of edge ids. The module does not import `atlas/`.
A proof target is a pair `composeSymbolic` accepts, so the result carries
an `ExprNode`. A pair that only `composeEdges` accepts is absent from
proof targets and listed as not substitutable. That list is unclassified.
The gap note owns its reading.

The default call, with no seed set, keeps the pairs the existing
enumeration tests pin.

Tests. An edge outside the seed never appears. A seed pair with symbolic
forms appears with an expression. A seed pair without `symbolic` is on
the not-substitutable list and absent from proof targets. Control:
deleting the seed check lets a non-seed edge through, and the new test
fails.

### 6. Buckingham filter

A function in `src/composition/`, calling `dimensionallyDetermines` and
nothing that reimplements the null space. It does not call
`src/composition/probe/generator.ts`. The record uses the existing result
type, which has no constant field, and names the `PhysJS.Dimensional`
theorem for the shape decision (b) names.

A chain that is not homogeneous is absent.

Tests. A determined monomial records the exponent tuple, names
`monomial_form`, and has no numeric constant. A free π-group, milestone
3's decoy, is not a unique monomial. Control: a record that stores a
filled-in constant fails.

### 7. One structural classifier

The structural half of `classifyLinkage` — same dimension, `normalForm`,
and the `restatesBridge` guard — moves into a module under
`src/canonical/` that does not import `composition/expr-eval.ts`.
`linkage.ts` calls that function and then runs its numerical recovery, so
the allowlist row from `linkage.ts` to `expr-eval.ts` stays.
`composition/` calls the structural function. That edge points downward.

Decision (a) uses this function. Numerical agreement is not a confirmation.

Tests. A normal-form match to an existing catalog right-hand side
confirms that id. A match the registry pre-declared with `restatesBridge`
is a restatement. Any other chain receives a `chain-` id, and
`parseBridgeId` rejects it. `linkage.ts` and the pipeline call the same
function. Control: a pre-declared restatement classified as a new chain
fails.

Nothing in this step deletes the `expr-eval` allowlist row.

### 8. Order

One function beside the candidate record. A total order, and no numeric
score:

1. Confirmation of an existing catalog id.
2. Restatement.
3. A unique monomial.
4. A named `PhysJS.Dimensional` shape that leaves a function or an
   exponent unfixed.
5. A shorter chain before a longer one.
6. The ordered edge ids, lexicographically.

The function does not call `rankDiscoveries`, `bridgePriority`,
`link-prediction`, probe scoring, or an embedder.

Tests. A fixture of one candidate from each of the first four classes
sorts in the order above. Control: two adjacent classes swapped fail.

### 9. Stub emitter

`src/atlas/proof-target.ts` takes a candidate and the theorem name of each
seed step, read through the existing manifest copy, and returns text: the
Lean statement skeleton and the theorem chain in order. When decision (b)
applies, the covers line begins with `derivation-step:` and names the
hypothesis. The text includes the import `PhysJS.Dimensional` when the
filter named one of its theorems.

The function does not call `physjsFormalRef`, does not write
`PHYSJS_ENTRIES`, `catalog-formal-ref.ts`, `formal/physjs/manifest.json`,
or `BRIDGE_EQUATIONS`, and does not call `deriveEvidence`. The text is not
a manifest entry: it has no `leanProof: complete`. The proof body is
absent, so the text contains no `sorry` that a later copy could vendor as
a proof.

Tests. The manifest checker reports a problem on the stub. The covers word
on a dimensional survivor is `derivation-step`. Every seed theorem appears,
in order. Control: an emitter path that marks `leanProof` complete and
attaches the three axioms fails.

### 10. Orchestrator

One function in `src/atlas/` runs steps 1 and 5 through 9 in that order.
It imports `composition/` and `canonical/` downward. No directory
`src/discovery/` is added: an unknown top-level directory is outside the
tier table. `discovery.ts` and `src/composition/probe/` are not edited.

Tests. A `derivation-step` edge is not a premise. On a fixture pair of
kind-`bridge` symbolic edges, the result is either a confirmation record
or a stub. The catalog array is the same array after the call as before
it. Control: a write into `BRIDGE_EQUATIONS` fails that identity check.

No `upt` command is added in this step.

## Out of scope

Splitting `cli/commands/_atlas-map.ts` and `cli/commands/path.ts`. The
layering note already calls that cohesion inside `cli`, and it removes no
allowlist row.

Deleting `src/atlas/composition-table.ts`. Those exports are the public
bindings. Callers in this pipeline import `src/relations/`.

Editing `discovery.ts`, the probe, the composition table, `public.ts`, or
the package barrel. Promoting Tier 2. A release.

Extending `substitute` to tensor arms. A field equation stays on the
not-substitutable list.

Authoring or rating a benchmark item. The rediscovery program in the
lean-proven-bridges note stays that program. The independence rule is
`AGENTS.md`.

Running Lean, or writing a proof into PhysJS from this repository.

## Open questions

Decisions (a) and (b) are closed. The questions below are the ones this
note still leaves open.

1. **Canon formulas with no kind-`bridge` reference.** They are not seeds.
   Treating the L-layer as proved would break (c).
2. **Identity and 2-cells.** Part IX leaves identity unspecified. This note
   omits both. A non-commuting pair stays two chains.
3. **Where the stub goes.** Step 9 returns text. UPT does not write the
   vendored manifest and does not run Lean. Writing a file into a PhysJS
   checkout is a later decision.
4. **A command.** These steps add no `upt` command. A command is a `cli`
   change after the orchestrator is internal and tested.
5. **Phases B through D.** The owner decision in `ACTIVE.md` stands. These
   steps do not implement either reading.
6. **A later Lean statement about an id that was only confirmed.**
   Decision (a) writes nothing: the match confirms the entry. Whether a
   subsequent proof becomes a nested manifest object is the
   multi-statement question the catalog formal-reference note already
   leaves open.
7. **Seven bases.** UPT's dimension is the seven named SI bases.
   `PhysJS.Dimensional.Dim` is `Fin n → ℚ`. The stub fixes `n = 7` in the
   order `src/dimensional/types.ts` declares. A different `n` is a change
   to the covers line and to the filter.
8. **Step 4 declined.** If the category module is declined, steps 5 and 10
   call `composeRelation` directly. The junction check in step 3 still
   stands. The table is still the one table.
