<!-- repo-map:no-verification -->
<!-- GENERATED FILE -- do not edit by hand.
     Regenerate with `repo-tools map`. -->

# Duplicate Symbols

A name is listed here when two or more distinct files across the monorepo define it. A file that only re-exports the name does not count. Each name carries one tag (see `DupEntryTag`), so the actionable subset is clear:

- `TRUE_DUPLICATE`: a real merge target.
- `DISPATCH_VARIANT`: two or more `mathTyped(...)` registrations of the same public name. The registrations are distinct dispatch surfaces, not copy-paste bodies.
- `ALIAS_DELEGATION`: a `const X = importedY` forward. The entry is excluded once fewer than two real bodies remain.
- `ALLOWLISTED`: the name matches `duplicate-allowlist.json`. Examples are hot-path `is*` guards, mirrors in another language and per-package `VERSION` strings.

> **Note:** This report groups names by OWN definition, not by call graph, then classifies each flagged name (see DupEntryTag): TRUE_DUPLICATE (the actionable merge targets), DISPATCH_VARIANT (>=2 mathTyped(...) registrations of the same public name — distinct dispatch surfaces, not copy-paste bodies), ALIAS_DELEGATION (a const-alias forward to an imported symbol, not an independent body — excluded once fewer than 2 real bodies remain), and ALLOWLISTED (matches duplicate-allowlist.json: for example hot-path is* guards, mirrors in another language, per-package VERSION strings). NOT detected: same-file typed-dispatch overload polymorphism for different argument shapes within one registration — a human still triages TRUE_DUPLICATE entries using the defining files + public flags before merging anything.

## Summary — runtime (function/constant/class)

| Category | Count |
| --- | --: |
| **TRUE_DUPLICATE** (actionable) | 1 |
| DISPATCH_VARIANT | 0 |
| ALIAS_DELEGATION | 0 |
| ALLOWLISTED | 0 |
| _Total flagged names_ | 1 |

## Summary — types (interface/type/enum)

| Category | Count |
| --- | --: |
| **TRUE_DUPLICATE** (actionable) | 10 |
| DISPATCH_VARIANT | 0 |
| ALIAS_DELEGATION | 0 |
| ALLOWLISTED | 0 |
| _Total flagged names_ | 10 |

## Runtime duplicates

### TRUE_DUPLICATE — actionable merge targets

| Name | Category | Defining files (package, public?, sub-tag) | Canonical hint |
| --- | --- | --- | --- |
| `command` | constant | `src/cli/commands/atlas.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/audit.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/axes.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/candidates.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/canonical.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/chain.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/confront.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/connectors.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/coverage.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/derive.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/discover.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/eval.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/evaluate.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/explain.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/frontier.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/ground.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/map.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/metric.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/path.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/predict.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/priority.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/probe.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/recover.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/regime.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/retrieve.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/search.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/symbolic.ts` (unknown, internal, PLAIN)<br>`src/cli/commands/testplan.ts` (unknown, internal, PLAIN) | `internal-only` |

### DISPATCH_VARIANT — distinct public typed-dispatch surfaces

_None._

### ALIAS_DELEGATION — const-alias forwards (not independent bodies)

_None._

### ALLOWLISTED — accepted layering (see duplicate-allowlist.json)

_None._

## Type duplicates (lower priority)

### TRUE_DUPLICATE

| Name | Category | Defining files (package, public?, sub-tag) | Canonical hint |
| --- | --- | --- | --- |
| `ApproximationBound` | interface+type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `CompositionResult` | type | `src/atlas/composition-table.ts` (unknown, public, PLAIN)<br>`src/relations/composition-table.ts` (unknown, internal, PLAIN) | `src/atlas/composition-table.ts` |
| `Counterexample` | interface+type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `EvidenceTag` | type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `LimitCharacter` | type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `NoCompositeClaim` | type | `src/atlas/composition-table.ts` (unknown, public, PLAIN)<br>`src/relations/composition-table.ts` (unknown, internal, PLAIN) | `src/atlas/composition-table.ts` |
| `Regime` | interface+type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `RegimeCheck` | interface+type | `src/atlas/regime.ts` (unknown, public, PLAIN)<br>`src/relations/regime.ts` (unknown, internal, PLAIN) | `src/atlas/regime.ts` |
| `RegimeInequality` | interface+type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |
| `RelationType` | type | `src/atlas/types.ts` (unknown, public, PLAIN)<br>`src/relations/types.ts` (unknown, internal, PLAIN) | `src/atlas/types.ts` |

### DISPATCH_VARIANT

_None._

### ALIAS_DELEGATION

_None._

### ALLOWLISTED

_None._
