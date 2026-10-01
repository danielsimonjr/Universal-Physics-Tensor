# Lean-proved bridges

This note schedules work the corpus already specifies. Each fact below lives in
the document it names. Approval, and what has landed, are recorded outside
this file. This note changes no code, no canonical entry, and no cell of the
composition table.

## Decisions this note joins

- The first Lean targets are rank 1 of
  [`docs/research/phase-4-formalref-scoping.md`](../research/phase-4-formalref-scoping.md)
  §4.3, taken by route A in §4.5.
- PhysJS owns the Lean 4 project and its CI. The project requires Mathlib and
  the Physlib package (the library Daniel calls PhysLean), both as direct
  requires. That standing fact is `MEMORY.md`. The scoping report's correction
  records the same assignment.
- A reviewed `formalRef` is the record in
  [`docs/planning/Atlas-Phase-4-Design.md`](../planning/Atlas-Phase-4-Design.md)
  §3. UPT does not run Lean. The axiom gate, and the way a Lean exit code
  lies, are `TOOLS.md` and `formal/physlib/README.md`. The steps that put a
  PhysJS lemma under that gate are scoping §4.4.
- The category layer already specified is `ROADMAP.md` §2,
  [`docs/planning/Atlas-Phase-1-Design.md`](../planning/Atlas-Phase-1-Design.md)
  §2, `src/atlas/composition-table.ts`, and the witnessed `NormTransport` in
  [`docs/design/tier-10-cross-family-path.md`](tier-10-cross-family-path.md).
  [`docs/specification/Part-V.md`](../specification/Part-V.md) §17 is
  speculative and is not an engineering specification.

## Existing material reused

| Document | What this schedule takes from it |
|---|---|
| `docs/research/phase-4-formalref-scoping.md` | Milestone 1 targets, what each lemma certifies, the do-not-count row, the partial counterparts, the fidelity routes, the gate-extension cost |
| `docs/planning/Catalog-FormalRef-Design-Note.md` | How a PhysJS theorem is keyed to a `be-` or `CE-` id, the coverage rule, the three kinds, a nested further statement, the BE-38 rename |
| `docs/planning/Atlas-Phase-4-Design.md` | `formalRef` shape, derived evidence tags, the witness artifact, the bridges and their witnesses |
| `docs/planning/Atlas-Phase-1-Design.md`, `src/atlas/composition-table.ts`, `docs/planning/ADR-transported-norm-composition.md` | Relation types and the composition table |
| `docs/design/tier-10-cross-family-path.md` | Cross-family path and `NormTransport` |
| `docs/design/tier-8-probe-searchable-gaps.md` | Probe |
| `docs/design/tier-11-hybrid-retrieval.md` | Retrieval design |
| `docs/planning/Scientific-Bridge-Discovery-v1.md` | Product A frozen, Product B, §23 Family B rediscovery |
| `docs/research/Dimensional-Derivation-Benchmark.md`, `src/canonical/entries/dimensional-classics.ts` | The Buckingham monomials in that benchmark, later than the first five |
| `docs/research/Bridge-Equation-Dimensional-Audit.md` | Catalog derived, decoy, and unclosable rows. These rows are not atlas `formalRef`s |
| `docs/research/Bridge-Priority-Scorecard.md` | Confrontation triage. This ranking is not the Lean order |
| `docs/research/v0.11.0-novel-candidates.md` (supersedes `v0.10.0-novel-candidates.md`), `docs/research/proposed-equations-adjudication.md`, `docs/research/Linkage-Candidate-Proposals.md` | Identification proposals. These are not Lean targets |
| `ROADMAP.md` | Phase exits, evidence rules, and the §8 pointers |
| `MEMORY.md` | Where the Lean project lives, and what it requires |
| `TOOLS.md`, `formal/physlib/README.md` | The axiom gate, and the pinned Physlib checkout it measures |
| `todo.md` | be-16, be-23, be-38, and the criterion-3 residual follow-up |
| `src/atlas/`, `src/bridges/`, `src/canonical/` | The records. This note does not re-list them |

## The first five

Source for every row: scoping §4.3 rank 1. The lemma shape and the covers
line stay in that cell.

| Bridge | Record |
|---|---|
| `ab-kg-schrodinger` | `src/atlas/waves/bridges-closure.ts` |
| `ab-klein-gordon-wave` | `src/atlas/waves/bridges.ts` |
| `ab-stiff-string` | `src/atlas/waves/bridges-closure.ts` |
| `ab-telegraph-diffusion` | `src/atlas/diffusion/bridges-closure.ts` |
| `ab-telegraph-wave` | `src/atlas/diffusion/bridges-closure.ts` |

The reviewed reference already on record is scoping §1
(`ab-pendulum-linear`, `src/atlas/oscillators/bridges-limits.ts`). Its covers
line stays that section's covers line.

## Milestones

### 1. Rank-1 lemmas (route A)

Scope is scoping §4.5.A under the require rule in `MEMORY.md`.

Acceptance:

- Each of the five carries a reviewed `formalRef` whose statement is the
  rank-1 lemma. The covers line is that cell: `bound.delta` at the dispersion
  relation.
- The sanity-lemma test and the gate extension are the steps in scoping §4.4.
  A PhysJS reference is re-measured. The gate does not skip it (scoping §2,
  the system-union fact).
- The pendulum reference's covers line is unchanged.
- `src/canonical` is unchanged. The composition table is unchanged.
- `formally-proved` is reached only through `deriveEvidence`, as
  Atlas-Phase-4 §3 already requires.

### 2. The rest of the candidate table, in its rank order

§4.3 ranks 1a and 2, then milestone 2b, then ranks 3 and 4. The substitution
row stays on the do-not-count recommendation in that table.

### 2b. Catalog reductions

After ranks 1a and 2, before ranks 3 and 4. Ranks 1a and 2 are the Physlib
derivative workflow and the real-inequality pipeline. The rows below are
that scale of work. Rank 4 stays the long item and stays after these rows.
The record, the coverage rule, the nested-statement rule, and the BE-38
rename are
[`docs/planning/Catalog-FormalRef-Design-Note.md`](../planning/Catalog-FormalRef-Design-Note.md).
This milestone adds no code and no canonical entry. The composition table
is unchanged. It does not move milestone 3, and it does not clear the
data-pending confrontations of be-16, be-23, and be-38.

The statements are textbook relations the catalog encodes. A proof of one
certifies the part its covers line names. It does not vet a speculative
bridge. BE-36 is a measured speed bound and is not a row. Its MOND/TeVeS
title is the framing the design note records, and this milestone does not
rename it.

Size letters are the bands in scoping §4.3. No proof of these rows has
been written, so each letter is an estimate, as that section already says.
`M` there is Physlib `Time` work. A row marked "plain reals" or "matrices"
is the band only. This repository does not contain the Physlib tree. The
cosmology, orbit, and open-system rows are stated on `ℝ` or on matrices
because a Friedmann equation, a GR geodesic, and a Lindblad equation are
not what this schedule takes from Physlib. UPT's own Friedmann and Einstein
nodes are unchanged. Mathlib lemma names are not pinned.

#### Counted

One reference per id, and only of kind reduction, limit, or
derivation-step. Easiest first.

**BE-64 Eddington.** Derivation-step. Size S. Plain reals. Physlib does
not supply the force balance.

The encoded luminosity is `L = 4π G M m_p c / σ_T`
(`src/bridges/be64-eddington-luminosity.ts`). For `r > 0`, `σ_T > 0`, and
`c > 0`:

```
L * σT / (4 π r^2 c) = G * M * mp / r^2  ↔  L = 4 π G M mp c / σT
```

The `r^2` cancels. The Thomson force on the electrons and the gravitational
force on the protons are premises. Negative control: the same balance with
`2` on the right-hand side fails. Does not certify that the luminosity is
a hard cap.

**BE-53 `b₀ > 0` and the one-loop solution.** Derivation-step. Size M.
The sign half alone would be S. Plain rationals and reals. Physlib has no
SU(N) Casimir in this schedule. Two statements on one entry, as the design
note records a further statement. The top-level theorem is the sign. The
running solution is the nested object `oneLoop`. The reference names the
top-level theorem only. The row is done when both are recorded. Each
covers line claims its own part.

`b₀ = (11/3) N_c − (2/3) N_f` for SU(`N_c`) fundamentals, the encoded
coefficient (`src/bridges/equations/be-53-yang-mills-beta.ts`). For
`N_f : ℕ`:

```
0 < b₀(3, N_f)  ↔  N_f ≤ 16
```

At 16 the value is `1/3`. At 17 it is negative. The zero of the real
function is `33/2`, and the theorem is the integer case. A positive `b₀`
is asymptotic freedom in this one-loop truncation
(`docs/design/be-53-yang-mills-confrontation.md`). The running half: with
`α = g² / (4π)` and `α(t) = α₀ / (1 + b₀ α₀ t / (2π))` on an interval
where the denominator is positive,

```
dα/dt = −(b₀ / (2π)) α(t)²
β(g) = −b₀ g³ / (16 π²)  ↔  dα/d ln μ = −b₀ α² / (2π)
```

Negative control: `N_f = 17` fails the positive-`b₀` claim. The
confrontation refuses the one-loop formula as a running procedure. This
theorem does not unblock it.

**BE-58 Johnson–Nyquist.** Limit. Size S. Plain reals.

The catalog encodes `S_V = 4 k_B T R`
(`src/bridges/be58-johnson-nyquist.ts`). The quantum parent is not a
catalog formula. It is a premise of the theorem, not a new bridge id:

```
S_V^q(ω) = 4 R ℏ ω / (exp(ℏ ω / (k_B T)) − 1)
Tendsto S_V^q at ω → 0⁺  =  4 k_B T R     (k_B T > 0)
```

Negative control: the same expression with `+ 1` in the denominator does
not tend to `4 k_B T R`. Does not derive the fluctuation–dissipation
theorem.

**BE-38 `ν(z)`.** Limit, and one inversion. Size M. Plain reals. Nested
roots. Physlib does not supply the function. The SPARC confrontation is
not this row. The prose fix in the design note is a prerequisite: the
comment `ν → √(2/z)` is not the limit this theorem states.

```
ν(z) = √( (1 + √(1 + 4/z²)) / 2 )
Tendsto ν at z → ∞            = 1
Tendsto (ν(z) √z) at z → 0⁺   = 1
```

The second limit is `ν ~ 1/√z`. With `z = F_N / (m a₀)`,
`F = F_N ν(z) → √(m · F_N · a₀)`. Negative control: the claim
`ν(z) √z → √2`, which is the comment `ν → √(2/z)`, fails. For `z > 0`,
`y = z ν(z)` satisfies `y² / √(1 + y²) = z`, Milgrom's
`μ(x) = x / √(1 + x²)` inverted. The catalog sentence `F → √(F_N a₀)`
drops `m` and is not the statement.

**BE-13, with the BE-20 identification.** Reduction. Size M. One reference,
on `be-13`. BE-20 does not get its own reference. Matrices over `ℝ`, 4×4.
Physlib does not supply the curvature.

The field equation is the canonical one, `CE-einstein-field-eq`:
`G_μν + Λ g_μν = κ T_μν` with `κ = 8πG/c⁴` and
`G_μν = R_μν − ½ R g_μν`. The metric node on that entry is `-,+,+,+`.
Contracting with `g^{μν}` and using `g^{μν} g_μν = 4`:

```
R = 4 Λ − κ T,    T = g^{μν} T_μν
```

That contraction is the encoded trace
(`src/bridges/equations/be-13-einstein-trace.ts`). It does not choose a
signature. The signature enters in the fluid. Under `-,+,+,+`, dust
`T_μν = ρ u_μ u_ν` with `u_μ u^μ = −c²` has `T = −ρ c²`, so
`R = 4Λ + κ ρ c²`. The BE-20 clause, same equation and same signature:
`T_μν = −ρ c² g_μν` rearranges to `ρ = c² Λ / (8π G)`, the encoded
density (`src/bridges/equations/be-20-vacuum-energy.ts`). Negative
control: `T_μν = +ρ c² g_μν` gives the opposite sign for `ρ` when
`Λ > 0`.

`BE13_T_TRACE_NODE` stamps `+,-,-,-`, and the evaluator comment takes the
matter trace as `+ρ c²`. `src/numerical/einstein-equation.ts` builds
`+,-,-,-`. The theorem follows `CE-einstein-field-eq`, not those stamps.
Does not certify Jacobson's thermodynamic derivation.

**BE-34 Kibble–Zurek exponent.** Derivation-step. Size M. Plain reals.
`Real.rpow` bookkeeping.

The encoded density carries the power and a Boltzmann factor
(`src/bridges/equations/be-34-kibble-zurek.ts`). The theorem is the power
only. From `τ(ε) = τ₀ ε^{−zν}`, `ξ(ε) = ξ₀ ε^{−ν}`, and the freeze-out
`τ(ε̂) = ε̂ τ_Q`, with the positive parameters the module assumes:

```
ε̂ = (τ₀ / τ_Q) ^ (1 / (1 + z ν))
τ₀ ε̂^{−zν} = ε̂ τ_Q
(ξ₀ ε̂^{−ν})^{−d} = ξ₀^{−d} (τ_Q / τ₀)^{−dν / (1 + zν)}
```

`ε̂` is the unique positive solution because the two sides of the
freeze-out are strictly monotone in opposite directions. Negative control:
the exponent `−dν / (zν)` with the `1` omitted fails the identity. The
factor `exp(−m c² / k_B T_reh)` is not in the theorem. The module's
missing `1/a^d` prefactor is not repaired here.

#### Properties

A catalog `formalRef` of this kind follows
[`docs/planning/Catalog-FormalRef-Design-Note.md`](../planning/Catalog-FormalRef-Design-Note.md).
The covers word is `property`.

**BE-16, the `ln 2` only.** Property. Size S. Physlib's two-state
canonical ensemble. The intended lemma is `twoState_entropy_eq`; this
schedule has not opened that file. The corollary the entry should be:

```
(twoState E E).thermodynamicEntropy T = k_B log 2
```

Negative control: unequal levels `E` and `E + δ` are not that value.
The encoded bridge is `E_min = k_B T ln 2`
(`src/bridges/equations/be-16-landauer.ts`). The inequality `E ≥ T ΔS`
needs Clausius as a premise and is not this entry. The Bérut confrontation
is not this entry.

**BE-29.** Property. Size S. Plain reals. `rejected.ts` marks the row
not-a-bridge. The equality is the definition of `ΔF`, not a theorem of
dynamics:

```
ΔF = −(1/β) log (∑_i p_i exp(−β W_i))
∑_i p_i W_i ≥ ΔF
```

for a finite probability, `β > 0`. Negative control: the reversed
inequality fails on two unequal work values. A Gaussian work distribution
with `ΔF = ⟨W⟩ − β σ² / 2` may be the nested object `gaussian` on the same
entry. It is not a second id. Taking it makes the entry M. Jarzynski's
theorem is not this entry.

**BE-11.** Property. Size M. Matrices over `ℂ`. The encoded scalar is the
rate `γ(λ) = γ₀ (λ/λ₀)²`. The entry is the displayed GKSL generator, which
the AST does not encode (`src/bridges/equations/be-11-decoherence-master.ts`):

```
trace (lindblad H L γ ρ) = 0
H and ρ Hermitian  →  lindblad H L γ ρ Hermitian
```

Negative control: dropping the anticommutator terms makes the trace
nonzero. Born–Markov coarse-graining is not this entry.

#### Cross-checks

A catalog `formalRef` of this kind follows the catalog design note. The
covers word is `cross-check`. Each has a negative control. One entry, not
a second key.

**BE-42, `be-42-via-rs`, BE-57.** Cross-check. Size S. Plain reals. One
entry, key `be-42`. The covers line names BE-57 and `be-42-via-rs`. The
catalog reference is that one entry, not a second key.

```
T_H(M)    = ℏ c³ / (8 π G M k_B)
T_H(r_s)  = ℏ c / (4 π k_B r_s)
T_U(a)    = ℏ a / (2 π c k_B)
T_H(2 G M / c²) = T_H(M)
T_U(c⁴ / (4 G M)) = T_H(M)
```

The formulas are `src/bridges/equations/be-42-hawking-temperature.ts`,
`src/composition/edges/calibration.ts` (`be-42-via-rs`), and
`src/bridges/be57-unruh.ts`. Negative control: `T_U(c⁴ / (2 G M))` is not
`T_H(M)`. Certifies the `8π`, `4π`, and `2π` under that dictionary. Does
not certify the Hawking effect.

**BE-24 FRET.** Cross-check. Size S. Plain reals. Key `be-24`.

```
k_FRET = (1/τ_D) (R₀/R)^6
η = R₀^6 / (R₀^6 + R^6) = 1 / (1 + (R/R₀)^6)
η = k_FRET / (k_FRET + 1/τ_D)
```

Source: `src/bridges/equations/be-24-foerster-fret.ts`. `η(R₀, R₀) = 1/2`
holds for any positive power, so it is not the control. Negative control:
at `R = 2 R₀` the exponent 4 is not the exponent 6. `η` decreases on
`(0, ∞)`. The dipole–dipole law is a premise.

**BE-19 and BE-54.** Cross-check, plus the two GR limits. Size S. Plain
reals. One entry, key `be-19`. The covers line names BE-54. `Λ` is the
modules' `[T⁻²]` symbol, `c²` times a curvature-scale `Λ`.

```
H²_LQC = (8πG/3) ρ (1 − ρ/ρ_c) + Λ/3
H²_RS  = (8πG/3) ρ (1 + ρ/(2σ)) + Λ/3
H²_LQC(ρ_c) = H²_RS(σ = −ρ_c/2)
```

As `ρ_c → ∞` and as `σ → ∞`, both tend to `(8πG/3) ρ + Λ/3`. At
`ρ = ρ_c` and `Λ = 0`, `H²_LQC = 0`. Sources:
`src/bridges/equations/be-19-quantum-bounce.ts`,
`src/bridges/equations/be-54-randall-sundrum-brane.ts`. Negative control:
`σ = +ρ_c/2` is not the LQC polynomial. `σ < 0` is not a physical
Randall–Sundrum brane, and the covers line says so.

#### Stretch

After the rows above. Not counted with them.

**BE-65 Jeans.** Derivation-step. Size M. Plain reals. From
`3 M kT / (μ m_u) = 3 G M² / (5 R)` and `M = 4π R³ ρ / 3`, conclude the
encoded mass `(5 kT / (G μ m_u))^{3/2} (3 / (4π ρ))^{1/2}`
(`src/bridges/be65-jeans-mass.ts`). The `5` is the encoded virial
convention. Negative control: replacing `5` by `3` fails. Does not derive
the virial theorem.

**BE-51 deflection.** Derivation-step. Size M. One real integral, not the
PDE band that defines L. Plain reals. Physlib does not supply the orbit.
The catalog encodes the result `α = 4 G M / (b c²)`
(`src/bridges/gravitational-lensing.ts`), which is `γ = 1`. The premise
is the weak-field line integral, not a geodesic:

```
(1+γ)/c² ∫_ℝ G M b / (b² + z²)^{3/2} dz = 2 (1+γ) G M / (b c²)
```

The antiderivative is `z / (b² √(b² + z²))`. At `γ = 1` the right-hand
side is the encoded angle. Negative control: `γ = 0` is half of that
angle.

**BE-61 Sommerfeld coefficient.** Derivation-step. Size L. An integral
identity in the long band, not a PDE. Plain reals.

```
∫_ℝ x² e^x / (1 + e^x)² dx = π²/3
```

That factor is the `π²/3` in the encoded Lorenz number
`L₀ = (π²/3) (k_B/e)²` (`src/bridges/be61-wiedemann-franz.ts`). The
integrand is even, so the half-line integral is half of `π²/3`. Negative
control: claiming the half-line equals `π²/3` fails. Does not derive the
transport law. The Drude–Sommerfeld integrals are a premise.

### 3. Buckingham monomials

The classics in `docs/research/Dimensional-Derivation-Benchmark.md`, and
the catalog rows in `docs/research/Bridge-Equation-Dimensional-Audit.md`. A
PhysJS theorem is keyed by the existing `CE-` or `be-` id, under
[`docs/planning/Catalog-FormalRef-Design-Note.md`](../planning/Catalog-FormalRef-Design-Note.md).
The covers line is the exponent tuple: form, not the prefactor. A decoy
row is the negative control, a free π-group. The intended statement is
uniqueness, or non-uniqueness, of a tuple of Physlib exponents in `ℚ`.
`ab-string-wave` is the atlas overlap with that benchmark. §4.3 did not
rank it, so it is outside the first five.

### 4. Rediscovery

The program is
[`docs/planning/Scientific-Bridge-Discovery-v1.md`](../planning/Scientific-Bridge-Discovery-v1.md)
§23 Family B. A Lean proof is attached after that program recovers a
statement. This note authors no benchmark item. The independence rule is
`AGENTS.md` and `scripts/atlas-benchmark-models.mjs`.

### 5. The category layer stays the one already specified

Composition stays the table in Atlas-Phase-1 §2. A bound crosses families on
a witnessed `NormTransport` (tier 10). Part V §17 stays outside the
engineering specification.

## Conflicts

1. **The PhysJS README list and the scoped rank order.** The README target
   list, quoted in scoping §2, names the spring–LC map, the damped ζ² map,
   the Stokes–Einstein substitution, Klein–Gordon dispersion limits, and
   d'Alembert in the missing direction. §4.3 ranks the five dispersion bounds
   first, puts `ab-spring-lc` and `ab-damped-rlc` at rank 3, puts
   `ab-wave-dalembert` at rank 4, and recommends that `ab-stokes-einstein`
   and `ab-heat-diffusion` not be counted. This schedule follows §4.3 and
   §4.5.A. Withdrawing that recommendation is a correction to the scoping
   report.
2. **A tag on the whole bridge, and a lemma about `bound.delta`.**
   `deriveEvidence` lights `formally-proved` for the bridge once a reviewed
   `formalRef` exists (Atlas-Phase-4 §3). The CLI states that the reference
   covers its statement only. Scoping §1 and §4.3 already give each reference
   its covers line. This schedule leaves those covers lines as written.
   A catalog reference follows the design note. A further statement is a
   nested object and is not that reference. `deriveEvidence` does not read
   `covers`. A catalog id is not passed to that predicate. A proof of one
   part does not tag the bridge.
3. **A private proof and a public record.** Scoping §2 records PhysJS as
   private at the last read, and §4.4 leaves visibility open. A `formalRef`
   into a repository a reader cannot fetch is unchecked for that reader.
   This schedule leaves publication open. It also inherits the scoping
   report's limit on what that report has read.
4. **Catalog confrontations.** be-16, be-23, and be-38 are queued in
   `todo.md` on a missing source or a tautology gate. Criterion 3's
   residual-form follow-up is queued there too, behind the Amendment 8 pins.
   Its scores stay in `ROADMAP.md` §7. Lean proofs of atlas bridges leave
   those rows as they stand. The catalog bridge equations are the owner's own
   encodings (scoping report, owner decision). No external formal source is
   expected for the speculative bridges. The milestone 2b rows are textbook
   relations those encodings carry. A proof of one certifies the part its
   covers line names. It does not vet the rest. BE-36's MOND/TeVeS title is
   the framing that record already documents.

Stale sentences that disagreed with this schedule are corrected in the files
that held them: the scoping report, `ROADMAP.md` §8, the Phase 4 exit cell in
`docs/planning/Atlas-Phase-4-Design.md`, `MEMORY.md`, and `TOOLS.md`. The
research index lists the scoping report.

## Open questions

1. Publish PhysJS, or keep the resolution check credentialed until it is
   public?
2. Confirm that milestone 1 follows §4.3 rank 1. The other candidate is the
   README list together with the substitution row. Taking that candidate
   withdraws the do-not-count recommendation in the scoping report.
3. Adopt milestone 2b after ranks 1a and 2: the counted rows, the
   manifest-only properties, the uncounted cross-checks, and the stretch
   tier.
4. Adopt the catalog `formalRef` note: a further statement nested on
   schema v1, the BE-38 rename, the deep-MOND prose fix as a prerequisite
   of that row, and no rename of BE-36.
