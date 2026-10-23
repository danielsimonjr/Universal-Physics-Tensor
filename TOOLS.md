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
| Lean table | `bun run physjs:table` | writes `src/atlas/physjs-entries.generated.ts` from `formal/lean/manifest.json` and `formal/lean/theorem-files.json`. `--check` exits 1 when the committed file differs. `docs-fresh` runs `--check`. The check proves the TypeScript table matches the manifest. It does not prove the manifest describes what `lean/` proves (the Lean index and the `lean` CI job check the names, kinds and axioms), and it does not run Lean |
| README and ROADMAP counts | `bun scripts/readme-status.ts` | rewrites the marked spans in `README.md` and `ROADMAP.md` from the registries and from the generated architecture reports. `--check` exits 1 when a span is stale. `docs-fresh` runs it after `docs:deps`. A span stamped before `docs:deps` records the previous unused-analysis counts |
| Catalog census | `bun scripts/catalog-census.ts` | writes `tests/fixtures/catalog-census.json` (`--write`) from the registries: every count that moves when a bridge is ingested (entries, relations, evaluators, linkage, discovery funnel, formalRef kinds, audit tallies). A test that pins such a count compares its own live derivation to the census field (`tests/helpers/census.ts`), so a catalog change edits one reviewed file. `--check` exits 1 when the committed file differs from a fresh derivation; `docs-fresh` runs it. **The census proves the pins agree with the registries, not that a registry is right**: regenerating it after an ingest accepts whatever the registries now say, so read the diff. The PhysJS reviewed rows, the criterion 3 corpus and the frozen vector file are intended freezes and are not in it |
| CLI reference | `bun scripts/cli-reference.ts` | rewrites `docs/CLI.md` from the command registry. `--check` exits 1 when the file differs; `docs-fresh` runs it. It proves the reference matches the registry, not that a command does what its help says |
| Lean index | `bun scripts/lean-index.ts [--check]` | writes `formal/lean/lean-files.json` and `formal/lean/theorem-files.json` from `lean/`. `--check` also fails when the manifest's toolchain, Mathlib or Physlib is not the lake project's (`lean-toolchain`, `lake-manifest.json`), or a manifest `kind` is not the kind line of the file that declares the theorem; `docs-fresh` runs it. It reads the sources as text, so it does not prove a theorem compiles or what its statement says |
| Lean build | `lake build` (CI job `lake build and axiom audit`) | builds `lean.lean` and every file in `lean/`, with Mathlib's cache; the job's axiom audit fails on `sorryAx`, `Lean.ofReduceBool` or any axiom outside propext, Classical.choice and Quot.sound. **On Windows the build fails before it starts**: the library root `lean` and Lean's own `Lean` are one directory name on a case-insensitive file system, so lake looks for `Lean.Elab.Command` under `.lake/build/lib/lean/Lean/`. Build there in a scratch lake project that copies `lean/` under another root name and rewrites `import lean.` to match; Linux CI is the build of record. The job builds only when a Lean input changed (or nightly); a green skip is not a build |
| Code-docs ratchet | `bun tools/code-docs-ratchet/check.ts --base origin/master` | the `code-docs ratchet (non-required)` CI job, on a pull request and on a push to `master` (against the pushed-over commit); counts MUST doc-comment issues on the changed paths. It does not read `.githooks/code-docs-baseline.txt`. A GitHub merge is a push to `master`, so the merged change is checked against the `master` it replaced |
| Architecture-docs claims | `repo-tools check . --docs=docs/architecture` | the `architecture-docs claims (non-required)` CI job, on a pull request and on a push to `master`, with `@danielsimonjr/repo-tools` pinned in the job's `REPO_TOOLS_VERSION`; the pre-push hook runs the same command through `UPT_REPO_TOOLS`. It compares the claim tables of `docs/architecture/` with the source. **It proves the tables match the parse, not that the prose is true**: a sentence outside a table is not read. The job is not a required check, so a red job does not block a merge |
| Bench | `bun run bench` / `bun run bench:ci` | vitest bench; baselines in `docs/architecture/benchmarks.md` |
| Audit | `bun audit` | replaces `npm audit` (needs `bun.lock`) |
| Plan-ledger audit | `bun run audit:plans` | audits `ACTIVE.md`; a release gate inside `validate` |
| Layer order | `bun run layer:check` | upward edges and cycles in `src/` against `tools/layer-order/allowlist.json`. The quality job runs it; vitest runs the same judge. Fetch `origin/master` first: a missing ref fails, and a missing allowlist file on that commit means this is the introducing change |
| formalRef axiom gate | `bun run atlas:formal-gate -- --physlib <checkout>` | checks every `lean4-physjs` formalRef against `formal/lean/manifest.json` (toolchain, theorem, key, axioms, coverage phrase), and every catalog record's `theorem` and `proofStatus` against it, and does not skip that system; that check does not run Lean. It re-measures `#print axioms` for every `lean4-physlib` formalRef when one exists, which needs Lean and a built Physlib checkout (`formal/physlib/README.md`), so it is NOT in UPT CI. **Lean exits 0 for a `sorry` proof**; the gate reads the printed axioms, and fails if either control (`HoleProbe`, `ImportedHoleProbe`) does not report `sorryAx`. The Lean project is this repository's `lean/`, built by the `lean` CI job; this command does not build it |
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
- **MathTS `1 − chiSquaredCDF` rounds the far upper tail to 0, and so did `gammaincp` before `@danielsimonjr/mathts-functions` 0.68.3.** The distribution `cdf` is built on `1 − P`, so `1 − chiSquaredCDF(200, 5)` is `0` where the tail is 1e-40; `gammaincp` was `1 − gammainc` (`gammaincp(5, 80)` printed `0` where Q is 2.5e-28) and is the direct continued fraction from 0.68.3 (MathTS #365). A p-value of a bad fit IS that tail: read `gammaincp` (≥ 0.68.3), never `1 − cdf`.
- **MathTS `findRoot` stops on the bracket width as well as the residual, unless told not to.** Brent's method returns when `|f(b)| < tol` OR `|b − a| < xtol`, and `xtol` defaults to `tol` (before `@danielsimonjr/mathts-functions` 0.68.3 there was no `xtol`: the one `tol` served both, in whatever units `x` and `f` carry). A residual contract in the units of `f` (the perihelion finder's `tauTolerance`, in dr/dτ) needs `xtol: 0`; a residual of order one (`err/eps − 1`, not `err − eps`) keeps a tiny `eps` from stopping the search early. It evaluates `f` at both ends, so an end at a pole, or at `0/0`, needs pulling in; from 0.68.3 a `NaN` endpoint value throws (before, `NaN · f(b) > 0` was false and the sign check passed).
- **MathTS `quad` accepts a panel below an ABSOLUTE error of 1e-14 by default.** The panel test is `|K − G| ≤ max(tol·|K|, atol)` with `atol` 1e-14, so an SI-scaled integral (a noise power of 1e-13 V²) is accepted at a relative error of order one. `src/cases/quadrature.ts` passes `atol: 0` (`@danielsimonjr/mathts-functions` ≥ 0.68.3; before it, the floor was not an option and the integrand had to be scaled to order one first). `quad` also returns at `maxDepth` without throwing; read `error`.
- **A typed MathTS function on a typed array is an async WASM path.** `dot`, `norm`, `mean` and the special functions take `number[]` synchronously and return a `Promise` for a `Float64Array`; a `Float32Array` is refused outright. The core package's `pairwiseDot`, `norm2`, `pairwiseSum`, `neumaierSum` and `sumSquaredDeviations` take any `ArrayLike<number>` synchronously and are the stable sums. The typed functions also return `unknown`: read the number back with a `typeof` check (`src/numerical/statistics.ts`), never a cast.
- **Summing logs is not "exact enough" for a large binomial.** `Σ ln(n−k+i) − ln i` accumulates a rounding per term, and at n = 10⁵ it is wrong in the ninth decimal of `ln C(n, n/2)`, where `lgamma(n+1) − lgamma(k+1) − lgamma(n−k+1)` is wrong in the eleventh. Judge against the exact integer logarithm (Python `Decimal(math.comb(n, k)).ln()`), never against the other float route; the measured table is in `NOTES.md`.
- **MathTS `symbolicEqual` compared every pair false before `@danielsimonjr/mathts-functions` 0.68.4.** It passed an empty rule list to the simplifier, so `x*y` against `y*x` was false, and a "not equal" from it meant nothing (MathTS #367). From 0.68.4 it simplifies with the default rules. It is the same simplifier `simplify` runs, so it is never a second method for a claim `simplify` already checked; a false from either is an absence of proof, not a proof of difference.
- **MathTS core `Fraction.fromNumber` exceeded its denominator cap before `@danielsimonjr/mathts-core` 0.18.1.** It could return a convergent past the cap it was given; from 0.18.1 the result is at or below it (3.695 at cap 64 is 218/59). Code that rationalises under a stated bound (the clean-prefactor rule, the probe's power-law exponents) still checks the bound itself, which is harmless and catches a regression.
- **MathTS `linearRegression.pValue` and `ols.pValues` were 2·(1 − cdf) before `@danielsimonjr/mathts-functions` 0.68.4,** so a steep slope's tail rounded to 0. From 0.68.4 they are the direct Student-t tail (the steep case is 2.4e-64). Read the direct tail (`composition/probe/t-tail.ts` computes it through `betainc`), never `1 − cdf`.
- **MathTS `ols` refused an SI-scaled design as singular before `@danielsimonjr/mathts-functions` 0.68.4.** It tested the normal matrix's pivots against an absolute 1e-15, so a column of order 1e-9 or 1e-20 was "singular" whatever its conditioning. From 0.68.4 it equilibrates first. The probe still scales its columns before `ols` and `matrixRank`; that is harmless and also conditions the rank.
- **MathTS `linearRegression.stdErr` was NaN on a near-exact fit, and `solveODESystem` with `dt` could take one extra step, before `@danielsimonjr/mathts-functions` 0.68.5.** The residual sum of squares was `syy − slope·sxy`, which cancels on a near-exact fit and goes negative when r rounds a hair above 1, so an exact power law with rounded errors reported NaN (`null` in JSON); `linregress` had the same formula. The fixed-step solver took `ceil(span/dt)` steps and `span/dt` can round a hair above an integer (`[0, 1e-3]` with 1000 steps gave 1002 states). MathTS #371 (released as 0.68.5) sums the residuals and takes exactly n steps when `span/dt` is n up to rounding; UPT's two workarounds (a 4ε `dt` nudge in `rk4Trajectory`, a residual-form fallback in the witness runner) are gone. `rk4Trajectory` still checks the state count, so a regression is refused, not integrated.
- **MathTS `bootstrapCI` and `permutationTest` are unseeded unless given `seed`.** An interval or a p from them differs run to run by default, and a recorded number that cannot be re-derived cannot be audited. Pass the seed and record it beside the number (the link-prediction intervals state seed 20260924 and 10000 resamples). `permutationTest` pools the two samples and re-splits them, so it is an unpaired test even when the samples are paired; state that, and use a paired test (McNemar's exact p) for the paired question.
- **MathTS `louvainCommunities` takes no seed and is a heuristic.** It is deterministic for one input order and not guaranteed optimal. A community is where a drawing may place quantities together: layout, never physics, and never evidence that the quantities belong to one regime.
- **MathTS `betweennessCentrality` returns a Promise, and costs O(n³) on an adjacency matrix.** Brandes' algorithm scans a full matrix row per visited node from every source. An un-awaited call is a Promise, not a ranking. The default `upt map` path does not call it; `--rank-hubs` computes it when asked (51 ms on the catalog's 531 quantities and 219 ms on the combined graph's 692, measured by the graph batch).
- **A pole inside a MathTS `quad` interval does not converge, and does not throw quickly.** The lumped-cooling sign-flipped control put a zero of the cooling rate near 451.5 K inside the inverse-time integral `∫ dT / rate(T)`; `quad` was still subdividing after 300 s. Before integrating a reciprocal, prove the integrand finite on the closed interval; an integrator that hangs is reporting its own breakage.
- **GitHub code search can miss a QUOTED phrase that exists.** `gh search code '"wave equation"'`
  found no file in Physlib, but Physlib has `WaveEquation/Basic.lean`. The identifier searches
  `WaveEquation` and `planeWave_waveEquation` found the file. Search by identifier, and run a
  known-positive query before you report an absence.
