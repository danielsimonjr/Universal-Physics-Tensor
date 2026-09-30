# Lean-proved bridges

Design for a UPT bridge to count as real when a reviewed `formalRef` points at a
Lean 4 theorem in PhysJS. This note is the design. Implementation of any
milestone follows approval of this note. Approval and what has landed are
recorded outside this file.

This note does not change code, `src/canonical`, or the composition table.

Daniel's constraints, which the rest of this note carries out:

- The core is the tensor formalism and dimensional analysis. Categories and
  functors sit above that core: a physics family is a category, a bridge is a
  morphism or a functor, and composition is checked.
- A bridge is real when it is proved in Lean 4.
- PhysJS owns the Lean 4 project and its CI. The project builds on Mathlib and
  on PhysLean. PhysLean is a firm dependency, in the same sense as Mathlib:
  the lakefile requires it, and a build that succeeds without that require is
  a failed control.
- UPT stores a reviewed `formalRef` to a specific PhysJS commit and theorem.
  A UPT check resolves that ref. UPT does not run `lake`.
- Daniel publishes to npm. This note does not publish anything.
- Work may land in UPT, MathTS, or PhysJS. The first proofs are in PhysJS and
  the matching `formalRef` records are in UPT.

Study verdicts, deferrals, and live counts stay in `NOTES.md`, `ROADMAP.md`,
and `todo.md`. This note names those files when a milestone depends on them.

## 1. Audit

### 1.1 Three registries

UPT keeps three relations that a reader can mistake for one list.

| Registry | Home | What a row relates |
|---|---|---|
| Atlas bridges | `src/atlas/families.ts` (`ATLAS_FAMILIES`), modules under `src/atlas/oscillators/`, `src/atlas/diffusion/`, `src/atlas/waves/` | Models. The id shape is `ab-…`. `formalRef` is a field of `AtlasBridge` (`src/atlas/types.ts`). |
| Catalog bridges | `src/bridges/index.ts` (`BRIDGE_EQUATIONS`), edges in `src/composition/edges/` | Quantities. The id shape is `be-…` or `law-…`. No `formalRef` field. |
| Canonical equations | `src/canonical/registry.ts`, entries under `src/canonical/entries/` | Textbook laws the other two are checked against. The id shape is `CE-…`. No `formalRef` field. |

`src/bridges/descriptor.ts` joins catalog metadata, a right-hand-side AST, and a
graph edge. An atlas bridge is a different object. The Sprint 4 gate counts
atlas bridges, because that is where `formalRef` lives.

The atlas families are oscillators, diffusion, and waves. The bridge ids in
those modules are listed in §3. Whole-atlas gates iterate `ATLAS_FAMILIES`.
The pin that they do so is `tests/atlas/families.test.ts`.

### 1.2 Composition

`src/atlas/composition-table.ts` is an 8×8 table on `RelationType`.
`composeRelation` is a lookup. Nine cells are defined. The other fifty-five
return `no-composite-claim`. The ninth defined cell is
`approximation ∘ exact-equivalence = approximation`, the widening in
`docs/planning/ADR-transported-norm-composition.md`. The table is a pure
function of relation types. `boundPath` (`src/atlas/path-bound.ts`) decides
whether a particular route carries a number.

`src/atlas/derivation.ts` folds the same table across a hyperedge. A silent
cell means the hyperedge carries no composite claim either.

`tests/atlas/composition-table.test.ts` pins the silent-cell count. Widening
the table is a reviewed act of its own. No milestone below widens it.

### 1.3 Cross-family path

`findPath` searches one family. `findAtlasPath` searches the union.
`upt path` uses `selectRoute` in `src/cli/commands/_atlas-route.ts`. The
composition rule for a route whose models are filed in more than one family is
`docs/design/tier-10-cross-family-path.md`.

A matching norm name across families is not a transport. A bound crosses only
on a witnessed `NormTransport`, and the factor on that transport is what is
applied. Otherwise the reason is `cross-family-unmapped` and the result has
no bound field. Each step's regime is its own tri-state. A horizon is
restated only through a declared time map on that step.

A bridge with two or more premises is omitted from the chain.
`multiPremiseBridges` names it beside the chain. `ab-stokes-einstein` is that
shape: `model-langevin` and `model-stokes-drag` to `model-fick`. The path
from `model-langevin` to `model-fick` remains the single-premise bridge
`ab-langevin-diffusion`. The hyperedge is named and is not given a bound by
the path command.

### 1.4 Probe

Product B is `src/composition/probe/`. The CLI is `upt probe`. Relation-link
and regime-transition wrappers are `searchable: false`.
`scanWithExpressionGaps` (`src/composition/probe/expression-gaps.ts`) adds one
`prediction-residual` gap per applied case in `src/cases/`. The contract is
`docs/design/tier-8-probe-searchable-gaps.md`.

The probe's `RelationKind` (`src/composition/probe/types.ts`) is a different
type from the atlas `RelationType`. The probe module imports nothing from
`src/atlas/`. A functor layer that merged the two names would be a second
vocabulary for one fact.

### 1.5 Retrieval

Typed structural search is `rankByStructure` in
`src/atlas/benchmark/baselines.ts`. It ranks a shared leakage key above symbol
overlap. Text overlap and symbol overlap are the two weaker baselines in the
same file.

The hybrid design — an embedding model proposes, the atlas decides — is
`docs/design/tier-11-hybrid-retrieval.md`. No embedder sits in `src/`. The
product follow-up that would point `rankByStructure` at the residual-form
corpus is the open row in `todo.md`. What blocks it is in §6.

The criterion 3 measurement itself is recorded in `ROADMAP.md` §7 and
`NOTES.md`. This note does not restate the scores.

### 1.6 `formalRef`

```ts
interface FormalRef {
  system: 'lean4-physlib' | 'other';
  statement: string;
  version: string;
  axioms: readonly string[];
  fidelity: 'two-formalizers' | 'back-translation' | 'sanity-lemmas' | 'unreviewed';
}
```

`formally-proved` is derived in `src/atlas/derive-evidence.ts`: the tag is
present when `formalRef` is present and `fidelity` is not `unreviewed`. The
tag is on the bridge. The CLI states the limit in
`src/cli/commands/atlas.ts`: the reference covers its statement, and it is
not attributed to the bound, the regime, or the horizon unless the statement
says so.

One bridge carries a reference. `ab-pendulum-linear` in
`src/atlas/oscillators/bridges-limits.ts` points at
`ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff`, system
`lean4-physlib`, fidelity `sanity-lemmas`, version
`physlib@5ad56e24de155462acd8478458292347393d5908 lean4:v4.34.0`. The sanity
lemmas are `tests/atlas/formal-sanity.test.ts`. The axiom gate is
`tools/formalref-axiom-gate/`, driven by the probes in `formal/physlib/`.
`TOOLS.md` records that the gate is not in CI: Lean exits 0 for a `sorry`
proof, so the gate reads `#print axioms` and fails unless the hole controls
report `sorryAx`.

The gate collects `system: 'lean4-physlib'` only
(`tools/formalref-axiom-gate/gate.ts`). A reference stored as `other` is
skipped. A PhysJS commit stuffed into `other` would be ungated.

The Phase 4 search of external libraries is
`docs/research/phase-4-formalref-scoping.md`. Its conclusion, which this note
keeps, is that the other atlas bridges had no qualifying external statement.
The proofs have to be written. The place they are written is PhysJS.

### 1.7 What UPT already derives

Two derivations exist, and they are different.

**Dictionaries the CAS already pushes through.**
`src/atlas/witness-specs.ts` starts from the premise expression, applies the
bridge's substitution, and asks the simplifier to reach the conclusion
expression. The witnesses are:

| Witness | Bridge | Substitution the spec applies |
|---|---|---|
| `WD2s` | `ab-heat-diffusion` | `κ ↦ D ρ c_p` inside `κ q² / (ρ c_p)`, against `D q²` |
| `WD5s` | `ab-stokes-einstein` | `γ ↦ 6 π η a` inside `kT / γ`, against `kT / (6 π η a)` |
| `W1s` | `ab-spring-lc` | `m ↔ L`, `k ↔ 1/C` inside `k/m`, against `1/(L C)` |
| `W2s` | `ab-damped-rlc` | the same dictionary inside `b²/(4 m k)`, against `R² C / (4 L)` |

A hand-typed pair of equal ASTs is refused by the comment on that module:
the check is the dictionary.

**Monomials the Buckingham engine already recovers.**
`src/dimensional/buckingham.ts` (`dimensionallyDetermines`, `buckinghamPi`)
returns exponents only. The leading constant is outside the result type.
`tests/dimensional/derivation-benchmark.test.ts` pins nine textbook monomials.
Those nine are the L0 entries in
`src/canonical/entries/dimensional-classics.ts`, each with
`epistemicStatus: 'dimensional'`. One of them is the algebraic core of an
atlas bridge: `CE-string-wave-speed`, `v ∝ √(F/μ)`, which `ab-string-wave`
states as `c² = F/μ`.

`tests/dimensional/bridge-derivation-audit.test.ts` and
`docs/research/Bridge-Equation-Dimensional-Audit.md` run the same engine on
catalog edges. The audit's derived rows include `be-16` (form `E ∝ kT`,
prefactor `ln 2` recovered from the evaluator), `be-12`, `be-21`,
`law-schwarzschild-radius` (prefactor 2), and others named in that note.
The prefactor is the evaluator match. The engine does not produce it.
Those rows are catalog edges. They are not atlas bridges, and they have no
`formalRef` slot. They are milestone 4.

`CE-stokes-einstein` (`src/canonical/entries/statistical-mechanics.ts`) is
`scalar-up-to-constant`. Its scalar AST is `kT / (μ r)` and does not contain
`6π`. The sourced prefactor `1/(6π)` lives in
`src/composition/canonical-prefactors.ts`. The atlas witness `WD5s` uses
`6π`. A Lean theorem for `ab-stokes-einstein` follows the witness and the
prefactor table. It does not rewrite the canonical AST.

### 1.8 MathTS, PhysJS, and PhysLean

**MathTS.** Cloned for this audit from
`https://github.com/danielsimonjr/MathTS` (public, default branch `main`).
It is a TypeScript workspace. Published names include
`@danielsimonjr/mathts-expression`, `@danielsimonjr/mathts-tensor`, and the
other peers in UPT's `package.json`. UPT reaches the expression package
through an injected simplifier (`isSimplifierAvailable`); a missing peer
yields `unresolved`. MathTS also has a `units` package.
UPT's dimension engine does not import it. The core stays
`src/dimensional/`.

**PhysJS.** `https://github.com/danielsimonjr/PhysJS` is private. This
session's GitHub API returned not found, so this note does not describe a
tree it did not read. The last read filed in this repository is
`docs/research/phase-4-formalref-scoping.md`: README, changelog, license,
gitignore, and no Lean project. The README's target list there names the
spring–LC dictionary, the damped `ζ²` map, the Stokes–Einstein substitution,
Klein–Gordon dispersion limits, and d'Alembert in the missing direction.
Milestone 1 is what fills that empty project.

**PhysLean.** Daniel's name for the dependency is PhysLean. The repository
and the lake package are Physlib:
`https://github.com/leanprover-community/physlib`, `lakefile.toml` with
`name = "Physlib"`. That repository's README states that Physlib was formed
by merging PhysLean (formerly HepLean) with Lean-QuantumInfo. In this note,
"PhysLean" means that `Physlib` package. It does not mean a second
repository, and it does not mean the `QuantumInfo` library target.
`defaultTargets` in the lakefile includes both `Physlib` and `QuantumInfo`.
PhysJS requires the `Physlib` library. QuantumInfo is a separate codebase in
the same repository; this roadmap does not depend on it.

The lakefile requires Mathlib (`leanprover-community/mathlib4`). On the
default branch read for this audit, that revision is `v4.34.1` and
`lean-toolchain` is `leanprover/lean4:v4.34.1`. The `Physlib` library target
passes `-Dwarn.sorry=false`. A green Physlib build is therefore not evidence
that a PhysJS theorem has no `sorry`. PhysJS does not copy that flag onto
its own library.

`ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff` is still
declared in
`Physlib/ClassicalMechanics/Pendulum/SimplePendulum/SmallAngle.lean` on the
default branch read for this audit (`lemma`, namespace
`ClassicalMechanics.SimplePendulum`). The audited commit and the commit UPT
pins (`5ad56e24`) are different commits. Milestone 1 re-measures axioms at
whatever pin it adopts. It does not assume the two commits have the same
proof.

## 2. Architecture

Three layers. Each layer may cite the one below. The dependency does not run
upward: the dimension engine does not import the atlas, and the atlas does
not import Lean.

### 2.1 Tensors and dimensions

`src/dimensional/` is the core: seven base dimensions, exact rational
exponents, the Buckingham null space, and the scalar AST validator.
`src/core/` holds the rank-6 tensor runtime. Regime groups on an atlas
bridge are produced by `deriveRegimeGroups` (`src/atlas/regime.ts`) through
`buckinghamPi`, keyed by `PiGroup.formula`. A hand-written group is refused.

A Lean proof of a monomial cites this layer's exponents. It does not replace
the TypeScript engine. The engine remains the thing `upt derive` and
`upt audit` run.

### 2.2 Categories and functors

The category layer is a reading of records UPT already has, plus the checks
that keep the reading honest. It is not `docs/specification/Part-V.md` §17.
That section says the categories there are underspecified and that the
section is not an engineering specification.

| Categorical word | UPT record | Check that already exists |
|---|---|---|
| Category | One atlas family (`AtlasFamily`) | Models of a family share that family's dimensioned parameters |
| Object | A model id | Endpoint resolution across `ATLAS_FAMILIES` |
| Morphism | A single-premise `AtlasBridge`, labelled by `RelationType` | `directedEdges`: forward; `exact-equivalence` also backward |
| Partial composition | `composeRelation` | A silent cell has no composite. `boundPath` then applies uniformity, Lipschitz, and norm |
| Joint morphism | A hyperedge (`premises.length ≥ 2`) | Named by `multiPremiseBridges`. Not inserted into a binary chain |
| Functor | A declared `NormTransport` together with its time map, on an `exact-equivalence`, for one direction | Tier 10: a shared norm string across families does not apply. An undeclared transport refuses with `cross-family-unmapped` |

Milestone 2 adds types that make this table a checked API. It adds no
second composition function. A functor whose composite disagreed with
`composeRelation` would be a bug in the new type, and the acceptance test
is that disagreement.

A family is not a functor into another family merely because two bridges
share a model id. `ab-kg-schrodinger` ends in the diffusion family and
`ab-string-wave` ends at `model-wave-1d` in the oscillator family. Those
are morphisms whose endpoints were filed in different categories. The
functor data, when a bound is to cross, is the transport the bridge
declares. `ab-spring-lc` declares one: relative period error, in
`src/atlas/oscillators/norm-transport.ts`. `ab-heat-diffusion` declares
none, so telegraph → heat still refuses.

### 2.3 Lean

PhysJS is a Lean 4 lake project.

- `lakefile.toml` has two direct requires: `mathlib` and `Physlib`.
  Both name a git revision. Neither is optional, and neither is implied
  by the other. A file that needs a Mathlib name imports Mathlib.
  A file that needs a PhysLean name imports `Physlib`. A module that
  imports only `Physlib` does not satisfy the Mathlib control, and the
  reverse does not satisfy the PhysLean control.
- CI on PhysJS runs `lake build` of the UPT library and the axiom probe
  below. UPT's CI does not install Lean.
- The PhysJS library does not set `-Dwarn.sorry=false`.
- Every theorem in the manifest is printed with `#print axioms`. The job
  fails when the printed list contains `sorryAx`, or when it differs from
  the list the manifest records.
- Two hole controls ship in PhysJS, on the pattern of
  `formal/physlib/HoleProbe.lean` and `formal/physlib/ImportedHoleProbe.lean`.
  One `sorry` is in the probe file. One is in an imported module. The job
  fails when either control does not print `sorryAx`. Lean's exit code is
  ignored.
- A third control deletes the `Physlib` require and expects the pendulum
  import to fail to elaborate. A fourth deletes the `mathlib` require and
  expects a Mathlib-only lemma to fail. A control that still builds has
  not shown the dependency is firm.

The first pin is the Physlib commit the existing `formalRef` names
(`5ad56e24`, Lean `v4.34.0`), so the pendulum proof is the one the sanity
lemmas were written against. If that commit does not build under a current
`elan`, the milestone moves the pin, re-runs `#print axioms`, and updates
the sanity lemmas in the same change. The default-branch revision read for
this audit (`v4.34.1`) is a candidate for that move. It is not adopted by
this note.

### 2.4 TypeScript ↔ Lean correspondence

One PhysJS theorem corresponds to one atlas bridge id. The theorem is the
formal statement of one claim the bridge already makes: a dictionary, a
monomial, or an existing PhysLean equivalence. The bridge's prose
transformation, its premises, its regime, and its bound stay in the
TypeScript record.

**How a bridge is stated.** The Lean file names the bridge id in a
structured header the manifest is generated from:

```lean
/-- upt: ab-stokes-einstein
    covers: substitution of γ = 6 π η a into D = k_B T / γ -/
theorem substitution ...
```

The statement is the equation the witness already checks. For
`ab-stokes-einstein` that is: if `γ = 6 * π * η * a` and `γ ≠ 0`, then
`kT / γ = kT / (6 * π * η * a)`. The premises (Stokes drag, the Einstein
relation, creeping flow) are hypotheses or they are absent. They are not
proved by this theorem.

For `ab-string-wave` the statement is the Buckingham fact the benchmark
already pins: given tension (force) and linear density, the unique
monomial for a speed, up to a dimensionless constant, is
`tension^(1/2) * linearDensity^(-1/2)`. The constant in `c² = F/μ` is a
second lemma, fed by the bridge's transformation, and the formalRef names
which lemma it is. The small-slope side condition has no machine
inequality on this bridge (the regime's `inequalities` array is empty).
Neither lemma discharges that side condition.

For `ab-pendulum-linear` the PhysJS theorem imports
`ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff` and
`toHarmonicOscillator_ω`. The import is the proof. The formalRef text
keeps the limit the TypeScript record already states: the linearization,
including `ω = √(g/ℓ)`, is what is proved. `bound.delta` is the period
error, and PhysLean's period results are about `periodFormula`.

**How the two stay in sync.** PhysJS CI writes a manifest at a path
stable across commits, for example `upt/manifest.json`:

```json
{
  "commit": "<full sha>",
  "toolchain": "leanprover/lean4:v4.34.0",
  "requires": { "mathlib": "<rev>", "Physlib": "<rev>" },
  "theorems": [{
    "bridgeId": "ab-stokes-einstein",
    "name": "Upt.Diffusion.StokesEinstein.substitution",
    "axioms": ["propext", "Classical.choice", "Quot.sound"],
    "covers": "substitution of γ = 6 π η a into D = k_B T / γ"
  }]
}
```

UPT vendors a copy of that manifest the way it vendors
`data/atlas/witness-results.json`: a lead-run fetch, then a deep-equal
test against a fresh read when a checkout is present. Each of the five
`formalRef` records satisfies:

| Field | Value |
|---|---|
| `system` | a new union member, `lean4-physjs` |
| `statement` | the manifest's theorem `name`, then `:`, then the `covers` line |
| `version` | `physjs@<commit>` plus the toolchain and the two require revisions |
| `axioms` | the manifest's list |
| `fidelity` | `sanity-lemmas`, earned in `tests/atlas/formal-sanity.test.ts` |

`lean4-physlib` remains a legal system value for a reference that points
straight at Physlib. After milestone 1 the five bridges use
`lean4-physjs`. The resolution check fails a `lean4-physjs` reference
whose commit, theorem name, or axiom list disagrees with the vendored
manifest. It also fails when the checkout is present and the manifest
inside that checkout disagrees with the vendor. A missing checkout does
not pass the checkout half; that half is skipped and the output says so.
The vendored half still runs.

The sanity lemma instantiates the `covers` claim on two or three numeric
points and compares them with the bridge's own witness expression. A
paired control uses a wrong dictionary (the heat witness's pattern,
`D = κ ρ / c_p`, and the Stokes pattern with `3π` or a missing `π`) and
must fail. A lemma that accepted the wrong dictionary would earn no
fidelity.

`two-formalizers` stays unavailable while there is one maintainer. A
model back-translation, if it is run, is recorded as a model review.
Milestone 1 uses `sanity-lemmas`, which is the fidelity the pendulum
reference already earns.

The derived tag `formally-proved` still means "a reviewed reference
exists." The statement text and the CLI line carry what it covers. See
the question in §6 on whether that tag should become per-claim.

## 3. The five bridges

These five are the Sprint 4 gate. Each is an atlas bridge. The first four
are the shortest claims UPT already derives. The fifth is the reference
that already exists, re-homed so its version is a PhysJS commit that
imports PhysLean. Work proceeds in the order below.

| Order | Bridge | Relation | What UPT already checks | Lean statement | What the statement leaves as hypotheses |
|---|---|---|---|---|---|
| 1 | `ab-heat-diffusion` | `exact-equivalence` | `WD2s`: `κ q²/(ρ c_p)` under `κ ↦ D ρ c_p` equals `D q²` | That algebraic identity | The heat equation, Fick's law, and any norm transport. This bridge declares none, and the milestone does not add one |
| 2 | `ab-stokes-einstein` | `derivation`, hyperedge | `WD5s`: `kT/γ` under `γ ↦ 6 π η a` equals `kT/(6 π η a)`. Numeric `WD5` agrees with `CE-stokes-einstein` up to the `6π` the canonical AST omits | The substitution, with the `6π` the witness uses | Stokes' drag law, Einstein's `D = kT/γ`, the Reynolds and overdamped inequalities. The hyperedge stays a named join on `upt path` |
| 3 | `ab-spring-lc` | `exact-equivalence` | `W1s`: `k/m` under `m ↔ L`, `k ↔ 1/C` equals `1/(L C)`. PhysLean has `HarmonicOscillator` for the mechanical side and no LC circuit | The time-rescaled ODE is the same under that dictionary. The mechanical side may cite `HarmonicOscillator.EquationOfMotion`. The circuit side is UPT's reading of the same ODE | The electrical interpretation, and every norm except the one transport this bridge already declares |
| 4 | `ab-string-wave` | `restriction` | Buckingham benchmark and `CE-string-wave-speed`: speed exponents `{tension: 1/2, linear-density: -1/2}`. Witness `WS1` is a numeric leapfrog check | Uniqueness of that monomial up to a dimensionless constant. A second lemma may pin the constant in `c² = F/μ` and must be the one the `covers` line names if the formalRef includes it | Small slopes. The regime inequalities are empty, so the theorem does not invent a machine inequality |
| 5 | `ab-pendulum-linear` | `approximation` | Reviewed `formalRef` to PhysLean's `linearizedEquationOfMotion_iff`, sanity lemmas in `tests/atlas/formal-sanity.test.ts` | A PhysJS theorem that imports that lemma and `toHarmonicOscillator_ω` | `bound.delta`, the period, the horizon. The import does not widen the claim the sanity lemmas already check |

**Where the dispersion bounds sit.** The scoping report's
shortest new lemmas are the closed-form edge errors on
`ab-kg-schrodinger`, `ab-klein-gordon-wave`, `ab-stiff-string`,
`ab-telegraph-diffusion`, and `ab-telegraph-wave`. Those lemmas certify
`bound.delta`. They do not derive a dictionary or a Buckingham monomial.
They are milestone 3. Writing them first would skip the claims UPT
already derives.

**Reserve, if one of the five cannot be stated so that the `covers` line
matches the bridge.** `ab-damped-rlc` (`W2s`, the `ζ²` dictionary) replaces
a failed row. `ab-heat-laplace` (the steady profile from `T'' = 0` with
fixed ends) is the other reserve. It is an ODE fact. There is no heat
equation in PhysLean to restrict, so its `covers` line would say the ODE
step only.

**The other atlas bridges stay without a `formalRef` until a later
milestone writes a statement that matches their claim.** A partial
counterpart is not recorded. That is the scoping report's rule for
`ab-walk-diffusion` (the fixed-time central limit theorem is not Fick's
equation) and `ab-wave-dalembert` (PhysLean's `planeWave_waveEquation`
proves that plane waves solve the wave equation; the bridge claims the
converse). `ab-chain-wave`, `ab-sound-speed`, `ab-schrodinger-diffusion`,
`ab-langevin-diffusion`, `ab-damped-massless`, and `ab-kg-oscillator`
need a continuum limit, a linearization, a Wick rotation, or a singular
limit that the first five do not.

## 4. Milestones

Each milestone is unauthorized until it is promoted in `ACTIVE.md`. This
note is the design that promotion would cite.

### Milestone 1 — the Sprint 4 gate

**Scope.** PhysJS becomes a Lean 4 project with CI. It requires Mathlib
and Physlib (PhysLean) as firm dependencies. It contains the five
theorems of §3. UPT records five `lean4-physjs` references, vendors the
manifest, resolves each ref, and earns `sanity-lemmas` with a failing
control on the wrong dictionary.

**Deliverables.**

- PhysJS: `lakefile.toml`, `lean-toolchain`, the five modules, the
  manifest generator, the axiom probe, the two `sorry` controls, the two
  require-deletion controls, and a GitHub Actions workflow that runs them.
- UPT: the `lean4-physjs` system value; the five `formalRef`s; the
  vendored manifest; the resolution check; the sanity lemmas and their
  wrong-dictionary controls; the axiom gate extended so a `lean4-physjs`
  reference is checked against the manifest rather than skipped. The
  gate still does not run `lake` inside UPT CI.

**Repos.** PhysJS and UPT. Mathlib and Physlib are pinned dependencies.
MathTS is not in this milestone.

**Acceptance.**

- PhysJS CI is green on the pinned toolchain.
- The Physlib-require control is red when that require is removed. The
  Mathlib-require control is red when that require is removed. Both
  controls are red in the expected direction on a build that still has
  the requires: the imports elaborate.
- Each `sorry` control prints `sorryAx`. A manifest theorem does not.
- UPT's resolution check fails on a bad commit, a bad theorem name, and
  a bad axiom list, and passes on the five vendored rows.
- Each sanity control fails on the wrong dictionary and holds on the
  bridge's own dictionary.
- `ab-pendulum-linear`'s `covers` line is still the linearization. Its
  `bound.delta` is unchanged.
- `src/canonical/` is untouched. `COMPOSITION_TABLE` is untouched.
  `ab-heat-diffusion` still has no `normTransports`.
  `ab-stokes-einstein` is still a named join, not a chain step.
- `formally-proved` appears on these five bridges only through
  `deriveEvidence`, and on no bridge that lacks a `formalRef`.

### Milestone 2 — the category layer as a checked API

**Scope.** Name the §2.2 table in the type system: family as category,
single-premise bridge as morphism, hyperedge as a joint morphism,
`NormTransport` plus its time map as the data of a functor. Composition
remains `composeRelation` and `boundPath`.

**Deliverables.** Types and tests in UPT. A cross-family route still
refuses an undeclared transport. A declared transport still contributes
its factor. A new wrapper that composed two relations by a rule other
than the table fails a test that calls both and compares them.

**Repos.** UPT.

**Acceptance.** The silent-cell pin is unchanged. No bridge gains a
transport it did not have. No `formalRef` is added or removed. The probe
`RelationKind` is still a separate type and still does not import the
atlas.

### Milestone 3 — bounds

**Scope.** PhysJS lemmas for the five closed-form edge errors named in
the scoping report: `ab-kg-schrodinger`, `ab-klein-gordon-wave`,
`ab-stiff-string`, `ab-telegraph-diffusion`, `ab-telegraph-wave`. Each
lemma says the error function is monotone on the recorded regime and
that its value at the recorded edge equals `bound.delta`.

**Deliverables.** Five PhysJS theorems, five UPT `formalRef`s, sanity
lemmas that instantiate the edge value, and a control that moves the
edge and must fail.

**Repos.** PhysJS and UPT.

**Acceptance.** The `covers` line says `bound.delta` at the dispersion
relation. It does not say the PDE was derived. The composition table is
unchanged.

### Milestone 4 — dimensional classics

**Scope.** PhysJS lemmas for the nine monomials in
`tests/dimensional/derivation-benchmark.test.ts` /
`src/canonical/entries/dimensional-classics.ts`. Each lemma is uniqueness
of the exponent vector up to a dimensionless constant. Catalog edges the
dimensional audit marks derived (`be-16`, `be-12`, `be-21`,
`law-schwarzschild-radius`, and the rest of that table) get the same
shape of lemma, keyed by their edge id in the manifest. A prefactor
lemma, when one is written, takes the constant from
`src/composition/canonical-prefactors.ts` or from the evaluator the
audit used, and its `covers` line says "prefactor", which is a different
claim from the monomial.

**Deliverables.** PhysJS theorems and a UPT test that every such theorem's
exponents equal `dimensionallyDetermines` on the same variables. The test
fails if a Lean exponent and a TypeScript exponent differ.

**Repos.** PhysJS and UPT. `src/canonical/` stays as it is. Canonical
equations do not grow a `formalRef` field in this milestone. The manifest
key is the `CE-…` or `be-…` id. `formally-proved` is not stored on a
canonical row.

**Acceptance.** A lemma that emits a leading constant the Buckingham
result type cannot represent fails review. `be-16`'s monomial lemma does
not assert the Bérut measurement. See §6.

### Milestone 5 — blind rediscovery

**Scope.** A benchmark in which a known bridge is recovered without the
recoverer having been shown the answer, and the recovered statement is
then proved in PhysJS.

**Deliverables.** A protocol note under `docs/planning/` or
`docs/research/`, and a run through `scripts/atlas-benchmark-models.mjs`.
The item set is five textbook relations. They are disjoint from the §3
bridges and from the nine dimensional classics, both of which are already
in this repository. This note does not name the five items. The session
that writes them has not read `src/atlas/`. An agent that has read
`src/atlas/` builds the harness only, and any draft it touches is marked
contested, which is the rule already in that script's header and in
`AGENTS.md`.

**Repos.** UPT for the harness and the record of the run. PhysJS for a
proof of each relation the run actually recovers.

**Acceptance.** Recovery and proof are separate results. A recovered
relation with no Lean proof is recorded as recovered and unproved. A
miss is recorded as a miss. The two counts stay separate. Criterion 3
and the invalid-bridge study keep their own records.

## 5. Success benchmark

The benchmark is milestone 5. Success is: of five held-out textbook
relations, the dimensional engine or the typed search recovers the
monomial, and a PhysJS proof discharges that monomial, for each of the
five. Anything short of that is reported as the pair (recovered count,
proved count), the two numbers kept separate.

The nine dimensional classics are the rehearsal, because they are
already encoded and a rediscovery of them would measure memory of this
repository. They are not the scored set.

## 6. Risks, blocked items, questions

**A true lemma about the wrong claim.** The heat and Stokes theorems are
short because they are substitutions. `formally-proved` is derived for
the whole bridge. The CLI already says the reference covers its
statement only. The `covers` line has to be specific enough that a
reader who stops at the tag is corrected by the next line they are shown.
Milestone 1 does not split the tag. Whether it should is a question
below.

**The same author writes the bridge and the proof.** Lean checks the
Lean statement. The sanity lemma is what checks that the statement is
the bridge. The wrong-dictionary control is what checks that the sanity
lemma can fail.

**Physlib turns sorry warnings off.** PhysJS CI must not inherit that
flag, and must not treat "imports a Physlib theorem" as "our theorem is
sorry-free." The axiom probe is the check. The imported-module hole
control is what shows the probe can see a hole in a dependency.

**A private PhysJS commit does not resolve for a reader of the public
package.** The vendored manifest is the check UPT CI can run. The
fetch of the commit is the second method, and it works for a caller who
can read the repository. Publishing PhysJS is Daniel's act. Until then,
the resolution check's fetch half is available only where credentials
exist, and the output says which half ran.

**Pin drift.** Mathlib, Physlib, and the Lean toolchain move together.
A bump re-runs the axiom probe and the sanity lemmas in one change. A
bump that updates only the lakefile leaves the vendored axioms stale,
and the resolution check fails.

**The category layer becomes a second composition.** Milestone 2's
acceptance is that there is still one table.

**Criterion 3's product follow-up.** The study has been run. Its verdict
is in `ROADMAP.md` §7 and `NOTES.md`. The open engineering row is in
`todo.md`: point `rankByStructure` at the residual-form canonical corpus.
The study runner still refuses a tree that does not match the Amendment 8
labelled-corpus hash. What unblocks the product change is an owner
amendment that keeps that hash as the study's object and allows the
product search to read the residual form. A Lean proof does not move the
hash. Tier 11 remains the retrieval design; milestone 1 does not
implement it.

**be-16, be-23, be-38.** These are confrontation data, not missing
proofs.

- `be-16` (Landauer / Bérut). The consistency-kind machinery exists.
  The missing input is the Fig. 4 asymptote in Bérut et al. 2012, which
  is paywalled. The owner supplies the number. It is not invented from
  `ln 2`. The dimensional audit already recovers `ln 2` from the
  evaluator; that is the formula. Milestone 4's monomial lemma does not
  close this row.
- `be-23` (per-material α). The aggregate confrontation is in the
  registry. A `table`-kind upgrade needs Legros 2019's per-material rows,
  also paywalled, entered as `PLANCKIAN_CUPRATES.perMaterialAlphas`. The
  owner supplies the rows.
- `be-38` (MOND / SPARC deep limit). The block is a physics ruling: a
  genuine test, or a reproduction of `a₀`. It is not a missing file. A
  Lean proof of an interpolation function would not answer that ruling.

### Questions for Daniel

1. The derived tag `formally-proved` lights up for the whole bridge once
   the fidelity is reviewed. For the heat and Stokes rows, the theorem
   is the substitution. Is the existing CLI qualification ("covers its
   statement only") the acceptance rule, or should the tag wait until
   the premises and the bound are proved as well? The second answer
   means milestone 1's five references can be recorded and the tag stays
   off until a later milestone.
2. Should the pendulum reference move from `lean4-physlib` to a PhysJS
   theorem that imports it, as §3 does, or should that one reference
   keep pointing at Physlib while the other four point at PhysJS?
3. Publishing PhysJS. A private repository leaves the fetch half of the
   resolution check available only with credentials. Is publication in
   scope with milestone 1, or does the vendored manifest stand as the
   public check until you publish?
4. Is an npm package inside PhysJS, on the `@danielsimonjr/mathts-*`
   pattern, part of a later milestone? UPT does not depend on one today.
   The engineering calculations it runs are `src/cases/` and the
   evaluators in `src/bridges/`. This note leaves them in UPT.
5. Milestone 4's catalog lemmas use the edge id as the manifest key and
   do not add `formalRef` to `CanonicalEquation` or to the catalog row.
   Is that the boundary you want, or should a catalog bridge carry the
   same field the atlas bridge carries?
