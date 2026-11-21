# UPT optimization, reduction, MathTS units, and user docs

The design is [`docs/superpowers/specs/2026-11-21-upt-optimization-docs-design.md`](../specs/2026-11-21-upt-optimization-docs-design.md). This file is the work. It authorizes nothing until an `ACTIVE.md` row names the sprint. Each sprint is one pull request. Do not bump `package.json`, do not edit `bun.lock`, and do not publish.

## Rules for every sprint

1. File the `ACTIVE.md` row before editing the files the sprint names. Tick it without retitling it. Add a `CHANGELOG.md` bullet under `## [Unreleased]` that says what changed and why.
2. A new test is shown failing on the unchanged tree first (`WORKFLOWS.md`). Keep that failure in the pull request body.
3. Scoped gate: the `bunx vitest run` files named in the sprint, then `bun run typecheck` when the sprint touches `src/`. The pre-push hook runs the full suite. Judge the summary counts, not the exit code alone.
4. Do not add a retry, a longer timeout, or a weaker assertion. Do not add an assertion on milliseconds.
5. Do not commit `bench/results.json`, a `*.cpuprofile`, or a repo-tools dump.
6. A sprint that changes a golden, an error class, or a printed CLI line stops. Say so in the pull request and do not land the behavior change.
7. Cross-check any code snippet below against the tree before using it. The design's decisions win when this file and the tree disagree; record the disagreement in the commit message.

## Baseline (2026-11-21)

Tree `17690f5a`, package `16.0.0`, Node `v22.23.4` x64, Bun `1.4.5`, 4 vCPU Intel Xeon. Lockfile pins `@danielsimonjr/mathts-core@0.28.0`, `mathts-functions@0.86.0`, `mathts-expression@0.14.0`, `mathts-matrix@0.11.0`, `mathts-tensor@0.5.0`, `mathts-autograd@0.6.0`. `dist/` was `tsc` of that tree. These are this machine's medians. A later machine re-measures with the same commands. It does not copy these digits into a test.

Catalog load reported 160 `BRIDGE_EQUATIONS`, 121 evaluators, 109 canonical equations. `data/units.json` has 97 unit rows and 118 symbols including affine spellings. MathTS `UNIT_ROWS` has 206 entries.

### CLI wall clock

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

One `node --cpu-prof` sample of `upt version` (629 hits): `typed-function` 34.5%, `compileSourceTextModule` 15.3%, `@danielsimonjr/*` 13.8%. One sample of `upt audit` (1 457 hits): `@danielsimonjr/*` 42.8% (of which `trustedMathFunctions` in `mathts-expression` is 13.9%), `typed-function` 14.8%, `dist/bridges` 6.0%, `dist/dimensional` 5.9%. `version` and `help` match `evaluate` because `src/cli/main.ts` imports `../cli-api.js` and `./commands/index.js` before the verb branch.

### In-process warm times

Bun, one untimed call then the repeats below. Module load of the probe's UPT imports was 397 ms and is not one of these rows.

| Work | Median |
|---|---|
| `parseUnit` on all 118 symbols | 2.273 ms |
| `convertValue` on 23 compound texts | 0.877 ms |
| `evaluateFormula('2*pi*sqrt(length/gravity)', {length:1, gravity:9.81})` | 0.077 ms |
| `evaluateBridge` on all 121 evaluators, sample inputs from `tests/bridges/evaluators.test.ts` | 17.384 ms |
| `MathTSEngine.mul` shape `[100,100]` | 0.011 ms |
| `forwardGrad` of `x*x`, shape `[100,100]` (MathTS returns `{ value, jacobian }`) | 2489 ms |
| `reverseGrad` of `x*x`, shape `[100,100]` | 0.133 ms |
| `integrateGeodesic` 1 000 steps, solar radial infall, bench fixture | 2.064 ms |
| `integrateGeodesic` 5 000 steps | 5.222 ms |
| Riemann finite-difference pipeline at `r = 3 r_s` | 0.378 ms |
| That pipeline plus `contractRiemannJS` | 0.289 ms (inside the 0.22–0.69 ms spread of the Riemann-only runs) |
| `evaluateCovariantEikonalNumerical`, 2 048 steps, solar geometry from `bench/covariant-eikonal.bench.ts` | 4.946 ms |

`forwardGrad` at `[10]` was 0.029 ms. The large forward number is the full Jacobian, not a UPT loop to rewrite.

### Unit comparison on core 0.28.0

`Unit.exactScale` against `parseUnit` for every symbol in `data/units.json` units and affine scales:

- 113 symbols, same scale number.
- `bit` differs: UPT `ln2`, MathTS `1`.
- Not found in MathTS: `Bq`, `Gy`, `Sv`, `kat`.
- Of the prefixes `m`, `k`, and `u`, 14 tokens parse in UPT and throw in MathTS: `mpc`, `upc`, and those three prefixes on `Bq`, `Gy`, `Sv`, and `kat`.

Also probed, and required of later sprints: `dB`/`dBm`/`dBW`/`Np` are `UnitRefusedError` in UPT and numeric in MathTS; `ton` is `UnitRefusedError` in UPT and ambiguous in MathTS; `convertValue('1 Hz', 'rad/s')` is `{value:1, cycles:1}` while `Unit.to('rad/s')` is 2π; `mAs` is `1e-3` (one reading); `mol/mL` is `1e6` (one reading); `Pas` is `1` in UPT and ambiguous in MathTS; `furlong` is `UnknownUnitError` in UPT and 201.168 m in MathTS; `Unit.parse('ln2')` throws. `ln2` is the bit row's scale expression and `NAMED_IRRATIONALS.ln2`, not a unit spelling.

## Sprint order

| Id | Pull request | Depends on |
|---|---|---|
| S1 | In-process benches and a CLI wall-clock script | — |
| S2 | `upt version` returns before the CLI barrel import | S1 |
| S3 | Count repeated formula parses in one audit; memoize only if the count says so | S1 |
| S4 | Delete the three unreachable case runners | — |
| S5 | `case-resistor-noise` closed forms become `expr` | S4 |
| S6 | `case-lumped-cooling` closed forms become `expr` | S5 |
| S7 | `case-brownian-sphere` closed forms become `expr` | S6 |
| S8 | Pin the core 0.28.0 unit gaps the suite does not yet name | — |
| S9 | Delegate bare shared spellings | S8 |
| S10 | Getting-started guide and catalog guide | — |
| S11 | Fill TSDoc on public names that have no summary | — |
| S12 | Generate `docs/user/api.md` and check it in `docs-fresh` | S11 |
| S13 | Tutorials executed by vitest | S10 |

S1, S4, S8, and S10 have no upstream sprint. A single worker still runs the table from top to bottom so two sprints do not edit `methods.ts` or `main.ts` at once.

---

## S1 — Bench harness

**Files.** `bench/catalog-eval.bench.ts` (new), `bench/unit-table.bench.ts` (new), `bench/README.md` (add the two rows to the table), `scripts/cli-wall-clock.mjs` (new).

**Steps.**

1. `bench/catalog-eval.bench.ts` imports `evaluateBridge` and `BRIDGE_EVALUATORS` from `../src/bridges/evaluators.ts`. Copy the `sample` object from the test `every spec run is callable with its declared inputs` in `tests/bridges/evaluators.test.ts`. Build one input record per evaluator the way that test does (`spec.inputKeys`). Call `evaluateBridge` for every id inside `bench`. Hoist the input records outside the bench callback.
2. `bench/unit-table.bench.ts` imports `parseUnit` from `../src/dimensional/units.ts` and the symbol list from `UNIT_DATA` (`../src/dimensional/unit-data.ts`). Bench one loop of `parseUnit` over every symbol, catching the refusals the table itself stores (`bit` parses; refused spellings throw). Hoist the symbol array.
3. Add both files to the table in `bench/README.md`. The README says a missing or extra `*.bench.ts` is a defect in that table.
4. `scripts/cli-wall-clock.mjs` is plain Node, no TypeScript. It times, with `process.hrtime.bigint`, three runs each of `node bin/upt.mjs version`, `help`, `evaluate be-63 mu_e=2`, and `audit`, and prints one median line per command in milliseconds. It does not write a file. It exits 0.

**Acceptance.** `bunx vitest bench bench/catalog-eval.bench.ts bench/unit-table.bench.ts --run` prints a hz line for each bench. `node scripts/cli-wall-clock.mjs` prints four median lines. No test asserts a threshold. `bench/README.md` lists both new files.

**Verify.** Those two commands. `git status` does not show `bench/results.json`.

**Risk.** The sample object can drift from the test. If an evaluator key is missing, the bench throws at load; copy the object again from the test rather than inventing a value.

---

## S2 — `upt version` does not load the command graph

**Files.** `src/cli/main.ts`, `tests/cli/version-fast-path.test.ts` (new). Read `tests/cli/` for an existing version test and extend it in the same file if one already spawns the binary; do not leave two conflicting version tests.

**Steps.**

1. RED. Add a test that reads `src/cli/main.ts` as text and asserts it has no top-level `import` from `../cli-api.js` and no top-level `import` from `./commands/index.js`. A dynamic `import()` inside a function is allowed. Run `bunx vitest run tests/cli/version-fast-path.test.ts` and keep the failure.
2. Move those two imports to `await import(...)` on the path that needs them: any verb other than `version`, `--version`, and `-v`. The version branch returns `packageVersion()` first. `packageVersion` in `src/cli/version.ts` reads `package.json` through `readJsonFile` and does not import a MathTS package; leave it.
3. Help still imports `./commands/index.js`, because the command list is the registry. Do not add a second list.
4. `upt version extra` still throws `UsageError` with `upt version takes no arguments` and exits 2. Cover that in the test by calling `runCli`, which does not need the heavy import.
5. A test spawns `node bin/upt.mjs version` after `bun run build` and asserts stdout is the `version` field of `package.json` plus a newline, exit 0.

**Acceptance.** The source assertion passes. Spawned `upt version` matches `package.json`. `upt help` still lists the commands `listCommandNames()` registers (the existing help test, if any, or a spawn that expects the line `upt — Universal Physics Tensor`). `bun run typecheck` is clean.

**Verify.** `bunx vitest run tests/cli/version-fast-path.test.ts` and the existing CLI help/version files. Then `node scripts/cli-wall-clock.mjs`. Record the new version median in `NOTES.md` under an "As of 2026-11-21" block that also repeats the S1 baseline median it is compared with. The change is accepted when the version median is under 100 ms on this class of machine and the other three commands stay in the same band as the baseline (help, evaluate, and audit still import the barrel). If version stays above 100 ms, the import is still eager; do not land a partial move.

**Risk.** A test that imported `src/cli/main.ts` for the side effect of command registration will no longer register commands at import. Grep `tests/` for `cli/main` before editing. Those tests should import `src/cli/commands/index.ts` themselves, in the same pull request.

---

## S3 — Formula-parse count, then a memo only if it pays

**Files.** Measurement is not committed. If the count justifies a memo: `src/numerical/formula-mathts.ts`, `tests/numerical/formula-parse-cache.test.ts` (new), `NOTES.md`.

**Steps.**

1. Temporarily, at the start of `parseFormula`, push `expr` onto a module-local array. Rebuild (`bun run build`). Run `node bin/upt.mjs audit` once. Print `calls` and `unique` (a `Set` of the texts). Then remove the array so `git diff src/numerical/formula-mathts.ts` is empty. Do not commit the counter.
2. Write the two integers in `NOTES.md`. If `unique / calls` is greater than 0.9, stop. The pull request is the `NOTES.md` paragraph and the changelog line. A memo would not change one audit.
3. Otherwise RED: a test constructs `createMathtsFormulaParser` with a `parse` that counts, or, if that factory is not exported, spies by passing the module object the file already isolates (`mathTsModule` is module-private; export a test hook only if the file already has a seam — `createMathtsFormulaParser` is the seam if it is exported; if it is not, export it as `@internal` in this pull request and count through it). Calling `parseFormula` twice on `'1+1'` must call MathTS `parse` once. The test fails while `parseFormula` always forwards.
4. Memoize `CompiledFormula` by the expression string on `parseFormula`. `evaluate` still receives the caller's scope each time, so `e` stays the elementary charge from the scope `formula-mathts.ts` already builds. Do not cache the numeric result.
5. `node bin/upt.mjs audit` stdout is byte-identical to stdout saved in step 1. Compare with `diff`. A one-byte change stops the sprint.

**Acceptance.** Either the NOTES paragraph records a negative result and `src/` is untouched, or the cache test fails when the `Map` is removed and audit stdout matches.

**Verify.** `bunx vitest run tests/numerical/formula-parse-cache.test.ts` when the cache exists. `diff` of the two audit transcripts. `bun run typecheck` when `src/` changed.

**Risk.** A cache keyed only by text is wrong if two parses of the same text could bind different constants at parse time. Read `parseFormula` and `createMathtsFormulaParser`. The scope is applied in `evaluate`, so the key is the text. If a reading of the function shows the scope is closed over at parse time, do not add the cache; record that in `NOTES.md` and stop.

---

## S4 — Delete unreachable case runners

**Files.** `src/cases/methods.ts`, `src/cases/engine.ts`, `tests/cases/dead-runners.test.ts` (new). Possibly imports in `tests/cases/` that name `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`.

**Steps.**

1. Read `data/applied-cases.json` and list every `method` value on `case-skin-depth`, `case-kepler-rv`, and `case-damped-resonator`. The expected set is expressions plus `windowedLinewidthCatalogHz` and `skinDeltaMaxwellM` (and any other name that is not one of the three `runCase*` functions). If an output's `method` is `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`, stop. Those runners are live and this sprint does not apply.
2. RED. The new test reads the catalog file as text and asserts those three runner names do not occur, and reads `CASE_METHOD_NAMES` and asserts the three names are absent. It fails today because `methods.ts` lists them.
3. Delete `runCaseSkinDepth`, `runCaseKeplerRv`, `runCaseDampedResonator`, their `RUN_BY_ID` entries, and their `CASE_METHODS` entries. Keep `maxwellDepthFactor`, `skinDeltaMaxwellM`, `windowedLinewidthHz`, and `windowedLinewidthCatalogHz`.
4. `usesCatalogEngine` forces those three ids through the engine via `ENGINE_CASE_IDS`. After the runners are gone, confirm each of the three records still takes the engine because every output has `expr`, `relation`, or a method that still exists. Then delete `ENGINE_CASE_IDS` only if `usesCatalogEngine` still returns true for those three records without it. A unit test calls `usesCatalogEngine` on the three records and expects true. If deleting the set makes one return false, put the set back.
5. Update any test import that named a deleted function. Tests of `maxwellDepthFactor` stay.

**Acceptance.** `tests/cases/cases-directory.test.ts` still passes (no new file under `src/cases/`). `bunx vitest run tests/cases` passes. `upt evaluate` goldens for the three case ids are unchanged. Grep of `src/` finds no `runCaseSkinDepth`.

**Verify.** `bunx vitest run tests/cases tests/cli/signed-residual-label.test.ts`. `bun run typecheck`.

**Risk.** `buildAppliedCase` falls through to `RUN_BY_ID[id]` when `usesCatalogEngine` is false. Step 4 is what keeps that from throwing at load.

---

## S5, S6, S7 — One legacy case per pull request

Same procedure, three pull requests, in order. Do not start S6 while S5's golden moved.

| Sprint | Case id | Runner today | Leave as methods |
|---|---|---|---|
| S5 | `case-resistor-noise` | `runCaseResistorNoise` | the quadrature (`adaptiveQuadrature` / parent density) |
| S6 | `case-lumped-cooling` | `runCaseLumpedCooling` | `lumpedRadiatingTemperature`, `sphereEigenvalues`, `sphereSeries` |
| S7 | `case-brownian-sphere` | `runCaseBrownianSphere` | `ballisticDeficit`, `hydrodynamicMsdRatio`, `faxenParallel`, `brennerPerpendicular`, `brownianSphereRegimeAt` |

**Files.** `data/applied-cases.json`, `src/cases/methods.ts`, `src/cases/engine.ts` (only if `DELEGATED_RUN_METHODS` still names the runner), the existing test file under `tests/cases/` for that case.

**Steps.**

1. Read the runner. For each output it sets with an arithmetic expression (no integral, no `findRoot`, no `integrateRK4`), copy that expression into the output's `expr` using the names the runner already uses. An output that is an integral stays `method`.
2. RED. In the case's existing test, add one assertion that a mutated exponent in that JSON `expr` changes the output. It fails while the runner ignores `expr`. Follow `tests/bridges/` only if that case's test file has no pattern yet; the skin-depth engine tests are the pattern if they mutate an exponent.
3. Point the output at `expr` and delete that assignment from the runner. When every output of the case is `expr` or a specific method, remove the case id from `DELEGATED_RUN_METHODS` and delete the `runCase*` function if nothing else calls it.
4. Run the case tests. Any expected voltage, depth, amplitude, or residual that changes is a stop. Revert the expression and leave the runner. Write the stop in the pull request. Do not tune a tolerance.

**Acceptance.** For each output that moved, the mutation test fails if the exponent is restored to the runner-only path, and the existing numeric expectations are unchanged.

**Verify.** `bunx vitest run tests/cases`. The CLI golden files that name that case id (`tests/cli/golden/`). `bun run typecheck`.

**Risk.** The formula grammar's names (`pi`, `sqrt`, `exp`, `abs`) are not the runner's `Math.*` calls. Use the grammar `evaluateFormula` already accepts. If a runner line has no grammar spelling, leave it a method and say so.

---

## S8 — Pin the 0.28.0 gaps

**Files.** `tests/dimensional/mathts-unit-gaps.test.ts` (extend). No `src/` change.

**Steps.**

1. Read the file. Add a row only for a behavior it does not already assert. The behaviors to pin, each as an assertion that reads MathTS and UPT:
   - `Unit.parse('dB')` returns a number, and `parseUnit('dB')` throws `UnitRefusedError`.
   - `Unit.parse('Pas')` throws, and `parseUnit('Pas').scale` is 1.
   - `getUnitRow('Bq')`, `getUnitRow('Gy')`, `getUnitRow('Sv')`, and `getUnitRow('kat')` are undefined, and `parseUnit` of each returns scale 1.
   - `Unit.exactScale('bit')` converts to 1, and `parseUnit('bit').scale` is `Math.LN2`.
   - `new Unit(1, 'Hz').to('rad/s')` is `2 * Math.PI`, and `convertValue('1 Hz', 'rad/s').value` is 1 and `.cycles` is 1.
   - `Unit.parse('ln2')` throws, and `Unit.parse('furlong')` returns a number, and `parseUnit('furlong')` throws `UnknownUnitError`.
2. RED. For one new row, run the test with the expected UPT class flipped (expect `parseUnit('dB')` to return a number). It must fail. Restore the real expectation. Say that in the pull request. The row was written after seeing MathTS, so the comment at the top of the test says the same thing the existing gap rows say: deleting one expected value is the control that the assertion is wired.
3. Do not change production code in this pull request.

**Acceptance.** `bunx vitest run tests/dimensional/mathts-unit-gaps.test.ts tests/dimensional/unit-rows-mathts-parity.test.ts tests/dimensional/unit-parse-delegation.test.ts` passes. `git diff src/` is empty.

**Verify.** That vitest command.

**Risk.** A MathTS patch inside the caret could flip a row later. That is what the gap test is for. Do not loosen the caret in this sprint.

---

## S9 — Delegate bare shared spellings

**Files.** `src/dimensional/mathts-unit-wrapper.ts` or `src/dimensional/mathts-unit-delegation.ts` (whichever `unitReadingsSource` reads; follow the call), `tests/dimensional/unit-parse-delegation.test.ts`.

**Steps.**

1. Generate the candidate list with a scratch script that is not committed. A symbol is a candidate when `getUnitRow(symbol)` is defined, `symbol !== 'bit'`, `Unit.parse(symbol)` does not throw, and `exactScaleToNumber(Unit.exactScale(symbol))` equals `parseUnit(symbol).scale`. Print the list.
2. RED. Extend `unit-parse-delegation.test.ts` so each candidate expects `unitReadingsSource(symbol) === 'mathts'`. Run it. The ones still `'local'` fail. Do not add `bit`, `Bq`, `Gy`, `Sv`, `kat`, `mpc`, `dB`, `Pas`, `mAs`, `furlong`, `ton`, or `ln2`.
3. Teach the predicate that already sets `unitReadingsSource` to return `'mathts'` for that list and no other new texts. Compounds stay as they are. `km` and the existing A5 texts stay `'mathts'`.
4. Refusal still runs first (`uptRefusalReason`). A candidate that is also refused is not a candidate; the generator in step 1 only walks `UNIT_DATA.units` keys.
5. Re-run the delegation test, `unit-rows-mathts-parity.test.ts`, `units.test.ts`, and `exact-unit-scale.test.ts`. A changed scale or error class stops the sprint. Drop that symbol from the list and record it in the pull request.

**Acceptance.** Every candidate's `unitReadingsSource` is `'mathts'`. `parseUnit('bit').scale` is still `Math.LN2`. `parseUnit('dB')` still throws `UnitRefusedError`. `parseUnit('Bq').scale` is still 1. `parseUnit('Pas').scale` is still 1. `convertValue('1 Hz', 'rad/s').value` is still 1.

**Verify.** `bunx vitest run tests/dimensional/unit-parse-delegation.test.ts tests/dimensional/unit-rows-mathts-parity.test.ts tests/dimensional/units.test.ts tests/dimensional/exact-unit-scale.test.ts tests/dimensional/mathts-unit-gaps.test.ts`. `bun run typecheck`.

**Risk.** `Unit.parse` of a prefixed spelling such as `dm` can succeed while the UPT prefix rule differs (`Gyr` versus `Gy`). The candidate rule above is bare symbols that `getUnitRow` knows, which excludes prefix forms. Do not add a prefix form in this sprint.

---

## S10 — Getting started and the catalog guide

**Files.** `docs/user/getting-started.md` (new), `docs/user/catalog.md` (new), `docs/README.md` (one link under a new "Using the library" paragraph), `tests/examples/user-docs.test.ts` (new).

**Steps.**

1. Getting started. Install line from the README (`npm install universal-physics-tensor`, `npx upt help`). The five commands in the README section "First five minutes", with the same printed values the README already shows (`2.0060666807106475`, the derive prefactor line, the Hawking recovered value, the Chandrasekhar line). A paragraph on a clone: Bun `1.4.2` as `packageManager`, `bun install`, `bun run build`, `node bin/upt.mjs`. Point at `docs/CLI.md`, `docs/user/catalog.md`, and `docs/user/tutorials/` (S13 adds the tutorials; the link is the directory).
2. Catalog guide. A bridge is a record in `data/bridge-catalog.json`. Cite it as BE-&lt;id&gt; where `<id>` is the record's `id`. The CLI spelling is `be-&lt;id&gt;`. `BRIDGE_EQUATIONS` is the in-memory projection. A canonical equation id looks like `CE-pendulum-period`. Show `upt search pendulum`, `upt explain hawking-temperature mass=1Msun`, `upt evaluate be-63 mu_e=2`, `upt canonical`, and `upt atlas` with one real id that `upt atlas` accepts today (read `upt atlas --help` or the command's examples; do not invent an id). Say that an id with no evaluator still has a record (`upt atlas`) and `upt evaluate` lists the evaluable ids when called with no id. Do not write the bridge count, the evaluator count, or the canonical count.
3. RED. `tests/examples/user-docs.test.ts` fails until both files exist. It then extracts every fenced `bash` block whose first line starts with `upt ` or `npx upt `, runs it with `node bin/upt.mjs` (strip the `upt ` prefix; skip blocks that start with `npm` or `npx`), and asserts exit 0. For the four README commands, also assert the stdout substring the README prints.
4. `docs/README.md` links the two new files from a short paragraph. Do not copy the guide into the README.

**Acceptance.** The test runs the documented CLI examples and they exit 0. Neither guide contains a line matching `/^\d+ bridges/` or a hardcoded `160`.

**Verify.** `bunx vitest run tests/examples/user-docs.test.ts`. The suite's pretest builds, so `dist/` exists.

**Risk.** `upt atlas` with a bad id exits non-zero and fails the test. Use an id from `upt atlas --help` or from the command's own example list in `src/cli/commands/atlas.ts`.

---

## S11 — Public TSDoc gaps

**Files.** The declaration files the scanner prints. No new dependency.

**Steps.**

1. Add `scripts/public-tsdoc-gaps.ts`. It reads the quoted names in `tests/api/__snapshots__/public-surface.test.ts.snap` (the runtime-exports snapshot). For each name it finds the declaration in `src/` (the `export` that defines it, not a re-export line that only says `export { Name }`). It uses `fileDocs` from `tools/code-docs-ratchet/check.ts`. It prints `file name` for each name whose `documented` is false. It exits 0 either way. Run it and paste the list into the pull request.
2. The work list is that printout. The 1 015 undocumented symbols under all of `src/` are not the work list.
3. If the list has at most 40 names, fill them in this pull request. If it has more, fill one banner section of `src/index.ts` (the comment blocks that group the re-exports) per pull request, and leave the other names for a follow-up with the same steps. A summary is one sentence a caller can use. Do not change a signature. Do not add `@public` to a symbol that is not already public.
4. RED is the ratchet, which fails when a changed export has no summary. Filling the summary is the fix. Do not delete a summary that is already there.

**Acceptance.** Re-running the script prints none of the names this pull request claimed to fill. `bun run typecheck` is clean.

**Verify.** `bun scripts/public-tsdoc-gaps.ts`. `bunx vitest run tests/api/public-surface.test.ts`.

**Risk.** `fileDocs` reports a re-export clause as its own symbol. Resolve the name to the file that contains `export function`, `export class`, `export const`, or `export interface` with that name. If two files define it, use the one `src/index.ts` imports.

---

## S12 — Generated API reference

**Files.** `scripts/api-reference.ts` (new), `docs/user/api.md` (generated), `.github/workflows/ci.yml` (one step in `docs-fresh`), `package.json` `scripts` only if the CLI reference has a `docs:cli` script to mirror — add `docs:api` the same way. A `package.json` script entry is not a version bump.

**Steps.**

1. `scripts/api-reference.ts` walks the same snapshot names as S11, reads the TSDoc summary of the declaration, and writes `docs/user/api.md` with one heading per name and that summary. A name S11 left undocumented gets the line `Summary not written yet.` and nothing else. `--check` exits 1 when the committed file differs, the way `scripts/cli-reference.ts --check` does.
2. Run `bun scripts/api-reference.ts` and commit the markdown.
3. In `.github/workflows/ci.yml`, add a step after `Fail when the CLI reference is stale` that runs `bun scripts/api-reference.ts --check`.
4. RED. Run `--check` before generating and keep the failure. After generating, `--check` exits 0. Change one word of the markdown, see `--check` fail, restore the word.

**Acceptance.** `--check` exits 0 on the committed file. The page links `docs/user/getting-started.md` at the top. It does not claim a hosted URL.

**Verify.** `bun scripts/api-reference.ts --check`. `bunx vitest run tests/api/public-surface.test.ts`.

**Risk.** A summary that contains a snapshot-sensitive phrase will churn the markdown every time the comment is edited. That is the point of `--check`. Do not hand-edit `docs/user/api.md`.

---

## S13 — Tutorials that run

**Files.** `docs/user/tutorials/evaluate-a-bridge.md`, `docs/user/tutorials/units.md`, `docs/user/tutorials/search-and-explain.md` (all new), `tests/examples/tutorials.test.ts` (new).

**Steps.**

1. Each tutorial is Markdown with one fenced block the test executes.
   - `evaluate-a-bridge.md`: a `bash` block `upt evaluate be-63 mu_e=2`, and a `ts` block that imports `BRIDGE_EQUATIONS` from `'universal-physics-tensor'` and prints `BRIDGE_EQUATIONS.length`. The test asserts the CLI stdout contains `Chandrasekhar` and the ts block prints a line of digits. Do not assert the digit string in the markdown.
   - `units.md`: a `ts` block that imports `parseUnit` and `convertValue` from `'universal-physics-tensor'`, prints `parseUnit('bit').scale`, prints `convertValue('25 degC', 'K', 'difference').value`, and prints `convertValue('1 Hz', 'rad/s').value`. The test asserts the three lines are `Math.LN2`, `25`, and `1`.
   - `search-and-explain.md`: `upt search pendulum` and `upt explain hawking-temperature mass=1Msun`. Assert `CE-pendulum-period` and `6.16842971641034e-8`.
2. Copy the spawn setup from `tests/examples/basic-usage.test.ts` for `ts` blocks (symlink the repo as `node_modules/universal-physics-tensor`, `node --experimental-strip-types`). Run `bash` blocks with `node bin/upt.mjs` the way S10 does.
3. RED. The test file fails before the markdown exists (the read throws). Then add the markdown.

**Acceptance.** `bunx vitest run tests/examples/tutorials.test.ts tests/examples/basic-usage.test.ts tests/examples/user-docs.test.ts` passes. `examples/basic-usage.ts` is unchanged.

**Verify.** That vitest command.

**Risk.** `--experimental-strip-types` fails if a tutorial imports a type-only name as a value. Import values the package root exports. Read `src/index.ts` for `parseUnit`, `convertValue`, and `BRIDGE_EQUATIONS` before writing the import.

---

## What a worker does not do

- Optimize `mul`, `integrateGeodesic`, the Riemann pipeline, the eikonal, or `forwardGrad`. The baseline says why.
- Call `Unit.to` / `toSI` from `convertValue`, call `Unit.createUnit`, set `bit` to scale 1, accept `dB` or `furlong`, or make `mAs` or `mol/mL` ambiguous.
- Add a file matching `case-*.ts` under `src/cases/`, or bring back `skin-depth.ts` and the other five names in `FORBIDDEN_PER_CASE_MODULES`.
- Edit `package.json` `version` or `dependencies`. A `scripts` entry in S12 is the only `package.json` edit.
- Add Typedoc, a documentation site, or a wall-clock `expect` in vitest.
- Open a MathTS pull request. The missing rows to mention in the UPT pull request body, for the owner, are `Bq`, `Gy`, `Sv`, and `kat`.
