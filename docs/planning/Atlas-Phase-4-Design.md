# Atlas Phase 4 — verification workflow and checked bridges (design note, L4.1)

Authorized by [`ACTIVE.md`](../../ACTIVE.md) Sprint 4. Briefs in
[`Atlas-Roadmap-Implementation-Plan.md`](Atlas-Roadmap-Implementation-Plan.md) §Sprint 4.
Where this note and the plan disagree, **this note wins and the deviation is stated here**,
in the same way Phase 3's note superseded the plan's wording on `boundaryData`.

Scope: S4.1 applicability checker · S4.2 witness runners · S4.3 `formalRef`, the results
artifact and the two derived tags · S4.4 diffusion family · S4.5 wave family · S4.6 formal
references.

---

## 1. The applicability checker (S4.1)

`src/atlas/applicability.ts` answers one question: **before you believe a bridge, what about
it is not checked?** It returns FINDINGS, never a boolean. A boolean would have to choose
between "unchecked" and "wrong", and the whole point of the module is that those differ.

### 1.1 Four check families, and what each can actually decide

| Family | Decides | Source |
|---|---|---|
| dimensions | the transformation's AST is dimensionally homogeneous | `src/dimensional/validator.ts`, unchanged |
| conventions | the premise and conclusion records declare no conflicting sign/unit choice | `checkConventions` + `unknownConventionKeys` (S1.4) |
| side conditions | every division has a stated non-vanishing divisor; a difference of equal even powers is flagged as solution-adding | this module, over the AST |
| model compatibility | the premise models share a family, or a bridge between their families is declared | this module, over `AtlasModel.family` |

### 1.2 Severity is two-valued, and `question` is not a weaker `blocking`

A finding is `'blocking'` when the data CONTRADICTS itself (a dimensional failure, a declared
convention mismatch, a literal zero divisor) and `'question'` when the data is SILENT (a
divisor with no stated side condition, a convention only one side declares, models whose
relationship is unrecorded).

This is the same asymmetry `conventions.ts` already argues for at length: **absence is not
disagreement.** Collapsing the two into one severity would let a caller report "4 findings"
for a record whose only defect is that nobody wrote something down — and, in the other
direction, would bury a real dimensional contradiction among them.

### 1.3 The division rule, stated so it cannot quietly pass

For every `{ kind: 'op', op: '/' }` node the DIVISOR (`args[1]`) is examined:

- a divisor that is a numeric literal leaf (a `symbol` whose `name` parses to a finite
  non-zero number) is safe and produces nothing;
- a literal `0` divisor is `blocking`;
- otherwise the divisor needs a side condition NAMING it together with a non-vanishing
  marker (`≠ 0`, `!= 0`, `<> 0`, `nonzero`, `non-zero`, `> 0`, `positive`). Absent ⇒ `question`.

**The matcher is deliberately shallow, and that is a stated limit rather than an oversight.**
It matches the divisor's symbol names against side-condition PROSE. A side condition is free
text; no parser exists for it, and inventing one here would be a second grammar nobody
maintains. The failure mode is therefore a FALSE QUESTION (a genuinely guarded divisor phrased
in words the matcher does not know), never a false clearance for a divisor nobody mentioned —
a divisor absent from the prose cannot match. The asymmetry is the right way round: the check
over-asks rather than over-clears.

### 1.4 The squaring rule — what it actually detects

The plan's example is `x² = y²` → "adds solutions". `ExprNode` has no equation node, so the
representable form of that claim is the DIFFERENCE `x² − y²`. The rule fires on an `op` node
`'+'` or `'-'` **two of whose arguments are `^` with the same literal even exponent**. Squaring
both sides of a relation admits the sign-flipped branch, so the bridge needs a side condition
fixing the sign; the finding is a `question` naming the exponent.

It does NOT fire on an isolated `x²` elsewhere in an expression, because an even power is not
by itself a solution-adding step — only equating two of them is. A rule that fired on every
square would report a finding on nearly every record in the atlas and be switched off within a
week, which is worse than not having the rule.

### 1.5 Model compatibility

Premises are compatible when they all share `family` with each other and with the conclusion.
When they do not, the caller may supply `declaredBridges` — unordered family pairs already
bridged — and a pair found there is compatible. Anything else is a `question`: an unrecorded
cross-family step is exactly the thing the atlas exists to make visible.

---

## 2. Witness runners (S4.2)

### 2.1 The parser is INJECTED, and no test touches the registry

`src/numerical/formula-registry.ts` caches the parser in module scope and exposes no reset
hook. A test that registered a stub would leak it into every later test in the same worker.
So `runSymbolicWitness(w, parser = getFormulaParser())` takes the parser as a parameter:
tests pass a stub for the present path and `null` for the absent path, and the registry is
never written. A third test exercises the REAL registry under the existing skip-when-absent
pattern (`tests/numerical/formula-mathts.test.ts`, `UPT_REQUIRE_PEERS`).

**As built (S4.2), two corrections to the wording above.** (1) The injected capability is a
SIMPLIFIER, not the parser: a parser cannot decide `lhs − rhs = 0`, and simplification lives in
`src/composition/expr-simplify.ts` over a different peer (`@danielsimonjr/mathts-functions`). So
the signature is `runSymbolicWitness(w, simplifier?)`. (2) An OMITTED argument resolves through
`isSimplifierAvailable()` to `simplifyExpr` or `null`, because `simplifyExpr` alone returns
`simplified: false` for both an absent peer and an irreducible expression. Without that step
the default path reported absence as `not-simplified`. Tests still pass `null` or a stub
explicitly and never touch the registry.

**A defect found by the real-peer test, fixed at its cause.** The CAS returns a bare,
dimensionless `0` for `x − x` with `x` a length, and `simplifyExpr`'s dimension guard read that
as "the simplified form changed dimension" and threw. No dimensioned identity could ever reach
`checked`. The first version of the real-peer test asserted only "not refuted", so it passed
while the defect was live. `simplifyExpr` now gives a literal zero the original dimension, and
the test asserts `checked`.

### 2.2 `unresolved` is the outcome of every non-answer, and it carries a reason

Peer absent, budget exhausted, and parser throw are all `unresolved` — distinguished by
`reason: 'peer-absent' | 'timeout' | 'parse-error' | 'not-simplified'`, never by a thrown
error and never by `refuted`. **A check that did not run is not a check that failed**; this
repo has been bitten by exactly that conflation. `refuted` is reserved for a simplification
that COMPLETES and is demonstrably non-zero.

### 2.3 Numeric convergence

`runNumericWitness` evaluates at two resolutions and records
`convergence: { coarse, fine, ratio }` with `ratio = |coarse − target| / |fine − target|`.
A ratio at or below 1 means refinement did not improve the answer; it is reported and does
NOT earn `numerically-supported`. The ratio is REPORTED rather than compared against an
expected order, because the witnesses in hand do not all declare their scheme's order and
asserting an order nobody recorded would be fabrication.

---

## 3. `formalRef`, the results artifact, and the two derived tags (S4.3)

```ts
interface FormalRef {
  system: 'lean4-physlib' | 'other';
  statement: string;
  version: string;
  axioms: readonly string[];
  fidelity: 'two-formalizers' | 'back-translation' | 'sanity-lemmas' | 'unreviewed';
}
```

**Both tags are derived from a committed artifact, never hand-set.**
`scripts/emit-witness-results.mjs` (Lead-run, like `emit-atlas-json.mjs`) writes
`data/atlas/witness-results.json`; `tests/atlas/witness-results.test.ts` deep-equals the
committed artifact against a fresh in-process run — the `atlas-json` pattern. A test NEVER
writes the artifact; that is this sprint's load-bearing invariant, and E4 checks it by running
the atlas suite twice and confirming the tree stays clean.

- `formally-proved` iff `formalRef !== undefined && formalRef.fidelity !== 'unreviewed'`.
- `symbolically-checked` iff the artifact records `status: 'checked'` for a symbolic witness
  of that record.

`deriveEvidence` already emits `symbolically-checked` from a passing symbolic witness. That is
not a second rule: the artifact is what DEFINES which symbolic witnesses pass, so the artifact
feeds the `passingWitnessIds` argument. The tag keeps exactly one derivation.

A file allow-list test pins that the literals `'formally-proved'` and `'symbolically-checked'`
appear under `src/atlas/` only in `types.ts` and `derive-evidence.ts`. **An allow-list of
FILES, not a heuristic over initializers** — a heuristic that inspects how a tag is assigned is
defeated by assigning it a different way, and that is the defeat that matters.

**As built (S4.3).**

- **Where the symbolic witnesses come from.** `src/atlas/witness-specs.ts` holds the executable
  form of each witness the artifact covers. The first two, `W1s` (`ab-spring-lc`) and `W2s`
  (`ab-damped-rlc`), start from the PREMISE model's expression (ω0² = k/m; ζ² = b²/(4mk)) and push
  it through the bridge's dictionary with `substitute`, refusing a mapping that matches no leaf.
  The CAS then has to reduce the difference from the CONCLUSION model's expression to zero. Two
  hand-typed equal ASTs would have checked only the typist. A negative control pins that the WRONG
  dictionary (k ↔ C) does not check.
- **Stored `evidence` no longer carries `symbolically-checked`.** `ab-spring-lc` stored it by hand
  from Phase 0. It is removed and is now earned through `artifactPassingWitnessIds` → `deriveEvidence`.
  So `data/atlas/oscillators.json` loses the tag from the record, and the derived view keeps it.
  `ab-damped-rlc` now EARNS the tag (W2s) that it never had.
- **The artifact drops `elapsedMs`**, because a pin that deep-equals wall-clock time can never pass
  twice. The pin test round-trips the live run through JSON so that a ratio of `Infinity` compares
  as the `null` the file holds.
- **The emitter refuses to write when the CAS peer is absent.** An artifact emitted without the
  peer would record every symbolic witness as `peer-absent` and strip the tag from every record
  that earned it. The pin test skips its freshness check in the same state unless
  `UPT_REQUIRE_PEERS=1`.
- **The allow-list lint strips comments before it scans.** Doc comments name the tags in code
  spans, and a comment cannot set a tag. Backtick literals in CODE still match, because a
  template literal sets a tag as well as a quoted string does. Matcher controls pin every quote
  style, both comment forms, and code after a comment.
- `ALL_EVIDENCE_TAGS` moved from `coverage.ts` to `types.ts` (re-exported unchanged) so the
  tag list is not a third file that can spell a derived tag.

---

## 4. Families and counts (S4.4–S4.6)

Diffusion: Fick, heat equation, random walk. Wave: 1D wave, d'Alembert, string, sound in a
fluid. Both carry regime groups traceable to the dimension matrix (Fourier number, Péclet,
Mach) exactly as Phase 0 does — **derived through `buckinghamPi` and keyed by
`PiGroup.formula`, never hand-written**, because a hand-written group is not traceable and
`regime.ts` refuses it.

**Scope rule (carried from the plan, restated because it is the one most likely to be quietly
dropped).** ROADMAP Phase 4's exit criteria are "≥ 20 bridges" AND "≥ 5 relation types". If
measured curation cost makes 20 unreachable in the window, **the bridge count is cut here, in
writing, with the measured cost that forced it — and the relation-type criterion is not cut.**
Cutting the count silently would turn an exit criterion into a description of whatever was
finished.

**S4.6 honesty rule.** A statement with no real checked counterpart is left with NO
`formalRef` and is reported as such. Five is a target, not a quota; `fidelity: 'unreviewed'`
exists precisely so an unreviewed reference can be recorded without earning a tag, and
`formally-proved` is unreachable from it by construction.

**As built (S4.4) — the diffusion family** (`src/atlas/diffusion/`, `data/atlas/diffusion.json`).
Four models: random walk, Fick, heat, free Schrödinger. Three bridges with three relation types:

| Bridge | Relation | Witnesses (measured) |
|---|---|---|
| `ab-walk-diffusion` | coarse-graining | WD1: walk density at the origin → (4πDt)^-1/2; error 7.04e-4 → 7.05e-5 for 100 → 1000 steps (ratio 9.99). WD1b: exactly 0 outside the light cone |
| `ab-heat-diffusion` | exact-equivalence | WD2: FTCS heat solution in κ, ρ, c_p vs Fick with D = κ/(ρc_p); 4.48e-4 → 1.12e-4 for 80 → 160 cells (ratio 4.00). WD2s: CAS |
| `ab-schrodinger-diffusion` | analytic-continuation | W5 (reused), WD3: residual of ∂τφ = (ħ/2m)∂²φ, 3.27e-3 → 2.03e-4 for h 0.1 → 0.025 (ratio 16.1). WD3b: ∫φ² decays |

- **Every tolerance was set AFTER measurement** at three or more resolutions. **Every registered
  witness has a NEGATIVE CONTROL.** A control feeds the real runner one physically plausible wrong
  hypothesis, and is paired with a meta-check that the true spec checks, so the control can fail.
  A numeric wrong hypothesis is REFUTED. A CAS wrong dictionary is UNRESOLVED (not simplified to
  zero), not refuted, and earns no tag. The wrong heat dictionary D = κρ/c_p misses by 0.32 (650× the
  tolerance). The wrong Wick coefficient ħ/m leaves a residual above 0.1 however small h gets.
- **A leak removed before it landed:** the first FTCS solver took its Dirichlet edge values from
  the Fick solution with D = κ/(ρc_p). That fed the claim under test into the side meant to be
  independent of it. The edges are now 0. The true edge value is 5e-8, and the measured errors
  did not change in any printed digit.
- **Fourier number** is derived on the heat bridge (`kappa · rho^-1 · cp^-1 · ell^-2 · t`).
  **Péclet is NOT applicable:** no model has an advection velocity. That is stated as a side
  condition, and no group is invented for it.
- **Canonical references:** only `model-heat` cites one (`CE-thermal-diffusivity`, dimension-
  checked in the test). The registry has no Fick, heat-PDE, random-walk or Schrödinger entry, and
  the other models carry `[]` rather than a nearby entry that states something else. No canonical
  entry was added, so the count gate is untouched.
- **Whole-atlas gates now iterate `ATLAS_FAMILIES`** (`src/atlas/families.ts`): the evidence rule,
  admission, and the per-family JSON artifacts (`bun run atlas:json` now writes one file per
  family). A gate that named the oscillator family would have passed forever over the new one.

**As built (S4.5) — the wave family** (`src/atlas/waves/`, `data/atlas/waves.json`). The family has
six models (string, d'Alembert, linearized Euler, adiabatic EOS, sound, Klein–Gordon) and four
bridges. `model-wave-1d` is NOT redefined: two wave bridges end at the oscillator family's record,
and `tests/atlas/families.test.ts` pins that model ids are unique and that every endpoint resolves
across the atlas.

| Bridge | Relation | Witnesses (measured) |
|---|---|---|
| `ab-string-wave` | restriction | WS1: leapfrog in F, μ vs sin(πx)cos(πct); 3.46e-4 → 8.64e-5, 40 → 80 cells |
| `ab-wave-dalembert` | derivation | WS2: residual of u_tt − c²u_xx; 4.50e-3 → 1.12e-3 |
| `ab-sound-speed` | derivation, **hyperedge** (Euler + adiabatic EOS) | WS3: staggered Euler closed ONLY through the EOS slope, vs the sound model; 4.51e-4 → 1.12e-4. WS3b: Newton 290.10 vs Laplace 343.25 m/s for air |
| `ab-klein-gordon-wave` | approximation | WS4: phase velocity → c; 4.99e-3 → 1.25e-3 per doubling of k. WS4b: 41% at ω₀/(ck) = 1 |

The Klein–Gordon bound states `delta` as the EXACT phase error at the domain edge, not a series
term. The pendulum record's lesson carries over: a truncated series can sit below the error it
claims to bound. The machine horizon is the π/2-drift time.

**The "≥ 20 bridges" criterion is not cut.** The scope rule allows a cut only when "measured
curation cost makes 20 unreachable", and the measured cost (below) does not. The plan's family
briefs enumerate 5 + 3 + 4 = 12 bridges and name no others, so a shortfall against 20 comes from
SPECIFICATION, not cost. Calling it a cost cut would silently convert an exit criterion into a
description of what was finished, which the scope rule exists to prevent. The eight further
bridges are the Sprint 4 closure below.

**As built (S4.6) — formal references, and the honesty rule.**
The search covered Physlib (`leanprover-community/physlib`, formerly PhysLean/HepLean) at
`5ad56e24de155462acd8478458292347393d5908`, Lean `v4.34.0`. The method was the full tree listing
(1,327 paths), grepped for every bridge's topic, and then a READ of each candidate file.
**Axioms are MEASURED, not assumed.** I installed elan, fetched the Mathlib cache, and built the
three candidate modules locally. `#print axioms` then reports `[propext,
Classical.choice, Quot.sound]` for every statement below. A positive control, a deliberate
`sorry`, prints `[sorryAx]`, so the probe can report a hole, and it reported none.

| Bridge | Physlib counterpart | Recorded? |
|---|---|---|
| `ab-pendulum-linear` | `ClassicalMechanics.SimplePendulum.linearizedEquationOfMotion_iff` (+ `toHarmonicOscillator_ω`, `norm_equationOfMotion_residual_le`) | **YES** (`fidelity: 'sanity-lemmas'`) |
| `ab-wave-dalembert` | `ClassicalMechanics.planeWave_waveEquation` proves the CONVERSE (plane waves solve the wave equation); the bridge claims every solution has d'Alembert form | NO (partial) |
| `ab-spring-lc`, `ab-damped-rlc` | Harmonic and damped oscillators exist; no LC/RLC circuit model | NO |
| `ab-damped-massless` | Damping classification only; no `m → 0` limit | NO |
| `ab-chain-wave` | `TightBindingChain` is a QUANTUM tight-binding model, not a mass–spring chain | NO |
| diffusion ×3, `ab-string-wave`, `ab-sound-speed`, `ab-klein-gordon-wave` | No heat, diffusion, acoustics, string or Klein–Gordon module. `FluidDynamics/Euler` defines the Euler equations but not their linearization. The `Wick*` files are Wick's THEOREM (QFT), not Wick rotation | NO |

The table covers the twelve bridges searched at S4.6. The eight closure bridges were searched by
keyword against the same tree, with no counterpart. The one near-miss, `NavierStokes.lean`, proves
only conservative ↔ convective equivalence, nothing about drag on a sphere.

**What the one reference certifies, and what it does not.** It certifies the bridge's
TRANSFORMATION: the linearized pendulum IS the harmonic oscillator with mass mℓ² and spring
constant mgℓ, hence ω0² = g/ℓ, plus a cubic bound on the equation-of-motion residual. It does
NOT certify `bound.delta`. Physlib's period results (`smallAnglePeriod_le_periodFormula`,
`strictMonoOn_periodFormula`) are about `periodFormula`, which Physlib's own TODO has not yet
identified with the period of the motion. The sanity lemmas check that these results are
CONSISTENT with the record's delta (positive, strictly increasing, so the edge is the supremum),
and the reference still names only the linearization statement.
`tests/atlas/formal-sanity.test.ts` instantiates each quoted Lean statement on a known pendulum
and pins the reference's content. `formally-proved` is derived for this one record and stored on
none.

**Sprint 4 closure.** Eight witnessed bridges were added (`diffusion/bridges-closure.ts`, `waves/bridges-closure.ts`, and new models `model-langevin`,
`model-stokes-drag`, `model-telegraph`, `model-laplace-1d` and `model-stiff-string`):

| Bridge | Relation | Witness (measured) |
|---|---|---|
| `ab-langevin-diffusion` | coarse-graining (Einstein D = k_BT/γ) | WD4: RK4 of the Langevin moment equations; ⟨x²⟩/(2Dt) − 1 goes 0.1000 → 0.0100 for t 10 → 100 τ_p. It matches the closed Ornstein–Uhlenbeck form to 1e-10 |
| `ab-stokes-einstein` | derivation, **hyperedge** (Langevin + Stokes drag) | WD5s (CAS); WD5: CE-stokes-einstein up to exactly its omitted 6π; D = 4.29e-13 m²/s for a sphere of radius 0.5 µm (1 µm diameter) in water at 293.15 K |
| `ab-telegraph-diffusion` | approximation, **singular** τ → 0 | WD6: 0.0557 → 0.0263 per halving of τ; the machine horizon has a LOWER edge (the initial layer) |
| `ab-telegraph-wave` | approximation (ε ≥ 25, t < 2τ ln(10/9)) | WD7: 5.01e-3 → 2.50e-3 |
| `ab-heat-laplace` | restriction (steady state, Fo ≥ 1) | WD8: deviation from the linear profile 0.139 → 0.0193 for Fo 0.2 → 0.4 |
| `ab-kg-schrodinger` | approximation (non-relativistic, ck/ω₀ ≤ 0.1), crosses to diffusion | WS5: 2.49e-3 → 6.24e-4 |
| `ab-kg-oscillator` | restriction (uniform mode), crosses to oscillators | WS6: the full PDE with uniform data vs cos(ω₀t); 1.00e-3 → 2.51e-4 |
| `ab-stiff-string` | approximation (EIk²/F ≤ 0.01) | WS7: 0.499 → 0.125 |

Every `delta` is the exact error at its domain edge. `tests/atlas/closure.test.ts` pins that
each error function is monotone on its domain, so the edge value IS the supremum. The Phase 0
pilot keeps its five bridges: RLC → LC was considered and moved out to avoid re-scoping a
delivered pilot, and the stiff-string limit replaced it.

**ROADMAP Phase 4 exit criteria, and how each is checked:**

| Criterion | How it is checked |
|---|---|
| ≥ 20 bridges across ≥ 5 relation types, each with a witness | pinned in `tests/atlas/families.test.ts` |
| ≥ 5 with a reviewed `formalRef` | a real counterpart must exist (the S4.6 table). The out-of-tree repository is PhysJS. The schedule and the PhysLean require are [`docs/design/roadmap-lean-proven-bridges.md`](../design/roadmap-lean-proven-bridges.md) and `MEMORY.md`. The honesty rule is unchanged: no `formalRef` without a real statement |
| zero `formally-proved` without a `formalRef` | by construction: the tag is derived only, and a file allow-list lint forbids setting it |
| curation cost per bridge by type, compared with Phase 0 | measured below |

**Curation cost, measured as wall-clock per batch (NOT per bridge; the same instrumentation gap
Phase 0 reported):** S4.4 took 18 min for 3 bridges (coarse-graining, exact-equivalence,
analytic-continuation). S4.5 took about 20 min for 4 (restriction, derivation ×2,
approximation). The closure took 16 min for 8 (coarse-graining, derivation, approximation ×4,
restriction ×2). Those batches average about 2–6 minutes per bridge, including witness design,
measurement at three or more resolutions and tests. **As in Phase 0,
relation type did not visibly drive cost. Measurement discipline did:** each batch's slowest
step was measuring a witness before writing its tolerance. The one tolerance written first
(the S4.6 sanity lemma) failed. Per-bridge cost by type requires per-bridge timing.
