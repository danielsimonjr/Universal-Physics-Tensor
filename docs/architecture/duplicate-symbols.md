# Universal Physics Tensor — Duplicate Symbols

Names that more than one `src` file declares, after the dependency graph's `reExported` list is removed.

> **Read from `docs/architecture/dependency-graph.json` on the 5.0.0 tree, then checked in source.** `repo_map.py` is not in this repository and was not re-run. The previous edition of this file said 383 TypeScript files under `src/` and cited `totalSourceFiles` 1025. The current graph's `metadata.totalFiles` is 471 and its `statistics.totalExports` is 3553. Those older fields are not in the JSON.

## Read this first

The graph's raw export lists collide on 1124 names, because barrels re-export the same binding. After names marked `reExported` are removed, **16 names are still declared in more than one file**. Most of those 16 are a shim that assigns or re-exports a binding the lexer did not mark `reExported`. Four groups are real second definitions or a lexer false positive. The tool groups by name only. A group means "more than one file declares this name", not "the bodies differ".

`src/` on this measurement is 471 TypeScript files (`docs:deps` and `git ls-files`).

## Real second definitions

### `command` — 28 files. Registration convention.

Every module under `src/cli/commands/` that is a command exports `command`. Helpers (`index.ts`, `_atlas-route.ts`, `_atlas-map.ts`, `_discovery-opts.ts`) do not. `command.ts` defines the shape. The previous edition of this file said 23 files. The registry in `src/cli/commands/index.ts` now side-effect-imports 28 command modules.

### `MASS_DENSITY` — 2 exported files, 5 more local copies. Same dimension.

| File | Role |
|---|---|
| `src/bridges/equations/be-20-vacuum-energy.ts:66` | exported `Dimension` |
| `src/composition/quantities/_dims.ts:18` | exported `Dimension` the quantity modules import |

Both are `{ L: -3, M: 1, T: 0, I: 0, Theta: 0, N: 0, J: 0 }`. The same object literal is also a non-exported `const` in `src/composition/edges/catalog-tranche.ts:68`, `src/dimensional/bridge-check.ts:63`, `src/dimensional/friedmann-equation.ts:163`, `src/bridges/equations/be-19-quantum-bounce.ts:72`, and `src/bridges/equations/be-54-randall-sundrum-brane.ts:58`. The graph does not list those five, because they are not exported.

### `canonicalJson` — 2 files. Different edge cases.

| File | Role |
|---|---|
| `src/cli/record.ts:94` | record/replay hashing. Hand-joined arrays. No `Date` case |
| `src/composition/probe/serialize.ts` | probe artifact hashing. `Date` becomes an ISO string. An `undefined` array hole becomes `null` |

### `captureEnvironment` — 2 files. Different schemas.

| File | Role |
|---|---|
| `src/cli/record.ts:117` | UPT version, Node, parser, simplifier, peers, constant-table hashes |
| `src/composition/probe/run-manifest.ts:18` | Node version, platform, architecture |

## Same binding, lexer did not mark it a re-export

These are one value reached through a second `export`. They are shims, recorded so a later reader does not treat them as a second algorithm.

| Name | Declaring file | Second file |
|---|---|---|
| `COMPOSITION_TABLE`, `composeRelation`, `NO_COMPOSITE_CLAIM` | `src/relations/composition-table.ts` | `src/atlas/composition-table.ts` assigns the imports and exports the consts |
| `regimeHolds` | `src/relations/regime.ts` | `src/atlas/regime.ts:28` assigns the import |
| `DimensionMismatchError` | `src/dimensional/errors.ts:26` | `src/dimensional/algebra.ts:19` `export { DimensionMismatchError }` |
| `EngineCapabilityError` | `src/numerical/errors.ts:28` | `src/numerical/tensor-engine.ts:15` `export { EngineCapabilityError }` |
| `DEFAULT_SEARCH_BUDGET` | `src/composition/probe/types.ts:71` | `src/composition/probe/search-budget.ts:11` `export { DEFAULT_SEARCH_BUDGET }` |
| `IDENTITY_BOUND` | `src/atlas/error-algebra.ts:28` | `src/atlas/path-bound.ts` `export { IDENTITY_BOUND }` |
| `M_PROTON_SI` | `src/core/constants.ts:103` | `src/bridges/be67-alfven-speed.ts:21` `export { M_PROTON_SI }` |
| `evaluateMetricInverse` | `src/numerical/metric-inverse.ts:23` | `src/numerical/index.ts:34` `export { evaluateMetricInverse }` |
| `dim` | `src/dimensional/ast-builders.ts:29` | `src/canonical/entries/_l1-build.ts:17` `export { dim }` |

## Lexer false positive

### `BCS_GAP_RATIO`

`src/bridges/be62-bcs-gap.ts:23` exports the constant. `src/bridges/confrontations.ts:661` quotes that line inside a citation object. The dependency-graph lexer records the quote as an export, and `unused-analysis.md` then lists it as unused. There is one constant.

## Withdrawn from the previous edition

`propagateUncertainty` was listed as a duplicate export of `src/cli/commands/evaluate.ts` and `src/composition/uncertainty.ts`. The CLI function is now `propagateEvaluatorUncertainty` (`evaluate.ts:161`). The graph-layer export remains `src/composition/uncertainty.ts:100`. Both still call MathTS `propagateUncertainty`. They are two wrappers, and they are no longer the same exported name.

## Verification

| Claim | Value | Source |
|---|---|---|
| `src` TypeScript files | 471 | `dependency-graph.json` `metadata.totalFiles`, and `git ls-files` |
| total exports | 3553 | `dependency-graph.json` `statistics.totalExports` |
| names declared in more than one file, after `reExported` | 16 | walk of `dependency-graph.json` described above |
| of which the bodies differ or the lexer mis-read a quote | 4 (`command`, `MASS_DENSITY`, `canonicalJson`, `captureEnvironment`) plus `BCS_GAP_RATIO` | source read |

`repo_map.py` did not produce this edition. A later `repo_map.py check` against the old 1025/1982 claims would be checking a schema this tree no longer writes.
