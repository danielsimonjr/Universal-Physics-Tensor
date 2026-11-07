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
- P2b: ambiguous splits (U7): the MathTS `AmbiguousUnitError` maps to the UPT error class.
- P2c: affine compounds and difference readings (U3, U4): use `to(target, { reading: 'difference' })` for a difference temperature, and map the MathTS affine-compound refusal to the UPT refusal.
- P2d: `ton` (U2): MathTS throws `AmbiguousUnitError` for `ton` and `tons`. The wrapper maps that error to the present UPT `UnitRefusedError`, so the CLI goldens do not change. `shortton` and `longton` stay out of `data/units.json` unless they are admitted as a separate product decision. Remove the local `ton` override after the mapping test passes.
- P2e: cycles (U9): read `cycles` from the MathTS conversion result. Keep the UPT angular rule (2π only on a parameter marked angular).

## Task P3: delete the local splitter (UPT-7)

Start after P2a and P2b are merged.

1. RED: a test that asserts the wrapper module does not import the local glued splitter or the local ambiguity check.
2. Delete those functions. The wrapper keeps admission, `bit`, the `pc` prefixes, cycles, spelling notes and error classes.
3. Gate: the full suite and the CLI goldens pass with no golden change.

## Task P4: drop the typed-mean copy

Start after P1. `meanOf` copies a typed array to a plain array, because MathTS returned a Promise.
RED: a test that `meanOf` on a `Float64Array` gives a number without the copy (spy on the call).
Then delete the copy. Skip the task for any caller that passes a `Float32Array`, because MathTS still refuses it.

## Task P5: scalar-search probe behind a flag (UPT-5)

Start after P1, because the `dimensions` filter needs functions 0.72 or later.

1. RED: a test that runs `searchScalars` on one catalog relation with a known answer, through a new opt-in flag of the probe. The `grammar.admit` hook calls UPT `validate`. The `dimensions` option receives the UPT 7-vector through `mapUnit` (MT-9).
2. Add the flag. Default off. Do not change `generator.ts`.
3. Keep the holdout and the existing falsifiers. A search result is a candidate, not a verdict.

## Out of scope

Lean proofs, PhysJS wiring, `bit = ln 2` (UPT keeps `applyBitScaleOverride`), `pc` prefixes
(MathTS keeps its guard), and `leastSquares` in place of `solveWeighted`.
