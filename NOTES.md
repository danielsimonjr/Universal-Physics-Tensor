# NOTES.md — stateful (everything here carries an "as of" and is EXPECTED to go stale)

The law is `AGENTS.md`. **This file exists so that status never has to be written into a design
document.** If you are about to put MET / UNMET / a current count / a date into
`docs/planning/*`, it belongs here instead.

Rewrite freely. A stale line here is normal. A stale line in a design doc is a defect, because
nothing validates prose and the next reader cannot tell.

---

## As of 2026-09-29

- **MathTS optional peers, 2026-09-29.** Ranges match `npm view`: autograd 0.3.15, core 0.15.5,
  expression 0.8.2, functions 0.65.0, matrix 0.7.5, parallel 0.6.7, tensor 0.2.21, wasm 0.3.0,
  workerpool 0.2.6. Still optional peers. The packages themselves were not republished.
- **Tier 10, as of 2026-09-29.** Daniel approved the §11 defaults in
  `docs/design/tier-10-cross-family-path.md`. M1 is in: `upt path` labels `crossFamily` and
  `modelFamilies` from the models the route visits, and `fromModelFamily` / `toModelFamily` on
  each JSON step. The filing family stays `family`. The sentence that composition rules are the
  same as within one family is gone. No new refusal. `ab-kg-schrodinger`'s bound is the bridge's
  own. M2 (vocabulary gate), M3 (regime conjunction) and M4 (help text) are not started. The
  composition table is unchanged.
- **`upt probe scan` gaps, measured 2026-09-29.** 6 searchable prediction-residual gaps, one per
  applied case. `--all` lists 232 Product A wrappers (216 relation-link, 16 regime-transition),
  none of those searchable. Combined list 238.
- **Tree-sitter.** `src/cli/commands/path.ts` and `src/numerical/mathts-tensor.ambient.d.ts` parsed
  with ERROR nodes under tree-sitter-typescript 0.23.2 and compiled under tsc. Both rewritten.
  The scan in `tests/internal/src-parses.test.ts` is green, and the two old constructs still error.
- **CLI dogfood open items, after the owner unfroze `src/canonical`:** `upt metric` (alias
  `curvature`) reports Christoffel, Ricci, the Ricci scalar and the Kretschmann scalar for
  Minkowski, Schwarzschild, FLRW and Kerr. The line element and the canonical Einstein-equation
  metric node are both (−,+,+,+). Schwarzschild Kretschmann is checked against
  `48 G² M² / (c⁴ r⁶)`. `--geodesic` integrates a short Schwarzschild circular orbit and a Kerr
  geodesic. θ = π/2 is an equatorial circular orbit. Any other θ is an inclined spherical orbit
  whose polar turning point is that θ. Initial data use the Carter constant. The integrator is
  the second-order geodesic equation. ISCO radii, the equatorial photon sphere, and a spherical
  photon orbit between those radii are checked. a = 0 matches a Schwarzschild geodesic.
  `--natural` sets ħ = c = 1 and `--geometrized` also sets G = 1; the SI default still refuses
  `rest_energy = mass`. Flat `CE-friedmann` is `H² = 8πGρ/3`. `CE-friedmann-curvature` is
  `H² = 8πGρ/3 − k c²/a²`. `1Msun` is `M_SUN_SI = 1.989e30` kg. `GM_sun` is `GM_SUN_SI` and
  `Msun_iau` is `GM_SUN_SI/G_SI`, both registered constants. `HBAR_SI` is `H_SI/(2π)`. The
  CODATA display `1.054571817e-34` is smaller by a relative `6.127e-10`. Planck-unit constants
  stay the published CODATA 2018 values. The Einstein 8π is in the scalar AST. Reduced Compton
  is `CE-compton-wavelength` with sourced prefactor 1; `CE-compton-wavelength-full` is
  λ = h/(m c). The registry has 109 entries. The criterion 3 live export matches that registry.
  Amendment 8 still hashes the labelled corpus at `c144150` (107 records, 89 expressions). The
  study runner still refuses a tree that does not match Amendment 8, which is the closed study.
  `upt eval --show-parser` prints `mathts` or `builtin`; `upt version` stays a bare semver.
- **CLI GR/QFT dogfood** (model persona, not a human reviewer): the findings report is the PR
  description for `cursor/gr-cli-dogfood-91ec`.
  Fixed in that branch: perihelion `6pi` now compares; Newton's `m_1 m_2` compares when every
  same-dimension assignment agrees; `schwarzschild-radius` reaches the frozen target `radius`;
  `sqrt(-1)` says complex; a bare `e` is warned as Euler's number; be-51/be-52 warn inside 10 r_s.
  The leftovers named in that report are closed in the open-items paragraph above.

## As of 2026-09-27

- **CLI applied-physics audit** (`docs/audit/Universal_Physics_Tensor_CLI_Audit.md`): all 14 §11
  findings are fixed (F10 was already correct and is now pinned by a test). All 20 §14 improvements
  have landed: audit I1 through F01, and the open parts of audit I3, I4, I10 and I13 on 2026-09-27.
  Landed is not limit-free; the limits each still has are in `todo.md`. Audit I2 landed by owner
  decision 2026-09-27 (`docs/planning/ADR-transported-norm-composition.md`, option 4).
- **Audit I2 as landed:** the composition table has 9 defined cells and 55 silent ones; the widened
  cell is approximation then exact-equivalence, and exact then approximation stays silent. One norm
  transport is declared: `nt-spring-lc-relative-period` on `ab-spring-lc` (model-spring → model-lc,
  K = 1), with witness W1τ (checked; fine error 7.1e-11, refinement ratio 256). `upt path
  model-pendulum model-lc --at theta0=0.2 T0=1 t=10` now composes K = 1 · delta = 0.0158525 in
  relative period error; the point bound 0.0025057 agrees with the series θ0²/16 + 11θ0⁴/3072 to
  1.5e-8. Composite evidence of that route: `contradicted`, with numerically-supported and proposed
  undecided until its witnesses are run (`contradicted` comes from the parts' stored counterexamples).
  **Negative result:** `ab-heat-diffusion` declares no transport, so model-telegraph → model-heat
  still refuses as `norm-not-stated`; a declaration needs its own witness for the model-fick →
  model-heat direction and a horizon restatement through D = κ/(ρc_p), and neither exists. Absolute
  period and trajectory norms have no declaration and stay refused through `ab-spring-lc`.
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
- `confront` compatibility decisions: all 11 consistency records now make one (2026-09-27). be-11 takes
  its module's 15% tolerance as the bound; be-21 is decided by observed ≥ 1/(4π), a one-sided lower-limit
  rule. Both are compatible. be-11's decision cannot fail on this record: its observed slot is the
  source's stated agreement, encoded as ratio 1, so the difference is 0 by construction (negative result,
  as for be-61). be-21's decision does not rest on the representative 0.10: the extraction band's
  lower edge, 0.08, is also above the bound, by 0.53%.
- Atlas equation links: 9 of 24 atlas models record a canonical equation. All 12 recorded links are
  checked numerically from the model (the eight older ones on 2026-09-27, plus `model-lc` →
  CE-capacitor-energy, new), and the unchecked-link ratchet list is empty. The 15 models without a
  link each state a reason (`NO_LINK_REASONS`). Four reasons are shown by a failing check:
  - `model-rlc` against CE-lc-resonance is 2% off at ζ = 0.2, and so is `model-damped-spring`
    against CE-simple-harmonic-frequency;
  - `model-cubic-spring` fails at βx0²/k = 0.1;
  - `model-klein-gordon` fails against CE-wave-speed, with a phase velocity ≠ c.

  Negative results:
  - `model-stokes-drag`'s check is a transcription of a closed-form law;
  - CE-inductor-energy has no sourced ½, so `model-lc` cannot link it yet;
  - CE-sound-speed's √γ is not used by `compareWithCanonical`, which cannot bind γ.

  `CanonicalEquation.model` stays unset. The live criterion 3 export was re-pinned when the owner
  unfroze `src/canonical`. Amendment 8 still hashes the labelled corpus at `c144150`. The study's
  pinned code blobs still match; the study runner still refuses a tree that is not that corpus.
- Observable translations: `ab-pendulum-linear` declares phase and position; `ab-spring-lc` declares
  a phase carriage. Every other bridge answers UNDETERMINED outside its bound's own norm.
  As of 2026-09-27 (audit I8 limits):
  - The position bound's Fourier-series premise is checked against RK4 over one period at θ0 ∈ {0.01,
    0.1, 0.2, 0.3, 0.4, 0.5} (W7xs, 1e-9 rad). It is not derived, and not checked between those points.
  - The phase point witness is now run down to a drift of 1e-4 rad in 512 T0 (θ0 ≈ 7.0e-4; it was 0.01
    rad, θ0 ≈ 0.007), at a tolerance of 5e-8 relative (it was 1e-5).
  - Its (1+ε) control can be refuted only where ε/(1+ε) exceeds that tolerance, so it cannot fail below
    θ0 ≈ 9e-4 (it was 0.013; measured: not refuted at 8.5e-4, refuted at 9e-4; not run at 6.9e-4, run at
    7.1e-4). That floor is inherent: the wrong map and the declared one differ by ε
    relative, so no witness of finite precision separates them as θ0 → 0 (negative result).
  - No other translation or carriage was added. `ab-spring-lc` would need a position carriage from
    angle to charge with a declared amplitude scale, and none is derived. No other bridge's bound has a
    derived map into another observable.
- `map --all-routes`: no ordered model pair has more than one simple route under `upt path`'s traversal
  (exact equivalence both ways, other relations forward, multi-premise bridges not followed). The
  undirected graph has two cycles (through `ab-stokes-einstein` and `ab-kg-schrodinger`); the
  traversal rules exclude both second routes (negative result).
- `--record`/`--replay`: `eval 'ln(x)' x=-1` fails with different stderr under the builtin and MathTS
  parsers, so a recorded failure does not reproduce across a parser change (negative result).
- `--record`/`--replay` (2026-09-27, audit I17 limits): `map --out`, the probe subverbs and `--stored`
  now replay under stated rules (`docs/planning/Experiment-Record-Replay-Design-Note.md`). An entry
  hashes its command's loaded modules: 34 for `evaluate`, 48 for `eval` (about 3–4.5 kB of an entry of
  about 13 kB). A probe search under the default 5 s budget gave identical output on two runs.
  `--budget-ms=1` is not a reliable stop: `Date.now()` does not move inside a millisecond, and on
  2026-09-29 a replay of that pendulum search finished as `exhausted-space` and was called
  reproduced. The clock is `performance.now()` now; a 1 µs cap states `time-limit`. Per-entry attribution is not
  done and cannot be derived from the import graph (negative result).
- `case-lumped-cooling`: at the textbook limit Bi = 0.1 the lumped temperature excess is 5.5% below
  the heat-equation mean at t = τ and 16% below at 3τ; Bi ≤ 0.1 does not bound the late-time relative
  error (negative result). `case-kepler-rv`'s double-pulsar agreement is consistency with a GR-fitted
  timing solution, not an independent test.
- `case-lumped-cooling` with radiation kept (2026-09-27, audit I20 limit): for the 1 cm oxidized steel
  ball at 1000 K in still air (the linear-loss failure example), T_radiating_K = 711.2 K after 60 s,
  against Newton's 929.8 K, at Bi_radiating = 0.0020. For the valid copper example the two differ
  by 0.53 K of a 28 K excess (1.9%; h_rad/h ≈ 0.021). Still refused, not evaluated: hydrodynamic
  memory near a wall, the parallel lubrication limit and the anomalous skin effect. The Faxén terms
  past 9/16 are still quoted and not checked. The atlas has no EM, thermal or astrophysical family:
  none of those cases has a derived bound (reasons in `todo.md`, I20).
- `probe study` large-amplitude control: the fitted θ² coefficient is 0.068, not the series' 1/16,
  because the θ⁴ term is not admitted and is absorbed; it is not a recovery of the series coefficient.
- `probe study` (2026-09-27, audit I19 limits): the synthetic physical-pendulum control
  (`pendulum-physical`, both families declared knowing the law) admits amplitude² and bob_ratio², fitted
  0.0674 and 0.214 (series 1/16 and 1/5; θ⁴ and ρ⁴ not admitted), and survives its holdout (χ² = 8.12
  on ν = 5, p = 0.15). Either family alone finds no credible candidate. Over 2000 honest re-measurements
  (7 pairs, α = 0.2) the identity test flags 9.65% and the affine test 9.70%, against α/2 = 10%; either
  flags 14.35%, so the combined false-flag rate is below α, not α/2. No shipped fixture's
  replication rows share inputs with its study rows, so none of them is tested for closeness.
- `discover --require-falsifier` hides **49 of 49** promising rows on `--source=canonical` and 4 of 7
  on the catalog: no independent falsifier ran and survived on them (negative result).
- `confront` by statistic: 6 σ-residual tests, 2 limits and 11 consistency ratios (no σ). The
  ratios are not precision tests and are never counted as such.
- `atlas --run`: all 20 atlas bridges have an entry in `WITNESS_REGISTRY` and run witnesses
  in-process (2026-09-27; it was 17 of 20). The three added are executable specs of W7
  (`ab-pendulum-linear`, RK4 T/T0 at θ0 = 0.2, matches AGM to 3.5e-13), W8b (`ab-damped-massless`,
  RK4 offset 0.0574 at m = 0.01 against the bound's 0.12, matches the closed form to 2e-9) and W9
  (`ab-chain-wave`, integrated ring, 1 − ω/(cq) over (qa)²/24 = 0.99952 at N = 32). 22 witness
  results, all checked. Negative results: `ab-damped-massless`'s bound is not sharp (5.7× loose at
  its sup), so W8b is attributed as `bound-holds-at` one point, not as the bound's value; `ab-chain-wave`
  has no bound, so W9 is attributed to a preserved property, not to a bound.
- Atlas-wide evidence (`upt atlas --evidence --stored`, 2026-09-27): of 20 bridges, 17 derive
  numerically-supported and 3 leave it undecided (their numeric witnesses have no in-process runner:
  ab-spring-lc, ab-damped-rlc, ab-stokes-einstein); 4 symbolically-checked; 1 formally-proved; 12
  contradicted (from their stored counterexamples, outside the regime); 0 empirically-supported. 21 of 40
  recorded bridge witnesses have a stored result, all checked; 19 have none. With no results source,
  proposed is undecided on 8 bridges.
- F02 as measured on `discover --source=canonical`: 49 promising, 0 mechanism-tested, 0 data-tested,
  49 without magnitude evidence, 49 with the axis unresolved, 0 with an entailed consequence.
  So nothing in the promising set is evidence yet (negative result).
- Persona W7 (Landauer `ln(2)` in `map --equation`) is **fixed**: the equation compare evaluates with
  the active formula parser, so `ln(2)` agrees with CE-landauer, and the catalog target
  `landauer-erasure-energy` reaches CE-landauer through BE-16, which CE-landauer records that it
  restates. Before the fix, `evalExpr` rejected `transcendental`, and the target names never met.
- **Persona retest (post-fix note), dispositions** (dispositions per item in `todo.md`, Active queue):
  - Eight monomial-only canonical entries hold a governing constant. Before the fix, three of them gave
    a wrong prefactor verdict: CE-kepler-third (factor 122404), CE-schwarzschild-radius (7.426e-28)
    and CE-einstein-field-eq. The persona asked whether it was two. Kepler III and the Schwarzschild
    radius now agree at ratio 1, and a halved prefactor reads 0.5 with exit 3.
  - The EFE is now prefactor-unchecked: its 8π sits only in its field equation, and `src/canonical`
    is frozen (negative result).
  - The Planck length, mass and time now compare at the SI constant values, with prefactor 1 sourced.
    An all-constant comparison checks the value, not the form (limit).
  - CE-compton-wavelength stays prefactor-unchecked: it writes ħ/(mc), the reduced Compton wavelength.
  - Persona W6 is disclosed, not refused: `unruh_temperature = hbar*a/(2*pi*k_B*c)` still binds `a` to
    the length `a` and prints RHS [T^2 Theta], and now says so. `sigma` is pointed to `sigma_sb`, not
    aliased.
  - Q4 (`discover` ordering) is not changed; it is Mothership's call.

## As of 2026-09-26

- **CLI applied-physicist persona retest on 0.47.1 after the fix batch** (model persona, not a human
  reviewer): findings in `docs/research/cli-physicist-persona-0.47.1-post-fix.md`. Prior W1–Q2 still
  hold. New open triage: W4 (Kepler/Schwarzschild monomial constants→1), W5 (Planck all-constant
  RHS refused), W6 (`a`→perihelion not acceleration), W7 (Landauer `ln(2)` vs `ln2`), L5–L8, Q3–Q4,
  persona I5–I8. No code change in that pass; Mothership to triage.
- **CLI applied-physicist persona pass on 0.47.1** (model persona, not a human reviewer): findings in
  `docs/research/cli-physicist-persona-0.47.1.md`. W1–W3, L1–L4, Q1–Q2, persona I1–I4 fixed in the patch
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
- **Composition table** remained 56 silent cells on 2026-09-23 (not widened then); see the 2026-09-27
  block for the I2 widening to 55.
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

- **The code-docs ratchet drifted on `master` (found 2026-09-27).** The pre-push gate counts MUST
  doc-comment issues against `.githooks/code-docs-baseline.txt` (153). Measured with the same tool
  and environment: 153 at `6d0feed`, where the baseline was set, and 221 at `master` `335e970`. So 68
  exported symbols reached `master` undocumented. Every commit on `master` after `6d0feed` is a GitHub
  merge (27 on the first-parent line, #186–#212): a merge on GitHub runs no local hook, a push from a machine without the tool
  skips the check, and CI does not run it. Which PR added which symbol was not measured. The audit
  branch added 16 more; all 84 are documented
  there, and the count is back to 153. The gate stays a local hook only, so the drift can recur.
  On this machine the gate first crashed, because `tree_sitter_typescript` was missing from the
  Python on PATH; the tool's pinned `requirements.txt` was installed.
- **The architecture-docs claims drifted on `master` too (found 2026-09-27).** The pre-push gate's
  `repo_map.py check . --docs docs/architecture` fails on `master` `335e970`: the hand-written
  Verification tables claim 898 files and 3120 exports, and `master` measures 956 and 3441. The same
  route as the code-docs drift applies: GitHub merges run no local hook, and CI does not run this
  check. On the audit branch the seven hand-written docs were re-measured (976 files, 3533 exports,
  370 reachable, 10 test-only, 5 duplicate names) and the check exits 0. No generated report was
  edited. Three of the five duplicate names (`MASS_DENSITY`, `canonicalJson`,
  `propagateUncertainty`) are triaged as drift risks in `docs/architecture/duplicate-symbols.md`;
  none was changed in code.
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
- **CLI:** the `upt` CLI (25 data-bearing commands + `help`/`version`).
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

