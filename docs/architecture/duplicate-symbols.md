# Universal Physics Tensor — Duplicate Symbols

Names that more than one source file declares, and the reason each one is safe.

> **Derived from `duplicate-symbols.json`.** `repo-tools map` writes that report. A person
> reads each group in the source and writes this file. The report groups by name only. A group
> means "more than one file declares this name". A group does not mean "the bodies differ".

## Scope

The report covers the **whole repository**: every tracked source file, tests and tools
included. The groups below all sit under `src/`. `duplicate-owners.md` is a different report.
The project generator writes it for `src/` only, and it tracks the owner of each concept.

## Summary

The report holds 12 groups: 2 runtime names and 10 type names. The report tags every group
`TRUE_DUPLICATE`, because it cannot tell a forwarding alias from a second definition. Source
reading gives a finer result.

| Group | Names | Kind of duplicate | Action |
|---|---|---|---|
| Command registration | `command` | One name per module, by convention | None |
| Hash wrapper | `sha256Hex` | A thin wrapper around one implementation | None |
| Type forwarding aliases | 10 type names | An alias to one type | None |

No group holds two independent implementations.

## Runtime names

### `command`: 28 files

Each command module under `src/cli/commands/` exports `const command`. The registry reads
that export through `registerCommand`. The directory holds 32 files. Four are helpers that
export no command: `index.ts`, `_atlas-route.ts`, `_atlas-map.ts` and `_discovery-opts.ts`.
`index.ts` is a side-effect barrel. It holds one `import './<name>.js'` line for each of the 28
command modules. A new command adds its module and one line to the barrel. The shape of
`command` comes from `src/cli/command.ts`.

### `sha256Hex`: 2 files

`src/core/hash.ts` holds the one SHA-256 implementation. It accepts a `string` or a `Buffer`.
`src/composition/canonical-json.ts` exports a wrapper with the same name. The wrapper accepts
a `string` and calls the core function, which it imports as `coreSha256Hex`.
`src/composition/probe/index.ts` and `src/composition/probe/serialize.ts` re-export the
wrapper for the probe subpath. Read the hash from `src/core/hash.ts` when you need the
implementation.

## Type names: 10 groups

Each group is a forwarding alias. The alias has the form
`export type X = import('../relations/<file>.js').X`. One declaration of each type exists, and
it sits under `src/relations/`. The atlas modules keep the alias so that atlas callers import
from the atlas layer.

| Alias file | Names | Declared in |
|---|---|---|
| `src/atlas/types.ts` | `ApproximationBound`, `Counterexample`, `EvidenceTag`, `LimitCharacter`, `Regime`, `RegimeInequality`, `RelationType` | `src/relations/types.ts` |
| `src/atlas/composition-table.ts` | `CompositionResult`, `NoCompositeClaim` | `src/relations/composition-table.ts` |
| `src/atlas/regime.ts` | `RegimeCheck` | `src/relations/regime.ts` |

## Single owners, re-exported

The dependency graph marks these names `reExported`. One file declares each name. A second
file forwards it with `export { … } from`. The report does not list them as duplicates.

| Name | Declared in | Forwarded by |
|---|---|---|
| `COMPOSITION_TABLE`, `composeRelation`, `NO_COMPOSITE_CLAIM` | `src/relations/composition-table.ts` | `src/atlas/composition-table.ts` |
| `regimeHolds` | `src/relations/regime.ts` | `src/atlas/regime.ts` |
| `DimensionMismatchError` | `src/dimensional/errors.ts` | `src/dimensional/algebra.ts` |
| `EngineCapabilityError` | `src/numerical/errors.ts` | `src/numerical/tensor-engine.ts` |
| `DEFAULT_SEARCH_BUDGET` | `src/composition/probe/types.ts` | `src/composition/probe/search-budget.ts` |
| `IDENTITY_BOUND` | `src/atlas/error-algebra.ts` | `src/atlas/path-bound.ts` |
| `BCS_GAP_RATIO`, `M_PROTON_SI` | `src/core/constants.ts` | `src/bridges/index.ts` |
| `evaluateMetricInverse` | `src/numerical/metric-inverse.ts` | `src/numerical/index.ts` |
| `dim` | `src/dimensional/ast-builders.ts` | `src/canonical/entries/_l1-build.ts` |
| `LEAN_SOURCE_TAG` | `src/atlas/physjs-entries.generated.ts` | `src/atlas/physjs-ref.ts` |

`MASS_DENSITY` has one declaration, in `src/dimensional/types.ts`. Bridge modules import it.
They do not assign it again.

## Verification

Regenerate: `repo-tools map <repo> --out=<dir>` · Check: `repo-tools check <repo> --docs=docs/architecture`

| Claim | Value | Source |
|---|---|---|
| totalExports | 3777 | `dependency-graph.json` `statistics.totalExports` |
| totalReExports | 1389 | `dependency-graph.json` `statistics.totalReExports` |

Both claims count the whole repository. The `dependency-graph.json` in the Source column is the output of `repo-tools map`. The committed `docs/architecture/dependency-graph.json` is a different file, which `bun run docs:deps` writes for `src/`.

**Claims the gate cannot hold.** The group counts (12 groups, 2 runtime, 10 type) come from
`duplicate-symbols.json`, which the gate does not read. The verdict of each group comes from a
reading of the source files named above.
