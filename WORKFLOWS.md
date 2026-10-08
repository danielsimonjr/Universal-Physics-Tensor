# WORKFLOWS.md — procedure (run these, do not re-derive them)

The law is `AGENTS.md`. This file is **what to run, in what order**. If it does not answer that,
it belongs in another file.

## Before non-trivial work

Read `ACTIVE.md` (the live task list) and `NOTES.md` (current state). `todo.md` is the historical ledger.

## Every commit-shaped change

**File the `ACTIVE.md` row BEFORE the work** → do it → tick it **without retitling** →
`CHANGELOG.md` entry saying what changed *and why* → commit → push → **read CI on GitHub**.

The row is late the moment you are about to change a file something else will later run.

## The test gate

- **Never pipe the gate** (`TOOLS.md`, "How they lie").
- Judge on the **counts** in the summary line, never on the exit code alone.
- The pre-push gate runs the full suite. **That is not CI.** Read the GitHub run:
  `gh run list --repo <repo>` then `gh run view <id> --log`.
- Confirm a new test file actually **executed** — a file missed by the glob passes vacuously.

- **Do not re-run the full suite per task.** Use scoped vitest in TDD cycles and the full suite
  at the commit gate.

## Adding an invariant, a control, or a test

1. Make it **FAIL first**, on the real tree, and keep the failure output.
2. Then implement.
3. Then confirm green.
4. Where practical, **mutate the implementation** and confirm the new test catches what the old
   ones did not. That proves the old tests were blind rather than asserting the new ones are
   better.
5. Keep any script that produced a WRONG intermediate result beside the corrected one — a number
   whose wrong path was deleted cannot be audited.

## Promoting anything to the public surface

1. Read what is **already** exported before creating anything.
2. Check the surface stays **closed under type references** (the invariant is in `MEMORY.md`).
3. Teach the invariant test the new export form and **prove it fails** on a deliberately
   untagged symbol *before* changing the form. Otherwise the test passes vacuously and reports
   green while checking nothing.
4. Prefer **additive**: adding an export changes nothing that exists. Verify with
   `git show --numstat` that deletions are zero.

## Before reporting any number

Re-derive it **from the set**, not from an earlier report. A count and a list that can disagree
are two sources of truth. **Re-count after every write** — a count taken before a write is a
count of the old file.

## Working from a plan

- **Plan templates routinely carry wrong inline test snippets**: wrong tensor input formats, wrong
  AST node kinds (`op:'*'` vs `kind:'tensor-product'`), wrong nested-array shapes, invented method
  names (`f64.mul`), or false claims such as `evaluateNumericalRaw` "bypasses `validate()`" (it
  does not). **Cross-check inline test code against existing fixtures before TDD'ing it.** State
  an honest deviation in the commit message.
- **Never assume a plan inherits its design's fixes.** A plan once reintroduced a bug its design
  had already fixed. Adversarial review runs on both artifacts independently.
- **Pre-execution verification gates**: before each TDD cycle, read the source and run the
  prerequisites.
- **Review tier:** design, plan and physics-correctness checks go to the Adam+Eve adversarial pair.
  The model mapping and invocation conventions live in `todo.md` §Conventions.

## Adding or changing a Lean `formalRef` (`lean4-physjs`)

Public PhysJS (`https://github.com/danielsimonjr/PhysJS`) holds the Lean proofs. UPT does not run Lean for this system. `NOTES.md` records the reviewed count. Each reference is `system: 'lean4-physjs'`. The procedure below is how one of those references is added or retargeted. The count itself stays in `NOTES.md`.

1. Land the theorem in PhysJS. Its `manifest/bridges.json` entry (schema `physjs-bridge-manifest/v1`) names `key`, `bridgeId`, `theorem`, `covers`, `coverage` (`covers its statement only`), `leanProof`, and `axioms`. The axioms are what PhysJS measured with `#print axioms`. This repository does not re-measure them.
2. Run `bun scripts/vendor-physjs.ts --physjs <PhysJS checkout> --commit <sha>` with the PhysJS commit being pinned. It writes the three pinned files from that commit: `formal/physjs/manifest.json` (PhysJS `manifest/bridges.json` with `commit` appended; its `commit`, `toolchain`, `mathlib`, and `physlib` are the pin), `formal/physjs/lean-files.json` (the `.lean` files under `lean/`), and `formal/physjs/theorem-files.json` (the Lean file that declares each manifest theorem, read from the sources; a namespace is not a file). CI's docs-fresh job fetches PhysJS at the pinned commit and runs the same script with `--check`, so a hand edit to any of the three fails.
3. Run `bun run physjs:table`. It writes `src/atlas/physjs-entries.generated.ts` from the vendored manifest, including `PHYSJS_COMMIT`. Do not copy an entry by hand. A bridge obtains its reference with `physjsFormalRef(key)`. The module sets `system: 'lean4-physjs'` and `fidelity: 'sanity-lemmas'`. The bridge does not name a theorem of its own.
4. Put `formalRef: physjsFormalRef('<key>')` on the atlas bridge, or, for a catalog id `be-<n>`, on `BridgeEquationEntry`. `deriveEvidence` turns a fidelity other than `unreviewed` into `formally-proved` when the reference is passed to it. The tag is not stored on the bridge. `catalogEvidenceInput` passes a kind-`bridge` reference and does not pass a derivation-step, a property, or a cross-check. A proof of one part does not tag the row. A catalog covers line begins with `reduction`, `limit`, `derivation-step`, `property`, or `cross-check`. The first three are the counted kind. `property` and `cross-check` are catalog references of their own kind and are not that count. A nested object is recorded and is not a second reference. A cross-check of two ids is one entry; the covers line names the partner, and the partner does not get a second key.
5. Run `bunx vitest run tests/atlas/physjs-manifest.test.ts`. It fails and prints the new hash of the manifest's `[key, theorem, covers]` rows. Read the manifest diff, then set `REVIEWED_ROWS_SHA256` in that file to the printed value. A covers line that states what the theorem is NOT also gets a `SENTINELS` row there.
6. Run `bun run atlas:formal-gate`. With no `lean4-physlib` reference, the gate compares the vendored manifest to the bridges and does not run Lean. It must print `formalRef axiom gate: PASS (lean4-physjs manifest; no lean4-physlib formalRef)`. A wrong commit, theorem, key, axiom list, or coverage phrase fails. A manifest entry with no bridge fails. A `lean4-physjs` reference with no manifest entry fails.
7. Commit the vendored manifest, `theorem-files.json`, the generated table, the bridge's `formalRef`, and the test's hash pin together. `bun scripts/generate-physjs-table.ts --check` fails when the table was not regenerated.

## Adding or changing a Lean `formalRef` (`lean4-physlib`)

Use this section only when a reference has `system: 'lean4-physlib'`. The live reviewed set is the `lean4-physjs` section above. When no such Physlib reference exists, `atlas:formal-gate` skips the Lean probes and still checks the PhysJS manifest.

1. Add the theorem to `formal/physlib/AxiomProbe.lean`.
2. Run `bun run atlas:formal-gate -- --physlib <checkout> --write-captured` (setup in
   `formal/physlib/README.md`).
3. The gate must PASS, and both `captured/HoleProbe.out` and `captured/ImportedHoleProbe.out` must
   still report `sorryAx`. Record the
   measured axioms in the `formalRef`.
4. Commit the probe, the captured output and the record together.

## Adding or changing a `// source:` comment in `docs/research/phase-1-source-comments.txt`

1. Quote the source verbatim and give the page or equation. Label everything else as this
   repository's.
2. Add a claim for every new quoted span or locator to `docs/research/phase-1-citation-claims.json`.
   The completeness test in `tests/tools/citation-quote-check.test.ts` fails until you do.
3. Download any new source and pin its SHA-256 in the manifest.
4. Run `bun run atlas:quote-check -- --sources <dir> --write`. The result must be PASS.
5. Commit the comment, the manifest and `docs/research/phase-1-citation-quote-check.out.md` together.

## Release (Mothership's; recorded so the order is never re-derived)

`.github/workflows/publish.yml` publishes `universal-physics-tensor`. It runs on a push of a
tag matching `v*` (for example `v0.48.0`) and on `workflow_dispatch` of that same tag. It does
not run from a branch. The three `tools/*/package.json` packages are local utilities and are
not published.

1. Bump `package.json` to `X.Y.Z`.
2. `bun run atlas:json` — AFTER the bump: `data/atlas/oscillators.json` embeds `packageVersion`,
   and `tests/atlas/atlas-json.test.ts` fails on a stale artifact.
3. `bun run docs:deps` — AFTER the bump: `DEPENDENCY_GRAPH.md` embeds the version, and the
   `docs-fresh` job fails on a release commit that regenerated first.
4. Pre-flight: `bun audit` and `bun outdated`. Resolve HIGH/CRITICAL findings before tagging, and
   record the dependency-health snapshot under the release header in `CHANGELOG.md`.
5. Commit, merge to `master`, and wait until CI on that commit is green.
6. Tag that commit `vX.Y.Z` (`X.Y.Z` is `package.json`'s `version`) and push the tag. The
   workflow checks out the tag, fetches `origin/master` (the layer-order gate reads that ref,
   and a tag checkout does not have it), installs, builds, typechecks, runs the test suite, and
   fails the job when the tag version (the leading `v` removed) is not `package.json`'s version.
   It then runs `npm publish --provenance --access public` (`TOOLS.md`, Publish).
7. Verify against the REGISTRY: `npm view universal-physics-tensor version --prefer-online`.
   Plain `npm view` serves a stale cache right after a publish.

The Actions secret `NPM` must exist (repository Settings → Secrets and variables →
Actions). The workflow passes it as `NODE_AUTH_TOKEN`. Provenance uses the workflow's
`id-token: write` permission. Rotate the token at
<https://www.npmjs.com/settings/danielsimonjr/tokens> and update the secret.
`workflow_dispatch` publishes only when the selected ref is the `v*` tag; a branch ref fails
the version guard.
