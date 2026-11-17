# Atlas Phase 0 — design note (oscillator pilot)

**Executes:** [`Atlas-Roadmap-Implementation-Plan.md`](Atlas-Roadmap-Implementation-Plan.md)
Sprint 0, itself executing [`ROADMAP.md`](../../ROADMAP.md) Phase 0.
**Baseline:** `universal-physics-tensor@0.45.2`, `master` at `58f1023`, suite ≈ 3,700 across ~353 files.
Authorized by the Sprint 0 line in
[`ACTIVE.md`](../../ACTIVE.md). Entry condition for Wave 1 is Adam returning GREEN, or a YELLOW whose
items are resolved here.
**Target:** v0.46.

This note fixes six things the plan requires the Lead to fix before any brief is dispatched: the
module layout, the type set, the model registry with every bridge endpoint, the throwaway-types
decision, the curation-cost log, and the witness table with its numeric expectations.

---

## 1. Module layout

Everything lands under `src/atlas/`. The Phase 0 pilot adds no root export: the symbols it
introduces are `@internal`, and it re-exports nothing from `src/index.ts`. The
`universal-physics-tensor/atlas` subpath stays the internal surface. Phase 6's API review
([`Atlas-API-Review.md`](Atlas-API-Review.md)) promotes Tier 1 as the `atlas` namespace from
`src/atlas/public.ts`, re-exported from `src/index.ts`. That namespace is the later public
surface.

```
src/atlas/
  types.ts                      §2, verbatim
  error-algebra.ts              composeBounds, IDENTITY_BOUND, composeBoundPath
  regime.ts                     deriveRegimeGroups, regimeHolds
  index.ts                      @internal barrel
  oscillators/
    dimensions.ts               SPRING_CONSTANT, INDUCTANCE, CAPACITANCE, DAMPING, CUBIC_STIFFNESS
    models.ts                   the nine models of §3
    bridges-exact.ts            BRIDGE_SPRING_LC, BRIDGE_DAMPED_RLC
    bridges-limits.ts           ab-pendulum-linear, ab-damped-massless
    bridges-coarse.ts           ab-chain-wave
    rejections.ts               ax-cubic-spring-lc
    index.ts                    assembly (the plan's name is family.ts; the tree uses index.ts)
  witnesses/
    quantum-support.ts          chirpedGaussianUncertaintyProduct, wickRotatedSchrodingerCoefficients
tests/atlas/                    _ode.ts + one test file per brief
tests/fixtures/atlas/           fixture dir, guarded like the probe's
data/schemas/atlas-record.v0.json   draft-07, DOCUMENTATION only (no validator in the tree)
```

**Three layout constraints that are not stylistic.**

1. `src/bridges/index.ts` and `src/composition/edge.ts` may import atlas **types only**, and only
   from `src/atlas/types.ts` — never from the `src/atlas/index.ts` barrel. `src/atlas/` imports
   `bridges/*` and `composition/*`, so a barrel import closes a cycle that `bun run docs:deps`
   reports.
2. Nothing under `src/` may reference `fixtures/atlas` together with `scorer`. The existing
   `tests/composition/probe/import-graph.test.ts` guard is extended, not copied loosely.
3. The pilot adds no `@public` tag and no root export. A `@public` atlas symbol is Tier 1 in
   [`Atlas-API-Review.md`](Atlas-API-Review.md): the `atlas` namespace from `src/atlas/public.ts`,
   re-exported from `src/index.ts`. That namespace does not violate the pilot's boundary.

---

## 2. Type set

Fixed as written in the implementation plan §"S0 types". The W1 agent implements it **verbatim**
or reports why not; a deviation is a report, never a silent edit. Summarised here so the note is
self-contained; the plan's block is normative if the two ever differ.

- `RelationType` — eight members: `derivation`, `exact-equivalence`, `restriction`,
  `approximation`, `coarse-graining`, `analytic-continuation`, `structural-analogy`,
  `deformation-quantization`.
- `EvidenceTag` — ten members, from `proposed` through `contradicted` and `unresolved`.
- `LimitCharacter` — `regular` | `singular` | `unknown`.
- `RegimeInequality` / `Regime` — a regime coordinate is either a π-group keyed by
  `PiGroup.formula`, or a dimensionless **input** of the model declared with the zero dimension.
  Derived quantities such as ζ are **not** groups: the inequality is written on the group
  (`m k / b² > 1/4`) and ζ appears only in `alias`, for display.
- `ApproximationBound` — `K`, `delta`, `norm`, `domain`, and **both** a prose `horizon` and a
  machine `horizonHolds(t, params)`. Both are mandatory.
- `Witness`, `AtlasModel`, `Counterexample`, `AtlasBridge`, `AtlasRejection`.
- `MissingHorizonError`, `MissingLipschitzError`.

**Name collision checked, not assumed.** `src/composition/bridge-prediction.ts` has a
module-local, unexported `interface Regime` for tensor-cell placement. Different concept, not
exported, no import collision. The probe's `RelationKind` and `AuditState` are **not** shadowed:
this sprint uses `RelationType` and defines no `AuditState`.

---

## 3. Model registry and bridge endpoints

Nine models. `canonicalRefs` must resolve against `CANONICAL_EQUATIONS`; a ref that does not
resolve is a test failure, not a warning.

| Model id | Dynamics | `canonicalRefs` |
|---|---|---|
| `model-spring` | `m x'' + k x = 0` | `CE-simple-harmonic-frequency`, `CE-spring-potential-energy`, `CE-oscillator-energy` |
| `model-lc` | `L q'' + q/C = 0` | `CE-lc-resonance` |
| `model-damped-spring` | `m x'' + b x' + k x = 0` | — |
| `model-rlc` | `L q'' + R q' + q/C = 0` | — |
| `model-pendulum` | `θ'' + (g/ℓ) sin θ = 0` | — |
| `model-chain` | `m u_n'' = κ(u_{n+1} − 2u_n + u_{n−1})` | — |
| `model-wave-1d` | `u_tt = c² u_xx` | `CE-wave-speed` |
| `model-cubic-spring` | `m x'' + k x + β x³ = 0` | — |
| `model-first-order` | `b x' + k x = 0` (the `m → 0` reduced model) | — |

**Bridge endpoints — premises → conclusion.**

| Bridge id | Relation | Premises | Conclusion |
|---|---|---|---|
| `ab-spring-lc` | `exact-equivalence` | `['model-spring']` | `model-lc` |
| `ab-damped-rlc` | `exact-equivalence` (side condition) | `['model-damped-spring']` | `model-rlc` |
| `ab-pendulum-linear` | `approximation` | `['model-pendulum']` | `model-spring` |
| `ab-damped-massless` | `approximation` (singular) | `['model-damped-spring']` | `model-first-order` |
| `ab-chain-wave` | `coarse-graining` | `['model-chain']` | `model-wave-1d` |
| `ax-cubic-spring-lc` | **rejection**, claimed `exact-equivalence` | `['model-cubic-spring']` | `model-lc` |

**Composition.** Exact equivalences are treated as bidirectional by the path finder, so the
two-hop path `model-pendulum → model-spring → model-lc` exists. It composes as
`approximation ∘ exact-equivalence = approximation` with the pendulum bridge's bound `(1, δ)`, where
`δ` is the exact period error at the θ0 = 0.5 edge, not the series `θ0²/16`. An exact edge
contributes the identity bound **in the norms these Phase 0 bridges state**, so the composite's
norm is the approximation edge's, and `IDENTITY_BOUND` needs no norm reconciliation step here.

⚠ **Narrowed after Adam's YELLOW (a) — see §9.** The plan's phrasing was "the identity bound in
every norm", which is too strong as a universal claim: an equivalence can be an isometry in one
norm and not in another. It holds for Phase 0 because both exact equivalences are variable
rescalings between linear systems, under which the relative norms these bridges use are preserved.
Phase 1 must either carry a norm on each bound and check compatibility at composition, or state
the isometry assumption explicitly.

---

## 4. Pilot types are throwaway

**Decision, fixed here so no later sprint has to litigate it.** Every type in `src/atlas/types.ts`
is a Phase 0 pilot type. If Phase 1's relation-contract work disagrees with any of them, the
Phase 0 type is **replaced, not adapted**. There is no migration obligation, no deprecation
window, and no back-compat shim, because the pilot adds no public root export and the only
consumers are Phase 0's own tests. What Phase 6 puts on `src/index.ts` is the Tier 1 `atlas`
namespace in [`Atlas-API-Review.md`](Atlas-API-Review.md).

The point of the pilot is to **measure what these types cost to curate** (§5), not to ship them.
A type that survives Phase 1 survives on merit, not on the cost of changing it.

Two existing-type invariants are absolute regardless: `BridgeEquationStatus`, `EdgeConfidence`,
`EpistemicStatus`, `VettedCandidate` and `AdjudicationVerdict` are never replaced or adapted into
one another, and the overlay never changes a row's `status` — BE-37 and BE-48 stay `speculative`.

---

## 5. Curation-cost log

The measurable output of the pilot. One row per bridge, written at wrap by the Lead into
`docs/planning/Atlas-Phase-0-Curation-Cost.md`:

| Column | Meaning |
|---|---|
| `bridge` | bridge id |
| `relation` | `RelationType` — the variable the pilot exists to measure cost against |
| `hours_authoring` | Lead + implementer time to produce the record and its witnesses |
| `hours_review` | Adam + Eve + Lead verification time attributable to this bridge |
| `witness_count` | number of witnesses in the closed list belonging to this bridge |
| `witnesses_unresolved` | witnesses reported `unresolved` rather than passing |

**Honesty rule for this table.** Hours are recorded as measured wall-clock attributable to the
bridge, not estimated afterwards from memory. A bridge whose cost cannot be separated from
another's is recorded as a shared row with both ids and said so — a fabricated split would make
the one number this sprint exists to produce useless.

---

## 6. Witness table

Fifteen witnesses, closed list. **Numeric expectations as corrected in revision 2** of the plan.
A tolerance may be tightened by an implementer, never loosened (plan §0.2 rule 9); a stated
expectation that cannot be met is reported `unresolved` with the measured value, and the **Lead**
re-derives — not the agent.

| Witness | Bridge / target | Kind | Expectation |
|---|---|---|---|
| **W1** | `ab-spring-lc` | symbolic | With `u = x/x0`, `τ = ω0 t`, `ω0² = k/m`: coefficient of `u` after dividing by `k x0` is **exactly 1**, by rational arithmetic, not floating point. Same for LC with `ω0² = 1/(LC)`. |
| **W1a** | `ab-spring-lc` | numeric | Spring `(m=2, k=8)` and LC `(L=0.5, C=0.25)` from `u(0)=1, u'(0)=0`, compared at `τ ∈ {π/2, π, 3π/2, 2π}`: `abs(u_spring − u_lc) < 1e-8`, and both within `1e-8` of `cos τ`. |
| **W1b** | `ab-spring-lc` | numeric | Inverse maps `x = x0 u`, `t = τ/ω0` round-trip within `1e-12`; initial conditions map as `x'(0) = x0 ω0 u'(0)`. |
| **W2** | `ab-damped-rlc` | numeric | `m=1, k=4, b=1` gives `ζ_mech = 0.25`; `L=2, C=0.125` gives `√(C/L) = 0.25`. The side condition then **requires R = 2**. Both nondimensionalize to `u'' + 0.5 u' + u = 0`; agreement within `1e-8` at four τ. **R is derived in the test from the side condition and asserted to equal 2 — never hard-coded.** |
| **W2b** | counterexample on `ab-spring-lc` | numeric | Same `L, C` with **R = 4** gives `ζ_RLC = 0.5 ≠ 0.25`; trajectories differ by more than `1e-2` at `τ = π`. Registered as a counterexample on **bridge 1**, not bridge 2. |
| **W3** | `ax-cubic-spring-lc` | symbolic | `buckinghamPi` over `{m, k, β, x0}` with `β` = `M L⁻² T⁻²` yields exactly one group, exponents proportional to `{β: 1, x0: 2, k: −1, m: 0}`. The LC set `{L, C, q0}` admits **no** group: assert `verdict === 'dimensionally-independent'`, **not** a count. |
| **W4** | `quantum-support.ts` | numeric | `chirpedGaussianUncertaintyProduct`: exactly `ħ/2` at `α = 0`; `(ħ/2)√5 = 1.1180…` at `s = 1, α = 0.5`. Quadrature cross-check on `ψ = N exp(−x²/4s² + iαx²)`, `x ∈ [−12s, 12s]`, 4001 points: `σx = s` to rel `1e-6`, `σp` to rel `1e-6` (measured truth ≈ 2e-15 at this grid). |
| **W5** | Wick rotation | numeric | Heat-kernel evolution, `ħ = m = s = 1`, `τ = 0.3`, `x ∈ [−8, 8]`, 2001 points, second-order central differences: **`sup abs(∂τφ − (ħ/2m)∂xxφ) / sup abs(∂τφ) < 1e-4`** (truth ≈ 7e-6). A **sup-norm ratio** is the stated norm because a pointwise relative norm is undefined at the zeros of `∂τφ`. |
| **W6** | `error-algebra.ts` | symbolic | Associativity on a triple whose two bracketings differ from the reversed order, so the test proves associativity and **not** commutativity: with `∘` = outer-after-inner, `(2,1)∘((3,2)∘(5,7)) = ((2,1)∘(3,2))∘(5,7) = (30, 47)`, while reversed `(5,7)∘((3,2)∘(2,1)) = (30, 17)`. Identity on both sides; `[b1, null, b2]` throws `MissingLipschitzError`; `[b1, b2, null]` returns `{ bound: b2∘b1, terminal: true }`; folding `(2, 0.1)` ten times gives `K = 1024`. |
| **W7** | `ab-pendulum-linear` | numeric | Exact period by AGM, `K(k) = π / (2·AGM(1, √(1−k²)))`. At `θ0 = 0.2`: `T/T0 − 1 ∈ [0.002505, 0.002507]` (truth 0.0025057) and residual `(T/T0 − 1) − θ0²/16 ∈ [5.70e-6, 5.76e-6]` (truth 5.744e-6; next series term `11θ0⁴/3072 = 5.729e-6`). |
| **W7b** | `ab-pendulum-linear` | numeric | Phase drift per cycle `2π·(T/T0 − 1)`; cycle count at which drift reaches `π/2` lies in `[99, 101]` (truth 99.77) at `θ0 = 0.2`. `horizonHolds(200·T0, …)` is **false**; `horizonHolds(10·T0, …)` is **true**. |
| **W7c** | `ab-pendulum-linear` | numeric | RK4 cross-check, `100 T0` at 20,000 steps per `T0` (2×10⁶ steps). Lag of the pendulum zero crossing nearest `100 T0` against the linear grid `t = (n + ½)T0/2`, in degrees: within **0.05°** of the elliptic prediction `360°·(100 − 100 T0/T)` = **89.98°**. RK4 global phase error at this step is ~1e-10 rad, so this tests the physics, not the integrator. |
| **W8** | `ab-damped-massless` | numeric | `k=1, b=1`, `m ∈ {1e-1, 1e-2, 1e-3}`: `abs(r_slow + k/b) < 2m` (truth 0.127, 0.0102, 0.0010 vs bounds 0.2, 0.02, 0.002) and `abs(r_fast·m + b) < 2m`. |
| **W8b** | `ab-damped-massless` | numeric | **The lost initial condition shows in the VELOCITY, not the position.** `m = 1e-3, k = b = 1`, `x(0)=1, x'(0)=v0`, `v0 ∈ {0, 5}`. Position, `t ≥ 5m/b`: `abs(x_full − x_red) < 2(1+v0)·m` (truth 9.9e-4, 5.9e-3 vs bounds 2e-3, 1.2e-2) — an `O((1+v0)m)` offset that does **not** vanish. Velocity: at `t = 0.5 m/b`, `v0 = 5`, `abs(x'_full − x'_red) > 1` (truth 3.6); at `t = 5 m/b`, `< 0.05` (truth 0.034). Boundary layer thickness `~m/b`. |
| **W9** | `ab-chain-wave` | numeric | Lattice `ω(q) = 2√(κ/m)·abs(sin(qa/2))`, continuum `ω = c q`, `c² = κa²/m`. For `κ = m = a = 1`, `qa ∈ {0.1, 0.2, 0.4, 0.632, 0.8, 0.95, 0.999}` (the declared regime is `qa < 1`): relative error `1 − ω_lattice/ω_cont` equals `(qa)²/24` **within `(qa)²/80` of itself**. The relative deviation is `−(qa)²/80 + (qa)⁴/13440 − …`, an alternating series, so its magnitude stays at or below `(qa)²/80`; a flat 0.5% bound fails for `qa > 0.634`. Band edge at `qa = π` has `ω = 2√(κ/m)`; the continuum has no band edge — that is the information-loss witness. |

**Provenance of the list.** Ids `1–9` with suffixes are Blueprint v2 §6 check ids. `W6` is the
Blueprint's "check 6" (associativity, §4.3). **`W7c` is added by this plan**, because the
Blueprint's `verify_pilot.py` is not in hand and its fifteenth check is unidentified — so `W7c`
is ours and is labelled as ours rather than attributed to the Blueprint.

---

## 7. Evidence-tag rule

An evidence tag is carried on a bridge **only if the witness that supports it passes in that
bridge's own test file**. `evidence` is a `ReadonlySet<EvidenceTag>` on the atlas record.

This is deliberately the opposite of the catalog's rule for `evidenceTags`, and the difference
matters: on `BridgeEquationEntry` / `BridgeEdge`, derived data is **never** stored on the row
(`deriveEvidenceTags` computes it) because a `ReadonlySet` serializes as `{}` and would break
`catalog-json.test.ts`'s deep-equal pin. The atlas record is a **separate projection** with its
own emitter, so it may hold the set — and `emit-atlas-json.mjs` must serialize it explicitly, not
rely on `JSON.stringify` of a `Set`.

---

## 8. What this note does not decide

Left open deliberately, to be fixed by the briefs or by the Lead at the wave boundary:

- Exact `dim(...)` argument lists for `SPRING_CONSTANT`, `INDUCTANCE`, `CAPACITANCE` — these are
  module-local in the canonical entry files and **not importable**, so S0.1 must redefine them
  identically from the Scout's quoted source lines. The note does not restate them, because a
  restatement is a second source of truth that can drift from the entries.
- Whether `buckinghamPi` returns a trivial group for an all-zero dimension or drops it. `regime.ts`
  is specified to key dimensionless inputs by name either way, but the test shape depends on the
  answer. Scout brief SC0 question 1 resolves it.
- Whether a new `exports["./atlas"]` subpath whose `dist/` target does not yet exist breaks any of
  the four readers of the `exports` map. `bun run package:check` is **expected red** between S0.2
  landing and the W1 boundary; the Lead verifies it green at the boundary rather than letting an
  implementer "fix" it inside its own wave.

---

## 9. Adam vet A0 — verdict and resolutions

**Reviewer:** Adam (Gemini 2.5 Pro), 2026-09-20, adversarial, with the models and all five
numeric claims inlined and an explicit instruction to recompute rather than accept.

**Verdict: 1 RED, 3 YELLOW, the rest GREEN. The RED is resolved below; Wave 1 is unblocked.**

Adam independently recomputed and **confirmed correct**: the pendulum period ratio
`T/T0 - 1 = 0.00250574` at `theta0 = 0.2` and its residual `5.74e-6` with the next series term
`11*theta0^4/3072 = 5.729e-6`; the RLC side condition requiring `R = 2`, including that **both**
systems nondimensionalize to `u'' + 0.5u' + u = 0` (he did the time rescaling `tau = omega0 t` for
each); the `R = 4` counterexample giving `zeta = 0.5`; the chirped-Gaussian factor **16**, derived
from `psi ~ exp(-Ax^2)` with `A = 1/(4s^2) - i*alpha`, giving `sigma_x = s` and
`sigma_p = (hbar/2s) sqrt(1 + 16 alpha^2 s^4)`; the W8b velocity truths `3.6` and `0.034` from the
fast mode `-(1+v0)exp(-t b/m)`; the chain's leading coefficient `(qa)^2/24`; the zeta equivalence;
and both Buckingham claims, including that `{L, C, q0}` has rank 3 and therefore **zero** groups.

### RED — W6 reversed-order value was arithmetically wrong (RESOLVED)

Plan revision 2 stated `(5,7) o ((3,2) o (2,1)) = (30, 17)`. That is wrong.
Inner `(3,2) o (2,1)` = `(6, 5)`; then `(5,7) o (6,5)` = `K = 5*6 = 30`,
`delta = 5*5 + 7 = **32**`.

**I verified this by executing the composition rule rather than re-reading it**, and also confirmed
both bracketings give `(30, 47)` and that folding `(2, 0.1)` ten times gives `K = 1024`. The plan
document is corrected in place with the arithmetic shown.

The witness's **purpose** survived the error - the test proves associativity by showing both
bracketings agree while the reversed order differs, and `(30, 32)` differs from `(30, 47)` just as
`(30, 17)` would have. But an implementer following §0.2 rule 1 ("never trust an inline snippet
over the source") would still have written a false assertion, because here the plan *was* the
source. **W6 asserts `(30, 32)`.**

### YELLOW (a) — "identity bound in every norm" hides an isometry assumption (RESOLVED, narrowed)

Adam is right in general: an equivalence can be an isometry in one norm and not another, so
"contributes the identity bound in every norm" is too strong as a universal claim.

**Resolution, scoped to Phase 0.** The two exact equivalences here are variable rescalings
(`u = x/x0`, `tau = omega0 t`) between linear systems, under which the *relative* norms used by
these bridges are genuinely preserved. Phase 0 therefore keeps `IDENTITY_BOUND = {K: 1, delta: 0}`,
but the claim in this note is narrowed to: **an exact equivalence contributes the identity bound in
the norms these Phase 0 bridges state**, not in every norm. Phase 1's relation-contract work must
either carry a norm on each bound and check compatibility at composition, or state the isometry
assumption explicitly. Recorded as a Phase 1 input rather than silently generalised.

### YELLOW (3) — sign convention on the chain's next-order deviation (RESOLVED, convention fixed)

Adam computed `+(qa)^2/80` where the plan writes `-(qa)^2/80`, and the three magnitudes
(1.3e-4, 5.0e-4, 2.0e-3) follow from the positive form under his convention.

This is a **convention collision, not an arithmetic error**. `1 - sin(x)/x = x^2/6 - x^4/120`, so
the approximation `(qa)^2/24` **overestimates** the true error. Under `(Approx - True)/Approx` the
deviation is `+(qa)^2/80`; under `(True - Approx)/Approx` it is `-(qa)^2/80`. The plan uses the
latter. Both give the same magnitudes, and **W9 asserts a magnitude** ("equals `(qa)^2/24` within
0.5% of itself"), so no test changes.

**Resolution:** the convention is stated here so no implementer has to guess -
**deviation = (True - Approx) / Approx, hence negative**. Adam's `1.25e-4` for `qa = 0.1` versus
the plan's `1.3e-4` is rounding, not disagreement.

### YELLOW (5) — "non-vanishing" was imprecise (RESOLVED, reworded)

Adam is right that `x_full - x_red` does go to zero as `t -> infinity`, on the slow scale `b/k`.
Calling the offset "non-vanishing" reads as a permanent constant offset, which it is not.

**Resolution.** The precise statement, which replaces "does not vanish" wherever it appears in
Phase 0 prose: the position difference is an **`O((1+v0) m)` deviation that persists throughout the
outer region and decays only on the slow time scale** - it is the matched-asymptotics correction,
not a transient of the boundary layer, and it is **not** removed by waiting out the fast mode. That
is the property W8b tests, and it is why the witness is stated at `t >= 5m/b` rather than as a
limit.

---

## 10. SC0 pre-flight answers (measured by the Lead, not delegated)

The Scout agent went idle without returning its report, and three of its answers blocked Wave 1.
Rather than wait on another probe round, the Lead ran the reconnaissance directly - it was
read-only source reading, and the blocking subset is short. Recorded here because implementer
briefs cite these facts, and a brief citing an unverified fact is the failure mode §0.2 rule 1
exists to stop.

### Q2 — the module-local dimension constants (BLOCKING, resolved)

Quoted from source; S0.1 must redefine these **identically** because they are not importable.

```
src/canonical/entries/electromagnetism.ts:42   const CAPACITANCE = dim(-2, -1, 4, 2);  // farad [L^-2 M^-1 T^4 I^2]
src/canonical/entries/electromagnetism.ts:43   const INDUCTANCE  = dim(2, 1, -2, -2);  // henry [L^2 M T^-2 I^-2]
src/canonical/entries/mechanics.ts:35          const SPRING_CONSTANT = dim(0, 1, -2);  // [M T^-2]
src/canonical/entries/fluids-waves.ts:48       const SPRING_CONSTANT = dim(0, 1, -2);  // N/m [M T^-2]
```

**Not in the plan, found while checking: `SPRING_CONSTANT` is defined TWICE**, in `mechanics.ts`
and again in `fluids-waves.ts`, with identical arguments. Harmless while the values agree,
but it is two sources of truth for one dimension and it is exactly the drift this workspace keeps
producing. S0.1 redefines it once under `src/atlas/oscillators/dimensions.ts` and its test asserts
agreement with **both** entry-file definitions, so a future divergence fails a test instead of
silently picking one.

### Q1 — zero-dimension variables in `buckinghamPi` (BLOCKING, resolved by EXECUTION)

Answered by running the function, not by reading the null-space code:

```
{m, b, k}            -> piGroupCount 1, verdict 'single-invariant',
                        exponents {m: 1, b: -2, k: 1}, formula "m · b^-2 · k"
{m, b, k, theta0}    -> piGroupCount 2, verdict 'multiple-invariants', rank 2,
                        groups: {m:1, b:-2, k:1, theta0:0}  formula "m · b^-2 · k"
                                {m:0, b:0, k:0, theta0:1}   formula "theta0"
```

**`buckinghamPi` DOES return a trivial group for an all-zero-dimension variable, keyed by the
variable's own name in `formula`.** It does not drop it.

This confirms the plan's expected exponents for `{m, b, k}` — `{m: 1, k: 1, b: -2}` — and
`PiGroup.exponents` is keyed by **variable name**, not index.

**⚠ PLAN DEFECT this exposes, and S0.1's brief must carry the correction.** Plan S0.1 task 4
specifies `deriveRegimeGroups` as "π-groups from `buckinghamPi` over the dimensioned parameters,
**plus one trivial group per dimensionless input keyed by its name**". If the dimensionless inputs
are passed into `buckinghamPi`, that second step **double-adds** the group. Two consequences:

1. `deriveRegimeGroups` passes dimensionless inputs **into** `buckinghamPi` and keys every group by
   `PiGroup.formula`, synthesizing nothing. The trivial group's `formula` is already the input's
   name (`"theta0"`), so the plan's intended key is what you get for free.
2. A test asserting `verdict === 'single-invariant'` for a parameter set that includes a
   dimensionless input will FAIL — the verdict becomes `'multiple-invariants'`. The plan's W3
   assertion for the LC set is unaffected (it asserts `'dimensionally-independent'` on
   `{L, C, q0}`, all dimensioned).

### Q3-Q7 — not blocking, deferred to the wave boundary

`PiGroup` / `BuckinghamResult` / `BuckinghamVerdict` shapes are confirmed at
`src/dimensional/buckingham.ts:34-68`; `buckinghamPi` at `:268`, `dimensionallyDetermines` at
`:326`. The remaining Scout questions — the `D(...)` fixture, `integrateRK4`'s exact signature, the
four `exports` readers, the import-graph guard text, and the `catalog-json` pin — do not block S0.1
and are pre-execution-gate items **inside** S0.2's own brief, where the implementing agent reads
them from source anyway. They are not restated here, because a restatement the agent does not read
is a third source of truth.

---

## 11. Eve cross-check E0-pre — independent second opinion on the design numbers

**Reviewer:** Eve (OpenAI o3), 2026-09-20, given the same claims as Adam and **deliberately not
told what Adam concluded**, so the two are independent rather than anchored.

**Why this ran at all, out of sequence.** The plan puts Eve *after* the last wave, as
post-implementation value-level verification, so by the schedule she was not due. But Adam's
confirmations were a **single signal** on numbers already baked into this note and into two live
implementer briefs, and the house law is never to assert from one signal. If Adam were wrong, agents
would be writing tests that assert wrong values right now. So the cross-check ran early, on the
design numbers only. Eve's scheduled post-implementation role is unchanged.

**Result: Eve independently CONFIRMED 20 of 21 claims**, including - importantly - the corrected
error-algebra value `(5,7) o ((3,2) o (2,1)) = (30, 32)`. That correction now has **two independent
models plus an executed implementation** agreeing against the plan's original `(30, 17)`.

Also independently confirmed by both reviewers: `R = 2` and both nondimensionalizations to
`u'' + 0.5u' + u = 0`; the chirped-Gaussian factor **16** with `sigma_p = hbar|A|^2/Re(A)` giving
`sigma_x sigma_p = (hbar/2) sqrt(1 + 16 alpha^2 s^4)`; the chain's `(qa)^2/24` and the `(qa)^2/80`
deviation *with its sign convention stated*; the W8b numbers from the exact two-root solution
(`A = (999+v0)/998`, `B = -(1+v0)/998`, giving 9.90e-4, 5.93e-3, 3.64, 0.0346); both Buckingham
claims; and the `zeta < 1` equivalence.

### The one disagreement — and Eve is WRONG (resolved by direct computation)

Eve returned **WRONG** on W7's residual, claiming the true value is `5.726e-6` rather than the
stated `5.744e-6`.

I did not take either reviewer's word. Computed directly with AGM, as the witness specifies:

```
k         = sin(0.1)        = 0.09983341664682815
K(k)      = pi/(2 AGM(1, sqrt(1-k^2)))
          = 1.574732340625072
T/T0 - 1  = 0.002505744229           in [0.002505, 0.002507]      OK
RESIDUAL  = 5.744229e-6              in [5.70e-6, 5.76e-6]        OK
next term = 11*theta0^4/3072 = 5.729167e-6
residual - next term = 1.506e-8      (the following series term)
```

**The stated `5.744e-6` is correct. Eve's `5.726e-6` is not.**

**The cause is identifiable and worth recording, because it is a method error rather than an
arithmetic slip.** Eve computed `K(k)` from a four-term hypergeometric series
`K = (pi/2)[1 + k^2/4 + 9k^4/64 + 25k^6/256 + ...]` and obtained `K = 1.575079505`. The AGM value is
`1.574732341`. Her truncation is wrong in the fourth decimal, and that error propagates straight
into a residual that is itself a fourth-significant-figure quantity. **The witness specifies AGM for
exactly this reason**, and W7's brief must keep specifying it - a series-truncated `K` does not have
the precision this residual needs.

Note also that Eve's own value still falls *inside* the asserted window `[5.70e-6, 5.76e-6]`, so the
test would have passed either way. The disagreement was only ever about the stated truth, not about
whether the assertion holds - which is precisely why it would have gone unnoticed without a second
reviewer, and why the window is the right thing to assert rather than a bare equality.

### Standing value of this cross-check

Two reviewers disagreed on one number out of twenty-one; the disagreement was resolved by a third,
direct computation rather than by preferring a model; and the outlier turned out to be explained by
a documented method choice. That is the cross-check working as intended, and it is the reason the
early run was worth doing even though Eve turned out to be the one in error.

---

## 12. Eve verification E0 — post-implementation pass

**Reviewer:** Eve (OpenAI o3), 2026-09-20, after waves 1-3 landed. Items 1-6 of the plan's E0
brief, recomputed from first principles, plus the design question.

**Result: every numeric item CONFIRMED. Eve stated she expected to find an error and found none in
the numbers.**

She used the AGM this time and obtained `K = 1.5747323405` against my `1.574732340625072` - the
brief carried an explicit warning about the four-term-series failure that made the *pre*-pass
reviewer wrong, and it worked. Confirmed: `T/T0 - 1 = 0.00250574`; residual `5.7403e-6` (mine:
`5.744229e-6`, both inside the asserted `[5.70e-6, 5.76e-6]`, differing only in hand-arithmetic
precision); next term `5.72917e-6`; `N = 99.7709` cycles to a 90-degree drift; `89.981` degrees of
lag after `100 T0`; `zeta_mech = 0.25`, `R = 2`, `zeta_RLC(R=4) = 0.5`, both systems reducing to
`u'' + 0.5u' + u = 0`; the chain's `(qa)^2/24` leading term with the next-order deviation
**negative** under the stated convention and the band edge at `2 sqrt(kappa/m)`; the chirped
Gaussian at `(hbar/2) sqrt(5)`; and the singular-limit roots, offsets (`9.92e-4`, `5.98e-3`) and
velocity jumps (`3.64`, `0.0332`).

### Item 7 — Eve challenges the TYPE of `ab-spring-lc`, and she has a point

Her argument: the two ODEs are isomorphic only after a parameter dictionary
(`m <-> L`, `k <-> 1/C`, `x <-> q`) that is **not unique** - an overall scale can be absorbed into
`x <-> q` - and dimensions change across the map. So `exact-equivalence` overstates it; she proposes
"scaled dynamical isomorphism" or "lossless linear analogy". She also suggests `preserves[]` is
missing **linearity**, **time-reversal symmetry** and **Hamiltonian structure**, and that
`doesNotPreserve[]` omits **parameter dimensions**.

**What I did with it, and why I did not simply apply it.**

1. **The three `preserves[]` additions are REFUSED, on this project's own rule.** E0 item 9 requires
   that every `preserves[]` entry be defended by a witness or a side condition. There is no witness
   for linearity, time-reversal symmetry or Hamiltonian structure in Sprint 0. Adding them would
   make the record *look* more complete while being precisely the unbacked-claim theatre that the
   same Eve brief hunts - and that I removed from `citations[]` earlier the same evening. A
   suggestion from a reviewer is not a witness. If Phase 1 wants them, it writes the witnesses
   first.
2. **The type question is recorded as a PHASE 1 INPUT, not patched now.** `RelationType` is a fixed
   eight-member union in the pilot type set; "scaled isomorphism" is not one of its members, and
   inventing a ninth member in Phase 0 to satisfy one review would contradict §4, which fixes that
   pilot types are **replaced, not adapted**, if Phase 1 disagrees. Eve disagreeing with the type is
   exactly the signal §4 was written to collect.
3. **`doesNotPreserve[]` already carries `units`**, which covers the dimensional half of her point
   in substance if not in wording. Not worth a same-sprint edit; noted for Phase 1.

**Standing value.** The pre-implementation reviewer (Adam) caught an arithmetic error in the plan;
the post-implementation reviewer (Eve) confirmed every number and instead challenged a *type*. Two
different reviewers at two different stages found two different classes of problem, which is the
argument for running both rather than treating them as redundant.
