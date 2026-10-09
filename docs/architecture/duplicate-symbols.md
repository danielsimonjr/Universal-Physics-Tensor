# Universal Physics Tensor — Duplicate Symbols

Names that more than one `src` file declares, after the dependency graph's `reExported` list is removed.

> **Read from `docs/architecture/dependency-graph.json`, then checked in source.** `repo_map.py` is not in this repository and was not re-run. The previous edition of this file said 383 TypeScript files under `src/` and cited `totalSourceFiles` 1025. A later edition said 16 names after `reExported`. The current graph's `metadata.totalFiles` is 479 and its `statistics.totalExports` is 3889. Those older fields are not in the JSON.

## Read this first

The graph's raw export lists collide because barrels re-export the same binding. After names marked `reExported` are removed, **3 names are still declared in more than one file**. The sentence that 16 names remain, and that most of those 16 are a shim the lexer did not mark `reExported`, is the record from before `export { … } from` replaced those assignments. The tool groups by name only. A group means "more than one file declares this name", not "the bodies differ". `canonicalJson` and `captureEnvironment` are one module. `getBridge` is two functions and was already a local pair.

`src/` on this measurement is 479 TypeScript files (`docs:deps` and `git ls-files`).

## Real second definitions

### `command` — 28 files. Registration convention.

Every module under `src/cli/commands/` that is a command exports `command`. Helpers (`index.ts`, `_atlas-route.ts`, `_atlas-map.ts`, `_discovery-opts.ts`) do not. `command.ts` defines the shape. The previous edition of this file said 23 files. The registry in `src/cli/commands/index.ts` now side-effect-imports 28 command modules.

### `getBridge`

`getBridge` is `src/composition/descriptor.ts`. The atlas reader in `src/atlas/bridge-record.ts` is `catalogBridgeRecord`, named for what it returns: the joined catalog record with its canonical id, formal reference and evaluator. The sentence that two files each defined `getBridge`, two functions under one name, is the record from before that rename.

### `MASS_DENSITY`

`MASS_DENSITY` is `{ L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 }` in `src/dimensional/types.ts`. The sentence that be-20 and `src/composition/quantities/_dims.ts` re-export it, and that the graph marks both `reExported`, is the record from before the catalog engine. The sentence that two files export it, and that five more files assign the same object, is the record from before this export. Those files were `be-20-vacuum-energy.ts`, `_dims.ts`, `catalog-tranche.ts`, `bridge-check.ts`, `friedmann-equation.ts`, `be-19-quantum-bounce.ts`, and `be-54-randall-sundrum-brane.ts`.

### `canonicalJson` and `captureEnvironment`

Both names are defined in `src/composition/canonical-json.ts`. The probe files re-export them. The sentence that each name is a second definition, in `src/cli/record.ts` and under `src/composition/probe/`, is the record from before that module.

## Same binding, now marked a re-export

These were one value reached through a second `export`. They are `export { … } from`, so the graph no longer lists them as two local declarations. The sentence that the lexer did not mark them `reExported` is the record from before that change.

| Name | Declaring file | Re-export |
|---|---|---|
| `COMPOSITION_TABLE`, `composeRelation`, `NO_COMPOSITE_CLAIM` | `src/relations/composition-table.ts` | `src/atlas/composition-table.ts` |
| `regimeHolds` | `src/relations/regime.ts` | `src/atlas/regime.ts` |
| `DimensionMismatchError` | `src/dimensional/errors.ts` | `src/dimensional/algebra.ts` |
| `EngineCapabilityError` | `src/numerical/errors.ts` | `src/numerical/tensor-engine.ts` |
| `DEFAULT_SEARCH_BUDGET` | `src/composition/probe/types.ts` | `src/composition/probe/search-budget.ts` |
| `IDENTITY_BOUND` | `src/atlas/error-algebra.ts` | `src/atlas/path-bound.ts` |
| `M_PROTON_SI` | `src/core/constants.ts` | `src/bridges/index.ts`. The sentence that the re-export was `src/bridges/be67-alfven-speed.ts` is the record from before the catalog engine |
| `evaluateMetricInverse` | `src/numerical/metric-inverse.ts` | `src/numerical/index.ts` |
| `dim` | `src/dimensional/ast-builders.ts` | `src/canonical/entries/_l1-build.ts` |
| `PHYSJS_COMMIT` | `src/atlas/physjs-entries.generated.ts` | `src/atlas/physjs-ref.ts` |

`admitApproximation` stays `export function` in `src/atlas/regime.ts`.

## Lexer false positive

### `BCS_GAP_RATIO`

`BCS_GAP_RATIO` is defined in `src/core/constants.ts` and re-exported from `src/bridges/index.ts`. The sentence that `src/bridges/be62-bcs-gap.ts` exports the constant, and that `src/bridges/confrontations.ts` quotes that line, is the record from before the catalog engine. There is one constant.

## Withdrawn from the previous edition

`propagateUncertainty` was listed as a duplicate export of `src/cli/commands/evaluate.ts` and `src/composition/uncertainty.ts`. The CLI function is now `propagateEvaluatorUncertainty` (`evaluate.ts:161`). The graph-layer export remains `src/composition/uncertainty.ts:100`. Both still call MathTS `propagateUncertainty`. They are two wrappers, and they are no longer the same exported name.

## Verification

| Claim | Value | Source |
|---|---|---|
| `src` TypeScript files | 479 | `dependency-graph.json` `metadata.totalFiles`, and `git ls-files` |
| total exports | 3889 | `dependency-graph.json` `statistics.totalExports` |
| total re-exports | 1939 | `dependency-graph.json` `statistics.totalReExports` |
| names declared in more than one file, after `reExported` | The sentence that this cell is 3 (`command`, `getBridge`, `BCS_GAP_RATIO`) is the record from before the catalog engine. `BCS_GAP_RATIO` is defined in `src/core/constants.ts` | walk of `dependency-graph.json` described above |
| of which the bodies differ or the lexer mis-read a quote | 3. The sentence that this cell is 4 (`command`, `MASS_DENSITY`, `canonicalJson`, `captureEnvironment`) plus `BCS_GAP_RATIO` is the record from before the JSON profiles and this export | source read |

`repo_map.py` did not produce this edition. A later `repo_map.py check` against the old 1025/1982 claims would be checking a schema this tree no longer writes.
