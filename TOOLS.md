# TOOLS.md — the instruments, and how each one lies

The law is `AGENTS.md`. This file answers *what do I run it with* — and, more usefully, **how
each instrument misleads**, because most wrong answers in this repo came from a working tool
pointed at the wrong thing.

## Commands

| Task | Command | Notes |
|---|---|---|
| Install | `bun install` | `--frozen-lockfile` in CI |
| Build | `bun run build` | tsc, emits to `dist/` |
| Test | `bun run test` | the full vitest suite; `pretest` runs `tsc` first. CI runs `bunx vitest run --coverage` (the probe thresholds in `vitest.config.ts` are the gate); `test:probe-coverage` is the local shortcut for that subset. **Never bare `bun test`**: that is Bun's own runner, not vitest. The first run after a reboot pays a cold-start cost of minutes; do not quote that figure as the steady-state cost (it was once used to justify a scoped subset, and the directory the subset skipped is where a defect reached `master`) |
| Scoped test | `bunx vitest run tests/path/to/file.test.ts` | or `-t "name pattern"`; skips the `tsc` pretest; the default for TDD cycles |
| Long accuracy tests | `$env:GL4_LONG='1'; bunx vitest run …` (PowerShell) | GL4/Shapiro sweeps, `it.skip` otherwise; `GL4_LONG=1` also selects the 10-orbit Mercury drift scope (`tests/helpers/gl4-long.ts`); the nightly `long-tests` CI job runs them |
| Smoke | `bun run smoke` | runs `test-example.js` against the built `dist/` (via Node) |
| CLI | `node bin/upt.mjs <cmd>` (or `bun run upt --`) | needs `bun run build` first; reference in `cli/README.md` |
| Dependency graph and doc counts | `bun run docs:deps` | regenerates `docs/architecture/`; the `docs-fresh` CI job fails when it was not run |
| PhysJS table | `bun run physjs:table` | writes `src/atlas/physjs-entries.generated.ts` from `formal/physjs/manifest.json`. `--check` exits 1 when the committed file differs. `docs-fresh` runs `--check`. The check proves the TypeScript table matches the vendored JSON. It does not prove the JSON matches PhysJS upstream, and it does not run Lean |
| README and ROADMAP counts | `bun scripts/readme-status.ts` | rewrites the marked spans in `README.md` and `ROADMAP.md` from the registries and from the generated architecture reports. `--check` exits 1 when a span is stale. `docs-fresh` runs it after `docs:deps`. A span stamped before `docs:deps` records the previous unused-analysis counts |
| Catalog census | `bun scripts/catalog-census.ts` | writes `tests/fixtures/catalog-census.json` (`--write`) from the registries: every count that moves when a bridge is ingested (entries, relations, evaluators, linkage, discovery funnel, formalRef kinds, audit tallies). A test that pins such a count compares its own live derivation to the census field (`tests/helpers/census.ts`), so a catalog change edits one reviewed file. `--check` exits 1 when the committed file differs from a fresh derivation; `docs-fresh` runs it. **The census proves the pins agree with the registries, not that a registry is right**: regenerating it after an ingest accepts whatever the registries now say, so read the diff. The PhysJS reviewed rows, the criterion 3 corpus and the frozen vector file are intended freezes and are not in it |
| CLI reference | `bun scripts/cli-reference.ts` | rewrites `docs/CLI.md` from the command registry. `--check` exits 1 when the file differs; `docs-fresh` runs it. It proves the reference matches the registry, not that a command does what its help says |
| PhysJS vendoring check | `bun scripts/vendor-physjs.ts --physjs <checkout> --commit <sha> --check` | `docs-fresh` fetches PhysJS at the pinned commit and runs it; a hand edit to any of the three vendored files fails. Needs the PhysJS checkout, so it is not a local gate unless you have one |
| Code-docs ratchet | `bun tools/code-docs-ratchet/check.ts --base origin/master` | the `code-docs ratchet (non-required)` CI job, on a pull request and on a push to `master` (against the pushed-over commit); counts MUST doc-comment issues on the changed paths. It does not read `.githooks/code-docs-baseline.txt`. A GitHub merge is a push to `master`, so the merged change is checked against the `master` it replaced |
| Bench | `bun run bench` / `bun run bench:ci` | vitest bench; baselines in `docs/architecture/benchmarks.md` |
| Audit | `bun audit` | replaces `npm audit` (needs `bun.lock`) |
| Plan-ledger audit | `bun run audit:plans` | audits `ACTIVE.md`; a release gate inside `validate` |
| Layer order | `bun run layer:check` | upward edges and cycles in `src/` against `tools/layer-order/allowlist.json`. The quality job runs it; vitest runs the same judge. Fetch `origin/master` first: a missing ref fails, and a missing allowlist file on that commit means this is the introducing change |
| formalRef axiom gate | `bun run atlas:formal-gate -- --physlib <checkout>` | checks every `lean4-physjs` formalRef against `formal/physjs/manifest.json` (commit, theorem, key, axioms, coverage phrase) and does not skip that system; that check does not run Lean. It re-measures `#print axioms` for every `lean4-physlib` formalRef when one exists, which needs Lean and a built Physlib checkout (`formal/physlib/README.md`), so it is NOT in UPT CI. **Lean exits 0 for a `sorry` proof**; the gate reads the printed axioms, and fails if either control (`HoleProbe`, `ImportedHoleProbe`) does not report `sorryAx`. The Lean project and its `lake` CI belong to PhysJS (`MEMORY.md`); this command does not build that project |
| Citation quote check | `bun run atlas:quote-check -- --sources <dir> [--write]` | matches every quoted span and page, equation or section locator of the `// source:` comments in `docs/research/phase-1-source-comments.txt` against the downloaded sources (`docs/research/phase-1-citation-claims.json` lists each URL and SHA-256). Needs pdftotext, pdftoppm and tesseract (pass their paths with `--pdftotext`, `--pdftoppm`, `--tesseract`), so it is NOT in CI; CI checks the matcher, completeness and the captured output. **A label is not an equation number**: an extractor reads a bibliography number "(4)" or a reference "Eq. (1)" as readily as a label, so a label counts only as the last token of its line, not after "Eq.", within a few lines of an anchor from that equation |
| Criterion 3 export | `bun run atlas:c3-export [-- --copy <dir>]` | writes `docs/research/criterion3/` (corpus, queries, the query key, the freeze and the leakage report). It refuses a tree whose inputs differ from HEAD, so the recorded pin is true. **An id can carry the verdict**: the frozen item ids and file order encode it (items 01-08 valid in 7 of 8 batches), so the queries get opaque ids in a hashed order, and `queries-key.json` is never given to a labeler |
| Criterion 3 conditions | `bun run atlas:c3-run -- --write`, then `bun run atlas:study` | runs text retrieval, symbol matching and typed structural search on the frozen truth sets, after checking every file hash and code blob that Amendment 8 pins. **A structural tier that never fires is invisible in the headline number**: the condition falls back to its tie-break and still scores. The runner therefore reports the key-equality count and what each hit rests on, beside the table |
| Publish | push tag `vX.Y.Z` (`.github/workflows/publish.yml`) | The workflow runs `npm publish --provenance --access public` with `NODE_AUTH_TOKEN` from the Actions secret `NPM`. Mothership's, never this session's: do not publish, and do not push the tag, from an agent session. **Do NOT pass `--ignore-scripts`**: `prepublishOnly` runs `npm run validate` (build, typecheck, test, audit:plans, package:check), and that is the packaging gate. The one suite run is `prepublishOnly` (`npm run validate`: build, `typecheck:tests`, vitest, `audit:plans`, `package:check`) inside `npm publish`; the job refuses the tag when its version (leading `v` removed) is not `package.json`'s version before that |

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
- **`bun run layer:check` is a lexer, not the TypeScript parser.** TypeScript 7 ships no compiler API. The lexer skips comments, strings, and template text. It does not see a dynamic `import()` whose argument is not a quoted string, and a word `import` inside a regular expression can look like an import. It does not scan `tests/`. It does not rewrite `docs/architecture/`. The shrink comparison is skipped when `tools/layer-order/allowlist.json` is absent from `origin/master`; a missing `origin/master` ref is a failure, not a pass.
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
