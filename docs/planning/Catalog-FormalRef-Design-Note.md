# Catalog `formalRef`

This note is the record milestone 3 of
[`docs/design/roadmap-lean-proven-bridges.md`](../design/roadmap-lean-proven-bridges.md)
deferred: how a PhysJS theorem is keyed to a catalog id. The statements
that would use it are milestone 2b of that roadmap. This note changes no
code, no catalog name, no canonical entry, and no cell of the composition
table. Approval, and what has landed, are recorded outside this file.

The shape is the one already in use. `FormalRef` is `src/atlas/types.ts`.
The manifest entry is `formal/physjs/manifest.json`, copied by
`src/atlas/physjs-ref.ts`. The Phase 4 design snippet is the earlier
shape: it has no `covers` field and no `lean4-physjs` system. This note
follows the type and the manifest.

## The record

A reviewed reference has these fields, and no others:

| Field | What it holds |
|---|---|
| `system` | `lean4-physjs` for a PhysJS theorem |
| `statement` | One Lean theorem name, as the manifest's `theorem` |
| `version` | The PhysJS commit, toolchain, Mathlib pin, and Physlib pin, in the manifest's existing version string |
| `axioms` | The axioms `#print axioms` printed for that theorem |
| `fidelity` | `unreviewed` until a sanity-lemma test exists; a reviewed catalog reference uses `sanity-lemmas`, as the manifest's atlas entries do |
| `covers` | The part, then the fixed phrase below |

The manifest keeps the fields it already has.

| Manifest field | What it holds |
|---|---|
| `key` | Unique, and equal to `bridgeId`. A second statement does not get a second key |
| `bridgeId` | The catalog id this theorem is about |
| `theorem` | Same string as `FormalRef.statement` |
| `covers` | The part, beginning with one kind word |
| `coverage` | The fixed phrase `covers its statement only` |
| `leanProof` | `complete` only when the proof has no `sorry` |
| `axioms` | Same list as the reference |
| `imports` | Present when the theorem imports a Physlib lemma, as the pendulum entry does |

`FormalRef.covers` is the manifest's `covers` and `coverage` joined by
` — `, which is how `physjsFormalRef` already builds the string. The gate
requires both pieces. This note adds no field.

`deriveEvidence` lights `formally-proved` only when `kind` is `bridge` and
`fidelity` is other than `unreviewed`. A property lights
`formally-proved-property`. A cross-check lights
`formally-proved-cross-check`. A reduction, a limit, and a derivation-step
light none of the three. `deriveEvidenceForVerdict` is the same predicate
for a catalog row. A catalog id is not passed to either predicate. Storing
a `formalRef` on `BridgeEquationEntry` or on `CanonicalEquation` does not
light a tag. The catalog reference lives in the atlas overlay
`catalogFormalRef`, not as a second copy on the row. The covers word says
which kind occupies the reference, except for the two cases in the Kinds
section.

## Keying

A bridge-equation id is `be-<n>`, the graph id (`be-13`), not the integer
`13` and not `BE-13`. A canonical id is `CanonicalEquation.id`
(`CE-einstein-field-eq`). `bridgeId` is that id. `key` equals `bridgeId`.
There is no `#` part key and no pair key.

One catalog id has at most one UPT `formalRef`. That reference names the
entry's top-level `theorem` and nothing else.

## Several statements for one id

The manifest schema stays `physjs-bridge-manifest/v1`. A second Lean
statement about the same id is a nested object on that same entry. The
object has `theorem`, `covers`, `coverage`, `leanProof`, and `axioms`. It
has no `key` and no `bridgeId`. Its `covers` line is its own part. It does
not replace the top-level `theorem`.

This is the shape PhysJS pull request 4 records. Each of the five rank-1
entries keeps
`covers_bound_delta` as `theorem` and records
`planeWave_iff_dispersion` under `planeWave`. A second top-level key would
not equal the bridge id. Replacing `theorem` would change the covers line
milestone 1 leaves in place. Pointing the UPT reference at
`planeWave.theorem` is a later change. This note does not make it. Pull
request 5 adds `ab-kg-oscillator` as one entry with one
theorem and no nested object.

The checker in `src/atlas/physjs-ref.ts` compares the top-level theorem
with the reference. It does not read a nested object. A nested statement
is recorded in PhysJS and is not a second `formalRef`.

A catalog id with two counted statements uses the same shape. For BE-53
the top-level theorem is the sign of `b₀`, and the one-loop solution is
the nested object `oneLoop`. The reference, when it is attached, names
the top-level theorem only. The milestone row is done only when both
statements are recorded. Each covers line claims its own part.

A property or a cross-check is copied into the vendored manifest and may
occupy the one catalog `formalRef`. The first word of `covers` is the
kind. `property` and `cross-check` are not `reduction`, `limit`, or
`derivation-step`, so a reader can tell them from a counted statement.
A cross-check of two ids is one entry. `bridgeId` is one of those ids, and
`covers` names the other. `be-42` names BE-57 and the edge `be-42-via-rs`.
`be-19` names BE-54. The named partner does not get a second key. If that
id later gains a counted theorem, the counted theorem becomes the
top-level `theorem` and the cross-check moves to a nested object.

## Coverage

Every manifest entry and every `formalRef` states which part of the bridge
the proof certifies. The `covers` line begins with one of these words:

| Word | The proof certifies |
|---|---|
| `reduction` | A reduction of one encoded statement to another |
| `limit` | A limit of an encoded family |
| `derivation-step` | One step of a derivation, premises included |
| `property` | A property of an encoded statement |
| `cross-check` | Agreement of two encodings under a stated dictionary |

The line then says what is included and what is left out. It ends, in the
joined `FormalRef.covers` string, with `covers its statement only`.

A proof of one part never tags the bridge `formally-proved`. The coverage
line is not a whole-bridge claim. `catalogEvidenceInput` passes a
kind-`bridge` reference and does not pass a reduction, a limit, a
derivation-step, a property, or a cross-check. Milestone 1's atlas lines
stay as they are. This rule is the catalog case of that schedule's
conflict 2.

## Kinds

Three kinds. They are not one count. Each may occupy the one catalog
`formalRef`. The first word of `covers` is the kind, with two exceptions.
Where the theorem states the catalogued equation, the kind is `bridge`
and the covers line stays the text PhysJS wrote, including a line that
still begins with `derivation-step`. Where the id is `be-28`, the kind is
`property` even though the covers line begins with `derivation-step`: the
theorem is non-negativity of the defining sum, not the variational
principle. A theorem that proves a weaker or partial statement keeps the
covers word. Passing a `bridge` reference to `deriveEvidence` lights
`formally-proved`. `catalogEvidenceInput` passes that kind and does not
pass a derivation-step, a property, or a cross-check, so those kinds do
not light the tag.

**Counted reduction, limit, or derivation-step.** The `covers` word is
`reduction`, `limit`, or `derivation-step`. One id is one reference. The
rows and their sizes are milestone 2b. This kind is not a `property` and
not a `cross-check`.

**Cross-check.** The word is `cross-check`. A substitution or a
relabelling is a dictionary. These rows fail if a prefactor or a sign is
wrong, which is why they are proved. They are not the counted kind.
Scoping §4.3's do-not-count recommendation applied to counting them as
that kind. Each entry carries a negative control: the assertion fails on
a stated wrong dictionary. The control is part of the manifest entry, not
a separate id. A cross-check of two ids is one entry. The covers line
names the partner. The partner does not receive a second reference.

**Property.** The word is `property`. Scoping §4.2 withheld a
property-level reference because `deriveEvidence` would attach
`formally-proved` to the whole record. `catalogEvidenceInput` does not
pass a property, so the tag stays off, and the covers word keeps the
property from reading as a reduction, a limit, or a derivation-step. The covers
line says which property, and what is left out. BE-16 is the equal-levels
entropy `k_B log 2`, not Landauer's bound `E ≥ T ΔS` and not the Bérut
confrontation. BE-29 is `⟨W⟩ ≥ ΔF` by Jensen's inequality, not Jarzynski's
equality. BE-11 is trace and Hermitian preservation for one channel of
the displayed GKSL generator, not Born–Markov coarse-graining and not the
encoded rate `γ(λ)`.

Milestone 3's Buckingham monomials use this note's key and coverage rule.
The covers line is the exponent tuple: form, not the prefactor. A decoy
row is the negative control. They are not milestone 2b rows, and this note
does not move them.

## Names

The ids stay `be-36` and `be-38`. Neither module file is renamed.

### BE-36 is framing

`formula_latex` is `|c_GW − c| / c ≤ 10^{-15}`. The module encodes the
signed ratio `(c_GW − c) / c`. The `name` is `MOND - Dark Matter
Interpolation Function (TeVeS relativistic MOND)`. That title is the
bridge framing the record already documents: `known_issues`, `notes`, and
the status paragraph in `docs/specification/Part-II.md` keep the TeVeS
action as the framing and the GW170817 ratio as the encoded scalar. The
spec heading already pairs that framing with the bound (`MOND / TeVeS —
GW170817 graviton-speed bound`). The catalog `name` is the framing alone.
This note does not rename BE-36. The bound is a measured number and is not
a milestone 2b target.

### BE-38 rename

The catalog name and the Part II heading are `Milgrom MOND interpolation ν(z)`.
The sentences below are the rename as specified. `formula_latex` is
`F = F_N · ν(z)` with `ν(z) = √((1 + √(1 + 4/z²)) / 2)` and
`z = F_N / (m a_0)`. The module encodes that force. When this note was written, the `name` and the
spec heading were `Entropic Gravity Correction Term`. `context` is
`Verlinde's emergent gravity with dark matter effects`. The formula is
Milgrom's `ν`, not an entropic correction. Proposed name: `Milgrom MOND
interpolation ν(z)`. Verlinde stays in `references` and in the framing
notes. The `bridges` pair `[information, gravity]` is that framing. This
rename does not change the pair.

`data/bridge-catalog.json` is regenerated from `src/bridges/index.ts`
(`bun run catalog:json`). The implementing change edits the TypeScript
and regenerates the JSON.

| File | What the rename changes |
|---|---|
| `src/bridges/index.ts` | `name` of id 38 |
| `data/bridge-catalog.json` | Regenerated from that file. Not hand-edited |
| `docs/specification/Part-II.md` | The Bridge Equation 38 heading |
| `src/bridges/equations/be-38-mond.ts` | The `@see` line that quotes `Entropic Gravity Correction Term` |
| `tests/bridges/be-38-reformulation.test.ts` | The header comment and the `describe` title. The test does not assert `name` |
| `docs/architecture/bridge-coverage-audit.md` | The row-38 display name `Entropic Gravity / MOND interpolation` |

A history file keeps the name it recorded.

| File | Why it stays |
|---|---|
| `CHANGELOG.md` | The reformulation note uses the old heading |
| `docs/planning/Bridge-Remediation-Plan.md` | Dated remediation row for id 38 |
| `docs/architecture/archive/v0.7-unknown-unknown-bridges-inventory.md` | Archived inventory row |
| `docs/architecture/archive/bridge-audit/bridge-catalog-current.json` | Archived catalog snapshot |
| `docs/architecture/archive/bridge-audit/categorization-batch-2.json` | Archived finding |
| `docs/architecture/archive/bridge-audit/verdict-table.json` | Archived verdict |
| `docs/architecture/archive/bridge-audit/prompts/be-38.txt` | Archived prompt |
| `docs/architecture/archive/bridge-audit/responses/be-38-adam.txt` | Archived review |
| `docs/architecture/archive/bridge-audit/responses/be-38-eve.txt` | Archived review |

### BE-38 deep-MOND limit, a prerequisite

`PhysJS.Mond.tendsto_nu_limits` is the catalog reference, kind `limit`. It states `ν √z → 1`, not `ν → √(2/z)`. The prose correction named in `ACTIVE.md` has landed. The arithmetic below is why the old comment is not the theorem. The encoded
formula and the evaluator are the function below. The comment is not.

```
ν(z) = √( (1 + √(1 + 4/z²)) / 2 )
```

For `z → 0⁺`, `√(1 + 4/z²) = (2/z) √(1 + z²/4)`, so
`(1 + √(1 + 4/z²)) / 2 = 1/z + 1/2 + O(z)` and `ν(z) ~ 1/√z`.
Equivalently `ν(z) √z → 1`. The comment `ν → √(2/z)` is `√2 / √z`,
larger by `√2`.

Computed from the encoded formula at `z = 10^{-6}`: `ν = 1000.00025`,
`1/√z = 1000`, and `√(2/z) = 1414.213562`. At `10^{-2}`, `10^{-4}`, and
`10^{-8}`, `ν(z) √z` is `1.00250`, `1.000025`, and `1.000000002`.

`src/bridges/equations/be-38-mond.ts` line 113 states both
`ν → √(2/z)` and `F → √(F_N · m · a_0)`. Those two clauses disagree. The
force clause is what `ν ~ 1/√z` gives, with `z = F_N / (m a_0)`:
`F → √(m · F_N · a_0)`. The `ν` clause would multiply that force by `√2`.
`docs/specification/Part-II.md` line 342 repeats both clauses. The
evaluator and `tests/bridges/be-38-encoding.test.ts` follow the formula
and the force `√(m · F_N · a_0)` (the test uses `m = 1`). They do not
assert `√(2/z)`.

The catalog sentence `F → √(F_N a_0)` drops `m`. It appears in the
known-issue text and the notes of id 38 in `src/bridges/index.ts`, and in
`docs/specification/Part-II.md` at the status paragraph, the `μ(x)`
sentence, and the historical-form paragraph. With `m = 1` the dropped
factor is invisible. The theorem uses `√(m · F_N · a_0)`.

The prose fix named above corrected those sentences before the Lean proof was
attached. The limit reference is now attached. The fix does not change the formula, the evaluator, or the encoding
test. History files that quote the old sentence stay, including
`CHANGELOG.md`, `docs/planning/Bridge-Remediation-Plan.md`, and
`docs/architecture/archive/bridge-audit/`. The prose fix does not clear
the SPARC confrontation.

## Open questions

The schedule's confirmation questions are the open questions in the
roadmap. The catalog rule for a property and a cross-check is the kinds
section above. The dated decision is recorded outside this file.
