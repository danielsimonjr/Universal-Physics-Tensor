# UPT: integrate the MathTS 0.22 generation

**Goal.** UPT uses the MathTS generation that closes the gaps of
`docs/audit/2026-11-05-mathts-integration-gaps.md`. UPT deletes the local code that this
generation makes redundant. Every item of section 5 of that audit stays in UPT.

**Target ranges.** core `^0.22.0`, functions `^0.73.0`, expression `^0.12.2`, matrix `^0.9.1`,
tensor `^0.3.1`, autograd `^0.4.1`. functions 0.73.0, tensor 0.3.1 and autograd 0.4.1 each
depend on core `^0.22.0`, so these six move in one PR. Any UPT range left on the 0.21 generation
puts a second core in `bun.lock`, and a second core breaks `buckingham.ts` (`NOTES.md`, 2026-11-04).

## Rules for every task

- One task is one PR. File its `ACTIVE.md` row before the work. Merge the PR after its checks pass, before the next task starts.
- TDD: write the failing test first, see it fail, then change the code (`WORKFLOWS.md`).
- Gates before the push: the full suite (`bun run test`, judged on the counts), `bun run docs:deps` after the files are tracked, and the pre-push hook (`repo-tools check . --docs=docs/architecture` and `repo-tools docs check src`). After the push, read CI on GitHub, including the `docs-fresh` checks (`readme-status`, `catalog-census`, `cli-reference`, `lean-index`, each with `--check`).
- A change of a dependency range also changes `tests/tools/package-deps.test.ts` and `bun.lock`.
- Do not use `Unit.createUnit`. Do not call `symbolicEqual` as a second method.
- Do not move any item of audit section 5 to MathTS.
- Each task adds a CHANGELOG entry under `## [Unreleased]`. A version or a measured count goes in `NOTES.md`, not in a design doc.

## Task P0: remove the unused direct dependencies (UPT-2)

`mathts-wasm`, `mathts-parallel` and `mathts-workerpool` have no import in `src/`. Remove them
first, so no UPT range competes with the `parallel ^0.8.1` that functions 0.73.0 requires.

1. RED: remove the three rows from the expected table in `package-deps.test.ts`, and add a check that `package.json` does not list them.
2. Remove them from `package.json`. Regenerate `bun.lock`.
3. Change the "Required dependencies" line of `MEMORY.md` from nine packages to six.
4. Gate: `grep -rE "mathts-(wasm|parallel|workerpool)" src` finds nothing.

## Task P1: coordinated bump (UPT-1)

1. Probe first, in a scratch install outside the tree: install the six target versions and run
   `bunx vitest run tests/dimensional/mathts-unit-gaps.test.ts`. Record which oracle rows fail. Those rows are the gaps that 0.22.0 closes.
2. RED: change the expected ranges in `package-deps.test.ts`.
3. Change `package.json`. Run `bun install`. Gate: `bun.lock` resolves exactly one version of `mathts-core`.
4. Run the full suite. Each failure is a behavior change of the release, not a flake. Fix each one at its cause:
   - Flip each gap-oracle row that the release closes from "gap" to "agrees". List the flipped rows in the PR body. This changes the order of audit section 6.1: the audit planned the bump and the gap closure as separate events, and this release does both.
   - Engine conformance (`engine-conformance.mathts.test.ts`, `mathts-autograd.test.ts`) must pass. Fix `MathTSEngine` at the cause.
   - Buckingham tests must pass.
5. Docs in the same PR. In `TOOLS.md`, the sentence that a typed `mean` on a `Float64Array` returns a Promise gets a "before `@danielsimonjr/mathts-functions` 0.73.0" qualifier (the file's convention), and the `Float32Array` refusal stays. Add an "As of 2026-11-07" block to `NOTES.md` with the installed versions.

## Task P2: delegate the closed families (UPT-4, UPT-6)

One PR for each family, in this order. Each PR adds the texts of its family to
`A5_DELEGATED_TEXTS` in `src/dimensional/mathts-unit-wrapper.ts`, so the wrapper reads them
through MathTS. RED is a wrapper test asserting that each text takes the delegated path.
P1 already flipped the oracle rows. Do not widen the admission list in `data/units.json`.

- P2a: glued products and superscripts (U5, U6): `m2K`, `Vs`, `cm^2/Vs`, `K²`.
- P2b: ambiguous splits (U7). MathTS core 0.22.0 has two sources of ambiguity: the static table (`ton`, `tons`) and a rule, a glued token whose splits give different dimensions (`Pas`, `Pam`). `ton` and `tons` are UPT policy refusals in `data/units.json`, read before MathTS. A glued token does not reach MathTS under the routing gate. `mol/mL` and `mAs` stay on the local ambiguity check.
- P2c: affine compounds and difference readings (U3, U4). The affine-compound guard and the difference reading stay local. MathTS parses the spaced `deg C/s` and `° C/s`, and its difference reading is a float. A gap row pins the spaced spelling.
- P2d: `ton` (U2). The `ton` and `tons` refusal rows in `data/units.json` stay: `ton` does not reach MathTS under the routing gate, and the CLI goldens pin the UPT message. A test requires a refusal row for every key of MathTS `AMBIGUOUS_UNIT_SPELLINGS`.
- P2e: cycles (U9). Cycles stay on the UPT table. MathTS `Unit.cycles` is the bridge factor of the last `to()`, not the count in the given unit. A test requires the two tables to agree on the cycle flag, and no A5 text to count cycles. Keep the UPT angular rule (2π only on a parameter marked angular).

## Task P3: keep the local grammar (UPT-7)

The local grammar stays the authority for a unit text. `localUnitReadings` in `units.ts` lists every reading of a glued token. The local ambiguity check is the same code: a text is ambiguous when it has more than one reading. The gap rows `mol/mL`, `mAs`, `Pas` and `Pam` need these readings, so the splitter is not a duplicate of MathTS. The wrapper does not import the splitter.

1. Keep the splitter and the ambiguity check. Do not add a test that the wrapper does not import the splitter: that test passes on the present tree.
2. MathTS task M6 exports the reading list (the internal `readings` function). After that release, UPT calls it and applies its own policy filter (refusals, prefixes, `bit`). That change deletes `segmentations`, `tokenWays` and `cartesian`. RED: each gap row keeps its present verdict.
3. MathTS task M7 accepts the middle dot (`·`) as a product. Today MathTS refuses `m^2/(V·s)`, so that text routes to the local grammar.
4. A change that makes MathTS the authority changes which texts `parseUnit` accepts. `parseUnit` is public, so that change needs an ADR.

## Task P4: drop the mean copy

`meanOf` takes a plain `readonly number[]`, and no caller passes a typed array. It copied the array before MathTS `mean`. MathTS `mean` does not mutate its input and accepts a frozen array, so the copy is not needed.
RED: a test that MathTS `mean` receives the caller's array itself (a mock of `mean` records the argument). Then delete the copy. The frozen-input row in `tests/numerical/statistics.test.ts` fails if a MathTS release starts to mutate the input.

## Task P5: scalar-search candidates behind a flag (UPT-5)

MathTS `runScalarSearch` (functions 0.73.0) returns a Pareto `front` of MathTS `ScalarNode` trees. It takes `columns` as a record keyed by variable name, the shape of a UPT `ObservationRow`. The probe takes candidates as UPT `ExprNode` trees. `runProbeSearch` in `src/composition/probe/pipeline.ts` adds external candidates in its `backendArgv` branch. P5 adds a second source of the same shape in a new module `src/composition/probe/scalar-search.ts`.

1. Structure only. The search runs with `parameters: []`. The probe's existing fit supplies the constant, as it does for a backend candidate (the `backendArgv` branch drops the backend prefactor). A later task can add fitted parameters.
2. Tree converter, `ScalarNode` to `ExprNode`:
   - A `symbol` node takes the `dim` of the governing variable of the same name. Any other name throws.
   - A `number` node becomes a dimensionless literal symbol (`'2'`, `'0.5'`). UPT `validate` accepts these.
   - An `op` node keeps its operator. Both sets are `+ - * / ^`.
   - A `call` node stores a lowered MathTS name. The converter reads the inverse of the exported MathTS `SCALAR_FUNCTION_LOWERING`; it does not write a second table. The table is not one-to-one (`log` and `log10` both lower to `log10`), so the inverse picks the UPT `TranscendentalFn` spelling. A lowered `abs` becomes the UPT `abs` node. `sqrt(x)` becomes `x ^ '0.5'`.
   - `atan` has no UPT form. The option refuses a grammar that lists it. The accepted names come from the same inverse table.
3. Dimension converter, UPT `Dimension` to MathTS `RationalDimension`. Map each UPT key by name to the BIPM order `[L, M, T, I, Θ, N, J]` of `SiDimensionVector`, never by position. Read each exponent through `rationalize` in `src/composition/rational-exponent.ts`. An exponent that does not rationalize throws.
4. Option. `ProbeSearchOptions.scalarSearch` holds the grammar knobs, a seed and `maxCandidates`. Default: absent, and the search does not run. The wall-clock limit is the probe's remaining budget, computed as the `backendArgv` branch computes `remainingMs`. `parallel` stays unset, so scoring stays on the caller thread. With no `exploratory` data the search does not run, and `wording` gets one line. The observed column is the dataset's `observable`. A search error (a missing column, a non-finite target) is an abstention: `wording` records it and the run goes on. A grammar that lists `atan` is a caller error and throws. A stop reason other than `max-evaluations` goes to `wording`. The `dimensions` filter gets each governing variable's dimension and the target's dimension as `target`. The grammar `admit` hook stays unset.
5. Each front tree becomes a raw candidate with `originNote: 'mathts-scalar-search'`. Its record origin is the existing `{ kind: 'external-backend', backendId: 'mathts-scalar-search' }`, so the `ProbeCandidateOrigin` union and the serialized schema do not change. The manifest lists a backend descriptor for it. The existing fit, holdout and falsifiers judge it. A search result is a candidate, not a verdict.
6. RED, in three parts:
   - (a) Tree converter: three hand-built `ScalarNode` trees convert to the expected `ExprNode` trees exactly, and an unknown symbol throws.
   - (a′) Dimension converter: the dimension of a known unit agrees per axis with MathTS `unitToRationalDimension` of the same unit. This test catches an axis-order error.
   - (b) Pipeline: with the flag set, a fixed seed and a small budget, at least one record in `candidates` (a rejected candidate stays there with status `rejected`) has the origin `backendId` `mathts-scalar-search`, and the manifest lists the descriptor. With the flag absent, the result equals the present result for the same problem, with `now` and `repositoryCommit` pinned in both calls. CI does not assert that the search finds a known relation; that is a stochastic search outcome.
7. `generator.ts` changes only to export `withinAstCaps`, its depth and operator check. A scalar-search candidate passes the same check.

## Out of scope

Lean proofs, PhysJS wiring, `bit = ln 2` (UPT keeps `applyBitScaleOverride`), `pc` prefixes
(MathTS keeps its guard), and `leastSquares` in place of `solveWeighted`.
