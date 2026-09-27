# NOTES.md — stateful (everything here carries an "as of" and is EXPECTED to go stale)

The law is `AGENTS.md`. **This file exists so that status never has to be written into a design
document.** If you are about to put MET / UNMET / a current count / a date into
`docs/planning/*`, it belongs here instead.

Rewrite freely. A stale line here is normal. A stale line in a design doc is a defect, because
nothing validates prose and the next reader cannot tell.

---

## As of 2026-09-27

- **CLI applied-physics audit** (`docs/audit/Universal_Physics_Tensor_CLI_Audit.md`): all 14 §11
  findings are fixed (F10 was already correct and is now pinned by a test). Of the §14 improvements,
  I5–I9, I11, I12 and I14–I20 have landed; the limits each still has are in `todo.md`. I2 is open:
  it needs a reviewed widening of the composition table and is Mothership's call; a proposal is in
  `docs/planning/ADR-proposal-transported-norm-composition.md`.
- `confront` data handling: preprocessing recorded for 17 of 19 records, not recorded for 2 (be-37,
  be-58). Independence: 10 no fitted parameter, 5 share an input (be-36, be-51, be-58, be-61, be-65),
  4 not recorded (be-48, be-52, be-56, be-64). be-61's observed Lorenz number is the predicted
  constant by construction, so that record cannot show a discrepancy (negative result).
- **Fixed defect, scope corrected:** the consistency "gap" `confront` printed was the agreement bound,
  not the observed−predicted difference, for **9 of 11** consistency records (be-55, 56, 59, 60, 61,
  62, 63, 64, 65), not the six first recorded here; be-55/59/60 were hidden by rounding to 0.0%. Now
  the actual difference is printed beside the bound: 0 for be-11/55/56/59/60/61/64, −0.787% be-62,
  −7.27% be-63, −43.7% be-65, +25.7% be-21; every bounded record is compatible. No pinned number
  changed. be-65's ±150% bound accepts any observed value from 0 to 4.44 M_⊙: its low side cannot
  fail (negative result about the record).
- Atlas equation links: 9 of 24 atlas models record a canonical equation (`model-pendulum` and
  `model-dalembert` added, each by a numeric check). `model-rlc` against CE-lc-resonance fails the
  check (2% off at ζ = 0.2). `CanonicalEquation.model` stays unset because criterion 3 freezes the
  `src/canonical` tree. That tree already differs from `freeze.json`'s recorded tree hash since
  `dbd4e95` (Amendment 9's residual form), then #202 and #208; the eight pinned code blobs still match.
- Observable translations: `ab-pendulum-linear` declares phase and position; `ab-spring-lc` declares
  a phase carriage. Every other bridge answers UNDETERMINED outside its bound's own norm.
- `map --all-routes`: no ordered model pair has more than one simple route under `upt path`'s traversal
  (exact equivalence both ways, other relations forward, multi-premise bridges not followed). The
  undirected graph has two cycles (through `ab-stokes-einstein` and `ab-kg-schrodinger`); the
  traversal rules exclude both second routes (negative result).
- `--record`/`--replay`: `eval 'ln(x)' x=-1` fails with different stderr under the builtin and MathTS
  parsers, so a recorded failure does not reproduce across a parser change (negative result).
- `case-lumped-cooling`: at the textbook limit Bi = 0.1 the lumped temperature excess is 5.5% below
  the heat-equation mean at t = τ and 16% below at 3τ; Bi ≤ 0.1 does not bound the late-time relative
  error (negative result). `case-kepler-rv`'s double-pulsar agreement is consistency with a GR-fitted
  timing solution, not an independent test.
- `probe study` large-amplitude control: the fitted θ² coefficient is 0.068, not the series' 1/16,
  because the θ⁴ term is not admitted and is absorbed; it is not a recovery of the series coefficient.
- `discover --require-falsifier` hides **49 of 49** promising rows on `--source=canonical` and 4 of 7
  on the catalog: no independent falsifier ran and survived on them (negative result).
- `confront` by statistic: 6 σ-residual tests, 2 limits and 11 consistency ratios (no σ). The
  ratios are not precision tests and are never counted as such.
- `atlas --run`: 17 of the 20 atlas bridges have an entry in `WITNESS_REGISTRY` and can run
  witnesses in-process. `ab-pendulum-linear` is one of the three without, so `--run` on it reports
  "none" rather than a pass.
- F02 as measured on `discover --source=canonical`: 49 promising, 0 mechanism-tested, 0 data-tested,
  49 without magnitude evidence, 49 with the axis unresolved, 0 with an entailed consequence.
  So nothing in the promising set is evidence yet (negative result).
- Persona W7 (Landauer `ln(2)` in `map --equation`) is **still open**. F03 fixed `ln` in the formula
  parsers, but the equation compare goes through `evalExpr`, which still rejects `transcendental`.

## As of 2026-09-26

- **CLI applied-physicist persona retest on 0.47.1 after the fix batch** (model persona, not a human
  reviewer): findings in `docs/research/cli-physicist-persona-0.47.1-post-fix.md`. Prior W1–Q2 still
  hold. New open triage: W4 (Kepler/Schwarzschild monomial constants→1), W5 (Planck all-constant
  RHS refused), W6 (`a`→perihelion not acceleration), W7 (Landauer `ln(2)` vs `ln2`), L5–L8, Q3–Q4,
  I5–I8. No code change in that pass; Mothership to triage.
- **CLI applied-physicist persona pass on 0.47.1** (model persona, not a human reviewer): findings in
  `docs/research/cli-physicist-persona-0.47.1.md`. W1–W3, L1–L4, Q1–Q2, I1–I4 fixed in the patch
  batch on `cursor/persona-cli-fixes-b6c5` (dispositions in that note).

## As of 2026-09-23

### Phase exit criteria — kept separate from "tasks landed"

- **UPT is DONE** (owner, 2026-09-24; pre-registration Amendment 12): every §7 criterion is measured
  and reported. Criteria 2 and 3 are NOT MET, and they are the study's findings. Hybrid retrieval is
  future work (ROADMAP §8).

Those are different claims and merging them produces a false green.

- **Phase 4.** ≥ 20 bridges across ≥ 5 relation types: **met**, 20 bridges and 6 types.
  Zero `formally-proved` without a `formalRef`: **met by construction**. ≥ 5 bridges with a
  reviewed `formalRef`: **1 of 5, DEFERRED by the owner on 2026-09-24** (pre-registration
  Amendment 10); it no longer blocks DONE. The one counterpart is in Physlib
  (`ab-pendulum-linear`). No further checked counterpart exists in Physlib, Mathlib or the other
  systems searched (`docs/research/phase-4-formalref-scoping.md`). The PhysJS proofs are deferred
  with it.
- **Phase 5.** The frozen set is **no longer empty**: 125 frozen and 3 contested items, all
  MODEL-authored and MODEL-rated (`claude-fable-5-1`, pre-registration Amendment 2). Model-rater
  kappa: **0.984** valid/invalid, **0.978** nine-category. That is agreement between two
  instances of ONE model, not human inter-rater reliability.
- **Phase 6.** The study success path has **run once** on the non-empty set. It exposed two
  defects, both fixed: the validator rejected every "x = 0", and the atlas condition accepted items
  that no instrument had checked. Result: the atlas rejects **6 of 61** invalid items, all with the
  right failure kind, abstains on **116 of 125**, **1** wrong accept and **1** false reject.
  **Criterion 2 (atlas vs the best LOCAL LLM, Amendment 4): NOT MET, and it stands as measured (no
  re-run; Mothership, 2026-09-24).** qwen3.8:27b rejected 51/61
  invalid items against the atlas's 6/61; the interval for the difference is −73.8%
  [−82.7%, −58.7%]. The atlas made 1 wrong accept against 9–13 for the models, by abstaining on
  116/125. gemma4:26b returned empty answers
  on 64/125 items under the frozen 8,192-token context.
- **Criterion 3 (recall@10, typed structural search vs embeddings): NOT MET** (2026-09-24,
  pre-registration Amendment 11). On PRIMARY (n = 50), the embedding condition (qwen3-embedding:4b,
  frozen vectors) scored 49/50 = 98.0% [89.5%, 99.6%] and 30/30 in-distribution. The typed structural
  search's interval, [14.3%, 37.4%], does not lie above 98.0%. A second embedding pass gave the same
  49/50, with no query crossing the depth cut (min cosine 0.9972). Result:
  `docs/research/criterion3/results-embedding.md`. Before that, as INTERIM (Amendment 8), the in-process conditions ran on PRIMARY (n = 50, MODEL
  labels): text retrieval 34/50 = 68.0% [54.2%, 79.2%]; symbol matching and typed structural search
  both 12/50 = 24.0% [14.3%, 37.4%], and 0/30 on the in-distribution families. The typed structural
  tier never fired (0 of 11,125 key equalities): 123/125 queries are `lhs − rhs` residuals and the
  corpus stores right-hand sides. Every expression-condition hit is fluid statics, sharing only `g`
  (one hit is an id tie-break). The embedding condition waits for LLMBench
  (`docs/research/atlas-study-results.md`).
  EXPLORATORY, post hoc (Amendment 9): with the corpus in residual form, `target − scalarAst`, typed
  structural search is still 12/50 = 24.0% on PRIMARY and 0/30 in-distribution. The keys now match in
  4 of 11,125 pairs, and all 4 are correct references. The remaining misses are real formula
  differences, not a representation mismatch. It never replaces the criterion.
- **Baseline construction (from that run):** a reasoning model needs a context that holds its
  reasoning AND its answer. With `num_ctx` 8192, gemma4:26b's reasoning filled the context on 64/125
  items and left the answer empty. Size the context per model before freezing a baseline config.
- **Owner decisions (2026-09-23):** exported atlas data is CC BY 4.0 (`LICENSE-DATA`) and the code
  stays MIT; one maintainer across all families, by choice; no hosted frontier-LLM run (Amendment
  5); reviewer time is not measured, because there are no independent human reviewers.
- **Amended 2026-09-23 by Mothership under the owner's delegation** (pre-registration Amendment 6,
  ROADMAP §7): the reported κ is MODEL agreement and human κ is NOT MEASURED; criterion 5 (practical
  value, human time and error rate) is NOT MEASURED; per-bridge curation cost (Phases 0 and 4,
  criterion 6) is NOT MEASURED, and the reported cost is the MODEL cost, USD 19.34 for the set, about
  USD 0.15 per authored item. These are amendments, not met criteria.
- **Phase 0 independent physicist review: AMENDED 2026-09-24** (pre-registration Amendment 7). NOT
  MEASURED (no human reviewer). A model-persona review (Fable) returned 13 findings; 9 are fixed with
  tests and 4 stand with evidence (`docs/research/phase-0-model-persona-review.md`).

### Separate from the criteria above

- **Uniformity.** `ApproximationBound.uniformity` is required (`readonly string[] | null`).
  `boundPath` returns `uniformity-unanalysed` and no number when any bound on the path has
  `null` or `[]`. Construction does not throw. `propagateUncertainty` does not implement this
  gate.
- **Architecture-docs gate in CI: decided, not pending** (owner, relayed by Mothership 2026-09-23). No
  credential, no publish, no copy of the private `skills` tooling. The gate stays in the pre-push hook.
  The architecture docs are updated by hand from the data of this repository's own
  `tools/create-dependency-graph`, until `repo-tools` replaces that tool.
- **Still not startable here:** an independent physicist review; per-bridge person-hours (the logs are per agent / per batch); embeddings (no worker);
  a separate data licence (owner decision).
- **Standing physicist-review surfaces** (moved from `docs/architecture/OVERVIEW.md` on 2026-09-23;
  not re-checked then): the CONTRIBUTING.md tasks; the contested BE-44/46/50 adjudications; the
  C2/C3 calibration targets; the CI-1/CI-2 dynamic-scaling call; and the §XXVII-B adjudication of the
  Part-XI machine-derived proposals.
- **Composition table** remains 56 silent cells. Widening was not done.
- **`8 → 12`** direction is unresolved. The poster records it as one approximation, `d-8-to-12`.

### Results

- **Every registered witness has a negative control:** 14 numeric and 4 CAS. Of the 12 controls
  written on 2026-09-22, the **9 numeric** wrong hypotheses are **REFUTED** and the **3 CAS** ones
  are **UNRESOLVED, not refuted**. The simplifier cannot reduce `lhs − rhs` to zero, so those
  assert only "not checked". **Never merge those two counts.**
- **Link prediction is NEGATIVE.** Over 20 leave-one-bridge-out trials, text overlap **beats** the
  typed-graph predictor on both recall@10 (0.80 vs 0.70) and MRR (0.42 vs 0.28). This is a result
  and it is reported as one, not softened and not re-run looking for a better answer.

### Open defects and unknowns

- **The pre-push gate did not run for the `cd4f0d5` push (2026-09-24).** `core.hooksPath` was found
  set to the absolute `.git\hooks`, which holds only sample hooks. The repo's `prepare` script sets
  `.githooks`. `.git/config` was last written at 14:02:16. At 14:02 a security-guidance plugin review
  created a worktree (`agent-a98a8f4aee09f8ec6`). **The mechanism is unproven:** other repos with
  Claude-created worktrees still read `.githooks`, and Mothership is investigating. The setting is
  restored. The checks that CI does not run passed on `cd4f0d5`: `repo_map` exit 0, and code-docs
  154, equal to the baseline. The stale worktree and its merged branch were removed.
- A **flaky test WAS captured failing** on 2026-09-23 19:50, in the pre-push gate for `e1b7bea`
  (a docs-only commit): `tests/composition/probe/coverage-backfill.test.ts > backend nonzero exit +
  store illegal transition > reports worker stderr on nonzero exit`, `AssertionError: expected 'worker
  timed out after 1000ms' to match /exited 2/` (line 464). The test gives `runBackendWorker` a
  1000 ms budget to spawn `node -e "process.exit(2)"`; the budget includes process start-up, and a bare
  spawn of that command measured 843–4307 ms on the loaded host at the time. It was a wall-clock race by
  design. Whether it is the flaky test seen before is unknown. **Race removed** in the item-1 fix (see
  `CHANGELOG.md`): the test now drives a fake worker with no clock; five real-worker siblings in the
  same race class use a named 30 s hang guard. A real-process test can still lose to a start-up
  longer than that guard.
- **Sprint 0 closure: moot** (2026-09-25). UPT is DONE under Amendment 12, so its wrap checklist no
  longer gates anything. The original note, kept for the record: The Phase 0 curation-cost log said on 2026-09-20 that Sprint
  0 was not closed: `docs-fresh` was red and the wrap checklist was incomplete. `docs-fresh` was
  green on every push checked on 2026-09-22; the wrap checklist has not been re-checked.

### Measured facts about the tree (moved from `CLAUDE.md`; re-measure before quoting)

- **Lines of code (whole repository):** 135,606, from `repo_map` `totalLinesOfCode`, measured
  2026-09-23 at `67caf85`. Not gated; see `docs/architecture/OVERVIEW.md`.
- **Toolchain:** TypeScript `^7.0.2` (verified 2026-09-22). The full suite ran 4,659 tests at
  `cbf2e40` (2026-09-22); it took about 58 s warm when measured on 2026-09-21.
- **Bridge catalog** (measured 2026-09-21 from the built registries): 55 bridges, IDs 11–65, which
  project to 41 composition-graph edges. 13 are AST-less (BE-51, 52, 55…65), and 17 have no graph
  edge (BE-28, 29, 32, 35, 40, 44, 55…65). `upt map` finds 23 connected components: one anchored
  cluster of 16, two small clusters, and 20 isolated bridges. Status distribution (re-tallied
  2026-07-05): 19 established, 33 speculative, 3 highly speculative, 0 invalid.
- **Axes:** `RegimeAttributes` carries six axes (scale, force, information, symmetry, topology,
  statistics). `GATE_AXES` is scale and force; topology, symmetry and statistics are typed and
  wired but ungated, for thin coverage.
- **CLI:** the `upt` CLI (23 data-bearing commands + `help`/`version`).
- **Atlas families:** oscillators 9 models, 5 bridges, 1 rejection; diffusion 8 models, 8 bridges;
  waves 7 models, 7 bridges.
- **Atlas import sites** (measured 2026-09-22): value imports at `bridges/index.ts:40`
  (`deriveRegimeGroups`), `composition/compose.ts:46-47` (`composition-table`, `conventions`) and
  `composition/graph-viz.ts:28` (`derive-evidence`); type-only imports from `atlas/types.ts` at
  `bridges/index.ts:36`, `composition/compose.ts:48`, `composition/edge.ts:24`, `graph-viz.ts:24`
  and `uncertainty.ts:25`.
  `docs:deps` reports 0 circular dependencies.
- **Dependabot PRs against the lockfile problem** described in `MEMORY.md` (Stack): #177–181 are CLOSED, and
  `gh pr list --state open` shows 0 open PRs (checked 2026-09-25).

