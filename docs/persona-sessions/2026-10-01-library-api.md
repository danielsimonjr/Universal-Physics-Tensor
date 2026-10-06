# Library API dogfood — three personas, 2026-10-01

Model-persona session on master `c9fbc0bb` (the Lean-feasibility triage, #248). Not an independent human review. Bun 1.4.2, Node 22.14.0, `bun install --frozen-lockfile`, `bun run build`. Scripts import the built package entry (`dist/index.js`) and the `universal-physics-tensor/atlas` subpath (`dist/atlas/index.js`). `src/` was not edited.

The repro is `node docs/dogfood/2026-10-01/repro.mjs` after a build. It prints the counts this report cites.

This round follows the 2026-09-29 CLI dogfood (`docs/dogfood/2026-09-29-applied-physicist.md`, `docs/dogfood/2026-09-29-gr-qft.md`, `docs/dogfood/2026-09-29-engineering-physicist.md`) and does not re-run that CLI surface except where a library result has to be compared with a command. Those three reports' CLI fixes are still in place where rechecked: `upt map --equation-only --equation "period = 2*pi*sqrt(length/gravity)"` exits 0, dimension `[time]`, and agrees with `CE-pendulum-period`. `upt atlas ab-spring-lc` prints the PhysJS statement, the commit, the fidelity, and the covers line.

## What worked

Checked against the exported constants by a second arithmetic path, `HBAR_SI * C_SI**3 / (8 π G_SI M_SUN_SI K_B_SI)`.

- Solar-mass Hawking temperature from `BridgeEquations.hawkingTemperature({ M_kg: M_SUN_SI })` is `6.168429716410344e-8` K. The hand product of the exported constants is the same number. The module's textbook bracket `6.17e-8` K is that value to three figures.
- `composeEdges(be42Edge, be16Edge).evaluate({ mass: M_SUN_KG })` is `5.903143823302079e-31` J, confidence `highly-speculative`. The README's `≈ 5.9e-31 J` matches.
- `evaluateBridge(51, { M_kg: 1.989e30, b_m: 6.96e8 })` returns `1.7509550043330613` arcsec. Mercury-like `evaluateBridge(52, …)` returns `43.00117615238407` arcsec/century. Casimir at `100e-9` m is `-13.001257732443657` Pa. Unruh at `9.80665` m/s² is `3.9766098387194957e-20` K.
- `validateEquation` accepts `F = m a` and reports `[force]`. Adding energy to length throws `DimensionMismatchError`: `Cannot add unlike dimensions: [energy] + [length]`. `validate` on `sin` of a dimensionless symbol is `ok`. `exp` of a length is refused: `transcendental 'exp' requires a dimensionless argument`.
- `toGeometrized(1, LENGTH)` is `1` and round-trips. A charge dimension throws `NonGeometrizableDimensionError` and names the nonzero `I` exponent.
- Catalog status counts match the README development-status row: 55 entries, 19 `established`, 33 `speculative`, 3 `highly-speculative`. Canonical registry length is 109. `CATALOG_GRAPH` length is 41.
- Catalog `formalRef` covers prefixes match `NOTES.md`: 3 `property`, 3 `cross-check`, 1 `reduction`, 2 `limit`, 6 `derivation-step` (15 references). The catalog path `catalogEvidenceInput` then `deriveEvidence` lights `formally-proved` on none of them. Ten atlas bridges derive `formally-proved` from a reviewed reference, and none derive it without a reference.
- The vendored `formal/physjs/manifest.json` and PhysJS `manifest/bridges.json` at `57a9ecbc851952d539882400a7176926d2990d34` have the same 25 keys, theorems, and covers lines. The UPT copy adds the `commit` field. The named theorems are present in the Lean files at that commit (`PhysJS/Landauer.lean` `equal_levels`, `PhysJS/HawkingUnruh.lean` `dictionary`, `PhysJS/Eddington.lean` `balance_iff`, and the siblings fetched with them).
- A consumer package with `"universal-physics-tensor": "file:<clone>"` typechecks under `tsc --strict --module nodenext` and runs. Hawking temperature and the 15 catalog references are visible from that import.
- Missing and non-positive inputs are specific. `evaluateBridge(51, { M_kg })` names `b_m`. `evaluateCasimir` at `d_m: 0` says the separation must be `> 0`. `evaluateHawkingTemperature` rejects `-1`, `0`, and `Infinity`.

There is no `Functor` export. Catalog `category` is a letter A–O (a filing label). Relation composition is `composeRelation` / `COMPOSITION_TABLE` on the atlas subpath: `approximation` with `approximation`, and `structural-analogy` with `derivation`, both return `no-composite-claim`. Part V's functor `F : 𝒫 → ℋ` stays the speculative section its own status note describes.

## Findings, easiest first

Effort is the size of the change that would close the finding: a sentence, a guard, or a decision about which claim a tag covers. Severity is what a reader trusts if it stays.

### 1. README membership count is 36

- **Persona.** Engineering physicist, checking the README against `adjudicateCatalog`.
- **Repro.** `adjudicateCatalog(BRIDGE_EQUATIONS)` returns 47 `bridge`, 5 `not-a-bridge` (`28, 29, 32, 35, 40`), 3 `unadjudicated` (`44, 46, 50`).
- **Expected.** The README sentence that quotes the criterion matches that return.
- **Actual.** README "Composing Bridges" still says "36 bridges · 5 not-a-bridge · 3 contested". The 5 and the 3 match. The 36 does not. The API word is `unadjudicated`; the README word is `contested`.
- **Severity.** Low.
- **Suggested fix.** Replace 36 with 47, or stop embedding the count and point at `adjudicateCatalog`. Use `unadjudicated` for the third bucket.
- **Effort.** Small.

### 2. The TypeScript badge says 6.0+

- **Persona.** Engineering physicist, reading the README before installing.
- **Repro.** README badge text is `TypeScript-6.0+`. `package.json` `devDependencies.typescript` is `^7.0.2`. This clone installed `typescript@7.0.2`.
- **Expected.** The badge names the compiler the repo pins.
- **Actual.** The badge says 6.0+.
- **Severity.** Low.
- **Suggested fix.** Point the badge at TypeScript 7.
- **Effort.** Small.

### 3. The dimensional README describes a smaller catalog and an AST that no longer exists

- **Persona.** Engineering physicist, following `src/dimensional/README.md` to encode a formula.
- **Repro.** The README says the catalog has 44 entries, ids 11–54, and that the AST has no `exp` / `log` / `sin` primitives, so a transcendental must be a dimensionless stub symbol. `BRIDGE_EQUATIONS.length` is 55, ids 11–65. `validate({ kind: 'transcendental', fn: 'sin', arg: dimensionless })` is `ok`.
- **Expected.** The README's encoding recipe matches the validator.
- **Actual.** A reader who follows the stub recipe hides a check the validator already performs. The catalog paragraph is two generations behind the development-status table.
- **Severity.** Medium.
- **Suggested fix.** Describe the `transcendental` node and the 55-entry catalog. Leave counts that move to `NOTES.md` if this file is meant to stay stable.
- **Effort.** Small.

### 4. `examples/basic-usage.ts` does not run

- **Persona.** Applied physicist, starting from the examples directory after the README snippet.
- **Repro.** `node examples/basic-usage.ts` exits 1: `Unknown file extension ".ts"`. The file imports `../src/index.js`. That path is `src/index.ts` until `tsc` emits `dist/index.js`.
- **Expected.** The checked-in example runs with the command the README's Node path already uses, or the file says it is a snippet and not a script.
- **Actual.** Node rejects the file. The README snippet itself, imported from the package name in a consumer project, does run (finding 10's consumer).
- **Severity.** Low.
- **Suggested fix.** Import from `universal-physics-tensor` and document `node --experimental-strip-types`, or compile the example in the documented setup.
- **Effort.** Small.

### 5. ACTIVE.md still describes a README table that already has a formal-reference row

- **Persona.** Theoretical physics student, using ACTIVE.md as the live ledger and the README as the status table.
- **Repro.** ACTIVE.md open task: "Add atlas, formal-reference, Lean, and PhysJS rows to the Development Status table… That table currently records the catalog, confrontations, composition, canonical equations, architecture, and quality gates." README Development Status already has a "Formal references" row with the 10 / 9 / 3 / 3 split.
- **Expected.** The open task describes the table a reader sees.
- **Actual.** The "currently" clause is stale. One combined row exists. The task's request for separate atlas, Lean, and PhysJS rows may still be open; the description of the table is not.
- **Severity.** Low.
- **Suggested fix.** Restate the task as the remaining gap (separate rows, or none) or check it off if the combined row is the intended close.
- **Effort.** Small.

### 6. ROADMAP Phase 4 still specifies `lean4-physlib` and no `covers`

- **Persona.** Theoretical physics student, reading the phase deliverable before the records.
- **Repro.** `ROADMAP.md` Phase 4 deliverable: `formalRef?: { system: 'lean4-physlib' | …; statement; version; axioms; fidelity }` with no `covers` field. The running type in `src/atlas/types.ts` is `'lean4-physlib' | 'lean4-physjs' | 'other'` and requires `covers`. Every shipped reference is `system: 'lean4-physjs'` and carries `covers`.
- **Expected.** The deliverable shape is the shape a caller reads off `BRIDGE_EQUATIONS[i].formalRef`.
- **Actual.** The deliverable omits `lean4-physjs` and `covers`, which is the field that distinguishes a counted line from a property. The phase-status cell later in the same file has the 10 / 9 / 3 / 3 split. Section 1 of the roadmap still says the formal layer is "None"; that section labels itself as the 2026-09-20 baseline.
- **Severity.** Medium.
- **Suggested fix.** Already the first open task in `ACTIVE.md`. Correct the deliverable type. Leave the dated baseline labeled as a baseline.
- **Effort.** Small.

### 7. A very small mass returns a non-finite Hawking temperature

- **Persona.** Applied physicist, scanning a mass range.
- **Repro.** `BridgeEquations.hawkingTemperature({ M_kg: 1e-300 })`.
- **Expected.** A non-finite result is the same class of refusal as a non-finite input. `M_kg: Infinity` already throws `RangeError`.
- **Actual.** The call returns `Infinity` and does not throw. `M_kg: 1e-200` still returns a finite `1.2269006705940172e223` K. JSON serialization of the `Infinity` return is `null`, so a caller who logs JSON records a missing temperature.
- **Severity.** Medium.
- **Suggested fix.** Refuse a non-finite output with the same `RangeError` the input check already uses.
- **Effort.** Small.

### 8. `GM_SUN_SI` is not on the public root

- **Persona.** Applied physicist, repeating the 2026-09-29 solar-mass check from a library import.
- **Repro.** Root exports include `G_SI` and `M_SUN_SI`. They do not include `GM_SUN_SI` (`src/core/constants.ts` exports it; the root barrel does not). `G_SI * M_SUN_SI` is `1.32751827e20`. `GM_SUN_SI` is `1.3271244e20`. Relative difference `(product - GM_SUN_SI) / GM_SUN_SI = 2.967845365512661e-4`. Mercury perihelion through `evaluateBridge(52)` with `M_kg: 1.989e30` is `43.00117615238407` arcsec/century, the G×M☉ figure from the 2026-09-29 applied report.
- **Expected.** The IAU GM parameter the CLI dogfood asked for is reachable next to `M_SUN_SI`.
- **Actual.** The CLI gained `GM_sun` (2026-09-29 open item, since closed on the CLI). A root-import caller still multiplies `G_SI` by `M_SUN_SI` unless they import a non-exported module. Deep import of `dist/core/constants.js` is blocked by `package.json` `exports` (`ERR_PACKAGE_PATH_NOT_EXPORTED` from a consumer).
- **Severity.** Medium.
- **Suggested fix.** Re-export `GM_SUN_SI` (and the source string, if it is public) from the root, beside `M_SUN_SI`.
- **Effort.** Small.

### 9. The id-keyed evaluator does not know Hawking, and its error names a command that also does not

- **Persona.** Applied physicist, using the README's BE-42 example and then the id-keyed API.
- **Repro.** `BridgeEquations.hawkingTemperature({ M_kg: M_SUN_SI })` returns the temperature above. `evaluateBridge(42, { M_kg: M_SUN_SI })` throws `evaluateBridge: be-42 has no evaluator (only closed-form + spacetime bridges do — see \`upt evaluate\` with no args)`. `node bin/upt.mjs evaluate be-42 M_kg=1.989e30` prints that same sentence and exits 1. The registry covers 51, 52, and 55–65.
- **Expected.** The error names an entry point that evaluates BE-42, which is `BridgeEquations.hawkingTemperature`.
- **Actual.** Both the function and the CLI point at `upt evaluate`, which has no BE-42 evaluator. The facade and the registry are different sets, and the message describes only the registry.
- **Severity.** Medium.
- **Suggested fix.** Name `BridgeEquations.hawkingTemperature` in the error. Registering the remaining facade methods on `BRIDGE_EVALUATORS` is a larger follow-on; the message is the part that currently sends the caller to a command that fails the same way.
- **Effort.** Small for the message. Medium if every facade method is registered.

### 10. `npm install universal-physics-tensor` is not this master, at the same version

- **Persona.** Engineering physicist, following README Quick Start (`npm install universal-physics-tensor`).
- **Repro.** `npm view universal-physics-tensor version` is `0.47.1`, modified 2026-09-25. This clone's `package.json` version is also `0.47.1`. The published tarball's `dist/bridges/index.js` contains no `formalRef` and no `PhysJS` string. Importing the extracted package yields 55 bridges and zero formal references. Its canonical registry is two entries shorter than this tree. Its README development-status table has no Formal references row and states that shorter canonical count. A `file:` install of this clone exposes 15 catalog formal references and 109 canonical equations.
- **Expected.** The install command in the README yields the tree the README describes, or the README says the npm tarball lags the default branch and that formal references exist only on a clone.
- **Actual.** Quick Start installs a package whose version string matches master and whose contents do not. Publishing is an owner decision (`ACTIVE.md`). The doc gap is separate from that decision.
- **Severity.** High.
- **Suggested fix.** One README sentence: npm `0.47.1` (2026-09-25) has no PhysJS `formalRef`, and its canonical registry is two entries shorter than this tree; the formal-reference row describes the default branch. A version bump and publish stay with the owner.
- **Effort.** Small for the sentence. The publish is not a code task.

### 11. Unit conversion is not on the public export map

- **Persona.** Engineering physicist, converting `100 nm`, `1 Msun`, and `25 degC` inside a TS project.
- **Repro.** `src/dimensional/units.ts` exports `parseUnit` and `convertValue`. `src/index.ts` does not re-export them. From a consumer, `import 'universal-physics-tensor/dimensional/units.js'` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The 2026-09-29 CLI dogfood exercises those conversions through `upt eval`. The library caller has `toGeometrized` / `fromGeometrized` and the dimension algebra, and no parser for a unit string.
- **Expected.** The conversion the CLI documents is a function on the package the README tells a TS project to import.
- **Actual.** It is an internal module behind the exports map. A caller reimplements SI prefixes or shells out to the CLI.
- **Severity.** Medium.
- **Suggested fix.** Export `parseUnit`, `convertValue`, and `UnitError` from the root, with the affine-temperature and prefix rules the module comment already states.
- **Effort.** Medium. The functions exist; the work is the public contract and a test that a consumer import resolves.

### 12. `parsePhysics('e^2')` is Euler's number, with no note

- **Persona.** Applied physicist, writing a Coulomb factor the way the 2026-09-29 CLI session did.
- **Repro.** `await parsePhysics('e^2', {})` resolves and `format(dimension)` is `[1]`. No error, no note. On this clone the active parser is MathTS, so `e` is Euler's number. The 2026-09-29 applied report: `upt eval "e^2/(4*pi*eps0*r^2)"` exits 2 and names `e_charge`. That refusal is the CLI. `parsePhysics` is the library entry the same formula goes through.
- **Expected.** A bare `e` in a physics parser is the same refusal the CLI already prints, or the return carries the CLI's note that `e` is Euler's number and the charge symbol is `e_charge`.
- **Actual.** The expression is accepted as dimensionless. A Coulomb formula typechecks as a pure number.
- **Severity.** High.
- **Suggested fix.** Share the CLI's bare-`e` refusal (or its note) in `parsePhysics`, including the builtin-parser path where `e` is a free name rather than Euler's number. Do not unbind MathTS `e`.
- **Effort.** Medium. The CLI behavior is the spec; the library entry does not call it.

### 13. Catalog formal references are easy to misread and hard to open

- **Persona.** Theoretical physics student, looking up whether a `be-*` claim is a counted proof, a cross-check, or a property.
- **Repro.**
  - `BRIDGE_EQUATIONS` entries carry `formalRef` with `statement` (`PhysJS.Landauer.equal_levels`), `version` (`physjs@57a9ecbc… leanprover/lean4:v4.34.1 mathlib:v4.34.1 physlib@af484f78…`), `fidelity: 'sanity-lemmas'`, and a `covers` string. The object has no `url` and no `kind`. The kind is the prefix of `covers` (`property:`, `cross-check:`, `reduction:`, `limit:`, `derivation-step:`). Atlas covers lines do not use that prefix (`the oscillator dictionary — covers its statement only`).
  - `import { atlas } from 'universal-physics-tensor'` exposes `composeRelation`, `COMPOSITION_TABLE`, bounds, and `regimeHolds`. It does not expose bridges, `deriveEvidence`, or `ATLAS_FAMILIES`. Those are on `universal-physics-tensor/atlas`, which `src/atlas/index.ts` marks `@internal`. `docs/architecture/API.md` has no `formalRef` or PhysJS section.
  - `node bin/upt.mjs atlas be-16` exits 1: `unknown bridge 'be-16'`. `upt atlas ab-spring-lc` does print the reference. Catalog ids are not atlas ids.
  - BE-13's `name` is `Information-Geometry Equation (Jacobson 1995 thermodynamic derivation)`. Its covers line begins `reduction: contracting G_μν + Λ g_μν = κ T_μν in four dimensions gives R = 4Λ − κ T, not Jacobson's thermodynamic derivation`.
  - PhysJS at the pinned commit, module docs: `PhysJS/Landauer.lean` says `` `be-16`, the `ln 2` only. Property. Not a formalRef. `` `PhysJS/Lindblad.lean` and `PhysJS/Jarzynski.lean` say `Property. Not a formalRef.` `PhysJS/HawkingUnruh.lean`, `PhysJS/Fret.lean`, and `PhysJS/QuantumBounce.lean` say the entry is a cross-check and not a formalRef. The theorem docstrings say "Covers the property" or "Covers the cross-check", which matches the UPT covers line. The module comment denies the reference UPT stores.
- **Expected.** A reader can open the Lean file from the reference, and the file, the covers line, and the catalog name agree on whether the reference is a counted proof, a cross-check, or a property. `upt atlas be-16` either prints that reference or says to read `BRIDGE_EQUATIONS` id 16.
- **Actual.** The covers prefix on the UPT object matches `NOTES.md` and the PhysJS manifest. The Lean module comment says the property and the cross-check are not a `formalRef`. The BE-13 name claims the derivation the covers line excludes. Nothing in the object is a URL. The root `atlas` namespace and `upt atlas be-NN` do not show catalog references. `docs/architecture/API.md` does not mention them.
- **Severity.** High.
- **Suggested fix.** Add `kind` and a permalink (`https://github.com/danielsimonjr/PhysJS/blob/<commit>/PhysJS/<Name>.lean`) on `FormalRef`. Point `upt atlas be-16` at the catalog entry. Add a short API.md section. In PhysJS, change "Not a formalRef" to the 2026-10-01 ruling: it is a catalog `formalRef` of kind `property` or `cross-check` and does not light `formally-proved`. Rename or footnote BE-13 so the name does not claim Jacobson's derivation.
- **Effort.** Small for the URL, the CLI hint, the API.md paragraph, and the PhysJS module comments. The BE-13 name is a catalog-identity edit and needs the same care as the BE-38 rename.

### 14. `deriveEvidence` lights `formally-proved` on every reviewed reference, including a property

- **Persona.** Theoretical physics student, checking the tag the README says catalog references do not light.
- **Repro.** `docs/dogfood/2026-10-01/repro.mjs`. For each catalog entry with a `formalRef`, `deriveEvidence({ formalRef }, NO_PASSING_WITNESSES)` returns `['formally-proved']`. That includes `be-11` (`property`), `be-42` (`cross-check`), and `be-64` (`derivation-step`): all 15 ids. `catalogEvidenceInput(entry)` drops `formalRef`, and `deriveEvidence` on that input returns `['proposed']` for all 15. `catalogEvidenceInput` is exported from `dist/atlas/derive-evidence.js` and is not on the `universal-physics-tensor/atlas` barrel (`barrelExportsCatalogEvidenceInput: false`). The barrel does export `deriveEvidence`.
- **Expected.** The predicate that defines `formally-proved` implements the owner ruling in `ACTIVE.md` and the README row: a property and a cross-check do not light the tag, and a counted catalog reference (reduction, limit, derivation-step) does not either. The safe catalog wrapper is on the same barrel as the predicate.
- **Actual.** Any caller who passes a catalog `formalRef` into the exported predicate marks a property as formally proved. The catalog's own call path avoids that by omitting the field. The omission is not visible on the barrel a subpath import sees. Fidelity `sanity-lemmas` is shared by atlas proofs and by catalog properties, so fidelity does not distinguish them. Only the covers prefix does, and `deriveEvidence` does not read it.
- **Severity.** High.
- **Suggested fix.** Teach `deriveEvidence` the covers kind: `property` and `cross-check` never add `formally-proved`; a counted catalog kind does not either, matching the README. Export `catalogEvidenceInput` next to `deriveEvidence`, or stop taking a raw `formalRef` without `kind`. Add a test that `be-11`, `be-16`, `be-29`, `be-19`, `be-24`, and `be-42` stay untagged when the reference is passed in.
- **Effort.** Medium. The predicate is the definition of the tag, so the test has to fail on today's barrel before the kind check lands.

### 15. A formally proved atlas bridge also derives `contradicted`, and the CLI does not say so

- **Persona.** Theoretical physics student, asking `deriveEvidence` whether `ab-spring-lc` is proved.
- **Repro.** `deriveEvidence` on the atlas bridge with `NO_PASSING_WITNESSES`:

  | id | stored `evidence` | derived tags | `reviewStatus` |
  |---|---|---|---|
  | `ab-spring-lc` | `numerically-supported`, `proposed` | `formally-proved`, `contradicted` | `proposed` |
  | `ab-pendulum-linear` | `numerically-supported` | `formally-proved`, `contradicted` | `proposed` |
  | `ab-telegraph-diffusion` | `numerically-supported`, `proposed` | `formally-proved`, `contradicted` | `proposed` |
  | `ab-klein-gordon-wave` | `numerically-supported`, `proposed` | `formally-proved`, `contradicted` | `proposed` |
  | `ab-kg-schrodinger` | `numerically-supported`, `proposed` | `formally-proved`, `contradicted` | `proposed` |
  | `ab-stiff-string` | `numerically-supported`, `proposed` | `formally-proved`, `contradicted` | `proposed` |

  The other four proved bridges (`ab-damped-rlc`, `ab-telegraph-wave`, `ab-wave-dalembert`, `ab-kg-oscillator`) derive `formally-proved` only. They have no counterexample. `ab-spring-lc`'s counterexample is "adding R to bridge 1 breaks it" (the lossless side condition). `Counterexample` has `description` and `witness` and no `resolvedBy`. `derive-evidence.ts` records that every such counterexample is therefore unresolved and lights `contradicted`. `upt atlas ab-spring-lc` prints `stored evidence: numerically-supported, proposed`, prints `formally-proved … YES`, prints the counterexample, and does not print `contradicted`. It also prints `review status: proposed`.
- **Expected.** A counterexample that states the side condition (lossless; adding R leaves the claim) does not mark the dictionary `contradicted`. The CLI and `deriveEvidence` report the same derived set. `review status: proposed` is not the only line next to `formally-proved: YES` unless the command says it is admission state, not proof review.
- **Actual.** Six of the ten bridges that derive `formally-proved` also derive `contradicted`. The stored `evidence` field is a third set (`numerically-supported`, `proposed`) and does not contain `formally-proved`. The CLI shows the stored set and the formal flag, and drops `contradicted`. All ten proved bridges have `reviewStatus: 'proposed'`.
- **Severity.** High.
- **Suggested fix.** Give a delimiting counterexample a resolution (the side condition it illustrates) so `contradicted` stays a refutation. Print the derived set from `upt atlas`, including `contradicted` when the predicate returns it. Say what `review status: proposed` means on a row whose formal reference is `sanity-lemmas`.
- **Effort.** Medium. Which counterexamples are refutations and which are boundaries is a per-bridge reading, and the tag must not be hand-cleared.

### 16. Same index name does not contract, and there is no spatial axis

- **Persona.** Applied physicist, building a 2×2 stress and a normal to get a traction.
- **Repro.** `Axes` keys are `scale`, `force`, `symmetry`, `information`. Spatial `i` / `j` go through `makeIndex('dimension', 'i')`, which mints a new id on every call. Two vectors labeled with two `makeIndex('dimension', 'i')` calls do not contract: `LabeledTensor.contract` returns a 2×2 outer product and does not throw. A rank mismatch throws `LabeledTensorConstructionError` with the label count and the tensor rank. A bad `axisOrder` throws `AxisOrderError`.
- **Expected.** Two indices the caller named `i` either contract or the error says the ids differ. The README's `UniversalTensor` example is a catalog of laws (`getStats().totalElements` is 1 after one law); the numeric tensor is `LabeledTensor` plus `Float64ReferenceEngine`, which the example does not mention.
- **Actual.** The numeric contraction works when the caller reuses one `UniversalIndex` object (`σ · n` with a shared `j` returned `[[760000], [-200000]]`). A second `makeIndex` with the same name silently changes the product. Nothing in the root README says the axes are catalog axes.
- **Severity.** Medium.
- **Suggested fix.** When a contraction finds equal `name` and unequal `id`, throw with both ids. Point the README tensor snippet at `LabeledTensor` for numeric work, and say `UniversalTensor` stores laws.
- **Effort.** Medium. The id rule is an existing decision; the missing error is the footgun.

## Comparison with 2026-09-29

The CLI round's closed items that this session rechecked still hold on the command line (pendulum map; `upt atlas` prints a PhysJS reference for an `ab-*` id). Two of that round's library-facing gaps are still open from an import: bare `e` (finding 12) and `GM_SUN_SI` (finding 8). Unit strings, which the CLI converts, are not a public function (finding 11).

The formal-reference split in `NOTES.md` (10 atlas proofs, 9 counted catalog references, 3 cross-checks, 3 properties) matches the objects and the PhysJS manifest. It does not match `deriveEvidence` once a caller passes the catalog reference in (finding 14), and it does not match the Lean module comments that still say "Not a formalRef" (finding 13).
