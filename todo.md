# UPT TODO

## CLI applied-physics audit publication

- [x] Archive the CLI-only applied-physicist persona audit, evidence, maps, and 20 improvement recommendations under `docs/audit/`.

### Audit findings ledger (§11, F01–F14)

- [x] **F01** `upt path` follows a qualified bridge across families (KG → free Schrödinger); composition rules unchanged.
- [x] **F02** `discover` states, beside the PROMISING count, how many have a mechanism test, a data test, and an abstaining falsifier.
- [x] **F03** `ln` and every other built-in parser function evaluate under the MathTS parser too; unknown functions still fail.
- [x] **F04** `upt ground` takes `--source` so a canonical/combined `discover` pair can be grounded; a pair from another scope is named as such.
- [x] **F05** A `no composite claim` path names what the refusal is missing; the composition table is not widened.
- [x] **F06** `ab-stokes-einstein` witness prose states radius, temperature and viscosity explicitly.
- [x] **F07** `confront --frontier` says "margin to the configured acceptance threshold" and prints the criterion.
- [x] **F08** A VACUOUS regime lists the stated physical premises as untested, separately from checked inequalities.
- [x] **F09** The atlas formal-reference line states what the theorem does not certify (bound, regime, horizon).
- [x] **F10** An evidence-filtered map export keeps the no-overlay vs non-matching accounting.
- [x] **F11** `upt audit` DECOY is qualified as a dimensional-reconstruction mismatch, not a physical refutation.
- [x] **F12** `symbolic` prints unambiguous grouping (parenthesized denominators).
- [x] **F13** Upper-bound confrontations (GW-speed) label the prediction, the bound and the compatibility rule.
- [x] **F14** Top-level help derives the isolated-bridge count instead of a fixed "20".

### Audit improvements (§14) not covered by the F-ledger fixes

Audit I1, I3, I4, I10 and I13 were taken as covered by F-ledger fixes; the review below found four of
them only partly met, and their rows are in "Review of the audit against the records and the code".

- [x] **I2** Justified composition of approximation ∘ exact-equivalence with a transported norm (needs a reviewed composition-table widening).
  Owner decision 2026-09-27: option 4 of `docs/planning/ADR-transported-norm-composition.md` (the
  cell `approximation['exact-equivalence'] = 'approximation'`, the table a pure function of relation
  types, and per-direction `normTransports` on exact bridges). `ab-spring-lc` declares relative period
  error with witness W1τ. Limits, recorded as negative results: `ab-heat-diffusion` declares no
  transport (it needs its own witness and a horizon restatement through D = κ/(ρc_p)), so
  telegraph → heat refuses as `norm-not-stated`; exact then approximation (ADR §3) stays silent; the
  composition-graph edge layer carries no transports and refuses the widened cell.
- [x] **I5** Semantic lookup across law, model, symbol and alias names (`upt search`).
- [x] **I6** Unit-aware input parsing and explicit parameter schemas (radius vs diameter, conventions).
  Every evaluator declares each input's unit, meaning and geometry role, and `evaluate` converts
  units against the declarations. ~~No evaluator takes a radius yet: the audit's Stokes–Einstein example
  (1 µm radius ≡ 2 µm diameter) is shown on the resolver, not the CLI.~~ *(Withdrawn 2026-09-27: the
  I20 case meets it on the CLI. `upt evaluate case-brownian-sphere T_K=293.15 eta_Pa_s=1e-3
  rho_p_kg_per_m3=2000 rho_f_kg_per_m3=998 t_s=1 d=2 h_m=100um` gives D = 2.1471978e-13 m²/s for
  `a_m=1um` and for `diameter_m=2um`, and 4.2943956e-13 for `a_m=0.5um`; k_BT/(6πηa) by hand agrees.)*
  `CE-stokes-einstein` is encoded only up to its 6π, so it cannot back an evaluator as it stands.
- [x] **I7** Full premise checklist with verified / user-declared / contradicted / unspecified states.
- [x] **I8** Tolerance-driven horizons (requested observable tolerance → horizon).
  `path --tolerance=EPS` judges in the bound's own norm; `--tolerance=phase:EPS` and
  `--tolerance=position:EPS` go through `ab-pendulum-linear`'s two declared translations, and phase
  crosses `ab-spring-lc` through its declared carriage. The witness runs at the user's θ0 and at the
  fixture. Limits: the position bound rests on the quoted pendulum Fourier series (a premise, not
  machine-checked); the point witness is not run below θ0 ≈ 0.007 and its control cannot fail below
  θ0 ≈ 0.013 (both said in the output); amplitude and every other bridge are not encoded.
  Done 2026-09-27, as far as it can be closed:
  - The Fourier-series premise is machine-checked. Witness W7xs checks it against RK4 over one period at
    six θ0 across the domain, within 1e-9 rad, and its (1 − q^{2n+1}) control is refuted. A test checks
    the coefficients a second way, from a quadrature nome and an independent RK4 projection. It is
    still a check at points, not a derivation.
  - The phase point witness locates each crossing by a secant on the RK4 step. It now runs down to
    θ0 ≈ 7.0e-4 at a tolerance of 5e-8 relative, and its control fails down to θ0 ≈ 9e-4.
  - Not closable: below that the (1+ε) control cannot fail. The two maps differ by ε relative, which
    no finite-precision witness resolves as θ0 → 0 (negative result).
  - Not derived: amplitude and angular velocity, a position carriage through `ab-spring-lc` (angle to
    charge needs a declared scale), and translations for any other bridge.
- [x] **I9** Uncertainty propagation with covariance, distinct from sensitivity.
- [x] **I11** Discovery ranking by evidential readiness dimensions.
- [x] **I12** Premise and novelty status inseparable from every exported derived relation.
- [x] **I14** Confrontation records expose the statistical object, preprocessing and independence for every record.
  Preprocessing and independence are required fields, each sourced or explicitly not recorded (counts
  in `NOTES.md`). Each statement cites repository references (file + verbatim quote or declared
  symbol) that a test resolves; resolving shows the cited text exists, not that the statement is true.
- [x] **Confrontation gap label** — `confront` now prints the actual difference (observed − predicted)
  / predicted beside the agreement bound, labelled apart; no pinned number changed. Open: be-11 and
  be-21 carry no agreement bound in the outcome, so no compatibility decision is made for them
  (adding one would change the frozen golden).
  Done 2026-09-27: the golden is the Sprint 2 regression golden, not a pre-registered artifact (the
  pre-registration does not name it), so it was re-pinned deliberately. be-11's fractionalGap changes from 0 to its module's 15%
  tolerance. be-21 is decided by a lower-limit rule, observed ≥ 1/(4π). Every consistency record now
  makes a decision. be-11's decision holds by construction (negative result, in `NOTES.md`).
- [x] **Atlas equation links** — 15 of 24 atlas models record no `canonicalRefs` (reasons per model in
  `tests/atlas/canonical-links.test.ts`). Eight older links are not yet checked (ratchet list in that
  test); three need a sourced prefactor for CE-simple-harmonic-frequency, CE-sound-speed and
  CE-string-wave-speed first. `CanonicalEquation.model` stays unset: `src/canonical` is frozen by
  criterion 3.
  Done 2026-09-27: all eight are checked. The ratchet list is empty. Prefactors were sourced for the three, and for CE-spring-potential-energy and
  CE-oscillator-energy; CE-sound-speed's √γ is in a group table. New link: `model-lc` →
  CE-capacitor-energy. `NO_LINK_REASONS` holds a reason for each of the 15 unlinked models. Open:
  CE-inductor-energy needs a sourced ½ before `model-lc` can link it; `CanonicalEquation.model`
  stays unset (freeze).
- [x] **I15** Claim-level evidence per bridge (transformation, regime, bound, horizon) with witness execution status.
  Five witnesses (WS4, WD6, WD7, WS5, WS7) are attributed to their bridge's bound, each checked against
  its spec. None can be attributed to correspondence, regime, horizon or preserves: no spec ties to
  them. Open: an executable spec for witness W7 (pendulum) so it can be attributed.
  Done 2026-09-27: W7 (bound), W8b (`bound-holds-at`: `ab-damped-massless`'s bound is not sharp)
  and W9 (`preserves`: `ab-chain-wave` has no bound) are registered, so every atlas bridge runs a
  witness in-process; each has a negative control that is refuted and a meta-check.
- [x] **I16** Focused (neighborhood/route/family) map exports.
  `map --around`, `--route=FROM,TO` and `--family=NAME`; models join the equation graph only through
  their recorded `canonicalRefs`. `--all-routes`, `--observable`, and `--stored`/`--run` evidence are
  added. Open: an atlas-wide evidence view, and a test of `--run`'s exit 3 (nothing refutes today).
  Done 2026-09-27: `upt atlas --evidence [--stored | --run]` shows every bridge of every family with its
  derived and undecided evidence, per-tag counts (zeros included) and the norm-transport witnesses.
  A refuting witness injected through a test-only registry makes `atlas <id> --run`, `atlas --evidence
  --run` and `map --family/--route/--observable --run` exit 3; the shipped registry exits 0 (the paired
  check), and an unresolved witness exits 0.
- [x] **I17** Session export and replay (`--record`, `--show-record`, `--replay`).
  `upt-record/2` hashes the arguments and the entry, fingerprints 18 named constant tables, and marks
  each changed constant reachable or not from the command (a static upper bound, not an observed read).
  Open: literals a module keeps private are in no table; attribution is per command, not per entry;
  `map --out` and the timed `probe` subverbs are not replayable.
  Done 2026-09-27: each entry hashes the source of every module its command loads, so a changed private
  literal is named as a module change (the module, not the literal). `map --out` replays into a temporary
  file compared by hash. Probe entries hash their input files (the observations file a problem names
  included) and replay while those are unchanged; a changed input, an external worker, and a search the
  record or the replay says stopped on its wall-clock budget are declared not replayable. `--stored`
  hashes the witness-results artifact. Not done (negative result): per-entry attribution. The import
  graph does not depend on the arguments, and a module's reads of its own private bindings cannot be
  observed from outside it; a hand-kept id-to-module map would be declared, not derived.
- [x] **I18** Bounded parameter sweeps with parent vs reduced model comparison.
  `--sweep … --compare=<to2>` puts two limits side by side and marks NEITHER rows with no number
  (telegraph and Klein–Gordon).
- [x] **I19** Real-data, falsification-oriented probe workflow (`probe study --data=FILE`).
  The pendulum controls are positive controls whose law was chosen knowing the answer: they show the
  workflow can recover and refute a law, not that it finds an unknown one; UPT ships no blind control.
  CSV input, input σ (effective variance), a declared correction family (F test) and a separate
  `--replication` file are added. Open: the replication check catches exact copies only; one
  dimensionless input can carry a family. (The coverage clause that stood here, "below its thresholds
  (it was before this work too …)", was half wrong: the owner's review measured 94.53% statements and
  86.36% branches on 2026-09-25, so branches fell below 85 with this work. Resolved in the review
  section below.)
  Done 2026-09-27: replication rows at a study row's inputs are tested for agreement too good to be
  true, identity (Σz²) and affine (y = a + b·y_study), each a lower-tail χ² test at α/2; either firing
  makes replication `too-close`. Provenance matches ignore case, spacing and punctuation; inline rows
  and a shared calibration are reported. `correction` takes a list of families, one per dimensionless
  input. Limits that stand: only rows at shared inputs are paired, so a copy at altered inputs is not
  caught; the families are additive (no cross term) and their declared order decides which terms are
  tried first; an overstated σ also fires the closeness test. Not done, and inherent: a blind control.
  Authoring one would take an author who does not know the generating law, and no such author is
  available under the benchmark rules in `AGENTS.md`.
- [x] **I20** End-to-end qualified applied cases (resistor noise, Brownian diffusion, damped resonator).
  Six cases: the three above (now with hydrodynamic memory, Faxén/Brenner walls, amplifier noise and a
  resonator thermal floor) plus `case-skin-depth`, `case-lumped-cooling` and `case-kepler-rv`. Open:
  memory near a wall, the parallel lubrication limit, Faxén terms past 9/16 (quoted, not checked),
  the anomalous skin effect and radiation-dominated cooling (refused, not evaluated).
  Done 2026-09-27: radiation-dominated cooling is evaluated. `case-lumped-cooling` reports
  `T_radiating_K`, the lumped equation with the T⁴ loss kept (RK4), under its own premise
  `Bi_radiating` = (h + h_rad)(a/3)/k ≤ 0.1, and null outside it. Checked by a second method: at h = 0
  it inverts through a closed form derived by partial fractions to the same t within 1e-7.
  Not done (negative results; the refusals stand):
  - memory near a wall: no sourced wall-corrected memory kernel is in the repository;
  - the parallel lubrication limit: the Goldman–Cox–Brenner asymptote's constant could not be checked
    against a source here;
  - the Faxén terms past 9/16: an independent check needs the exact bispherical solution (O'Neill
    1964), which is not implemented;
  - the anomalous skin effect: the Reuter–Sondheimer surface impedance is an integral equation that is
    not implemented, and no sourced closed-form limit was checked.
  Atlas models for the EM, thermal and astrophysical cases: not added, because none has a sound bound
  yet.
  - The skin-depth reduction is the atlas's existing `ab-telegraph-diffusion` relation, with τ = ε/σ;
    a family of its own would restate that relation, not add one.
  - Lumped cooling has no error bound: the textbook Bi ≤ 0.1 does not bound the late-time error
    (measured in `NOTES.md`).
  - Kepler → 1PN needs a trajectory bound whose apsidal drift grows linearly in time. The case evaluates
    periods and amplitudes, and derives no such bound.
- [x] **EPIPE** `upt … | head` crashes with an unhandled `write EPIPE` from `stdoutLine`; a closed stdout should end the run quietly (seen while fixing the audit; not an audit finding).

### Review of the audit against the records and the code (owner order 2026-09-27)

Audit items are written "audit I5"; the persona notes in `docs/research/` number their own ideas, written
"persona I5"; persona findings W4–W7 are written "persona W7" where a witness id (W7 = the pendulum
witness) could be meant. Earlier entries used the bare form for both.

- [x] **Windows checkout: probe-study fixtures and two path-separator tests fail.** With
  `core.autocrlf=true`, `tests/fixtures/probe-study/**` checked out CRLF (it was missing from the
  `text eol=lf` list) and four probe-study tests failed; `tests/cli/probe-study.test.ts` expected a
  POSIX path and `tests/cli/record-hardening.test.ts` keyed the constant tables by a backslash path.
  `npm run validate` runs them, so a Windows publish was blocked.
- [x] **Probe coverage gate** — `bun run test:probe-coverage` below its thresholds (branches 82.47% < 85,
  statements 91.46% < 95); raise with tests that can fail, keep the thresholds, and run it in CI.
  Now 95.41% statements, 88.26% branches, 98.07% functions, 97.4% lines; the `test` job runs it.
  Found on the way (negative result): a relative or standardized correction to a baseline is never
  emitted for a dimensioned target, because `1 + m` with m of the target's dimension is inhomogeneous.
- [x] **Records** — stale I6 note; §14 heading over a list of ticked rows; CHANGELOG "(partial)" lines
  contradicted by later "(rest)" lines; audit/persona ID collision.
- [x] **audit I1** Qualified routes across model families — met by F01.
- [x] **audit I3** Consistent graph scope — F04 carries `--source` to `ground`; open: `explain`'s help
  omits `--source`, and results do not print the effective source and anchor. `explain`, `ground`,
  `discover`, `map`, `candidates` and `connectors` now name the effective source in text and JSON, and
  the anchor they are relative to (the discovery ground truth, default or `--anchor`; or the
  established core, with its edge count). Both help texts list `explain --source`.
- [x] **audit I4** Stable expression syntax — F03 made `ln` agree; open: an unknown function suggests no
  tested equivalent, `--debug` omits the parser version, help does not state the base of `log`, and
  `map --equation` cannot compare `ln(2)` (persona W7). Both parsers now name a tested equivalent
  (`lg` → `log10`, `arcsin` → `asin`, …) and still fail; `--debug` prints the parser and its version;
  the help lists the functions and states that `log` is natural. The equation compare evaluates with
  the active formula parser and reaches CE-landauer through BE-16, which it restates.
- [x] **audit I5 residual** — `explain <law-name>` suggests one-letter quantities instead of `upt search`.
  NOT COVERED now lists what `upt search` finds for the name's words (`schrodinger-equation` →
  model-schrodinger-free, ab-schrodinger-diffusion, ab-kg-schrodinger), and a contained name counts
  as near only from three characters.
- [x] **audit I10** Reproducible equation rendering — F12 grouped denominators; open: no LaTeX, no
  symbol table. Each chain now prints LaTeX (`\frac` for every division) and a symbol table (meaning,
  value, SI unit, source); both round-trip through `eval` to the AST value, nested cases included.
- [x] **audit I13** Precise verdict words — F07/F11 reworded two; open: no single glossary, no JSON
  definitions except DECOY, and a VACUOUS regime line still starts with "valid". One table
  (`src/cli/statuses.ts`) now feeds `upt help statuses` and every `--json` envelope's `definitions`;
  a vacuous regime line reads "no machine condition evaluated (VACUOUS …)". Found on the way: `decoy`
  means two things (audit's failed reconstruction, discover's adjudication verdict); both are defined.
- [x] **Top-level help map usage** omits `--route`, `--family`, `--all-routes`, `--observable`,
  `--stored`, `--run`, `--evidence`. The map synopsis is now complete in both helps and points to
  `upt help map`. A test derived from every command's accepted flags found the same gap in seven more
  places (`--source` of audit/predict/priority/probe, `derive --debug`, `canonical --vars`,
  `discover --show-adjudicated`, map's `--anchor`/`--max-orders`); all are documented now.

## TypeScript-on-Bun migration (in flight)

- [x] **Bun as package manager + script driver; Node stays the runtime.** Same house pattern as
  time-mcp / neural-computer / memory-mcp: `bun.lock` only, CI `bun install --frozen-lockfile` +
  `bun run …`, `setup-node` kept, Dependabot `package-ecosystem: bun`. Re-attempt after the
  2026-08-22 revert (`0dd2cfc`) — root cause was Bun dropping the MathTS `github:` deps
  (`typed-function`, `workerpool`); verified present under Bun 1.4.2 frozen install before this
  lands. Publish path still `npm publish` (registry); `package:check` still uses `npm pack`.

## v0.45.0 released 2026-09-03

- [x] **v0.45.0 published** — `feat` Product B probe experimental types (#146); four numerical
  perf optimizations (Weyl assembly #158/#149, `bisectCubic` inlining #144, GL4 unrolling #142);
  probe-candidate hardening with Node 18 tooling compatibility (#157); and the fix for `master`
  not compiling after #149 removed two `const` declarations while keeping both uses.
  Registry-verified (`dist-tags.latest = 0.45.0`) and clean-install smoke-tested from the
  published tarball: 288 exports, `bin/upt.mjs version` reports 0.45.0.
- [x] **`package:check` could never run on Windows, blocking every release.**
  `execFileSync('npm.cmd', ...)` dies with `EINVAL` on Node >= 18.20.2 / >= 20.12.2, which refuse
  to spawn a `.cmd` without a shell (CVE-2024-27980 fix). `package:check` is inside
  `npm run validate`, which is `prepublishOnly` — so publishing was blocked from the only machine
  that publishes, while CI (ubuntu) never reached the path and stayed green.
  **`CLAUDE.md` had documented `npm publish --ignore-scripts` as the house rule, blaming "vitest
  cold-start tax"** — a workaround that hid the real defect and disabled the packaging gate on
  every release. Fixed at root (`shell: true`, win32 only, all arguments literal); the gate now
  runs and reports 1152 files with no dev-tree leakage.

## v0.44.4 session checkpoint (2026-08-30)

- [x] **CLI security hardening (#143)** — `upt eval` input validation parity with
  `upt explain`; `upt probe` `--worker`/`--holdout-tol`/file-error boundaries;
  `parseExprJson` + `parseDesignBounds` schema validation; graph label newline
  escaping; user-equation 8192-char cap; hardening matrix extended to
  `evaluate`/`ground`/`axes`.
- [x] **`kretschmann-scalar` end-to-end lowering** — `lowerKretschmannScalar` in
  `curvature-lowering-helpers.ts` wires `riemannLowerAt` + `computeKretschmann`;
  Task 3.7 deferral closed; `tests/numerical/kretschmann-lowering.test.ts`.
- [x] **Probe module coverage gate green** — `npm run test:probe-coverage` now
  passes 95%+ statements/lines/functions (98.25% lines at HEAD); new tests in
  `experiment-design.test.ts`, `parse-expr-json.test.ts`, `backend.test.ts`
  (rich-worker prefactor/note).
- [x] **CLI src-path coverage tests** — `tests/cli/cli-from-src.test.ts` imports
  `src/cli/main.ts` so vitest instruments TypeScript CLI sources (spawn tests
  alone only hit `dist/`).
- [x] **`npm run test:coverage`** — full `src/**` coverage report script added
  (informational; ~82% lines at HEAD with 3827 tests — CLI spawn gap remains the
  main drag; in-process src tests are the mitigation).
- [ ] Optional `@danielsimonjr/mathts-*` peers lag their latest releases — still
  deliberately not bumped (release-sized optional-dep sweep; zero hard-dep
  breakage risk). Revisit as a dedicated MathTS-alignment release, not a gap-fix
  drive-by.
  - [x] Dependabot ignores `@danielsimonjr/mathts-*` until that release (PRs #178–181 closed by Mothership 2026-09-22).

## v0.44.3 released 2026-08-28

- [x] **v0.44.3 published** — numerical-core perf (#138, #139, #140). Registry-verified
  (`dist-tags.latest = 0.44.3`) and clean-install smoke-tested: 288 public exports, 55 bridge
  entries, `evaluateNumerical` present.
- [x] **Release procedure corrected in `CLAUDE.md`.** It listed bump → commit → tag → publish with
  **no docs regeneration step**, so the release commit failed `docs-fresh`:
  `DEPENDENCY_GRAPH.md` embeds `**Version**` from `package.json`, and the docs had been
  regenerated before the bump. The gate was right; the documented procedure was the defect. Now
  reads bump → `docs:deps` → commit → push → tag → verify CI → publish → verify registry.
- [x] **`long-tests` now runs on PRs touching `src/numerical/`** (`0c6f1d9`). A `numerical-touched`
  job computes the answer with `git diff` rather than a third-party paths-filter action. Verified
  on a throwaway PR (#141, closed unmerged): `numerical-touched` succeeded and `long-tests` fired,
  where it had shown SKIPPED on every prior PR.
- [x] Optional `@danielsimonjr/mathts-*` peers lag — **tracked above** in the
  v0.44.4 session checkpoint (still not bumped; release-sized change).


Durable cross-session task tracker. Update this file as work progresses — checkboxes flip when tasks complete, items move between sections as state changes.

> The in-conversation task tracker (TaskCreate/TaskUpdate) is ephemeral. This file is the source of truth for "what's next" across sessions.

---

## ⏩ SESSION CHECKPOINT (2026-06-22 session 3 → audit backlog COMPLETE bar one)

**Session 3 (2026-06-22): the entire remaining audit backlog was implemented in
~13 more commits** (`ece1d03..ccea976` + this checkpoint), least→most complex:
Batch-4 (sym/dim dedup into `dimensional/ast-builders.ts`; AD-dispatch dedup;
un-export tensor-ambient declined-with-rationale; `gradientToNamed` length guard),
the full **Round-2 robustness line** (`inferUnknownDimension` tolerance,
`forwardEvaluate` finite-seed, `christoffel` dimensionless-metric assert,
`setActiveEngine` in-flight-override, `bisectCubic` warm-start, CLI
`--max-orders`/`--anchor` validation), **all test-coverage backfills**
(null-ic, dimensional-fields, lowering-utils, metric-inverse, derivative-lowering,
normalForm properties; no-coverage list 14→9 = ambient shims + indirectly-covered
data), **js-yaml 4→5** dev bump, **CLI stable entrypoint** (`cli-api.ts`),
**the type-only-cycle refactor** (`dimensional/ast-types.ts` — user-approved full
restructure; **type-only cycles 2→0**, runtime stays 0; 3028 tests), Round-1
Batch-3 (`relativeSpread` sign-robustness + inline no-op wrapper), and the
**nightly `long-tests` CI job** for the skip-by-default GL4/Shapiro accuracy tests.
`format` LUT declined (not hot). **Everything green; all pushed.**

**God-file splits (user chose execute-by-domain) — ✅ ALL DONE (2026-06-23):**
`catalog-full.ts` (4 domain files + helpers + barrel, 1642 tests), the L1-fold
(2 batch files → relativity/thermo-nuclear-cosmo/electromagnetism/atomic; a
pre-existing CE-half-life signed-zero `toEqual` fragility fixed en route via a
new registry-wide `validate(scalarAst)===target` invariant), and `quantities.ts`
(131 nodes → `quantities/{quantum,gravitation-cosmology,fields,condensed-matter,
common}.ts` + `_dims.ts`, barrel re-export, export surface byte-identical). All
behavior-preserving, build + strict test-typecheck clean, full consumer suites +
smoke green. **The entire 3-round audit backlog is now COMPLETE — no open
backlog items remain** (only the long-deferred aspirational ROADMAP bucket).

---

## ⏩ SESSION CHECKPOINT (2026-06-22 → resume in a fresh session)

Audit-backlog implementation is **IN PROGRESS**. Session 1 (2026-06-21): 15
commits `c7bbce2..feccf42` (all Round-2 HIGH+MED, registry collapse, all of
Round 3, the Round-1 `collectSymbols`/`op('/')`/`DATA_CONFRONTED`/`dim()`-order
items, `buckinghamPi` single-RREF). Session 2 (2026-06-22): 10 commits
`a5c0e1f..1d1fb04`, all pushed/green —
**Round-2 algorithmic perf ALL DONE** (discovery candidate-invariant hoist;
`scanLinkages` per-operand precompute; `linkageMap`→`clusterMap` O(E²) split;
curvature Bianchi center-Γ reuse; `equals` 7-base unroll), **Round-1 Batch-1**
(`FUNDAMENTAL_CONSTANT_SUBSETS` hoist + `mapGetOrInsert`), **Round-1 Batch-2**
(geodesic Christoffel scratch buffer; curvature `nestedZeros4/5` dedup), and
**part of Batch-4** (un-exported 8 internal types + deleted dead `evalFormulaAst`;
`gradientToNamed` length guard + `bound !== undefined`).

**REMAINING (lower-value tail — pick up here):**
- **Batch-4 leftovers:** dedup `sym()`/`dim()`/`l0()` (calibration ↔
  proposed-bridges ↔ dimensional-classics ↔ `_l1-build`); dedup AD dispatch in
  `float64-engine.ts`; narrow the `[key:string]:any` tensor ambient
  (`mathts-tensor.ambient.d.ts`).
- **Round-2 robustness line:** `inferUnknownDimension` integrality tolerance;
  `connection.ts` dimensionless-metric assertion; `forwardEvaluate` finite-seed
  guard; `setActiveEngine` async staleness; CLI `--anchor`/`--max-orders` bad-value
  validation; `bisectCubic` warm-start. (`gradientToNamed` length already done.)
- **Round-2 test-coverage backfills** (reconstructNullPr, dimensional-fields
  biconditional, derivative-lowering, lowering-utils, metric-inverse,
  normal-form hash property test).
- **Architecture remainder (ADR-level — scope explicitly before starting):**
  `catalog-full.ts` 1209-line god-file split; `quantities.ts` literals;
  L1 entry-file split; CLI stable entrypoint (deep `dist/` paths).
- **Deferred:** type-only-cycle refactor (`dimensional/ast-types.ts`); `js-yaml`
  4→5 major.

Continue via `/dev-workflow` (TDD-strict, atomic commits). Gotchas: read
background test output with `PowerShell Get-Content -Tail` (Bash output files
read flaky); **un-exporting a type used by an exported value needs `npm run
build` (declaration emit), NOT just `--noEmit`, to verify** — `.d.ts` keeps it
as a local decl so it passes; run the full build before pushing such changes.

---

## Codebase audit backlog (2026-06-21, 5-agent Sonnet audit → Opus fix team)

Findings from the parallel read-only audit (correctness/dead-code/simplification/
performance/type-safety). Grounded + verified against source; false positives
(normToExpr unary-minus, RetrodictionOutcome union) excluded. Partitioned into
disjoint file-batches for the Opus implementation team.

**Batch 1 — `bridge-analysis.ts` hotspot** (`composition/bridge-analysis.ts`, `bridges/confrontation-coverage.ts`)
- [x] ✅ (2026-06-21) Stale `DATA_CONFRONTED_BE_IDS = {23,36}` (missing 52) — FIXED: `bridge-analysis.ts` now imports the single `DATA_CONFRONTED_IDS` ({23,36,52}) from `confrontation-coverage.ts`; local dup deleted.
- [x] ✅ (2026-06-21) `dim()` param order aligned to canonical `(L,M,T,I,Theta)`; `k_B`/`e` callsites updated; resulting dims byte-identical.
- [x] ✅ (2026-06-22) Perf: hoist `subsetsBySize(FUNDAMENTAL_CONSTANTS)` to a module const (`FUNDAMENTAL_CONSTANT_SUBSETS`) — DONE. `anchoringDistance` was already single-pass; the redundant `linkageMap`/`enumerateCompositions` calls were eliminated by the earlier `clusterMap` split.
- [x] ✅ (2026-06-22) `mapGetOrInsert` helper to remove the `!` Map assertions — DONE: applied to the 5 get-or-insert sites (anchoringDistance adjacency, clusterMap qToEdges/groups, proposeOrphanConnectors qToEdges). Guaranteed-present `!` reads (distOf/edgeCluster/qDim) left as-is (legit, not get-or-insert). 62 tests green.

**Batch 2 — numerical perf + bug** (`numerical/{christoffel-flat,geodesic-integrator,curvature-lowering-helpers,lowering}.ts`)
- [x] ✅ (2026-06-22) Pre-allocate the `Float64Array(64)` in `christoffel-flat.ts` (~160k allocs/geodesic run) — DONE: closure takes an optional `out` buffer (non-breaking; fresh-alloc default kept); `integrateGeodesic` threads one reused scratch through all 4 RK4 Christoffel evals/step (safe — each `geodesicRHS` consumes Γ before the next call). Numerically identical; 9 tests green incl. 2 new buffer-reuse tests. The optional `geodesicRHS` `dx`/`dv` scratch was left as-is (more invasive RK4 rewrite, smaller gain).
- [x] ✅ (2026-06-22) Use a nested-zeros helper for the 6 nested zero-tensor allocations in `curvature-lowering-helpers.ts` — DONE: added typed local `nestedZeros4`/`nestedZeros5` (latter reuses former), replaced all 6 inline `Array.from` builders. Used typed helpers rather than the generic `NestedArray`-returning `buildNestedZeros` to keep concrete types without casts. Identical allocations; 24 curvature tests green.
- [x] ✅ (2026-06-21) `op('/')` empty/1-arg convention ALIGNED across validator/expr-eval/lowering (empty→1, 1-arg→operand left-fold); `lowering.ts` no longer throws on empty `/`. Resolves this + the Batch-3 alignment item. `tests/numerical/lowering-contract.test.ts`.

**Batch 3 — correctness: symbolic/dimensional** (`composition/{compose-symbolic,expr-eval,retrodiction}.ts`, `dimensional/{algebra,validator}.ts`, `canonical/linkage.ts`)
- [x] ✅ (2026-06-21) `collectSymbols` must recurse into `transcendental`/`abs`/`dirac-delta`/`variational-derivative` (compose-symbolic.ts) — FIXED; was dropping inner leaves for BE-37/26/41-style symbolic forms. RED→GREEN via `tests/composition/collect-symbols-transcendental.test.ts`.
- [x] ✅ (2026-06-22) `format()` named-dimension lookup table — DECLINED (same as the Round-2 dup): `format` is error-path/one-time-build only (not hot), and the `equals` unroll already speeds its named-dim scan. A packed-signature LUT adds complexity for no measurable gain.
- [x] ✅ (2026-06-21) Align `op('/')` empty/1-arg convention — DONE (see Batch-2 entry; all three layers now agree).
- [x] ✅ (2026-06-22) Remove no-op `try/catch` + identity wrapper `resolveChildForCovariantDerivative` (validator.ts) — DONE: the try/catch was already gone; inlined the remaining identity wrapper at its single call site (delegated to the partial-derivative resolver).
- [x] ✅ (2026-06-22) `relativeSpread` sign-cancellation → normalize by `max|v|` (retrodiction.ts) — DONE (RED→GREEN; opposite-sign predictions give a finite spread, not Infinity). `numericalRecovery` `bv===0` (linkage.ts) left as-is — the all-or-nothing skip is intentionally conservative (zero sample ⇒ undefined ratio), not a bug.

**Batch 4 — minimization + type-safety + dedup** (`numerical/{formula,quadrature,float64-engine}.ts`, `composition/{symbolic-constants,proposed-bridges}.ts`, `canonical/entries/{_l1-build,dimensional-classics,relativity}.ts`, `bridges/equations/calibration`, `diff/{bridge-gradient,bridge-ast-gradient}.ts`, `numerical/mathts-tensor.ambient.d.ts`)
- [x] ✅ (2026-06-22) Un-export genuinely-unused internal types — DONE: deleted dead `evalFormulaAst`; un-exported `NamedConstantValue`/`GaussLegendreNode`/`L1Rest`/`EFE_NODE` + `proposed-bridges` `EquationSource`/`PromotionEvidence`/`PromotionRequest`/`ProposedBridgeEntry` (kept `ProposedBridge` — has external consumers). Verified non-public via build (declaration emit) + public-surface snapshot (unchanged). All still used within-module so `.d.ts` keeps local decls. 59 API/module tests green.
- [x] ✅ (2026-06-22) Dedup `sym()` + `dim()` — DONE: new zero-runtime-dep `dimensional/ast-builders.ts` is the single source; `_be-helpers`/`_l1-build` re-export (their ~55+8 importers untouched); the 5 local copies (`bridge-analysis`, `dimensional-classics`, `edges/calibration`, `proposed-bridges`, `formula-dimension`) import directly. `l0` left local to `dimensional-classics` (not duplicated). Runtime circular 0; full suite 2989 green.
- [x] ✅ (2026-06-22) Dedup AD dispatch in `float64-engine.ts` — DONE: `add`/`sub`/`mul` repeated the same dual/tape/primal three-way branch; extracted one `adBinary(a, b, method, prim)` helper (6 instanceof branches → 1 helper + 3 one-liners). Type-safe via the shared dual/tape method signature. 470 diff/numerical tests green.
- [x] ✅ (2026-06-22) Runtime-validate the `as unknown as Input` cast (bridge-gradient.ts); `if(bound)`→`!==undefined` (bridge-ast-gradient.ts) — DONE (scoped): added a `gradientToNamed` length-mismatch `RangeError` (the real public-input guard; RED→GREEN); `if (bound !== undefined)` clarity fix. The `as unknown as Input` cast left as-is (generic type param, no runtime schema; unpacked-length invariant is construction-guaranteed). Non-null `sum` init left as-is (null-accumulator is idiomatic/correct). 74 diff tests green.
- [x] ✅ (2026-06-22) Narrow the `[key:string]:any` tensor ambient — EVALUATED & DECLINED (not deferred): the index signature is a deliberate, load-bearing decoupling for the OPTIONAL peer `@danielsimonjr/mathts-tensor`. The code uses ~16 static + ~10 instance `Tensor` members (einsum/contract/mergeAxes/splitAxis/addCell/…); a hand-written structural interface would duplicate the peer's full API as a fragile fallback, break the no-peer build on any newly-used member, and add zero safety in the real dev env (the peer's `.d.ts` shadows the shim there). Added an anti-re-flag note to the shim docstring documenting the rationale. No code change to the type itself (a narrow would be net-negative).

**Deferred (NOT for the parallel team — risk/conflict):**
- [x] ✅ (2026-06-22) **Type-only-cycle refactor** — DONE (user-approved full restructure): new leaf `dimensional/ast-types.ts` holds `ExprNode` + all ~17 node interfaces + 5 index types; the 9 origin modules (validator/tensor/curvature/metric-validators/connection-validators/killing-validators/stress-energy-validators/einstein-equation/weyl-validators/curvature-invariants) re-export from it and keep only functions. `CovariantDerivativeNode.of`/`TensorPartialDerivativeNode.of` now typed `ExprNode` (was `unknown`). **Type-only circular deps 2 → 0** (runtime stays 0); ~100 importers unchanged via shims; build clean; 3028 tests green.
- [x] ✅ (2026-06-22) `js-yaml` devDep 4.2.0 → 5.0.0 — DONE: bumped root + the `create-dependency-graph` tool (only consumer); migrated to v5's named ESM `import { dump }`, `quotingType`/`forceQuotes` → `quoteStyle: 'auto'`, dropped redundant `@types/js-yaml` (v5 self-types). `docs:deps` regenerates valid clean YAML; build clean; 0 vulns.

---

## Codebase audit backlog — ROUND 2 (2026-06-21, 5-agent Opus deep audit)

Deeper second pass (physics-correctness / architecture / edge-cases / test-quality /
algorithmic). NEW findings beyond Round 1. Grounded (file:line) + cross-verified.

**🔴 New correctness bugs**
- [x] ✅ **GL4 step-halving advances by the wrong step** (`numerical/gl4-integrator.ts`) — FIXED 2026-06-21: recovery path now sub-steps the macro-step at the converging size (state update uses `subH`, not full `h`); norm conserved. RED→GREEN via new `tests/numerical/gl4-step-halving.test.ts` (synthetic metric forces halving deterministically — closes the "invisible because skip-by-default" gap).
- [x] ✅ **CLI `parseKnown` silently drops/coerces inputs** (`bin/upt.mjs`) — FIXED 2026-06-21: rejects malformed `name=value`, non-finite values, and name/value mixing with exit 2 + diagnostic. RED→GREEN via `tests/cli/upt-explain-inputs.test.ts`.
- [x] ✅ (2026-06-21) **BE-37 `eikonalResidual` hardcoded 0 on a false null-condition** — FIXED: now computes `|g^μν p_μ p_ν|/Σ|term|` on the real reconstructed null covector (~machine-ε); the `<1e-9`/`<1e-10` tests now meaningfully verify the null construction. Shapiro path unchanged.
- [x] ✅ (2026-06-21) **Finiteness-guard inconsistency** — FIXED: `integrateGaussLegendre` (bounds+result), `formula` evaluator (`upt eval`), and `bridgeGradientNumerical` (`Number.isFinite` param check + `relStep>0` guard) now all throw on non-finite instead of returning NaN/∞. RED→GREEN via `tests/numerical/finiteness-guards.test.ts` + bridge-gradient cases.
- [x] ✅ (2026-06-21) **Discovery magnitude-clash asymmetric validation** — FIXED: static-table path now shares the `isFinite && !=0` gate with the anchor path. RED→GREEN via `tests/composition/discovery.test.ts` (zero + non-finite cases).
- [x] ✅ (2026-06-21) **`equals()` fractional-exponent ULP compare** — FIXED: tolerance compare (`EXPONENT_TOL=1e-9`) absorbs round-off in `M^0.5`-style exponents while preserving genuine distinctions (steps ≥~1/3). RED→GREEN via `tests/dimensional/algebra.test.ts`; 627-test sweep green. (Tolerance in `equals` makes a separate `power` snap unnecessary.)

**🟡 New robustness/doc (lower)**
- [x] ✅ Round-2 robustness line — COMPLETE (2026-06-22):
  - [x] ✅ (2026-06-22) `inferUnknownDimension` integrality tolerance — DONE: snaps exponents to nearest integer within `EXPONENT_TOL` (now exported from `algebra`), abstains only on genuinely-fractional results. RED→GREEN (noisy-target). Scan confirmed clean integer roots are FP-exact; the reachable case is a noisy target dim.
  - [x] ✅ (2026-06-22) `gradientToNamed` length-mismatch (done earlier in the diff commit).
  - [x] ✅ (2026-06-22) `connection.ts` dimensionless-metric assertion — DONE: `christoffel` throws `TypeError` unless both metric args are dimensionless (the geometrized convention it + the numerical lowering require). RED→GREEN (MASS metric); 591 dimensional+canonical tests green.
  - [x] ✅ (2026-06-22) `forwardEvaluate` finite-seed guard — DONE: throws `TypeError` on a NaN/∞ ground-truth seed (computed values were already guarded; the seed wasn't). RED→GREEN; retrodiction+discovery green.
  - [x] ✅ (2026-06-22) `setActiveEngine` async staleness — DONE: a synchronous `_override` recorded by `setActiveEngine` and re-checked by the detection IIFE makes a mid-detection override win for the in-flight awaiter (matching the docstring's "invalidate in-flight detection"). `resetEngineForTesting` clears it. RED→GREEN.
  - [x] ✅ (2026-06-22) CLI `--anchor`/`--max-orders` silent no-op on bad value — DONE: `parseDiscoveryOpts` now exits 2 on non-numeric/empty/negative `--max-orders` (empty coerced to 0 silently before) and on malformed `--anchor` (missing `=v` or non-finite). RED→GREEN via new `tests/cli/upt-discover-opts.test.ts`; 30 CLI tests green.
  - [x] ✅ (2026-06-22) `bisectCubic` warm-start discarded — DONE: the `sInitial` evaluation (previously computed then discarded) now narrows the guaranteed bracket before bisecting (sign-bracket invariant preserved → identical root, smaller starting interval). Behavior-identical; perihelion + Mercury tests green (precession within 1σ).
- [x] ✅ (2026-06-21) Docstring value errors: BE-21 KSS `6.075e-12`→`6.078e-13` (10×); BE-20 vacuum-energy `7e-10`→`5.30e-10 J/m³`. Adam+Eve confirmed; evaluators/tests were already correct (comments only).

**⚡ New algorithmic (deeper than Round 1's micro-opts)**
- [x] ✅ (2026-06-22) **Discovery recomputes candidate-invariant state per candidate** (`composition/discovery.ts`) — FIXED: hoisted `forwardEvaluate`/`quantityComponents`/base-`forwardClosure` into a shared `DiscoveryContext` (`buildDiscoveryContext`); `vetInContext` is the pure per-candidate body, `vetLinkCandidate` delegates (signature unchanged), `rankDiscoveries` builds context once. 3 invariant graph walks now run once instead of 132×. Behavior-preserving; new equivalence-guard test pins shared-context == per-candidate byte-for-byte. 18 tests green.
- [x] ✅ (2026-06-22) **`scanLinkages` recomputes `validate`/`normalForm` per (canonical×bridge) pair** (`canonical/linkage.ts`) — FIXED: each bridge validated + normal-formed ONCE into `BridgePrecomp`; each canonical's normal-form computed once per outer iter; inner loop compares precomputed strings/dims via the new `classifyAgainst` core. ~3·C·B walks → ~2·B + C. `classifyLinkage` signature unchanged (delegates); equivalence-guard test pins scan == brute-force per-pair. 8 tests green (body 348ms → 66ms).
- [x] ✅ (2026-06-21) **`buckinghamPi` runs RREF twice** — FIXED: `nullSpace` returns `{basis, rank}` (rank = pivot count from the single RREF); the separate rank-RREF is gone. Behavior identical; 37 tests green.
- [x] ✅ (2026-06-22) **`linkageMap`'s O(E²) `enumerateCompositions` count fires transitively** on discover/candidates/connectors (`bridge-analysis.ts`) — FIXED: extracted the cheap cluster core into internal `clusterMap`; `linkageMap` wraps it + adds the count. `proposeLinkCandidates`/`proposeOrphanConnectors` now call `clusterMap` (never read `.compositions`), so the quadratic count only fires for `upt map`. `linkageMap` output/signature unchanged; 60 tests green.
- [x] ✅ (2026-06-22) **Curvature nested FD-on-FD recomputes Christoffel** (`numerical/curvature-lowering-helpers.ts`) — FIXED (scoped): grounding the audit claim showed the FD layers (`dGammaAt`/`dRiemannLowerAt`) sample `christoffelAt` at *perturbed* coords that never coincide, so the only genuine same-coordinate redundancy was the center `christoffelAt(x)` recomputed in the Bianchi path (`covariantDerivRiemannLowerAt`: `gamma` + `riemannLowerAt(x)` internally redoing it). Threaded an optional precomputed Γ through `riemannUpperAt`/`riemannLowerAt` (defaulted → all other callers unchanged) and reuse the center Γ. Numerically identical (pure fn of x; residuals ≤1e-6 to the bit; 17 curvature tests green). Full coordinate-keyed cache DECLINED — net-negative churn/risk on the precision-tuned pipeline for no further gain.
- [x] ✅ (2026-06-22) Unify `equals` on the unrolled `dimEqual` + packed-signature LUT for `format` — DONE (scoped): `equals` unrolled over the 7 bases (short-circuit, no iterator/dynamic-key), **tolerance preserved** so it stays distinct from linkage's exact `dimEqual` (the "unify" can't apply — different predicates after the v0.20 ULP fix). `format` LUT DECLINED: format is error-path/one-time-build only (not hot), and unrolling `equals` already speeds its named-dim scan. 499 dimensional tests green.

**🏛️ New architecture/structural**
- [x] ✅ (2026-06-21) **Collapse the per-bridge registries onto one descriptor** — DONE via the facade+guard approach (user-chosen): `src/bridges/descriptor.ts` `BridgeDescriptor`/`BRIDGE_DESCRIPTORS`/`getBridge(id)` JOINs metadata + RHS + edges into one view; `tests/bridges/descriptor-consistency.test.ts` (7 tests) fails loudly on cross-registry drift. Derived facade (no risky hand-merge of the 1906+1209-line catalog core). Full physical collapse deliberately NOT done — net-negative risk for the same anti-drift benefit.
- [x] ✅ **God-file splits — DONE (user chose execute-by-domain 2026-06-22; completed 2026-06-23).**
  - [x] ✅ `catalog-full.ts` DONE: split into `catalog-{quantum,gravitation-cosmology,fields,condensed-matter}.ts` + `_catalog-helpers.ts`; barrel re-exports all 26 edges + `CATALOG_FULL_EDGES`; grouped by the catalog's own `category_name`→4 domains; build clean, 0 cycles, 1642 tests green (drift-guards incl.).
  - [x] ✅ (2026-06-23) `quantities.ts` (131 literals) — DONE: split into `quantities/{quantum(25),gravitation-cosmology(28),fields(24),condensed-matter(26),common(28)}.ts` + `quantities/_dims.ts` (16 shared dimension aliases), classified by each node's consuming `catalog-*` edge file (2 cross-catalog + 26 calibration/tranche-only → common). `quantities.ts` is now a barrel re-exporting all five (`export *`), so all 6 importers + the `import * as quantities` uniqueness test are unchanged; the GeV/J + bits/nats unit-convention banner stays in the barrel docstring. Export surface byte-identical to the original (131 names, diff-verified). Behavior-preserving: build (decl emit) + strict test-typecheck clean, 333 composition tests + smoke green. (`common.ts` lives in the `quantities/` folder, not a `quantities-common.ts` sibling — keeps all 5 split modules + `_dims` together; minor deviation from the planned filename, cleaner pathing.)
  - [x] ✅ (2026-06-22) L1 entries — DONE: folded the 2 batch-named files into the domain-named siblings by honest domain fit — `relativity.ts` ← Bekenstein–Hawking + Newton-gravitation; `thermo-nuclear-cosmo.ts` ← Landauer + Jarzynski + Stefan–Boltzmann + ideal-gas + Wien; `electromagnetism.ts` ← Coulomb + Lorentz; `atomic.ts` ← Planck–Einstein + de-Broglie + Bohr-radius. Removed `L1_GRAVITY_THERMO`/`L1_QUANTUM_EM` imports/spreads from `registry.ts` and deleted both batch source + test files. Coverage preserved DRY: the batch tests' unique `validate(scalarAst)===target` check became a registry-wide invariant (compares via `equals` for −0-robustness — surfaced+fixed a pre-existing CE-half-life signed-zero `toEqual` fragility); each destination test gained an id-membership guard. Build (decl emit) + strict test-typecheck clean, 0 cycles, 72 canonical + 41 composition tests green; `docs:deps` + COMPONENTS.md regenerated/updated.
- [x] ✅ (2026-06-22) CLI stable entrypoint — DONE: new internal `src/cli-api.ts` barrel re-exports all ~30 symbols the CLI needs (public + internal analysis/composition/canonical); `bin/upt.mjs` imports a single `dist/cli-api.js` instead of ~10 deep dist paths. Decoupled from internal layout; off the public surface (not in index). 30 CLI + 9 API tests green.

**🧪 New test/coverage**
- [x] ✅ **Peer-gated tests silently skip with green CI** — FIXED 2026-06-21: `tests/peers-required.test.ts` fails loud when `UPT_REQUIRE_PEERS` is set but the autograd peer is absent; CI now sets `UPT_REQUIRE_PEERS=1`. Shared detection in `tests/helpers/peers.ts`.
- [x] ✅ (2026-06-22) Long-running GL4/Shapiro accuracy tests `skip`-by-default — DONE: added a nightly `long-tests` CI job (schedule + workflow_dispatch) that runs the full suite with `GL4_LONG=1`; PRs stay fast. Verified the 8 long tests pass with the flag (~166s).
- [x] ✅ Untested-module backfills — COMPLETE (2026-06-22):
  - [x] ✅ (2026-06-22) `reconstructNullPr` (null-ic.ts) incl error path — DONE (4 tests; also fixed stale flat-layout JSDoc).
  - [x] ✅ (2026-06-22) `dimensional-fields` biconditional invariant — DONE (4 tests across determined/underdetermined/not-in-span/empty, incl. the `max(1,gPi)` guard).
  - [x] ✅ (2026-06-22) `derivative-lowering.ts` — DONE: direct unit test for `lowerTensorPartialDerivative` metric arm (zero/computed/supplied-throw + operand guard); `lowerCovariantDerivative` already covered via the dispatcher (covariant-derivative-lowering.test.ts). No-coverage list 14→9 (remainder = type-only ambients + indirectly-covered data/registry modules).
  - [x] ✅ (2026-06-22) `lowering-utils` guards — DONE (7 tests: isMetricTensorNode, dimensionOf default, requireValue throw, flattenNestedArray size guard).
  - [x] ✅ (2026-06-22) `metric-inverse` null arms — DONE (scanForMetricPair: found-pair + both null arms, 3 tests).
- [x] ✅ (2026-06-22) `normal-form` hash property test — DONE: added a properties block (idempotence/reflexivity, constant-insensitivity over multiple constants, stub-sensitivity, nesting/ordering-invariance). 12 tests green.

**Cross-agent convergence (strongest signals):** (1) finiteness-guard discipline is applied inconsistently library-wide; (2) the GL4 bug exists *because* its accuracy test is skipped — fix both together; (3) the discovery/linkage/bridge-analysis pipeline is the recompute hotspot (deep + micro agents agree); (4) `algebra.ts equals/power` flagged by both correctness (fractional exponents) and perf (unrolled compare).

---

## Codebase audit backlog — ROUND 3 (2026-06-21, 4-agent Haiku sweep, honest-claude-vetted)

Haiku is hallucination-prone, so every finding was VETTED by reading the cited
source. Only verified items below. Hit rate: ~1 of 4 lenses fully reliable
(doc-accuracy 3/3); the others had real underlying observations but inflated/false
significance — the verbatim-quote requirement prevented fabrication (quotes existed),
so errors were in *interpretation*, not invention.

**✅ VERIFIED — stale "symbol stub" doc comments (real doc rot; worth fixing)**
These bridges were re-encoded to real `transcendental` AST nodes (v0.19/v0.21) but
their HEADER docstrings still describe the old symbol-stub encoding:
- [x] ✅ (2026-06-21) `bridges/equations/be-40-composite-higgs.ts` — "The AST has no transcendental primitives … symbol stubs" — contradicted by `:72-73` `transcendental` sin/cos. (Also stale at `:84`.)
- [x] ✅ (2026-06-21) `bridges/equations/be-25-iit-phi.ts` — "the AST has no `log` … symbol stub `log2_ratio_ii`" — contradicted by `:186` `transcendental` `fn:'log2'`.
- [x] ✅ (2026-06-21) `bridges/equations/be-26-dna-tunneling.ts` — "The AST has no `exp` primitive … symbol stub" — contradicted by `:97,109` `transcendental(exp, …)` (v0.21).

**✅ VERIFIED — trivial (low value)**
- [x] ✅ (2026-06-21) `bridges/equations/be-20-vacuum-energy.ts` — deduped behind `PLANCK_2018_LAMBDA`; `1.1e-52` while `DEFAULT_LAMBDA` (`:139`) holds the same value — reference the const (needs hoisting it above `:86`).
- [x] ✅ (2026-06-21) JSDoc-consistency nits (cosmetic): `validate` (`dimensional/validator.ts:853`) and `validateEquation` (`:885`) lack JSDoc while `validateInverseMetricPair` has it; the arithmetic fns in `dimensional/algebra.ts:24-66` lack JSDoc while `format` (`:86`) has it; `UniversalTensor` (`core/tensor.ts:121`) lacks a `@public` tag. Optional.

**❌ Rejected on vetting (recorded so we don't re-chase):** the be-37:475 `1.989e30`
"comment contradiction" (comment is about *constants* centralization; line is a demo
input); pderiv/uncertainty "same exact formula" (floors differ: `1` vs `1e-30`);
the `1e-10/1e-12/4096/1e-3` "duplications" (different semantics); agent-3's claim
that `validateEquation` HAS JSDoc (it doesn't); the `_l1-build` vs `l1-` file-naming
item (excluded + intentional: `_`=helper, `l1-`=data). Dead-code sweep: genuinely
CLEAN (the `src/composition/expr-simplify.ts` `console.*` are deliberate
warning-silencing, not debug logging).

---

## Active queue

- [ ] **0.47.1 CLI applied-physicist persona retest triage (2026-09-26).** After the W1–Q2 fix batch;
  findings in `docs/research/cli-physicist-persona-0.47.1-post-fix.md`. Open: W4 (Kepler/Schwarzschild
  monomial binds G/c as 1), W5 (Planck all-constant RHS refused), W6 (`a`→perihelion), W7 (Landauer
  `ln(2)` vs `ln2`), L5–L8, Q3–Q4, persona I5–I8. Docs-only pass; Mothership to order fixes.

- [x] **0.47.1 CLI applied-physicist persona pass + fix batch (2026-09-26).** Findings in
  `docs/research/cli-physicist-persona-0.47.1.md`. Fixed: W1 (c vs speed-of-light), W2 (RHS kebabs),
  W3/I3 (landing summary), L1 (named dim products), L2/I1 (`canonical --vars`), L3/I4 (probe
  searchable-only default), L4 (T→temperature), Q1 (PROMISING sort), Q2 (CONTRIBUTING 55).

- [x] **0.47.1 patch batch from the 0.47.0 persona re-test (Mothership ruling 2026-09-25).** After the hermetic-tests fix; one PR per item, in this order. Findings: `C:\dogfood\upt-persona-047\FINDINGS.md`.
      - [x] N1 (limits): the prefactor check matches variable names exactly; `kinetic_energy = mass*velocity^2` reports "prefactor NOT checked" and exits 0, because CE-kinetic-energy names its variable `speed`. Resolve names through the CLI's synonym/alias layer; test velocity AND speed, plus one name that must stay unresolved.
      - [x] N3 (clarity): with an unknown name, `map --equation` prints "dimensional MISMATCH" and exits 0 (the UNKNOWN rule). Say on the mismatch line that it involves the unresolved placeholder; keep the exit code.
      - [x] N2 + N5: ONE name suggester for `map` and `explain`, ranked by edit distance first (`lenght` → `length`; `hawkng-temperature` → `hawking-temperature` first).
      - [x] N4: `map --equation` prints the verdict first and the 40-component map after it (or behind a flag). No exit-code change.
      - [x] Release prep PR for 0.47.1 (Mothership order 2026-09-25): version bump, CHANGELOG `[0.47.1]` with a summary, version-stamped artifacts regenerated, full gate counts in the PR body. The tag, npm publish and GitHub release are Mothership's.
      - [x] L9 residual: ab-damped-massless states δ = 3 for x0 = 1; the measured worst case over its domain is 0.523. Fix only if small; otherwise document it.

- [x] **The git-spawning gate tests are not hermetic** (Mothership report 2026-09-25; fix AFTER the 0.47.0 persona re-test). When the pre-push hook runs from a LINKED git worktree, git exports GIT_DIR to the hook. `tests/tools/pushed-head.test.ts` (3 tests) and `tests/tools/untracked-gate-inputs.test.ts` (15 tests) spawn `git init` and `git commit` in temp dirs, inherit GIT_DIR, and act on the REAL repository. On the 0.47.0 release push they set `core.bare = true` in the main `.git/config` and committed "a" by t@example.invalid onto the worktree HEAD (repaired; nothing reached the remote). Fix: the tests' git helper removes GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE and GIT_COMMON_DIR from the child env, and the hook unsets GIT_* before it runs the suite. Proof: a test that runs the gate from a linked worktree and checks that the main repo is unchanged.

- [ ] **After 0.47.0: one release per tier, each DESIGNED and approved by Mothership before any code**
      (owner order 2026-09-25). No code before the design is approved.
      - [ ] After the criterion 3 study closes: switch the product's typed structural search (`rankByStructure` callers) to the residual-form canonical corpus, so user claims in residual form can match. Blocked while the Amendment 8 pins are live.
      - [ ] Tier 8 → 0.48.0 also: C1, probe-searchable frontier gaps (today `upt probe scan` lists 232 gaps, none searchable).
      - [ ] Tier 10 → 0.49.0: C3, cross-family `upt path`, with bound composition across families.
      - [ ] Tier 11 → 0.50.0: ROADMAP §8 hybrid retrieval: optional out-of-process embedding backend (qwen3-embedding:4b via Ollama), zero hard deps, fallback to atlas search, deterministic tests with a stub embedder plus the frozen study vectors; the live GPU evaluation waits for LLMBench's reservation to end.

- [x] **0.47.0 batch from the persona pass (Mothership ruling 2026-09-25).** One finding per commit;
      STOP and report before any release (0.47.0 is Mothership's).
      - [x] P: canonical prefactor table OUTSIDE the pinned `src/canonical` tree (entry id, exact prefactor, source quote + locator); L2 and L7 read it, so π-for-2π and a missing ½ report "differs by factor".
      - [x] D1: README links docs, `cli/README.md`, `examples/`, `data/bridge-catalog.json` that the npm package does not ship.
      - [x] D2: the `upt probe run --problem` file format is documented nowhere a user can read (types are `@internal`).
      - [x] D4: `upt evaluate` help says "~1.44 M_sun"; the output is 1.4559 (m_u, M☉ = 1.989e30).
      - [x] D5: `discover --derive` example values use 300 for every free variable, whatever its dimension.
      - [x] D6: `ab-spring-lc` states the m↔L, k↔1/C map only in witness text; its counterexample's L/C = 16 is unstated.
      - [x] F1: `--at` ignores unknown keys silently, and composite groups must be typed as the exact display string.
      - [x] F2: failed checks exit 0 (derive/map dimension mismatch, path with a violated horizon or regime, explain of an unknown name). BREAKING CLI change.
      - [x] F3: the default install pulls 36 packages / 48 MB through `optionalDependencies` for a "zero hard dependencies" package.
      - [x] Remove the deprecated `BridgeEquations.crossingResidual` (BE-35 single-block residual, no prefactors; superseded by `crossingEquation` in the F1 fix). A breaking change to the public API, so it waits for Mothership's release call.
      - [x] C2: probe with a dimensionless governing variable says "no dimensionally valid candidates", which is false.
      - [x] C4: `upt explain` answers an unknown name and a real uncovered quantity alike, and exits 0; say "not covered" plainly.
      - [x] C5: `upt probe falsify` prints no falsification batteries: find out whether it is a bug (fix) or not (defer).
      - [x] Tracker hygiene (owner order 2026-09-25, item 1): tick S6, the 2026-07-04 NEXT umbrella and the BRIDGE-PHYSICS-AUDIT row if every sub-item is done; re-scope or close "v0.11 headline"; close be-12 as won't-do; correct the stale Dependabot and Sprint-0 lines in NOTES.md. Leave the owner-kept groups open.
      - [x] C1, C3: record in ROADMAP §8 Future (probe scan has nothing searchable; `path` cannot cross families). Deferred by ruling.
      - [x] Release prep PR for 0.47.0 (Mothership order 2026-09-25): version bump, CHANGELOG `[0.47.0]` with a MIGRATION section, version-stamped artifacts regenerated. The tag, npm publish and GitHub release are Mothership's.

- [x] **Outside-user persona pass on 0.46.0 (2026-09-25): fix W1 and L1–L9 by severity** (Mothership;
      findings in the persona's `FINDINGS.md`, rulings by inbox 2026-09-25). One finding per commit.
      - [x] L1: `upt path` quotes a bound and "all hold" outside the bound's own regime (pendulum at θ0 = 0.8: bound 1.59%, true error 4.15%).
      - [x] L3: the discovery magnitude gate passes an anchor-invariant identity as evidence (λ_th(T_H) = 4π ℓ_P for every M).
      - [x] L5: `upt explain` calls two restatements of ONE bridge (be-42, be-42-via-rs) "independent derivations" and their agreement a consistency check.
      - [x] W1: `ab-kg-schrodinger` counterexample says "17% too high" (true excess 20.7%); the relative-error reference (the reduced model) is stated nowhere.
      - [x] L4: AXIS-CLASH is labelled "identification falsified" while the funnel counts 0 falsified; relabel as a regime-label prior (text only).
      - [x] L2: a user equation whose target and inputs match one canonical equation is compared with it at fixed points (prefactor agrees / differs by factor r / differs in FORM).
      - [x] L6: `upt confront` be-51 shows a derived deflection as "observed"; show γ_obs ± σ as the observation.
      - [x] L6b: BE-37/51/52 confrontations use G × 1.989e30 for GM☉; switch to the IAU 2015 nominal 1.3271244e20 m³ s⁻².
      - [x] L7: probe marks a corpus-equivalent candidate "not novel" without comparing its fitted prefactor with the corpus one.
      - [x] L8: `ab-stokes-einstein` states Re ≪ 1 and t ≫ m/γ in prose only; add machine inequalities (conditional: no frozen hash may move).
      - [x] L9: `upt path --at` prints only the domain supremum; add `deltaAt(point)` as "bound at this point", tested ≥ the exact error.
      - [x] Found during L7 (2026-09-25), NOT investigated, outside the W1/L1–L9 scope: `bun run test:probe-coverage` reports 0% on every file and "AssertionError: coverageFilesDirectory is required". Not in CI. Whether it also fails at the commit before L7 was not measured.
      - [ ] tree-sitter reports `src/cli/commands/path.ts` as UNPARSED ("parse error (tree-sitter reported ERROR nodes)"), and does so on master too. tsc compiles it. An unparsed file is invisible to the code-docs and dependency tooling, so their counts are silently incomplete. Found 2026-09-25 during F2. Fix after the 0.47.0 batch (Mothership).
      - [ ] Probe coverage is 94.53% statements against the 95% gate (measured 2026-09-25, once the provider was fixed). Lines 97.25%, functions 98.18%, branches 86.36% pass. Below 95% statements: generator.ts 82%, pipeline.ts 90%, residual.ts 90%, limits.ts 92%, metadata.ts 86%, fingerprint.ts 94%, problem.ts 94%, backend-protocol.ts 94%. Most predate this session; the gate went unmeasured while the provider was broken. Do NOT lower the threshold.

- [x] **Atlas Sprint 6 — study, scoped release, discovery hypothesis (IN FLIGHT).** **S6.1** — study
      orchestration (`bun run atlas:study`); refuses (exit 3) on the empty frozen set.
      **S6.2** — ablation: four cumulative configurations, paired step statistics.
      **S6.3** — link prediction: ONE result, hypothesis NOT supported (typed 0.70 vs text 0.80 recall@10).
      **S6.4** — versioned export: atlas.json + atlas.jsonld (URN ids, PROV-O, QUDT where it resolves).
      **S6.5** — `upt atlas`; count gate now sees the registry; regime/path search every family.
      **S6.6** — `docs/planning/Atlas-Governance.md` (maintainers, contested entries, small PRs, licensing).
      **S6.7** — `docs/planning/Atlas-API-Review.md`: recommendation only; decision with Mothership (ADR-level).
      - [x] Mothership decision on the atlas public API (Tier 1 promote y/n; namespace vs named; close the barrel gap).
      - [x] Close the atlas barrel gap (8 core names unreachable from the subpath).
      - [x] Teach `public-tag-vs-index-invariant.test.ts` the `export * as ns` form (prove it FAILS first).
      - [x] Promote Tier 1 as the `atlas` namespace facade.
      - [x] **Negative controls missing for 12 of 18 registered witnesses** — numeric (9 of 14): WD1, WS2,
        WS4, WD6, WD7, WD8, WS5, WS6, WS7; CAS (3 of 4): W2s, WD2s, WD5s. The S4.4 claim that every numeric
        witness had one was FALSE and is retracted (CHANGELOG "Corrections" 2026-09-22). Authorized by
        Mothership 16:43; each must be able to FAIL.
      - [x] Search the 8 Sprint 4 closure bridges against Physlib (were unsearched at S4.6): keyword search
        + NavierStokes.lean read, no counterpart.
      - [x] Fresh-environment reproduction (Phase 6 exit criterion): clean clone OUTSIDE the working tree, install, build, test, regenerate every published artifact, compare byte for byte; report every mismatch.
      - [x] Tier 1 ADR record: decision note in docs/, amend the ROADMAP "only if the study justifies it" sentence, and audit README + public docs for any claim that the atlas rejects invalid bridges better than alternatives (one commit).
      - [x] Master CI red at 0ae8cbf (PR #184): the `atlas-pendulum` CLI golden lacked the new `uniformity:` line; regenerated with `golden-capture.mjs`.
      - [x] Owner decision: a separate licence for the exported atlas DATA (today it falls under the repo's MIT `LICENSE`).
      - [x] Owner decision: sole maintainership across all atlas families accepted explicitly (governance note §1).
      - [x] Owner decision: the hosted frontier-LLM condition is NOT run and is out of scope (pre-registration Amendment 5; ROADMAP Phase 6).
      - [x] Owner decision: the "reviewer time reported" exit criterion is amended to NOT MEASURED (no independent human reviewers).
      - [x] `repo_map.py check . --docs docs/architecture` fails: hand-written counts in API, ARCHITECTURE, COMPONENTS, DATAFLOW, duplicate-symbols, FILE_INVENTORY and OVERVIEW are stale (e.g. 710 source files claimed, 842 actual), and COMPONENTS.md has no atlas section.
      - [x] Add the architecture-docs check (`repo_map.py check`) to CI under a name that matches its scope; prove it RED on master before fixing the docs.
      - [x] Drop `totalLinesOfCode` from the gated Verification table (Mothership 2026-09-23, option b); prove the gate passes a code edit without a docs touch-up and still fails on a structural claim.
      - [x] The architecture-docs gate runs in the pre-push hook only. CI cannot read `repo_map.py` (private `skills` repo) without a credential; the credential decision is with Mothership / the owner.
      - [x] `docs/architecture/` still carries release versions, "Currently" counts and 691 Simplified-Technical-English findings (`ste_check.py`) that the skill forbids; the ungated prose needs a full one-writer pass.
        - [x] Mark the 45 dated historical records with `<!-- ste:historical-record -->` (separate commit; never a canonical doc).
        - [x] FILE_INVENTORY.md to 0 STE findings, stateless.
        - [x] duplicate-symbols.md to 0 STE findings, stateless.
        - [x] DATAFLOW.md stale facts in diagrams and headings corrected against measurement (fact-fix commit, before the STE commit).
        - [x] Stale source JSDoc found during the DATAFLOW fact fix: `src/numerical/gl4-integrator.ts` header says "types + Butcher constants only" and `GL4Options` "lands in Task 3"; the `findPerihelion` `@example` calls `integrateGeodesicGL4` with a signature that does not exist.
        - [x] DATAFLOW.md to 0 STE findings, stateless.
        - [x] API.md: the `@public-new` tier aligned to the source — every such symbol is `@public` (Mothership decision (a), own commit).
        - [x] API.md stale facts corrected against measurement (fact-fix commit, before the STE commit).
        - [x] Stale source JSDoc found during the API.md fact fix: `inferDimensionForBridge` says bridge ids "11..50"; the catalog runs to 65.
        - [x] CODE QUESTION for Mothership: `KillingEquationOptions.tolerance` is documented as "Maximum tolerated residual ... Default 1e-10" but `verifyKillingEquation` never reads it (it returns the raw residual). Remove the option, or make the function use it?
        - [x] Add `checkKillingEquation` → `{ residual, withinTolerance }` honouring `KillingEquationOptions.tolerance` (default 1e-10); `verifyKillingEquation` unchanged; fix the tolerance docs (Mothership decision (c)).
        - [x] Stale source JSDoc found during the DATAFLOW audit: `lowerCurvature` (`src/numerical/lowering.ts`) says `CURVATURE_KIND_REGISTRY[node.kind]` supplies the per-kind spec; the code never reads the registry.
        - [x] DATAFLOW.md follow-up fact fix: the 17 FALSE claims from the full-claim audit, each re-verified against source (likely bugs filed as code questions).
        - [x] API.md to 0 STE findings, stateless.
        - [x] API.md fact fix: `DuplicateCoordinateWarning` is documented as appearing in `NumericalResult.warnings`; validation throws `MetricSignatureError` by default and emits the warning (a process warning) only with `UPT_ALLOW_COORD_SHADOW=1`.
        - [x] Stale test header: `tests/bridges/dimensional-signature-catalog.test.ts` says only BE-11 and BE-14 have AST encodings; `BRIDGE_RHS_BY_ID` holds 42.
        - [x] `tools/create-dependency-graph`: an opt-in per-export API-surface report (signature, async, stability tag, root reachability) in its own module, with tests; existing outputs byte-identical without the flag.
        - [x] OVERVIEW.md fact fix: full-claim audit against source (fact-fix commit, before the STE commit).
        - [x] OVERVIEW.md to 0 STE findings, stateless.
        - [x] `src/cli/graphs.ts` labels the catalog source `catalog (44-bridge)`; the catalog holds 55 (user-visible CLI string; check the goldens).
        - [x] ARCHITECTURE.md fact fix: full-claim audit against source (fact-fix commit, before the STE commit).
        - [x] ARCHITECTURE.md to 0 STE findings, stateless.
        - [x] Stale source comments found by the ARCHITECTURE audit: `src/dimensional/validator.ts:10-11` says special-function arguments are not yet checked (line ~653 checks them); `src/dimensional/metric.ts:35-39` says `'computed'` auto-differentiates the metric (lowering treats it as constant).
        - [x] COMPONENTS.md fact fix: full-claim audit against source (fact-fix commit, before the STE commit).
        - [x] COMPONENTS.md to 0 STE findings, stateless.
        - [x] DEPENDENCY_GRAPH.md findings fixed at the SOURCE module doc comments, then regenerated.
        - [x] The 5 living docs (PHYSICS_MAP, benchmarks, bridge-gradient-tutorial, intelligent-index-tutorial, archive/README): full-claim audit, fact fix and STE pass each.
      - [x] Rename the `@internal` atlas `AdjudicationVerdict` (a bridge-membership verdict) so it no longer shares a name with the public composition `AdjudicationVerdict` (`duplicate-symbols.md`).
      - [x] `repo_map` files `tests/tools/plan-doc-audit.test.ts` in the `tools` zone because the path contains `tools/`; report to the `skills` repo owner.
      - [x] Found by EVO custody (Starship): the Physlib `formalRef` review for `ab-pendulum-linear` rests on two probe files that no repo holds — `AxiomProbe.lean` (`#print axioms` over six theorems) and `HoleProbe.lean` (the deliberate-`sorry` positive control). Each was untracked in `%TEMP%\physlib-src` at `physlib@5ad56e24`; a copy is in `~/Dropbox/_fleet/reviews/physlib-probes-20260922/`. Commit both probes, with the re-run recipe, into this repo so the review can be repeated.
      - [x] Local gates and generators read UNTRACKED files: an untracked `tests/tmp/differential.test.ts` (a PR #133 differential check whose writer is not on this machine) broke the pre-push typecheck (`tsconfig.tests.json` compiles `tests/**/*`), and `bun run docs:deps` recorded it in `test-coverage.json` and `TEST_COVERAGE.md`, so a commit's generated docs disagreed with the tracked tree and with CI. Make `create-dependency-graph` enumerate tracked files (`git ls-files`, as `repo_map` does) and keep scratch out of the typecheck (gitignore and exclude a scratch dir, or move the convention out of `tests/`); prove each RED with a stray file first.
      - [x] Found by the formalRef-gate review: `formal/physlib/HoleProbe.lean` puts its `sorry` in the probe file, so the control shows the gate detects a hole in the file it runs, not a hole inside an imported prebuilt module (where every probed theorem lives). Add a second control that compiles a small module with a `sorry` and imports it, then prove the gate goes red on it.
      - [x] Shapiro delay is the FOURTH classic GR test, not one of three: fix the Phase 2 exit-criterion wording in `ROADMAP.md`, `OVERVIEW.md` and `docs/research/README.md`, add a correction note to the dated `docs/research/pi-instrument-results.md`, and document what the public `'rank-3-lower'` tag means (Mothership 2026-09-23).
      - [x] Record the owner-delegated amendments (Mothership, 2026-09-23): curation cost per bridge NOT MEASURED, model cost reported as model cost (Phase 0, Phase 4, C6); kappa reported is MODEL agreement, human kappa NOT MEASURED; C5 human time NOT MEASURED. Write them as ROADMAP section 7 updates and pre-registration Amendment 6. No threshold, item or hash change.
      - [x] Phase 0 review of the five pilot contracts through the CONTRIBUTING.md review surface by a Fable physicist persona (approved by Mothership), recorded as "model-persona review (Fable), not a human physicist".
        - [x] Phase 0 persona finding D1: `ab-spring-lc` / `ab-spring-rlc` `preserves: natural frequency` is false as written; state the spring→LC map. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D2: `dampedOffsetBoundAt` ignores `k` and `x0`; violated 22x at `k = 100` inside the declared regime. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D3: the cubic-spring rejection reason overreaches W3; add an isochrony (period-vs-amplitude) witness. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D4: `error-algebra.ts` header writes `f̃(x)` for `f̃(x̃)`. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D5: chain→wave `preserves: 'linearity'` has no witness. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D6: the cubic-spring rejection lists `model-lc` as both premise and conclusion. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D7: Phase 0 design note states a stale composite bound `(1, θ0²/16)`. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding D8: the pendulum `horizonHolds` uses the series where the exact period function exists. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding Q-a: W1b tests `x0·u/x0 = u` and cannot fail. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding Q-b: W9 compares two formulas and never integrates the chain. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding Q-c: the pendulum bound `K = 1` is declared, not derived. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding Q-d: the damped-massless domain is the overdamped set, not the asymptotic regime. Disposition in `docs/research/phase-0-model-persona-review.md`.
        - [x] Phase 0 persona finding Q-e: the pendulum horizon uses the π/2-drift time, a quarter of the full-lap time. Disposition in `docs/research/phase-0-model-persona-review.md`.
      - [x] Phase 1 citation spot-check of a random sample of `// source:` citations against the CITED SOURCES by an Opus agent with the papers (approved by Mothership), recorded as "model check with source access".
        - [x] Phase 1 citation finding C1: BE-11 comment attributes "a coarse-graining, not a limit" to Breuer & Petruccione, who frame it as a weak-coupling limit. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding C2: BE-21 comment says KSS state the bound in ħ = k_B = 1; KSS state it with units restored, give the SI value, and call it a conjecture. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding C3: BE-52 comment says Einstein derived Δφ from the Schwarzschild orbit equation (he used successive approximation); `references[]` Carroll §7.4 is lecture-notes numbering. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding C4: BE-55 comment says σ_xy = Ce²/h does not carry over to Gaussian units; it does. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding C5: BE-58 comment says Nyquist states the result for SI quantities; the paper states no units. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding C6: BE-59 Josephson 1962 could not be read (paywall); only the Nobel Lecture was checked. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding X1: BE-51 cites Einstein 1915 p. 844 (the field-equations paper) for light deflection, which is on p. 831ff. Disposition in `docs/research/phase-1-citation-check.md`.
        - [x] Phase 1 citation finding X2: BE-21 catalog name says "universal lower bound"; KSS call it a conjecture (name is verbatim spec text). Disposition in `docs/research/phase-1-citation-check.md`.
      - [x] Check the 9 unsampled `// source:` comments in `src/bridges/index.ts` against their sources (the sample found 5 of 6 overclaiming; Mothership to decide).
      - [x] Mechanical quote-match pass (Mothership ruling 2026-09-24): every quoted span in the 15 `// source:` comments exact-matched against the downloaded source text (whitespace and hyphenation normalised only), every page and equation number confirmed, BE-11 marked snippet-only and C6 marked unread; a re-runnable script, its output stored with `docs/research/phase-1-citation-check.md`; then record Phase 1 "zero fabricated assumptions" MET or fix and rerun.
      - [x] Criterion 3 step 1 (Mothership 2026-09-24; spec Dropbox/_fleet/specs/2026-09-24-upt-criterion3-design.md §3, §4, §9): export the blind-labeler inputs `corpus.json` (canonical L-layer at a pinned commit; text = name + domain + assumptions, expr = scalarAst; no partnerBridges/restatesBridge/model or other atlas-naming field) and `queries.json` (the 125 frozen items; text = premises + conclusion, expr; no verdict, split, authorship or source), a leakage report, SHA-256 freeze, the export script with tests, and a copy to Dropbox/_fleet/c3/. No labelling, no condition run, no amendment.
      - [x] Criterion 3 step 3 (after Mothership returns the blind labels): write the pre-registration amendment with the corpus hash, label hash, exclusions and embedding model BEFORE any condition runs. Per Mothership's ruling (2026-09-24), it must disclose in one sentence that all 3 query texts containing the word "valid" are valid items; the verdict is never a label and never scored, so the frozen text stays untouched.
      - [x] Census finding F1: BE-35's encoded residual `R_cross = C²·[g_block(u,v) − g_block(v,u)]` (`src/bridges/equations/be-35-conformal-bootstrap.ts`) omits the `v^d` / `u^d` prefactors of the crossing relation (Rattazzi et al. 2008, eq. 4.3), and crossing holds for the SUM over exchanged operators, not for one block. Decide: re-encode, or state in `known_issues` that the residual is a schematic stub.
      - [x] Phase 4 formalRef SCOPING REPORT (Mothership 2026-09-24; no code): reconcile the ROADMAP formalRef definition (external checked statement, reviewed fidelity, proof out of tree) with the §7 row's "the proofs need PhysJS"; the existing reviewed formalRef; what PhysJS is; per bridge (all 20), whether an external checked statement already exists (Physlib, Mathlib, other) with theorem and version, or none found and where looked; fidelity-review cost for the best 4+; say plainly if fewer than 4. Write docs/research/phase-4-formalref-scoping.md, commit, CI, summary to Mothership.
      - [x] Criterion 3 EMBEDDING condition (Mothership 2026-09-24 20:17, GPU free): pre-registration Amendment 11 registers the model (qwen3-embedding:4b, LLMBench class 6 best on search), its digest, the query instruction, the pinned code and the frozen vector-file hash BEFORE any score; then score, a second embedding pass for variance (disclosed, not scored), and the §6 item 3 verdict.
      - [x] Amendment 12: record the owner's DONE decision (2026-09-24 21:29: accept the NOT MET verdicts; hybrid retrieval as future work), the §7 header line, and a ROADMAP Future entry.
      - [x] Prepare release 0.46.0 (Mothership 2026-09-24; no tag, no GitHub release, no publish): bump every version site, CHANGELOG [0.46.0], full gate plus npm pack --dry-run, commit, push, CI.
      - [x] Pre-push gate refused every ANNOTATED tag (Mothership 2026-09-24, found when the v0.46.0 tag push was refused): it compared the raw local sha from stdin with HEAD, and an annotated tag arrives as its TAG-OBJECT sha. Moved the check to `tools/gate-inputs/pushed-head.ts`, which peels each sha to its commit; 4 tests, proved RED by reverting to the raw comparison. This row was filed with the fix, not before it.
      - [x] CHANGELOG "Deprecated" entry for `evaluateCrossingResidual` / `BridgeEquations.crossingResidual` (Mothership ruling 2026-09-24): say it is physically WRONG (it tests nothing), keep it deprecated for the next release, and name the release after that as the removal release.
      - [x] Rewrite the spec Part-II BE-35 sum-rule text to Rattazzi's F, a crossing combination of one block (Mothership ruling 2026-09-24; do it with F2).
      - [x] Criterion 3 step 4 (Mothership 2026-09-24): AFTER the step-3 amendment is committed and CI green, run the three in-process conditions (text retrieval, symbol matching, typed structural search) on PRIMARY (n=50) and SECONDARY (n=64); recall@10 with Wilson intervals, per family, fluid statics (held out) separately; write docs/research/atlas-study-results.md marked INTERIM (no criterion verdict: the embedding condition waits for LLMBench).
      - [x] Criterion 3 EXPLORATORY corrected structural condition (Mothership ruling 2026-09-24 (b)): normalise both sides to residual form (query lhs − rhs as stored; canonical target − scalarAst) in the code, TDD RED first; no symbol-alias map (the naming gap is a stated limitation); Amendment 9 (POST HOC, EXPLORATORY, pins the corrected code, same truth sets and pool, reported beside the criterion and never substituted) committed and CI green BEFORE the condition runs; then run on PRIMARY and SECONDARY and add it to atlas-study-results under INTERIM, separated.
      - [x] Census finding F2: BE-48's `name` ("CSL extension", verbatim spec heading) and `context` ("GRW / CSL mass-amplified") credit the linear law λ_0 (m/m_0) to CSL; Bassi & Ghirardi 2003 give it for GRW/QMSL (§6.4) and a different CSL rate (§8.3). `notes` carry the same framing as history.
      - [x] Triage the stale open rows outside the atlas roadmap (lines 654, 658, 830-844, 943, 985 and the optional rows); tick parents whose children are all done, box only.
      - [x] Found by the COMPONENTS.md review: `src/numerical/lowering.ts:395-396` holds an orphaned doc comment ("Lower a validated ExprNode to an EngineTensor. @internal") that documents `DeferredEvaluatorEntry` instead of `lowerNode`. It describes `lowerNode` (line 447), which has no doc comment and so no `@internal` tag; move the comment back onto `lowerNode`.
      - [x] Found by the COMPONENTS.md review: `src/composition/bridge-prediction.ts:190` writes two raw NUL bytes inside template literals as a pair-key separator, so grep prints 'Binary file … matches' instead of the matching lines, and ripgrep skips the file. Write the separator as an escape (`\u0000`).
      - [x] Flaky test CAPTURED (2026-09-23, pre-push gate for `e1b7bea`): `coverage-backfill.test.ts` "reports worker stderr on nonzero exit" gives `runBackendWorker` a 1000 ms budget that includes spawning `node`; a bare spawn measured 843–4307 ms on the loaded host, so the timeout fires first. The exit-path siblings in `backend.test.ts` use 5000 ms and race the same clock. Remove the race (a timeout far above spawn cost on exit-path tests, or a timeout that starts after spawn), then prove it RED under load and GREEN after. Details in `NOTES.md`.
      - [x] Found by the living-docs review: the header comment of `bench/be37-eikonal.bench.ts` (lines 10–14) still describes the BE-37 stub that `src/` replaced with a GL4 integration.
      - [x] Found by the COMPONENTS.md audit, source comments that contradict the code: `ast-types.ts:139` (`RicciTensorNode` "first two slots are contracted", but `ricci()` computes R^λ_{μλν}); `einstein-equation.ts:136` example uses kind `'stress-energy-tensor'` (real kind `'stress-energy'`); `curvature-composite.ts:31` says Bianchi is "rank-5 lower" (its registry says `'rank-3-lower'`); `klein-gordon.ts:102` imports a subpath `package.json` does not export; `BridgeEquationEntry.id` documented as "11-50".

- [x] **Atlas Sprint 5 — the invalid-bridge benchmark (CODE COMPLETE; κ criterion open).** Promoted in `docs/planning/ACTIVE.md`
      2026-09-22; design note `docs/planning/Atlas-Phase-5-Design.md`. **S5.1** — schema, loader,
      leakage checks (renamed variants keyed by dimension; held-out family corrected to FLUID STATICS).
      **S5.2** — atlas condition runner (accept only when every instrument ran and cleared).
      **S5.3** — deterministic baselines (text, symbol, structural) + recall@k + backend shapes.
      **S5.4** — Wilson / McNemar / κ / Newcombe paired interval / power report.
      **S5.5** — pre-registration REGISTERED (thresholds + held-out family frozen; empty-set hash bound by test).
      - [x] Check `pairedDifferenceInterval` (Newcombe method 10) against a PUBLISHED worked example;
        today it is pinned by properties only.
      - [x] **Frozen item set needs INDEPENDENT human authors and two named κ raters.** No agent may
        author a frozen item; until authors exist, Phase 5's "κ reported" exit criterion cannot be met
        by code. Route to the user via Mothership.
      - [x] Model-authored frozen set (owner 2026-09-22: "use a fable model"): isolated atlas-blind author, label-blind encoder.
      - [x] Two independent model raters (separate isolated instances) and Cohen's kappa, reported as MODEL agreement.
      - [x] Freeze the set; the empty-set hash test must go RED before the note is amended.
      - [x] First run of the study success path on the non-empty set; fix what breaks.
      - [x] Criterion 2 on LOCAL models only (user 2026-09-22: "$0"): pre-register the run config (Amendment 4) and commit it BEFORE any call.
      - [x] Run the local LLM baselines (qwen3.8:27b, gemma4:26b, gpt-oss:20b) on the frozen public items; score atlas vs the pre-registered best baseline.
      - [x] gemma4:26b returned an EMPTY answer on 64/125 items under the frozen `num_ctx` 8192 (its reasoning filled the context). Decide with Mothership whether a clearly-labelled secondary run with a larger context is worth an amendment; the primary result stands as run.
      - [x] Fix the code-docs M3 at `src/bridges/equations/_be-helpers.ts` (`validateBEDimensions` documents `equationLabel`; the parameter is `_equationLabel`) and lower the ratchet baseline.
      - [x] Criterion 3 (recall@10 vs embeddings) cannot run on the set as built: it needs a reference corpus and atlas-blind correct-reference labels. Design the task first.
      - [x] DEFECT: the PUBLIC item schema carries the answer (`kind`, `failureKind` in `BenchmarkItem`), against its own
        "never the answer" docstring. The atlas condition never reads them; an LLM or embedding condition fed
        `public/items.json` would see the key. Fix before any out-of-process condition runs: move both to the scorer half.
      - [x] `CLAUDE.md` is 21 KB and holds law, procedure and stateless facts that now have homes in `AGENTS.md`,
        `WORKFLOWS.md`, `TOOLS.md` and `MEMORY.md`. Move each duplicated fact to its one home and leave `CLAUDE.md` a thin loader.
      - [x] Move `docs/planning/ACTIVE.md` (an authorization register, status by nature) out of `docs/planning/`; fix every inbound link in the same commit.
      - Closed by pre-registration Amendment 6 (2026-09-23): κ amended. The reported κ is MODEL agreement; human κ is NOT MEASURED.

- [x] **Atlas Sprint 4 — verification workflow and checked bridges (CODE COMPLETE; formalRef exit OPEN at 1/5).** Promoted in
      `docs/planning/ACTIVE.md` 2026-09-22; design note `docs/planning/Atlas-Phase-4-Design.md`.
      Eighteen tasks assigned to this lane: **S4.1–S4.6, S5.1–S5.5, S6.1–S6.7.**
      **Done so far: S4.1** — `src/atlas/applicability.ts`, the applicability checker (dimensions,
      conventions, side conditions, model compatibility), findings not a boolean, two severities
      that do not collapse. **S4.2** — `witness-symbolic.ts` / `witness-numeric.ts` /
      `witness-result.ts`: injected simplifier (`null` = absent peer), `unresolved` with a required
      reason for every non-answer, two-resolution `convergence`. **S4.3** — `FormalRef`, the
      committed `data/atlas/witness-results.json` (Lead-run `bun run atlas:witness-results`),
      `formally-proved` / `symbolically-checked` derived only, file allow-list lint.
      **S4.4** — `src/atlas/diffusion/` (4 models, 3 bridges: coarse-graining, exact-equivalence,
      analytic-continuation), witnesses WD1–WD3 with measured convergence; gates iterate
      `ATLAS_FAMILIES`.
      **S4.6** — one `formalRef` (`ab-pendulum-linear` → Physlib `linearizedEquationOfMotion_iff`,
      axioms measured); every other bridge searched and reported without one.
      **S4.5** — `src/atlas/waves/` (6 models, 4 bridges incl. the Euler + EOS → sound hyperedge).
      - [x] **Sprint 4 exit criterion "≥ 20 bridges" is OPEN at 12 — NOT cut** (measured cost makes 20
        reachable; the plan's briefs name only 12). Add eight witnessed bridges before Sprint 4 is
        declared complete. "≥ 5 relation types" is met (6).
      - [ ] **Sprint 4 exit criterion "≥ 5 bridges with a reviewed `formalRef`" is OPEN at 1.** Physlib
        holds no further real counterpart (S4.6 table in the Phase 4 design note). Closing it needs
        proofs authored OUT OF TREE, meaning a new repository, which is outward-facing: escalated to
        Mothership.
        - deferred - owner 2026-09-24 15:02 (pre-registration Amendment 10; the PhysJS proofs with it).
      **Standing trap for anyone picking this up:** the plan says the canonical-equation count
      "lives only in `CHANGELOG.md`, `ROADMAP.md` and the architecture docs". **It is in 22
      files.** `tests/canonical/canonical-count-prose.test.ts` DISCOVERS them; trust the gate,
      never the list.
      - Closed by pre-registration Amendment 10 (2026-09-24): the formalRef exit criterion is deferred by the owner, at 1 of 5.

- [x] **Atlas Phase 0 — two exit criteria OPEN; the code is done.** Shipped 2026-09-20 on
      `master`: `src/atlas/` (nine models, five typed bridges, one rejection, fifteen witnesses),
      126 atlas tests inside 384 files / 3,959 tests exit 0, deterministic JSON under
      `data/atlas/`, nothing on `src/index.ts`. **What is NOT done, and neither is code:**
      (a) **independent physicist review** — now item 0 of `CONTRIBUTING.md`'s physics-review
      list, and it needs a person who is not the author; (b) **curation cost was measured per
      AGENT, not per bridge** — `ROADMAP.md` §L0.2 wants per-relation-type hours to scope
      Phases 4 and 5, and the pilot dispatched work per agent, so those rows were never
      instrumented and `docs/planning/Atlas-Phase-0-Curation-Cost.md` declines to estimate them.
      The supported finding is that relation type did NOT drive cost here — specification
      quality did; both costly defects were in the plan, not in a bridge.
      **Sprint 1 is deliberately not promoted in `ACTIVE.md`** until someone decides whether the
      per-agent figure is good enough or Sprint 1 re-measures per bridge.
      **Also fixed 2026-09-20:** `master` had been CI-red for nine commits on `docs-fresh`. Root
      cause was NOT in this repo — local `node_modules` carried js-yaml 5.2.3 while `bun.lock`
      resolves 5.4.2, and the two quote `": "`-bearing strings differently, so the committed
      `dependency-graph.yaml` could never match CI's regeneration. Green at `082af58`.
      **Standing lesson: an idempotent generator run is not a correct one** — regenerate after
      `bun install --frozen-lockfile`, or the artifact is a function of whatever happens to be
      installed.

- [x] ✅ **Scientific Bridge Discovery v1 plan re-vet — DONE 2026-08-19
      (docs only).** Second, codebase-grounded audit of
      `docs/planning/Scientific-Bridge-Discovery-v1.md` against the v0.44.1
      tree. First-pass rewrite still collided with the shipped identification
      funnel (`upt discover` / `VettedCandidate`, 132/7/35/20/0/70 pins, 0/8
      genuine), flat CLI, graph-structural identifiability, PI-instrument
      not-build ceilings, `normal-form.ts` / `observations/types.ts` /
      `uncertainty.ts`, `Future-Production-Hardening.md` viz parking lot, and
      “no Python / zero hard deps.” Plan corrected in place: Product A frozen,
      Product B under `src/composition/probe/` + `upt probe`, Family A vs B
      benchmarks split, MHC/holdout with the first generator, Tranche A is
      hand-authored fixture scoring not pendulum generation. Record:
      `docs/planning/Scientific-Bridge-Discovery-v1-AUDIT.md`. **Referenced in
      `ACTIVE.md` for context; no individual phase promoted as active engineering
      work yet.** No code behavior change.

- [x] ✅ **Scientific Bridge Discovery Product B implementation — DONE 2026-08-19.**
      Experimental `src/composition/probe/` + `upt probe` + subpath
      `universal-physics-tensor/probe`. Product A (`upt discover`) untouched.
      Family B fixtures, MHC/holdout, budgets, corpus-relative wording, NDJSON
      worker protocol (no Python). Probe-module coverage: statements 95.06% /
      lines 98.5% / functions 96.62% (`npm run test:probe-coverage`). Integration
      note: `docs/planning/Scientific-Bridge-Discovery-v1-Integration.md`.
      Still not a release-blocking `ACTIVE.md` item (experimental).

- [x] ✅ **`upt confront` rigor hierarchy — DONE 2026-07-05.** PI investigation
      characterized the 19-bridge spine by test precision: 7 stringent (≤0.5%) / 3
      moderate (~1-5%) / 9 loose (≥10% / one-sided / order-of-mag). Precision core is
      now the metrology triangle (QHE 8.6e-11, Josephson 1e-9, JNT 5ppm) — tighter than
      GR; astrophysics all in the loose tail. CLI tags each line [stringent|moderate|
      loose] + distribution header; --json rigor field + rigorDistribution. Library:
      `CONFRONTATION_RIGOR`/`confrontationRigor`/`rigorDistribution` (author-declared,
      anti-inflation cross-checked). Flagship note updated. Gate 3677 + DGT clean.

- [x] ✅ **Symmetry-axis gating TEST — DONE 2026-07-05 (measured null).** Tested whether the
      Symmetry axis can gate the discovery funnel (the one ungated axis a sweep suggested
      might fire — conformal exponents vs gauge couplings at dimensionless). Tagged 6 graph
      quantities (sourced: gauge/poincare/conformal), re-ran the audit → **symmetry
      checked=0, fires=0**: zero funnel candidates carry a symmetry tag (the quantities are
      already-anchored, not the unconnected coincidences the funnel proposes). The rank-7
      ceiling now holds across ALL three ungated axes with a unified mechanism (funnel
      candidates never carry topology/statistics/symmetry). Note: `docs/research/rank7-axis-
      measurement.md`. Gate 3673 + DGT clean. **Conclusion: the rank-7 axes classify but do
      not gate — a discovery-gating axis would need physics the monomial catalog lacks.**

- [x] ✅ **Astrophysics bridge cluster BE-63…65 — DONE 2026-07-05.** Second branch-physics
      expansion (spine-focused). 3 established data-confrontable bridges: BE-63 Chandrasekhar
      mass, BE-64 Eddington luminosity, BE-65 Jeans mass — all consistency-with-caveat.
      Catalog 52→55, established 16→19, spine 16→19. **Vet did its job:** BE-66 TOV
      DEFERRED unanimously (EOS-dependent, not a single-constant bridge — dropped, not
      fabricated). Adam/Eve YELLOW/YELLOW-RED/GREEN-mixed; all confrontations carry honest
      caveats (super-Chandrasekhar / super-Eddington / Jeans-mass-problem). Spine-focused:
      no new-axis population (Symmetry stays untested for a future particle-physics cluster).
      Gate + DGT clean.
    - Next candidate cluster (if continuing): **particle/electroweak** (Schwinger anomaly,
      weak mixing angle) — the one branch that would TEST the Symmetry axis.

- [x] ✅ **Condensed-matter bridge cluster BE-59…62 + measured rank-7-axis ceiling —
      DONE 2026-07-05.** First branch-physics expansion (Approach C). 4 established
      data-confrontable bridges: BE-59 AC Josephson (completes the metrology triangle),
      BE-60 fractional QH (anyonic+chern), BE-61 Wiedemann-Franz, BE-62 BCS gap. Catalog
      48→52, established 12→16, spine 12→16. Adam/Eve vet GREEN/GREEN/GREEN-YELLOW/GREEN-
      YELLOW (BE-61/62 statistics tags STRIPPED; confrontations carry honest caveats).
      **Anti-inflation result:** axis audit shows topology/statistics `checked=0, fires=0`
      — predicted from grounding (no fermion↔boson same-dimension pair in 131 graph
      quantities), then measured. The rank-7 axes classify but do NOT gate. Note:
      `docs/research/rank7-axis-measurement.md`. Gate + DGT clean.

- [x] ✅ **`upt explain <be-NN>` helpful redirect — DONE 2026-07-05.** PI CLI
      investigation found bridge ids are graph *edges*, not quantity *nodes*, so
      `explain` always hit a bare "no derivation path". Now redirects tailored by
      grounding tier (closed-form → named; graph-computable → `upt map`; confronted →
      `upt confront`; be-57 honestly says no confrontation). `--json` bridge-redirect
      envelope. Gate 3635✓, DGT clean. `src/cli/commands/explain.ts`.

- [x] ✅ **Extensible tensor-axis type system (rank-N) — DONE 2026-07-05.** Scaffolding
      for expanding UPT into more branches of physics. `src/composition/axes.ts` registry
      (typed unions + `AxisSpec`, `GATE_AXES` derived); typed the untyped **Topology**
      axis + a new 7th **Quantum Statistics** axis; wired symmetry/topology/statistics
      into `RegimeAttributes`; falsifier now registry-driven. `axis-audit.ts`
      (`auditAxisDiscrimination`) is the anti-inert-metadata gate — measured scale/force
      fire (75/29), new axes `checked=0` → correctly ungated. 2 sourced tags demo the
      wiring. Gate 3630✓ (clean re-run; 4 flaky CLI-golden timeouts under load), DGT
      clean. Design: `docs/superpowers/specs/2026-07-05-extensible-tensor-axis-system-design.md`.
      **Next (each its own effort):** add branch bridges/laws → re-run the audit → flip
      the gates the measurement earns.

- [x] ✅ **Four established data-confrontable bridges BE-55…58 — DONE 2026-07-05
      (`0f31b4d`).** A PI audit found the catalog 82% speculative with the Topology
      axis nearly empty; these rebalance it. BE-55 quantum Hall (populates the
      Topology axis; universality 8.6e-11), BE-56 Casimir (~1%, systematics
      caveat), BE-57 Unruh (deferred — unmeasurable), BE-58 Johnson-Nyquist
      (0.81σ). Catalog 44→48, established 8→12, evidence spine 9→12. Adam/Eve vet
      GREEN/GREEN-YELLOW/DEFER/GREEN (reviewer MCP disconnected mid-task +
      reconnected — vet ran before encoding). Verification caught a 10× σ error in
      BE-58 (8.1σ→0.81σ). Gate 3622/338; DGT clean. Design:
      `docs/superpowers/specs/2026-07-05-four-established-bridges-design.md`.

- [x] ✅ **`ncc` build tool assessed — NOT adopted (2026-07-05).** Owner asked to
      investigate using danielsimonjr/ncc (a @vercel/ncc fork) to build UPT.
      Empirical `ncc build` on the CLI entry: 5.6MB / 19-file bundle for a
      zero-dep library, inlined the optional peers (@viz-js/viz WASM + mathts-*)
      that must stay external for graceful degradation, and the bundle didn't
      run. ncc is for CLIs/serverless with heavy dep trees; UPT is a zero-dep ESM
      library (subpath exports + full .d.ts + optional peers) — bundling destroys
      all of that. `tsc → dist/` stays. Documented in CHANGELOG [Unreleased].
- [x] ✅ **API.md canonical-registry gap closed (2026-07-05).** The ~23
      canonical-registry exports (CANONICAL_EQUATIONS, normalForm, classifyLinkage,
      …) now have a §12 section; all verified present in `src/index.ts`.

- [x] ✅ **Architecture-docs NARRATIVE refresh — DONE 2026-07-05.** The 5 core
      arch docs (ARCHITECTURE, COMPONENTS, OVERVIEW, API, DATAFLOW) were ~12
      releases behind in prose; refreshed to reflect the v0.28–v0.40 program (CLI
      overhaul, discovery-hardening, `upt confront` evidence spine → 9,
      epistemic-grounding ledger, canonical 66→103, PI-instrument reframing,
      be-36 caveat). Version-pin headers removed (no-version/date convention);
      `cli/` module row added; API exports verified against `src/index.ts` (no
      fabrication); DATAFLOW Flow 10 (confront) + Flow 11 (discovery+grounding)
      added. Done by 5 parallel agents under a no-fabrication mandate,
      lead-reviewed against source/CLI (2 agent misses caught + fixed). 603
      insertions across 5 docs. Code itself remains clean per the DGT (0 cycles /
      0 unused / 0 dead exports / 98.3% coverage).

- [x] ✅ **BE-36 one-sided caveat honesty fix — DONE, `[Unreleased]`
      (2026-07-04, `f4f2046`).** A PI review of the evidence spine's rigor
      found `upt confront`'s be-36 "not excluded ✓" was a ONE-SIDED pass: the
      symmetric encoded GW170817 bound (|Δc/c| ≤ 10⁻¹⁵) is consistent with the
      observed +side (+6.5×10⁻¹⁶) but the observed −side (−3.1×10⁻¹⁵) exceeds
      it. The caveat already lived in the provenance note but not the summary
      line a reader skims. Fix: an optional `caveat` field on the
      `upper-bound` outcome (also under `--json`), rendered after the
      not-excluded verdict; no verdict change (the +side genuinely is not
      excluded). Gate 3600/334; DGT clean; confront golden + catalog-json
      regenerated; 2 new confront tests (text caveat + `--json` field).

- [~] 🟢 **KEEP GROUNDING — grow the evidence spine on open established bridges**
      (owner-directed 2026-07-04). Confront one open established bridge per
      increment with real published data (design → Adam/Eve number-vet → build →
      gate → DGT), the BE-21/BE-35/BE-51 pattern. Ships to `[Unreleased]`.
      - [x] ✅ **BE-11 (decoherence master eq) DONE — RELEASED v0.39.0**
            (registry-verified, `dc9ec2e`). Collisional decoherence of C70
            (Hornberger 2003): parameter-free theory reproduces the p₀ of 9 gases
            within ~15%. consistency-kind; spine 8→9; gate 3598/334; DGT clean. **Honesty save: both reviewers FABRICATED cross-sections; the
            arXiv primary source (quant-ph/0303093) caught it** — numbers verified
            against the paper, not the vet. Design:
            `docs/superpowers/specs/2026-07-04-be11-decoherence-confrontation-design.md`.
      - **Remaining open established bridges are the HARD ones** (the easy
            confrontable targets are now spent): BE-34 (Kibble-Zurek — only the
            lab scaling is confrontable, the bridge's curved-spacetime content has
            no data), BE-40 (composite Higgs — BSM, no clean LHC confirmation),
            BE-53 (Yang-Mills β — deferred, needs a proper multi-threshold QCD
            running code). Each needs its own defer/build judgment; do NOT force a
            confrontation on a bridge whose confrontable content is speculative.

- [x] ✅ **BE-35 conformal-bootstrap confrontation — evidence spine 7→8,
      RELEASED v0.38.0 (2026-07-04, registry-verified, `d7cf838`).** The "better option" after the 0/7 connector adjudication:
      grow the evidence spine with real data instead of decoy edges. Confronts
      the bootstrap 3D-Ising ν = 0.629971(4) (KPSV16) vs experimental ν = 0.630(2)
      (Pelissetto-Vicari 2002, fluid critical points) at 0.015σ. Adam+Eve GREEN;
      vet enforced EXPERIMENTAL (not Monte-Carlo — bootstrap-vs-MC is
      theory-vs-theory) + the honest "coarse experiment can't stress-test the
      bootstrap" caveat. value-kind; gate 3595/333; DGT clean. Design:
      `docs/superpowers/specs/2026-07-04-be35-bootstrap-confrontation-design.md`.
      Remaining open established bridges: BE-11 (decoherence), BE-34 (Kibble-Zurek,
      curved-spacetime content has no data), BE-40 (composite Higgs, BSM), BE-53
      (deferred). BE-35 was the cleanest confrontable target.

- [x] ✅ **"Build the connectors" — adjudicated 0/7 genuine (2026-07-04).** Owner
      asked to build the isolated-bridge connectors; the raw `upt connectors`
      surface is a decoy review queue, so encoding it as-is would fabricate
      coincidences + breach the firewall. Honest path (owner-chosen): ran the 4
      most-motivated candidates (RT ≟ Bekenstein–Hawking S=A/4G, ER=EPR ≟ BH,
      attempt ≟ Debye freq, v_GW ≟ c) through Adam+Eve — **unanimous DECOY, 0/4**
      (→ 0/7 across both rounds). Nothing genuine to encode; no
      `QUANTITY_IDENTIFICATIONS` added. Documented in
      `docs/research/orphan-connector-adjudication.md` (Round 2). The frontier is
      isolated by physics, not vocabulary.

- [x] ✅ **PI-INSTRUMENT PROGRAM — COMPLETE, RELEASED v0.37.0 (2026-07-04,
      registry-verified `dist-tags.latest=0.37.0`, `4b231a0`).** Make the
      framework an honest falsification instrument (a trustworthy *no*, an
      extraordinary *yes*). Outcome: 2 builds (Phase 1 grounding ledger, Phase 4
      BE-21) + 3 honest not-build/boundary/defer (Phase 2 mechanism-tier, Phase 3
      propose→confront, BE-53) — completion = each phase's honest verdict. The
      mechanism/data ceilings are documented PERMANENT for dimensional candidates
      (they live in `upt confront`, not candidate space). Flagship results:
      `docs/research/pi-instrument-results.md`. Suite 3591/332; DGT clean; also
      fixed the recurring map-golden CI flake (60s→180s timeout). Phase detail:
      - [x] ✅ **Phase 1 — epistemic-grounding ledger — DONE (`a32ac95`,
            [Unreleased]).** Every `promising` verdict + `--json` candidate shows
            passed-vs-gap gates + the honest no-mechanism/no-data ceiling.
            Annotation-only (benchmark unmoved). Vet-mandated honesty: novel-
            consequence is a GAP; no linear "tier" (magnitude/axis orthogonal).
            `describeGrounding` (`src/composition/grounding.ts`). Design:
            `docs/superpowers/specs/2026-07-04-pi-instrument-phase1-grounding-tier-design.md`.
      - [x] ❌ **Phase 2 — mechanism tier — NOT BUILT 2026-07-04 (grounding-
            confirmed).** A mechanism-proxy falsifier beyond axis-compatibility
            is not buildable at meaningful yield without fabricating coupling
            physics the catalog lacks: the attribute vocabulary is exhausted (3
            hand-assigned axes), the one objective extension (tensor rank/
            intensivity) can't separate same-kind same-dim pairs (all 7 survivors
            are energy≟energy/mass≟mass/length≟length), new categorical axes
            inherit the abstention problem, and the genuine signal (`entailed`)
            already exists + honestly fires 0/7. `mechanismTested: false` is
            documented as PERMANENT for dimensional candidates (mechanism lives
            in `upt confront`, not candidate space). 5th disciplined not-build
            this session. Design:
            `docs/superpowers/specs/2026-07-04-pi-instrument-phase2-mechanism-tier-design.md`.
            Constructive redirect: grow the canonical registry so `entailed`
            fires (the L-layer expansion was a step) → the real mechanism/data
            work is **Phase 4**.
      - [x] ❌ **Phase 3 — propose→confront loop — DOCUMENTED BOUNDARY
            2026-07-04.** A loop over discovery CANDIDATES has no confrontable
            target: a cross-cluster dimensional identification is a coincidence
            review surface (0/8 genuine) with no implied observable; `entailed`
            fires 0/7. The loop is closed instead by the FIREWALL — a candidate
            must graduate to an established bridge (human review + citation)
            before data confrontation — and the real data work is `upt confront`
            (Phase 4). `dataTested:false` documented as permanent for candidates
            (`grounding.ts` comment). Not a code machine that always says
            "unconfrontable".
      - [~] **Phase 4 — grow the evidence spine.** ✅ **BE-21 KSS η/s DONE**
            (data-confronted 6→7): the QGP (Bernhard-Moreland-Bass 2019) η/s
            ≈ 0.10 satisfies + nearly saturates the KSS bound 1/(4π)≈0.0796
            (~26% above); consistency-kind, DGT-clean, gate 3591/332. ❌ **BE-53
            (Yang-Mills β) DEFERRED**: vet rejected the numeric b₀ extraction as
            fabrication (flavor thresholds + higher-loop); the honest
            sign-of-running is real but doesn't map to the value/bound/
            consistency outcome kinds without a proper QCD running code — a
            documented Phase-4 boundary. Design:
            `docs/superpowers/specs/2026-07-04-pi-instrument-phase4-confrontations-design.md`.
      - [ ] **Phase 5 — frontier + null-result as first-class output.** A
            publishable coincidence-rejection catalog + a legible frontier map
            (what physics hasn't connected + what would test it).

- [ ] **BE-53 Yang–Mills β-function confrontation** (re-homed 2026-09-25 from the closed 2026-07-04
      NEXT umbrella): PDG α_s(M_Z) = 0.1179 running, open data, value/consistency kind. Needs its own
      design → Adam/Eve vet → Task-0 gate. Optional backlog.
- [x] 🟢 **NEXT — active work (as of 2026-07-04, post-v0.36.0).** The
      discovery-hardening program is COMPLETE (results:
      `docs/research/v0.33.0-discovery-hardening-results.md`) and the canonical
      L-layer is done for now (monomial + L1-sum = **103** equations). Remaining
      candidates, each its own **design → Adam/Eve vet → Task-0 gate**:
      - **Evidence-spine confrontations (highest value — each yields a live
        pass/fail residual, unlike the reference-only L1-sum entries):**
        - **BE-53 Yang-Mills β-function** — PDG α_s(M_Z) = 0.1179 running, OPEN
          data (value/consistency-kind). Un-tracked; the cleanest next one.
        - **BE-21 KSS η/s bound** — heavy-ion η/s ≈ 0.1–0.2 vs 1/4π, OPEN data
          (consistency / bound-approach kind).
        - Data-pending (deferred, tracked below): **be-16** Landauer/Bérut +
          **be-23** per-material α table (both PAYWALLED — need an owner-supplied
          number, never fabricate); **be-38** MOND/SPARC (physics-tautology gate,
          not a data block).
      - **L1-sum backlog: largely EXHAUSTED / deprioritized.** 10 non-monomial
        laws shipped (v0.35–0.36); the remaining laws are lower-value
        reference-only given the MEASURED zero structural-bridge-match result —
        expand only with that honest ceiling in mind.
      - **L2 field-equation tier: NOT recommended** (Einstein-only node +
        `fieldEquation` read-by-nothing = the E-layer inert-metadata trap; would
        need its own tensor-level consumer to be worth building).
      - CLOSED 2026-09-25 (tracker hygiene): BE-21 KSS is confronted (`src/bridges/be21-kss-confrontation.ts`);
        be-16, be-23 and be-38 are tracked as their own data-pending rows; BE-53, the one live item, is
        re-homed as its own row above.

- [x] ✅ **L1-sum tier + BE-51 confrontation — RELEASED v0.35.0 (2026-07-04,
      registry-verified `dist-tags.latest=0.35.0`).** Two programs off the
      excluded-law backlog + evidence spine:
      - **L1-sum tier** (`28ea229`): the first non-monomial canonical laws —
        Bernoulli, radioactive decay, photoelectric, Carnot, Boltzmann factor
        (93 → 98), each with a full L1 `scalarAst`; built via `l1()` so the
        engine derives `monomial:null` + `freeGroups≥1` (F1 holds unchanged, no
        invariant hack). **Measured ZERO structural bridge-matches** → value is
        reference-completeness, not validation (honest, un-inflated). **L2
        field-equation tier NOT built** (Einstein-only node + read-by-nothing =
        E-layer trap). Design+vet+measurement:
        `docs/superpowers/specs/2026-07-04-l1-sum-tier-design.md`.
      - **BE-51 gravitational-lensing confrontation** (`fe59a60`): third classic
        GR test (data-confronted 5 → 6); all three (Mercury/Shapiro/lensing)
        within 1σ. Design: `docs/superpowers/specs/2026-07-04-be51-lensing-confrontation-design.md`.
- [x] ✅ **L1-sum harder backlog — RELEASED v0.36.0 (2026-07-04,
      registry-verified `dist-tags.latest=0.36.0`, `fb2d838`).** The 5 harder
      non-monomial laws (Lorentz γ, Compton shift, Rydberg, Snell, Malus;
      98 → 103), filling the special-relativity + optics gaps. γ used the `-0.5`
      literal exponent on the dimensionless 1−β² base (no squared-form fallback).
      All engine-derived (monomial:null + freeGroups≥1; F1 held), all MEASURED
      at ZERO structural bridge-matches (reference-only, as the first 5). The
      non-monomial reference now holds **10 famous laws**. Suite 3579/330.
      **NEXT candidates (each own design→vet→gate):** more confrontations
      (BE-53 Yang-Mills PDG α_s, BE-21 KSS η/s — open data; be-16/be-23-table
      paywalled). The L1-sum backlog is now largely exhausted (the remaining
      non-monomial laws are lower-value reference-only, given the measured
      zero-match result); further expansion should weigh that honestly.
- [x] ✅ **Canonical L-layer expansion — RELEASED v0.34.0 (2026-07-03,
      registry-verified `dist-tags.latest=0.34.0`).** 66 → **93** equations (+41%,
      27 new cited monomial laws) across 6 batches: condensed-matter (9, new
      domain), fluids (4), EM (5), thermo (3), stat-mech (4, new file), waves+
      atomic (2). Every entry engine-validated (freeGroups=0), real citation,
      honest epistemicStatus; each batch dedup-grepped + physics-verified
      pre-flight. Full suite 3548/328 green; 16 canonical-dependent CLI goldens
      regenerated (composition graph grew 107→134 edges + a new
      classical-electron-radius↔Thomson cluster). Lasting artifact: the mapped
      monomial-L0 boundary (`docs/research/canonical-expansion-candidate-audit.md`)
      — sums/transcendentals, hidden length scales, dimensionless numbers, pure
      counts excluded + logged as the L1-sum/L2 backlog. **NEXT candidates:** the
      L1-sum/L2 field-equation tier (that backlog), the evidence spine (more
      confrontations, data-gated). Batch detail below.
      Owner-approved scope A. Design r2
      (`docs/superpowers/specs/2026-07-03-canonical-l-layer-expansion-design.md`,
      Adam RED→corrected + Eve YELLOW: r1 over-counted non-monomials; honest
      count ~50–55). Gating audit DONE
      (`docs/research/canonical-expansion-candidate-audit.md`): ~61 monomial
      candidates, **3 new domains** (fluids/nuclear/condensed-matter), **9 SDD
      batches** (pilot = condensed-matter, 10 clean monomials). Non-monomial
      physics (Rydberg, photoelectric, decay-exp, Planck, Snell, relativistic
      γ-family, …) logged as the L1-sum/L2 backlog (separate later tier).
      **SDD-execute the batches** — per-equation `l1()` encoding, real citations
      (no fabrication), per-batch Adam+Eve governing-set physics review; add
      `CanonicalDomain` enum values as needed; regenerate catalog-json; release
      as a minor bump.
      - [x] **PILOT: condensed-matter — DONE 2026-07-03 (`57adb67`, 66→75).**
            9 new entries (10th, cyclotron, was a pre-existing dup in
            electromagnetism.ts — correctly dropped). `condensed-matter` added
            to `CanonicalDomain`. BOTH gates passed: task-quality review
            APPROVED; Adam+Eve physics review = physically-sound idealized-model
            entries with honest assumptions (the implementer's `assumptions`
            fields pre-empted the single-carrier/free-electron caveats; Debye
            uses a distinct `number-density` name; plasma-freq `dimensional`
            confirmed per the √-law convention). Deferred clarity minor:
            optional m→m* note. **Pattern + review process VALIDATED.**
      - [x] **Batch 2: fluids — DONE 2026-07-03 (`c0a8c7d`, 75→79).** 4 laws
            (continuity, shear-stress, Laplace, dynamic-pressure) appended to
            `fluids-waves.ts` under `domain: 'mechanics'` (codebase convention —
            NO new `fluids` domain). Reynolds + Poiseuille correctly EXCLUDED as
            non-monomial (see below). Task-quality self-review clean (tests real,
            monomials verified two ways); physics spot-check passed. Pushed with
            a test-description fix.
      - [x] **Remaining 6 batches — DONE in v0.34.0** (all landed 66→93; see the
            v0.34.0 release entry above). **Two exclusion rules found during
            execution** (audit addendum): (a) hidden multiple length scales
            (Poiseuille) and (b) **dimensionless targets** (Reynolds, and also
            **α in atomic + magnification in optics** — drop them) are NOT L0
            monomials. Net total revised ~50 → **~45**. **De-dup is significant** —
            `fluids-waves.ts` already has hydrostatic-pressure, buoyancy,
            stokes-drag, wave-speed, sound-speed, pressure-def, density-def; so
            fluids nets ~6 new (continuity, Reynolds, Poiseuille, Laplace/
            surface-tension, dynamic-pressure, shear-stress) and waves nets
            fewer. Net total tracks the audit's ~50, not the raw ~61. **Each
            batch: grep existing entries for overlap FIRST, match the domain
            the existing sibling entries use (consistency — check before adding
            a new enum value), work out verified dims + real citations, then
            implementer → task-review → Adam+Eve physics-review.** Proven
            repeatable pipeline; roll them on the user's word.

- [x] ✅ **Discovery-hardening program — COMPLETE (2026-07-03).** Program design:
      `docs/superpowers/specs/2026-07-02-discovery-hardening-program-design.md`;
      results: `docs/research/v0.33.0-discovery-hardening-results.md`. Shipped
      Phase 1 (adjudication ledger, v0.31.0), Phase 2 (axis falsifier, v0.32.0),
      Phase 3 (evidence channels, v0.33.0), Phase 4-Unit-A (consequence
      propagation, v0.33.0). The four remaining items were each evaluated
      (grounding + measurement + Adam/Eve vet) and **correctly NOT built** — Unit
      B (numerology), Phase 5 (statistics-theater), symbolic-deepening (zero
      yield), Phase 6/E-layer (category error). The funnel is at its honest
      capability ceiling. **Still-open sub-items below are the evidence-spine
      data-pending confrontations (be-16/be-23/be-38), now surfaced in the NEXT
      item at the top of this queue.** Historical detail retained:
      - [x] **v0.32.0 release ritual — DONE 2026-07-02**: full-suite gate
            3431/0 (317 files) + smoke green + audit 0 vulns → bump +
            CHANGELOG `[0.32.0]` + README suite counts (release commit
            `8fad621`) → tag `v0.32.0` pushed → published
            `--ignore-scripts` → **registry-verified** (`npm view` latest =
            0.32.0).
      - [x] **Phase 3 (v0.33.0) — P3+P7, evidence channels — SHIPPED** (`upt
            confront`; data-confronted bridges 3→5, later 5→6 with be-51). The
            unchecked sub-items below are data-pending confrontation FOLLOW-UPS,
            not blockers on Phase 3 itself. Design at
            **r3 (Adam GREEN + Eve YELLOW, READY FOR PLANNING)**:
            `docs/superpowers/specs/2026-07-02-discovery-hardening-phase3-design.md`.
            **Task-0 dataset verification DONE** (web-sourced):
            `docs/research/phase3-dataset-verification.md`. **be-42 Hawking +
            be-27 effective-temp DROPPED (unconfrontable — verified)**, not
            queued below.
            - [x] **Machinery + be-37 + be-48 — DONE 2026-07-02 (Tasks 1-7,
                  SDD-executed).** Typed observation registry
                  (`src/bridges/observations/types.ts`: provenance-mandatory,
                  `SigmaComponent[]`/`combineInQuadrature`) + `ConfrontationOutcome`
                  discriminated union by `kind` (`value`/`upper-bound`/
                  `consistency`/`table`) + the unified `CONFRONTATIONS` registry
                  (`src/bridges/confrontations.ts`, wraps be-23/36/37/52 and the
                  two new confrontations) + `upt confront [--bridge] [--sensitivity]
                  [--json]` CLI + elasticity-based deciding-measurement
                  (`decidingMeasurement`, `|∂P/∂xᵢ|·xᵢ/P`; variance attribution
                  still deferred to Phase 5). New confrontations: **be-37
                  Shapiro/Cassini** (`confrontBE37` vs Bertotti-Iess-Tortora 2003
                  PPN γ) and **be-48 GRW/LISA-Pathfinder** (`confrontBE48` vs
                  Carlesso et al. 2016 CSL upper bound, citation PRD 95:084054 /
                  arXiv 1606.03637). **Data-confronted bridges 3 → 5**
                  ({23, 36, 37, 48, 52}). Promotion rule speculative→established
                  still requires a confrontation (governance text, not code —
                  epistemic firewall unchanged). **Whole-branch review (opus):
                  READY TO MERGE, all 5 binding constraints pass; 1 Important
                  latent honesty finding FIXED (01811af — be-23 `withinObserved`
                  now residual-based not O(1)-band, + registry-wide contract
                  invariant test). Full suite green at Task 7 (3503 pass/326
                  files); branch pushed 9f116f3..01811af.**
            - [x] **v0.33.0 release ritual — DONE 2026-07-03** (PE-authorized
                  under the standing "continue with remaining issues" grant):
                  gate 3512/0 (327 files) + smoke + audit 0 vulns → bump 0.33.0
                  + CHANGELOG `[0.33.0]` + dep-health → tag `v0.33.0` (`f02001c`)
                  → pushed → published `--ignore-scripts` → **registry-verified**
                  (`npm view` latest = 0.33.0). Bundled Phase 3 confront +
                  Phase 4 Unit-A consequence-propagation + DGT hardening (one
                  release — publishing identical code under two versions would
                  be dishonest).
            - [ ] **be-16 Landauer/Bérut — QUEUED, data-pending.** The
                  `consistency`-kind machinery is built; only the Fig-4 asymptote
                  value from Bérut et al. 2012 (paywalled) is missing —
                  transcribe at the next TDD cycle or owner supplies; never
                  fabricate.
            - [ ] **be-23 per-material α table — QUEUED, data-pending.** The
                  aggregate be-23 confrontation already ships (3→5 above);
                  upgrading to a `table`-kind entry needs
                  `PLANCKIAN_CUPRATES.perMaterialAlphas` + Legros 2019's
                  per-material rows (paywalled).
            - [ ] **be-38 MOND/SPARC deep-limit — QUEUED, contingent.**
                  Blocked on whether the deep-MOND-limit confrontation is a
                  genuine test vs an a₀-reproduction tautology (Task-0 gate #1
                  special case) — not a data-availability block.
            - [x] **be-12 confrontation DEFERRED (design-time drop):** the
                  bridge encodes `λ_T=h/√(2πmkT)` (a length of m,T); the
                  BEC-onset criterion `nλ³≈2.612` needs density `n` the
                  bridge doesn't encode, and a bare `λ_T` value isn't a
                  directly-measured observable (computing it = reproduction,
                  not confrontation — G-3). Revisit only if a many-body
                  coherence BE entry is added (the module's own known_issue).
                  WON'T DO (owner, 2026-09-25): the reason above stands; a bare λ_T is not an observable.
      - [x] ✅ **Phase 4 (v0.34.0) — P2, consequence propagation (Unit A) —
            EXECUTED.** Design r5 FINAL (Adam GREEN + Eve YELLOW; Task-0
            measured): `docs/superpowers/specs/2026-07-03-discovery-hardening-
            phase4-design.md`; plan: `docs/superpowers/plans/2026-07-03-
            discovery-hardening-phase4-unitA.md`. Machine pre-classifier for
            the adjudication ledger: `src/composition/consequence.ts` reuses
            `deriveProposedBridges` + `normalForm` to annotate each promising
            candidate `entailed` (re-derives a canonical eq — exact same-target
            + same-governing match) / `novel-consequence` (valid, no canonical
            match) / `inconclusive` (monomial limit). **Annotation-only**
            (zero ordering/score/verdict effect — the calibration benchmark
            confirmed byte-identical); `discover` surfaces the signal (text
            trailer + `--json` field). **Task-0 measured (real):** entailed=0
            both graphs (validated by synthetic positive control), 4
            novel-consequence total, `consequence-invalid` CUT (contradictory
            =0). `annotateConsequences`/`classifyProposal` genericized
            (`<T extends VettedCandidate>`) and exported from `src/index.ts`
            as public API alongside `ConsequenceSignal`/`ConsequenceEvidence`/
            `ConsequenceAnnotatedCandidate`. **Whole-branch review (opus):
            READY TO MERGE, 0 findings** (all 5 binding constraints verified
            vs source); full gate **3512 passed / 327 files** on the final
            commit; pushed `d6cecbe..4df823f`. **RELEASED in v0.33.0**
            (bundled with Phase 3 confront — 2026-07-03, registry-verified
            `npm view` latest = 0.33.0; tag `v0.33.0` commit `f02001c`).
            Deferred minor (non-blocking): strengthen the classifier
            negative-control test to exercise `sameGoverning`'s
            same-length-different-name path.
            - [x] ❌ **Unit B (bounded Buckingham-π cross-cluster) — CANCELLED
                  2026-07-03 (vet-killed as numerology).** Own design cycle
                  (`docs/superpowers/specs/2026-07-03-discovery-hardening-phase4-unitB-design.md`);
                  Adam RED + Eve RED. The decisive math (this session's Task-0):
                  16,979 single-invariant π-groups × 4.3% background = **~730
                  chance hits** vs an 8-constant table — statistically vacuous
                  (multiple comparisons). Plus: the π-value is an artifact of
                  the chosen representative scale (form-not-value numerology,
                  per buckingham.ts's own docstring). Decisive project reason:
                  a coincidence-GENERATOR contradicts the program's
                  coincidence-REJECTOR result (0/8 genuine). Nothing built;
                  recorded as an honest negative methodological result in
                  `docs/research/v0.33.0-discovery-hardening-results.md`. The
                  Task-0 probe was the right (cheap) instrument.
      - [x] ❌ **Phase 5 (statistical magnitude gate) — GATE-CHANGE REJECTED
            2026-07-03 (vet-confirmed).** Design
            (`docs/superpowers/specs/2026-07-03-discovery-hardening-phase5-design.md`):
            grounding showed the roadmap's "σ-level/p-value" framing is unsound
            (no input σ exists; inventing one = the Unit-B error). Reframed to a
            confidence-WEIGHTED gate; Adam YELLOW + Eve RED converged: **don't
            change the gate** — wiring a subjective 4-tier `logWidth` into the
            threshold lets an editorial choice flip a verdict, and it only
            *loosens* the filter (precision loss) for negligible benefit +
            benchmark churn. The flat `|log10 va − log10 vb| > 3` gate is
            already honest and stays. **Salvage (OPTIONAL, low priority,
            deprioritized below Phase 6):** an annotation-only `logWidth`
            surfacing for reviewer context (never touches a verdict → zero
            funnel risk). Second roadmap phase the vet down-scoped (after Unit
            B) — the falsifier stack is honest, doesn't need more machinery.
      - [x] ❌ **Symbolic-engine deepening (beyond monomials) — NOT BUILT
            2026-07-03 (measured zero yield).** Grounding: there is no equation
            solver — "beyond monomials" means *building* one (linear/quadratic/
            CAS; mathts peer offers `simplify` not `solve`). Task-0 yield probe
            (classified every equation's AST): of 66 canonical, **53 monomial
            (already handled) + 13 no-AST, ZERO sum/affine**; of 41 bridges,
            **9 monomial + 32 no-AST, ZERO sum/affine**. So a solver would
            rescue nothing — the corpus IS monomial-where-it-has-an-AST; the
            `inconclusive` consequences come from missing ASTs / non-reducible
            monomial pairs, not unhandled sums. Third discovery-machinery item
            (after Unit B, Phase 5) that grounding+measurement showed
            not-worth-building — the funnel/symbolic engine are at their honest
            capability ceiling given the sparse monomial corpus.
      - [x] ❌ **Phase 6 (E-layer coarse-graining) — NOT BUILT 2026-07-03
            (vet-confirmed; E-layer = accepted scope boundary).** Design
            (`docs/superpowers/specs/2026-07-03-discovery-hardening-phase6-design.md`);
            Adam RED + Eve YELLOW converged: don't build even the minimal
            version. Two sound HIGHs: (1) category error — a coarse-graining
            limit (ℏ→0) is a meta-statement about two regimes' equations, NOT a
            `CanonicalEquation` with one dimensional signature; forcing it
            corrupts the L-layer; (2) `emergenceLimit` metadata would be
            read by nothing (write-only, repeats the inert `EmergentPhenomenon`
            mistake). The E-layer is documented as a deliberate honest scope
            boundary (Π=L+B+E: L and B realized; E in prose only). Fourth
            remaining item the vet/measurement correctly not-built.
      - [x] ✅ **DISCOVERY-HARDENING PROGRAM COMPLETE 2026-07-03.** Shipped:
            Phase 1 (adjudication ledger), Phase 2 (axis falsifier), Phase 3
            (confront evidence channels), Phase 4 Unit A (consequence
            propagation) — all in v0.31–v0.33. All 4 remaining items evaluated
            with grounding+measurement+vet and correctly NOT built (Unit B
            numerology, Phase 5 statistics-theater, symbolic zero-yield, Phase 6
            category-error). The falsifier stack is at its honest capability
            ceiling over the sparse monomial coincidence-dominated corpus.
            Capstone: `docs/research/v0.33.0-discovery-hardening-results.md`
            §"Program status — complete". The discipline (design→vet→Task-0)
            prevented 4 low-value/unsound features while keeping integrity.
      - [x] **P10 (parallel) — collaboration surface.**
            - [x] **Honest research note — DONE 2026-07-03** (PE-authored):
                  `docs/research/v0.33.0-discovery-hardening-results.md` — the
                  consolidated Phase 1–4 results (0/8 genuine, contradictory=0,
                  70 axis-clash falsifications incl. the 5 named coincidences,
                  0 entailed consequences; the 5 confrontations with Mercury
                  0.26σ + Cassini 0.91σ within 1σ). Every number verified live
                  via `upt` + a pinned gate; linked from the research README.
            - [x] **Machine-readable artifact v2 — DONE 2026-07-03** (`24e05cf`).
                  `data/bridge-catalog.json` schemaVersion 1→2: catalog + a
                  `confrontations` array (5 real-data confrontations with
                  outcomes) + an `adjudications` array (the verdict ledger);
                  schema + drift-guard test updated to pin both against the
                  live registries. **Root-cause bug fixed:** the generator
                  `import()`ed an absolute `C:\` path (Windows ESM
                  `ERR_UNSUPPORTED_ESM_URL_SCHEME`) — the reason the artifact
                  was stuck at `packageVersion 0.10.0`; now `pathToFileURL`.
                  Regenerated at v0.33.0. (Optional future: add the vetted
                  candidate snapshot — left out as volatile/CLI-reproducible.)
            - [x] **GitHub issue templates for the CONTRIBUTING review tasks — SHIPPED 2026-08-29.**
      Five issue forms under `.github/ISSUE_TEMPLATE/` plus a `config.yml`, each derived from a
      task that already exists in CONTRIBUTING rather than invented: bridge adjudication
      (BE-44/46/50), literature check (BE-23 vs Hartnoll and any other entry), quantity
      identification/naming, novel-candidate verdict, and NOT-A-BRIDGE rebuttal.
      **Every form requires a human-verifiable literature anchor**, because the status-promotion
      rule says no status moves toward `established` on internal review — human or LLM — alone.
      The citation field says so in the form, where the submitter sees it.
      Validated against GitHub's issue-forms schema (parsing as YAML is not sufficient — a valid
      file with the wrong keys renders as nothing), and the validator was mutation-tested on two
      distinct breakages before its green was trusted.
      **Why this one:** most of the remaining backlog is physicist-review work, and there was no
      mechanism to solicit it. `.github/` held only `workflows/`.
                  **User-only:** Zenodo DOI + physicist outreach (queued since
                  v0.10).
      - [x] Post-release hygiene — **Phase-2 deferred minors DONE
            2026-07-02** (@public tags on the 2 new root exports;
            discover.ts ternary flipped positive-first; 70+10=80 now a
            machine assertion in discovery-calibration.test.ts; README
            suite counts were refreshed in the release commit). DGT
            diagnosis task groups tracked in the next entry (dead-exports
            group closed there).

- [x] **DGT diagnosis 2026-07-02 (pre-v0.32.0 release; regenerated at HEAD
      `846796d`+fix: 224 files / 1491 exports / cycles 0+0 / coverage 88.4% /
      0 unused files / 8 flagged exports).** Structure is healthy (no cycles;
      hubs — `dimensional/types.ts` o:110, `index.ts` i:117,
      `_be-helpers.ts` o:49 — are all by-design fan-outs). Per-task DGT
      checkpoints through Phase 2 showed every export/import delta was
      exactly the intended change (e.g. +2 exports at T5 = the two
      co-exports; T4's default flip had zero structural footprint).
      **Watch items (no action yet):** `composition/discovery.ts` entered
      the top-15 hotpoints (i:14, o:6) — expected centrality for the gated
      funnel, but Phase 4's consequence-propagation work will raise it
      further; `composition/` is now the second-largest module (43 files,
      behind bridges' 58) — fine today, but a quantities/edges/discovery
      sub-structure split becomes worth considering if Phase 3-4 push it
      past ~50. Net conclusion: after separating tool artifacts from
      reality, the true gap surface is 3 dead symbols + 4 untested runtime
      files — small for 14 commits into a phase. Actionable gaps,
      priority-ordered:
      - [x] **"3 verified-dead exports" — re-verified by grep 2026-07-02;
            only 1 was actually dead.** `allCommands` (`src/cli/command.ts`):
            zero call sites anywhere → DELETED. `SourceName`
            (`src/cli/graphs.ts`): referenced by `resolveGraph`'s exported
            return type in the same file — un-exporting breaks `.d.ts` emit
            (TS4060); it is false-positive class (b) below → KEEP.
            `lowerBianchiResidual`: imported + called by
            `numerical/lowering.ts:316` — NOT dead; the earlier
            "verified absent" claim missed the importer → KEEP. Net lesson
            feeds class (b): signature-only type references are invisible
            to import-edge analysis.
      - [x] **DGT tool false-positive classes — 4 FIXED 2026-07-02
            (4ebd99d + 87fb12e + marker fix 2368a2e; controller-reviewed).**
            (a) `.d.ts` excluded from coverage denominator; (b)
            signature-referenced type exports no longer flagged (the 6:
            GravitationalLensing/GeodesicIntegrator Inputs+Results,
            FieldSpec, SourceName); (c) side-effect imports with trailing
            comments + test-file dynamic `import()` now credited (the real
            root cause of the regime-module/formula-mathts flags); (d) NEW
            class found in-session: multi-line named-import blocks with
            interior `//` comments glued comment text onto identifiers —
            fixed via `stripBraceBlockComments` on the import side (same
            family as the existing export-side C-9 fix). Reports now:
            untested files 26 → 18, unused exports 8 → **0**; structural
            metrics verified unchanged via full git diff.
      - [x] **DGT tool — transitive side-effect coverage (the deferred
            "optional (c)"), FIXED 2026-07-03.** The coverage tracer credited
            direct + re-export imports but not the bare-side-effect chain, so
            the 16 `src/cli/commands/*` (reached `test → main.ts → [side-effect]
            commands/index.ts → [side-effect] each command`) were falsely
            flagged untested — all are E2E-exercised via `runCli`. Fix: tag
            bare `import './x.js';` deps with `sideEffect: true` (distinct from
            `import * as` namespace binds, both previously `['*']`) and follow
            ONLY those edges transitively in `analyzeTestCoverage`. Bounded by
            construction — it does NOT follow `main.ts`'s `import * as api from
            '../cli-api.js'`, so no leak through cli-api's re-export closure
            (verified: untested 20 → 4 = exactly the 16 commands; the 4
            remaining are the underscore-helper residue below, correctly still
            uncredited). Coverage 91.2% → **98.2%**; structural metrics
            byte-identical (0 unused / 0 cycles / 230 files / 1527 exports).
      - [x] **MEASURED 2026-08-29 — real, but confirmed cosmetic; closing rather than fixing.**
  Ground truth: **8** files carry a full `import ... from '...'` inside a block comment
  (not the 5 recorded here; `lowering.ts` has a *line* comment, not a block one). Cross-checked
  against the emitted `dependency-graph.json`: **0** of them leak into the real graph. The
  sources are the package's own name (`universal-physics-tensor`) and test-fixture relative
  paths, none of which resolve to an internal module — so the "zero edge-count impact" claim
  below is **verified**, not merely restated.
  The proposed root fix — "strip comment blocks before ALL regex scans" — is also more dangerous
  than the defect: naive comment-stripping in TypeScript breaks on `//` inside string literals,
  regex literals (`/\/\*x\*\//`), template literals, and unterminated blocks. Doing it correctly
  means parsing with the TypeScript compiler API, which is a rewrite of the scanner to fix
  output nobody consumes. **Not worth a cycle.** Reopen only if a comment import is ever shown
  to reach a real edge.
- [x] ~~**DGT tool 5th false-positive class (pre-existing, flagged
            2026-07-02, NOT yet fixed):** the import regex scans raw file
            content and matches `import {...} from '...'` snippets inside
            JSDoc `@example` blocks (5 occurrences: einstein-equation.ts,
            killing.ts, kretschmann.ts, perihelion-finder.ts, lowering.ts
            2nd edge — currently produce empty `imports: []` entries, zero
            edge-count impact). Root fix = strip comment blocks from file
            content before ALL regex scans. Evidence in
            `.superpowers/sdd/hygiene/task-dgt-tool-report.md`.
      - [x] **4 "genuinely-untested" runtime files — direct coverage added
            2026-07-02 (d1f7415, 42 tests, controller-reviewed ✅).**
            Implementer pre-flight found 3 of the 4 were DGT path-convention
            false positives (regime-rule-install + regimes-builtins were
            exercised via side-effect import inside regime-registry.test.ts
            — improvement class (c) evidence; formula-mathts already had a
            same-named test file the tool didn't attribute). Only
            validator-registry.ts had zero prior coverage (now fully pinned:
            A/B/C dispatch, riemann-child callback, exhaustiveness guard).
            New files carry only genuinely-new assertions (6-axis Rule-4
            matrix, exact builtin displayNames, FormulaError seam cases).
      - [x] **4 underscore helpers — verified 2026-07-02, ACCEPTED RESIDUE
            (no direct tests needed).** Grep-confirmed consumers + their
            tests: `_l1-build` → every `canonical/entries/*` domain file,
            each with a per-domain test + `registry.test.ts`;
            `_discovery-opts` → `discover.ts`/`map.ts`, exercised by
            `tests/cli/upt-discover-opts.test.ts` + both golden corpora;
            `_catalog-helpers` → all 4 catalog domain files, exercised by
            `catalog-full`/`catalog-tranche` + the dimensional-signature
            round-trip pin; `_dims` → all 6 quantities files, exercised by
            the 60-row `attribute-audit` governance pin. Direct tests would
            duplicate existing assertions; underscore prefix already marks
            them intra-module-private.

- [x] ✅ RELEASED 2026-07-02 (npm latest = 0.32.0, registry-verified) —
      **v0.32.0 discovery-hardening Phase 2:
      axis-compatibility falsifier + honest connectivity.** **Final
      whole-branch review (opus, 2026-07-02): NOT READY → fix wave
      `8d1d181` (coarsening-length governance-pin gap closed — the 54th
      catalog name the 59-row claim missed, now row 60 with adjudicated
      KEEP; source-aware connectors banner; comment version fix) →
      re-verdict READY TO RELEASE.** Deferred minors (all OK-TO-DEFER):
      @public tags on the 2 new root exports; discover.ts ternary; the
      70+10=80 decomposition comment-only; README suite counts refresh at
      release per numeric-decay convention. Design r2 (Adam RED→GREEN, Eve YELLOW
      dispositions recorded):
      `docs/superpowers/specs/2026-07-02-discovery-hardening-phase2-design.md`.
      Plan r2 (Adam plan-vet RED→GREEN — broken-CI-window restructure: CLI
      surfacing merged into the gate commit, funnel-count/golden coupling now
      a Global Constraint):
      `docs/superpowers/plans/2026-07-02-discovery-hardening-phase2.md`.
      Tasks 0-6 via subagent-driven-development; controller ran the Adam+Eve
      tranche-table adjudication between T2 and T3. **Tasks 0-6 all landed on
      `master` (`d936321..HEAD`).** T0's measurement invalidated the design's
      r2 premises (dense registry, not sparse), pivoting the plan to r3/r4
      before execution — see the r2→r3 revision record in the phase's plan
      doc; T2 became the attribute AUDIT and T3 the gate, in that order.
      Commits: `02f64f9` (T1 canonical information-axis fix), `7d84983`+
      `a03bdfb` (T2 attribute audit + 59-row governance pin), `7e919c8`+
      `5904b1b` (T3 axis-clash gate + fold test; `9af8f33` design correction
      alongside it), `4f27c42` (T4 `map`/`connectors` both-default), `eeb037a`
      (T5 co-exports + conditional annotate), this commit (T6 wrap). Measured
      outcomes: catalog `promising` 12→7 (5-pair flip list machine-pinned in
      `discovery-calibration.test.ts`), canonical-only `axis-clash` count
      corrected from the design's assumed 0 to a measured 1 (`semi-major-axis
      ≟ planck-length` — both are real registry `Quantity` nodes, not bare
      canonical variables). Deferred minors: `@public`-tag consistency check
      not yet re-run against the 2 new root exports (`VettedCandidate`,
      `rankDiscoveries`); `discover.ts`'s verdict-bucket rendering has grown a
      dense run of near-identical ternaries worth a simplify pass later. Full
      wrap detail: `.superpowers/sdd/phase2/task-6-report.md`. Release ritual
      (bump 0.32.0 → tag → publish) remains owner-triggered.

- [x] ✅ **RELEASED — v0.31.0 discovery-hardening Phase 1 (2026-07-02; tag
      `v0.31.0` at `3f30f11`, published to npm — registry verified `latest` =
      0.31.0, publish executed in-session with owner authorization).** Plan (Adam gemini-2.5-pro
      YELLOW + Eve o3 YELLOW, all accepted findings folded r2):
      `docs/superpowers/plans/2026-07-02-discovery-hardening-phase1.md`;
      program design (10 proposals → 6 releases):
      `docs/superpowers/specs/2026-07-02-discovery-hardening-program-design.md`.
      Executed via subagent-driven-development, Tasks 0–5 all landed on
      `master` (`a3a7278..HEAD`): Task 0 verification gate (no commit), Task 1
      `candidateId`/adjudication types, Task 2 the 8-entry seeded registry,
      Task 3 `upt discover` fold-out integration + re-pinned goldens, Task 4
      the calibration benchmark, Task 5 this docs/CHANGELOG/todo wrap +
      release-gate commit. **Deviation from plan:** Task 3 needed a
      `candidateId` SLUG pre-validation fix mid-implementation — the live
      candidate pool includes non-kebab-case quantity names (e.g. bare
      `A`/`impact_parameter` straight off `BridgeEdge`/canonical governing
      sets), which would otherwise throw through `candidateId`'s `~`-collision
      guard; `annotateAdjudications` now pre-filters non-slug names out of
      lookup instead of routing them through the throwing path (see its
      docstring in `src/composition/adjudication.ts`). **Deferred minor:**
      `annotateAdjudications` runs unconditionally even on the `--derive` path
      in `discover.ts`, where its output (`AnnotatedCandidate[]`) is discarded
      in favor of `deriveProposedBridges(ranked)` — wasted but harmless work;
      not worth threading a conditional through for one cheap pure map.
      **Gate catch + fix:** Task 5's full-suite release gate caught
      `tests/api/public-tag-vs-index-invariant.test.ts` failing — the 7
      adjudication-ledger symbols were `@public`-tagged in Task 1/2 but never
      re-exported from `src/index.ts`, a whole-suite-only invariant none of
      Tasks 1–4's scoped TDD runs would have hit. Fixed as `0d33e98`
      (re-exports all 7 from `src/index.ts` per the `SOURCE_ALIAS_DISPOSITIONS`
      precedent + updates the public-surface snapshot); gate re-run green after.
      **Final whole-branch review (opus, 2026-07-02): READY TO RELEASE** — 0
      Critical/Important; program-invariant audit PASS (epistemic firewall:
      `rankDiscoveries`/`compose.ts`/`proposed-bridges.ts` absent from the
      diff, `--derive` fed raw `ranked` never `annotated`; benchmark verified
      to trip on funnel changes). 4 Minors, all OK-TO-DEFER: (1) root surface
      exports `annotateAdjudications`/`AnnotatedCandidate` without co-exporting
      `VettedCandidate`/`rankDiscoveries`, so package-root consumers can't
      build its input via public API (widening later is non-breaking);
      (2) genuine/deferred stay-listed branch + foldNote wording + summary
      counters unexercised by seed data (the `[adjudicated: …]` trailer FORMAT
      is pinned via decoy+entailed rows in discover-show-adjudicated.txt);
      (3) the unconditional `--derive`-path annotation above; (4) two
      intentionally-different-scope tally implementations (JSON all-buckets vs
      text promising-only). **Controller design call needing the user's eye at
      release: the 7 ledger symbols are now permanent public API surface**
      (SOURCE_ALIAS_DISPOSITIONS precedent + P10 machine-consumability).
      **Release ritual remains user-triggered** per repo convention: bump to
      0.31.0 → CHANGELOG header → tag `v0.31.0` → push tag →
      `npm publish --ignore-scripts --access public`.
      Phases 2–6 (axis falsifiers+honest connectivity → confrontations+
      deciding-measurements → consequence-propagation+π-mode → statistical
      magnitude gate → E-layer) are QUEUED BEHIND Phase 1 and each needs its
      own design + Adam/Eve vet before execution. P10 (machine-readable
      artifact + Zenodo/outreach) unblocks after Phase 1; Zenodo remains
      user-only.
- [x] **README `## Development Status` is stale** (found 2026-07-02 during the
      program analysis): said v0.27.0 / 2929 tests / npm latest v0.25.0.
      **FIXED 2026-08-29 (`20af1d8`)** — but not the way this entry proposed. It asked
      for a whole-section refresh, "re-measure at HEAD". By the time it was actioned the
      section had drifted *again*, to `v0.44.1` against a published `0.44.3`: an entry
      whose fix is "re-measure" goes stale the moment HEAD moves, and this one proved it
      by going stale twice while open. The version number was **deleted** instead, leaving
      `package.json` and the CHANGELOG as the single source of truth. Nothing gates the
      README, so any figure copied there decays silently.

- [x] ✅ **RELEASED — v0.30.0 CLI overhaul (2026-07-02; tag `v0.30.0` at
      `e24f7a8`, published to npm — registry verified `latest` = 0.30.0).**
      Post-release follow-up queued: in-range dep refresh (`@types/node`
      26.1.0, `js-yaml` 5.2.1, mathts peers wanted bumps) + the deferred-minor
      list below. ✅ (2026-07-02) The dep-graph tool's dist→src
      coverage-mapper gap is FIXED (`resolvePath` rewrites `dist/…` →
      `src/…`; coverage 84.8% → 88.3%, `cli-api`/`sanitize`/`JsonEnvelope`
      false flags cleared; surfaced 2 genuinely-dead exports: `allCommands`,
      `SourceName`). Honest residue: the 16 `src/cli/commands/*` files remain
      listed untested — side-effect imports, covered end-to-end only; spawn
      references to `bin/` are not imports and stay out of scope.
      Commits `e1e8da4..a36c1b3` (docs+design/plan → derive-crash fix → TS
      refactor to `src/cli/` (~22-line `bin/upt.mjs` shim) → `--json`/`--source`
      port → hardening matrix), plus this docs commit. Full gate green:
      build clean, suite **3177 passing / 4 skipped / 1 todo**, smoke green.
      Release = user-triggered step: bump 0.29.0 → 0.30.0, tag `v0.30.0`, push,
      `npm publish --ignore-scripts --access public` (not executed here).
      Final whole-branch review (2026-07-02): **READY TO RELEASE**, 0
      Critical/Important. Deferred-minor follow-ups (all triaged OK-to-defer,
      none release-blocking): map `--json` omits the `options` envelope field
      though `--proposed`/`--max-orders` reshape `landing` (the one envelope
      asymmetry — add or accept deliberately); `map --json --out=PATH` silently
      drops `--out`; a `lastFlag(flags,name,default)` helper would dedupe the
      ~6 last-value extractions; test-infra nits (spawnSync timeout,
      REPORT_LINE regex triplicated across the golden harnesses, sanitizer
      Map-branch undefined asymmetry, valueStyle never-guard, loader-guard
      path untested).

- [x] ✅ **DONE — Phase 2: AST consolidation, 2026-06-20.** Unified
      `formula-dimension.ts`'s two parallel transpilers into one: both parse-trees
      (MathTS AST, built-in `FormulaAstNode`) adapt to a normalized `PNode`, then
      one `normToExpr` (dimensional transpile) + one `pnodeConstant` (constant
      exponent fold). `ExprNode` is now unambiguously the single semantic IR;
      parse-trees are transient. Behavior-preserving (convergence test: both
      front-ends → identical `ExprNode`) with one deliberate, pinned narrowing
      (function/named-const in an exponent rejected). `CompiledFormula`'s evaluator
      untouched (lower-risk variant). Design:
      `docs/superpowers/specs/2026-06-20-phase2-ast-consolidation-design.md`.
      **Program complete — ready for the single npm publish after the v0.27.0
      GitHub release (owner triggers publish).**

- [x] ✅ **GitHub-RELEASED v0.26.0 — Phase 1: `parsePhysics` + dimensionally-aware
      `--equation` (+ user-equation injection), 2026-06-20. Tag `v0.26.0` + GitHub
      release; NOT yet on npm (publish after all phases). npm `latest` = 0.25.0.** Public `parsePhysics(text,dims)→{expr,dimension}`
      (the string→ExprNode entry, MathTS-or-built-in via the registry); closed the
      scalar grammar gap (faithful `transcendental`/`abs` nodes; `exp(energy)` now
      rejected); `inferUnknownDimension`/`substituteSymbolDim` (probe-based
      single-unknown solve, abstains otherwise); `analyzeUserEquation` rewires
      `--equation` to dimensionally validate (✓/⚠ vs target catalog dim, constants
      carry real dims) + dimension-based "did you mean?" (else name-similarity);
      non-homogeneous RHS → exit 2. Design:
      `docs/superpowers/specs/2026-06-20-parsephysics-and-dimensional-equation-design.md`.

- [x] ✅ **DONE — user-equation injection (`upt map --equation`), 2026-06-20 (UNRELEASED).**
      Drop a free-form `TARGET = EXPR` onto the map as a violet `user` junction;
      reports where it lands (cluster / shared quantities) + a "did you mean?" hint.
      New pure lib `src/composition/user-equation.ts` (parseUserEquation —
      MathTS-or-built-in via `getFormulaParser()` per owner guidance "leverage
      mathts"; resolveToCatalogName `_`↔`-`; suggestQuantities relevance-gated;
      equationLanding; UserEquationError) + `user` VizStatus. Firewall: never
      written to catalog/graphs. Design:
      `docs/superpowers/specs/2026-06-20-user-equation-injection-design.md`.
      **Next (optional):** typed `name:dim` input → dimension-based "did you mean?".

- [x] ✅ **RELEASED — v0.25.0 (2026-06-19; tagged `v0.25.0`, published to npm).**
      Ships the two physics-map features below (mermaid/dot + svg). Pre-flight:
      `npm audit` 0 vulns, `npm outdated` none; counts refreshed (178 files /
      1281 exports / suite 2874 / 92.1%). The only new dep is the **optional**
      `@viz-js/viz` peer (svg only) — zero hard deps preserved.

- [x] ✅ **DONE — Physics-map visualization (`upt map --format=mermaid|dot`), 2026-06-19.**
      Render the physics hypergraph (quantities = nodes, equations = junctions)
      as Mermaid + Graphviz DOT **source text** from live graph data. Bipartite,
      clustered-by-connected-component (honors the disjointedness), status-colored
      junctions; proposed overlay opt-in via `--proposed` (visually quarantined).
      New pure lib `src/composition/graph-viz.ts` (`buildVizModel`/`edgeToJunction`/
      `toMermaid`/`toDot`); CLI `upt map` gains `--format=text|mermaid|dot` (default
      text unchanged) + `--out=PATH`. Docs page `docs/architecture/PHYSICS_MAP.md`.
      Design: `docs/superpowers/specs/2026-06-19-physics-map-visualization-design.md`.

- [x] ✅ **DONE — SVG output (`upt map --format=svg`), 2026-06-19.** Renders the
      map's DOT layout to an SVG graphic in one step via the optional `@viz-js/viz`
      peer (pure-WASM Graphviz — no native binary, no child_process). New public
      `renderDotToSvg(dot)` + `SvgRendererUnavailableError`
      (`src/composition/graph-viz-svg.ts`, lazy-loads the peer, actionable error if
      absent); `@viz-js/viz` in `optionalDependencies` so the package keeps zero hard
      deps. Committed rendered SVGs under `docs/architecture/maps/`. Design:
      `docs/superpowers/specs/2026-06-19-physics-map-svg-output-design.md`.

- [x] ✅ **RELEASED — v0.24.0 identity-consequence surfacer (2026-06-19;
      tagged `v0.24.0`, published to npm).** Release pre-flight: `npm audit` = 0
      vulns, `npm outdated` → bumped `@types/node` `^25.9.1` → `^26.0.0` (gates
      clean); security/correctness/hygiene review of the full diff since `v0.23.0`
      found no Critical/Important issues. `deriveProposedBridges()`
      (`src/composition/proposed-bridges.ts`) derives the one algebraic relation a
      `promising` canonical identification implies, via monomial elimination of the
      two source `scalarAst`s. Pilot = the Landauer photon `ν = (k_B·ln2/h)·T`
      (`erasure-energy ≟ photon-energy`). `upt discover --derive`. Firewall:
      status literal `'unadjudicated'`, no catalog/graph write, fully-quantitative +
      monomial gates (Jarzynski excluded), `promoteProposal` requires human evidence.
      Design/plan/review in `docs/planning/v0.24.0-*`. Now also: a separate
      `PROPOSED_BRIDGES` surface (catalog field-shape, `toProposedEntry`, own
      registry — `BRIDGE_EQUATIONS` stays the faithful 44, owner-chosen disposition
      2026-06-19), candidate-set-agnostic scope (`discover --derive` honors
      `--source=catalog|canonical|both`), `dedupByNormalForm` cross-proposal dedup,
      and the **bridge-source adapter** (`EquationSource`/`resolveSources`): bridge
      edges with a clean-monomial `symbolic` form now feed the generator (BE-16
      independently derives the Landauer photon at `--source=both`), and
      **leaf-name canonicalization** (`leafCanonMap`/`renameLeaves`, T→temperature
      by unique dim match) collapses the canonical + BE-16 derivations into ONE
      proposal with `alsoDerivableFrom`. Yield widened: **3 new bridge symbolic
      forms** (BE-51/18/20, drift-guarded) + **source enumeration** (`resolveSources`
      returns all sources, `derivePair` enumerates, BE-42 de-ambiguated, stub-gate
      refined to allow dimensionless input couplings). BE-18 unlocks a new
      dark-fermion temperature proposal at `--source=both`. Suite 2841. **Next
      (optional):** symbolic forms for the remaining monomial bridges; a
      bridge↔canonical leaf-name map so any residual `T`/`temperature` variants
      always collapse.

- [x] ✅ **DONE — canonical-only analysis follow-ups (2026-06-18), branch
      `claude/upt-analysis-no-bridge-kduiw0`.** Acted on the canonical-only discovery
      run (`upt discover --source=canonical`): (1) **magnitude-gate fix** — sourced
      representative values for `compton-wavelength`/`bohr-radius` so the gate stops
      false-rejecting atomic-scale links (Compton≟Bohr was a ~61-order anchor
      artifact); genuine clashes (planck≟bohr ~24 orders) preserved. (2) **canonical
      variable-name unification** — `T`→`temperature`, `M`→`mass`, Newton
      `m_1`/`m_2`→`mass`/`secondary-mass` (not both `mass`: buckinghamPi needs unique
      names + it's Newton's free mass-ratio). scalarAst untouched (linkage preserved).
      De-fragments the canonical map (14→12 components, anchored cluster 8→15) and
      drops the `mass≟m_1`/`m_2`/`temperature≟T` artifacts (funnel 66→44), 0
      contradictory throughout. Then (a) recorded the run as
      `docs/research/v0.23.0-canonical-only-baseline.md` (indexed) and (b)
      declared `de-broglie-wavelength → compton-wavelength` in
      `QUANTITY_IDENTIFICATIONS` (Compton = de Broglie at p=mc; folded onto the
      sourced compton node so the genuine planck≟compton clash survives) —
      funnel 44→33, promising 6→2, map 12→11 components, cluster 15→16, still 0
      contradictory. Suite 2813 passing. In `CHANGELOG.md [Unreleased]`.

- [x] ✅ **DONE — architecture-doc count refresh, 2026-06-18.** Ran `npm run
      docs:deps` and reconciled current-state docs against its reports: 174 source
      files, 1245 exports (489 re-exports), composition 26 files, suite 2806 passing
      / 275 files (coverage 160/174 = 92.0%). Updated `README.md`,
      `docs/architecture/ARCHITECTURE.md` + `COMPONENTS.md`. Generated
      `DEPENDENCY_GRAPH.md`/`TEST_COVERAGE.md`/JSON/YAML already current (re-run gave
      only a timestamp diff, reverted). `docs/planning/*` left as historical records.

- [x] ✅ **DONE — CLI documentation (`cli/README.md`), 2026-06-18,
      branch `claude/upt-analysis-no-bridge-kduiw0`.** New root `cli/` folder with a
      full `upt` reference: all 15 commands + aliases, the three run modes
      (`node bin/upt.mjs`, `npm run upt --`, `npx`), the
      `--source=catalog|canonical|both` flag, input syntax, flags, exit codes, and
      troubleshooting. The executable stays at `bin/upt.mjs` (package.json `bin`);
      the folder documents it rather than relocating it. Root `README.md` Quick Start
      now links to it and lists `canonical`/`recover`/`discover --source=canonical`.
      Examples verified against the live CLI. In `CHANGELOG.md [Unreleased]`.

- [x] ✅ **DONE — canonical-only discovery (no bridges in the mix), 2026-06-18,
      branch `claude/upt-analysis-no-bridge-kduiw0`.** Projects the standard-physics
      L-layer (`CANONICAL_EQUATIONS`) into the composition-graph edge vocabulary
      (`src/composition/canonical-graph.ts`: `canonicalToEdges` → `CANONICAL_GRAPH`,
      `CANONICAL_CONSTANTS`) so the existing discovery/analysis funnel runs on
      textbook physics ALONE, bridges excluded. Universal constants (G, c, ℏ, k_B,
      ε₀, σ_sb, b, e, m_e) baked into the evaluators (parity with the bridge graph —
      not graph nodes), with a DIMENSION guard so a future same-named variable
      (eccentricity `e`) is not silently baked. Every canonical equation → an
      `established` `law` edge; monomial-null entries get a NaN evaluator (retrodict
      abstains). CLI `--source=catalog|canonical|both` on `discover`/`candidates`/`map`
      (default `catalog` unchanged). Canonical-only run: 66 candidates → 8 promising
      (e.g. `compton-wavelength ≟ de-broglie-wavelength`) → **0 contradictory** — the
      regression harness pinned in `tests/composition/canonical-graph.test.ts`.
      Exported from the public manifest alongside `CATALOG_GRAPH`. In `CHANGELOG.md
      [Unreleased]`. Suite green (2806 passing). Adam+Eve-equivalent review applied
      (baked `m_e`, added dimension guard). **NOT yet released to npm.**
      - [ ] (follow-up, optional) the canonical registry uses two names for the same
            physical kind (`M`/`mass`, `T`/`temperature`, Newton's `m_1`/`m_2`) —
            canonical-only `discover`/`map` surface these as candidates/separate
            nodes. Unify the governing names in `src/canonical/entries/*` if desired.
      - [x] (follow-up, optional) `docs/architecture/COMPONENTS.md` header is stale
            at v0.10.0 (pre-existing, beyond this change); only the file/export
            counts were refreshed here. Full refresh is a separate doc task.

- [x] ✅ **DONE (Sub-project A) — canonical-equation registry (2026-06-17).**
      Founding-premise work: use the tensor to validate existing equations against
      standard physics + discover new bridge candidates. Decomposed A→D (see
      `docs/planning/Canonical-Equation-Registry-A-{Design,Review-Findings,Implementation-Plan}.md`).
      Shipped first: **CLI Windows fix** (pathToFileURL — all 13 `upt` cmds run on
      Windows) and the **`discover` magnitude-clash falsifier**
      (`src/composition/representative-values.ts`; kills 6 scale-clash decoys, keeps
      close coincidences for review). Then Sub-project A (22 canonical entries,
      L0/L1/L2 fidelity, engine-derived L0 fields, L-layer seeding, public surface)
      and B/C/D (linkage engine + F4 guard, discovery kinds, CLI).
      Suite 2774. **Held at npm publish for user review.**
  - [x] A-T1 — `CanonicalEquation` type + registry accessors (`src/canonical/`).
  - [x] A-T2 — promote 9 dimensional-derivation classics (L0).
  - [x] A-T3 — constant-registry extension (ε₀, derived σ_sb).
  - [x] A-T4 — L1 gravitation+thermo entries. (Resolved the freeGroups Q: computed
        from the Buckingham engine, so `monomial!==null ⟺ freeGroups===0` holds by
        construction — no invariant relaxation needed.)
  - [x] A-T5 — L1 quantum+EM entries (Coulomb/Planck-Einstein/de-Broglie/Bohr/Wien/Lorentz).
  - [x] A-T6 — numeric-prefactor self-tests (area/log-base/flux guards).
  - [x] A-T7 — registry invariants + OPEN-bridge coverage (`bridgesWithoutCanonicalPartner`, 39 gaps logged).
  - [x] A-T8 — L-layer seeding adapter (`canonicalToLaw` / `seedCanonicalLaws` / `CANONICAL_TENSOR_CONFIG`).
  - [x] A-T9 — L2 EFE node + Friedmann (L1) + public surface export.
  - [x] B — bridge↔canonical linkage (`src/canonical/{normal-form,linkage}.ts`):
        `normalForm` hash up-to-dimensionless-factors + `classifyLinkage`/`scanLinkages`
        with the F4 guard. Scan: Landauer≡16 restates-canonical (recovery exact);
        Landauer~29 Jarzynski genuine recovers; 17 dimensional-only. Exported.
  - [x] C — discovery canonical kinds: `canonicalKinds` (dimension-aligned) +
        `touchesCanonical` on `VettedCandidate`, additive/informational.
  - [x] D — CLI: `upt canonical` (registry+coverage) + `upt recover` (linkage scan).
        Verified on Windows.
  - [x] (release) **v0.22.0 published to npm** (2026-06-18, tag v0.22.0, CI green).
  - [x] (deferred-item) grew the canonical tranche: +Hawking temperature (restates 42),
        +light-deflection (partners 51), +perihelion (partners 52). 22→25 entries,
        gap 39→37, restates-canonical 1→2.
  - [~] (deferred-item) composition-derived recovery — **DEFERRED as premature**:
        only 5/41 edges have symbolic forms; CT-1 chain matches no canonical.
        Revisit when symbolic-form coverage + tranche grow.
  - [ ] (future, when warranted) add symbolic forms to more composition edges, then
        build composition-derived recovery; continue tranche growth for established
        bridges only (most remaining gap bridges are speculative — no standard partner).

- [x] ✅ **DONE — post-0.22.0 discovery/linkage hardening (2026-06-18,
      branch `claude/upt-physics-tensor-analysis-9s38dp`).** Acts on a fresh
      analysis run (`upt audit`/`recover`/`predict`/`discover`). Shipped, in
      `CHANGELOG.md [Unreleased]`: **`CE-jarzynski`** canonical entry — BE-29's
      L-layer partner (registry 25→26, gap 37→36, restates-canonical 2→3);
      **normal-form stub-identity tagging** — `normalForm` keeps named
      non-constant dimensionless stubs (`ln⟨e^−βW⟩`) distinct from constants
      (`ln2`), demoting the two BE-29 form-coincidences `recovers`→`dimensional-only`
      while preserving the 3 declared restatements; **discovery funnel hardening** —
      anchor-derived magnitude fallback + generic↔specialization bar +
      sourced BE-24/BE-26 representative values (funnel 23→12 promising, 6→20
      magnitude-clash); `docs/research/BE-29-Landauer-Recovery.md`; and a
      dependency-graph regen (`npm run docs:deps`) + architecture/README/CLAUDE
      stat refresh (173 files / 8 modules / 1236 exports / suite ~2796).
      **Merged to master** (auto-PRs #65–#69). **v0.23.0 prepped 2026-06-18:**
      `package.json` 0.22.0 → 0.23.0, CHANGELOG `[Unreleased]` finalized as
      `[0.23.0]` with the dep-health snapshot (audit 0 vulns, outdated none).
      **v0.23.0 PUBLISHED to npm 2026-06-18** (tag `v0.23.0` at `2c646cf`,
      `npm latest` = 0.23.0, CI green). Suite 2796 passing.

- [x] ✅ **RELEASE DONE — single rollup tag v0.14.0 at final HEAD (2026-06-16)**.
      Reconciled the lagged package.json version (0.10.0 → 0.14.0), updated the
      optional mathts-* peers to latest in-range + re-validated the suite against
      them (2620 passing; GL4_LONG=1 release-prep tier 8 passing), committed
      (d1fdd3b), pushed master + tag v0.14.0, **published to npm** (latest;
      `npm publish --ignore-scripts --access public`, 624 files), CI green. First
      npm publish since 0.7.3 (rolls up the UNRELEASED 0.8.0–0.13 milestones).
      Research note + Zenodo DOI still user-only (below).
- [x] ✅ **v0.15.0 — bridge-gradient numerical path + audit honesty (2026-06-16)**.
      Discovered `bridgeGradient` (reverse/forward AD) CANNOT differentiate the
      plain-JS catalog evaluators (empirically throws even with MathTSEngine — the
      TapedTensor doesn't survive `engine.toNested`); tape/dual AD only sees
      engine-traced ops, and P8 Decision #1 keeps evaluators plain-JS. Added
      `bridgeGradientNumerical` (central FD, cbrt-eps step, Adam-vetted) +
      `BridgeNumericalGradientResult`; replaced the dead `it.skip` placeholder with
      real analytic cross-checks (BE-42 −T_H/M, BE-11 multi-param) + a MathTS
      throw-guard; corrected the false "autograd would handle this" comments. Also
      fixed the plan-doc audit to skip `*-Brainstorm.md` ("not promises") + flipped
      7 audit-verified done items (`audit:plans` now exits 0). Published 0.15.0.
- [x] ✅ **DONE 2026-06-16 (v0.16.0) — bridge gradients ARE AD-differentiable.**
      Solved via a *different* lever than feared: NOT an evaluator rewrite, but
      reverse-mode AD over the symbolic RHS AST (`bridgeGradientAST`). Lowers the
      `*_RHS: ExprNode` through mathts-autograd's TapedTensor ops (var → traced
      input; other symbols → constant tape leaves), so the gradient is EXACT and
      the plain-JS evaluators stay untouched (P8 #1 intact). Scalar grammar is
      `symbol + op(+ − * / ^)` only (transcendentals are typed-stub symbols), so
      faithful encodings (BE-42) differentiate exactly; stub-encoded bridges
      differentiate w.r.t. the stub. Validated BE-42 `dT_H/dM=−T_H/M` exact + vs
      numerical + repeated-var accumulation. Published 0.16.0.
- [x] ✅ **DONE 2026-06-16 (v0.17.0) — by-id registry.** `BRIDGE_RHS_BY_ID`
      (`src/bridges/rhs-registry.ts`, 42 bridges, single source of truth — the
      round-trip test now derives from it) + `bridgeGradientASTById('BE-42','M',…)`
      + `astDifferentiableBridgeIds()` (exact-AD coverage discovery). Published 0.17.0.
- [x] ✅ **DONE 2026-06-16 (v0.18.0) — transcendental grammar + first faithful batch.**
      Added the `transcendental` scalar-AST node (exp/ln/logₙ/sin/cos/tan/sinh/cosh/
      tanh; dimensionless→dimensionless) across validator + numerical lowering +
      traced AD lowering + coverage predicate; `TranscendentalFn` is `@public`.
      Adam-vetted (YELLOW→addressed). Faithfully re-encoded **BE-37** (ln(R_far/R_near))
      and **BE-34** (exp(−mc²/k_BT_reh)) from stub symbols → exact AD w.r.t. the
      exposed variables; round-trip dimensional_signature preserved. Published 0.18.0.
- [x] ✅ **DONE 2026-06-16 (v0.19.0) — remaining exposable-variable bridges.** Added
      the `abs` node (dimension-preserving) and faithfully re-encoded BE-25 (log2),
      BE-40 (sin/cos of h/f), BE-41 (exp + abs of |φ−φ₀|), BE-45 (two natural logs),
      BE-46 (exp(−α/Λ)) — exact AD w.r.t. the exposed variables; round-trip preserved.
      Published 0.19.0. **The exposable-variable transcendental stubs are now
      exhausted** — remaining stubs are NOT exposable without further work: BE-29
      (ensemble average ⟨…⟩), BE-26/BE-38 (interpolation-function stubs f()/ν(z)),
      and BE-26's WKB `sqrt` of a dimensionful quantity (blocked on the deferred
      rational-exponent Dimension algebra below).
- [x] ✅ **NOT NEEDED — already supported (verified 2026-06-17).** The earlier
      "deferred rational-exponent Dimension algebra" item was based on a misread.
      `Dimension` exponents are already `number`; `power(D,n)` handles any rational n;
      and `^` with a NUMERIC-LITERAL exponent already works on a dimensionful base —
      `(m)^0.5` validates to `[M^0.5]`, lowers, and is exactly AD-differentiable
      (`TapedTensor.pow(k)`, fractional k). BE-12 (λ_T ∝ T^(−1/2)) was exactly AD-able
      all along. No dedicated `sqrt`/`cbrt` NODE exists, but it'd be redundant sugar
      (= `^0.5`). Regression guard: tests/dimensional/dimensionful-power-ad.test.ts.
      CHANGELOG [Unreleased] corrects the record.
- [x] ✅ **DONE 2026-06-17 (v0.20.0) — differentiable definite integrals.** The
      `integral` node gained optional `lower`/`upper` bounds; numerical lowering +
      traced AD via 16-pt Gauss–Legendre (`src/numerical/quadrature.ts`).
      `bridgeGradientAST` differentiates definite integrals (Leibniz parameter
      gradient + boundary term; nested ∫∫ via a scoped bound-var env). Adam-vetted
      YELLOW→addressed (honest framing: exact gradient of the quadrature, which
      approximates the true integral for non-polynomial integrands; exact for
      constant/polynomial). Published 0.20.0.
- [x] ✅ **DONE 2026-06-17 (v0.21.0) — BE-26 WKB re-encoded with explicit barrier
      bounds.** `∫_{x₁}^{x₂}√(2m(V−E))dx` (constant integrand → GL exact, matches the
      canonical evaluator to <1e-9) + Gamow factor `transcendental(exp, −1·WKB)`.
      bridgeGradientASTById('BE-26',…) now differentiates exactly w.r.t. m, V−E, x₁,
      x₂ (physical signs verified; f(T,pH,EM) stays a stub). **Adam + Eve both GREEN**
      (Eve back on o3 after the reload). Round-trip [frequency] preserved. Published.
- [ ] **Frontier (research-level):** ensemble averages (BE-29 `⟨…⟩`) and
      interpolation-function stubs (BE-26 `f()`, BE-38 `ν(z)`) remain non-closed-form;
      `bridgeGradientNumerical` (FD) serves them. No clean lever — large/open scope.
- [x] **v0.11 headline: full 44-edge catalog→graph migration** + the
      per-edge quantity-NAMESPACING design (the aliasing finding in the
      Phase-D report is the forcing function), + O-4 flat migration,
      + C2/C3 calibration targets, + second data confrontation.
      - CLOSED 2026-09-25 (tracker hygiene): the v0.11 namespacing gate shipped; O-4 was executed on
        2026-06-11 (its row below); the confrontations number 19. The catalog→graph migration stops at
        41 edges by design: 17 of the 55 bridges have no graph edge, 13 of them because they have no AST.
        The C2/C3 calibration targets remain on the standing physicist-review surface in NOTES.md.

## Open & pending — consolidated 3-agent audit, 2026-06-11

(Every line verified against HEAD `a18b64d`; stale claims from dated
audit docs were dropped — e.g. "EXPECTED_DIMENSION_BY_BRIDGE missing
BE-53/54" and "CLAUDE.md 42-bridge tally" are both already fixed.)

### User-only

- [x] ✅ **DONE 2026-06-16** — branch already merged to master (PR #64);
      **tagged v0.14.0** at final HEAD (not v0.10.0 — version field was lagged,
      reconciled to the documented v0.14 feature level); published
      (`npm publish --ignore-scripts --access public`); CI green (the workflow
      had in fact already run for PRs #63/#64 — the "never executed" note was
      stale). Strict `tsc -p tsconfig.tests.json` gate passes.
- [ ] Zenodo DOI for `docs/research/v0.10.0-Composition-Research-Note.md`
      + actually send it to a physicist.

### Code (next sessions, roughly priority-ordered)

- [x] ✅ **G-9 units-normalization — INCREMENT 2 (additive core) — EXECUTED
      2026-06-16** (`docs/planning/v0.14-G9-Increment2-Design.md`, Adam YELLOW +
      Eve YELLOW, all folded). Shipped deliverables 1–3: (1) the adapters
      (`toGeometrized`/`fromGeometrized`/`geometrizedFactor`/
      `NonGeometrizableDimensionError`) promoted `@internal`→`@public` + exported
      from `src/index.ts` (the x⁰=ct boundary API); (2) a geometrized-native
      Schwarzschild fixture (`tests/fixtures/schwarzschild-geometrized.ts`, ships
      `gFn`+`gInverseFn`); (3) the SI↔geometrized Kretschmann equivalence test —
      adapter exercised on the MASS input (`M_geom=GM/c²≈1477 m`), validated vs
      `K=48 M_geom²/r⁶` through the full FD pipeline, matched to the SI fixture's
      K. Adam caught the circular `fromGeometrized(K,L⁻⁴)` (factor=1 no-op) +
      the t-vs-ct chart conflation; Eve caught the `@public`-tag invariant gate +
      that the fixture needs `gInverseFn` + CUT the FD claw-back (provable
      unit-invariant ceremony, already covered by `pderiv-order*.test.ts`).
      STRICTLY ADDITIVE; default SI pipeline untouched. Suite **2595 passing**
      (+11); tsc src+tests, build, smoke ✓.
- [x] ✅ **G-9 INCREMENT 3 — DISPOSITIONED 2026-06-16**
      (`docs/planning/v0.14-G9-Increment3-Disposition.md`, Adam GREEN on the
      decline). The default-pipeline migration was **DECLINED**: its premise
      (c=G=1 improves FD precision) is refuted — relative FD error is unit-
      invariant and MEASURED no-better (Adam reproduced + extended: geometrized
      far-field Kretschmann relErr DIVERGES, 0.40 at r=1000·r_s vs SI ~3.8e-8);
      the dynamical consumers use analytic closures not FD, and E=−p_t≈9e16 is
      conserved bit-exact (symplectic, cyclic coord). No precision win, no
      maintenance win (pipeline is convention-agnostic) → strictly losing trade.
      The **fixture-name consolidation was DONE**: hard-renamed all `unitless*`
      (c=1) closures → `geometrized*` (shared Minkowski fixture + its importer +
      the bianchi-residual test-local de Sitter/Schwarzschild closures), so the
      suite carries exactly SI + geometrized with consistent naming. Suite **2595
      passing** (pure rename); tsc src+tests ✓.
- [ ] **G-9 follow-on (separate axis, deferred):** the Eve M-1 per-quantity
      unit-convention tag (GeV/J, bits/nats) — distinct from c/G geometrization.
- [x] ✅ **Distributional / variational grammar primitives (v0.14) — EXECUTED
      2026-06-16** (`docs/planning/v0.14-Distributional-Grammar-Design.md`,
      Adam GREEN + Eve YELLOW→GREEN, all findings folded). Closes the ROADMAP
      "grammar extensions for genuinely-deferred primitives". Two new SCALAR
      `ExprNode` arms: `dirac-delta` (`[δ(x)]=[x]⁻¹`) + `variational-derivative`
      (`[δF/δφ]=[F]/([φ]·[μ])`, `over` = measure dim, dual of `integral`). Both
      reject tensor children (`TensorInScalarOpError`) and throw in `lowering`
      (non-numerical, beside integral/derivative). Makes BE-15's Model-A
      Langevin/FDT relation dimensionally homogeneous (marquee test + a negative
      test); BE-15 docstring records barriers 1+2 lifted, bare-Langevin Γ
      disambiguated from coarsening Γ=L²/T. Adam caught the expr-simplify.ts
      audit gap + the Γ self-contradiction; Eve caught the README "21 node
      kinds"→23 count + the null short-circuit / 3-child guard. INLINE union
      members ⟹ zero public-surface change (1162 exports unchanged); no new src
      files. CATALOG re-encoding (BE-15 faithful Langevin, BE-28 MEPP σ=ΣJX
      definiendum-warning) + barrier 3 (functional integration) deferred to
      physicist. Gates: both tsc ✓, full suite **2566 passing** (+16), build +
      smoke ✓. FOLLOW-UP (2026-06-16): grammar applicability tested across the
      full catalog (`tests/bridges/catalog-grammar-applicability.test.ts`, +10).
      Survey of 44 bridges + known laws → 3 applicable: BE-15 fully expressible;
      BE-46 (δ expressible, functional metric-integral = barrier 3); BE-28
      (variational-δ expressible on ∫σ dt, Lagrange-multiplier + index-sum
      remain). Regression: BE-15/28/46 encoded RHS unchanged, use neither new
      kind. Suite **2576 passing**.
- [x] ✅ **G-9 increment 1 — geometrized boundary adapters — EXECUTED
      2026-06-15** (`src/numerical/geometrized.ts`, internal;
      `docs/planning/v0.13-G9-Adapters-Plan.md`, Eve-vetted on the Adam-vetted
      r2 design). Dimension-functor-driven SI↔geometrized conversion
      `G^M·c^(T−2M)` + I/Θ/N/J domain guard (NonGeometrizableDimensionError
      extends UPTError). Eve caught the design's M_sun pin (1476.6 m IAU-nominal
      ≠ repo's 1477.06 m); pins fixed + error-class convention. ADDITIVE, zero
      blast radius. src 156→157; exports 1158→1162 (internal); no public-surface
      change. Gates: both tsc ✓, full suite **2550 passing** (+9), build ✓.
- [x] ✅ **Symbolic exponents on a dimensionless base (v0.13) — EXECUTED
      2026-06-15** (`docs/planning/v0.13-Symbolic-Exponent-Design.md`,
      Adam+Eve-vetted, both YELLOW → all r2/r3 revisions folded). Bounded core
      `^`-grammar extension: a non-literal (input-dependent) exponent is now
      accepted when the base is DIMENSIONLESS (sound:
      dimensionless^dimensionless = dimensionless). validator.ts `^` arm +
      evalExpr relaxed; literal exponents unchanged; dimensionful-base
      non-literal still violates (test 206 pinned). Consumer: be33Edge now
      carries the faithful `ξ_0·(T/T_0)^(−1/z)` symbolic form (was pinned z=1),
      drift-guarded vs evaluateHertzMillis with z=2; catalog AST unchanged.
      Adam caught the tensor-exponent throw + null short-circuit; Eve caught
      that be33Edge already exists in catalog-full.ts (mutate, don't recreate).
      No new exports (1158). Gates: both tsc ✓, full suite **2541 passing**
      (+9, no regressions), build+smoke ✓. Broadens symbolic coverage to
      scaling-law bridges; does NOT make CI-1 checkable (over-determination).
- [x] ✅ **Orphan-connector analysis (v0.12) — EXECUTED 2026-06-15**
      (`proposeOrphanConnectors` / `upt connectors`;
      `docs/research/Orphan-Connector-Analysis.md`; spec Part-IX §9 note).
      Used the new feature map to analyze the catalog's 20 isolated bridges:
      intersect cross-cluster same-dim candidates with the isolated/anchored
      partition. 7 orphans have a same-kind connector, 12 are unconnectable.
      Physics review CONFIRMED CI-1/CI-2 (BE-15→BE-33/34 criticality) as the
      only motivated ones and REJECTED the rest with grounded reasoning (BE-22
      TEE gapped; Förster≠horizon; proton-mass≠carrier-mass;
      hubble≡decoherence decoy) — a quantified negative, nothing registered.
      Also documented: a "rich" arbitrary anchor turns all 132 discover
      candidates contradictory (consistency needs a physically-consistent
      seed). **CORRECTION (2026-06-15, after investigating the "symbolic test
      CI-1" follow-on):** CI-1 is an OVER-DETERMINATION, not a composition —
      both `coarsening-length` and `quantum-correlation-length` are only ever
      targets (never sources), so identifying them merges two independent
      derivations, not a chain; `composeSymbolic` does not apply. Its
      confirmation is fundamentally a physicist's dynamic-scaling judgment, not
      more tooling (see the corrected §"Can CI-1 be mechanically checked?" in
      `docs/research/Orphan-Connector-Analysis.md`). Separately, BE-33/34 are
      grammar-blocked (variable critical-exponent powers `(T/T₀)^(−1/z)`); a
      bounded `^`-on-dimensionless-base extension is a candidate FUTURE
      foundation cycle (Adam+Eve), but would not make CI-1 checkable. exports
      1157→1158; no new src file (added to bridge-analysis.ts); no
      public-surface change. Gates: both tsc ✓, full suite **2532 passing**
      (+6), build ✓.
- [x] ✅ **MathTS-backed symbolic simplification (v0.12) — EXECUTED
      2026-06-15** (`docs/planning/v0.12.0-Symbolic-Simplification-Design.md`,
      Adam+Eve-vetted). Optional supplement removing the "unsimplified composed
      AST" caveat: `simplifyExpr`/`simplifyObservable`
      (`src/composition/expr-simplify.ts`, internal; `upt symbolic --simplify`)
      gensym-render → MathTS `parse`+`simplify` → walk back, behind the
      Path-A/Path-B contract (absent peer = graceful no-op). THREE guards
      (dimensional `equals`, structural subset, numeric agreement over ≥2
      probes) make the black-box CAS safe. CT-1 folds
      `k_B·(ℏc³/8πG·mass·k_B)·ln2` → `ℏc³·ln2/(8πG·mass)` (k_B cancels); CT-1b
      no-ops (a MathTS simplify BigInt bug on `a/(b/c²)` — caught + degraded).
      Adam+Eve: both YELLOW, 11 r2/r3 revisions folded (node API + round-trip
      runtime-verified; Eve caught the `^`-base precedence bug EVE-A + the
      `<2 probes` vacuous-pass EVE-C; claims grep-verified). FULL MathTS npm
      perspective recorded: mathjs-lineage CAS (`simplify`/`derivative`);
      `mathts-core` also has a units engine + `BigNumber`/`Fraction` (out of
      scope — UPT's ℤ⁷ Dimension is bespoke). `derivative` is a future hook for
      the gradient/uncertainty layers. src 155→156; exports 1153→1157; no
      public-surface change. Gates: both tsc ✓, full suite **2526 passing**
      (+6), build+smoke ✓.
- [x] ✅ **Symbolic bridge composition / Observable contract (v0.12) —
      EXECUTED 2026-06-15** (`docs/planning/v0.12.0-Symbolic-Composition-Design.md`,
      Adam+Eve-vetted). Pushes composition from numeric-only to SYMBOLIC:
      `composeSymbolic(first, second)` substitutes `first.symbolic` into
      `second.symbolic` at the junction → an `Observable` (validated AST +
      evaluable). Resolves the Part-IX §4 deferral via option (d): optional
      `symbolic?: ExprNode` on `BridgeEdge` (additive/non-breaking). Built the
      missing scalar `evalExpr` + `substitute` primitives + a `CONSTANTS`
      registry. Authored symbolic forms for the CT-1/CT-1b chain edges; a
      drift guard binds each to its numeric evaluator (rel tol 1e-9). Marquee:
      CT-1b recovers solar-mass T_H = 6.17e-8 K SYMBOLICALLY, matching the
      numeric composeEdges. Adam+Eve: both YELLOW, 13 r2/r3 revisions folded
      in (Opus-subagent stand-ins per the MCP-down fallback; Eve's file:line
      claims grep-verified — she caught the recon misnaming
      `landauer-erasure-energy`). Public: +composeSymbolic/Observable/
      SymbolicCompositionError/SymbolicEvalError/ComposeSymbolicOptions. src
      151→155; exports 1137→1153. CLI: `upt symbolic`. Gates: both tsc ✓, full
      suite **2520 passing** (+19), build+smoke ✓, snapshot updated.
      NEXT (future): author `symbolic` forms for more edges; symbolic
      simplification (constant-folding) is deliberately out of scope.
- [x] ✅ **Premise-extension directions (v0.12) — EXECUTED 2026-06-15**
      (`docs/planning/v0.12.0-Premise-Extensions-Design.md`). Four extensions
      advancing the tensor-maps-physics premise by wiring existing
      verification primitives into generative tools. **D3** — equation-level
      valence homogeneity in `validateEquation` (closes the deferred Task-7
      free-index check; a tensor=scalar is now caught even when units match).
      **D1** — `bridge-prediction.ts` (internal; `upt predict`): projects
      CATALOG_GRAPH onto the (scale×force) plane, populates a real
      `UniversalTensor`, ranks empty regime cells as link hypotheses
      (40/41 edges placed). **D2** — `discovery.ts` (internal; `upt discover`):
      vets `proposeLinkCandidates` via merge/unlock/retrodict →
      promising/inert/contradictory (132 → 26/106/0). **D4** —
      `confrontation-coverage.ts` (internal; `upt coverage`): grounding-tier
      audit (2 data-confronted, 36 graph-computable, 6 encoded-only, 0 thin),
      fabricates nothing. All review surfaces, not automated discovery. src
      148→151; exports 1130→1137. Gates: both tsc ✓, full suite **2501
      passing** (+24, no regressions), build+smoke ✓, 3 new CLI commands ✓.
      NEXT (human): physicist review of the `upt discover` promising set and
      the `upt predict` top regime-gaps; both are explicitly review surfaces.
- [x] ✅ **Dependabot fix + dep refresh — EXECUTED 2026-06-15.** Resolved
      the 2 default-branch Dependabot alerts (1 high RCE GHSA-gv7w-rqvm-qjhr
      + 1 low GHSA-g7r4-m6w7-qqqr) by removing the dead `@yao-pkg/pkg`
      dev-dep + `build:exe` `.exe`-packaging path from all three `tools/`
      utilities — it transitively pulled vulnerable esbuild 0.27.7 and every
      `@yao-pkg/pkg` release still pins `esbuild@^0.27.3` (no upgrade path;
      the tools run via tsx, the `.exe` was never committed/used). Deleted
      the lone committed tool lockfile (the only Dependabot scan target;
      siblings never had one). Within-range `npm update` refresh (mathts
      0.2.1→0.2.2 / 0.2.2→0.2.3, @types/node, vitest 4.1.7→4.1.8). Dep
      health now: `npm audit` 0 vulns, `npm outdated` clean. Gates: both
      tsc ✓, full suite 2477 passing (unchanged), build+smoke ✓.
- [x] ✅ **Lean sprint — EXECUTED 2026-06-14** (S1/S2/S3/S4/M1/M2;
      `docs/planning/Lean-Sprint-Plan.md`). Post-v0.8–v0.11 simplify pass:
      dep-graph deep dive found 0 dead files / 0 cycles → wins are dedup +
      surface trim, no behavior change. S1: extract the 41-edge graph
      (rebuilt ~10 places) into the `@public` `CATALOG_GRAPH`. S2: audit
      test imports `attemptDerivation`/`dimensionalFreedom` instead of
      private copies. S3: shared `tests/fixtures/dimension.ts` `D` factory.
      S4: extract `quantityCanonicalizer`/`quantitiesOf` (anchoringDistance
      raw-name behavior preserved). M1+M2: un-exported 10 internal-only
      symbols (`FieldSpec`/`LowerNodeRecur` + result-type interfaces
      retained — params/returns of exported fns, `.d.ts` emit). Dep-tool
      unused exports 37→27; src files 147→148; exports 1135→1130. Gates:
      both tsc ✓, full suite 2477 passing (unchanged), build+smoke ✓.
- [x] ✅ **v0.11 headline — EXECUTED 2026-06-11**: namespacing gate
      landed first (Option D per Adam r2 — all six acceptance criteria
      pass: CompositionAliasError name-collision rule,
      SOURCE_ALIAS_DISPOSITIONS registry, renameSecond input-remap,
      centralized quantities.ts (~120 nodes, uniqueness-pinned),
      M_E_SI, be48 docstring fix, λ_T(m_e,T_H)=3.0012e-4 m pins) —
      then the full migration: **+26 catalog-full edges → 41-edge
      graph** (5 NOT-A-BRIDGE skipped per rejected.ts; BE-44 honestly
      skipped — array-input evaluator incompatible with the scalar edge
      contract). Naming judgments recorded (effective-mass /
      tunneling-mass distinct from gravitational mass). Enumeration over
      the full graph: 11 compositions, **7 novel candidates** (all via
      the T_H identification), 1 collision correctly held at the gate —
      docs/research/v0.11.0-novel-candidates.md. REMAINING HUMAN: the
      ~90 new quantity-naming judgments are standing review surface
      (CONTRIBUTING).
- [x] ✅ **Identifiability classifier — EXECUTED 2026-06-13**
      (`src/composition/identifiability.ts`: classifyIdentifiability /
      classifyAll / forwardClosure; 15 tests). Structural over/exactly/
      under-determined + given verdicts over the directed edge
      hypergraph; honors QUANTITY_IDENTIFICATIONS; target-removed closure
      excludes circular self-support; blockingFrontier for
      under-determined. Real anchor: from {mass}, hawking-temperature is
      over-determined (be-42 + be-42-via-rs). Implements Consequence 1 of
      docs/planning/Bridge-Inference-Epistemics-Note.md (design note:
      Identifiability-Classifier-Design-Note.md). 3 runtime exports added
      (surface 155→158; snapshot updated).
- [x] ✅ **Buckingham-π enumerator — EXECUTED 2026-06-13**
      (`src/dimensional/buckingham.ts`: buckinghamPi /
      dimensionallyDetermines / RationalizationError; 11 tests). Null
      space of the dimension matrix in EXACT rational arithmetic → the
      n − r dimensionless groups; dimensionallyDetermines returns the
      target's monomial UP TO A DIMENSIONLESS CONSTANT. Result types
      carry FORM only (no value/constant field) — the honest boundary
      enforced in the API. Pins pendulum T=const·√(L/g), r_s=const·GM/c²,
      and that mass alone does NOT determine r_s. Build target 1 — the
      LAST piece of the epistemics note; all three inference primitives
      now shipped. 3 runtime exports (surface 160→163; snapshot updated).
- [x] ✅ **Retrodiction harness — EXECUTED 2026-06-13**
      (`src/composition/retrodiction.ts`: retrodict / retrodictNode; 10
      tests). Masks each over-determined node, recovers it via every
      independent derivation from ground-truth inputs, scores relative
      spread (consistent / inconsistent / single / unrecoverable; headline
      allConsistent). Pass bar PRE-REGISTERED (spread ≤ 1e-6) in
      docs/planning/Retrodiction-Harness-Design-Note.md. First-run anchor
      (passing): {mass: M_sun} → hawking-temperature consistent (be-42 vs
      be-42-via-rs agree to float precision) + recovers 6.17e-8 K. `classifyAll`
      is the feeder, as the epistemics note anticipated. Implements
      Consequence 2. 2 runtime exports (surface 158→160; snapshot updated).
      REMAINING from the epistemics note: the Buckingham-π enumerator
      (build target 1) is the last unbuilt piece.
- [x] ✅ **`explainQuantity` unified entry point — EXECUTED 2026-06-13**
      (`src/composition/explain.ts`: explainQuantity; 7 tests).
      Synthesizes the identifiability classifier + retrodiction harness +
      Buckingham-π into one QuantityExplanation with a plain-language
      summary (how the graph computes the target, whether redundant
      derivations agree, the recovered value, and whether the known set
      is dimensionally sufficient). Closes the bridge-inference suite —
      three primitives + the unifying entry point all shipped. 1 runtime
      export (surface 163→164; snapshot updated).
- [x] ✅ **Full-chain derivations + explain CLI + dimensional-derivation
      benchmark — EXECUTED 2026-06-13.** (a) `DerivationExplanation` now
      carries `leafInputs` (last-hop sources traced to the leaves) +
      optional `dimensionalForm`; `traceLeaves` helper. (b)
      `examples/explain.mjs` + `npm run explain` surface the summary for
      non-TS users. (c) Benchmark of 9 textbook equations (pendulum,
      Kepler, Schwarzschild, string wave, Planck length/mass/time,
      Compton, thermal de Broglie/BE-12) + Reynolds re-derived by the
      Buckingham-π engine, pinned in
      tests/dimensional/derivation-benchmark.test.ts and recorded in
      docs/research/Dimensional-Derivation-Benchmark.md (verbatim engine
      output).
- [x] ✅ **Bridge-equation dimensional audit — EXECUTED 2026-06-13**
      ("try to derive the bridge equations"). Pointed the Buckingham-π
      engine at all 41 catalog edges: 11 DERIVED (form closes + monomial
      matches the evaluator, recovering prefactors ln2, 1/4π, 1/8π, 2,
      √2π, 4), 5 DECOY-ONLY (dimensionally valid but wrong form — e.g.
      be-42-direct → rest-mass temperature; be-27 → additive), 25
      UNCLOSABLE (irreducible free group). Empirical confirmation of the
      epistemics-note thesis on the catalog itself.
      tests/dimensional/bridge-derivation-audit.test.ts +
      docs/research/Bridge-Equation-Dimensional-Audit.md.
- [x] ✅ **Dimensional-complexity spectrum + orthogonality caveat —
      EXECUTED 2026-06-13.** Graded the non-derived bridges by free
      dimensionless-parameter count (0→6); 11 are one ratio from a
      monomial (incl. established perihelion/Shapiro). Cross-tab vs
      catalog status proves derivability ⊥ credibility (unclosable holds
      5 established; derived is 8/11 speculative). Audit doc gained the
      "not a credibility score" caveat + triage guidance. Possible future
      promotion: `freeParameters`/`dimensionalComplexity` as a public
      engine primitive (currently test-side).
- [x] ✅ **Bridge-priority scorecard — EXECUTED 2026-06-13.** Internal
      `src/composition/bridge-analysis.ts` (dimensionalFreedom /
      attemptDerivation / anchoringDistance / bridgePriority) ranks the 32
      non-established bridges by structural DECIDABILITY (grounding +
      complexity + anchoring + data-confrontation flag) into Tiers 1/2/3
      (8/6/18). Runnable via `npm run bridge-priority`; doc
      docs/research/Bridge-Priority-Scorecard.md; 11 tests. Framed
      throughout as triage, NOT credibility (orthogonality pinned).
      Internal — not on the public surface. Future option: promote to a
      public analysis API alongside adjudicateCatalog.
- [x] ✅ **Custom equations in the CLI (Path B) — EXECUTED 2026-06-14.**
      Self-contained scalar formula parser (src/numerical/formula.ts,
      behind a `FormulaParser` interface for Path A swap) + dimension-spec
      parser (src/dimensional/dimension-spec.ts), both internal/safe.
      CLI: `upt eval` (evaluate a user formula) + `upt derive
      <target:dim> <var:dim>… [--formula]` (derive a user equation's
      dimensional form + recover the prefactor). 17 tests. Pendulum demo
      recovers 2π. **Path A (MathTS parse/AST) deferred — user will
      publish synced MathTS package versions (`create(all)` currently
      breaks on a missing `Unit` export, core 0.1.2 vs expression 0.2.x);
      then swap a MathTS `FormulaParser` impl behind the same interface.**
      Full plan written:
      `docs/planning/MathTS-Formula-Integration-Design-Note.md` (blocker,
      seam, registry+conformance design mirroring engine-registry/
      engine-conformance, Phase-2 dimensional-checking payoff, rollout
      steps). BLOCKED on the upstream MathTS `create(all)` assembly gate.
- [x] ✅ **Path A (MathTS formula parser) — EXECUTED 2026-06-14.**
      Upstream gate met (mathts-core@0.1.3 exports `Unit`,
      mathts-functions@0.2.2 ships assembled `parse`/`evaluate`).
      formula-mathts.ts + formula-registry.ts +
      mathts-functions.ambient.d.ts; shared conformance suite both parsers
      pass; CLI wired through the registry (--debug shows the active
      parser). MathTS stays optional (UPT still zero-hard-dep); diverges
      from Path B only on `e` (Euler).
- [x] ✅ **Path A Phase 2 (formula dimensional check) — EXECUTED
      2026-06-14.** src/numerical/formula-dimension.ts transpiles the
      MathTS formula AST → UPT ExprNode and runs validate(), so
      `upt derive --formula` reports homogeneity + inferred dimension +
      target match (pendulum → [time]; length+gravity → not homogeneous;
      sin(length) → rejected; Hawking → [temperature]). Transcendentals
      via the typed-stub pattern. MathTS-only (needs the AST). Design:
      docs/planning/Formula-Dimensional-Check-Design-Note.md. 9 tests.
      Closes the MathTS integration arc.
- [x] ✅ **Phase 2 made default-on — EXECUTED 2026-06-14.** Exposed Path
      B's AST (parseFormulaToAst/evalFormulaAst) + a transpilePathB so the
      dimensional check works WITHOUT MathTS; getFormulaDimensionChecker()
      never null (MathTS AST when present, built-in AST otherwise — same
      ExprNode, builtin↔mathts parity test). The MathTS-only limitation is
      gone; MathTS is now a parity-equivalent alternate AST source.
- [x] ✅ **Catalog linkage map — EXECUTED 2026-06-14.** linkageMap in
      bridge-analysis.ts: connected components of the catalog graph by
      shared quantity (+ identifications). 23 components — one anchored
      cluster of 16 (mass/temperature hubs), a cosmological-constant
      cluster (3), a Friedmann cluster (2), 20 isolated; 11 compositions.
      `upt map` command; docs/research/Catalog-Linkage-Map.md; 6 tests.
      The capstone "map their linkage" deliverable. Structural, NOT
      credibility.
- [x] ✅ **Link-candidate proposals — EXECUTED 2026-06-14.**
      proposeLinkCandidates uses the map to surface cross-cluster
      same-dimension identification candidates: 132 → 98 core → 36
      same-kind → ≈3 genuinely motivated (critical-dynamics correlation
      length linking isolated be-15 to the Kibble-Zurek cluster). Funnel
      quantifies the dimensional false-positive rate; output is a REVIEW
      surface only. `upt candidates`; Linkage-Candidate-Proposals.md; 6
      tests. HUMAN follow-up: physicist review of the ≈3 (esp.
      coarsening-length ≟ correlation-length).
- [x] ✅ **3 candidates added to the spec — EXECUTED 2026-06-14.**
      Part-IX §9 (Phase-D candidate identifications): CI-1 correlation
      length, CI-2 critical timescale, CI-3 info–cosmology energy, all
      marked PROPOSED/UNADJUDICATED with an adjudication checklist; NOT in
      QUANTITY_IDENTIFICATIONS. Spec README + spec CHANGELOG updated.
      Pending: physicist adjudication before any promotion.
- [ ] C2 (Einstein-Cartan Newtonian limit — needs weak-field-limit
      machinery) + C3 (Higgs→Λ residue) calibration targets; P-3
      pre-registration required. **(2026-06-16 disposition: NOT engineering —
      physics-blocked.** C2 needs weak-field-limit machinery that does not exist
      AND a physicist's derivation — BE-17 encodes a torsion-norm scalar with
      none of the quantities a Newtonian limit relates. C3 has no closed-form
      relation or literature anchor in the repo (the edges share no quantity; the
      Λ "residue" is the famous unsolved problem). Implementing either = fabricating
      physics. **Stays on the human-physicist surface.**)
- [x] ✅ Second data confrontation — EXECUTED 2026-06-11: BE-23 vs
      Legros et al. 2019 Nat. Phys. 15:142 Planckian-dissipation claim
      (confrontBE23 + uncertainty; HONEST AGGREGATE encoding — network
      blocked per-material table verification, refused to fabricate:
      α = 1.0±0.4 abstract-level claim with machine-readable
      encodingHonestyLevel marker; upgradeable in place; 14 tests).
- [ ] G-9 units-normalization implementation — note VETTED 2026-06-11
      (Adam YELLOW; r2 revisions applied in the note: x⁰=ct convention,
      Q_geom = Q_SI·G^m·c^(t−2m) formula, criterion-(b) reframed as a
      measured gate per the FD unit-invariance derivation, unitless*
      fixture subsumption, factor pins). **Implementation = v0.12** (the
      next foundation-change slot).
- [x] ✅ O-4 — EXECUTED 2026-06-11: computeKretschmann/WeylInputs
      widened (non-breaking union), 6 shims removed (2 left with reason
      — evaluateNumerical boundary), sibling fixtures unified to
      Float64Array; PLUS the Kretschmann optimization: exact factored
      raising (4×4⁵ vs 4⁸, no symmetry assumption) → **29.8× compute
      speedup** (pipeline 2.15×, now FD-dominated); value-identity pins
      <1e-15 incl. random non-symmetric tensors.
- [x] ✅ Klein-Gordon evaluator — EXECUTED 2026-06-11
      (src/numerical/klein-gordon.ts: dispersion residual +
      plane-wave verifier, Peskin & Schroeder §2.1; 18 tests; Part-X
      §X.7 updated honestly — FD wave-operator on grids remains
      future).
- [x] ✅ Kretschmann optimization — EXECUTED 2026-06-11 (see O-4 entry:
      factored raising, 29.8×).
- [x] ✅ Flux Rule-3 WARNING→ERROR promotion — **PROMOTED 2026-06-11**
      (user decision Q1; live catalog verified clean first — 23/23,
      zero reverse arrows; reverse bridges now fail-atomic at addCell;
      whitelist is the deliberate-reverse escape hatch; 3 pins updated).
- [x] ✅ Grammar extensions (Dirac-δ correlators for BE-15; variational-δ
      for BE-28 MEPP) — **GRAMMAR DONE v0.14** (see completed-log entry above).
      The two scalar `ExprNode` arms ship + are vetted + proven on the Model-A
      FDT relation. What REMAINS (now a physics-curation surface, not grammar):
      the actual CATALOG re-encoding of BE-15 (faithful Langevin) and BE-28
      (faithful MEPP maximization, mind the σ=ΣJX definiendum warning) — a
      physicist's call (moved to the human-physicist surface below). Barrier 3
      (functional integration over field configurations) stays out of scope.
- [x] **`unused-analysis.md` 19-export cull — STALE, nothing to do (verified 2026-08-29).**
  The regenerated report now reads **0 potentially unused files, 0 potentially unused exports**.
  The 19 no longer exist; the entry was carrying phantom work.
- [ ] Remaining from that line:
      `mergeAxes` rank-changing reshape (labeled-tensor); regime
      built-ins taxonomy (deferred v0.9 in code comments).

### Human-physicist (standing review surface — CONTRIBUTING.md)

- [ ] Contested adjudications: BE-44 (soft hair), BE-46 (multiverse
      measure), BE-50 (Wheeler-Feynman) — both readings in
      `docs/architecture/v0.8.0-catalog-adjudication.md`.
- [ ] Novel-candidate verdicts: 2 candidates in
      `docs/research/v0.10.0-novel-candidates.md` (review protocol in
      the file; `be-42-via-rs>>be-12` is the clean one).
- [ ] `QUANTITY_IDENTIFICATIONS` review (currently the T_H ≡ T
      judgment + each future migration naming).
- [ ] BE-23 encoding check vs Hartnoll 2015; standing
      JSON-catalog/dimensional-signature audits; negative-catalog
      rebuttals (`src/bridges/rejected.ts`).

- [x] ✅ **G-9 design note** shipped 2026-06-11
      (`docs/planning/v0.10.0-Units-Normalization-Design-Note.md`).
      **Implementation remains OPEN** (see Open & pending §code below) —
      one foundation change per cycle; Adam+Eve vet the note before
      planning.

- [x] ✅ **v0.8.0 — composition MVP + GW170817 confrontation + catalog adjudication — IMPLEMENTED + MERGED (PR #28); tag superseded by the single-v0.10.0-tag rollup decision** (2026-06-11, branch `claude/bridge-equations-specs-review-4mfy38`). Implements `docs/planning/v0.8.0-Improvement-Plan.md` top picks via Design r2 (Adam-vetted) + 8-phase plan. Shipped: `src/composition/` graph layer with all three PRE-REGISTERED targets passing (CT-1 derives E_min(M)=ℏc³ln2/(8πGM) from BE-42∘BE-16 — the framework's first derived literature-anchored relation; CT-1b law-mediated chain through the first diagonal-law edge; CT-2 BE-51/52 M-independent ratio); `confrontBE36()` GW170817 real-data confrontation (BE-36's symmetric encoding honestly flagged vs the asymmetric published bound); membership criterion + negative catalog (BE-42 REVERSED to bridge — deferred Adam-HIGH resolved; BE-28/29/32/35/40 NOT-A-BRIDGE upheld incl. the deferred BE-29 reconsider; BE-44/46/50 contested → CONTRIBUTING.md tasks); first CI workflow; fast-check property tests; `data/bridge-catalog.json` review surface + freshness guard; Part-VI §XXX-B promotion protocol. Suite 2126 → **2181/0/5/1** (209 files); tsc/build/smoke clean. *(2026-06-11 audit update: the standalone v0.8.0 tag is superseded — package.json is at 0.10.0 and the recommendation is one v0.10.0 tag at final HEAD; CHANGELOG keeps the per-milestone sections.)* Same branch also carries the spec-review arc (44-bridge spec catalog completion, Part-X, spec CHANGELOG relocation, README condensation). Post-vet punch-list applied pre-tag (identificationUsed provenance, double-evaluation fix, membership barrel merge, M_SUN_SI promotion). **C1 pointer: DONE 2026-06-11 — CT-3 (Zurek decoherence scaling, BE-12∘BE-11) pre-registered (`4fe47f4`) and implemented (`159dd5c`) per the P-3 discipline.**
- [x] ✅ **v0.9.0 hygiene sprint (was "v0.7.2") — EXECUTED 2026-06-11** on branch `claude/bridge-equations-specs-review-4mfy38` (honest deviation: the plan's own branch `claude/changelog-todo-sync-9PdMg` was stale vs post-v0.8.0 HEAD and this env can only push the designated branch). All phases complete: Phase 0 baseline (counts re-verified at HEAD — O-1/O-6 80 non-comment callsites/24 files vs plan's ~53; plan's comment-filter regex was a no-op on grep output); Phase 1 PG pilot (+R-1b); Phase 2 single-reviewer vet YELLOW (H-1 PG-bench silent NaN fixed; M-1 spawned the tsconfig.tests.json diff-gate, 71 legacy errors baselined); Phase 3 Schwarzschild high-volume (fixture Float64Array(16)/(64), 4 hot-path src files dim-stride, 17 test/bench files, R-1/R-1c; killing.ts correctly NOT migrated — lower-metric providers, plan-list error); Phase 4 S-9 registry + compile-time exhaustiveness (+8 pins); Phase 5 bench gate **SHIP-WITH-NOTE: PO-1 1.56×/1.62×** (same-machine ratios; Windows baselines inapplicable). Suite 2186 → **2194/0/5/1**. Carry-forwards intact: O-4, sibling fixtures, MathTS peer docs, BE-25 archive (superseded by v0.8.0 P-4 policy — resolvable any time). Perf-focused sprint carrying v0.7.1's deferred O-1 + O-6 + the v0.7.1-simplify-brainstorm S-9. **Design vetted YELLOW by both Adam (3H/7M/3L at `8f74e95`) + Eve (1H/4M/6L at `c142634`); all HIGH findings closed in design r2 (`9c92d11`).** Plan r1 (`6e57c1b`) operationalizes the design into 15 tasks across 5 phases (+ Phase 0 baseline).
      
      **Sprint goals** (per design r2):
      - **O-6 PG metric** Float64Array migration (Phase 1 pilot — small surface, ~5 callsites).
      - **O-1 Schwarzschild fixture** Float64Array migration (Phase 3 high-volume — ~53 non-comment callsites across ~20 files including 6 hot-path `src/` consumers per Adam A-3).
      - **S-9** lowerNode 5-arm deferred-cluster consolidation via registry dispatch (Phase 4).
      
      **Sprint task queue** (consume design r2 + plan r1 — DO NOT re-design):
      1. **Phase 0** (1 commit, ~30 min): Tasks 0.1-0.6 baseline + per-candidate empirical verification. Re-grep with Adam A-1 revised regex (catches variable-indexed callsites — true count ~109 raw / ~53 non-comment). Re-bench v0.7.1 PO-1 baseline (5% drift gate). Deliverable: `docs/architecture/v0.7.2-baseline.md`.
      2. **Phase 1** (3 commits, ~1-2 hr): PG pilot — `MetricFnFlat` + `MetricFn` union alias; PG fixture BREAKING(public) migration; consumer rewrite + R-1b off-diagonal pin in `tests/numerical/painleve-gullstrand-curvature.test.ts`.
      3. **Phase 2** (2 commits, ~30-45 min): mid-cycle Adam+Eve vet (SERIAL dispatch per Decision #9 — Adam first, Eve on post-Adam HEAD). Reports at `docs/architecture/v0.7.2-phase-1-{adam,eve}-vet.md`.
      4. **Phase 3** (5 commits, ~3-4 hr): Schwarzschild high-volume — fixture migration BREAKING(fixture) + 6-file hot-path `src/` consumer rewrite (gl4-integrator, weyl-lowering, perihelion-finder, killing, null-ic, be37-covariant-eikonal — these BYPASS flattenNA per Adam A-3) + Batch A tests/numerical+dimensional + Batch B tests/fixtures + R-1 / R-1c regression pins.
      5. **Phase 4** (2 commits, ~1 hr): S-9 DEFERRED_EVALUATOR_REGISTRY landing + 5-arm default-arm consolidation + exhaustiveness test per Adam A-8 mitigation against silent prose drift.
      6. **Phase 5** (2 commits, ~1 hr): combined bench gate per Decision #6 3-tier (STRETCH ≥2× / SHIP-WITH-NOTE 1.5-2× / INVESTIGATE 1-1.5× / STOP <1×) + `npm audit` + `npm outdated` pre-flight per CLAUDE.md release discipline + CHANGELOG + todo wrap. Version bump per Decision #2: `v0.7.2` is a placeholder; publishable release MUST be `v0.8.0` minor bump (PG `@public` BREAKING — semver compliance).
      
      **Expected sprint totals**: 15 commits; suite 2103 → 2111 (+8 net new from R-1/R-1b/R-1c/S-9-exhaustiveness pins); net code LOC −45 to −60 from S-9.
      
      **Execution discipline** (per plan §0):
      - Worktree fork-point preamble MANDATORY in every agent brief (Decision #4 + Adam A-13 uncommitted-changes guard).
      - Default dispatch model: **direct execution OR serial subagent** (per Decision #9 + Eve E9 v0.7.1 parallel-agent-friction lesson). Parallel-subagent is the EXCEPTION.
      - Adam+Eve vet pairs always SERIAL (Adam first, commit + push, Eve on post-Adam HEAD).
      - Pre-execution verification gate at every TASK start (re-grep / re-read per the v0.5.0+ pattern).
      - Honest-claude framing: every commit message that deviates from the plan documents the deviation.
      
      **Optional pre-execution gate**: dispatch Adam+Eve plan-vet (serial per Decision #9) before Phase 0. Plan-vet checklist at `docs/planning/v0.7.2-Implementation-Plan.md:872-890`. Not strictly required since design r2 already vetted, but plan-vet catches plan-vs-design drift early.
      
      **Carry-forward to v0.7.3 (explicitly deferred per design r2 §1)**:
      - Sibling fixtures (de-sitter, flrw, minkowski) Float64Array migration (per Decision #8 — MetricFn union accommodates them staying nested-array for now).
      - O-4 `christoffelAt` flat-path migration (per Adam A-10 — touches engine boundary, distinct shape from O-1/O-6).
      - M-13 / M-14 dep-graph generator gap-fill (per Eve E5).
      - BE-25 archive-or-delete catalog-archive-policy decision (per Eve E5).
      - MathTSEngine optional-peer install / CI documentation (P8 AD path's `describe.skipIf(true)` debt from v0.7).
      - Re-export PG in `src/index.ts` or strip `@public` tag (close M-2 deferral, per Adam A-7 out-of-scope recommendation).
      
      **Reference docs** (read these before starting):
      - Design r2: `docs/planning/v0.7.2-Design.md`
      - Plan r1: `docs/planning/v0.7.2-Implementation-Plan.md`
      - Adam design vet: `docs/architecture/archive/v0.7.2-design-adam-vet.md`
      - Eve design vet: `docs/architecture/archive/v0.7.2-design-eve-vet.md`
      - v0.7.1 wrap (what shipped + what was deferred): `CHANGELOG.md` `[Unreleased]` block

- [x] ✅ **v0.7.1 hygiene sprint — Phases 0-6 COMPLETE (O-1 deferred to v0.7.2)** — branch `claude/changelog-todo-sync-9PdMg`, HEAD `84115fa` (pre-tag). Suite **2103 passed / 0 failed / 5 skipped / 1 todo** (+47 net new from 2056 sprint baseline). 26 sprint commits across 6 phases + 1 mid-cycle vet pair. All four mid-cycle Adam+Eve adversarial-review gates passed (design pair pre-sprint, Phase 3 mid-cycle pair — `af8c813` Adam GREEN 0H/0M/2L + `1023210` Eve YELLOW 0H/3M/3L with E1+E2 fixed same-commit; no other vets needed since Phase 4/5/6 changes were behaviour-preserving + bench-only). Phase 1+2 → minimize sweep (M-1 surface restoration + guard test + dep-graph tooling fix; M-3+M-4+M-5 mass-annotation pass); Phase 3 → BE-NN triple-extraction (`_be-helpers.ts` 3 helpers + 43 unit tests; 43 BE modules migrated; rg-flow.ts migrated to `validateComponentDimension`); Phase 4 → validator+lowering coherence (S-5+S-6 dedup; S-13 RiemannChildCallback consolidation; S-14 mergeFreeIndices brainstorm-stale 5×→actual 8× — extracted all 8; Eve E4 prose regression fixed via FieldSpec.description override + 3 new tests); Phase 5 → O-2 Picard ping-pong buffer pre-alloc (bench-measured **1.27× speedup** on solveGL4Stage; below the brainstorm's "2-5×" prediction which assumed paired O-1); Phase 6 → 2 new measure-only bench harnesses (kretschmann-symmetry, painleve-gullstrand-pipeline) + benchmarks.md append. Version bump 0.7.0 → 0.7.1 SKIPPED per user directive (publish still blocked on token rotation). **v0.7.2 sprint queued above carries O-1 + O-6 + S-9 forward; design r2 + plan r1 vetted and ready.**
- [x] ✅ **v0.7-series tag strategy + push** — RESOLVED 2026-05-25. User picked **Option 1 (single v0.7.0 rolling everything)**. Bumped `package.json` 0.6.0 → 0.7.0, committed (`dc800c2`), tagged `v0.7.0`, pushed master + tag, published to npm. v0.6.1 hygiene work folded into v0.7.0 changelog as a subsumed section. See `## Latest shipped` for full disposition.
- [x] ✅ **v0.7 release pre-flight checks** — EXECUTED 2026-05-23 (commit `5cd860a`). All five blocking checks pass: `npm audit` 0 vulnerabilities; `npm outdated` shows 2 deferred majors (typescript 6.x, @types/node 25.x) within-range deps up-to-date; tsc strict clean; suite 1879/0/5/1 (post helper-extraction); `npm run smoke` exits 0. Verdict: READY TO TAG. Full report at `docs/architecture/archive/v0.7-release-preflight-log.md`. Optional `npm run bench:ci` recommended pre-tag for baseline refresh (now feasible via the vitest 4.1.7 reporter fix).
- [x] ✅ **v0.6.1 tag + push** — SUPERSEDED 2026-05-25 by v0.7.0 single-tag ship. v0.6.1 content is in the v0.7.0 changelog as the `## [0.6.1 — subsumed into 0.7.0]` section.
- [x] ✅ **v0.6.0 npm publish — superseded 2026-05-25 by v0.7.0 single-tag ship.** Token rotation (1 of 3 blockers) resolved earlier this session; the remaining two blockers (version mismatch + stale dist/) became moot when the user chose Option 1 (single v0.7.0) — version bumped 0.6.0 → 0.7.0, fresh dist/ built (468 files / 3.1 MB, replacing the 12-file / 67-KB v0.1.0-era stale build), and tag/publish executed against the new label. Registry now at 0.7.0; v0.6.0 was never published independently and is documented as subsumed in `CHANGELOG.md`. Historical detail below for reference.

      Original blocker entry preserved for context:
      **🚧 v0.6.0 npm publish — token rotated 2026-05-25; two additional blockers surfaced.**
      v0.6.0 is code-complete at tag `v0.6.0` (`ac0cf06`): all 36 tasks
      executed, suite 1693 green, build/smoke/audit clean, version bumped,
      tag and `master` pushed. **Token (1 of 3 blockers): RESOLVED 2026-05-25** —
      new Automation token (`npm_`-prefixed, 40 chars) installed via
      `[Environment]::SetEnvironmentVariable('NPM_TOKEN', '<new>', 'User')`;
      `npm whoami` → `danielsimonjr`; `npm token list` shows a single active
      token (id `38b1e9`, created 2026-05-25). **NEW blockers surfaced
      during the rotation session — must resolve before any publish:**
      1. **Version mismatch.** `package.json` is at `0.6.0` but HEAD is
         14 commits past tag `v0.6.0`, carrying the entire v0.7-series
         sprint (commits `552df56` ← `67b37c4` ← ... ← `ac0cf06`).
         Running `npm publish` from `master`/HEAD would ship v0.7-era
         code labeled as `0.6.0` — a semver violation that would also
         confuse `mathts-tensor`/`mathts-autograd` peer consumers.
      2. **`dist/` is wildly stale.** Only 12 files / 67 KB present (just
         `core/types.*` + `index.*` from a v0.1.0-era build). Current
         source has full `bridges/`, `dimensional/`, `numerical/`, `diff/`
         subsystems missing from the build output. The `--ignore-scripts`
         Windows workaround silently bypasses the `prepublishOnly:
         "tsc && vitest run"` hook, so `npm publish` never auto-rebuilds.
      **Two viable paths from here (see this turn's diagnosis):**
      - **(A) Publish v0.6.0 from the tag.** `git worktree add ../upt-v060 v0.6.0`
        → in that worktree: `npm install` + `npm run build` +
        `npm publish --ignore-scripts --access public`. Honors the
        existing tag literally; tag, registry, and published code all
        match. Returns master untouched.
      - **(B) Skip v0.6.0, ship v0.7-series instead.** Resolves todo
        "v0.7-series tag strategy" first — single v0.7.0 vs. split
        v0.7.0/v0.8.0/v0.9.0-alpha. Then bump `package.json`, tag,
        build, publish from that fresh tag. Reaches the latest code on
        npm in one shot.
      Registry currently shows `0.5.1`; no partial-publish state to
      clean up. Whichever path: confirm `npm whoami` still works in the
      publish shell, then `npm view universal-physics-tensor version`
      should report the new version post-publish.
- [x] ✅ **GitHub release notes for v0.6.0 + v0.6.1 + v0.7-series** — EXECUTED 2026-05-25 using the Option 1 body from `docs/architecture/archive/v0.7-release-notes-draft.md` (with suite count refreshed from 2056 → 2103). Release live at <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.0>. Options 2 and 3 from the draft remain as historical reference.

(Completed `[x]` items previously listed here — v0.6.0 doc-integrity
review, BE-33 fix + bridge-physics audit, vendored tooling + C-9 fix,
UPT v0.70 proposals doc, all v0.6.1 sprint phases — are subsumed by
the v0.6.0 and v0.6.1 release entries in "Latest shipped" above and
the corresponding `CHANGELOG.md` `[Unreleased]` block. Removed here
to keep the queue focused on still-open work.)

### v0.7 follow-up execution lessons (carry-forward for v0.8.0+)

- **Verify carry-forward release-note numbers at HEAD before scoping work.** Three audits in the v0.7 follow-up session (PC-1.5, AS-3, BE-module exports triage) all found their carry-forward numbers stale: PC-1.5 Shapiro residual was 4 orders of magnitude better than documented (2.28e-8 vs 2.51e-4); AS-3 site count was 1 order of magnitude smaller (8 vs ~65); BE-module export count was 40% inflated (61 vs ~85). Generalizes the v0.6.1 "verify what tooling actually does" lesson: it also applies to release-note prose and todo-list numeric estimates. **Pattern**: any todo item with a numeric scope estimate, re-run the producing tool/grep at HEAD before treating the number as the work envelope. Stale numbers in carry-forward notes are the default — fresh re-measurement is always cheaper than misallocating session time.

### v0.6.1 execution lessons (carry-forward for v0.7.0+)

- **Verify what tooling flags actually DO, not just that they exist.** Track-C recon for v0.6.1 verified `--include-tests` was wired in the generator's CLI. Adam+Eve verified the flag's existence. But empirically running the generator with the flag showed it triggered a separate test-coverage REPORT and did NOT feed `detectUnused` (test parsing happened after the unused-detection scan). Caught at Phase 0 baseline run, not Adam+Eve review. **Pattern**: for any "this flag/setting/script does X" claim, the design's adversarial review must include a runtime empirical check, not just a code-presence grep.
- **Test-imports count as external in TypeScript ESM.** The v0.6.1 design's original bucket-(a) "internal-only" definition included "symbols used only by tests" — but `tsc` does not treat `tests/` imports as internal. Dropping `export` on a test-imported symbol breaks the build. Adam+Eve S1 caught this with grep-verified file:line evidence. **Pattern**: four buckets, not three. The (a') "test-only importer, keep export + @internal JSDoc" bucket is the correct treatment.
- **The "11 arms follow identical pattern" claim is the v0.5.0 ricci-slot trap re-played.** The v0.6.1 design said 10 validator arms had identical shape; verified at validator.ts:592-740 showed 11 arms across 3 patterns (3 pass riemann-child closure, 3 are scalar/skip-merge, 5 are standard). A boolean `propagateFreeIndices: boolean` flag would have produced the v0.5.0 ricci-slot bug shape — silent miscompute. **Pattern**: registry-driven dispatch contracts must use a discriminated union (`pattern: 'A' | 'B' | 'C'`) so the per-arm callback shape typechecks exhaustively, not a flag-bag.
- **Eve fabrication rate dropped 5/9 → 1/13.** The v0.5.1 retrospective ("always grep-verify Eve's specific-evidence claims") was applied consistently in v0.6.1: every Eve claim with a file:line citation got an immediate `grep -rn` before being accepted as load-bearing. Net result: only 1 fabrication (E-R10 — a speculative claim that `tools/plan-doc-audit/` imports from `src/`, verified false in 5 seconds). The discipline works.
- **Phase 0 baseline capture saved the sprint.** Before any code change, Phase 0 ran `npm test` against `master`-HEAD and found 5 pre-existing test failures (1672/5-failed, not the v0.6.0-tag's 1693/0). Without that capture, the sprint would have shipped on top of broken master, and the "suite stays green" goal would have meant something different (or been silently fudged). **Pattern**: always re-baseline against HEAD at sprint start; never trust the previous-release's CHANGELOG number as the "current" state.

### v0.5.1 execution lessons (carry-forward — still relevant)

- **Audit hypothesis can be empirically wrong.** PC-1's prediction that `c_SI` drift dominates the BE-37 Shapiro residual was REFUTED via Tasks 1+4 measurement. The constants canonicalization was still net-positive hygiene but the residual is integrator-driven. Pattern: every audit prediction with a numerical target should be RED-test-verified before being declared "shipped". Honest negative results are valuable.
- **Eve (OpenAI o3) hallucinated 5/9 audit-vet challenges.** Fabricated `src/core/constants.ts` (didn't exist pre-Phase-1), NYC coverage report (no NYC), BE-60 v0.6.x branch (no such bridge), JIT micro-benchmarks (none), v0.5.0-rc2 (no rc tags). See `feedback_eve_o3_hallucinations.md`. **Always grep-verify Eve's specific-evidence claims.** Use her for severity-recalibration judgment (3/3 correct there) not fact-claim verification.
- **The c²-cancellation noise pattern is the v0.5.1 silent footgun.** It manifested twice: Task 16 (Minkowski curvature tests) had to switch to unitless `c=1` fixture; Task 4 (Schwarzschild fixture migration) had to escalate by migrating 3 consumer test files because the cycloid blew up at relErr 3.4e-6. Anywhere SI metric carries `c²` scale (~6e16 on g_tt), 2nd-order FD propagation is at risk. PD-7's opt-in 4th-order `pderiv` is the v0.5.1 mitigation; future bridges differentiating `c²·g_tt` should use `{ order: 4 }`.
- **Multi-agent file-disjoint parallelism is a real strategy.** Phases ran in parallel-batches (Phase 1 + my Phase-3 doc edits concurrently) with zero merge conflicts because we strictly partitioned file scope. CHANGELOG.md was the single read-modify-write contention point — kept sequential.
- **Adam+Eve MCP availability is fragile.** llm-gemini and llm-openai MCPs disconnected mid-cycle; required `/kill-plugins` + `/reload-plugins` recovery. For v0.6.0+ adversarial vets, consider Opus subagents as a built-in fallback (per the user's v0.5.1 directive when MCP was down).

### Notable v0.5.0 execution lessons (load-bearing for v0.6.0+ planning)

- **Two plan-correctness bugs slipped past Adam+Eve adversarial review** and were only caught at TDD-RED:
  1. Schwarzschild Riemann formula: plan template wrote leading-order `2GM/r³`, correct coordinate-basis form is `r_s/(r²(r-r_s))` (off ~33% at r=3·r_s). Caught Task 0. Memory: `feedback_v0_5_0_plan_template_riemann_bug.md`.
  2. Ricci contraction slot: plan + design + S1 correction all wrote `lowerIndices[0]`, correct is `lowerIndices[1]` (Carroll Eq. 3.91). Caught Task 7 via de-Sitter `R=4Λ` failing to vanish. Memory: `feedback_v0_5_0_ricci_contraction_bug.md`.
- **4th-order finite-difference stencils** required for ≤1e-9 Riemann lowering accuracy — the c²·g_tt ~ 6e16 scale causes catastrophic cancellation at 2nd-order. v0.4.0 `pderiv` defaults need scrutiny anywhere SI-c² metrics are differentiated.
- **Curvature-layer pattern** (first-class AST node `{kind, …refs}` + walk-directly lowering; no AST rewrite, no contraction-graph) crystallized across Riemann/Ricci/Einstein/Bianchi. Next curvature-layer addition (Weyl? Bianchi-2nd-form?) is the threshold to extract a shared `CurvatureCompositeNode<K,S>` factory.
- **GL4 + Picard inner solver** is shape-agnostic: null geodesics worked without Picard pathology (Task 12). Mercury matched GR closed-form to 7 sig figs (Task 10). The symplectic Hamiltonian flow does not care whether `g^μν p_μ p_ν` is timelike or null.
- **Cross-bridge `c` constant inconsistency** discovered Task 11: `src/numerical/be37-covariant-eikonal.ts` uses `c = 2.998e8`; `evaluateShapiroDelay` uses exact `299792458`. Dominant ~1.8e-4 BE-37 residual. **v0.5.0+ cleanup item.**

---

## Latest shipped

- **v0.7.3** (2026-05-25) — **SHIPPED TO NPM.** Declaration-only patch release. Added 6 newly-shipped MathTS workspace packages to `optionalDependencies` (`mathts-expression ^0.2.0`, `mathts-matrix ^0.1.3`, `mathts-functions ^0.2.1`, `mathts-parallel ^0.2.0`, `mathts-workerpool ^0.2.0`, `mathts-wasm ^0.1.3`) following today's MathTS monorepo release sweep. **Unblocks P4 Bridge DSL horizon item** (was previously "BLOCKED on mathts-expression peer install"). Aspirational declarations — UPT source doesn't yet consume them, but the declarations signal roadmap intent and let consumers pre-install peer chains for future UPT features. No source change; no test surface change (2126/0/5/1 identical to v0.7.2). Tag `v0.7.3` at commit `4eace8d`. GitHub release: <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.3>.
- **v0.7.2** (2026-05-25) — **SHIPPED TO NPM.** Patch release fixing latent `MathTSEngine` AD-dispatch bugs surfaced by the typed-function EOVERRIDE resolution. Two bug patterns fixed: Pattern A (6 failures, real integration bug in `src/numerical/mathts-engine.ts` add/sub/mul/scale — never dispatched DualTensor/TapedTensor inputs to the autograd peer despite documentation saying it should); Pattern B (2 failures, absence-tests in `mathts-engine-typing.test.ts` that ran when the peer was actually present). Suite: 2103 → **2126 passed (+23 net new AD conformance tests now running)**. Tag `v0.7.2` at commit `1dd372f`. GitHub release: <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.2>. **Partial close of P8 horizon item**: AD conformance suite now runs against MathTSEngine whenever peer is installed. **Lesson captured (v0.8+ execution lesson)**: deferred test enablement via `.skipIf(true)` is silent debt — the gate prevents validation in EVERY environment (local, CI, peer-installed contributor). Right pattern is `describe.skipIf(!peerPresent)`, not `.skipIf(true)`.
- **typed-function EOVERRIDE fix** (2026-05-25, sister repo `~/Dropbox/Github/typed-function` commit `5711dab`) — **SHIPPED**. Resolved upstream blocker preventing UPT's `@danielsimonjr/mathts-*` optional peers from installing. Bumped `@rollup/plugin-terser` ^0.4.4 → ^1.0.0 + `rollup` 4.53.3 → ^4.60.2 to match override intent; pruned redundant override entries; rebuilt `build/` artifacts under new majors. Tests: 1684/0 in typed-function. Pushed to `origin/develop`. The fix propagates to all downstream MathTS consumers globally without requiring republish, since `mathts-core@0.1.2` references typed-function via the GitHub URL (resolves to default-branch HEAD at install time).
- **Sister-repo hygiene sweep** (2026-05-25, post-v0.7.2):
  - **workerpool** (`~/Dropbox/github/workerpool` commit `9faaf33` → `origin/master`): dropped redundant `@rollup/plugin-terser` + `rollup` override entries (direct devDeps already matched at `^1.0.0` / `^4.60.2` per earlier commit `cb20784`). Pattern parity with the typed-function cleanup. No behavior change.
  - **MathTS** (`~/Dropbox/github/Mathts` commit `b9a940d` → `origin/main`): closed MathTS-side TODO #7 — fixed `tensor/tests/contraction-sequence.test.ts:304` 16-tensor DP test that was being killed at vitest's default 5000ms before its `elapsed < 10_000` assertion ran. Added `{ timeout: 15_000 }` as the **2nd argument** to `it()` per Vitest 4's API (the MathTS TODO entry had suggested the trailing-options 3rd-argument form, which was deprecated in Vitest 3 and is a hard error in Vitest 4). Also updated MathTS's TODO.md to flag the API change for future readers — a concrete instance of the "documented fix recipes also decay across major framework versions" pattern (close cousin of the [numeric-claims-decay convention](#numeric-claims-in-todo-entries-decay-faster-than-checkbox-state) added today).
- **v0.7.1** (2026-05-25) — **SHIPPED TO NPM.** Patch release: dev-dep validation under newer toolchain. No source changes. Refreshed installed deps to v0.7.0's declared versions (`@types/node` 25.9.1, `typescript` 6.0.3, `vitest` 4.1.7), rebuilt `dist/` under TS 6.0.3 (v0.7.0's `dist/` was TS-5.9-compiled despite the `^6.0.3` declaration — half-state closed). Full suite re-validated: 2103/0/5/1, no regressions. Tag `v0.7.1` at commit `438db4c`. Tarball: 471 files / 563.9 KB / 2.1 MB unpacked. GitHub release: <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.1>. Known limitation documented: MathTS optional peers can't install due to upstream `typed-function` EOVERRIDE — tracked as a new "fix typed-function" item in the active queue.
- **v0.7.0** (2026-05-25) — **SHIPPED TO NPM.** Single tag rolling everything from v0.5.1 → 0.7.0: v0.6.0 work (never published) + v0.6.1 hygiene sprint (never tagged) + six v0.7-series proposals (P3/P2/P1/P5/P8/P6-A) + v0.7 hygiene follow-up + v0.7.1 hygiene sprint. Registry jumps 0.5.1 → 0.7.0. Tag `v0.7.0` at commit `dc800c2`; preceded by `c8ebdb1` (Windows backslash fix for the v0.7.1 public-surface guard test, caught at release-gate run on Windows). Suite **2103 passed / 0 failed / 5 skipped / 1 todo**, 0 audit findings. npm publish via Automation token (rotated earlier this session — see todo #4 resolution). Tarball: 471 files / 563.9 KB / 2.1 MB unpacked. GitHub release: <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.0>. Tag-strategy decision was Option 1 (single v0.7.0); Options 2/3 from `docs/architecture/archive/v0.7-release-notes-draft.md` remain as historical record.
- **v0.7-series sprint** (2026-05-23, on branch `claude/changelog-todo-sync-9PdMg` — **tag shipped 2026-05-25 as v0.7.0**). **Six v0.7-series proposals shipped in one session**, stacked on the still-untagged v0.6.1 work:
  - **P3** — Typed `Cell` discriminated union (`src/core/cell.ts`): `Cell = LawCell | BridgeCell | EmergenceCell`, `compose(laws, bridges, emergences, config)` factory. 7 public symbols. Per Eve-R2/R3: `CellConfidence` is string-literal union; legacy `PhysicalLaw.confidence: number` stays autonomous. `UniversalTensor.addCell(cell)` exhaustive dispatch.
  - **P2** — Sparse semantic catalog + flux rules (`src/core/flux-rules.ts`, `src/bridges/catalog-adapter.ts`): 3-rule registry with `_exhaustive: never` dispatch (Rule 1 = dimensional-consistency from catalog adapter per Decision #3 resolving Adam-V3; Rule 2 = L/B/E coordinate matching ERROR-tier; Rule 3 = causality WARNING-tier). `UniversalTensor` gets 4 new methods: `populatedCount`, `populatedCells`, `unpopulatedNeighborhoods`, `fluxDiagnostics`. `catalogToCells` / `scanCatalog` / `ingestCatalog` two-pass adapter per Decision #11. **Empirical (Eve-R1 lesson held)**: live BRIDGE_EQUATIONS catalog passes Rule 1 with 0 errors; 5 submittable + 37 unsubmitted (per strict `PhysicalScale` mapping; freeform `microscale`/`information`/`Newtonian gravity`/etc. labels filtered). 10 public symbols. **Redrafted once** after first Adam+Eve pass caught 3 SHOWSTOPPER issues (Adam-V2 compile-blocking, Eve-R1 empirical, Eve-R7 storage-design); redraft Adam+Eve = 0 HIGH READY.
  - **P1** — Intelligent Index layer (`src/core/universal-index.ts`, `axes-registry.ts`, `labeled-tensor.ts`): `UniversalIndex<Axis>` + branded `UniversalIndexId` (UUID); `Axes` module-singleton with 18 frozen references (4 scales + 5 forces + 5 symmetries + 4 info measures); `LabeledTensor<L>` wrapper composing `EngineTensor + TensorEngine + labels`; `contract(other)` matches by `UniversalIndexId` equality (Decision #3). 4 error classes. BE-52 single-bridge demo at `src/bridges/perihelion-precession-labeled.ts` (Cross-Phase Invariant 4 verified preserved: zero edits to `TensorSymbolNode` / `computeContraction` / `src/bridges/equations/`). 12 public symbols.
  - **P5** (ahead of v0.8 target) — `RegimeType` extension system (`src/core/regime-registry.ts`, `regimes-builtins.ts`, `regime-rule-install.ts`): `defineRegime` + 6 per-axis convenience APIs + lookup helpers + 18 v0.6 built-ins pre-registered. Sibling-registry pattern for `attachRegimesToCell` (per Adam-M1: avoids breaking P3 surface + adapter round-trip). `FluxRuleKind` extended with `'regime-consistency'` (per Eve-M2 union extension); rule body installed via registered-callable pattern (avoids circular import). `RegimeCollisionError` with idempotent re-registration. 16 public symbols.
  - **P8** (ahead of v0.9 target) — Bridge Parameter AD (`src/diff/bridge-gradient.ts`, `bridge-specs.ts`): `bridgeGradient(spec, engine, params)` async wrapper over `MathTSEngine.reverseGrad`; 4 differentiable bridge specs (BE-11, BE-37, BE-42, BE-52) using verified struct-arg signatures (per Eve M1-M3 reconciliation). `gradientToNamed` unpack helper. Graceful degradation via `EngineCapabilityError`. **Honest scope** (per Adam-H1): `node_modules/@danielsimonjr/` empty in sandboxed dev env (`npm install --include=optional` was no-op against registry-less env); real-AD tests `describe.skipIf(true)`-marked, run on consumer envs with peer installed. `Float64ReferenceEngine` AD-tracing limitation documented (dual-numbers can't trace plain-JS bridge math). 7 public symbols.
  - **P6 Phase A** (research-track, docs-only per Adam-F2) — Bridge Composition spec at `docs/specification/Part-IX-Composition.md` (avoiding Part-VII collision per Eve-E2). Defines composition as numerical-cascade primary + categorical secondary (Decision #1). Names C1-C5 calibration set for Phase B (BE-IDs verified). Open-Questions doc with 5 questions for Phase B (Q1 surface, Q2 tolerance, Q3 flux interaction, Q4 identity, Q5 v1.0 escalation). Adam+Eve review-findings doc. Phase A optional `src/composition/` prototype DEFERRED — existing bridge evaluators have ad-hoc TS return shapes with no shared `Observable` contract; translation-layer design IS Phase B's deliverable.
  - **Session totals**: 1675 → **1853 passed (+178 net new tests)**, 0 failed, 2 skipped (P8 real-AD), 1 todo. 11 new test files, 10 new source files, 9 new docs. Public surface: +44 symbols. 6 Adam+Eve adversarial-review cycles (1 redraft on P2). Opus-subagent stand-ins per session pragma (Gemini/OpenAI MCP tools unavailable). HEAD `9fa940f`.
  - **Tag strategy (user's call)** — three options laid out in `CHANGELOG.md`:
    1. Single v0.7.0 (everything in one release).
    2. Split v0.7.0 (P3+P2+P1) / v0.8.0 (P5 + P6 Phase A) / v0.9.0-alpha (P8, alpha while autograd-peer CI install is documented).
    3. Some other partitioning.
- **v0.6.1** (2026-05-23, on branch `claude/changelog-todo-sync-9PdMg` — tag PENDING) — Minimize / Simplify / Optimize sprint. Six phases (0→3→1→2→5→4 explicit order per Adam+Eve adversarial-review fix). 21 commits. Suite: **1675 passed / 0 failed / 1 skipped / 1 todo** (recovered from a 1672/5-failed master state via Phase 0 cleanup). Highlights: **24 internal-only exports dropped** (bucket-(a)) + **6 `@public` JSDoc tags added** (bucket-(b')) per the v0.6.1-baseline.md per-symbol classification; **`validator.ts` 816→715 LOC** (-101) via new `validator-registry.ts` 3-pattern discriminated-union dispatch; **`lowering.ts` 1015→903 LOC** (-112) via `lowerBianchiResidual` + `lowerWeylTensor` extraction into `curvature-lowering-helpers.ts`; **dep-graph generator** now consumes test imports + parses `package.json exports` field (unused-files 44→2, both intentional ambient .d.ts); **three bench harnesses landed** (PO-1 gl4-picard-alloc, PO-2 ricci-lowering, PD-grid pderiv — carry-forward from v0.5.1's deferred Phase 7); **five pre-existing test failures fixed** (mathts-engine test-file gating × 2, stale 0.5.x version regex, BE-33 formula-latex assertion, missing spec-date marker) + lockfile resync. Adam+Eve adversarial review (Opus subagent fallback per v0.5.1 carry-forward — no llm-gemini/llm-openai MCPs in remote-execution env) caught 3 critical issues before plan-drafting (S1 test-importer misclassification, S2 validator-registry 3-pattern not 2, S3 dep-graph generator semantics). Eve fabrication rate 1/13 (vs v0.5.1's 5/9 baseline). New `mathts-tensor.ambient.d.ts` mirrors v0.5.1 TS-4 precedent for autograd. `npm publish` still blocked on expired `NPM_TOKEN` (carried from v0.6.0). Detail: `docs/planning/v0.6.1-Design.md`, `docs/planning/v0.6.1-Review-Findings.md`, `docs/architecture/archive/v0.6.1-baseline.md`.
- **v0.6.0** (2026-05-20) — Einstein field equation closure + curvature classification + Shapiro investigation. 36 tasks across 4 phases. Killing-vector conserved-charge machinery (`KillingVectorNode`, `ConservedChargeNode`, `verifyKillingEquation`); Einstein field equation now structurally encodable (`StressEnergyTensorNode`, `CosmologicalConstantNode`, `EinsteinFieldEquationNode`) — closes BE-17's "cannot be encoded" docstring gap; Weyl tensor + Kretschmann scalar completing the curvature-classification surface; `CurvatureCompositeNode<K,S>` factory (PD-6 trigger fired on Weyl as 5th curvature primitive). BREAKING: `christoffelFn` returns `Float64Array(64)` (BR-2, 5-6× RK4 speedup); `pderivNumericalFn` default order flipped 2→4 (FD-flip). **PC-1.5 finding**: integrator cleared as Shapiro residual suspect via bit-exact Killing-charge conservation; remaining suspects are null-IC noise + affine-parameter mismatch (documented, deferred per Decision #8). Suite 1693 passed, 179 files. Tag `v0.6.0` at commit `ac0cf06`; `master` since advanced with post-ship maintenance (HEAD `b814a71` at last todo update). **npm publish PENDING — blocked on expired `NPM_TOKEN` (see Active queue); registry still at `0.5.1` until the token is rotated.** **Post-ship maintenance (2026-05-20):** documentation-integrity review (8-batch opus+sonnet team, RLM + honest-claude skills, 63 findings) + 4-phase doc refresh — README was 6 releases stale, 5 architecture docs 2 releases stale, spec catalog count 40→42, all sub-READMEs refreshed; master report `docs/architecture/archive/v0.6.0-doc-integrity-review.md`. Separately, BE-33 Hertz-Millis finite-T exponent corrected `-ν/z → -1/z` + 42-bridge Adam+Eve physics-correctness audit landed (`docs/architecture/archive/BRIDGE-PHYSICS-AUDIT.md`).
- **v0.5.1** (2026-05-19) — Stability/hygiene patch on v0.5.0 GR foundations. 22 task commits across 8 phases. Constants canonicalization (new `src/core/constants.ts` flat exports); diagnostic propagation (`scanForMetricPair` walks v0.5.0 curvature kinds); type-safety hardening (bianchiResidual 6× `any` → `import type`); test-coverage backfill (connection-validators ~250 LOC, fresh-label, flat-Minkowski curvature zero-tests, real Mercury N-orbit Picard); algorithmic dedup (contractRiemannJS, makeSchwarzschildContext); `pderiv.ts` opt-in 4th-order; 5 LC doc-vs-code skews; 7 zombie `it.todo` retired. **Honest framing: PC-1 hypothesis REFUTED** — BE-37 Shapiro residual stayed at 2.51e-4 after constants migration (not <1e-5 as audit predicted); root cause is integrator-driven (see `docs/planning/v0.6.0-Brainstorm.md` "PC-1.5 investigation"). Suite 1595/1597. npm: `universal-physics-tensor@0.5.1`. Tag `v0.5.1`, HEAD `bd98028`.
- **v0.5.0** (2026-05-18) — GR foundations. 25 tasks across 4 phases. GL4 symplectic integrator on canonical (x, p) state (Picard inner solver), bisection perihelion finder, curvature layer (RiemannTensorNode AST + ricci/einstein/bianchiResidual helpers). Both v0.4.0 `it.skip` debts cleared: BE-52 Mercury Δφ to relErr 1.77e-7 (10⁴× tighter than I6 target); BE-37 Shapiro to relErr 1.76e-4. Bridge validation sweep: BE-51/52 structural siblings + BE-17/20/45/46/50 physics anchors + 42-bridge catalog integrity test. Suite 1,554/1,563. npm: `universal-physics-tensor@0.5.0`. Tag `v0.5.0`, HEAD `e2c84b2`.

(Older releases — v0.4.6 and earlier — rolled off into `CHANGELOG.md` for historical record.)

---

## Deferred from prior releases

### From v0.4.0
- [x] ✅ **BE-52 Mercury perihelion geodesic cross-validation** — shipped Task 10 of v0.5.0. relErr 1.77e-7 (10⁴× tighter than ±2×10⁻³ target).
- [x] ✅ **BE-37 full Shapiro cross-check** via geodesic integration — shipped Tasks 11+12 of v0.5.0. relErr 1.76e-4.

### From v0.4.5
- [x] ✅ **Vitest 4.1.4 async-bench reporter limitation** — CLOSED 2026-05-23 (v0.7 follow-up). Bumped vitest 4.1.4 → 4.1.7 (commit `28f6f8b`). Re-running `bench/be37-eikonal.bench.ts` (the original v0.4.5 reporter-limitation case) at 4.1.7 confirms async benches now report the full per-bench hz table (e.g., `evaluateBE37EikonalNumerical 4,258.52 hz` with p75/p99/p995/p999 distribution; covariant-eikonal `2.18 hz`). The "watch for 4.2+" note resolved at 4.1.x patch. **Fourth stale carry-forward in this session** (after PC-1.5, AS-3, BE-module exports).

### From v0.4.6
- (None — all 32 audit findings landed)

### From v0.5.0
- [x] ✅ **`c` constant canonicalization** — shipped v0.5.1 Theme A (Tasks 0-4). New `src/core/constants.ts`. **BUT PC-1 hypothesis REFUTED**: BE-37 Shapiro residual still 2.51e-4 (not <1e-5 as predicted). Real cause is integrator-driven — see `docs/planning/v0.6.0-Brainstorm.md` "PC-1.5 investigation".
- [x] ✅ **`schwarzschildRiemannFn` fixture is COMPLETE** — CLOSED 2026-05-25 via post-v0.7.0 audit (HonestClaude + RLM verification pass). Original todo claim "8 of 256 entries populated" was stale by an OOM (v0.5.0-era count). Current state per `tests/fixtures/schwarzschild.ts:297` docstring: **12 independent physical values × 2 (antisymmetric partner) = 24 non-zero entries** — the mathematically complete set for Schwarzschild coordinate-basis mixed-index Riemann, with Carroll *Spacetime and Geometry* App. B + Hartle *Gravity* Ch. 9 textbook citations confirming canonicity. No additional consumer needs identified.
- [x] ✅ **Plan/design Ricci-slot bug** — annotated v0.5.0-Implementation-Plan.md with post-S1 addendum in v0.5.1 (Task PD-3/LC-2).
- [x] ✅ **GL4_LONG=1 Mercury 100-orbit Picard-convergence test** — wired in v0.5.1 Task 17 (PD-4). `solveGL4Stage` has iteration counter; gated test asserts `failureFraction < 0.001`. Default 20-orbit (~6 min); `GL4_LONG_ORBITS=100 GL4_LONG=1` for release-prep.

### From v0.5.1
- [x] ✅ **PC-1.5 investigation** — CLOSED 2026-05-23 (v0.7 session). Step-count sweep (2048/4096/8192) shows BE-37 Shapiro relErr at **~2.3e-8** — 4 orders of magnitude tighter than the carried-forward 2.51e-4 number. Non-monotone in step count → FP arithmetic floor, not integrator truncation. Improvement was a side effect of v0.6.0's BR-2 christoffelFn → Float64Array(64) migration (`5c786cc`) that was never re-measured end-to-end at the time. Findings doc: `docs/architecture/archive/v0.7-pc15-shapiro-floor.md`. Smoke gate at `tests/numerical/be37-shapiro-step-sweep.test.ts` asserts relErr stays in `[1e-10, 1e-6]` band; long-run sweep gated behind `GL4_LONG=1`.
- [x] ✅ **BR-2 carry-forward**: `christoffelFn` nested-array → `Float64Array(64)` flat — shipped v0.6.0 Phase 2 (BREAKING, 5-6× RK4 speedup). Carry-forward closed.
- [x] ✅ **AS-3 `schwarzschildPin` helper** — AUDITED 2026-05-23 (v0.7 follow-up), closed WON'T-DO. The v0.5.1 estimate ("~65 invocation sites") was stale by an order of magnitude. Actual count via `grep -rnE "Fn\(M[a-zA-Z0-9_]*\)\(\[" tests/` is **8 sites** total. At that count the inline `schwarzschildFn(M)([0, r, PI_2, 0])` pattern is clearer than a `schwarzschildPin(M, r).dgInverse` abstraction; helper is overkill. Stale-claim audit: another instance of the pattern PC-1.5 surfaced (carry-forward numbers re-verify at HEAD).
- [x] ✅ **Bench harnesses (PO-1, PO-2, PD-grid)** — shipped v0.6.1 Phase 5 (2026-05-23, commit `48a7bb1`). All three files landed: `bench/gl4-picard-alloc.bench.ts`, `bench/ricci-lowering.bench.ts`, `bench/pderiv-grid.bench.ts`. Per Decision #5 of the v0.6.1 design, informational-only (no threshold gates) — baselines in `docs/architecture/benchmarks.md` v0.6.1 section. Findings: Ricci contraction is essentially free vs FD-Riemann (1.01× ratio); order=4 pderiv is 2.41× slower than order=2 (acceptable tradeoff for ~10⁴× truncation reduction).

### From v0.6.0
- [x] ✅ **PC-1.5 follow-up** — CLOSED 2026-05-23 (v0.7 session). See v0.5.1-deferred entry above + `docs/architecture/archive/v0.7-pc15-shapiro-floor.md`. The v0.6.0 BR-2 christoffelFn refactor silently resolved the residual; HEAD measurement shows ~2.3e-8 relErr (FP floor), not 2.51e-4. Decision #8's "measure-and-document, not measure-and-fix" held — measurement was the entire work; no code path modified.
- [x] ✅ **Near-horizon Kretschmann** — CLOSED 2026-05-23 (v0.7 follow-up). Painlevé-Gullstrand implementation shipped: `src/numerical/painleve-gullstrand-metric.ts` (closed-form PG metric + inverse; ~120 LOC). The architectural question dissolved during implementation — `computeKretschmann` is already coordinate-agnostic (takes raw arrays); the existing FD pipeline (christoffelAt + dGammaAt + buildRiemann from curvature-lowering-helpers.ts) assembles Riemann from any metric fn supplied. PG is the only new code at the engine level. Single test file (`tests/numerical/painleve-gullstrand-curvature.test.ts`, 9 tests across 2 describe blocks) covers far-field/mid-range/near-horizon/AT-horizon/inside-horizon Kretschmann + metric-inverse identity + asymptotic flatness. Original design-note scope (~600 LOC across 4 files) over-estimated; actual ~300 LOC. Per the v0.7 stale-carry-forward pattern, even the design-note estimates need rechecking.
- [x] ✅ **`TensorEquationNode<LHS,RHS>` Phase 0 + Phase 1** — Phase 0 SHIPPED 2026-05-23 (commit `5cd860a`, helper extraction + 25 unit tests). Phase 1 SHIPPED 2026-05-23 (this round): `KleinGordonEquationNode` for `(□+m²)φ = J` as the first new field-equation demonstrator. Uses all 3 field-equation-helpers per the design pattern; validator body is THIN (~30-40 LOC) vs the ~80 LOC of pre-extraction `validateEinsteinFieldEquation`. 9 KG tests + the existing EFE tests both stay green (error-keyword vocabulary `"index label"` / `"dimension"` / `"symmetry"` pinned across the helper extraction). Suite 1888 → 1897 (+9).
- [x] ✅ **Kretschmann O(4⁸) symmetry optimization** (P-6) — **SUPERSEDED /
      WON'T-DO (2026-06-16).** The factored-raising optimization already shipped
      (O-4, ~70× contraction / 29.8× pipeline) and the pipeline is now
      FD-dominated, so further optimizing the contraction targets a non-bottleneck.
      More importantly, the symmetry-pair reduction was EXPLICITLY REJECTED for
      correctness in `kretschmann.ts` (the 6×6 pair formula is NOT identical to
      the full sum for the FD-built Riemann, which has small antisymmetry
      violations). Implementing it would trade correctness-on-real-inputs for a
      speedup of a non-bottleneck. No code change; disposition recorded.
- [x] ✅ **Catalog extension — BE-53 + BE-54** (2026-05-24, parallel-agent dispatch sibling to the BE-X re-encoding sprint):
  - **BE-53 Yang-Mills one-loop β-function** (sonnet, commits `bedd385` + `acae340`): structural dual of BE-39's NGFP via the same `BetaFunctionNode` primitive (asymptotic-freedom UV-FP at g*=0). QCD value b₀=7 pinned; pure SU(3) b₀=11; asymptotic-freedom boundary at N_f≈16.5 (SU(3)). Status: `'established'` (Nobel 2004). +32 tests.
  - **BE-54 Randall-Sundrum brane cosmology** (sonnet, commits `0ef5253` + `c400185` + my follow-up `b8153f6`): exercises BE-19's `FriedmannEquationNode` `'brane'` variant slot. Brane-tension correction `(1+ρ/(2σ))` is dimensionless; correction=3/2 at ρ=σ; H²≥0 always. Status: `'speculative'` (real framework, experimentally unconstrained). +32 tests (incl. 7 from the structural follow-up I added when the agent's worktree was too stale to see `friedmann-equation.ts`).
  - 5 catalog-length-pin conflicts resolved cleanly during cherry-pick (BE-53 worktree forked from `ccda66a`, BE-54 from `fb7ff8b`; both bumped 42 → 43 from their fork-points; resolved manually to 44).
  - Suite: 2017 → 2056 (+39). Catalog now **44 entries** (40 original + BE-51/52/53/54 post-spec extensions).
  - Pattern observation: agent worktree fork-points vary by launch time. Pre-flight `git merge-base` check helps surface but doesn't fix the issue; the harness creates worktrees from a non-current point. **Recommended for next parallel dispatch**: have agents do `git pull origin claude/changelog-todo-sync-9PdMg` + `git rebase` as the FIRST step if their worktree HEAD doesn't match `origin/...HEAD`.
- [x] ✅ **Bridges assessed but NOT re-encoded in v0.6.0 — ALL 4 SHIPPED 2026-05-24** via parallel-agent dispatch (2× sonnet, 2× opus, isolated worktrees). Per `docs/architecture/archive/v0.7-be-x-reencoding-design-note.md`. Each agent ran independently; cherry-picked back onto the main branch with zero conflicts. Per-bridge results:
  - **BE-13 Einstein-trace** (sonnet, commits `55a59af` + `f57fad5`): `TensorTraceNode` + `TracableTensorNode` structural-interface input (mirrors Klein-Gordon's ScalarFieldNode pattern); `BE13_T_TRACE_NODE` additive-new-export. +20 tests.
  - **BE-19 quantum-bounce** (opus, commits `5ebffa8` + `af27132`): `FriedmannEquationNode` with 5-variant discriminator (`classical | lqc | brane | dgp | massive`); `BE19_LQC_FRIEDMANN_STRUCTURAL` additive-new-export. +23 tests. Recommends Randall-Sundrum brane cosmology as next variant exerciser.
  - **BE-39 asymptotic-safety** (opus, commits `76afe1e` + `5e7e812`): `BetaFunctionNode` + `RGCouplingNode`; `BE39_BETA_G_STRUCTURAL` + `BE39_BETA_LAMBDA_STRUCTURAL` additive-new-exports. +28 tests. **Honest deviation**: agent's worktree forked from pre-v0.7 baseline (b67481b); improvised against `einstein-equation.ts` instead of `field-equation-helpers.ts`. Functional output correct; future cleanup migrates to helpers pattern. Recommends BE-26 Yang-Mills β-function as next RG entry.
  - **BE-50 Wheeler-Feynman** (sonnet, commits `3860d7b` + `e8d3df0`): `GaugeFieldNode` + `TimeSymmetryPredicateNode` with `arrowOfTime` discriminator; `BE50_TIME_SYMMETRY_PREDICATE_STRUCTURAL` additive-new-export. +24 tests.
  All used additive-new-export strategy — legacy AST exports unchanged; legacy tests untouched. Net suite: 1897 → 1992 (+95). Lessons-log entry: verify `git merge-base` of worktree branches BEFORE agent starts (BE-39 surfaced this — its worktree forked from master not the working branch).
- [x] ✅ **Dev-dep updates — VALIDATED + SHIPPED as v0.7.1** (2026-05-25). `npm install --include=optional` refreshed `@types/node` 24.12.2 → 25.9.1, `typescript` 5.9.3 → 6.0.3, `vitest` 4.1.4 → 4.1.7. Full suite re-validated under the new toolchain (2103/0/5/1 — no regressions). `dist/` rebuilt with TS 6.0.3 (v0.7.0's dist/ was TS-5.9-compiled despite the `^6.0.3` declaration). Tag `v0.7.1` at `438db4c`; npm registry now at 0.7.1; GitHub release at <https://github.com/danielsimonjr/universal-physics-tensor/releases/tag/v0.7.1>.
- [x] ✅ **Fix `typed-function` EOVERRIDE blocker** — CLOSED 2026-05-25 (typed-function commit `5711dab` pushed to origin/develop; surfaced and fixed during v0.7.1 dev-dep validation). MathTS optional-peer chain now installs cleanly in UPT. Surfaced latent MathTSEngine integration bugs that v0.7.2 then fixed — see `## Latest shipped` for full disposition.

### From v0.6.1 (2026-05-23)
- [x] ✅ **`it.todo` cleanup pass** — AUDITED 2026-05-23 (v0.7 follow-up). 11 references checked: **4 real skip/todo lines, all intentional and documented** (3 × `describe.skip` for optional-dep absent in mathts-engine-typing / engine-conformance × 2; 1 × `it.todo` in catalog-integrity.test.ts:137 pinning the BE-42 "N/A as currently encoded" placeholder). **7 comment-references, all useful historical narrative** (gl4-integrator GL4_LONG gating note; the new be37-shapiro-step-sweep gate; covariant-eikonal-real test geometry-deviation rationale citing Task 11 history; perihelion-precession v0.4.0 reactivation note; tensor-spec-vs-impl drift-guard pattern docs; tensor-symbol v0.5.1 PD-9 cleanup banner; covariant-derivative-preview v0.3.5 reactivation note). No zombie `it.todo()` calls found; no code changes needed.
- [x] ✅ **Newly-surfaced BE-module internal exports** — TRIAGED 2026-05-23 (v0.7 follow-up). Re-running `npm run docs:deps` at HEAD found **61 unused BE-module exports** (not the v0.6.1 estimate of "~85" — 40% inflation, same stale-carry-forward pattern as PC-1.5 and AS-3). Applied bucket-(a) drops to **20 confirmed-no-external-consumer constants/functions** across 14 files (11× `*_LHS` AST builders, 2× `*_FIELD`, 1× `*_CONSTANT`, 1× `*_DIM`, 1× `BE37_TWO`, 3× `validate*Dimensions`, 1× extra `*_LHS`). The remaining **44 `*Inputs` interfaces** are bucket-(a') deferred to a future `@internal`-tag annotation pass (rationale: future-promotion path, test ergonomics, naming-discriminator signal — see audit doc). Build clean, suite unchanged. Audit doc: `docs/architecture/archive/v0.7-be-module-exports-audit.md`.
- [x] ✅ **`lowering.ts` LOC target** — CLOSED 2026-05-23 (v0.7 follow-up, commit `1ce7dc3`). Extracted `tensor-partial-derivative` + `covariant-derivative` arms (~298 LOC) into new `src/numerical/derivative-lowering.ts` (341 LOC) + `src/numerical/lowering-utils.ts` (72 LOC). Track-B's medium-risk forward-import concern resolved via thunk pattern (`recur: LowerNodeRecur` parameter). `lowering.ts` 903 → 597 LOC (beat the ≤890 target by 293). Suite + build unchanged.

### From v0.6.0 doc-integrity review (2026-05-20)
- [x] ✅ **C-9 dep-graph generator bug** — FIXED 2026-05-20. The `create-dependency-graph` tool was vendored into `tools/create-dependency-graph/` (from the `memoryjs` sister repo); the comment-as-symbol leak (source-comment text in multi-line `export {…} from` blocks bleeding into re-export symbol rows) was fixed in-tree via `stripBraceBlockComments`/`splitBraceSymbols`. `DEPENDENCY_GRAPH.md` regenerated clean — the stale "C-9 unfixed" banner is gone. Run `npm run docs:deps` to regenerate.
- [ ] **BRIDGE-PHYSICS-AUDIT.md per-bridge follow-ups** — the 42-bridge Adam+Eve physics audit flagged ~19 contested framings + several questionable `dimensional_signature` tags. **v0.7 follow-up FULL DISPOSITION (2026-05-23 + 2026-05-24)**:
      - ✅ Audit §1 `encoded_form` field added to BridgeEquationEntry + applied to BE-13/47/48 (commit `3ad5404`).
      - ✅ Audit §3 unknown↔unknown bridge naming applied (commit `e9e870c`): 17 renamed + 9 NOT-A-BRIDGE classified per the user-approved proposals doc.
      - ✅ Audit §5 status recalibration applied (commit `9d2c20c`): 1 status flip (BE-14 demoted) + 3 audit-considered notes footnotes (BE-16/29/40) + 1 deferral (BE-34 coupled to Boltzmann dispute).
      - ✅ Audit §4 BE-34 Boltzmann factor: notes-only audit-followup documenting the non-canonical extension (commit `e9e870c`).
      - ✅ BE-33 (`−ν/z` → `−1/z`) literature check: discovered already-corrected on 2026-05-20 (7th stale carry-forward).
      - ✅ **BRIDGE-PHYSICS-AUDIT v2 shipped 2026-05-24** (`docs/architecture/BRIDGE-PHYSICS-AUDIT-v2.md`, commits `77cd02e` Adam + Eve append): parallel Adam+Eve opus reviewers against the post-v0.7 catalog state (now 44 bridges with BE-53/54 extensions). 5 actionable findings from Adam + 13 gap findings from Eve. Highest-priority v2 findings closed in same commit cycle:
        - ✅ **Eve-E1** (silent test-coverage gap — `EXPECTED_DIMENSION_BY_BRIDGE` didn't register BE-53/54; verification test still pinned `.toBe(40)` and iterated ids 11-50 only) FIXED commit `e2ae944` — added [53, DIMENSIONLESS] + [54, T_INV2]; test now expects 42 with extended id range.
        - ✅ **Eve-E13** (pre-tag stale pins — `1854` references in pre-tag-flow docs while HEAD is 2056) FIXED commit `e2ae944` — refreshed `v0.7-release-preflight-log.md` + `v0.7-release-notes-draft.md` to HEAD counts.
      - ✅ **Adam-MEDIUM `encoded_form` mass-population** SHIPPED 2026-05-24 (commit `6fcf9fd`): applied to 12 of the 13 candidates (BE-17/18/20/21/27/29/32/35/36/44/46/50). BE-42 explicitly skipped (its AST encodes T_H scalar directly with no reduction; its NOT-A-BRIDGE reclassification is a separate Adam-HIGH finding still deferred). Catalog now has 15 of 44 entries with `encoded_form` set (BE-13/47/48 from prior + 12 new).
      - ⏸ **Deferred to user physics-judgment session (v0.8)**:
        - Adam-HIGH BE-42 Hawking T NOT-A-BRIDGE reversal: Adam argues it's the archetypal quantum↔gravity bridge (contains ℏ + G); Adam himself flagged for Eve-perspective second opinion before applying.
        - Adam-MEDIUM BE-29 Jarzynski NOT-A-BRIDGE reconsider: similar single-reviewer concern as BE-42.
        - Eve-E8 marginal BE-22/31 rename review.
        - ✅ Eve-E10 BE-54 arXiv refs CLOSED 2026-05-25 (commit `014fe03`). User-confirmed via PDF (sandbox blocks arxiv.org outbound): the citation paired `arXiv:hep-ph/9905221` (RS-I "A Large Mass Hierarchy…" PRL 83:3370) with PRL 83:4690 (which is actually RS-II "An Alternative to Compactification", `arXiv:hep-th/9906064`). BE-54 encodes the RS-II single-brane model per docstring line 11 — fixed arXiv ID + added title. Other two refs (BDEL `hep-th/9910219`; Maartens-Koyama review `1004.3962`) unverified but format-plausible.
        - Eve-E2-E6 stale carry-forward in 4 historical docs (be-module-exports-audit, etc. — historical records, low-priority refresh).
        - Eve-E9 consolidate stale-carry-forward retrospective into one v0.8 doc.

---

## Conventions

### Swarm/dev-workflow stage mapping (codified 2026-06-11, after the v0.11 sprint review)

The dev-workflow stages run at the ORCHESTRATION level; dispatched
subagents execute stages within it, never the whole loop:

- **Lead (orchestrator) owns:** design docs, plan docs, pre-registrations,
  Phase-0 baselines, vet dispatch, ALL commits/pushes (single-writer),
  shared wrap artifacts (CHANGELOG/todo/public surface/snapshots), and
  cross-agent file-scope partitioning.
- **Implementation agents carry, baked into every brief:** pre-execution
  verification gates (read the real source FIRST; never fabricate —
  e.g. the BE-23 agent refusing to encode an unverifiable data table),
  TDD with scoped tests, honest-deviation reporting, no-commit, explicit
  file-scope boundaries, "ignore parallel-work errors not in your files".
- **Review agents (Adam/Eve) are always INDEPENDENT of the authoring
  agent** — self-vet is worthless. Adam = design/plan adversarial vet
  (pre-implementation); Eve = empirical value-level verification
  (post-implementation).
- **STANDING RULE (the v0.11 lesson): every swarm sprint ends with an
  Eve post-implementation verification BEFORE the wrap commit — not
  on-request.** In the v0.11 open-items sprint, Eve ran only when the
  user asked; she then found 3 value-blind test pins, a propagated
  count error (41 vs 42 edges), and 2 doc drifts that all gates had
  passed. Gates check consistency; only adversarial recomputation
  checks truth.
- Agent reports are inputs, not records: claims get spot-verified by
  the lead before commit (precedent: the "already migrated by a prior
  session" misreport; the 16+26 arithmetic).
- **STANDING RULE (the second v0.11 lesson): every sprint ends with the
  stale-docs gate BEFORE the final changelog/wrap commit — not
  on-request.** The gate is a user-added dev-workflow stage and it was
  skipped in the v0.11 open-items sprint (last run at the v0.10.0 wrap):
  README counts/roadmap, CONTRIBUTING review tasks, CLAUDE.md release
  state, the 5 living architecture docs
  (ARCHITECTURE/OVERVIEW/COMPONENTS/API/DATAFLOW), research-note
  cross-references, and `npm run docs:deps` all drifted at once.
  Checklist: grep the docs for counts/version claims touched by the
  sprint, refresh the living arch docs, regen the dep graph, then wrap.


### Repo state
- **UPT repo**: `~/Dropbox/Github/universal-physics-tensor`, branch `master` (NOT `main`). Direct-push workflow, no PR flow.
- **MathTS sister repo**: `~/Dropbox/Github/Mathts`, branch `main`. Houses `@danielsimonjr/mathts-tensor` and `@danielsimonjr/mathts-autograd`. Both published to npm.
- **npm publish on Windows**: use `npm publish --ignore-scripts --access public` to bypass the slow `prepublishOnly` hook (vitest startup on Windows ~3-5 min; the suite is verified at every task commit, so re-running it at publish time is redundant).
- **NPM_TOKEN**: stored at Windows User-level env var. `~/.npmrc` and `~/Dropbox/Github/Mathts/.npmrc` use `${NPM_TOKEN}` interpolation. Token rotation: regenerate at https://www.npmjs.com/settings/danielsimonjr/tokens, then `[Environment]::SetEnvironmentVariable('NPM_TOKEN', '<new>', 'User')`.

### Plan + audit doc locations
- `docs/planning/v0.X.Y-Design.md` — design (per brainstorming skill)
- `docs/planning/v0.X.Y-Implementation-Plan.md` — implementation plan (per writing-plans skill)
- `docs/planning/v0.X.Y-Review-Findings.md` — Adam+Eve adversarial review findings
- `docs/architecture/` — auto-generated dependency graph + hand-written architecture docs + per-release audit reports (e.g., `v0.4.6-minimize-targets.md`, `bridge-coverage-audit.md`)

### Reasoning tier
- For UPT specifically, **Adam (Gemini 2.5 Pro) + Eve (OpenAI o3)** are the default review-tier models. Invoke liberally on design review, adversarial cross-check, physics-correctness verification.
- MCP llm-tools are TEXT-ONLY — inline source content into the `prompt` string when asking Adam/Eve to verify code claims.

### Vendored audit tooling (in-tree since v0.6.0 maintenance)
Re-runnable codebase analysis via the in-tree `tools/` directory.
The dep-graph generator was vendored from the memoryjs sister repo in
commit `384db01` (v0.6.0 post-ship maintenance); v0.6.1 Phase 3 then
taught its `detectUnused` to consume test-file imports and to parse
`package.json` `exports` for subpath reachability.

```bash
# Regenerate the dependency graph + unused analysis + test-coverage report.
# v0.6.1: docs:deps now passes --include-tests by default.
npm run docs:deps

# Scan plan docs for stale/unchecked checkboxes.
npm run audit:plans
```

Re-run before any future minimize/audit/refactor release.

### Plan-template imperfections (known pattern)
Plan-writing subagents produce illustrative inline test templates that often have wrong tensor-input formats / wrong AST node kinds / wrong method names. Implementers at execution time MUST cross-check against existing fixtures and correct as needed; honest deviation documented in commit message. Examples from v0.4.5/v0.4.6: incorrect nested-array shapes in covariant-derivative tests, `op:'*'` vs `kind:'tensor-product'`, `evaluateNumericalRaw` claim to bypass `validate()` (it doesn't), wrong method names (`f64.mul` vs actual). Pre-execution verification gates on risky tasks are the systemic mitigation — the v0.5.0 plan has these on Tasks 0, 3, 6, 7, 10, 12.

### Adam+Eve review process for design and plan docs
Both design AND plan get adversarial-reviewed. For v0.5.0: design caught 19 findings (notably the Ruth-4-not-symplectic-on-non-separable-Hamiltonian showstopper that Adam missed but Eve caught); plan caught 25 MORE findings including the ricci-slot reintroduction (plan-writing reintroduced a bug the design had fixed) and the Picard-masquerading-as-Newton showstopper. **Never assume the plan inherits the design's fixes** — review the plan independently.

### Numeric claims in todo entries decay faster than checkbox state

A todo that says "fix the bug" stays accurate until the bug is fixed. A todo that says "fix the 65 sites where X happens" becomes increasingly fictional as the codebase evolves — refactors merge sites, deletions remove them, additions inflate them. **Every silent-staleness finding so far has been a numeric drift**, not a forgotten checkbox:

| Carry-forward | Stated number | Actual at re-measurement | Drift |
|---|---|---|---|
| PC-1.5 Shapiro residual | 2.51e-4 | 2.28e-8 | 4 OOM (3 releases stale) |
| AS-3 `schwarzschildPin` sites | ~65 | 8 | 1 OOM |
| BE-module unused exports | ~85 | 61 | 40% inflated |
| `schwarzschildRiemannFn` populated entries | 8 of 256 | 24 of 256 (mathematically complete) | 1 OOM |
| Unknown↔unknown bridge count | ~9 | 26 | 3× |
| Near-horizon Kretschmann scope | ~600 LOC across 4 files | ~300 LOC | 2× over |

**Convention**: when a todo entry cites a number, suffix it with the date the number was measured, e.g., *"65 sites (as of 2026-05-19)"*. This signals to future readers that the number is a snapshot, not a live measurement, and re-checking at HEAD is the first action before treating the number as work scope.

This applies to: counts of files/sites/symbols/tests, performance numbers (residuals, speedups, LOC budgets), and any other claim that would be invalidated by an unrelated refactor. It does NOT need to apply to canonical/fixed constants (e.g., "42-bridge catalog" is a structural cardinality, not a measurement).

**Re-baseline trigger**: before scoping any work whose effort estimate depends on a cited number, re-run the producing tool (`grep`, `npm run docs:deps`, `wc -l`, bench harness) at HEAD. If the number drifts by more than ~20%, update the todo entry's date suffix in the same commit that closes or re-scopes the item.

### How to update this file
- When a task completes: flip `[ ]` → `[x]` AND move it to the "Latest shipped" section if it represents a release
- When a new task is identified: add it to the appropriate section (active queue / deferred)
- Keep the "Latest shipped" section to 3-5 entries; older releases roll off into `CHANGELOG.md` for historical record
- Commit this file alongside the work it tracks (it's NOT in `.gitignore`)

---

## Post-v0.7 horizon (notes only, no commitments)

- **v0.7+ proposal set** in `docs/planning/UPT v0.70 - Proposals.md` (2026-05-22) — 8 proposals grounded in the MathTS CHANGELOG. **Status (2026-05-23 session):**
  - P1 (Intelligent Index): ✓ SHIPPED on v0.7-series branch
  - P2 (Sparse semantic catalog): ✓ SHIPPED on v0.7-series branch
  - P3 (Typed L+B+E): ✓ SHIPPED on v0.7-series branch
  - P4 (Bridge DSL): peer install unblocked as of v0.7.3 (2026-05-25 — `mathts-expression ^0.2.0` now declared in UPT's `optionalDependencies`); actual P4 implementation code still pending
  - P5 (`RegimeType`): ✓ SHIPPED ahead of v0.8 target
  - P6 (Bridge composition): **Phase A shipped** as docs-only research spec (`Part-IX-Composition.md`); Phases B/C/D are v0.9α / v0.9β / v1.0
  - P7 (Workbooks): BLOCKED on `mathts-workbook` peer install
  - P8 (Bridge param AD): ✓ SHIPPED ahead of v0.9 target (real-AD tests skip-marked pending CI peer install)
- **P6 Phase B** (v0.9α calibration) — five open questions in `docs/planning/v0.7-Proposal-6-PhaseA-Open-Questions.md` (Q1 composition surface, Q2 tolerance, Q3 flux interaction, Q4 identity, Q5 v1.0 escalation) need Phase B answers before opening `src/composition/` code.
- **P8 real-AD test enablement** — when CI installs `@danielsimonjr/mathts-autograd` (the optional peer), remove `.skipIf(true)` in `tests/diff/bridge-gradient.test.ts` and add AD-vs-analytic gradient assertions per the v0.9 design's Phase 2 spec.
- **P5 closed-taxonomy follow-up** — v0.9 per-bridge physics review to decide which new physics regimes (classical-mechanics, QFT, GR, cosmology, condensed-matter, statistical-mechanics, information-theoretic, …) to add as built-ins beyond the 18 v0.6-shipped values. Per P5 Decision #1 (research task, not engineering). **(2026-06-16 reconfirmed physicist-surface: the `defineRegime` mechanism is shipped + tested; the taxonomy DECISION is a physicist's call, not a mechanical pass. Left here, not implemented.)**
- [x] ✅ **`LabeledTensor` explicit axis-order invariant — EXECUTED 2026-06-16**
      (`docs/planning/v0.14-LabeledTensor-AxisOrder-Design.md`, Adam GREEN + Eve
      YELLOW→resolved). The prerequisite the mergeAxes vet surfaced: replaced the
      implicit "engine axis = sorted-key position" assumption with an explicit
      `axisOrder` field + `axisOf(key)`, maintained by transpose/contract/reshape;
      optional 4th ctor param (backward-compatible). Fixed the latent
      transpose/contract desync + Eve's collision-suffix duplicate bug. New
      `AxisOrderError` (@public). Suite **2605 passing** (+10); tsc src+tests,
      build, smoke ✓.
- [x] ✅ **`mergeAxes` / `splitAxis` (rank-changing reshape) — EXECUTED
      2026-06-16** (`docs/planning/v0.14-MergeAxes-SplitAxis-Design.md`, Adam
      design-GREEN + Eve impl-YELLOW→resolved). Rank-changing reshape on
      `LabeledTensor`: `mergeAxes` fuses a contiguous run of ENGINE axes (via
      `axisOf`, correct on transposed/contract-derived non-sorted axisOrder),
      `splitAxis` is the inverse; caller owns the new axis identities. New
      `@public` `AxisMergeError`/`AxisSplitError`. Eve caught Y1 (two split parts
      sharing one id → contract-illegal tensor; now guarded). 15 tests. Suite
      **2620 passing** (+15); tsc src+tests, build, smoke ✓. Closes the
      `RankPreservationError` "future helper" promise.
- Faraday-tensor mixed-component-dim BREAKING refactor (3 nodes affected per Part-VIII §VIII.10)
- Browser float32 `TensorEngine` impl
- threejs visualization bootstraps
- TensorJS v1.0: stable public API + numerical surface + declarative viz spec (north star)

## 2026-09-15 — five-axis pass (architecture-docs gate repair)

Assessed while repairing the architecture-docs gate on `master` (it was failing; now exit 0).
- **Speed / Stability / Reliability:** not touched. Docs-only change; no code path altered.
- **Security:** not touched.
- **Maintainability:** fixed — seven stale metric claims across six files corrected, plus the
  `src/`-scope prose figures in `OVERVIEW.md` re-measured.
- **LEFT DELIBERATELY (recorded, not done):** the repo_map-generated doc set is still gated by
  NOTHING in CI. `docs-fresh` covers only the `docs:deps` artifacts, so `OVERVIEW`, `COMPONENTS`,
  `DATAFLOW`, `FILE_INVENTORY`, `API`, `ARCHITECTURE` and `duplicate-symbols` drift unwatched
  between manual runs. This is the SECOND repair of the same drift (first: `bdd830f`, 2026-08-21),
  which is the evidence that an unenforced rule does not hold. The real fix is a CI step running
  `repo_map.py check . --docs docs/architecture`; it needs a decision on where that job lives.
- **ALSO LEFT:** 15 local-only branches in this clone read "UNMERGED" against `origin/master`, but
  that signal is unreliable here — `pr165` reads UNMERGED and its PR was demonstrably squash-merged.
  Judging them needs per-branch PR state, and deleting branches is destructive, so nothing was
  deleted and nothing should be until that check is done.
