# UPT optimization, reduction, MathTS units, and user docs

Design for a sequence of small pull requests. It authorizes nothing. `ACTIVE.md` is the gate. The ordered work, the commands, and the measured baseline are in [`docs/superpowers/plans/2026-11-21-upt-optimization-docs.md`](../plans/2026-11-21-upt-optimization-docs.md). A number in this file would be a second copy of that baseline, so this file states the decisions and points at that table.

No sprint here bumps `package.json`, tags, or publishes. The public names `parseUnit`, `convertValue`, `evaluateRelation`, `evaluateBridge`'s callers, and the CLI verbs stay. A sprint that would change a printed value, an error class, or a golden stops.

## What was measured, and what that decides

The plan's baseline names the tree, the machine, and the lockfile pins. Two facts from that run decide the speed work:

1. `upt version`, `upt help`, `upt evaluate`, and `upt search` cost the same wall clock. A bare `node -e` process is much smaller. The CPU profile of `upt version` spends its samples in `typed-function` and ESM module compilation, which run because `src/cli/main.ts` imports `src/cli-api.ts` and `src/cli/commands/index.ts` before `runCli` looks at the verb. `version` is handled at `runCli` after that import (`src/cli/main.ts` around the `NO_JSON_VERBS` branch).
2. The in-process numeric paths the benches already name — tensor `mul`, a 1 000-step Schwarzschild geodesic, the finite-difference Riemann pipeline, and a 2 048-step covariant eikonal — are milliseconds or less once the modules are loaded. `forwardGrad` on a `[100,100]` tensor is the exception, and the MathTS type says it returns `{ value, jacobian }`. That cost is the full Jacobian. `reverseGrad` on the same tensor is a small fraction of it. UPT's catalog gradient already uses MathTS reverse mode (`src/diff/bridge-ast-gradient.ts`).

So the only speed change in this design is: `upt version` returns before those two imports. Help stays on the command registry, because a second hand-written command list would drift from `registerCommand`. Audit stays a full load plus the Buckingham and formula work; its profile is mostly MathTS (`trustedMathFunctions`, `Fraction`, `rref`). A memo of compiled formulas is allowed only when a count shows the same text parsed more than once in one audit. Otherwise that memo is a negative result and the sprint stops.

No sprint rewrites `mul`, the geodesic integrator, the curvature lowering, or `forwardGrad`.

## Code reduction

Two older documents use the word reduction for other work. They stay as they are.

- [`docs/audit/2026-11-05-mathts-integration-gaps.md`](../../audit/2026-11-05-mathts-integration-gaps.md) is the #581 gap analysis. Its UPT-2 row is "delete the unused direct dependencies `mathts-wasm`, `mathts-parallel`, and `mathts-workerpool`". Task P0 of [`docs/superpowers/plans/2026-11-07-mathts-integration-refactor.md`](../plans/2026-11-07-mathts-integration-refactor.md) is that row. The lockfile now has the six MathTS packages named in `package.json`, and `NOTES.md` records the removal. This design does not remove or bump a dependency.
- GitHub pull request **#603** is the U9 gradient-spike note ("docs(plan): record the U9 gradient spike"). It is not a dependency-reduction plan. There is no document in this repository by that name.
- [`docs/design/bridge-reduction-pass.md`](../../design/bridge-reduction-pass.md) is a generating-set design for catalog equations. It is a different pass. This design does not run it and does not edit a catalog row.

What this design does call reduction is dead code and the last per-case runners.

### Per-case files

The no-per-equation-files rule is the bridge catalog (`data/bridge-catalog.json`, `src/bridges/relation-eval.ts`) and the same shape for applied cases (`docs/plans/MATHTS_UNITS_AND_CASES_PLAN.md` Part B, `src/cases/catalog.ts` `isForbiddenCaseModule`, `tests/cases/cases-directory.test.ts`).

The live `src/cases/` directory is seven modules: `index.ts`, `types.ts`, `catalog.ts`, `catalog-checks.ts`, `engine.ts`, `methods.ts`, `quadrature.ts`. The six per-case files named in `FORBIDDEN_PER_CASE_MODULES` are already gone. A new `case-*.ts` fails the directory test.

**Recommendation: keep that ban.** Do not put a case back in its own file, and do not add a shim that re-exports one. A numeric method an expression cannot state (an integral, a root, an ODE step) stays a named export of `methods.ts`. That is the Part B end state, and it is the right one.

The cruft left is functions, not files.

- `ENGINE_CASE_IDS` in `src/cases/engine.ts` forces `case-skin-depth`, `case-kepler-rv`, and `case-damped-resonator` through `runAppliedCaseEngine`. `buildAppliedCase` in `methods.ts` therefore never calls `runCaseSkinDepth`, `runCaseKeplerRv`, or `runCaseDampedResonator`. Those three functions are still listed on `CASE_METHODS`. The cleanup sprint deletes them after it has shown that no catalog output names them.
- `case-resistor-noise`, `case-lumped-cooling`, and `case-brownian-sphere` still run as one method each (`DELEGATED_RUN_METHODS`). Closed-form outputs of those three move to `expr` one case per pull request, and only while the existing case tests keep the same numbers. The integral, the series, and the radiating step stay methods.

`src/canonical/entries/` is ten per-domain modules plus `_l1-build.ts`. That is not a per-equation file. This design does not split or merge them.

## Units

The public unit API stays the wrapper: `parseUnit`, `convertValue`, `readUnit`, and the error classes `UnitError`, `UnknownUnitError`, `UnitRefusedError`, `AmbiguousUnitError`. Callers keep matching those classes.

Checked by importing the installed core's `Unit`, `Unit.exactScale`, `Unit.parse`, `Unit.readings`, `Unit.readingsWithSource`, `getUnitRow`, `exactScaleToNumber`, `REFUSED_UNIT_SPELLINGS`, and `NAMED_IRRATIONALS`. The counts and the probe commands are the plan's unit baseline. `tests/dimensional/unit-rows-mathts-parity.test.ts` already requires every shared row to match MathTS, with `bit` as the one policy exception.

### What MathTS does not cover

The owner's "about 41 plus ln2" does not match that probe. The spellings MathTS does not parse are `Bq`, `Gy`, `Sv`, and `kat`. The only shared row whose scale number differs is `bit` (UPT expression `ln2`, MathTS scale 1 on the bit axis). Sub-kilo prefixes of `pc` and the SI prefixes of those four units stay on the UPT prefix table.

`ln2` is not a unit. `Unit.parse('ln2')` throws. It is the scale expression of the `bit` row, a name in `src/dimensional/constant-rows.ts`, and a key of MathTS `NAMED_IRRATIONALS` (`LN2_EXACT_SCALE`). The bit row keeps the expression `ln2`. Nothing registers a unit spelled `ln2`.

Those four spellings, their SI prefixes, `bit`, and the sub-kilo parsec prefixes stay on `data/units.json` and the local reader. `Gyr` stays the gigayear, which the unit table already separates from `Gy`.

### Policy the wrapper keeps even where MathTS parses

Measured on 0.28.0. Delegating `Unit.parse` or `Unit.to` straight through would change a public result.

| UPT today | MathTS 0.28.0 | Wrapper |
|---|---|---|
| `dB`, `dBm`, `dBW`, `Np` throw `UnitRefusedError` with the `data/units.json` reason | `getUnitRow` exists and `Unit.parse` returns a number (`dB` about 1.259, `Np` about 2.718) | Refusal runs before any MathTS parse |
| `ton`, `tons` throw `UnitRefusedError` with the short/long/metric message | `AmbiguousUnitError` (shortton, longton, or `t`) | UPT message stays |
| `Mach`, `mach` throw `UnitRefusedError` | `REFUSED_UNIT_SPELLINGS` has the same refusal | UPT class stays |
| `convertValue('1 Hz', 'rad/s')` is 1 with `cycles: 1`. `rpm` is 1/60 with a cycle count | `new Unit(1, 'Hz').to('rad/s')` is 2π. `exactScale('Hz')` is 1 | Conversions use `exactScale` plus the UPT cycle count. `.to` is not the conversion |
| `convertValue('25 degC', 'K', 'difference')` is 25 | `.to('K')` on `1 degC` is 274.15 | Difference stays the local offset choice |
| `degC/s` throws `UnitRefusedError` | MathTS also refuses an affine unit in a compound | Keep the UPT class |
| `mAs` is 0.001 A·s, one reading (issue 676, `tests/dimensional/unit-grammar.test.ts`) | `Unit.parse('mAs')` is "not found". `Unit.readings('mAs')` returns two splits | The product row in `data/units.json` stays the authority |
| `mol/mL` is 1e6 mol/m³, one reading | One reading, the same scale | Already agreed. Do not invent a second reading |
| `Pas` is 1 Pa·s | Ambiguous: `P*as` or `Pa*s` | Local grammar stays |
| `furlong` is `UnknownUnitError` | Parses, 201.168 m | Admission stays `data/units.json` |
| `µmK` parses as 1e-6 m·K | "not found" | Local grammar stays |
| `mpc` is a milliparsec | "not found" (`SHORT_UP_ONLY` on `pc`) | Local prefix table stays for that family |

`Unit.createUnit` is process-global. No sprint calls it.

The local grammar in `units.ts` remains the reader for anything in the table above. Part A step A12 of the units plan (delete the local grammar) is not available on core 0.28.0, and this design does not schedule it.

What does move is the bare spelling MathTS already agrees on. `unitReadingsSource` is `'mathts'` for the A5 list in `src/dimensional/mathts-unit-wrapper.ts` and `'local'` otherwise. The units sprint adds a bare shared symbol to that path only when `getUnitRow` exists, the scale numbers match, `Unit.parse` accepts it, and the symbol is not `bit`. Compounds, the four missing SI units, and the policy rows stay local. `tests/dimensional/unit-parse-delegation.test.ts` and `unit-rows-mathts-parity.test.ts` are the pins.

## User documentation

Users currently have the README's "First five minutes", [`docs/CLI.md`](../../CLI.md) (generated by `scripts/cli-reference.ts`), and [`docs/architecture/API.md`](../../architecture/API.md), which is an engineering reference. There is no getting-started guide, no generated API reference, no tutorial the test runner executes besides `examples/basic-usage.ts`, and no catalog guide.

All of this lives in the repository as Markdown. There is no hosted site and no documentation dependency.

- **Getting started** — `docs/user/getting-started.md`. The five commands already printed in the README, how a clone builds, and where the CLI reference and the catalog guide are. It does not paste a bridge count.
- **Catalog guide** — `docs/user/catalog.md`. How to browse and cite. A catalog id is the `id` field of `data/bridge-catalog.json`, spoken as BE-&lt;id&gt; and passed to the CLI as `be-&lt;id&gt;`. `BRIDGE_EQUATIONS` is the projection. A canonical id is `CE-…` from `src/canonical/registry.ts`. The commands are `upt search`, `upt explain`, `upt evaluate`, `upt canonical`, and `upt atlas`. The guide teaches the commands. It does not freeze a count.
- **API reference** — `docs/user/api.md`, generated. TypeScript 7 ships no compiler API (`MEMORY.md`), so the generator is a repository script in the style of `scripts/cli-reference.ts`, not Typedoc. The name list is the public-surface snapshot (`tests/api/__snapshots__/public-surface.test.ts.snap`). The text is the TSDoc summary on the declaration. `docs-fresh` runs the script with `--check`, beside `scripts/cli-reference.ts --check`.
- **TSDoc gaps** — filled on the public snapshot names whose declaration has no summary. The tree-sitter scan of every `src/` symbol (3 582 symbols, 1 015 without a summary, including re-export clauses) is the wrong work list. The fill sprint prints the public subset and edits those declarations. The code-docs ratchet already fails a pull request that adds an export with no summary.
- **Tutorials** — `docs/user/tutorials/`. Each fenced `bash` or `ts` block is executed by a vitest file next to `tests/examples/basic-usage.test.ts`. The existing CI `vitest` job is the CI step. No new timeout, no retry, no second workflow.

`examples/basic-usage.ts` already runs against the package name. It stays.

## Out of scope

- A version bump, a tag, or `npm publish`.
- Editing `package.json` dependencies or `bun.lock`.
- A MathTS pull request. The four missing SI units, a `bit = ln2` option, and a difference-reading flag are named so the owner can file them. UPT does not patch MathTS from this tree.
- Deleting `src/dimensional/units.ts`.
- The bridge generating-set pass.
- Authoring or scoring an atlas benchmark item.
- A wall-clock assertion in the test suite. Benchmarks print a baseline. They do not fail CI for being slow.
- Committing `bench/results.json`, a CPU profile, or a repo-tools JSON dump.
