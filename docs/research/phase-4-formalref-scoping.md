# Phase 4 formalRef scoping

> **Status as of 2026-10-01.** This file keeps the counts, names, and pins it was written with. The live split is [`NOTES.md`](../../NOTES.md): ten atlas bridges and thirteen catalog ids (be-12, 21, 27, 33, 37, 40, 43, 50, 54, 55, 59, 60, 63) are Lean kind `bridge` at PhysJS `dd35202920bf19c39f71f15d9ee740a6d28ec173`. `formally-proved` means that kind only. BE-13's catalog name is Einstein trace reduction. The gap list is [`docs/planning/Bridge-Gap-Inference.md`](../planning/Bridge-Gap-Inference.md). §4.3's sentence that no Lean proof has been written in this fleet is that day's size-class estimate; the rank-1 atlas rows now have PhysJS theorems, and the search tables stay as the 2026-09-24 record.

A scoping report, not code. It answers five questions from Mothership (2026-09-24) about the Phase 4
exit criterion "≥ 5 with a reviewed `formalRef`". The count is ~~1~~ ~~six~~ ~~ten~~ the split in
`NOTES.md`. "The count is 1" is the 2026-09-24 measurement. Every statement below names its
source. Measurements carry their commit and date.

## Owner decision

The owner DEFERRED this criterion on 2026-09-24 (pre-registration Amendment 10). It no longer blocks
DONE. Mothership relayed both statements verbatim:

- 15:02 CDT: "I feel that UPT is burning a lot of tokens for a long time on citations we can resolve
  another time. We're not trying to turn this project in a paper right now. It's mainly an
  exploration project."
- 15:16 CDT: "UPT won't find many citations for the bridge equations. They are my own products, with
  help from agents like you. While the formulas and equations are mathematically consistent, we need
  to vet them against established physics. That is the point of the expiration project and the
  honest disclaimer in the README." ("expiration" is the owner's typo for "exploration".)

**The absence of external counterparts is the expected result, not a gap.** Two reasons apply, to
two different sets:

- **The catalog bridge equations (BE-11 to BE-65)** are the owner's own work. No external source is
  expected for them. The project exists to vet them against established physics. The README says
  so: "NOT peer-reviewed theoretical physics (yet)" (line 37), and its closing disclaimer (line 365).
- **The 20 atlas bridges in this report** are textbook relations, and all 20 cite the literature.
  Formal libraries hold almost no physics PDEs: Mathlib's own index lists the heat, wave and Laplace
  equations as not formalized (§3). So no checked statement was expected for them either.

The routes in §4.5 stay as a record. ~~None of them is scheduled.~~ The schedule is
[`docs/design/roadmap-lean-proven-bridges.md`](../design/roadmap-lean-proven-bridges.md).
See the correction below. The 2026-09-24 deferral is unchanged: this criterion does not block DONE.

## Answer in brief

1. **The one reviewed reference** is `ab-pendulum-linear` →
   Physlib `ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff`, fidelity
   `sanity-lemmas`.
2. **"The proofs need PhysJS" does not conflict with the ROADMAP definition.** A `formalRef` points
   at an external checked statement. No library searched holds such a statement for the other 19
   bridges, so somebody must write the proofs. The ROADMAP puts proofs out of tree, and PhysJS is
   the out-of-tree repository made for them. PhysJS does not block a Physlib reference. The absence
   of a Physlib statement blocks it. ~~PhysJS itself is an empty, private scaffold, held by the owner's
   standing no-build instruction.~~ At the 2026-09-24 read it was a private scaffold with no Lean
   project. The no-build hold recorded in §2 is superseded for planning; see the correction below.
   The privacy measurement is not superseded: this report still has not read the repository.
3. **Per bridge:** no library searched holds a statement that meets the S4.6 standard for any of
   the other 19 bridges. The search covered Physlib, Mathlib, Coq/Coquelicot, Isabelle, HOL Light,
   HOL4 and Mizar. Two bridges have partial counterparts. Neither qualifies (§3).
4. **Candidates:** 0 in existing libraries. 2 bridges with partial counterparts:
   - `ab-walk-diffusion`: the fixed-time central limit theorem, in Mathlib, Isabelle and HOL Light;
   - `ab-wave-dalembert`: the converse direction, in Physlib and in Coq.

   5 bridges could get short PhysJS lemmas that certify `bound.delta` (§4). The inequality
   itself uses Mathlib. The lake project still requires Physlib. See the correction below.
5. **Fewer than 4 candidates exist in existing libraries.** The criterion cannot close from
   existing libraries. It closes through the PhysJS proofs in route A, or an owner amendment.
   ~~or an upstream contribution to Physlib.~~ An upstream patch is not a substitute (the
   correction that follows).

## Correction (2026-09-30)

Daniel assigned the Lean 4 project and its CI to PhysJS, and made PhysLean a firm
dependency beside Mathlib. Struck sentences above are the claims this replaces. The
search tables below are unchanged.

- The proofs are scheduled. Route A is milestone 1 of the roadmap. The deferral still
  means the old exit does not block DONE.
- The no-build hold in §2 reached this report only as a Mothership relay. It is
  superseded for planning. This report does not claim PhysJS has since gained a Lean
  project: the 2026-09-24 tree is still the last tree it read.
- Route B is not a substitute for PhysJS. PhysJS requires Mathlib and the Physlib
  package (the library Daniel calls PhysLean; `leanprover-community/physlib`), both as
  direct requires. An upstream patch may still be offered. It does not replace that
  project. The standing statement is `MEMORY.md`.
- ~~Publishing PhysJS is still the open decision in §4.4. Route A's phrase "make PhysJS
  public" is not decided by the schedule.~~ PhysJS is public. The GitHub API reports
  `private: false`. The privacy row in §2 remains the 2026-09-24 reading.
- §4.3 rank 1 is an inequality on the reals. "Mathlib only" describes that inequality.
  The lake project requires Physlib anyway.
- §4.4 said "4 rank-1 references." The rank-1 row is five bridges. Five new references
  take the reviewed count from 1 to 6.

## 1. The existing reviewed formalRef

| Field | Value |
|---|---|
| Bridge | `ab-pendulum-linear` (approximation, pendulum → spring), `src/atlas/oscillators/bridges-limits.ts` |
| `system` | `lean4-physlib` |
| `statement` | `ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff`, with `toHarmonicOscillator_ω` (ω = √(g/ℓ)) |
| `version` | `physlib@5ad56e24de155462acd8478458292347393d5908 lean4:v4.34.0` |
| `axioms` | `propext`, `Classical.choice`, `Quot.sound`, measured with `#print axioms` on a local build. A `sorry` control printed `sorryAx` |
| `fidelity` | `sanity-lemmas` |

**The fidelity method.** `tests/atlas/formal-sanity.test.ts` (7 tests) instantiates each quoted
Lean statement on a known pendulum (m = 0.3 kg, g = 9.81 m/s², ℓ = 1.2 m). It checks that the
record asserts the same thing there: mass mℓ², spring constant mgℓ, so ω0² = g/ℓ.

**The reference certifies the TRANSFORMATION, not `bound.delta`.** Physlib's period results concern
`periodFormula`, and Physlib's own TODO has not yet tied `periodFormula` to the motion. The gate
`bun run atlas:formal-gate` re-measures the axioms (`tools/formalref-axiom-gate/`,
`formal/physlib/`).

## 2. The reconciliation: what "the proofs need PhysJS" means

### The two statements

- **ROADMAP deliverable (lines 385–387):** a `formalRef` points at an EXTERNAL checked statement
  (`system`, `statement`, `version`, `axioms`, `fidelity`), with fidelity other than `unreviewed`.
  The proof lives out of tree. The decision at line 138 adds "no proof assistant in-tree".
- **ROADMAP §7 row (line 510):** "Reviewed `formalRef` is 1 of 5 (open; the proofs need PhysJS)".

### Why they agree

The definition says where a proof lives. The definition does not say who writes the proof. For the pendulum,
Physlib already had the proof. For the other 19 bridges, no library has one (§3), so a reference
needs a proof that somebody writes first. The definition sends that proof out of tree, and PhysJS
is the out-of-tree repository made for it. "Needs PhysJS" is therefore short for "needs new proofs,
and the agreed place for new proofs is PhysJS".

**PhysJS does not block Lean 4 or Physlib references.** A Physlib reference needs no PhysJS. The
blocker is that Physlib has no statement to point at.

### What PhysJS is

Read with `gh api` on 2026-09-24:

| Fact | Value |
|---|---|
| Repository | `danielsimonjr/PhysJS`, **PRIVATE**, default branch `main` |
| Created | 2026-09-22 20:12 UTC. Two commits (`59272356`, `84528167`, last 20:43 UTC) |
| Content | `README.md`, `CHANGELOG.md`, `LICENSE` (MIT), `.gitignore`. No Lean project. No proofs |
| Its README's target list | spring ↔ LC via ω²; the damped ζ² map; the Stokes–Einstein substitution; Klein–Gordon dispersion limits; d'Alembert in the missing direction |
| Its README's own ceiling | "algebra-level lemmas and the ceiling is modest" |
| Its CHANGELOG | "deliberately empty of content until the UPT session … adds them" |

### Why it is held

Mothership relayed the hold to this session on 2026-09-22, in two messages. At 21:40 UTC, a relay
named "a standing no-build instruction from the owner". At 21:42 UTC, the next relay said that the
instruction "is about PhysJS and ComputeJS", and: "STILL HELD: PhysJS, by the owner's standing
instruction". **This session has not seen the owner's own words.** The hold reaches this report only
through Mothership. The PhysJS CHANGELOG (last commit 20:43 UTC) is older than those relays and
expects the UPT session to add the proofs. ~~The hold supersedes that.~~ That sentence is
superseded for planning (correction at the top). The relay record stays.

### Three facts that any PhysJS route must face

1. **PhysJS is private. UPT is public and on npm** (0.45.2). A `formalRef.version` that points into
   a private repository is a statement that no reader of the published record can check. Publishing PhysJS is
   outward-facing, so the decision is the owner's.
2. **The axiom gate checks only `system: 'lean4-physlib'`** (`tools/formalref-axiom-gate/gate.ts:117`).
   A PhysJS or Mathlib reference is `system: 'other'`, and the gate skips it. Such a reference is
   ungated until the gate learns a second checkout. The `FormalRef.system` union
   (`src/atlas/types.ts`) has no PhysJS or Mathlib value.
3. **Lean checks the proof, not the match.** The same fleet that wrote the
   bridge would write the PhysJS proof. Lean proves that the Lean statement is true. Lean does not prove that the Lean
   statement says what the bridge says. The fidelity review carries all of that load (§4.1).

### A second route

~~Contribute the missing statements upstream to Physlib. The reference is then
`system: 'lean4-physlib'`, and the existing gate applies with no change.~~ An upstream
patch may still be offered. It is not a substitute for the PhysJS project (correction
at the top). A pull request to a third-party repository is outward-facing, so the
decision is the owner's. Physlib's review time is unknown.

## 3. Per-bridge search

### Where I looked

| Library | Version | Method |
|---|---|---|
| Physlib (formerly PhysLean) | `5ad56e24` (S4.6, the pin) | The S4.6 search: full tree, every candidate file read, axioms measured (`Atlas-Phase-4-Design.md`, S4.6) |
| Physlib | HEAD `1c81053a` (2026-09-24 17:36 UTC) | Tree diff against `5ad56e24`: four new `.lean` files (`OfGaussianInt`, `DensityUncertainty`, `MomentMap`, `MomentMapCohomology`), none relevant. The candidate files were read again at HEAD |
| Mathlib | master `bd6c1abe` (2026-09-24 16:12 UTC) | Full tree (9,149 `.lean` files) searched by topic. Mathlib's own theorem indexes read: `docs/undergrad.yaml`, `docs/100.yaml`, `docs/1000.yaml`. GitHub code search by identifier |
| Mathlib | `5ed29652` (2026-09-15) | The revision that Physlib pins at both `5ad56e24` and `1c81053a`. Checked for the one Mathlib counterpart |
| Other systems | — | Coq/Rocq (Coquelicot), Isabelle AFP, HOL Light, HOL4, Mizar, Metamath, ACL2, PVS, and the literature. Searched by a read-only subagent (§3.3) |

**An instrument defect, found by a positive control.** GitHub code search with a QUOTED phrase
returned nothing for `"wave equation"` in Physlib, but Physlib has `WaveEquation/Basic.lean`.
Identifier searches (`WaveEquation`, `planeWave_waveEquation`, `IsPreBrownianReal`) found their
files. So this report uses only identifier searches, and it discards every empty result from a
quoted phrase.

**Mathlib's own index confirms the PDE gap.** `docs/undergrad.yaml` at `bd6c1abe` lists
"solving the Laplace equations", "heat equations" and "wave equations" with an empty declaration,
which means not formalized. `docs/1000.yaml` lists Donsker's theorem with no declaration.

### 3.1 The table

"None" means that no statement exists in that library at the versions above. The Other column comes
from §3.3.

| Bridge | Claim | Physlib | Mathlib | Other | Result |
|---|---|---|---|---|---|
| `ab-spring-lc` | spring ≡ LC by rescaling, ω² dictionary | `HarmonicOscillator` exists (m, k, ω = √(k/m), `EquationOfMotion`). No LC circuit | No circuit. ODE infrastructure only (`Analysis/ODE`) | none | none |
| `ab-damped-rlc` | damped spring ≡ RLC when ζ matches | `DampedHarmonicOscillator` (damping classes, `qualityFactor`, `relaxationTime`). No RLC | none | Related only: damped-oscillator flows in Isabelle AFP `Matrices_for_ODEs`, and HOL4 second-order ODE work applied to a circuit. No mechanical ↔ electrical equivalence (agent) | none |
| `ab-pendulum-linear` | sin θ → θ, ω0² = g/ℓ | `linearizedEquationOfMotion_iff` | — | — | **recorded (§1)** |
| `ab-damped-massless` | m → 0, overdamped | No m → 0 limit. `toUndamped_equationOfMotion` is the γ = 0 case, the opposite regime | none | none | none |
| `ab-chain-wave` | mass–spring chain → 1D wave, c² = κa²/m | `TightBindingChain` is quantum. `CoupledSpringPotential` (PhyslibAlpha) has potential lemmas and no continuum limit. `Vibrations/LinearTriatomic.lean` is a stub with one TODO | none | Related only: Boldo et al. (Coq) prove the convergence of a finite-difference scheme for the wave equation. A numerical grid is not a physical lattice (agent) | none |
| `ab-walk-diffusion` | random walk → Fick, D = Δx²/(2Δt) | none | `ProbabilityTheory.tendstoInDistribution_inv_sqrt_mul_sum_sub` (the CLT) covers the fixed-time Gaussian marginal only. Donsker not formalized | Isabelle HOL-Probability `central_limit_theorem` and HOL Light `INTEGRABLE_CLT`: the same fixed-time class as Mathlib (both read) | **partial (§4.2)** |
| `ab-heat-diffusion` | heat ≡ Fick, κ/(ρc_p) ↦ D | none | "heat equations" not formalized | HOL Light (Deniz and Rashid) defines `heat_equation` and proves a series solution. No statement relates it to diffusion (read) | none |
| `ab-schrodinger-diffusion` | t = −iτ, D = ħ/(2m) | `QuantumMechanics/FreeParticle/Basic` has three mass lemmas. No time-dependent free Schrödinger equation. The `Wick*` files are Wick's theorem, not Wick rotation | none | none | none |
| `ab-langevin-diffusion` | ⟨x²⟩ → 2Dt, D = k_BT/γ | none | `BrownianMotion/Basic` defines pre-Brownian motion. No SDE and no Ornstein–Uhlenbeck (identifier searches empty) | none | none |
| `ab-stokes-einstein` | D = k_BT/(6πηa) | `NavierStokes.lean` proves conservative ↔ convective only. No drag on a sphere, no Einstein relation | none | none | none |
| `ab-telegraph-diffusion` | drop τu_tt, ε = τDq² | none | none | HOL Light `telegrapher_eq.ml` defines the telegrapher's equations. No τ → 0 theorem (definitions read) | none |
| `ab-telegraph-wave` | drop u_t, c² = D/τ | none | none | Related only: a lossless case (R = G = 0) in the Deniz 2024 thesis. It is not the drop-u_t reduction (agent) | none |
| `ab-heat-laplace` | steady state: T linear | none | "Laplace equations" and "heat equations" not formalized. Ingredient only: `is_const_of_deriv_eq_zero` (`Analysis/Calculus/MeanValue.lean:751`) | HOL Light `heat_conduction.ml` has no steady-state or Laplace statement (read) | none |
| `ab-string-wave` | small slopes, c² = F/μ | No string module | none | none | none |
| `ab-wave-dalembert` | every C² solution is F(x − ct) + G(x + ct) | `planeWave_waveEquation` proves the CONVERSE: plane waves solve the wave equation | "wave equations" not formalized | Coq/Coquelicot `examples/DAlembert.v`: the CONVERSE direction. The source-term lemmas `gamma20_lim` and `gamma02_lim` end in `Admitted` (read) | **partial, wrong direction (§4.2)** |
| `ab-sound-speed` | linearized Euler + adiabatic EOS → c² = γp₀/ρ₀ | `Euler/Basic` proves `euler_iff_convectiveEuler` only. `Isentropic.lean` has no theorems. No linearization | none | none | none |
| `ab-klein-gordon-wave` | drop ω₀², ω → ck | No Klein–Gordon (identifier search `KleinGordon` empty) | none | none | none |
| `ab-kg-schrodinger` | non-relativistic limit, ħ/m ↦ c²/ω₀ | none | none | none | none |
| `ab-kg-oscillator` | uniform mode: u_tt = −ω₀²u | `HarmonicOscillator.EquationOfMotion` exists for the conclusion side. No Klein–Gordon | none | none | none |
| `ab-stiff-string` | drop EI y_xxxx | none | none | none | none |

### 3.2 The Mathlib counterpart, measured

The CLT exists at both Mathlib revisions, with an identical statement:

```lean
theorem tendstoInDistribution_inv_sqrt_mul_sum_sub
    (hY : HasLaw Y (gaussianReal 0 Var[X 0; P].toNNReal) P')
    (hX : MemLp (X 0) 2 P) (hindep : iIndepFun X P)
    (hident : ∀ (i : ℕ), IdentDistrib (X i) (X 0) P P) :
    TendstoInDistribution
      (fun (n : ℕ) ω ↦ (√n)⁻¹ * (∑ k ∈ Finset.range n, X k ω - n * P[X 0]))
      atTop Y (fun _ ↦ P) P'
```

**Axioms measured on 2026-09-24.** A scratch probe ran against the existing Physlib `5ad56e24`
checkout, which carries Mathlib `5ed29652`. `#print axioms` gives `[propext, Classical.choice,
Quot.sound]`. An in-file `sorry` control printed `[sorryAx]`. The probe took 211 s. It changed
nothing in the checkout: `git status` showed the same 4 untracked gate files before and after. The
probe ran the in-file control only. The imported-module control was not repeated.

### 3.3 Other systems

**Method.** A read-only subagent searched with web search and web fetch only. It covered:

- Coq/Rocq: Coquelicot and the Boldo et al. wave-equation work;
- the Isabelle AFP: the Physics, Analysis, Probability, and Measure and integration topics;
- HOL Light and HOL4: the work of the Hasan and Tahar groups;
- Mizar, Metamath, ACL2, PVS and the literature.

It found no exact counterpart for any of the 20 bridges.

**Second method.** I re-read the sources that the table depends on:

| Source | What I read | Result |
|---|---|---|
| Coquelicot `examples/DAlembert.v` (`thery/coquelicot` mirror, 7,648 bytes) | The whole file | 8 `Qed`, 2 `Admitted`, 35 `admit`. `alpha_*` and `beta_*` end in `Qed`. `gamma20_lim` and `gamma02_lim`, the source-term part, end in `Admitted`. No lemma combines the parts into "u solves the wave equation". The file shows that the formula is a solution, which is the converse of the bridge |
| Isabelle HOL-Probability `Central_Limit_Theorem` (Isabelle2025-2 library page) | The statement of `central_limit_theorem` | i.i.d. with mean m and variance σ² > 0: `weak_conv_m (λn. distr M borel (λx. (∑i<n. X' i x) / sqrt (n*σ⇧2))) std_normal_distribution` |
| HOL Light `Probability/clt.ml` (`jrh13/hol-light`, 972,801 bytes) | The statement of `INTEGRABLE_CLT` | the normalized sum's CDF converges to `std_normal_cdf` |
| HOL Light `pde/he/heat_conduction.ml` (Deniz and Rashid, 48,711 bytes) | The theorem list and a case-insensitive search | `heat_equation` (definition), `HEAT_SOLUTION_CONVERGENCE`. No match for "steady", "laplac" or "diffus" |
| HOL Light `pde/te/telegrapher_eq.ml` (225,062 bytes) | The definitions | `telegraph_equation_voltage`, `wave_voltage_equation` and phasor forms |

**One agent claim did not survive the second method.** The agent said that `heat_conduction.ml`
calls the heat equation "the diffusion equation" in prose. The file contains no "diffus" at all.
The table does not use that claim.

**Rows marked "(agent)" rest on the agent's reading alone.** None of them changes a result, because
each is "related only".

**What could not be read:**

- The official Coquelicot repository refused access (HTTP 403). So the current master of
  `DAlembert.v` is unverified, and the mirrors may be older.
- Some fetches were truncated or behind a paywall: the Springer pages and the Deniz thesis theorem
  name.
- The Mizar article on the 1D wave equation (Otsuki et al., 2019) came back as unreadable binary.
  From its abstract it treats separation of variables, not the general-solution direction.

## 4. Candidates, fidelity review and cost

### 4.1 The fidelity routes, under the owner's decisions

| Route | Definition (`src/atlas/types.ts`) | Available? |
|---|---|---|
| `two-formalizers` | "two people formalized it independently and agreed" | **No.** One maintainer, no independent human reviewers (owner, 2026-09-23). It becomes available only if an amendment lets model instances count, and then it must be reported as MODEL agreement, as Amendment 6 did for κ |
| `back-translation` | "a reviewer who had not seen the source translated the formal statement back to prose and it matched" | **Only as a MODEL review.** An isolated instance that has not seen the atlas translates the Lean statement to prose, and a second isolated instance compares that prose with the bridge. `scripts/atlas-benchmark-models.mjs` already launches isolated instances. It must be disclosed as a model review (the Amendment 6 and 7 precedent) |
| `sanity-lemmas` | "the statement was instantiated on known cases in `tests/atlas/formal-sanity.test.ts`" | **Yes, now.** The pendulum reference uses it |

### 4.2 The two partial counterparts in existing libraries

**`ab-walk-diffusion` ↔ the Mathlib CLT.** Take steps X_k = ±1 with probability ½ each, so the mean
is 0 and the variance is 1. Take n = t/Δt steps of size Δx = √(2Dt/n). The walker's position is then
x(t) = √(2Dt) · (√n)⁻¹ Σ X_k. The CLT gives convergence in distribution to √(2Dt) · N(0, 1) =
N(0, 2Dt). The variance 2Dt is the Fick kernel's variance under the bridge's closure D = Δx²/(2Δt).
Isabelle and HOL Light prove the same class of theorem (§3.3), so a system change does not help.

- **It certifies** one preserved property: "the Gaussian long-time profile" with variance 2Dt, at
  one fixed time.
- **It does not certify:**
  - the transformation to Fick's equation, because no heat or diffusion equation exists in Mathlib;
  - WD1's claim about the density at the origin, which needs a LOCAL limit theorem;
  - the multi-time limit (Donsker), which Mathlib does not have.
- **Against the S4.6 standard it does not qualify.** The pendulum reference certifies the
  transformation. This one certifies one property. `formally-proved` is derived for the whole
  bridge, so recording this reference would overstate what is proved.
- **If a ruling allows a property-level reference,** the work is:
  - a sanity-lemma test with three checks:
    - the exact binomial variance nΔx² = 2Dt;
    - a Kolmogorov distance to N(0, 2Dt) that falls as n grows;
    - a negative control with the wrong closure Δx²/Δt;
  - a gate extension: a Mathlib system value and a probe line. The Physlib checkout already holds
    the Mathlib `.olean`.
  - a scope note on the derived tag.

**`ab-wave-dalembert` ↔ Physlib `planeWave_waveEquation`, and Coquelicot `DAlembert.v`.** Both prove
the other direction: a d'Alembert-type formula solves the wave equation. The bridge claims that every
solution has d'Alembert form. The Coq file also leaves its source-term part `Admitted`. S4.6
recorded NO, and nothing found since changes that.

### 4.3 PhysJS candidates

The planning hold is lifted; see the correction at the top. The table is the one
written when the hold was still recorded.

These statements need new proofs. Each row names what the proof would certify, because a true
lemma about the wrong claim adds nothing.

| Rank | Bridge(s) | Lean statement shape | Certifies | Size |
|---|---|---|---|---|
| 1 | `ab-kg-schrodinger`, `ab-klein-gordon-wave`, `ab-stiff-string`, `ab-telegraph-diffusion`, `ab-telegraph-wave` | Each record's error function has a closed form, for example (√(1 + x²) − 1)/(√(1 + x²) + 1) for KG → Schrödinger. The lemma: the function is monotone on the regime, and its value at the edge equals `delta`. The inequality uses Mathlib (`Real.sqrt`). The lake project still requires Physlib | **`bound.delta` exactly**, at the level of the dispersion relation. This is more than the pendulum reference certifies. It does not derive the dispersion relation from the PDE | S, each |
| 1a | the same five | Add: a plane wave solves the PDE if and only if ω(k) obeys the dispersion relation | the transformation, from the PDE | M, each |
| 2 | `ab-kg-oscillator` | A spatially uniform solution of u_tt = c²u_xx − ω₀²u solves Physlib's `HarmonicOscillator.EquationOfMotion` with ω = ω₀ | the restriction, in Physlib's own terms | M |
| 3 | `ab-spring-lc`, `ab-damped-rlc` | The time rescaling maps a solution of one oscillator to a solution of the other. Physlib's `(Damped)HarmonicOscillator` states both sides, with the LC circuit as an oscillator with m ↦ L, k ↦ 1/C | the dictionary. The circuit reading stays UPT's claim, because Physlib has no circuit | M |
| 4 | `ab-wave-dalembert` | The missing direction: a C² solution of Physlib's `WaveEquation` in one dimension equals F(x − ct) + G(x + ct) | the bridge's full claim | L |
| — | `ab-heat-laplace` | T″ = 0 with fixed ends gives the linear profile | the steady-state ODE step only. No heat equation exists to restrict | S |
| — | `ab-stokes-einstein`, `ab-heat-diffusion` | A substitution or a relabelling | nearly nothing. The physics is in the premises. **Recommend: do not count these** | trivial |

**Size classes are an ESTIMATE, not a measurement.** No Lean proof has been written in this fleet,
and per-bridge person-hours are NOT MEASURED (Amendment 6). S is a real-number inequality, about
20–80 lines of Lean. M is derivative work through Physlib's `Time` and `EuclideanSpace` types,
about 80–250 lines. L is a PDE change of variables with integration, about 250–600 lines. Each
range can be wrong by a factor of 3.

### 4.4 Cost estimate for the best candidates

**Measured parts:**

- Toolchain install, clone, Mathlib cache and build of the probed modules: 9 min 11 s
  (2026-09-22, `physlib-build.log`).
- One axiom probe against the built checkout: 211 s (2026-09-24).
- The existing sanity-lemma test: 100 lines. The axiom gate: 306 lines.

**Estimated per candidate, for the rank-1 group (S):**

| Step | Estimate |
|---|---|
| Lean lemma in PhysJS, with CI | 1–3 agent-hours |
| Sanity-lemma test in `formal-sanity.test.ts`: instantiate on 2–3 known cases, plus a negative control that must FAIL | 0.5–1 agent-hour |
| Model back-translation (optional, a second fidelity route): two isolated instances | under USD 1 of model cost. Basis: USD 0.15 per authored benchmark item (NOTES.md) |
| `formalRef` record and review | 0.5 agent-hour |

**One-time costs:**

- Lake project scaffolding in PhysJS, pinned to Physlib `5ad56e24` or later: 1–2 agent-hours.
- Gate extension so that a PhysJS reference is re-measured and not skipped: 2–4 agent-hours.
  Otherwise every new reference is ungated.
- An owner decision on PhysJS visibility, because no reader can check a private proof.

~~Total for 4 rank-1 references: about 10–25 agent-hours plus the owner decisions.~~
**Total for the five rank-1 bridges: about 10–25 agent-hours plus the owner decisions.**
The row is five bridges, so five references take the reviewed count from 1 to 6. Four
would meet a count of five only by adding the pendulum reference that already exists.
This is an estimate. The first proof should be timed, so that the rest are costed from
a measurement.

### 4.5 A plain statement

**Existing libraries hold 0 new qualifying candidates. Two bridges have partial counterparts.** The
criterion "≥ 5 with a reviewed `formalRef`" cannot close from existing libraries. The criterion can
close through one of these:

- **A.** Write the rank-1 lemmas in PhysJS. The five dispersion bridges alone take the count
  from 1 to 6. ~~Lift the PhysJS hold and make PhysJS public.~~ The hold is lifted for
  planning (correction at the top). Making the repository public is still open (§4.4).
- **B.** ~~Contribute upstream to Physlib. The same lemmas become `lean4-physlib` references under
  the existing gate.~~ An upstream patch may still be offered. It is not a substitute for the
  PhysJS project (correction at the top).
- **C.** An owner amendment to the criterion. The numbers for it:
  - 1 of 5 reviewed;
  - 0 further counterparts in Physlib (`5ad56e24` and `1c81053a`), Mathlib (`bd6c1abe`) or the
    other systems in §3.3;
  - 2 partial counterparts.

~~A, B and C are the owner's decisions: A and B are outward-facing, and C changes a pre-set criterion.~~
Route A is scheduled (correction at the top). Publishing PhysJS, an upstream patch, and an
amendment to the criterion stay owner decisions.
