# UPT optimization, reduction, MathTS units, and user docs

Design for a sequence of small pull requests. It authorizes nothing. `ACTIVE.md` is the gate. The ordered work, the commands, and the measured baseline are in [`docs/superpowers/plans/2026-11-21-upt-optimization-docs.md`](../plans/2026-11-21-upt-optimization-docs.md). A number in this file would be a second copy of that baseline, so this file states the decisions and points at that table.

No sprint here bumps `package.json`, tags, or publishes. The public names `parseUnit`, `convertValue`, `evaluateRelation`, `evaluateBridge`'s callers, and the CLI verbs stay. A sprint that would change a printed value, an error class, or a golden stops.

## What was measured, and what that decides

The plan's baseline names the tree, the machine, and the lockfile pins. Three facts from that profiling decide the speed work:

1. **CLI cold start (`typed-function` and eager barrel imports).** `upt version`, `upt help`, `upt evaluate`, and `upt search` pay the same heavy startup wall clock, while bare `node -e` is tiny. `src/cli/main.ts` eagerly imports three heavy modules before `runCli` inspects the verb: `../cli-api.js`, `./commands/index.js`, and `./record.js`. Each pulls `@danielsimonjr/mathts-functions` via `src/core/constants.ts`, whose `typed-function` dispatch-table build dominates cold startup.
   - **In reach for `upt version`:** lazy-load `../cli-api.js`, `./commands/index.js`, and `./record.js` in `src/cli/main.ts` so `upt version`, `--version`, and `-v` (without `--record`/`--replay`/`--json`) return from `packageVersion()` without importing any heavy module.
   - **In reach for `upt help` and `--help` (keeping one command registry):** `src/cli/commands/index.ts` only loads `mathts-functions` because five CLI helper modules pull heavy library barrels at import time (`closed-form-range.ts`, `library-defaults.ts`, `conventions.ts`, `map-evidence.ts`, and `eval-numbers.ts`). Switching `closed-form-range.ts` to `catalogEvaluators()` from `src/bridges/catalog-load.ts`, moving the pure numeric/name defaults read by `library-defaults.ts` into leaf modules (re-exported from their original owners), and lazy-importing `conventions.ts`, `map-evidence.ts`, and `eval-numbers.ts` inside command `run()` functions lets `upt help`, `upt <cmd> --help`, `--show-record`, unknown-verb exit-2, and `scripts/cli-reference.ts` skip `mathts-functions` completely while keeping a single `registerCommand` registry with zero drift.
   - **Out of reach in UPT for physics-evaluating commands:** commands that evaluate formulas or constants (`evaluate`, `search`, `explain`, `audit`) must load `src/core/constants.ts`, which statically imports CODATA 2022 constants from `@danielsimonjr/mathts-functions` (pinned as the single owner by `tests/core/constants-owner.test.ts`). Both the root and `./evaluate` entrypoints of `mathts-functions` eagerly initialize `typed-function`. Avoiding that cost on physics commands requires an upstream MathTS split of constants from `typed-function`, which is out of scope for this repository.
2. **Repeated formula compilation (`trustedMathFunctions` in `upt audit`).** `src/numerical/formula-mathts.ts` calls `compileExpr` (which invokes `trustedMathFunctions(mathScope)` inside `mathts-expression`) on every `parseFormula(expr)` call with no cache, and `src/bridges/expr-parse.ts` calls `parseFormula` on every evaluation. The plan's baseline shows extreme parse repetition in a single `upt audit` run. Because `parseFormula` compiles only the static expression text and `evaluate(scope)` supplies runtime bindings (with static `PHYSICS`, shims, and default `e: E_SI`), memoizing compiled `CompiledFormula` instances by expression string in a bounded `Map` eliminates repeated `trustedMathFunctions` work with byte-identical output.
3. **In-process numeric paths and `forwardGrad`.** Tensor `mul`, the Schwarzschild geodesic integrator, the finite-difference Riemann pipeline, and the covariant eikonal are milliseconds or less once loaded. `forwardGrad` on a large 2D tensor is slow because MathTS `forwardGrad` computes the full dense `[...xShape, ...xShape]` Jacobian (one forward pass per input element, `O(N^2)` work and memory), whereas `reverseGrad` on the same tensor is sub-millisecond. UPT never calls `forwardGrad` in production code; `src/diff/bridge-ast-gradient.ts` already uses MathTS reverse mode (`compileScalarGradient`), and `MathTSEngine.forwardGrad` is a thin passthrough.

No sprint rewrites `mul`, the geodesic integrator, the curvature lowering, or `forwardGrad`.

## Code reduction

Two older documents use the word reduction for other work. They stay as they are.

- [`docs/audit/2026-11-05-mathts-integration-gaps.md`](../../audit/2026-11-05-mathts-integration-gaps.md) is the #581 gap analysis. Its UPT-2 row is "delete the unused direct dependencies `mathts-wasm`, `mathts-parallel`, and `mathts-workerpool`". Task P0 of [`docs/superpowers/plans/2026-11-07-mathts-integration-refactor.md`](../plans/2026-11-07-mathts-integration-refactor.md) is that row. The lockfile carries only the six MathTS packages named in `package.json`, and `NOTES.md` records the removal. This design does not remove or bump a dependency.
- GitHub pull request **#603** is the U9 gradient-spike note ("docs(plan): record the U9 gradient spike"). It is not a dependency-reduction plan. There is no document in this repository by that name.
- [`docs/design/bridge-reduction-pass.md`](../../design/bridge-reduction-pass.md) is a generating-set design for catalog equations. It is a different pass. This design does not run it and does not edit a catalog row.

What this design does call reduction is dead code and the last per-case runners.

### Per-case files and runners

The no-per-equation-files rule is the bridge catalog (`data/bridge-catalog.json`, `src/bridges/relation-eval.ts`) and the same shape for applied cases (`docs/plans/MATHTS_UNITS_AND_CASES_PLAN.md` Part B, `src/cases/catalog.ts` `isForbiddenCaseModule`, `tests/cases/cases-directory.test.ts`).

The live `src/cases/` directory holds `index.ts`, `types.ts`, `catalog.ts`, `catalog-checks.ts`, `engine.ts`, `methods.ts`, and `quadrature.ts`. The per-case files named in `FORBIDDEN_PER_CASE_MODULES` are already gone. A new `case-*.ts` fails the directory test.

**Recommendation: keep that ban.** Do not put a case back in its own file, and do not add a shim that re-exports one. A numeric method an expression cannot state (an integral, a series/eigenvalue solver, an ODE step, or a formula using a function outside the catalog grammar such as `Math.max` or `Math.expm1`) stays a named export of `methods.ts`. That is the Part B end state, and it is the right one.

The cruft left is functions, not files:

- `ENGINE_CASE_IDS` in `src/cases/engine.ts` routes `case-skin-depth`, `case-kepler-rv`, and `case-damped-resonator` through `runAppliedCaseEngine`. `buildAppliedCase` in `methods.ts` therefore never calls `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`. Those three functions are still listed on `CASE_METHODS` and imported by `tests/cases/applied-case-engine.test.ts`. The cleanup sprint replaces `legacyMatch` with pinned numeric reference expectations and deletes the three unreachable runners.
- `case-resistor-noise`, `case-lumped-cooling`, and `case-brownian-sphere` still run through whole-case runners (`DELEGATED_RUN_METHODS`). Because `usesCatalogEngine(record)` flips from `false` to `true` the moment *any* output of a case moves off its `runCase*` method, a partial output-by-output edit would route the case into `runAppliedCaseEngine` before validation, conditional outputs/checks, `unchecked` prose, and per-output methods exist. Each of the three cases therefore migrates completely to `runAppliedCaseEngine` in its own pull request (following `runDampedEngine` in `src/cases/engine.ts`): input validation, optional-output and check gating, `unchecked` notes, named `CaseOutputMethod` adapters for non-grammar / numerical outputs, closed-form `expr` (or `relation`) entries in `data/applied-cases.json`, and removal of that case's `runCase*` runner. Catalog check expressions that currently use two-argument `pow(a, b)` are rewritten to `(a)^(b)` so `evaluateFormula` accepts them.

`src/canonical/entries/` is per-domain modules plus `_l1-build.ts`. That is not a per-equation file. This design does not split or merge them.

## Units

The public unit API stays the wrapper: `parseUnit`, `convertValue`, `readUnit`, and the error classes `UnitError`, `UnknownUnitError`, `UnitRefusedError`, `AmbiguousUnitError`. Callers keep matching those classes.

Checked against the installed MathTS core (`Unit`, `Unit.exactScale`, `Unit.parse`, `Unit.readings`, `Unit.readingsWithSource`, `getUnitRow`, `exactScaleToNumber`, `REFUSED_UNIT_SPELLINGS`, and `NAMED_IRRATIONALS`). The counts and probe results are in the plan's unit baseline. `tests/dimensional/unit-rows-mathts-parity.test.ts` already requires every shared row to match MathTS, with `bit` as the one policy exception.

### What MathTS does not cover

The spellings MathTS does not parse are `Bq`, `Gy`, `Sv`, and `kat`. The only shared row whose scale number differs is `bit` (UPT expression `ln2`, MathTS scale `1` on the bit axis). Sub-kilo prefixes of `pc` and all SI prefixes of those four units stay on the UPT prefix table.

`ln2` is not a unit. `Unit.parse('ln2')` throws. It is the scale expression of the `bit` row, a name in `src/dimensional/constant-rows.ts`, and a key of MathTS `NAMED_IRRATIONALS` (`LN2_EXACT_SCALE`). The `bit` row keeps the expression `ln2`. Nothing registers a unit spelled `ln2`.

Those four spellings, their SI prefixes, `bit`, and the sub-kilo parsec prefixes stay on `data/units.json` and the local reader. `Gyr` stays the gigayear, which the unit table already separates from `Gy`.

### Policy the wrapper keeps even where MathTS parses

Delegating `Unit.parse` or `Unit.to` straight through would change a public result.

| UPT today | Installed MathTS core | Wrapper policy |
|---|---|---|
| `dB`, `dBm`, `dBW`, `Np` throw `UnitRefusedError` with the `data/units.json` reason | `getUnitRow` exists; `Unit.parse` returns a `Unit` object (`Unit.parse('1 dB').toSI().value` is `10^(1/10)`, `Unit.parse('1 Np').toSI().value` is `e`). Not in `REFUSED_UNIT_SPELLINGS` | Refusal runs before any MathTS parse |
| `ton`, `tons` throw `UnitRefusedError` with the short/long/metric message | `AmbiguousUnitError` (`shortton`, `longton`, or `t`) | UPT message and `UnitRefusedError` stay |
| `Mach`, `mach` throw `UnitRefusedError` | `REFUSED_UNIT_SPELLINGS` contains `Mach` and `mach` | UPT `UnitRefusedError` stays |
| `convertValue('1 Hz', 'rad/s')` is `1` with `cycles: 1`; `rpm` is `1/60` with `cycles: 1` | `new Unit(1, 'Hz').to('rad/s')` is `2π`; `Unit.exactScale('Hz')` is `1`; `Unit.parse('Hz').cycles` is `0` | Conversions use `exactScale` plus the UPT cycle count (`cycles` flag on unit rows). `.to` is not the conversion; cycle-counting units stay off `A5_DELEGATED_TEXTS` (`tests/dimensional/unit-cycles-mathts.test.ts`) |
| `convertValue('25 degC', 'K', 'difference')` is `25` | Supports `{ reading: 'difference' }` (and default `.to('K')` is absolute `298.15`) | UPT keeps its `'absolute' \| 'difference'` parameter on `convertValue` |
| `degC/s` throws `UnitRefusedError` | Refuses an affine unit in a compound | Keep `UnitRefusedError` |
| `mAs` is `0.001 A·s`, one reading (issue 676, `tests/dimensional/unit-grammar.test.ts`) | `Unit.parse('mAs')` throws `UnitParseError`; `Unit.readings('mAs')` returns two splits | The product row in `data/units.json` stays the authority |
| `mol/mL` is `1e6 mol/m³`, one reading | One reading, the same scale | Already agreed. Do not invent a second reading |
| `Pas` is `1 Pa·s` | Throws `AmbiguousUnitError` (`P*as` or `Pa*s`) | Local grammar stays |
| `furlong` throws `UnknownUnitError` | `Unit.parse('furlong')` returns a `Unit` object (`exactScale` = `201.168 m`) | Admission stays `data/units.json` |
| `µmK` parses as `1e-6 m·K` | Throws `UnitParseError` | Local grammar stays |
| `mpc` is a milliparsec | Throws `UnitParseError` (`SHORT_UP_ONLY` on `pc`) | Local prefix table stays for that family |

`Unit.createUnit` is process-global. No sprint calls it.

The local grammar in `src/dimensional/units.ts` remains the reader for anything in the table above. Part A step A12 of the units plan (delete the local grammar) is not available on the pinned core, and this design does not schedule it.

### Direct bare-symbol delegation (`tryMathtsA5Reading`)

`src/dimensional/units.ts` has two MathTS paths: `tryMathtsA5Reading` (which bypasses `localUnitReadings` completely for `A5_DELEGATED_TEXTS`) and the post-local `unitParserViaMathts` fallback (which already sets `unitReadingsSource` to `'mathts'` for most bare symbols, but only *after* running `localUnitReadings`).

The delegation sprint expands `tryMathtsA5Reading` (`src/dimensional/mathts-unit-wrapper.ts`) so every agreed bare non-cycle shared symbol (`getUnitRow(symbol)` defined, `symbol !== 'bit'`, `row.cycles !== true`, `Unit.parse(symbol)` succeeds, and `exactScale` agrees with `parseUnit(symbol).scale`) takes the direct MathTS path and skips `localUnitReadings`. Cycle-counting units (`Hz`, `rpm`), Unicode degree aliases whose keys are not in `UNIT_ROWS`, `bit`, the four missing SI units, compounds, and the policy rows above stay off `tryMathtsA5Reading`. `tests/dimensional/unit-parse-delegation.test.ts`, `tests/dimensional/unit-cycles-mathts.test.ts`, and `tests/dimensional/unit-rows-mathts-parity.test.ts` are the pins.

## User documentation

Users have the README's "First five minutes", [`docs/CLI.md`](../../CLI.md) (generated by `scripts/cli-reference.ts`), and [`docs/architecture/API.md`](../../architecture/API.md), which is a hand-written engineering reference. There is no getting-started guide, no generated exhaustive user API reference, no tutorial suite executed by vitest besides `examples/basic-usage.ts`, and no equation and constant catalog guide.

All of this lives in the repository as Markdown. There is no hosted site and no documentation dependency.

- **Getting started** — `docs/user/getting-started.md`. Install and quickstart commands matching the README, how a clone builds, and links to `docs/CLI.md` and `docs/user/catalog.md` (with the link to `docs/user/tutorials/` added by the tutorials sprint once that directory exists). Does not freeze catalog counts.
- **Equation and constant catalog guide** — `docs/user/catalog.md`. Covers both:
  1. **Equations:** bridge catalog records (`data/bridge-catalog.json`, cited as `BE-<id>` and passed to the CLI as `be-<id>`, projected to `BRIDGE_EQUATIONS`), canonical equations (`CE-…` from `src/canonical/registry.ts`), and atlas families/bridges (`upt atlas`). Teaches `upt search`, `upt explain`, `upt evaluate`, `upt canonical`, and `upt atlas` without freezing counts.
  2. **Physical constants:** `src/core/constants.ts`, `CONSTANT_ROWS` (`src/dimensional/constant-rows.ts`), `PhysicalConstants`, and `CANONICAL_CONSTANTS`. Explains the three provenance tiers (2019 exact SI constants, CODATA 2022 constants sourced from MathTS, and conventional astrophysical/cosmological constants such as `M_SUN_SI`, `GM_SUN_SI`, and `H0_SI`), key gotchas (bare `e` is the elementary charge in formulas, Euler's number is `exp(1)`, `euler` is refused; `HBAR_SI = H_SI / (2π)` rather than a truncated CODATA decimal), and `--units=si|natural|geometrized`.
- **TSDoc gaps** — filled on every public surface declaration lacking a summary: root runtime exports, root `export type` exports, `atlas` namespace members (`src/atlas/public.ts`), and the public subpath `universal-physics-tensor/numerical/mathts-engine` (`MathTSEngine`). The whole-`src/` tree-sitter list (including internal helpers and re-export clauses) is not the work list. The code-docs ratchet already fails a pull request that adds an export with no summary.
- **Full generated API reference** — `docs/user/api.md`, generated by `scripts/api-reference.ts` in the style of `scripts/cli-reference.ts` (TypeScript 7 ships no compiler API; `MEMORY.md`). Covers all four parts of the public surface: root runtime exports (grouped by `src/index.ts` section with export kind, declaration signature, and TSDoc summary), root `export type` / interface exports, `atlas.*` namespace members (`src/atlas/public.ts`), and the `universal-physics-tensor/numerical/mathts-engine` subpath (`MathTSEngine`). Cross-links [`docs/architecture/API.md`](../../architecture/API.md) as the narrative engineering reference. `docs-fresh` runs `bun scripts/api-reference.ts --check` beside `scripts/cli-reference.ts --check`.
- **Tutorials** — `docs/user/tutorials/`. Runnable worked examples (both CLI `bash` and TypeScript `ts` blocks using real root exports such as `evaluateRelation`, `parseUnit`, `convertValue`, and `PhysicalConstants`) executed by a vitest file next to `tests/examples/basic-usage.test.ts` using the `node --experimental-strip-types --no-warnings` harness already proven in `tests/tools/readme-examples.test.ts`. `tests/api/api-reference-symbols.test.ts` automatically validates every package-root import statement from `'universal-physics-tensor'` under `docs/`. The existing CI `vitest` job is the CI step; no new timeout, no retry, no second workflow.

`examples/basic-usage.ts` already runs against the package name. It stays.

## Out of scope

- A version bump, a tag, or `npm publish`.
- Editing `package.json` dependencies or `bun.lock`.
- A MathTS pull request. The upstream items for the owner to file are: the four missing SI units (`Bq`, `Gy`, `Sv`, `kat`), a `bit = ln2` option, optional splitting of CODATA constants out of `typed-function` startup in `mathts-functions`, and (if desired) `pc` sub-kilo prefixes / `dB`/`Np` refusal policy. (Difference-reading temperature conversion `{ reading: 'difference' }` already exists in MathTS.) UPT does not patch MathTS from this tree.
- Deleting `src/dimensional/units.ts`.
- The bridge generating-set pass.
- Authoring or scoring an atlas benchmark item.
- A wall-clock assertion in the test suite. Benchmarks print a baseline. They do not fail CI for being slow.
- Committing `bench/results.json`, a CPU profile, or a repo-tools JSON dump.
