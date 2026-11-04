# Lean proofs in UPT

This document is a plan. It authorizes nothing: `ACTIVE.md` is the gate, and none of the pull requests below is opened by this file. It does not merge, tag, publish, or release. It does not edit PhysJS.

The Lean proofs are this repository's `lean/`. PhysJS `main` is a TypeScript physics engine. Its README and `CONTRIBUTING.md` point at this `lean/`. The tag `lean-archive` is the last PhysJS commit that changed the proofs. UPT is the single source. A later pull request does not copy those files again, and it does not keep a second tree in sync.

The procedure for adding or retargeting one reference is `WORKFLOWS.md` (Adding or changing a Lean `formalRef`). This plan does not add a step to that procedure. Counts and the release-tag comparison live in `NOTES.md`.

## What was read

### This repository

The lake project is the repository root, not a package nested under `lean/`.

| File | Role |
|---|---|
| `lakefile.toml` | Package name `PhysJS`. Direct `require`s of Mathlib (`rev = "v4.34.1"`) and Physlib (`leanprover-community/physlib`, `af484f78ee0701290595f8bf892b157b10d64940`). `srcDir = "."`, `roots = ["lean"]`, `globs = ["lean.*"]`. |
| `lean-toolchain` | `leanprover/lean4:v4.34.1` |
| `lake-manifest.json` | Locked package revisions. Mathlib's `inputRev` is `v4.34.1`. |
| `lean.lean` | Aggregator module `lean`. Imports every file under `lean/`. |
| `lean/<File>.lean` | One module `lean.<File>`, declarations in `namespace PhysJS.<Name>`. |
| `formal/lean/manifest.json` | Schema `upt-lean-manifest/v1`. Toolchain, Mathlib, Physlib, and one entry per key: `theorem`, `kind`, `covers`, `coverage`, `leanProof`, `axioms`, plus nested statements. No commit field. |
| `formal/lean/lean-files.json`, `formal/lean/theorem-files.json` | Written by `bun scripts/lean-index.ts` from the tree. A namespace is not a file: `PhysJS.Einstein.friedmann_corollary` is `lean/VacuumFriedmann.lean`. |
| `src/atlas/physjs-entries.generated.ts` | Written by `bun run physjs:table`. Holds `LEAN_SOURCE_TAG`, `LEAN_TOOLCHAIN`, `LEAN_MATHLIB`, `LEAN_PHYSLIB`. |

`package.json` `files` does not list `lean`. The npm package does not ship the proofs.

Two files are in this tree and absent from `lean-archive`: `lean/DiffusionMode.lean` and `lean/SteadyProfile.lean`. Every other `lean/<File>.lean` name is on that tag. The archive commit also has `lean.lean` at its root.

### PhysJS at `lean-archive`

The archive tree is a lake project with the same shape: `lakefile.toml`, `lean-toolchain` `leanprover/lean4:v4.34.1`, Mathlib `v4.34.1`, Physlib `af484f78ee0701290595f8bf892b157b10d64940`, modules `lean.<File>`, theorem names `PhysJS.*`. Its manifest lived at `manifest/bridges.json`, with `manifest/lean-files.json` and `scripts/manifest-kind.ts` checking that each kind is the kind line in the Lean file.

Its CI job `lake build and axiom audit` (`.github/workflows/ci.yml` on that tag) runs on every pull request and on `main`. It calls `leanprover/lean-action` with `use-mathlib-cache: true`, `axiom-audit-root: lean`, and `axiom-audit-allow: propext,Classical.choice,Quot.sound`. The audit fails on `sorryAx`, `Lean.ofReduceBool`, or any other axiom.

### PhysJS `main` afterward

`main` has no `lean/`, no `lakefile.toml`, and no `lean-toolchain`. It keeps:

- The README and `CONTRIBUTING.md` pointer at this repository's `lean/`.
- The tag `lean-archive`, and the git history of the proofs.
- `docs/plans/THIN_PROOFS_PLAN.md`, a snapshot of a strengthening pass. It is not a second source of theorems. Theorem names in this repository's `lean/` are the pointers.
- The physics-engine packages (`core/`, `functions/`).

Archiving the PhysJS GitHub repository is the owner's decision. This plan does not archive it and does not open a PhysJS pull request.

## Layout

A nested lake project whose `srcDir` is `lean/` would look for `lean/lean/<File>.lean`. The root project is the layout that makes `import lean.<File>` and the axiom-audit root `lean` the same module the aggregator imports.

Declarations stay in `namespace PhysJS.<Name>`. Those names are Lean namespaces. They are not a dependency on the PhysJS repository.

On Windows the library root `lean` and Lean's own `Lean` are one directory name, so `lake build` fails before it starts. `TOOLS.md` (Lean build) records the scratch-project workaround. Linux CI is the build of record. This plan does not rename the root.

## Toolchain, Mathlib, CI

The pins are the three lines above: `lean-toolchain`, Mathlib `v4.34.1`, Physlib `af484f78ee0701290595f8bf892b157b10d64940`. `formal/lean/manifest.json` repeats them. `bun scripts/lean-index.ts --check` fails when the manifest's three pins are not the lake project's. `docs-fresh` runs that check. It does not fetch PhysJS.

CI job `lake build and axiom audit` in `.github/workflows/ci.yml`:

- Always reports, so it can be a required check. The build runs on the nightly schedule, on `workflow_dispatch`, and when `paths-touched` sees `lean/`, `lean.lean`, `lakefile.toml`, `lake-manifest.json`, `lean-toolchain`, `formal/lean/`, `data/bridge-catalog.json`, or `ci.yml`. Otherwise the job succeeds without building. A green skip is not a build (`TOOLS.md`).
- Restores `.lake/packages` with a cache key of the toolchain and `lake-manifest.json`. Mathlib's own cache (`lake exe cache get`) runs only when that cache misses.
- Restores `.lake/build` per commit, with a restore key of the same toolchain and manifest, so a later commit rebuilds the files that changed.
- `lean-action`: `build: true`, `use-github-cache: false`, `axiom-audit: true`, root `lean`, allow `propext,Classical.choice,Quot.sound`.

`lean/` stays outside the npm package. The TypeScript library records a reviewed `formalRef` and does not run Lean.

## How a record links to a proof

The stable name is the theorem, `PhysJS.<Namespace>.<theorem>`. The file is looked up. It is not derived from the namespace.

1. A catalog record in `data/bridge-catalog.json` stores `formalKey`, `theorem`, and `proofStatus` (`full`, `weak`, or `pending`). `full` is a reviewed kind-`bridge` theorem. `weak` is any other kind. `pending` has no key. The schema refuses a `theorem` without a key and a `full` or `weak` status without a key.
2. `formalKey` is an entry of `formal/lean/manifest.json`. `catalogFormalRef` builds the reference with `physjsFormalRef` and throws when the record's `theorem` is not that entry's theorem.
3. `formal/lean/theorem-files.json` maps the theorem to `lean/<File>.lean`. `physjsLeanFile` reads that map.
4. The file declares the theorem inside `namespace PhysJS.<Name>`. The module docstring carries the kind line (`` `be-80`. Bridge. ``). A nested statement has its own line (`` `be-13.vacuum`. Reduction. ``).
5. `lean.lean` imports the module, so the CI build and the axiom audit see it.
6. `physjsFileUrl` is the only builder of a proof URL: `https://github.com/danielsimonjr/Universal-Physics-Tensor/blob/<LEAN_SOURCE_TAG>/lean/<File>.lean`. `LEAN_SOURCE_TAG` is `v` plus `package.json`'s `version`. The `formalRef.version` string is `upt-lean@<tag> <toolchain> mathlib:<mathlib> physlib@<rev>`. There is no PhysJS commit in that string.
7. `deriveProofStatus` and `deriveEvidence` read the reference. Kind `bridge` with a fidelity other than `unreviewed` is what lights `formally-proved`. A derivation-step, a property, a limit, a reduction, and a cross-check do not. An unadjudicated row stays `proposed`. A nested statement is recorded and is not a second reference.
8. `src/atlas/physjs-reviewed.ts` pins a hash of each reviewed row. `tests/atlas/physjs-manifest.test.ts` prints the new hash when the manifest row changes. The hash is pasted after reading the diff. A key the sanity file instantiates is `sanity-lemmas`. Every other pinned key is `reviewed-manifest`. An unpinned key is `unreviewed` and does not light `formally-proved`.

An atlas bridge (`ab-*`) calls `physjsFormalRef(key)` directly. It does not go through a catalog `formalKey`. The same manifest entry, the same file map, and the same URL builder apply.

An applied case (`data/applied-cases.json`, `src/cases/`) is a numeric record. It has no `formalKey` and no proof URL. A case does not claim a theorem. A proof claim is a catalog record or an atlas `formalRef`.

A manifest key past the catalog's highest id, with no gap under it, is ahead of the catalog. It is compared and vendored. It is not a seed and not a catalog row until a record exists.

The citation string on a relation is prose. It may name the theorem, and it may name a theorem the row is not. The resolving check reads `formalKey` and `theorem`. It does not parse the citation.

### The resolving test, and the build with no `sorry`

`tests/atlas/catalog-proof-status.test.ts` walks every catalog record. For each `formalKey` it requires the stored `theorem` to be the manifest entry's theorem, the stored `proofStatus` to be the status derived from that reference, and the theorem to be declared in the file `theorem-files.json` names. The controls change one theorem, drop one, or demote one kind, and require the check to report that record. A catalog with no keyed record would fail the guard that the keyed set is non-empty.

`tests/formal/lean-theorems.test.ts` requires `lean.lean` to reach every file under `lean/`, and each manifest kind, nested statements included, to be the kind line of the declaring file. The control strips one kind line and changes one kind.

The build is the CI axiom audit, not those tests. Those tests read sources as text. They do not prove a theorem compiles. The audit imports module `lean` and fails when a declaration depends on `sorryAx` (`sorry` or `admit`), `Lean.ofReduceBool`, or an axiom outside the allow list. `tests/atlas/physjs-manifest.test.ts` fails a reference whose axiom list contains `sorryAx`, and `deriveEvidence` does not light `formally-proved` for that reference.

## The cross-repo pin

A `formalRef` used to name `physjs@<PhysJS commit>` and a blob URL on `danielsimonjr/PhysJS`. The version string and `physjsFileUrl` now name this repository at `LEAN_SOURCE_TAG`. Nothing under `src/` or `.github/` reads a PhysJS commit. `docs-fresh` does not clone PhysJS. `scripts/vendor-physjs.ts` and `formal/physjs/` are not in this tree.

Dated proof-status blocks in `docs/specification/` keep the PhysJS URL they were written with. Those blocks are history. A living sentence that tells a reader to vendor a PhysJS commit is `WORKFLOWS.md`, `MEMORY.md`, and `TOOLS.md`, which name `lean/`.

Permalinks resolve at the release tag named by `LEAN_SOURCE_TAG`. A commit after that tag is not what the URL shows. Retargeting the tag is a release (`WORKFLOWS.md`, Release). This plan does not bump `package.json`, does not regenerate the tag, and does not publish. The comparison of the current tag's tree with this branch is in `NOTES.md`.

## History and attribution

The files under `lean/` carry the PhysJS history that touched them (`git filter-repo`). Commit subjects that cited a PhysJS pull request cite `danielsimonjr/PhysJS#N`. `git log --follow -- lean/Eyring.lean` shows those commits and the later commits on this repository. Each Lean file keeps its copyright header. Theorem names were not rewritten.

## Thin proofs, flagged and left

These catalog ids were thin at the import: the catalog equation was a hypothesis, or a short cancellation, and the file did not check it by a second route. The ids are `be-148`, `be-151`, `be-154`, `be-155`, `be-156`, `be-157`, `be-158`, `be-159`, `be-163`, `be-164`, `be-168`, and `be-170`. `be-149` is the borderline case (van 't Hoff).

The files and the theorems a later reader looks up:

| Id | File | Theorem the record names |
|---|---|---|
| be-148 | `lean/Eyring.lean` | `PhysJS.Eyring.eyring_eq` |
| be-149 | `lean/VanTHoff.lean` | `PhysJS.VanTHoff.vant_hoff` |
| be-151 | `lean/NernstGibbs.lean` | `PhysJS.NernstGibbs.nernst_eq` |
| be-154 | `lean/Prandtl.lean` | `PhysJS.Prandtl.prandtl_eq` |
| be-155 | `lean/ReynoldsNumber.lean` | `PhysJS.ReynoldsNumber.reynolds_eq` |
| be-156 | `lean/Biot.lean` | `PhysJS.Biot.biot_eq` |
| be-157 | `lean/Nusselt.lean` | `PhysJS.Nusselt.nusselt_eq` |
| be-158 | `lean/Schmidt.lean` | `PhysJS.Schmidt.schmidt_eq` (`PhysJS.Schmidt.lewis_ratio` is the nested property, not a second catalog target) |
| be-159 | `lean/Sherwood.lean` | `PhysJS.Sherwood.sherwood_eq` |
| be-163 | `lean/JouleThomson.lean` | `PhysJS.JouleThomson.joule_thomson_eq` |
| be-164 | `lean/PlanckSpectrum.lean` | `PhysJS.PlanckSpectrum.planck_eq` |
| be-168 | `lean/Saha.lean` | `PhysJS.Saha.saha_eq` |
| be-170 | `lean/OnsagerReciprocity.lean` | `PhysJS.OnsagerReciprocity.onsager_eq` |

This series does not edit those files. The PhysJS snapshot `docs/plans/THIN_PROOFS_PLAN.md` describes a strengthening pass against an earlier tree. The theorems in the table, and the limit and counterexample theorems in the same files, are the statements on this branch. A further physics strengthening is a separate plan. It is not a step of moving the tree.

## Docs

Living procedure: `WORKFLOWS.md`, `MEMORY.md`, `TOOLS.md`, and the specification index, which names `lean/` for a reviewed `formalRef`.

Leave in place: dated proof-status blocks and the specification changelog, which keep the pin they were written with; `CHANGELOG.md` entries that record an earlier pin; design notes under `docs/planning/` that described the vendored manifest. Those documents are history. Editing them so they describe `lean/` would hide the pin they recorded.

## Ordered series

Each row is already the tree. The check is what a later session runs before deciding the row is still satisfied. Opening the row again copies a source that already lives here, or edits PhysJS, which this plan does not do.

1. **Import, with history.** `lean/<File>.lean` matches the archive names, plus `DiffusionMode.lean` and `SteadyProfile.lean`. `git log --follow` on a file shows the PhysJS commits. Check: `git log --follow -- lean/Eyring.lean` names `danielsimonjr/PhysJS#N`.

2. **Root lake project and pins.** `lakefile.toml`, `lean-toolchain`, `lake-manifest.json`, and `lean.lean` are at the root. Check: `bun scripts/lean-index.ts --check` (manifest pins equal the lake project; kind lines match).

3. **CI build, axiom audit, caches.** Job `lake build and axiom audit`, path-gated, with the two cache keys in `.github/workflows/ci.yml`. Check: the job's `axiom-audit-allow` is `propext,Classical.choice,Quot.sound`, and a pull request that does not touch a Lean path leaves the build step skipped.

4. **Catalog and atlas links.** `formalKey`, `theorem`, `proofStatus`, the generated index, `physjsFileUrl`. Check: `bunx vitest run tests/atlas/catalog-proof-status.test.ts tests/formal/lean-theorems.test.ts`. A keyed record whose theorem is not declared fails the first file. A file `lean.lean` does not import fails the second.

5. **No `sorry` on a real build.** Check: the CI audit on a commit that touches `lean/`. A text search is not that check. The manifest test's `sorryAx` control is the TypeScript half.

6. **Cross-repo pin removed.** No `PHYSJS_COMMIT` and no fetch of PhysJS in `src/` or `.github/`. Permalinks use `LEAN_SOURCE_TAG`. Check: `bun scripts/generate-physjs-table.ts --check`.

7. **PhysJS is a pointer.** Already true on PhysJS `main`, including the `lean-archive` tag. No pull request in this series edits that repository.

8. **Thin ids flagged.** The table above. No pull request in this series changes those proofs.

A release that retargets `LEAN_SOURCE_TAG` so the proof URLs show commits made after the current tag is the owner's release procedure. It is not a row above.
