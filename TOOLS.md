# TOOLS.md — the instruments, and how each one lies

The law is `AGENTS.md`. This file answers *what do I run it with* — and, more usefully, **how
each instrument misleads**, because most wrong answers in this repo came from a working tool
pointed at the wrong thing.

## Commands

| Task | Command | Notes |
|---|---|---|
| Install | `bun install` | `--frozen-lockfile` in CI |
| Build | `bun run build` | tsc, emits to `dist/` |
| Test | `bun run test` | the full vitest suite; `pretest` runs `tsc` first. **Never bare `bun test`**: that is Bun's own runner, not vitest. The first run after a reboot pays a cold-start cost of minutes; do not quote that figure as the steady-state cost (it was once used to justify a scoped subset, and the directory the subset skipped is where a defect reached `master`) |
| Scoped test | `bunx vitest run tests/path/to/file.test.ts` | or `-t "name pattern"`; skips the `tsc` pretest; the default for TDD cycles |
| Long accuracy tests | `$env:GL4_LONG='1'; bunx vitest run …` (PowerShell) | GL4/Shapiro sweeps, `it.skip` otherwise; the nightly `long-tests` CI job runs them |
| Smoke | `bun run smoke` | runs `test-example.js` against the built `dist/` (via Node) |
| CLI | `node bin/upt.mjs <cmd>` (or `bun run upt --`) | needs `bun run build` first; reference in `cli/README.md` |
| Dependency graph and doc counts | `bun run docs:deps` | regenerates `docs/architecture/`; the `docs-fresh` CI job fails when it was not run |
| Bench | `bun run bench` / `bun run bench:ci` | vitest bench; baselines in `docs/architecture/benchmarks.md` |
| Audit | `bun audit` | replaces `npm audit` (needs `bun.lock`) |
| Plan-ledger audit | `bun run audit:plans` | audits `ACTIVE.md`; a release gate inside `validate` |
| formalRef axiom gate | `bun run atlas:formal-gate -- --physlib <checkout>` | re-measures `#print axioms` for every `lean4-physlib` formalRef; needs Lean and a built Physlib checkout (`formal/physlib/README.md`), so it is NOT in CI. **Lean exits 0 for a `sorry` proof**; the gate reads the printed axioms, and fails if either control (`HoleProbe`, `ImportedHoleProbe`) does not report `sorryAx` |
| Citation quote check | `bun run atlas:quote-check -- --sources <dir> [--write]` | matches every quoted span and page, equation or section locator of the `// source:` comments against the downloaded sources (`docs/research/phase-1-citation-claims.json` lists each URL and SHA-256). Needs pdftotext, pdftoppm and tesseract (pass their paths with `--pdftotext`, `--pdftoppm`, `--tesseract`), so it is NOT in CI; CI checks the matcher, completeness and the captured output. **A label is not an equation number**: an extractor reads a bibliography number "(4)" or a reference "Eq. (1)" as readily as a label, so a label counts only as the last token of its line, not after "Eq.", within a few lines of an anchor from that equation |
| Criterion 3 export | `bun run atlas:c3-export [-- --copy <dir>]` | writes `docs/research/criterion3/` (corpus, queries, the query key, the freeze and the leakage report). It refuses a tree whose inputs differ from HEAD, so the recorded pin is true. **An id can carry the verdict**: the frozen item ids and file order encode it (items 01-08 valid in 7 of 8 batches), so the queries get opaque ids in a hashed order, and `queries-key.json` is never given to a labeler |
| Criterion 3 conditions | `bun run atlas:c3-run -- --write`, then `bun run atlas:study` | runs text retrieval, symbol matching and typed structural search on the frozen truth sets, after checking every file hash and code blob that Amendment 8 pins. **A structural tier that never fires is invisible in the headline number**: the condition falls back to its tie-break and still scores. The runner therefore reports the key-equality count and what each hit rests on, beside the table |
| Publish | `npm publish --access public` | Mothership's, never this session's. **Do NOT pass `--ignore-scripts`**: `prepublishOnly` runs `npm run validate` (build, typecheck, test, audit:plans, package:check), and that is the packaging gate |

## Instruments

| Tool | Use it for |
|---|---|
| `gh run list` / `gh run view <id> --log` | CI truth. The pre-push gate is **not** CI |
| `git show --numstat <sha>` | proving a change is additive (0 deletions) rather than asserting it |
| `git merge-base --is-ancestor <sha> master` | proving a commit is actually on the branch |
| `#print axioms` (Lean) | what a proof actually rests on. Run a deliberate `sorry` first as a positive control |

## How they lie

- **`tsc` accepting a file is not evidence tree-sitter parsed it.** The pinned
  `tree-sitter-typescript` grammar reports ERROR nodes for `readonly` immediately before an inline
  `import('…').Type`, and for `static [key: string]` on a class. `bun run docs:deps` uses the
  TypeScript compiler and still indexes those files. A code-docs pass that uses tree-sitter drops
  them, so an export count from that pass can omit a file `tsc` and `docs:deps` both see.
  `tests/internal/src-parses.test.ts` is the gate: the scan fails if any file under `src/` has an
  ERROR node, and the paired snippets of those two constructs must still be errors. A scan that
  passes after the grammar starts accepting them is not a control.
- **`bun run docs:deps` reads tracked files only.** A new file is left out of the generated docs
  until it is staged (`git add` or `git add -N`). This is deliberate: an untracked scratch file once
  entered the committed coverage docs. The pre-push hook refuses while the tree differs from HEAD.
- **`pre-push` receives an annotated tag as its TAG-OBJECT sha**, not the commit's. Peel it
  (`git rev-parse <sha>^{commit}`) before comparing it with a commit. The raw comparison once refused every
  release tag.
- **A pipeline returns the LAST command's exit code.** `cmd | tail` reports `tail`. A run with
  failures can report exit 0.
- **An exit code is not an outcome.** `npm view` prints `E404` to STDOUT *and exits 0*.
- **An empty result is not an absence.** Ask whether the query *could* have returned a positive,
  and run a positive control that proves it can.
- **A grep can match your own prose.** If you have been writing the search string while
  discussing the search, you will count your own sentences as data. Classify on **structure**
  (a field value), never on text.
- **A `.jsonl` transcript is NOT written in timestamp order.** Sort by timestamp; never walk by
  line number. Line order as time order has produced a clean, confident, completely wrong result.
- **An impossible value is the instrument reporting its own breakage** — a negative duration, a
  count above the population, a rate over 100%. Halt and check. Never read it as noisy data.
- **A record may not be flushed until after the turn that triggered it.** An event that woke you
  is unreadable in the turn it caused. Absence there is not absence.
- **A timestamp may be stamped at DELIVERY, not at the scheduled moment.** A queued item can
  arrive half an hour late carrying the delivery time, which makes "fired on schedule" and
  "delivered at a boundary" indistinguishable.
- **A status field is not liveness.** A marker file records what something was *told*, not what
  is true now.
- **A published table can contradict its own definition.** Read the source, not a summary. Where
  a row disagrees with the paper's own rule, hold that row to a stated looser tolerance and
  write down why.
- **A local model is right where it must QUOTE and wrong where it must CHOOSE.** Constrained
  fields (labels, enums) are its least reliable output. Require a verbatim quote beside every
  claim, and treat a fabricated quote as a failure of the triage, not as a finding.
- **GitHub code search can miss a QUOTED phrase that exists.** `gh search code '"wave equation"'`
  found no file in Physlib, but Physlib has `WaveEquation/Basic.lean`. The identifier searches
  `WaveEquation` and `planeWave_waveEquation` found the file. Search by identifier, and run a
  known-positive query before you report an absence.
