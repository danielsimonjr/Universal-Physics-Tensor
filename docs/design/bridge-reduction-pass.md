# Bridge reduction pass

Design for a recurring pass that looks for a smaller generating set of the
bridge catalog: the equations from which the others follow by algebra, and
which of those generators are the cross-domain ones. This note is the
design. It changes no code, no catalog row, no canonical entry, no
composition edge, and no cell of the composition table. Approval, and any
later implementation, are recorded outside this file. Landing the note does
not authorize the pass. A run becomes work when Daniel accepts this note
and an `ACTIVE.md` task names that run. Publishing the package is the
owner's job.

## Decisions this note joins

- Evidence stays derived. `deriveEvidence` is the only way a tag appears.
  This pass never writes an evidence tag, and it never calls
  `deriveEvidence` on a candidate.
- A reviewed `formalRef` stays the record in
  [`docs/planning/Catalog-FormalRef-Design-Note.md`](../planning/Catalog-FormalRef-Design-Note.md).
  A reduction, a limit, and a derivation-step light no evidence tag. A
  derivation theorem in this pass is a reduction in that sense.
- UPT does not run Lean. The pin procedure is the `lean4-physjs` section
  of `WORKFLOWS.md`. The manifest schema stays
  `physjs-bridge-manifest/v1` unless Daniel bumps it.
- Symbolic composition is `composeSymbolic` and `substitute`
  (`src/composition/compose-symbolic.ts`, `src/composition/expr-subst.ts`).
  Simplification is MathTS `simplify` behind `src/composition/expr-simplify.ts`,
  with that module's three guards. Scalar evaluation is MathTS through
  `evalExpr`. UPT does not grow a second computer-algebra system.
- `normalForm` (`src/canonical/normal-form.ts`) hashes two expressions as
  the same relation up to a dimensionless factor. A derivation in this
  pass keeps the factor. `normalForm` is a near-miss screen.
- `dependencies` on a catalog row is the set of other ids the prose names.
  The bridges index says that list is not transitive. It is not a
  derivation.
- `QUANTITY_IDENTIFICATIONS` is the reviewed list
  `composeSymbolic` already consults. A shared token, a shared dimension,
  or a shared constant is not an identification.
- The composition table stays the under-approximation in
  `src/relations/composition-table.ts`. A silent cell stays silent.
- The composed-pair golden
  (`tests/composition/compose-relation.test.ts`) is the regression of
  `enumerateCompositions`. This pass reads that enumeration and does not
  regenerate the golden.
- `CANONICAL_GRAPH` (`src/composition/canonical-graph.ts`) projects
  textbook equations into the edge vocabulary, with universal constants
  baked into the evaluator. It is a definition source only if Daniel
  accepts that use. It is not a second catalog.

## What "derivable" means

A catalog equation `B` is **derivable** from a set `S` of catalog equations
when four conditions hold together.

1. **Algebra.** There is a finite derivation of `B`'s displayed scalar
   equation from the displayed scalar equations of `S`, using only:
   - substitution of one equation's right-hand side for a quantity the
     other equation names, which is what `composeSymbolic` does at a
     junction;
   - replacement of a subexpression that is identical to another edge's
     `symbolic` form, after the fixed definitions below;
   - the field operations addition, subtraction, multiplication, division,
     and rational powers, and the exponential `exp` together with its
     inverse logarithm;
   - the fixed definitions in the next subsection.
   Specializing a free parameter to a constant (setting an angle so that
   its cosine is zero) is a separate generator. It is proposed below and
   it is an open question, because a specialization can make two formulas
   agree while the theorems remain different statements.
2. **Dimensions.** After the substitution, `validate` reports one
   dimension, and `equals` says that dimension is the target's
   `dimensional_signature`. A mismatch drops the candidate. The seven SI
   bases are the ones `src/dimensional/algebra.ts` already compares.
3. **Premises stay named.** A hypothesis the Lean covers line already
   calls a hypothesis (a closure, a split, a selection rule) is a premise
   of the derivation, written in the report. It is not silently supplied.
   If the premise is not itself a catalog equation or a fixed definition,
   `B` is not derivable from `S` alone.
4. **A Lean theorem.** The three checks above make a candidate. `B` is
   marked derived only when PhysJS has a complete derivation theorem that
   imports the basis theorems and states `B`'s catalog equation. Until
   that theorem is pinned, the candidate lives in the report and nowhere
   in the catalog.

A numeric agreement is a screen on a candidate that already passed the
algebra and the dimension check. It is not a fifth way to be derivable.
The screen evaluates the composed expression and the catalog evaluator at
one point inside the edge's domain. They must agree. It then evaluates a
mutated prefactor: a rational coefficient doubled, or the negative control
the existing PhysJS covers line already names. The mutated value must
disagree with the catalog evaluator. A screen whose mutation still agrees
is discarded, and the report says the screen cannot fail. Agreement at
one point, with no mutation that fails, proves the matcher ran.

These are not derivations:

- Two formulas that match up to a dimensionless factor. That is a
  `normalForm` near-miss. The factor is part of the equation.
- The same algebra with a different side condition. An integer Chern
  number and a rational filling factor are a worked case below.
- A cross-check: two equations agree when a dictionary identifies an
  acceleration with a surface gravity. Agreement under a dictionary
  leaves both equations in the generating set.
- A prose `dependencies` entry. Naming another id is the field the
  catalog already has.
- A units-only Buckingham match. The discovery pipeline already treats
  that as partial. This pass does not reopen it.
- A limit, an inequality, or a derivative, unless Daniel adds that
  operation to the fragment. The product rule is the worked case that
  sits outside substitution.

### Fixed definitions

The pass may use these equalities without treating them as catalog
bridges. They are the whole list. Adding one is a change to this note.

| Definition | Where the tree already uses it |
|---|---|
| `h = 2π ℏ` | `CONSTANTS.h` and `CONSTANTS.hbar` in `src/dimensional/symbolic-constants.ts`. Catalog record 12 displays both writings of one thermal wavelength. The quantity registry supplies the dimension and the default unit. |
| `μ₀ = 1/(ε₀ c²)` | The Alfvén, fast-magnetosonic, and magnetic-pressure records in `data/bridge-catalog.json` build `μ₀` as that quotient. The generic engine evaluates the record. |
| `Φ₀ = h/(2e) = π ℏ / e` | The Josephson and critical-field covers lines. `e` in that formula is the elementary charge. |
| `exp` is the exponential | A displayed `e^{γ}` is `exp(γ)`. Euler's number is written `exp(1)`. |

A bare `e` is the elementary charge when the leaf's dimension is charge,
which is the `CONSTANTS.e` entry. BE-52's `e` in `(1 − e²)` is an
eccentricity. The canonical graph spells that factor `one_minus_e_sq` and
refuses to bake a dimensionless governing name `e`. The pass uses the
dimension guard the canonical graph already uses: a governing name is a
constant only when the name and the dimension both match.

`N_A` in `src/core/constants.ts` is the Avogadro constant, and `F` there
is `N_A` times the elementary charge. No catalog `formula_latex` displays
that constant. The `N_A` in BE-138 is the acceptor density
(`builtin-acceptor`, per volume). The pass does not treat that symbol as
Avogadro's number.

## Candidate algorithm

The pass is a report generator. It does not edit an edge, a golden, or a
catalog field. Catalog fields are written later, by the pin, from a
PhysJS theorem.

### 1. Pool

The pool is every catalog edge in `CATALOG_GRAPH` whose `symbolic` form is
present. An edge with no `symbolic` form is listed as unscanned. An
unscanned row is neither a generator nor a consequence. Canonical edges
enter the pool only as the fixed definitions above, plus `CE-ideal-gas`
if Daniel accepts canonical premises. A canonical edge is not itself a
member of the bridge generating set.

### 2. Linking-constant graph

Nodes are catalog ids in the pool. An undirected edge joins two ids when
they share a constant leaf or a quantity name. Constant leaves are the
keys of `CONSTANTS` that the `symbolic` form actually contains, plus `μ₀`
and `Φ₀` when the definition rewrites them into those keys. Quantity
names are the edge's sources and target. The connected components order
the search: pairs are tried inside a component first. A component is a
search bucket. Membership in a bucket is not a derivation.

The character groups in the worked example are the same idea applied to
displayed `formula_latex`, after the false friends in that section are
removed. The implementation groups the AST, not the latex tokens.

### 3. Candidates

Two generators.

**Junction.** For each ordered pair, call `composeSymbolic`. On success,
simplify the `Observable` with the MathTS path in `expr-simplify.ts`. The
three guards stay: dimension, no invented leaf, and numeric agreement of
the simplifier with the unsimplified tree. If the simplified expression
is identical to the catalog scalar of `second`, including rational
coefficients, `second` is a candidate consequence of `first`. Identity is
structural after simplification. `normalForm` equality without coefficient
equality is recorded as a near-miss and is not a candidate.

**Subexpression.** If `first.symbolic`, rewritten through the fixed
definitions, occurs as a subexpression of `second.symbolic`, replace it
and simplify. The same identity test applies. This is the generator that
sees an inlined `B²/(μ₀ ρ)` where the junction composer sees no
`alfven-speed` leaf.

A proposed third generator, **specialization**, substitutes a constant for
one free symbol (`cos θ = 0`) and then runs the identity test. The worked
example shows a case where the formulas agree and the existing theorem
says the statements differ. The generator stays off until Daniel accepts
it.

The pass does not add a `QuantityIdentification`. A junction that needs a
new identification is a proposal in the report, beside the rationale a
human would need. It is not a candidate.

### 4. Dimension check and numeric screen

Run the dimension condition from the definition of derivable. Then run
the numeric screen and its mutation. A candidate that fails either check
is dropped. A candidate that passes both is still a candidate.

### 5. Near-minimal generating set

Exact minimality is a set-cover problem: each candidate derivation is a
set of equations that can stand in for one consequence, and the smallest
set of equations that generates the rest is not something this pass
claims to compute. The pass computes a greedy set and the report says the
set is not proved minimum.

Order the catalog ids by the tie-break below, most preferred first. Walk
that order. Keep an id when it is not a candidate consequence of the ids
already kept. Delete it when it is. The kept ids are the candidate basis.
Direct `derivedFrom` on a deleted id is the set of kept ids the candidate
derivation names, not the transitive closure.

Tie-break, in order, for the greedy walk and for any pair the walk could
have kept either way:

1. An established equation is preferred to a speculative or
   highly-speculative equation as a generator. A speculative equation is
   not the sole generator of an established consequence.
2. A family is preferred to a specialization of that family, when the
   specialization generator is on.
3. `cross-domain` is preferred to `standard`.
4. Fewer constant leaves is preferred.
5. The smaller integer id is preferred, so the walk is reproducible.

"More fundamental" in this note means rules 2 and 4. It does not mean the
catalog `status` field, and it does not mean a shorter latex string.
Rule 3 is the cross-domain preference. Rules 2 and 3 can disagree; the
order above is the proposal, and it is an open question.

### 6. What the greedy set is not

The set is a candidate. The catalog gains `derivedFrom` and `basis` only
from pinned derivation theorems, and only for the candidates Daniel
accepts out of the report. An id the greedy set deleted, with no pinned
derivation theorem, stays unmarked.

## Catalog and schema

`type` is required on every catalog record. The JSON schema is
`schemaVersion` 3. `derivedFrom` and `basis` stay off the record until a
derivation theorem is pinned. A consumer that ignores unknown fields still
reads a record that carries `type`.

`CatalogEntry` carries `type`. `derivedFrom` and `basis` are optional on
that type. `basis: false` is not a state the record carries.

| Field | Type | Who writes it |
|---|---|---|
| `type` | `"standard"` or `"cross-domain"` | The admission of the row. A dogfood proposal already carries the label. The field is that label, stored. |
| `derivedFrom` | array of `be-<n>` keys, the manifest's `bridgeId` spelling | The pin, from the derivation theorem's imports. Absent until then. |
| `basis` | `true` | The pin, for an id the accepted report names as a generator and that is not the subject of a derivation theorem. |

`type` is a filing label. It does not light an evidence tag. The advisory
`bridges` pair stays advisory. `type` may disagree with a reading of that
pair; the label is the one the proposal stated.

`derivedFrom` uses `be-<n>` so it cannot be read as `dependencies`, which
is `number[]`. The prose name of `be-74` remains BE-74. The array is the
direct imports. Transitive generators are the basis computation, not a
second array.

`basis: true` means the id is in the generating set the pinned theorems
support. Absence of the field means the id is unclassified. Absence does
not mean "fundamental." `basis: false` is not a third state; an id with a
derivation theorem omits `basis` and carries `derivedFrom`.

A hand-written `derivedFrom` or `basis` fails the gate the same way a
hand-edited PhysJS table fails `bun scripts/generate-physjs-table.ts --check`.
The generator reads the vendored manifest. The implementation, when it is
authorized, lands the failing test before the generator is allowed to
write the field.

`status` on the row stays the catalog's established / speculative /
highly-speculative / invalid enum. The pass does not change it. Evidence
tags stay on the `formalRef` path. A derivation theorem is kind
`reduction`. `catalogEvidenceInput` does not pass a reduction, so the row's
`formally-proved` tag, when the equation theorem already derives one,
stays the equation theorem's tag. Marking a row derived does not withdraw
that tag and does not delete the equation.

`dependencies` is left as it is.

## PhysJS

Derivation theorems live in the flat Lean tree, in the file of the derived
equation (`lean/<File>.lean`), which is the layout the vendored
`formal/physjs/lean-files.json` already records. The theorem imports the
basis modules and names the basis theorems. The equation theorem that the
UPT `formalRef` already points at stays the top-level manifest `theorem`.
The derivation is a nested object on that same manifest entry, the shape
the formalRef note already uses for a second statement. It has no second
`key` and no second `bridgeId`.

Proposed nested object, still under schema `physjs-bridge-manifest/v1`
until Daniel bumps it:

| Field | What it holds |
|---|---|
| `theorem` | `PhysJS.<Namespace>.<name>_from_<basis>`, a different name from the equation theorem |
| `imports` | The basis theorem names, each one a top-level `theorem` already in the manifest |
| `covers` | Begins with `reduction:`. Names the catalog equation, the basis theorems, and the premises that stay hypotheses |
| `coverage` | `covers its statement only` |
| `leanProof` | `complete` only with no `sorry` |
| `axioms` | What `#print axioms` printed. UPT does not re-measure them |

The UPT reference continues to name the equation theorem. The generator
that fills `derivedFrom` reads `imports`, maps each theorem back to its
`bridgeId`, and writes those keys. A nested derivation does not become a
second `formalRef`.

The pin is the existing procedure. Land the theorem in PhysJS. Vendor
`manifest/bridges.json` to `formal/physjs/manifest.json` at that commit.
Run `bun run physjs:table`. The new step is the generator for
`derivedFrom` and `basis`, in that same commit, from the vendored
manifest. `atlas:formal-gate` still compares the manifest to the bridges.
An import that names a theorem the manifest does not contain fails the
gate. A `derivedFrom` key with no nested derivation fails the gate.

The direct equation theorem stays. Retiring it, so that the row's only
Lean statement is the corollary, is an open question. This note keeps
both.

## When it runs

The round already has an order. This pass is one step in it.

1. **Dogfood.** A persona session proposes equations. Each proposal is
   labeled `standard` or `cross-domain`. Candidates stay unproven. That
   label is the future `type` field.
2. **Root fixes.** Defects the session recorded are fixed on their own,
   before new equations are admitted.
3. **PhysJS proofs, then the pin.** New equations are proved in PhysJS.
   UPT vendors the manifest and registers the rows by the `lean4-physjs`
   procedure in `WORKFLOWS.md`.
4. **Reduction pass.** After that pin, before the release tag. The input
   is the pinned catalog, the symbolic edges, and the vendored manifest.
   The pass does not run on a proposal that is not yet a catalog row.
5. **Release.** The release section of `WORKFLOWS.md` is unchanged, and
   it stays the owner's. The tag waits until the reduction report for
   that pin is either merged or explicitly skipped. Skipping is a
   sentence in the release note, written by the owner.

### Outputs

The pass writes a report at `docs/research/bridge-reduction/<pin>.md`.
The pin in the path is the PhysJS commit the vendored manifest names.
The report is a dated research note. It holds the candidate basis, the
candidate derivations with their premises, the near-misses, the unscanned
ids, the mutation results, and the statement that the basis is not proved
minimum. Counts live in that report and, when a run is accepted, in
`NOTES.md`. They do not live in this design.

Two pull requests follow an accepted report, and only then:

- **PhysJS.** The derivation theorems and the manifest entries. No `sorry`.
- **UPT.** The vendored manifest, the regenerated table, the generated
  `derivedFrom` and `basis` fields, and the report. No hand-written
  derivation field.

This note does not open those pull requests.

## Worked example

The formulas below are the `formula_latex` strings of those catalog ids,
and the theorem names are the vendored manifest's. The pass, when it
runs, recomputes candidates from the pin it is given. These paragraphs
are the check of the definition against those strings.

### BE-76 follows from BE-74 by a junction the tree already has

BE-74 displays `p_B = B² / (2 μ₀)`. Its edge target is `magnetic-pressure`,
and its `symbolic` form is that quotient, with `μ₀` written `1/(ε₀ c²)`.

BE-76 displays `β = 2 μ₀ n k_B T / B²`. Its edge is
`β = n k_B T / p_B`, with sources `carrier-density`, `temperature`, and
`magnetic-pressure`. The comment on that AST says substituting BE-74
yields the displayed quotient. The catalog `dependencies` array is
`[74]`, which records that the prose names BE-74.

Algebra: divide `n k_B T` by `B² / (2 μ₀)` and obtain
`2 μ₀ n k_B T / B²`. The dimension of both writings is the catalog
signature `[1]`. `composeSymbolic` has a junction: BE-74's target is a
source leaf of BE-76. This is a candidate the junction generator finds.
The ideal-gas product `n k_B T` is already the leaf structure of the
BE-76 edge. `CE-ideal-gas` (`P = N k_B T / V`) is not required for this
candidate. It would become a premise only if a derivation started from
`P` and `n = N/V` instead of from the edge as written.

PhysJS already records the same algebra on `PhysJS.PlasmaBeta.beta_eq`:
`p_B` is `PhysJS.MagneticPressure.pressure_eq`. That covers line is the
equation theorem. It is not yet a nested derivation object with an
`imports` list, so this note does not treat BE-76 as marked derived. A
derivation theorem would import `PhysJS.MagneticPressure.pressure_eq` and
state the displayed BE-76 quotient. The negative control already named
beside that theorem, using `B²/μ₀` in place of `B²/(2 μ₀)`, is the
mutation the numeric screen runs. That substitution is a different ratio.

### BE-69, BE-67, and BE-108 agree at one angle, and the theorems stay different

BE-67 displays `v_A = B / √(μ₀ ρ)`. BE-69 displays
`|ω/k| = √(c_s² + B² / (μ₀ ρ))`. BE-108 displays

```
v₊² = ½ [ c_s² + v_A² + √( (c_s² + v_A²)² − 4 c_s² v_A² cos²θ ) ]
```

Substitute BE-67 into the inlined quotient of BE-69:
`B² / (μ₀ ρ) = v_A²`, so BE-69's right-hand side is `√(c_s² + v_A²)`.
Set `cos θ = 0` in BE-108. The domain of that edge has `c_s² ≥ 0` and
`v_A² ≥ 0`, so the square root is `c_s² + v_A²`, and `v₊²` reduces to
`c_s² + v_A²`. The phase speeds agree.

The junction generator does not see this. BE-69's `symbolic` form inlines
`B` and `ρ`. It has no `alfven-speed` leaf. BE-108's source is
`oblique-alfven`, a different quantity from `alfven-speed`. The
subexpression generator sees BE-67 inside BE-69. The specialization
generator is what would connect that result to BE-108, and it is off in
the algorithm above.

`PhysJS.ObliqueMagnetosonic.phase_speed_eq` states the `θ = π/2` fast root
and the perpendicular values, and it states that this is a different
claim from the compressional polarization. `PhysJS.FastMagnetosonic.speed_eq`
is that polarization. The formula agreement is a candidate the report
would show. It is not a deletion of BE-69. The screen's mutation is the
one that theorem already names: `√(c_s² + v_A²)` disagrees with `c_s`,
with `v_A`, and with `c_s + v_A` when the other speed is nonzero.

### BE-20's density is a nested theorem on BE-13

BE-13 displays `R = 4Λ − (8π G / c⁴) T`. BE-20 displays
`ρ_Λ = c² Λ / (8π G)`. The manifest entry `be-13` carries
`PhysJS.Einstein.vacuum_density`: with `κ = 8πG/c⁴` and
`T_μν = −ρ c² g_μν`, the rearrangement is `ρ = c² Λ / (8π G)`, and the
opposite sign fails. The same entry's covers line says BE-20 has no
reference of its own. The catalog object for BE-20 has no `formalRef`.
A later pin that gives BE-20 its own reference leaves this paragraph as
the record of the reading it was checked against.

`composeSymbolic` does not connect them. The trace and the density are
different quantities, and the vacuum stress tensor is a premise, not a
leaf of BE-13's edge. The Lean statement is the derivation. A derivation
theorem for BE-20 imports `PhysJS.Einstein.vacuum_density` and states the
displayed BE-20 formula. The opposite-sign failure is the mutation.

### Two agreements that are not derivations

**BE-60 and BE-55.** BE-55 displays
`σ_xy = C e²/h`, `R_H = R_K/C`, `R_K = h/e²`, with `C` a nonzero integer.
BE-60 displays `σ_xy = ν e²/h` and `R_xy = R_K/ν = (q/p) h/e²`, with
`ν = p/q`. The catalog `dependencies` of BE-60 is `[55]`. Replacing the
letter `C` by the letter `ν` makes the algebra match. The side conditions
do not: an integer Chern number and a rational filling factor are
different premises, and `PhysJS.Laughlin.filling_fraction` says the
oddness of `q` is the Laughlin selection rule and is a different
statement from the identity. BE-60 stays a generator. The `dependencies`
entry stays a prose mention.

**BE-57 and BE-42.** BE-42 displays `T_H = ℏ c³ / (8π G M k_B)`. BE-57
displays `T = ℏ a / (2π c k_B)`, and its `dependencies` array is `[42]`.
Substituting `a = c⁴ / (4 G M)` produces `T_H`.
`PhysJS.HawkingUnruh.dictionary` is a cross-check of that dictionary, and
it records that `a = c⁴ / (2 G M)` does not yield `T_H`. The cross-check
is one manifest entry on `be-42`. BE-57 has no theorem key of its own.
Deleting BE-57 would delete the Unruh law. The dictionary stays a
cross-check.

### A named dependency the substitution fragment does not discharge

BE-73 displays `Π = S T`. BE-83 displays `μ_T = T dS/dT`. The catalog
`dependencies` of BE-83 is `[73]`. The BE-83 edge multiplies temperature
by a Seebeck slope. Peltier coefficient is not a leaf, so
`composeSymbolic` has no junction. `PhysJS.Thomson.thomson_eq` imports the
Kelvin relation along temperature and the split `μ = dΠ/dT − S`, and the
product rule yields `μ = T dS/dT`. The product rule is outside the
fragment this note defines. The report can cite the covers line. It
cannot mark BE-83 derived unless Daniel adds differentiation and names
the Thomson split as a premise.

### Grouping by linking constant

These are the catalog ids whose displayed `formula_latex` contains the
constant, after the false friends below are removed. They illustrate the
linking-constant graph. They are not a generating set, and they are not a
ledger the pass reads back.

| Constant | Ids |
|---|---|
| `ℏ` | 11, 12, 21, 23, 26, 42, 56, 57, 63, 96, 135, 136, 140, 141 |
| Planck `h`, displayed apart from `ℏ` | 12, 55, 59, 60, 102 |
| `k_B` | 12, 15, 16, 21, 23, 27, 29, 34, 42, 57, 58, 61, 62, 65, 70, 76, 82, 87, 90, 91, 92, 93, 99, 101, 103, 109, 116, 121, 122, 127, 134, 138, 139 |
| elementary charge `e` | 23, 55, 59, 60, 61, 75, 81, 82, 85, 96, 97, 102, 105, 116, 137, 141, 143 |
| `c` | 13, 17, 19, 20, 34, 36, 37, 42, 51, 52, 56, 63, 64, 66 |
| Newton `G` | 13, 17, 19, 20, 37, 42, 51, 52, 54, 63, 64, 65, 118 |
| `ε₀` | 79, 81, 105, 116, 137 |
| `μ₀` | 67, 69, 74, 75, 76, 93, 94, 109, 117, 120 |
| Avogadro `N_A` | none |

`Φ₀` is the displayed symbol of BE-142. The definition `Φ₀ = h/(2e)` ties
that row to the `h` and `e` rows, in particular BE-96 (`B_c2 = ℏ / (2 e ξ²)`)
and BE-141 (`L_J = ℏ / (2 e I_c)`). Those three share the flux quantum.
None of the three displays is a substitution of another.

False friends a latex scan picks up and this table leaves out:

| Id | The token | What it is |
|---|---|---|
| 52 | `e` | Eccentricity in `(1 − e²)`. |
| 62 | `e^{γ}` | `exp(γ)` in the BCS gap ratio. |
| 63 | `μ_e` | Electrons per nucleon. The `ℏ`, `c`, and `G` in that formula stay in the table. |
| 103 | `T_e` | Electron temperature in the Bohm threshold. |
| 131 | `c`, `e_wall` | Pipe wave speed and wall thickness in the Joukowsky formula. |
| 138 | `N_A` | Acceptor density. |
| 139 | `m_e*`, `m_h*` | Effective masses. The `k_B` in that formula stays. |
| 53 | `G` | The gauge group in `C_2(G)`. |
| 102 | `G` | Conductance. The `e` and `h` in that formula stay. |
| 106 | `ω_c` | A cyclotron frequency in the R-wave cutoff. |
| 118 | `c_s` | A sound speed. Newton `G` in `r_c = G M / (2 c_s²)` stays. |
| 126 | `h` | Comb-finger height. |
| 129 | `h` | A convection coefficient. |
| 40 | `h` | The Higgs field in `V(h)`. |

## Open questions for Daniel

1. **Fragment.** Is derivable limited to junction substitution,
   subexpression replacement, field operations, and the fixed definitions?
   Does the fragment also include specialization of a parameter, and the
   product rule that BE-83 needs?
2. **Canonical premises.** May `CE-ideal-gas` and the other canonical
   equations be premises, or only catalog bridges plus the fixed
   definitions?
3. **Identifications.** The pass will propose junctions it cannot form
   because the quantity names differ (`alfven-speed` and `oblique-alfven`).
   Does a proposal wait for a reviewed `QuantityIdentification`, with the
   candidate excluded until then?
4. **Tie-break.** Is the order established-over-speculative, family over
   specialization, cross-domain over standard, fewer constants, then
   smaller id, the order to use? Rules 2 and 3 conflict when a standard
   family generates a cross-domain specialization.
5. **`type`.** Is the label taken from the dogfood proposal, even when a
   reading of `bridges` would say otherwise?
6. **Minimality.** Is the greedy set, labeled as not proved minimum,
   enough? Is a later exact solver in scope?
7. **Release.** May the owner skip the report and tag, with a sentence in
   the release note, or does an unclassified id block the tag?
8. **BE-20.** The density is already `PhysJS.Einstein.vacuum_density` on
   `be-13`. Should the first derivation theorem be an import of that
   nested theorem onto BE-20, and is that import enough to set
   `derivedFrom`?
9. **Direct proofs.** Does the equation theorem stay beside the derivation
   theorem, as this note says, or does a pinned derivation replace it?
10. **Schema.** `type` is required at `schemaVersion` 3. Do `derivedFrom`
    and `basis` stay optional, and does the manifest stay
    `physjs-bridge-manifest/v1` with one new nested object? Is `derivedFrom`
    the `be-<n>` key, rather than the integer spelling `dependencies`
    already uses?
11. **Avogadro.** Confirm that Avogadro's number and the Faraday constant
    stay outside the linking-constant graph until a catalog formula
    displays them.

## API and version

No public name is added or removed by this note. `package.json` is
unchanged.

`CatalogEntry` requires `type` and leaves `derivedFrom` and `basis`
optional. A reader treats a missing `derivedFrom` or `basis` as unclassified.
A missing `type` is a rejected record. `deriveEvidence`, `catalogEvidenceInput`,
and the evidence tags are unchanged, because a derivation is a reduction and
a reduction lights no tag. `type` does not light a tag.

The catalog file is `data/bridge-catalog.json` at `schemaVersion` 3.
`derivedFrom` and `basis` remain optional in that schema.

No new CLI command is part of this note. A report file is the output.
If a later task exports a TypeScript type for the report, that export is
additive and is named in that task.

The release that first ships the fields is the owner's tag, after the
UPT pull request that contains the generated fields has merged. This note
does not choose the version number.
