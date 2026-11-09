# `tools/plan-doc-audit`

The release gate audits `ACTIVE.md`. Historical implementation plans are records, not mutable completion ledgers; pass explicit `planRoots` to the library API when auditing them for archaeology/cleanup.

Static-analysis tool that walks every `docs/planning/**/*.md`, extracts code symbols mentioned in each `- [ ]` task line, and reports whether the symbol exists in `src/` as real shipped code (vs. a stub that throws `"Not implemented"`).

The tool exists to prevent **plan-doc rot**: the situation where plan checkboxes silently drift out of sync with the actual codebase — tasks marked unchecked long after the code shipped, or marked done while the implementation is still a stub. This tool catches that drift mechanically.

> Adapted from the `memoryjs` sister repo. The plan-doc location was retrofitted from `docs/superpowers/plans` + `docs/roadmap` to UPT's actual location, `docs/planning/`.

## Why it reads function bodies

The load-bearing lesson: `git grep <symbol>` matches whether a function is real **or just a stub that throws `"Not implemented"`**. A symbol-presence check based purely on grep would misclassify a stub as shipped before its body is actually written. To avoid this, the tool reads a small window around each match and rejects matches whose body contains stub markers. A whole-word match in a comment, a string or a call site is not a definition either. The tool keeps only the lines that declare the symbol: a function, class, interface, type, enum, namespace or variable declaration, or a class method with a body.

This also implies a tight window: a multi-class file like `class A { real() } class B { throw() }` would false-positive A's class-declaration line if the window were too large. The window is currently 3 lines (matched line + 2 lines after), which catches one-line method stubs but does not bleed into adjacent class bodies.

## Symbol extraction is conservative

Only **backtick-quoted** code spans count as candidate symbols. PascalCase identifiers in prose are intentionally ignored because they produce too many false positives.

| Input task line | Extracted symbols |
|---|---|
| `` Implement `RiemannTensorNode` and `inferDimensionForBridge` `` | `RiemannTensorNode`, `inferDimensionForBridge` |
| `` Wire `ricci(g, dg)` into the bridge catalog `` | `ricci` *(catalog is in prose, not in backticks)* |
| `Run tests for the Phase TODO update API code` | *(none)* |
| `` Returns `true` when content matches `string` predicate `` | *(none — both inside-backticks words are in the prose-stop-word list)* |

## Usage

```bash
# Default: dry-run; reports what would be flipped without writing
npm run audit:plans

# Apply: rewrites plan files, flipping `- [ ]` to `- [x]` for tasks
# whose every named symbol is shipped (no stubs, no absent symbols).
npm run audit:plans -- --apply
```

Direct invocation also works:

```bash
bun tools/plan-doc-audit/audit.ts          # dry-run
bun tools/plan-doc-audit/audit.ts --apply  # apply flips
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No flip-eligible items found, or `--apply` succeeded |
| `1` | Flip-eligible items found in `--dry-run` mode (signals work to do) |
| `2` | Execution error (filesystem, git, etc.) |

A non-zero exit in dry-run mode is intentional — it lets CI / pre-commit hooks fail when plan-doc rot is introduced.

## Programmatic API

```typescript
import {
  runAudit,
  auditFile,
  checkSymbol,
  extractSymbols,
  applyFlips,
} from './tools/plan-doc-audit/audit.js';

const { findings, flipsApplied } = runAudit({
  planRoots: ['docs/planning'],  // optional; this is the default
  srcRoot: 'src',
  apply: false,
  cwd: process.cwd(),  // optional; tests pass synthetic root
});

// Each finding describes one `- [ ]` task line:
// {
//   file, line, task,
//   symbols: [{ symbol, status: 'shipped' | 'stub' | 'absent', evidence? }],
//   recommendation: 'flip' | 'leave',
//   reason: 'every-symbol-shipped' | 'has-stub' | 'symbol-absent' | 'no-symbols-extracted',
// }
```

## Design notes

- **Backtick-only extraction** is a deliberate trade-off for low false-positive rate over high recall. A plan author who wants the audit to recognize a symbol must mark it with backticks.
- **Stub detection is line-bounded**, not brace-bounded. Brace-aware parsing would be more accurate but pulls in a TS parser dependency. The tight window covers the common cases (one-line throws, immediate-method stubs); the rare false-positive on multi-class files is preferable to over-marking flippable items.
- **`cwd` parameter** on the public API makes the tool testable against synthetic repos without `process.chdir`, which is unsafe under parallel test workers.
- **No symbols → leave unchecked.** Tasks that don't reference any backtick-quoted code (e.g., "Update CLAUDE.md documentation") cannot be verified mechanically and stay unchecked. This is intentionally conservative — better to leave a real-but-unverifiable task unchecked than to auto-flip something the tool can't confirm.

## Files

- `audit.ts` — CLI + library entrypoint (zero dependencies; Node built-ins only)
- `README.md` — this file
