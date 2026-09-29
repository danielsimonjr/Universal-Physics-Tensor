# Tier 10 — cross-family `upt path`

Design for composing a route whose models are not all filed in one atlas family.
The release slot is recorded in `todo.md`. This note is the design. Implementation
of any milestone below follows approval of this note. Approval and what has
landed are recorded outside this file.

The composition table is not widened here. A silent cell stays silent. Widening
one is a reviewed act of its own (`docs/planning/Atlas-Phase-1-Design.md` §2.2,
`docs/planning/ADR-transported-norm-composition.md`).

## 1. Problem

`findPath` searches the bridges of one family and throws when an endpoint is
not a model of that family. `findAtlasPath` searches the union of every
registered family's bridges, under the same traversal rules, and
`boundPath` then runs the same four gates. The comment on `findAtlasPath`
states the consequence: crossing a family adds no composition rule.

`upt path` already uses that search. `selectRoute` tries `findPath` when both
endpoints belong to one family, and otherwise calls `findAtlasPath`. When the
endpoint families differ, the text line says the composition rules are the
same as within one family.

That sentence is the defect. A regime is stated in the groups of its own
family. `intersectRegimes` throws when the two families differ, because a
shared group name can be two different π-groups. A norm is a string in one
bridge's vocabulary. A horizon is a statement about one model's clock. Treating
a cross-family chain as an intra-family chain attaches a composed number to
quantities that were never declared to be the same quantity.

C3, as recorded for the roadmap, was that `path` could not cross families. The
search has since grown. The missing piece is the composition rule, not the
graph walk.

## 2. What `upt path` does

Two answers stay apart, as `src/atlas/path-bound.ts` keeps them apart.

- `findPath` / `findAtlasPath` answer whether a chain of single-premise
  bridges exists. A chain is a route. It is not a warrant.
- `boundPath` answers what the chain supports. The result is a discriminated
  union. The `no-claim` member has no bound field. The command prints
  `no composite claim` and does not invent a number.

`selectRoute` (`src/cli/commands/_atlas-route.ts`):

1. Both endpoints are models, and they share a family: `findPath` in that
   family. If that returns a chain, it is the route.
2. Otherwise, when both endpoints are models of some family: `findAtlasPath`.
3. An unknown endpoint is a `CliError` (exit 1). `null` means the models exist
   and no chain connects them. Those two outcomes stay distinct.

Traversal (`directedEdges`): a single-premise bridge is a forward edge. An
`exact-equivalence` is also a backward edge. A bridge with two or more
premises is omitted from the graph.

`boundPath` gates, in order:

1. **Relation.** `composeRelation` along the chain. The first silent cell
   returns `no-claim` / `no-composite-claim`.
2. **Uniformity.** A bound whose `uniformity` is `null` or empty returns
   `uniformity-unanalysed`. An edge with no bound does not fail this gate.
3. **Lipschitz.** `composeBoundPath` folds `(K, δ)` pairs. An edge that is
   neither exact nor bounded contributes `null`. A `null` anywhere but last
   throws `MissingLipschitzError`. The command catches that and reports
   `missing-lipschitz`. A `null` in last place sets `terminal: true`: the
   bound covers the prefix.
4. **Norm.** Every stated norm must be the running norm. An exact bridge
   contributes `(K, 0)` only when it declares a `NormTransport` from that
   norm, for the direction the route crosses it, with a uniform time map.
   Otherwise the refusal is `norm-not-stated` or `norm-mismatch`.

The error algebra (`src/atlas/error-algebra.ts`), with the later map as the
outer one:

```
(K_o, δ_o) ∘ (K_i, δ_i) = (K_o · K_i,  K_o · δ_i + δ_o)
```

`IDENTITY_BOUND` is `(1, 0)`. The operation is associative. It is not
commutative. `propagateUncertainty` does not read `uniformity` and does not
fold `δ` into `σ`.

Horizons are evaluated only when `--at` supplies `t`. An unevaluated horizon
is reported as unevaluated. A regime is checked at the `--at` point.
`regimeHolds` is tri-state: a checked failure is `false`, a missing or
non-finite group is `unknown`, and every inequality checked and satisfied is
`true`. A violation outranks an absence. An unchecked regime is unknown, and
the command does not print it as a pass.

`--tolerance=EPS` is ADEQUATE only when every regime holds, every horizon
holds at the given `t`, and the closed-form point error is at most EPS.
INADEQUATE exits 3. UNDETERMINED, where the point does not settle it, exits 0.
`--tolerance=<observable>:EPS` uses a translation the first bridge declares,
carried by each later bridge's declared carriage.

`--sweep` exits 0. Each row is its own verdict. A row outside a regime or past
a horizon carries no error.

## 3. Multi-premise bridges

A path composes one premise at a time. `multiPremiseBridges` walks
`ATLAS_FAMILIES` and names a bridge with two or more premises when both
command endpoints appear among its premises and its conclusion. The line is

```
multi-premise bridge: <id>: <premise> + <premise> → <conclusion>
```

plus the sentence that a path composes one premise at a time. A missing chain
still exits 0. The hyperedge is not inserted into the chain and is not given
a bound by this command.

`ab-stokes-einstein` is that shape: premises `model-langevin` and
`model-stokes-drag`, conclusion `model-fick`, relation `derivation`,
transformation `D = k_B T / (6 π η a)`. `upt path model-langevin model-fick`
is the single-premise coarse-graining `ab-langevin-diffusion`
(`D = k_B T / γ`), not the Stokes–Einstein substitution. The hyperedge is
named beside that chain when the endpoints match the rule above. It is not
composed with it.

This design keeps the join out of the chain. Section 11 asks whether that
should ever change.

## 4. Data model

Three labels, kept separate:

| Label | What it is |
|---|---|
| Filing family | The `AtlasFamily` whose `bridges` array holds the record. `ab-kg-schrodinger` is filed under waves. |
| Model family | The family of a model id. `model-schrodinger-free` is a diffusion model. `model-klein-gordon` is a wave model. |
| Endpoint families | The model families of the two ids the user typed. |

A **cross-family edge** is a single-premise bridge whose premise model family
and conclusion model family differ. A **cross-family route** is a chain in
which the set of model families of the visited models has more than one
member. Endpoint families are not enough: a chain can leave a family and
return, and `fromFamily === toFamily` would hide it.

`ATLAS_FAMILIES` stays the registry (`oscillators`, `diffusion`, `waves`, in
registration order). A family remains a filing label. Models keep one family.
Bridges keep one filing family. This design adds no new collection and no
edge type. The cross-family fact is derived from model families already on
the records.

`path[].family` in the JSON envelope is the filing family
(`bridgeFamily` looks up which family's bridge list contains the id). The
design adds, on each step, the model families of the end the route enters
and the end it leaves. Those two can differ from the filing family and from
each other.

`intersectRegimes` stays a same-family operation. It throws when the families
differ, and that throw remains correct. A cross-family route does not build
one `Regime` value.

## 5. Bound and uncertainty composition

The arithmetic does not change. Each step contributes what gate 3 and gate 4
already contribute: a bridge bound `(K, δ)`, a declared transport `(K, 0)`,
`IDENTITY_BOUND` only where gate 4 already allows it, or `null` for an
unknown Lipschitz constant. Family membership is not a factor in the product.

What changes is the condition under which two norm strings are the same norm.

**Same family.** String equality of `ApproximationBound.norm`, as gate 4
does, is the match. A `NormTransport` is still required for an exact
bridge, which states no norm of its own.

**Different model families.** String equality is not a match. The running
norm composes with the next stated norm only through a `NormTransport` whose
`from` / `to` are those strings and whose `fromModel` / `toModel` are the
models the route actually crosses. The transport's witness stays the
evidence. A missing transport is a no-claim. The proposed reason is
`cross-family-unmapped`, with a detail that names the bridge, the two model
families, and the norm string that had no transport. It is the same shape as
`norm-not-stated`: a refusal, no number.

A one-step route has nothing to compose with. `ab-kg-schrodinger` is one
approximation, filed under waves, ending at a diffusion model, with its own
bound in the kinetic-frequency norm. Gate 5 does not fire. The command
reports both model families and the bridge's own bound, subject to that
bridge's own regime and horizon.

`propagateUncertainty` stays a function of one catalog edge: finite-difference
partials, `σ² = Σ (∂f/∂xᵢ)² σᵢ²`, optional `bound.delta` only when the caller
passes it. A path bound is a Lipschitz-plus-offset claim in a named norm. A
statistical sigma is a different object. This command does not print a sigma
and does not add `δ` and `σ`. Section 11 records the question of a later flag.

## 6. How regime validity composes

Each step is checked with `regimeHolds` against its own regime, using only
`--at` keys that name a group that regime defines. The composite is the
conjunction of those tri-states:

| Per-step results | Composite |
|---|---|
| Any step `false` | `false`. The violated inequalities are listed with their bridge id. |
| No `false`, any step `unknown` | `unknown`. The unchecked groups are listed with their bridge id. |
| Every step `true` | `true`. |

A regime with no inequalities is `true` for that step only (nothing to check,
nothing unchecked). It does not make a later step's unknown into a pass.

A group name defined by two steps whose `PiGroup`s differ is unchecked on
both steps, and the text names the collision. The number is not applied to
either definition. This is the case `intersectRegimes` refuses to merge, and
the command does not merge it.

A horizon is evaluated in the time of the model where it was stated. A
declared `NormTransport.timeMap` may restate it, as `horizonOnRoute` does for
an exact bridge that declares one. A family change does not copy a horizon
onto the next clock. An unrestated horizon on a later model is unevaluated.
Unevaluated is not a pass. With `t` supplied, a violated horizon is a failed
check. With `t` absent, horizons stay unevaluated and the exit stays 0 unless
some other check failed.

Side-condition prose stays prose. It is printed, not evaluated.

## 7. CLI and JSON

No new required flag. The invocations that exist keep their meanings.

Text, when the route is cross-family:

```
crosses families: <model-family> → <model-family> → …
```

one entry per visited model family, in route order, duplicates removed only
when they are adjacent. The sentence that the composition rules are the same
as within one family is removed. In its place the line names the rule that
applied: the bridge's own bound (one step), a declared transport, or
`no composite claim` with the reason.

JSON envelope, additive fields on the existing `result`:

```json
{
  "crossFamily": true,
  "modelFamilies": ["waves", "diffusion"],
  "path": [
    {
      "id": "ab-kg-schrodinger",
      "relation": "approximation",
      "from": "model-klein-gordon",
      "to": "model-schrodinger-free",
      "family": "waves",
      "fromModelFamily": "waves",
      "toModelFamily": "diffusion"
    }
  ]
}
```

`family` remains the filing family. `families.from` / `families.to` remain
the endpoint model families. `crossFamily` is true when `modelFamilies` has
more than one entry. A no-claim still has no `bound` key. `multiPremise`
stays the list of joins, present only when one matched.

`--json` on a missing chain stays exit 0 with `path: null`, and includes
`multiPremise` when a join matches.

Help text gains one sentence: a route may cross families; a bound crosses
only through the gates above; a multi-premise bridge is named and is not a
step. The examples already in the help stay.

## 8. Exit codes

| Situation | Exit |
|---|---|
| Usage: bad flags, `--compare` without `--sweep`, `--tolerance` with `--compare` | 2 |
| Unknown model id, malformed `--at` / `--sweep` / `--tolerance` | 1 |
| No chain, empty path (same model), `no-claim` of any reason including `cross-family-unmapped`, sweep | 0 |
| Regime violated, or horizon violated at a supplied `t`, or tolerance INADEQUATE | 3 |
| Regime `unknown`, horizon unevaluated because `t` was absent, tolerance UNDETERMINED | 0 |

A no-claim is an answer. Exit 3 is a check that ran and failed, which
requires a claim that was in force at the point. An unmapped cross-family
norm never becomes exit 3.

## 9. Test plan

Each row is a chain that already exists. The assertion is the claim or the
refusal, and a control that the opposite reading fails.

**Pendulum → LC, intra-family calibration.**
`model-pendulum` → `model-spring` → `model-lc` via `ab-pendulum-linear` then
`ab-spring-lc`. Both models are oscillators. The composed relation is
`approximation`. The bound is the pendulum bound transported by the declared
norm transport on `ab-spring-lc` (relative period error, spring → lc, factor
from that declaration). `crossFamily` is false. The composed `(K, δ)` and the
norm string are pinned to the values `boundPath` already returns for that
route. A control deletes the transport declaration in a fixture
copy and expects `norm-not-stated`, so the pin is not a matcher that accepts
any number.

**Langevin, Stokes–Einstein, Fick.**
`upt path model-langevin model-fick` is `ab-langevin-diffusion` only
(coarse-graining, diffusion family). `ab-stokes-einstein` appears as a
multi-premise line because both endpoints occur among its premises and its
conclusion. The chain's relation and bound are the coarse-graining's, and
the hyperedge contributes no factor `6 π η a`. A control that appended the
hyperedge's substitution to the chain would be a failure of this test. The
same command with the endpoints `model-stokes-drag` and `model-fick` names
the hyperedge and has no single-premise chain that inserts `γ = 6 π η a`
by itself.

**Klein–Gordon → free Schrödinger, one cross-family edge.**
`model-klein-gordon` (waves) → `model-schrodinger-free` (diffusion) is
`ab-kg-schrodinger` alone. `crossFamily` is true. `modelFamilies` is
`waves`, then `diffusion`. The bound is that bridge's own `(K, δ)` in its
kinetic-frequency norm. No second factor is applied. Regime
`c · omega0^-1 · k ≤ 0.1` is that bridge's regime. A point inside it can
claim the bound. A point outside it is a violated regime (exit 3) when a
bound is otherwise claimed. A missing group is `unknown` (exit 0).

**Klein–Gordon → Fick, silent cell.**
The continuation is `ab-schrodinger-diffusion` (`analytic-continuation`).
`approximation` then `analytic-continuation` is a silent cell, so the route
is `no-claim` / `no-composite-claim`, exit 0, no bound key. This design does
not define that cell. A test that expected a number here would be the defect.

**Klein–Gordon → LC, missing Lipschitz.**
`ab-kg-oscillator` (restriction, waves → oscillators, no Lipschitz constant)
then `ab-spring-lc`. The command already reports `missing-lipschitz`. The
route is cross-family. The refusal stays `missing-lipschitz`, which outranks
a vocabulary failure, because an unbounded step before the last is the harder
failure. Exit 0. A fixture that gave the restriction a finite `K` would then
hit the vocabulary gate on the way into `ab-spring-lc`, and that second
fixture is the control that `cross-family-unmapped` can fire.

**Duplicate group name.** A fixture of two regimes in different families that
reuse one group key with different exponent vectors yields composite
`unknown` on both steps and names the collision. The same key with the same
`PiGroup` still does not compose the norms by string equality across
families; the regime check may use the supplied number, and the norm gate
still requires a transport.

**Search preference.** Two oscillators with an intra-family chain: the
reported route is the intra-family one even if a longer atlas walk also
exists. Endpoints in different families: `findAtlasPath`. A same-family pair
with no intra-family chain: `findAtlasPath`, and `crossFamily` follows the
models actually visited.

## 10. Risks

- **A shared English sentence treated as one norm.** Two bridges can state
  the same words for different quantities. Section 5 refuses that match
  across families. Inside one family the string match remains, and a sloppy
  norm string there still composes. This design does not re-audit intra-family
  strings.
- **A transport declared to make a chain print a number.** Gate 5 accepts a
  `NormTransport`. A declaration written so the command succeeds, without a
  witness, would be a false claim. The transport's existing witness
  requirement is the control. A transport with no witness stays refused.
- **Widening the table to "fix" Klein–Gordon → Fick.** That chain is silent
  on purpose. Implementing this design by filling `approximation` then
  `analytic-continuation` would ship a physical claim this note does not make.
- **Calling `intersectRegimes` and catching the throw.** A catch that picks
  one family and concatenates inequalities rebuilds the bug. The conjunction
  is over tri-states, and the throw stays in place for callers that really
  do want one `Regime`.
- **Hyperedge smuggled into the chain.** Stokes–Einstein is the case. The
  test in §9 is the guard.
- **Exit 3 on a no-claim.** Scripts that treat 0 as success already treat a
  refusal as success, because the refusal is the result. Changing unmapped
  vocabulary to exit 3 would break that rule. Section 8 keeps exit 0.
- **Endpoint families used as the whole story.** A route that leaves and
  returns would print no crossing if only the endpoints were compared.
  `crossFamily` is defined on the visited models.

## 11. Open questions for Daniel

1. **Intra-family preference.** When both endpoints share a family and an
   intra-family chain exists, this note keeps that chain even if the atlas
   union contains another route. Should the command also report that another
   atlas route exists, without switching to it?
2. **Reason string.** `cross-family-unmapped` is a new `no-claim` reason.
   Reusing `norm-not-stated` would avoid a new enum member and would blur a
   missing intra-family transport with a family boundary. Which string should
   the JSON carry?
3. **`--at` namespace.** One flat namespace, with a colliding group name
   forced to `unknown`, is the rule in §6. The alternative is a qualified key
   (`waves.k`, `diffusion.k`). Qualified keys change every existing `--at`
   invocation that happens to be unambiguous. Is the flat namespace the one
   to ship?
4. **Hyperedges.** Should `ab-stokes-einstein` remain a named join forever,
   or is there a later tier in which a path may require every premise of a
   join to be supplied (`upt path` with more than two model ids)?
5. **One-step cross-family bounds.** `ab-kg-schrodinger` prints its own bound
   once the families are labeled. Is labeling enough, or should a one-step
   cross-family edge also require an explicit "this norm is stated in the
   conclusion's vocabulary" declaration before any number is printed?
6. **Uncertainty.** This note leaves `σ` off `upt path`. Is that the decision,
   or should a later flag print `propagateUncertainty` beside the bound
   without combining the two numbers?
7. **Table.** Confirm that Tier 10 does not widen the composition table,
   including `approximation` then `analytic-continuation`.

## 12. Milestones

Each milestone is a code change that waits for approval of this note. Later
milestones assume the earlier ones. None of them edits the composition table.

**M1 — Labels, no new refusal.** Compute `crossFamily` and `modelFamilies`
from the route `selectRoute` already returns. Add `fromModelFamily` and
`toModelFamily` on each JSON step. Replace the "composition rules are the
same" sentence with the family list. Pin the five chains in §9 to the claim
or refusal they have before any gate is added. `ab-kg-schrodinger`'s bound
must be unchanged at M1.

**M2 — Vocabulary gate.** Implement §5. Same-family routes, including
pendulum → LC, keep the `(K, δ)` that route already returns. A cross-family multi-step route
without a transport returns `cross-family-unmapped` (or the reason chosen in
question 2) and no bound. The missing-Lipschitz chain stays
`missing-lipschitz`. The silent Klein–Gordon → Fick cell stays
`no-composite-claim`.

**M3 — Regime and horizon conjunction.** Implement §6. `intersectRegimes`
still throws across families. Duplicate group keys become `unknown`.
Horizons restate only through a declared time map. Exit codes follow §8.
The pendulum point outside `θ0 ≤ 0.5` stays exit 3. A missing `--at` group
on the Klein–Gordon edge stays exit 0.

**M4 — Help, JSON, and the controls.** Help text matches §7. The tests in §9
are the suite for the milestone, including the fixture controls (transport
removed, hyperedge not folded in, colliding `PiGroup`). A command-level test
drives `upt path --json` for each chain and checks the exit code by a second
path: the JSON `kind` / `reason` and the process status must agree.
