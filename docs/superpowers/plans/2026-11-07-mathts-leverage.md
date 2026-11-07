# MathTS leverage: delete local math that MathTS provides

## Goal

UPT keeps one copy of each mathematical routine. When an installed MathTS package gives the same result, UPT calls the package and deletes the UPT copy. When MathTS is worse or missing, fix the gap in MathTS first. A later task removes the UPT copy.

## Order

This plan starts after tasks P3 to P5 of the 2026-11-07 integration plan merge. A task of this plan may run before that only in its own `git worktree`.

## Rules for every task

1. Each task is one pull request. It changes one routine and its tests.
2. RED first. Each row names its RED shape. A numeric row writes an agreement test over the inputs the local tests use and the row's edge inputs. The test must fail under a mutation of the MathTS call, for example a factor of 2. A source row writes a source-scan assertion. The pull request records the failing run.
3. Then replace the local body with the MathTS call. Keep the public name where a module exports the name. Delete the dead code.
4. A frozen output (a golden, a census, a hash) does not change. A task that changes a frozen output stops. The task goes back to planning.
5. Read a typed MathTS result through `src/core/mathts-read.ts`. Do not use a cast.
6. Gate: the scoped tests, `tsc`, `layer:check`, `docs:deps` and the architecture claim check. Then the full suite runs at the pre-push hook and in CI.
7. Relay route for each task: DeepSeek writes the first pass against the RED test. GLM runs only when the first pass fails the gate. A Sonnet checker applies the first pass in a worktree. A Haiku reviewer reads the diff. The lead fixes and merges. A task under ten changed lines may skip the worker. The pull request then states the reason.

## Tasks in UPT

Order: U0 first, then lowest risk first. Each row names the local routine, the MathTS call, and the edge inputs the agreement test must hold.

| Id | Local routine | MathTS call | Edge inputs and RED shape |
|---|---|---|---|
| U0 | the reasons in "Kept local" | none | one gap row per reason in `tests/dimensional/mathts-unit-gaps.test.ts` style, in a new `tests/numerical/mathts-gaps.test.ts`: each row asserts the MathTS limitation, so it fails the day a MathTS release removes it. Every M task below is done when its row fails and is turned into an agreement test |
| U1 | `rowMajorStrides` (`src/numerical/strides.ts`) and the inline copy in `src/numerical/pderiv.ts` | core `rowMajorStrides` | `[]`, `[1]`, a zero extent, rank 6 |
| U2 | `fractionToNumber` and `formatRational` (`src/composition/rational-exponent.ts`) | core `Fraction#toNumber`, `Fraction#toString` | a negative value, an integer, a numerator above 2^53; the text must be byte-identical on every call site's output path (CLI, report, golden) |
| U3 | `gcd` (`src/composition/probe/power-law.ts`) | functions `gcd`, read through `bigintFrom` or `numberFrom` | the pairs the caller can reach; `gcd(0,0)` is out of the caller's domain |
| U4 | `chiSquareCdf` (`src/composition/probe/study.ts`) | functions `chiSquaredCDF` | first step: run the old and the new call on the frozen probe inputs and diff every output that `study.ts` writes. If one moves, move U4 to "Kept local" with that reason and close it |
| U5 | `studentTwoSidedP` body (`src/composition/probe/t-tail.ts`) | functions `2·studentTCDF(−|t|, df)`; the one-line `studentTwoSidedP` wrapper stays, because `probe/index.ts` re-exports it | the measured sweep df 1, 5, 30 and |t| 2 to 1e8 (to 2e-219 at df 30, t 1e8); `t = 0`, a non-finite t and df ≤ 0 keep their present results |
| U6 | McNemar exact-p loop (`src/atlas/benchmark/stats.ts`) | functions `binomialTest` | discordant counts 0, 1, and a large equal split |
| U7 | the optional-peer simplifier loader (`src/composition/expr-simplify.ts`) | a static import; MathTS is a required dependency | source RED: no dynamic import of the simplifier remains. `isSimplifierAvailable` stays public and returns true. The console-silencer window and its source-scan test go with the loader; each test that exercises the false branch is deleted or rewritten, and the row lists them |
| U8 | `flatToNestedImpl` (`src/numerical/connection-lowering-helpers.ts`) | tensor `Tensor.fromNested` / `toNested` | `[]`, NaN entries, a data length that is not the product of the shape (must still refuse) |
| U9 | the bridge AST gradient (`src/diff/bridge-ast-gradient.ts`) | functions `compileScalarGradient` over expression `createScalarBuilder` | every (bridge, variable) pair of the catalog; the exponent-symbol refusal stays a UPT pre-check before MathTS sees the AST; the bench must not slow |

U9 is the large task. U9 changes the public API: the gradient export is `@public` in `src/index.ts`, and MathTS returns a number where UPT returns a Promise. U9 runs only after an ADR-level decision between a breaking change and a Promise wrapper. A spike first measures the bench. The spike lists every test that pins the Promise result or the error class. The spike decides the unused integral arm. The spike result goes back to planning before any code.

## Kept local, with the reason

- `gl4-integrator.ts`: MathTS `gaussLegendre4` has no step halving on Picard failure and no per-step callback.
- `pderiv.ts` stencils: MathTS has no order-4 or periodic difference.
- `expr-simplify.ts` rewrite and `normalForm`: the structural hash and the frozen goldens depend on them; a MathTS simplifier change would move evidence.
- `mathts-scalar-symbols.ts`: a deliberate consolidation that a test pins by name.
- `buckingham.ts` `toFrac`, `solveWeighted`, `covarianceOf`, the curvature kernels, `core/compare.ts`, `core/format.ts`, `core/hash.ts`.
- The atlas evidence logic: it is the repository's thesis, not math.
- Until the MathTS tasks below land (each has a U0 gap row): the quadrature weights, the survival tails in `study.ts`, `wilsonInterval`, `pairedDifferenceInterval`, `cohensKappa`.

## Tasks in MathTS (a linked plan in the MathTS repository)

Each one is a MathTS pull request and a release. The matching UPT task starts after the release is on the registry.

| Id | MathTS change | Opens UPT task |
|---|---|---|
| M1 | export `studentTTwoSidedP` (defined and declared, not exported) | none; U5 uses `studentTCDF` |
| M2 | direct upper tails: chi-square and F survival functions; `mcnemar` p from the direct tail | delete the `study.ts` survival tails |
| M3 | `rootsLegendre` weights to the accuracy of the local table (the measured gap is in `NOTES.md`) | delete the local quadrature weights |
| M4 | Wilson and Newcombe intervals, Cohen's kappa | delete the three `stats.ts` intervals |
| M5 | a typed `gcd` result type | simplify U3 |

## Out of scope

The unit grammar, splitter and ambiguity work (the 2026-11-07 integration plan), the typed-mean copy and the scalar-search probe (same plan). Lean proofs.
