# UPT optimization, reduction, MathTS units, and user docs

The design is [`docs/superpowers/specs/2026-11-21-upt-optimization-docs-design.md`](../specs/2026-11-21-upt-optimization-docs-design.md). This file is the work. It authorizes nothing until an `ACTIVE.md` row names the sprint. Each sprint is one pull request (squash-merge only). Do not bump `package.json`, do not edit `bun.lock`, and do not publish.

## Rules for every sprint

1. File the `ACTIVE.md` row before editing the files the sprint names. Tick it without retitling it. Add a `CHANGELOG.md` bullet under `## [Unreleased]` that says what changed and why.
2. A new test is shown failing on the unchanged tree first (`WORKFLOWS.md`). Keep that failure in the pull request body.
3. Scoped gate: the `bunx vitest run` files named in the sprint, then `bun run typecheck` and `bun run layer:check` when the sprint touches `src/`. Any new exported symbol in `src/` (including `@internal`) must carry a JSDoc summary line so `code-docs-ratchet` and the pre-push hook pass.
4. Keep `docs-fresh` green on every sprint: whenever a sprint adds/removes tracked files under `src/` or `tests/` or deletes/adds exports, run `bun run docs:deps` and `bun scripts/readme-status.ts`, commit the updated generated docs (`docs/architecture/DEPENDENCY_GRAPH.md`, `TEST_COVERAGE.md`, `unused-analysis.md`, `README.md`), and verify `bun scripts/readme-status.ts --check` and `bun run audit:plans`. When a sprint touches `package.json`, `bin/`, `src/cli/`, or `src/index.ts`, also run `bun run package:check`.
5. Pre-push runs the full suite. Judge the summary counts, not the exit code alone.
6. Do not add a retry, a longer timeout, or a weaker assertion. Do not add an assertion on milliseconds.
7. Do not commit `bench/results.json`, a `*.cpuprofile`, or a repo-tools JSON dump.
8. A sprint that changes a golden, an error class, or a printed CLI line stops. Say so in the pull request and do not land the behavior change.
9. Cross-check any code snippet below against the tree before using it. The design's decisions win when this file and the tree disagree; record the disagreement in the commit message.

## Baseline (2026-11-21)

Tree `17690f5a` (and reviewer verification on `e69aea2a`), package `16.0.0`, Node `v22.23.4` x64, Bun `1.4.5` (reviewer: Bun `1.4.2`), 4 vCPU Intel Xeon. Lockfile pins `@danielsimonjr/mathts-core@0.28.0`, `mathts-functions@0.86.0`, `mathts-expression@0.14.0`, `mathts-matrix@0.11.0`, `mathts-tensor@0.5.0`, `mathts-autograd@0.6.0`. `dist/` was `tsc` of that tree. These are this machine's medians. A later machine re-measures with the same commands. It does not copy these digits into a test.

Catalog load reported 160 `BRIDGE_EQUATIONS`, 121 evaluators, 109 canonical equations. `data/units.json` has 97 unit rows (113 alias keys) plus 5 affine spellings = 118 symbols, and 26 prefix entries (`Q`..`q` including `u`, `µ`, `μ`). MathTS `UNIT_ROWS` has 206 keys. Public root surface: 233 runtime snapshot names (15 undocumented, all in `src/dimensional/types.ts`), 246 root `export type` names (0 undocumented), 33 `atlas.*` namespace exports in `src/atlas/public.ts` (3 undocumented in `src/atlas/types.ts`), and 1 public subpath export (`MathTSEngine`, documented).

### CLI wall clock and module import costs

Three runs, median of the three, `node bin/upt.mjs` on `dist/`. Bare Node is five runs, the middle one.

| Command | Median |
|---|---|
| `node -e "console.log('16.0.0')"` | 20 ms |
| `upt version` | 646 ms |
| `upt help` | 655 ms |
| `upt evaluate be-63 mu_e=2` | 662 ms |
| `upt search pendulum` | 663 ms |
| `upt explain hawking-temperature mass=1Msun` | 672 ms |
| `upt audit` | 1544 ms |

One `node --cpu-prof` sample of `upt version` (629 hits): `typed-function` 34.5%, `compileSourceTextModule` 15.3%, `@danielsimonjr/*` 13.8%. One sample of `upt audit` (1 457 hits): `@danielsimonjr/*` 42.8% (of which `trustedMathFunctions` in `mathts-expression` is 13.9%), `typed-function` 14.8%, `dist/bridges` 6.0%, `dist/dimensional` 5.9%.

Fresh-process ESM import timings (Node `v22.23.4`) explain every millisecond of startup:

| Module | Fresh import | Why |
|---|---|---|
| `@danielsimonjr/mathts-core` | 20.2 ms | Lightweight |
| `@danielsimonjr/mathts-expression` | 8.1 ms | Lightweight |
| `@danielsimonjr/mathts-functions` (and `/evaluate`) | 380.0 ms | Eager `typed-function` dispatch build (pulled by `src/core/constants.ts`) |
| `dist/cli/args.js`, `command.js`, `errors.js`, `output.js` | 1.3–2.0 ms each | Pure CLI plumbing |
| `dist/cli/record.js` | 507.1 ms | Static import in `src/cli/main.ts` pulls `record-tables.js` → `core/constants.ts` → `mathts-functions` |
| `dist/cli/commands/index.js` | 571.8 ms | Only 5 CLI helpers pull `mathts-functions` (`library-defaults.ts` 513.5 ms, `closed-form-range.ts` 478.7 ms, `conventions.ts` 462.7 ms, `map-evidence.ts` 436.5 ms, `eval-numbers.ts` 433.7 ms); the other 24 command modules are ≤37 ms |
| `dist/bridges/catalog-load.js` | 34.3 ms | Does not import `mathts-functions` |

### Formula-parse repetition in `upt audit` (verified)

Measured in-process on `dist/` during one `runCli(['audit'])`:

- `parseFormula` calls: **2,809** across **119** unique expression strings (`unique / calls = 0.042`, 95.8% duplicate parses; top expression parsed 274 times).
- Every call invoked `compileExpr` → `trustedMathFunctions(mathScope)` inside `@danielsimonjr/mathts-expression`.
- In-process `runCli(['audit'])` dropped from **950.6 ms** (no cache) to **324.6 ms** (cold cache, **2.9× faster, saving 626 ms**; warm cache **251.3 ms**) with byte-identical stdout.

### In-process warm times

Bun, one untimed call then the repeats below. Module load of the probe's UPT imports was 397 ms and is not one of these rows.

| Work | Median |
|---|---|
| `parseUnit` on all 118 symbols | 2.273 ms |
| `convertValue` on 23 compound texts | 0.877 ms |
| `evaluateFormula('2*pi*sqrt(length/gravity)', {length:1, gravity:9.81})` | 0.077 ms |
| `evaluateBridge` on all 121 evaluators, sample inputs from `tests/bridges/evaluators.test.ts` | 17.384 ms |
| `MathTSEngine.mul` shape `[100,100]` | 0.011 ms |
| `forwardGrad` of `x*x`, shape `[100,100]` (full `[100,100,100,100]` Jacobian: 10 000 passes, 10^8 `Float64Array` ≈ 800 MB) | 2489 ms |
| `reverseGrad` of `x*x`, shape `[100,100]` | 0.133 ms |
| `integrateGeodesic` 1 000 steps, solar radial infall, bench fixture | 2.064 ms |
| `integrateGeodesic` 5 000 steps | 5.222 ms |
| Riemann finite-difference pipeline at `r = 3 r_s` | 0.378 ms |
| That pipeline plus `contractRiemannJS` | 0.289 ms (inside the 0.22–0.69 ms spread of the Riemann-only runs) |
| `evaluateCovariantEikonalNumerical`, 2 048 steps, solar geometry from `bench/covariant-eikonal.bench.ts` | 4.946 ms |

`forwardGrad` at `[10]` was 0.029 ms. The 2489 ms cost is the `O(N^2)` full Jacobian inside `@danielsimonjr/mathts-autograd`, and `forwardGrad` is never called in UPT production code (`src/diff/bridge-ast-gradient.ts` already uses MathTS reverse mode).

### Unit comparison on core 0.28.0

`Unit.exactScale` against `parseUnit` for every symbol in `data/units.json` (113 unit keys + 5 affine spellings = 118 symbols):

- **113** symbols match scale (108 non-affine + 5 affine).
- **`bit`** differs: UPT `ln2` (`Math.LN2 ≈ 0.693147...`), MathTS `1` (axis 8).
- **4** symbols are absent in MathTS (`getUnitRow` is `undefined`, `Unit.parse` throws): `Bq`, `Gy`, `Sv`, `kat`.
- **Prefix gaps:** across all **26** UPT prefixes (`Q`..`q` including `u`, `µ`, `μ`), **120** tokens parse in UPT and throw in MathTS: **16** sub-kilo prefixes on `pc` (`h`, `da`, `d`, `c`, `m`, `u`, `µ`, `μ`, `n`, `p`, `f`, `a`, `z`, `y`, `r`, `q`) plus `26 × 4 = 104` on `Bq`, `Gy`, `Sv`, `kat` (and **0** prefix gaps or scale mismatches on any other prefixable unit). In the 3-prefix sample `{m, k, u}`, that is **14** tokens (`mpc`, `upc`, and `k/m/u` on `Bq`, `Gy`, `Sv`, `kat`).
- **Delegation state today:** `unitReadingsSource(s)` is already `'mathts'` for **108** of 118 bare symbols via the post-local `unitParserViaMathts` fallback (the 10 `'local'` symbols are `bit`, `Bq`, `Gy`, `Sv`, `kat`, and the 5 Unicode degree spellings `°`, `°R`, `°C`, `℃`, `°F` where `getUnitRow` is `undefined`). However, `tryMathtsA5Reading(s)` (the direct path that skips `localUnitReadings`) currently handles only **8** bare symbols (`d`, `day`, `angstrom`, `Angstrom`, `Å`, `psi`, `torr`, `degC`), leaving **98** bare non-cycle shared symbols (`97` non-affine + `degF`) running `localUnitReadings` first.

Also probed, and required of later sprints: `dB`/`dBm`/`dBW`/`Np` are `UnitRefusedError` in UPT while MathTS `Unit.parse` returns a `Unit` object (`Unit.parse('1 dB').toSI().value ≈ 1.2589`, `Unit.parse('1 Np').toSI().value ≈ 2.7183`; `REFUSED_UNIT_SPELLINGS` in 0.28.0 holds only `Mach` and `mach`); `ton` is `UnitRefusedError` in UPT and `AmbiguousUnitError` in MathTS; `convertValue('1 Hz', 'rad/s')` is `{value:1, cycles:1}` while `new Unit(1, 'Hz').to('rad/s')` is `2π` and `Unit.parse('Hz').cycles` is `0`; `Unit.parse('25 degC').to('K', { reading: 'difference' }).toNumeric()` is `25` (already supported in MathTS); `mAs` is `1e-3` (one reading) in UPT and `UnitParseError` in MathTS; `mol/mL` is `1e6` (one reading in both); `Pas` is `1` in UPT and `AmbiguousUnitError` in MathTS; `furlong` is `UnknownUnitError` in UPT and a `Unit` object (`exactScale` = `201.168 m`) in MathTS; `Unit.parse('ln2')` throws (`ln2` is the `bit` row's scale expression and `NAMED_IRRATIONALS.ln2`, not a unit spelling).

## Sprint order

| Id | Pull request | Depends on |
|---|---|---|
| S1 | In-process benches and a CLI wall-clock script | — |
| S2 | `upt version` returns before loading `cli-api.js`, `commands/index.js`, and `record.js` | S1 |
| S3 | Decouple `commands/index.js` from `mathts-functions` so `upt help` and `--help` skip the heavy barrel | S2 |
| S4 | Memoize compiled formulas in `parseFormula` (eliminates repeated `trustedMathFunctions` work in `upt audit`) | S1 |
| S5 | Delete the three unreachable case runners (`runCaseSkinDepth`, `runCaseKeplerRv`, `runCaseDampedResonator`) | — |
| S6 | Migrate `case-resistor-noise` completely onto `runAppliedCaseEngine` | S5 |
| S7 | Migrate `case-lumped-cooling` completely onto `runAppliedCaseEngine` | S6 |
| S8 | Migrate `case-brownian-sphere` completely onto `runAppliedCaseEngine` | S7 |
| S9 | Pin the unpinned core 0.28.0 unit gaps in `mathts-unit-gaps.test.ts` | — |
| S10 | Expand `tryMathtsA5Reading` to all bare shared non-cycle spellings | S9 |
| S11 | Getting-started guide and equation + constant catalog guide | — |
| S12 | Fill TSDoc gaps on public root exports and `atlas` public types | — |
| S13 | Generate full user API reference (`docs/user/api.md`) and gate it in `docs-fresh` | S12 |
| S14 | Runnable tutorials executed by vitest | S11 |

S1, S5, S9, S11, and S12 have no upstream sprint. A single worker still runs the table from top to bottom so two sprints do not edit `methods.ts`, `engine.ts`, or `main.ts` at once.

---

## S1 — Bench harness

**Files.** `bench/catalog-eval.bench.ts` (new), `bench/unit-table.bench.ts` (new), `bench/README.md` (add the two rows to the table), `scripts/cli-wall-clock.mjs` (new).

**Steps.**

1. `bench/catalog-eval.bench.ts` imports `evaluateBridge` and `BRIDGE_EVALUATORS` from `../src/bridges/evaluators.ts`. Copy the `sample` object from the test `every spec run is callable with its declared inputs` in `tests/bridges/evaluators.test.ts`. Build one input record per evaluator the way that test does (`spec.inputKeys`). Call `evaluateBridge` for every id inside `bench`. Hoist the input records outside the bench callback.
2. `bench/unit-table.bench.ts` imports `parseUnit` from `../src/dimensional/units.ts` and the symbol list from `UNIT_DATA` (`../src/dimensional/unit-data.ts`). Bench one loop of `parseUnit` over every symbol, catching the refusals the table itself stores (`bit` parses; refused spellings throw). Hoist the symbol array.
3. Add both files to the table in `bench/README.md`. The README says a missing or extra `*.bench.ts` is a defect in that table.
4. `scripts/cli-wall-clock.mjs` is plain Node, no TypeScript. It times, with `process.hrtime.bigint`, three runs each of `node bin/upt.mjs version`, `help`, `evaluate be-63 mu_e=2`, and `audit`, and prints one median line per command in milliseconds. It does not write a file. It exits 0.

**Acceptance.** `bunx vitest bench bench/catalog-eval.bench.ts bench/unit-table.bench.ts --run` prints a hz line for each bench. `node scripts/cli-wall-clock.mjs` prints four median lines. No test asserts a threshold. `bench/README.md` lists both new files.

**Verify.** Those two commands, plus `bun run audit:plans`. `git status` does not show `bench/results.json`.

**Risk.** The sample object can drift from the test. If an evaluator key is missing, the bench throws at load; copy the object again from the test rather than inventing a value.

---

## S2 — `upt version` does not load `cli-api.js`, `commands/index.js`, or `record.js`

**Files.** `src/cli/main.ts`, `tests/cli/version-fast-path.test.ts` (new), and any test under `tests/cli/` that relied on importing `src/cli/main.ts` as a side effect to populate the command registry. (Existing `tests/cli/hardening.test.ts` and `tests/cli/main-dispatch.test.ts` stay untouched unless needed; `version-fast-path.test.ts` pins the static-import ban and fast-path edge cases.)

**Steps.**

1. RED. Add `tests/cli/version-fast-path.test.ts` that reads `src/cli/main.ts` as text and asserts it has no top-level static `import` (other than `import type`) from `../cli-api.js`, `./commands/index.js`, or `./record.js`. Dynamic `import()` inside a function is allowed. Run `bunx vitest run tests/cli/version-fast-path.test.ts` and keep the failure.
2. In `src/cli/main.ts`:
   - Change `import * as api from '../cli-api.js'` to `import type * as CliApi from '../cli-api.js'` plus a lazy `loadApi()` helper (`await import('../cli-api.js')`).
   - Change `import './commands/index.js'` to a one-shot lazy `ensureCommands()` helper (`let commandsLoaded = false; async function ensureCommands() { if (!commandsLoaded) { commandsLoaded = true; await import('./commands/index.js'); } }`). Keeping it one-shot preserves `tests/cli/main-dispatch.test.ts`, which calls `clearRegistryForTest()` and `registerForTest(makeStubCommand())` between tests!
   - Change `import { recordInvocation, replayRecord, showRecord, type Io } from './record.js'` to `import type { Io } from './record.js'` (or extract `type Io` into `./io.ts` if cleaner) and dynamically `await import('./record.js')` ONLY inside the `files.record !== undefined`, `files.replay !== undefined`, and `files['show-record'] !== undefined` branches. **Important:** `dist/cli/record.js` takes ~507 ms to import because `record-tables.ts` pulls `mathts-functions`; leaving it as a static import defeats S2 completely.
   - Guard the fast path carefully: ONLY return `packageVersion()` early BEFORE `ensureCommands()` / `loadApi()` when no `--record`, `--replay`, `--show-record`, or `--json` global flag was given (so `upt --record=FILE version` still records via `recordInvocation(..., api)` and `upt --json version` still returns the documented refusal!).
   - `upt version extra` still throws `UsageError` with `upt version takes no arguments` and exits 2 on the fast path without importing heavy modules.
3. Grep `tests/` for `cli/main` before finishing: if any test imported `src/cli/main.ts` expecting `listCommandNames()` to be populated before calling `runCli`, add `import '../../src/cli/commands/index.js'` in that test.
4. Add a spawn check in `tests/cli/version-fast-path.test.ts` for `node bin/upt.mjs version` (exit 0, matches `package.json` version + `\n`) and an in-process `runCli(['version', 'extra'], io)` check (exit 2, `upt version takes no arguments`).

**Acceptance.** The static-import source assertion passes. Spawned `upt version` matches `package.json`. `upt --record=FILE version`, `upt --json version`, `upt version extra`, and `upt help` preserve exact existing behavior. `upt version` wall clock drops under 100 ms (vs 646 ms baseline).

**Verify.** `bun run build && bunx vitest run tests/cli/version-fast-path.test.ts tests/cli/main-dispatch.test.ts tests/cli/hardening.test.ts tests/cli/help-covers-registry.test.ts tests/cli/record-replay.test.ts`. `bun run typecheck && bun run layer:check && bun run package:check`. Run `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`. Then run `node scripts/cli-wall-clock.mjs` and record the new `upt version` median beside the S1 baseline in `NOTES.md`. If `upt version` stays above 100 ms, a static import of `mathts-functions` remains — inspect imports before landing.

**Risk.** Forgetting `./record.js` or triggering `version` fast path ahead of `--record`/`--json` will either keep startup at ~550 ms or break `tests/cli/record-replay.test.ts`.

---

## S3 — Decouple `commands/index.js` from `mathts-functions` so `upt help` skips the heavy barrel

**Files.**
- `src/cli/closed-form-range.ts`
- `src/cli/library-defaults.ts`
- `src/composition/discovery-defaults.ts` (new, pure leaf constant `DEFAULT_MAX_ORDERS_OF_MAGNITUDE` with JSDoc; re-exported from `src/composition/discovery.ts`)
- `src/composition/probe/types.ts` (move `DEFAULT_ALPHA` and `MAX_CORRECTION_TERMS` here; re-exported from `src/composition/probe/study.ts`)
- `src/dimensional/named-dimension-names.ts` (new, pure `NAMED_DIMENSION_NAMES` list + `NamedDimensionName` type with JSDoc; `src/dimensional/dimension-spec.ts` imports it, re-exports `NAMED_DIMENSION_NAMES`, and types `NAMED_DIMS: Readonly<Record<NamedDimensionName, Dimension>>` so the two can never drift)
- `src/cli/commands/derive.ts`, `src/cli/commands/map.ts`, `src/cli/commands/eval.ts`
- `src/cli/main.ts` (only call `loadApi()` when executing a command's `run()` or `--record`/`--replay`, NOT for `help`, `--help`, `-h`, `help <cmd>`, `<cmd> --help`, or unknown-verb exit-2!)
- `tests/cli/help-fast-path.test.ts` (new)

**Steps.**

1. RED. Add `tests/cli/help-fast-path.test.ts` that spawns `node -e "await import('./dist/cli/commands/index.js')"` (or inspects the static import graph of `dist/cli/commands/index.js` via `node --input-type=module` using `module.register` / `process.getActiveResourcesInfo` or checking that `@danielsimonjr/mathts-functions` is not loaded — simplest deterministic check: spawn a fresh Node script with a tiny ESM `register` loader hook or read `docs/architecture/dependency-graph.json` after `docs:deps`? Even simpler and zero-flakiness: a small helper in the test walks static `import ... from '...'` edges starting at `dist/cli/commands/index.js` across `dist/` and asserts `'@danielsimonjr/mathts-functions'` is NOT reachable!). Run `bun run build && bunx vitest run tests/cli/help-fast-path.test.ts` and keep the failure (today it prints the exact import chains through `closed-form-range.js`, `library-defaults.js`, `conventions.js`, `map-evidence.js`, and `eval-numbers.js`).
2. Decouple the five helpers without creating a second command registry:
   - `src/cli/closed-form-range.ts`: replace `import { BRIDGE_EVALUATORS } from '../bridges/evaluators.js'` with `import { catalogEvaluators } from '../bridges/catalog-load.js'` and compute `formatClosedFormRange(catalogEvaluators().map((e) => e.catalogId))` (verified exact 121-id match with `BRIDGE_EVALUATORS.keys()`).
   - `src/cli/library-defaults.ts`: import `DEFAULT_MAX_ORDERS_OF_MAGNITUDE` from `../composition/discovery-defaults.js`, `DEFAULT_ALPHA`, `MAX_CORRECTION_TERMS`, `DEFAULT_HOLDOUT_TOL`, `DEFAULT_SEARCH_BUDGET` from `../composition/probe/types.js`, and `NAMED_DIMENSION_NAMES` from `../dimensional/named-dimension-names.js`. Re-export the moved constants from `discovery.ts`, `study.ts`, and `dimension-spec.ts` so no other caller changes.
   - `src/cli/commands/derive.ts` and `src/cli/commands/map.ts`: remove top-level `import { canonicalCheckFailed, conventionLines } from '../conventions.js'` and `import { withCatalogEvidence } from '../map-evidence.js'`; load them with `await import(...)` inside `run()`.
   - `src/cli/commands/eval.ts`: remove top-level `import { codataScope } from '../eval-numbers.js'`; load it with `await import('../eval-numbers.js')` inside `run()`.
3. In `src/cli/main.ts`, verify that `help`, `--help`, `-h`, `help <cmd>`, `<cmd> --help`, and unknown-verb exit-2 call `ensureCommands()` and return WITHOUT calling `loadApi()`.
4. Re-build (`bun run build`) and verify `tests/cli/help-fast-path.test.ts` passes (zero static path from `dist/cli/commands/index.js` to `@danielsimonjr/mathts-functions`), `tests/cli/golden/help.txt` is byte-identical, and `bun scripts/cli-reference.ts --check` exits 0.

**Acceptance.** Static reachability test passes (`dist/cli/commands/index.js` cannot reach `@danielsimonjr/mathts-functions`). `tests/cli/golden/help.txt`, `tests/cli/help-covers-registry.test.ts`, and `bun scripts/cli-reference.ts --check` pass unchanged. `upt help` median drops from ~655 ms to under 120 ms on this class of machine.

**Verify.** `bun run build && bunx vitest run tests/cli/help-fast-path.test.ts tests/cli/help-covers-registry.test.ts tests/cli/help-flags.test.ts tests/cli/main-dispatch.test.ts tests/cli/derive.test.ts tests/cli/map-filters.test.ts tests/cli/eval.test.ts tests/cli/evaluate.test.ts`. `bun run typecheck && bun run layer:check && bun run package:check && bun scripts/cli-reference.ts --check`. Run `bun run docs:deps && bun scripts/readme-status.ts && bun scripts/readme-status.ts --check && bun run audit:plans`. Record the new `upt help` median in `NOTES.md`.

**Risk.** Moving `NAMED_DIMENSION_NAMES` could drift from `NAMED_DIMS` unless `NAMED_DIMS` is typed as `Readonly<Record<NamedDimensionName, Dimension>>`. Do not skip that type annotation.

---

## S4 — Memoize compiled formulas in `parseFormula`

**Files.** `src/numerical/formula-mathts.ts`, `tests/numerical/formula-parse-cache.test.ts` (new), `NOTES.md`.

**Steps.**

1. Baseline already measured on `dist/`: one `upt audit` calls `parseFormula` **2,809** times across **119** unique expression strings (`unique / calls = 0.042`), invoking `compileExpr` → `trustedMathFunctions(mathScope)` on every call. Save `node bin/upt.mjs audit > /tmp/audit-before.txt` before editing `src/`.
2. Export `createMathtsFormulaParser` as `@internal` (with a JSDoc summary line) from `src/numerical/formula-mathts.ts` so tests can inject a counting `compileExpr` mock without mutating module state.
3. RED. Add `tests/numerical/formula-parse-cache.test.ts`:
   - Construct a parser with `createMathtsFormulaParser` and a counting `compileExpr` spy; call `parser('2*pi*sqrt(L/g)')` twice with different scopes `{ L: 1, g: 9.81 }` and `{ L: 4, g: 9.81 }`; assert `compileExpr` was called once and the two `evaluate(scope)` calls return distinct values (proving scope is not cached, only compilation).
   - Add a cache-eviction test: fill past the cache cap (e.g. `MAX_FORMULA_CACHE_ENTRIES = 2048`) and verify the cache stays bounded rather than growing unboundedly.
   - Run `bunx vitest run tests/numerical/formula-parse-cache.test.ts` and keep the failure.
4. In `createMathtsFormulaParser` (`src/numerical/formula-mathts.ts`), memoize the returned `CompiledFormula` in a `Map<string, CompiledFormula>` keyed by expression string, bounded to `2048` entries (evict oldest key when `cache.size >= MAX_FORMULA_CACHE_ENTRIES`). `evaluate(scope)` still receives the caller's scope on every call, so `e` stays `E_SI` unless overridden in `scope` and no numeric result is cached.
5. Rebuild (`bun run build`), run `node bin/upt.mjs audit > /tmp/audit-after.txt`, and run `diff -u /tmp/audit-before.txt /tmp/audit-after.txt` (must be empty; remove `/tmp/audit-*.txt` afterwards).

**Acceptance.** Cache hit, scope-isolation, and bounded-eviction tests pass (and fail when the `Map` is removed). `upt audit` stdout is byte-identical. `node scripts/cli-wall-clock.mjs` shows `upt audit` drops significantly (~1544 ms → ~900 ms wall clock, ~951 ms → ~325 ms in-process).

**Verify.** `bun run build && bunx vitest run tests/numerical/formula-parse-cache.test.ts tests/bridges/expr-parse.test.ts tests/cli/golden.test.ts`. `bun run typecheck && bun run layer:check`. `bun run docs:deps && bun scripts/readme-status.ts && bun scripts/readme-status.ts --check && bun run audit:plans`. Record the before/after `upt audit` median and `2,809 / 119` parse count in `NOTES.md`.

**Risk.** Any caller passing `e` in `scope` must still override the default `e: E_SI`, and two calls with the same expression and different `scope` must never share evaluated numbers. Step 3 pins both.

---

## S5 — Delete the three unreachable case runners

**Files.** `src/cases/methods.ts`, `src/cases/engine.ts`, `tests/cases/dead-runners.test.ts` (new), `tests/cases/applied-case-engine.test.ts` (replace `legacyMatch` runner imports with pinned numeric references), generated docs (`docs/architecture/unused-analysis.md`, `docs/architecture/DEPENDENCY_GRAPH.md`, `docs/architecture/TEST_COVERAGE.md`, `README.md`).

**Steps.**

1. Confirm in `data/applied-cases.json` that no output of `case-skin-depth`, `case-kepler-rv`, or `case-damped-resonator` names `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator` (they use `expr`, `relation`, `skinDeltaMaxwellM`, and `windowedLinewidthCatalogHz`).
2. RED. Add `tests/cases/dead-runners.test.ts` that asserts:
   - `data/applied-cases.json` text does not contain `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`.
   - `CASE_METHOD_NAMES` does not contain those three names.
   - `usesCatalogEngine` returns `true` for all three records.
   Run `bunx vitest run tests/cases/dead-runners.test.ts` and keep the failure (`CASE_METHOD_NAMES` still lists them).
3. **Preserve test strength in `tests/cases/applied-case-engine.test.ts`:** Before deleting the three runners, read lines 7–9, 47, 77, and 95 of `tests/cases/applied-case-engine.test.ts`. Do **not** simply delete the `legacyMatch` assertions (that would weaken coverage). Record the exact reference outputs and check outcomes of the three valid examples (cross-checked against `tests/cases/skin-depth.test.ts`, `kepler-rv.test.ts`, and `damped-resonator.test.ts`) and replace `legacyMatch(id, runCase...)` with pinned numeric assertions on `runAppliedCaseEngine(record, inputs)` (every output key, numeric value to `1e-12` relative, check ids and `holds` booleans, and `unchecked` count).
4. Delete `runCaseSkinDepth`, `runCaseKeplerRv`, `runCaseDampedResonator`, their `RUN_BY_ID` entries, and their `CASE_METHODS` / `CASE_METHOD_NAMES` entries in `src/cases/methods.ts`. Keep `maxwellDepthFactor`, `skinDeltaMaxwellM`, `windowedLinewidthHz`, and `windowedLinewidthCatalogHz`.
5. In `src/cases/engine.ts`, delete `ENGINE_CASE_IDS` only if `usesCatalogEngine` still returns `true` for all three records without it (Step 2's test verifies this).

**Acceptance.** `tests/cases/cases-directory.test.ts`, `tests/cases/dead-runners.test.ts`, and `tests/cases/applied-case-engine.test.ts` pass with full numeric coverage preserved. Grep of `src/` finds no `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`. `bun scripts/readme-status.ts --check` passes (unused-export count in `README.md` matches regenerated `docs/architecture/unused-analysis.md`).

**Verify.** `bunx vitest run tests/cases tests/cli/signed-residual-label.test.ts`. `bun run typecheck && bun run layer:check`. `bun run docs:deps && bun scripts/readme-status.ts && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** Deleting exports changes the unused-export count embedded in `README.md` (`readme-status:table`); skipping `bun run docs:deps && bun scripts/readme-status.ts` will fail the `docs-fresh` CI job.

---

## S6, S7, S8 — Migrate the three remaining legacy cases onto `runAppliedCaseEngine` (one case per PR)

**Why complete per-case migration is required.** In `src/cases/engine.ts`, `usesCatalogEngine(record)` flips from `false` to `true` the moment *any* output of a legacy case moves from `runCase*` to `expr`, routing the entire case through `runAppliedCaseEngine`. A partial edit leaves `runAppliedCaseEngine` calling `runCase*` as a `CaseOutputMethod` (crashing) and drops validation, conditional checks, and `unchecked` prose. Each sprint therefore migrates **one complete case** onto `runAppliedCaseEngine` (following `runDampedEngine` in `src/cases/engine.ts`) and deletes its `runCase*` runner in the same PR. Do not start S7 while S6 is open, or S8 while S7 is open.

### Exact migration table

| Sprint | Case id | Runner to delete | Add to `src/cases/engine.ts` | Keep as named `CaseOutputMethod` adapters in `src/cases/methods.ts` (all other outputs move to `expr` or `relation` in `data/applied-cases.json`) |
|---|---|---|---|---|
| **S6** | `case-resistor-noise` | `runCaseResistorNoise` | `runResistorNoiseEngine`: validate `R_ohm`, `R_in_ohm`, `T_K`, `t_avg_s` > 0; `C_in_F`, `f_lo_Hz` ≥ 0; `f_lo_Hz < f_hi_Hz`; optional `e_n2_V2_per_Hz`, `i_n2_A2_per_Hz` ≥ 0. Gate optional amplifier outputs (`V_rms_total_V`, `resistor_fraction`, `T_n_K` → `null` when neither given) and `amplifier` check. Preserve exact `unchecked` strings (including `"i_n was not given and is taken as 0"` / `"e_n was not given and is taken as 0"`). | `resistorParentVrmsV` (adaptive quadrature over Planck/RC spectrum for `V_rms_parent_V`). Move `R_eff_ohm`, `S_V_V2_per_Hz` (or `be-58` relation), `V_rms_unloaded_V`, `V_rms_V`, `loading_ratio`, `parent_deviation`, `V_rms_rel_sigma`, and conditional `V_rms_total_V`, `resistor_fraction`, `T_n_K` to `expr`. |
| **S7** | `case-lumped-cooling` | `runCaseLumpedCooling` | `runLumpedCoolingEngine`: validate `a_m`, `rho_kg_per_m3`, `c_J_per_kg_K`, `k_W_per_m_K`, `h_W_per_m2_K`, `T0_K`, `T_inf_K` > 0; `emissivity` ∈ `[0, 1]`; `t_s` ≥ 0. Pass `{ sigma_SB: SIGMA_SB_SI }` in `extra` (or compute `h_rad_max` via method). Preserve exact `unchecked` strings. | `lumpedCoolingQJ` (uses `-Math.expm1(-t / tau)` for small-`t/tau` accuracy; `expm1` is not in catalog grammar), `lumpedRadiativeConductance` (uses `Math.max(T0_K, T_inf_K)`; 2-arg `max` is not in catalog grammar), `lumpedSphereMeanK`, `lumpedSphereCentreK`, `lumpedSphereSurfaceK` (wrapping `sphereSeries`), and `lumpedRadiatingTempK` (returns `null` when `Bi_radiating > 0.1`, else `lumpedRadiatingTemperature`). Keep exported helpers `sphereEigenvalues`, `sphereSeries`, `lumpedRadiatingTemperature`, `SIGMA_SB_SI`. Move `tau_s`, `Bi`, `Fo`, `theta`, `T_K`, `parent_deviation`, `Bi_radiating` to `expr`. |
| **S8** | `case-brownian-sphere` | `runCaseBrownianSphere` | `runBrownianSphereEngine`: validate `T_K`, `eta_Pa_s`, `a_m`, `rho_p_kg_per_m3`, `rho_f_kg_per_m3`, `t_s` > 0; `d` ∈ `{1, 2, 3}`; optional `h_m > a_m`. Pass `{ g_std: G_STANDARD }` in `extra`. Gate `drift` check (`d === 3`) and wall outputs/checks (`h_m !== undefined`). Preserve exact `unchecked` strings (including `"tracked axes are horizontal"` when `d !== 3`). **Fix 2-arg `pow` in `data/applied-cases.json` checks:** rewrite `pow(a_m/h_m,5)` → `(a_m/h_m)^5` and `pow(v_sed_m_per_s*t_s,2)` → `(v_sed_m_per_s*t_s)^2` (`evaluateFormula` rejects 2-arg function calls!). | `brownianReynolds` (uses `Math.max(abs(v_sed), v_th)`), `brownianLangevinMsdM2` (wraps `ballisticDeficit`), `brownianHydroMsdM2` (wraps `hydrodynamicMsdRatio`), `brownianWallParallelD` (wraps `faxenParallel`), `brownianWallPerpD` (wraps `brennerPerpendicular`), `brownianWallMsdM2` (branch on `d === 3` vs horizontal axes). Keep exported helpers `ballisticDeficit`, `hydrodynamicMsdRatio`, `faxenParallel`, `brennerPerpendicular`, `brownianSphereRegimeAt`. Move `D_m2_per_s`, `MSD_m2`, `rms_displacement_m`, `m_kg`, `tau_p_s`, `tau_f_s`, `v_sed_m_per_s`, `langevin_deviation`, `hydro_deviation`, `hydro_correction_m2`, `memory_correction`, `wall_deviation` to `expr`. Delete empty `DELEGATED_RUN_METHODS` (and `RUN_BY_ID` if empty). |

**Files (per sprint).** `data/applied-cases.json`, `src/cases/engine.ts`, `src/cases/methods.ts`, `tests/cases/applied-case-engine.test.ts` (and the case's existing test file under `tests/cases/`).

**Steps (repeat for S6, S7, S8 in order).**

1. Read the current `runCase*` function in `src/cases/methods.ts` and the case's record in `data/applied-cases.json` line by line so every validation message, output key, check id, and `unchecked` string matches verbatim.
2. RED. In `tests/cases/applied-case-engine.test.ts`, add two tests for the case:
   - `usesCatalogEngine(record)` is `true` and `CASE_METHOD_NAMES` does not contain `runCase*`.
   - Clone the JSON record, mutate an exponent in one closed-form output's `expr` (e.g., `S_V_V2_per_Hz` / `tau_s` / `D_m2_per_s`), call `runAppliedCaseEngine(mutated, validInputs)`, and assert the mutated output changes by the exact expected factor (proving the JSON `expr` actually drives execution).
   Run `bunx vitest run tests/cases/applied-case-engine.test.ts` and keep the failure.
3. Implement the engine branch in `src/cases/engine.ts`, add the named `CaseOutputMethod` adapters (with JSDoc summaries) in `src/cases/methods.ts`, update every output (and S8's two `pow(...)` checks) in `data/applied-cases.json`, remove the runner from `DELEGATED_RUN_METHODS`, `RUN_BY_ID`, `CASE_METHODS`, and `CASE_METHOD_NAMES`, and delete `runCase*`.
4. Run the full case test suite (`tests/cases/resistor-noise.test.ts`, `lumped-cooling.test.ts`, `brownian-sphere.test.ts`, `applied-cases.test.ts`, `applied-case-engine.test.ts`, `cases-directory.test.ts`). Any changed expected number, error message, check verdict, or `unchecked` string is a stop — fix the expression/engine branch at root cause; never loosen a tolerance.

**Acceptance.** `usesCatalogEngine(record)` is `true`, the cloned-record mutation test proves `data/applied-cases.json` drives the engine, all existing case tests pass untouched, and `runCase*` is gone from `src/`.

**Verify.** `bunx vitest run tests/cases`. `bun run typecheck && bun run layer:check`. `bun run docs:deps && bun scripts/readme-status.ts && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** `evaluateFormula` (`src/bridges/expr-parse.ts`) accepts only 1-arg transcendental calls (`sqrt`, `exp`, `ln`, `log`, `abs`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`). Never write `pow(a, b)`, `max(a, b)`, or `expm1(x)` in a JSON `expr` — use `a^b` for powers and a named `CaseOutputMethod` for `Math.max` / `Math.expm1`.

---

## S9 — Pin the unpinned core 0.28.0 unit gaps

**Files.** `tests/dimensional/mathts-unit-gaps.test.ts` (extend). No `src/` change.

**Steps.**

1. Read `tests/dimensional/mathts-unit-gaps.test.ts` completely first. Note that `bit` vs MathTS scale `1` (line 161), `Hz.to('rad/s')` vs `convertValue` (line 196), `furlong` (line 214), and `{ reading: 'difference' }` (line 91) are **already** pinned there (and `parseUnit('bit').scale === Math.LN2` is in `tests/dimensional/unit-wrapper-bit.test.ts`). Do not duplicate existing assertions.
2. Add assertions ONLY for the unpinned core 0.28.0 gaps, asserting the actual MathTS `Unit` object behavior (note: `Unit.parse` returns a `Unit` object, NOT a `number`):
   - `dB`, `dBm`, `dBW`, `Np`: `getUnitRow(s)` is defined; `Unit.parse('1 dB').toSI().value` is close to `10 ** 0.1` (`~1.258925`) and `Unit.parse('1 Np').toSI().value` is close to `Math.E`; `REFUSED_UNIT_SPELLINGS` does not include `'dB'` or `'Np'`; UPT `parseUnit(s)` throws `UnitRefusedError` for all four.
   - `Bq`, `Gy`, `Sv`, `kat`: `getUnitRow(s)` is `undefined` and `() => Unit.parse(s)` throws, while UPT `parseUnit(s).scale` is `1`.
   - `Pas`: `() => Unit.parse('Pas')` throws `AmbiguousUnitError`, while UPT `parseUnit('Pas').scale` is `1`.
   - `mAs`: `() => Unit.parse('mAs')` throws, while UPT `parseUnit('mAs').scale` is `1e-3`.
   - `ln2`: `() => Unit.parse('ln2')` throws, `NAMED_IRRATIONALS.ln2` is defined, and UPT `() => parseUnit('ln2')` throws `UnknownUnitError`.
3. RED control. Temporarily flip one new assertion (e.g., expect `parseUnit('dB')` not to throw) and run vitest to prove the new assertion fails; restore the real expectation and record the RED output in the PR body. Follow the top-of-file disclosure rule (AGENTS.md Law 2) for post-hoc gap pins.
4. Do not change production code in this pull request.

**Acceptance.** `bunx vitest run tests/dimensional/mathts-unit-gaps.test.ts tests/dimensional/unit-rows-mathts-parity.test.ts tests/dimensional/unit-parse-delegation.test.ts` passes. `git diff src/` is empty.

**Verify.** That vitest command, plus `bun run audit:plans`.

**Risk.** A MathTS patch inside the caret could flip a row later. That is what the gap test is for. Do not loosen the caret in this sprint.

---

## S10 — Expand `tryMathtsA5Reading` to all bare shared non-cycle spellings

**Files.** `src/dimensional/mathts-unit-wrapper.ts`, `tests/dimensional/unit-parse-delegation.test.ts`.

**Why this targets `tryMathtsA5Reading` (not `unitReadingsSource`).** Today `unitReadingsSource(symbol)` is *already* `'mathts'` for 108 of 118 bare symbols (via the post-local `unitParserViaMathts` fallback), so asserting `unitReadingsSource(symbol) === 'mathts'` would pass vacuously with zero failures! Meanwhile `tryMathtsA5Reading(symbol)` — the direct path in `src/dimensional/units.ts` that skips `localUnitReadings` completely — currently returns non-null for only **8** bare symbols (`d`, `day`, `angstrom`, `Angstrom`, `Å`, `psi`, `torr`, `degC`), leaving **98** bare non-cycle shared symbols running `localUnitReadings` first.

**Steps.**

1. Generate the candidate list with an uncommitted scratch command: every bare symbol in `UNIT_DATA.units` plus `UNIT_DATA.affine` where `getUnitRow(symbol) !== undefined`, `symbol !== 'bit'`, `UNIT_DATA.units.get(symbol)?.cycles !== true`, `Unit.parse(symbol)` does not throw, and `exactScaleToNumber(Unit.exactScale(symbol)!)` equals `parseUnit(symbol).scale` within `1e-15` relative. Expect **98** newly delegated bare symbols (97 non-affine + `degF`), bringing total direct bare symbols from 8 to 106.
2. **CRITICAL CYCLE GUARD:** Do **not** include `Hz` or `rpm` (`row.cycles === true`). `tryMathtsA5Reading` returns `cycles: 0`, and `tests/dimensional/unit-cycles-mathts.test.ts` asserts `A5_DELEGATED_TEXTS.filter((text) => mathtsNetCycles(text) !== 0)` is `[]`. `Hz` and `rpm` stay on the post-local MathTS path so `convertValue('1 Hz', 'rad/s').cycles === 1` and `convertValue('60 rpm', 'rad/s').cycles === 1` remain intact.
3. Also verify excluded symbols return `null` from `tryMathtsA5Reading`: `bit`, `Bq`, `Gy`, `Sv`, `kat`, the 5 Unicode degree aliases (`°`, `°R`, `°C`, `℃`, `°F`), `Hz`, `rpm`, `mpc`, `dB`, `dBm`, `dBW`, `Np`, `Pas`, `mAs`, `furlong`, `ton`, `tons`, `Mach`, `mach`, and `ln2`.
4. RED. Extend `tests/dimensional/unit-parse-delegation.test.ts` to assert `tryMathtsA5Reading(symbol) !== null` for every candidate in the 98-symbol list (and `=== null` for the excluded symbols above). Run `bunx vitest run tests/dimensional/unit-parse-delegation.test.ts` and keep the 98 failures.
5. In `src/dimensional/mathts-unit-wrapper.ts`, add the agreed bare non-cycle shared symbols to `A5_DELEGATED_TEXTS` (or derive the bare-symbol set cleanly from the agreed predicate so it never includes `bit`, refused tokens, cycle units, or missing SI units, while keeping `A5_DELEGATED_TEXTS` accurate for `tests/dimensional/unit-cycles-mathts.test.ts`). Keep `uptRefusalReason` running before `tryMathtsA5Reading` in `src/dimensional/units.ts`.
6. Re-run the full dimensional suite. Any changed scale, affine offset, cycle count, or error class stops the sprint.

**Acceptance.** `tryMathtsA5Reading(symbol) !== null` for all 106 agreed bare non-cycle shared symbols; `null` for `Hz`, `rpm`, `bit`, `Bq`, `Gy`, `Sv`, `kat`, refused tokens, and compounds. `parseUnit('bit').scale === Math.LN2`, `parseUnit('dB')` throws `UnitRefusedError`, `parseUnit('Bq').scale === 1`, `parseUnit('Pas').scale === 1`, `convertValue('1 Hz', 'rad/s')` has `{ value: 1, cycles: 1 }`, and `convertValue('25 degC', 'K', 'difference').value === 25`.

**Verify.** `bunx vitest run tests/dimensional/unit-parse-delegation.test.ts tests/dimensional/unit-cycles-mathts.test.ts tests/dimensional/unit-rows-mathts-parity.test.ts tests/dimensional/units.test.ts tests/dimensional/exact-unit-scale.test.ts tests/dimensional/mathts-unit-gaps.test.ts`. `bun run typecheck && bun run layer:check`. `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** Adding a prefixed spelling (like `dm` or `Gyr`) or a cycle unit (`Hz`, `rpm`) would break prefix policy or `unit-cycles-mathts.test.ts`. Restrict strictly to bare `getUnitRow`-known non-cycle symbols.

---

## S11 — Getting started and the equation + constant catalog guide

**Files.** `docs/user/getting-started.md` (new), `docs/user/catalog.md` (new), `docs/README.md` (add a "User guides" section linking the two new files), `tests/examples/user-docs.test.ts` (new).

**Steps.**

1. `docs/user/getting-started.md`:
   - Install snippet matching the README (`npm install universal-physics-tensor`, `npx upt help`).
   - The five commands in the README "First five minutes" section with the same verified outputs (`2.0060666807106475`, the `derive` prefactor line, `6.16842971641034e-8`, the Chandrasekhar line `2.895722231692708e+30`).
   - Clone & build paragraph: Bun `1.4.2` (`packageManager`), `bun install`, `bun run build`, `node bin/upt.mjs`.
   - Links to [`../CLI.md`](../CLI.md) and [`catalog.md`](catalog.md). **Do not** link `docs/user/tutorials/` yet — S14 adds that link when it creates the directory.
2. `docs/user/catalog.md` ("Equation and Constant Catalog Guide"):
   - **Equations section:** bridge records (`data/bridge-catalog.json`, cited as `BE-<id>`, CLI spelling `be-<id>`, projected as `BRIDGE_EQUATIONS`), canonical equations (`CE-pendulum-period` from `src/canonical/registry.ts`), and atlas records (`upt atlas ab-pendulum-linear`). Show runnable commands: `upt search pendulum`, `upt explain hawking-temperature mass=1Msun`, `upt evaluate be-63 mu_e=2`, `upt canonical`, and `upt atlas ab-pendulum-linear`. Explain that records without an evaluator still exist in the catalog/atlas and that `upt evaluate` with no id lists evaluable bridges and applied cases.
   - **Physical constants section:** document `src/core/constants.ts`, `CONSTANT_ROWS` (`src/dimensional/constant-rows.ts`), `PhysicalConstants`, and `CANONICAL_CONSTANTS`. Explain the three provenance tiers: (a) 2019 exact SI constants (`C_SI`, `H_SI`, `E_SI`, `K_B_SI`, `N_A_SI`), (b) CODATA 2022 measured constants sourced from `@danielsimonjr/mathts-functions` (`G_SI`, `M_ELECTRON_SI`, `M_PROTON_SI`, `ALPHA_SI`, `EPSILON_0_SI`, `MU_0_SI`, etc.), and (c) conventional astrophysical/cosmological constants (`M_SUN_SI`, `GM_SUN_SI`, `H0_SI`). Call out key user gotchas: in formulas bare `e` is the elementary charge (`exp(1)` is Euler's number; `euler` is refused), `HBAR_SI` is exact `H_SI / (2π)` rather than a truncated decimal, and `--units=si|natural|geometrized` switches unit conventions (`upt eval`, `upt explain`, `upt derive`). Include one runnable `upt eval` command using a constant (e.g., `upt eval "hbar*c/(1*fm)"` or `upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665`).
   - Do not hardcode bridge, evaluator, canonical, or constant counts in either guide.
3. RED. Add `tests/examples/user-docs.test.ts` (following `tests/tools/readme-examples.test.ts`). It fails until both Markdown files exist. Once they exist, it:
   - Reads `docs/user/getting-started.md` and `docs/user/catalog.md`.
   - Extracts every line inside a fenced `bash` block that starts with `upt ` or `npx upt ` (stripping optional `npx ` then `upt `, and skipping shell lines starting with `npm `, `bun `, `git `, `cd `, or `#`), runs each with `node bin/upt.mjs <args>`, and asserts exit 0. (Do **not** skip `npx upt ...` lines!)
   - Asserts the documented stdout substrings for the four README commands and `upt atlas ab-pendulum-linear`.
   - Asserts neither file contains a hardcoded catalog count matching `/\b160\b|^\d+ bridges/m`.
4. Link `docs/user/getting-started.md` and `docs/user/catalog.md` from `docs/README.md`. (If ever linking from root `README.md`, remember `tests/tools/readme-links.test.ts` requires full GitHub URLs for unshipped `docs/` paths, not relative paths.)

**Acceptance.** `tests/examples/user-docs.test.ts` and `tests/api/api-reference-symbols.test.ts` pass. Both guides cover equations and constants with zero hardcoded counts and zero broken links.

**Verify.** `bun run build && bunx vitest run tests/examples/user-docs.test.ts tests/api/api-reference-symbols.test.ts tests/tools/readme-links.test.ts`. `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** Any package-root import from `'universal-physics-tensor'` placed in `docs/user/*.md` is automatically checked by `tests/api/api-reference-symbols.test.ts` — import only real root exports.

---

## S12 — Fill TSDoc gaps on the public surface

**Files.** `scripts/public-tsdoc-gaps.ts` (new), `src/dimensional/types.ts` (15 undocumented runtime constants), `src/atlas/types.ts` (3 undocumented `atlas` public types). No new dependency.

**Verified gap list (18 total, all checked against `fileDocs` in `tools/code-docs-ratchet/check.ts`):**
- **Root runtime snapshot (`233` names, `15` undocumented):** all 15 are in `src/dimensional/types.ts` — `ACCELERATION`, `ACTION`, `AREA`, `CHARGE`, `DIMENSIONLESS`, `ENERGY`, `ENTROPY`, `FORCE`, `FREQUENCY`, `LENGTH`, `MASS`, `POWER`, `TEMPERATURE`, `TIME`, `VELOCITY`.
- **Root `export type` (`246` names, `0` undocumented):** already complete.
- **`atlas` namespace (`export * as atlas from './atlas/public.js'`, `33` exports, `3` undocumented):** all 3 are in `src/atlas/types.ts` — `FormalFidelity`, `FormalRef`, `FormalRefKind`.
- **Public subpath (`universal-physics-tensor/numerical/mathts-engine`):** `MathTSEngine` is already documented.

**Steps.**

1. Add `scripts/public-tsdoc-gaps.ts`. It collects:
   - the runtime names from `tests/api/__snapshots__/public-surface.test.ts.snap` (handling `export * as atlas from './atlas/public.js'` by scanning the members of `src/atlas/public.ts` rather than looking for `const atlas`),
   - the explicit `export type { ... }` names from `src/index.ts`, and
   - the `MathTSEngine` subpath export from `src/numerical/mathts-engine.ts`.
   For each name it resolves the defining declaration file in `src/` (skipping pure re-export clauses) and checks `documented` via `fileDocs` from `tools/code-docs-ratchet/check.ts`. Prints `<file> <name>` for each undocumented public symbol; supports `--check` (exits 1 when any gap remains, 0 when empty).
2. RED. Run `bun scripts/public-tsdoc-gaps.ts --check` before editing `src/` and keep the 18-line failure list in the PR body.
3. Add concise one-sentence JSDoc summaries to the 15 constants in `src/dimensional/types.ts` and the 3 types in `src/atlas/types.ts`. Do not change any value, type, or signature, and do not delete existing summaries.
4. Re-run `bun scripts/public-tsdoc-gaps.ts --check` (must exit 0 with empty output).

**Acceptance.** `bun scripts/public-tsdoc-gaps.ts --check` exits 0. `tests/api/public-surface.test.ts` passes unchanged. `bun run typecheck` is clean.

**Verify.** `bun scripts/public-tsdoc-gaps.ts --check && bunx vitest run tests/api/public-surface.test.ts tests/tools/code-docs-ratchet.test.ts`. `bun run typecheck`. `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** `fileDocs` treats re-export lines separately from declarations. Always resolve a symbol through `src/index.ts` (and `src/atlas/public.ts` for `atlas`) to the module containing its `export function`, `export class`, `export const`, `export interface`, or `export type` declaration.

---

## S13 — Generate full user API reference (`docs/user/api.md`) and gate it in `docs-fresh`

**Files.** `scripts/api-reference.ts` (new), `docs/user/api.md` (generated), `docs/README.md` (add link to `docs/user/api.md`), `.github/workflows/ci.yml` (one `--check` step inside `docs-fresh`), `package.json` (`scripts` entry `docs:api` only if mirroring `docs:cli` — check `package.json` first; do not touch `version` or `dependencies`).

**Steps.**

1. Add `scripts/api-reference.ts` (reusing the symbol resolver from `scripts/public-tsdoc-gaps.ts` and `fileDocs` from `tools/code-docs-ratchet/check.ts`). Generate `docs/user/api.md` covering the **full public API surface**:
   - Top note linking [`getting-started.md`](getting-started.md), [`catalog.md`](catalog.md), and [`../architecture/API.md`](../architecture/API.md) (the narrative engineering reference), with no hosted URL claims.
   - **Root runtime exports (`universal-physics-tensor`)** — all 233 snapshot names grouped by `src/index.ts` section banner, showing export kind (`function`, `class`, `const`, `namespace`), declaration header/signature extracted from source, and TSDoc summary.
   - **Root type exports (`universal-physics-tensor`)** — all 246 `export type` / `interface` names, showing kind and TSDoc summary.
   - **`atlas` namespace (`import { atlas } from 'universal-physics-tensor'`)** — all 33 members of `src/atlas/public.ts` with kind and TSDoc summary.
   - **Subpath export (`universal-physics-tensor/numerical/mathts-engine`)** — `MathTSEngine` with its summary and public method list.
   - Support `--check` (exits 1 if committed `docs/user/api.md` differs from generated output, matching `scripts/cli-reference.ts --check`).
2. RED. Run `bun scripts/api-reference.ts --check` before generating `docs/user/api.md` and keep the failure.
3. Run `bun scripts/api-reference.ts` and commit `docs/user/api.md`. Verify `--check` exits 0; tamper with one word, confirm `--check` exits 1, and restore it.
4. In `.github/workflows/ci.yml`, add one step inside `docs-fresh` immediately after `Fail when the CLI reference is stale` running `bun scripts/api-reference.ts --check`. Do not alter other jobs or add unpinned actions (verified by `tests/tools/ci-workflows.test.ts`).

**Acceptance.** `bun scripts/api-reference.ts --check` exits 0. `docs/user/api.md` covers root runtime exports, root type exports, `atlas.*`, and `MathTSEngine`, and links `getting-started.md` and `docs/architecture/API.md`. `tests/tools/ci-workflows.test.ts` and `tests/api/api-reference-symbols.test.ts` pass.

**Verify.** `bun run build && bun scripts/api-reference.ts --check && bunx vitest run tests/api/public-surface.test.ts tests/api/api-reference-symbols.test.ts tests/tools/ci-workflows.test.ts`. `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.**
- Editing `.github/workflows/ci.yml` matches `lean_paths` in `ci.yml` and triggers the `lean` CI job on this PR (expected).
- Any package-root import from `'universal-physics-tensor'` emitted in `docs/user/api.md` is checked by `tests/api/api-reference-symbols.test.ts` — keep import fences strictly to real exports (or use declaration headings/tables without invalid import fences).

---

## S14 — Runnable tutorials executed by vitest

**Files.** `docs/user/tutorials/evaluate-a-bridge.md`, `docs/user/tutorials/units.md`, `docs/user/tutorials/search-and-explain.md` (all new), `docs/user/getting-started.md` (add link to `tutorials/`), `docs/README.md` (add link to `tutorials/`), `tests/examples/tutorials.test.ts` (new).

**Steps.**

1. Write three focused, runnable tutorials using real root exports verified in `src/index.ts`:
   - `docs/user/tutorials/evaluate-a-bridge.md`: a `bash` block running `upt evaluate be-63 mu_e=2`, and a `ts` block that imports `evaluateRelation` and `M_SUN_SI` from `'universal-physics-tensor'`, evaluates `evaluateRelation('be-63', { mu_e: 2 })`, and prints the mass in kg and in solar masses (`res.value / M_SUN_SI`). Assert CLI stdout contains `Chandrasekhar` and TS stdout prints `2.8957222` and `1.455`.
   - `docs/user/tutorials/units.md`: a `ts` block that imports `parseUnit` and `convertValue` from `'universal-physics-tensor'` and prints `parseUnit('bit').scale`, `convertValue('25 degC', 'K', 'difference').value`, `convertValue('1 Hz', 'rad/s').value`, and `convertValue('1 Hz', 'rad/s').cycles`. Assert the four printed values are `Math.LN2`, `25`, `1`, and `1`.
   - `docs/user/tutorials/search-and-explain.md`: `bash` blocks for `upt search pendulum`, `upt explain hawking-temperature mass=1Msun`, and `upt eval "2*pi*sqrt(L/g)" L=1 g=9.80665`. Assert `CE-pendulum-period`, `6.16842971641034e-8`, and `2.0060666807106475`.
2. In `tests/examples/tutorials.test.ts`, copy the `runFence` spawn harness from `tests/tools/readme-examples.test.ts` / `tests/examples/basic-usage.test.ts` (symlink the repo as `node_modules/universal-physics-tensor`, run `node --experimental-strip-types --no-warnings snippet.ts`) for `ts` blocks, and run `bash` blocks via `node bin/upt.mjs` as in S11.
3. RED. Add `tests/examples/tutorials.test.ts` first and verify it fails before the tutorial Markdown files exist. Then add the three tutorials and add the links to `docs/user/tutorials/` in `docs/user/getting-started.md` and `docs/README.md`.

**Acceptance.** `bunx vitest run tests/examples/tutorials.test.ts tests/examples/basic-usage.test.ts tests/examples/user-docs.test.ts tests/api/api-reference-symbols.test.ts` passes. `examples/basic-usage.ts` is unchanged.

**Verify.** `bun run build && bunx vitest run tests/examples/tutorials.test.ts tests/examples/basic-usage.test.ts tests/examples/user-docs.test.ts tests/api/api-reference-symbols.test.ts`. `bun run docs:deps && bun scripts/readme-status.ts --check && bun run audit:plans`.

**Risk.** `--experimental-strip-types` fails if a tutorial imports a type-only name without `import type`, and `tests/api/api-reference-symbols.test.ts` fails if any package-root import from `'universal-physics-tensor'` names a non-root export (note: `evaluateRelation` is a root export; `evaluateBridge` is not).

---

## What a worker does not do

- Optimize `mul`, `integrateGeodesic`, the Riemann pipeline, the eikonal, or `forwardGrad`. The baseline says why.
- Call `Unit.to` / `toSI` from `convertValue`, call `Unit.createUnit`, set `bit` to scale 1, accept `dB` or `furlong`, add `Hz`/`rpm` to `A5_DELEGATED_TEXTS`, or make `mAs` or `mol/mL` ambiguous.
- Add a file matching `case-*.ts` under `src/cases/`, or bring back `skin-depth.ts` and the other five names in `FORBIDDEN_PER_CASE_MODULES`.
- Edit `package.json` `version` or `dependencies`. A `scripts` entry in S13 is the only `package.json` edit.
- Add Typedoc, a documentation site, a retry, a longer timeout, a weaker test assertion, or a wall-clock `expect` in vitest.
- Commit `bench/results.json`, `*.cpuprofile`, or any `repo-tools` JSON dump.
- Open a MathTS pull request. The upstream items to note for the owner are `Bq`, `Gy`, `Sv`, `kat`, a `bit = ln2` option, and (for future startup speed) splitting CODATA constants out of `typed-function` in `mathts-functions`.
