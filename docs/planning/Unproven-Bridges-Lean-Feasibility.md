# Unproven catalog bridges: Lean feasibility

This note is a triage. It names, for each catalog bridge that has no Lean 4 proof of its own, the statement a proof could honestly target, what Mathlib and Physlib already contain, how hard that statement is, the negative control, and one bucket. It authorizes nothing. It changes no code, no catalog entry, no manifest, and no cell of the composition table.

Approval of any row is an owner decision. The pointer is `ACTIVE.md`. What has already landed is `NOTES.md` and `formal/physjs/manifest.json`. This note does not repeat those as a live count.

The schedule it sits beside is [`docs/design/roadmap-lean-proven-bridges.md`](../design/roadmap-lean-proven-bridges.md). The keying and coverage rules are [`docs/planning/Catalog-FormalRef-Design-Note.md`](Catalog-FormalRef-Design-Note.md). The library search those documents inherit is [`docs/research/phase-4-formalref-scoping.md`](../research/phase-4-formalref-scoping.md). The dimensional audit is [`docs/research/Bridge-Equation-Dimensional-Audit.md`](../research/Bridge-Equation-Dimensional-Audit.md). That audit is not a credibility ranking and it is not this order.

## Baseline

The checkout this triage is written against is PhysJS `57a9ecbc851952d539882400a7176926d2990d34`, toolchain `leanprover/lean4:v4.34.1`, Mathlib `v4.34.1`, Physlib `af484f78ee0701290595f8bf892b157b10d64940`. A later library can move a row. This note does not track that move.

A statement is real, in PhysJS's sense, when the proof has no `sorry` and `#print axioms` reports only `propext`, `Classical.choice`, and `Quot.sound`. UPT does not run Lean. Mathlib lemma names are not pinned. Physlib paths below were read at that commit.

**Already proved, and outside this list.** Ten atlas bridges, and catalog ids BE-11, 13, 16, 19, 24, 29, 34, 38, 42, 51, 53, 58, 61, 64, 65. Six of those catalog ids are manifest-only (properties BE-16, BE-29, BE-11; cross-checks BE-42, BE-24, BE-19). The design note withholds a `formalRef` for a property and for a cross-check.

**Three ids on this list are already named inside a proof.**

| Id | Where it already appears | What a standalone proof would add |
|---|---|---|
| BE-20 | Nested `PhysJS.Einstein.vacuum_density` on `be-13`: `T_μν = −ρ c² g_μν` rearranges to `ρ = c² Λ / (8π G)`. The opposite sign fails | The density itself is proved. The new statement is the one-line corollary that this `ρ` reproduces the `Λ c² / 3` term of Physlib's `FirstOrderFriedmann`. A `be-20` key is withheld by the design note |
| BE-54 | Named by `PhysJS.QuantumBounce.dictionary` on `be-19`: the polynomials match at `σ = −ρ_c/2`, both tend to `(8πG/3)ρ + Λ/3`, and `σ = +ρ_c/2` fails. The covers line already says `σ < 0` is not a physical brane | The physical branch `σ > 0`: the correction is `ρ/(2σ)`, so `H²` lies strictly above the Friedmann value, and the `c²` dictionary onto Physlib's Friedmann equation. The limit `σ → ∞` is already proved |
| BE-57 | Named by `PhysJS.HawkingUnruh.dictionary` on `be-42`: `T_U(a) = ℏ a / (2π c k_B)` and `T_U(c⁴/(4GM)) = T_H(M)`. `T_U(c⁴/(2GM))` fails | The temperature as a theorem about the Rindler wedge, not another copy of the algebra |

## How a row is read

The target is the encoded scalar, or the smallest settled identity that scalar actually states. The bridge framing (a duality, a consciousness claim, a dark sector) is left out unless the encoding is that claim. A proof of one part certifies that part. The coverage words are the design note's: `reduction`, `limit`, `derivation-step`, `property`, `cross-check`.

Difficulty, against this checkout:

| Band | Meaning |
|---|---|
| easy | Real algebra, a logarithm, or one elementary integral. The size of the Eddington balance |
| medium | A short argument in analysis or on finite matrices. The size of the Einstein trace or the MOND limits |
| hard | A classical derivation whose setup is not in Mathlib or Physlib. The size of a mode sum or a geodesic perturbation |
| research-level | A theory this checkout cannot import: no definitions to start from |

Every row has a negative control that fails on the true claim. A control that holds for every nearby formula is disclosed, the same way `η(R₀, R₀) = 1/2` was rejected as a FRET control.

Buckets:

| Bucket | Meaning |
|---|---|
| A | Provable now, from Mathlib and Physlib as they stand, by a new PhysJS lemma |
| B | Provable after a named library gap is filled |
| C | An owner or physics ruling has to fix the equation before a statement exists |
| D | The written claim is a conjecture, an empirical number, or an unsolved problem. A fragment may still be formalizable |

Four ids on this list are adjudicated not-a-bridge (`be-28`, `be-32`, `be-35`, `be-40`). Three are contested (`be-44`, `be-46`, `be-50`). A Lean lemma about the encoded scalar does not adjudicate membership, and a property is still not a catalog `formalRef` until the owner rules. The rename review of bridges 22 and 31 does not change the formulas below.

**Λ, two symbols.** BE-20's `Λ` is the curvature-scale constant in `ρ = c² Λ / (8π G)`, the same symbol as Physlib's `Λ` in `FirstOrderFriedmann`: `(a'/a)² = (8πG/3)ρ − k c²/a² + Λ c²/3` (`Physlib.Cosmology.FLRW.Basic`). BE-19 and BE-54 put `Λ/3` in `H²`, and that symbol has dimension `[T⁻²]`. It equals Physlib's `Λ c²`. Using one letter for both is the negative control for BE-20 and BE-54.

## Library facts used below

Present and relevant:

- Real algebra, square roots, `Real.pi`, `Real.exp`, `Real.log`, filters and `Tendsto`. The proved catalog lemmas are this layer.
- `FirstOrderFriedmann` and `SecondOrderFriedmann`, and closed-form scale factors (de Sitter, dust, radiation, Milne). `Physlib.Cosmology.FLRW.Dynamics` is a TODO file: energy conditions and the singularity are not proved.
- The Standard Model Higgs potential `−μ²‖φ‖² + λ‖φ‖⁴`, smooth as a function. No Yukawa mass term and no trigonometric composite potential.
- QuantumInfo: von Neumann entropy `Sᵥₙ`, including `Sᵥₙ_eq_neg_trace_log`, matrix `log`, and a derivative of `Tr(Aˢ)` at `s = 1`. No modular-Hamiltonian first variation is named.
- Special relativity, Lorentz group, Dirac and Weyl spinors, tensor algebra. No Einstein equation, no geodesic, no black-hole thermodynamics.
- `PhyslibAlpha.Relativity.General.Schwarzschild.IncompressibleSphere` takes the interior and exterior metrics as given. Its header says the field equations are not verified. It has no perihelion advance.
- Canonical ensemble, including the two-state system used for BE-16. Boltzmann's constant. No Johnson–Nyquist parent beyond what PhysJS already proved, and no BCS gap equation.
- Electromagnetism through Maxwell, potentials, and point particles. No Casimir cavity and no Josephson junction.
- `Physlib.CondensedMatter.Topology.Basic` and several sibling files are module headers with no theorems. No Chern number and no Hall conductance.
- Units and dimensions. That layer is milestone 3's instrument, not a new one here.

Absent, and named again on the rows that need them: causal sets, Rindler wedges, WKB connection formulas, a Lane–Emden solver, a nuclear network, a holographic entropy theorem, a swampland statement.

## The forty

### BE-12 — thermal de Broglie wavelength

**Statement.** For `m > 0`, `k_B > 0`, `T > 0`, and `h = 2πℏ` with `ℏ ≠ 0`,

```
√(2π ℏ² / (m k_B T)) = h / √(2π m k_B T)
```

**Library.** Mathlib reals. Physlib's Planck constant is not required.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** The dropped form with `ℏ` in the numerator and no `√(2π)`, the Wave Q encoding, is a different length. So is `ℏ / √(2 m k_B T)`.

**Left out.** Caldeira–Leggett dephasing, and the framing dependence on BE-11. The encoded scalar is the free-particle thermal wavelength.

### BE-14 — Ryu–Takayanagi prefactor

**Statement.** The encoded scalar is `S = k_B c³ A / (4 G ℏ)`, with `A` an input. With `ℓ_P² = ℏ G / c³` and `c ≠ 0`, `G ≠ 0`, `ℏ ≠ 0`,

```
k_B c³ A / (4 G ℏ) = k_B A / (4 ℓ_P²)
```

**Library.** Real algebra. No holographic entropy in Physlib.

**Difficulty.** Easy. **Bucket A.** The same lemma covers BE-43.

**Negative control.** `ℓ_P² = ℏ G / c²`, or the factor `2` in place of `4`.

**Left out.** The minimal-surface theorem, and the code-subspace map in `formula_latex`, which the module does not encode. Both are research-level and are not this statement.

### BE-15 — Model A coarsening exponent

**Statement.** For `Γ > 0`, `t > 0`, and `z > 0`, the scaling `L(t) = L₀ (t/t₀)^{1/z}` obeys `L(t)² / t = L₀² / t₀` if and only if `z = 2`. The `Γ` in `L² = Γ t` is the coarsening constant of dimension `[L²/T]`.

**Library.** Real powers, as in the Kibble–Zurek lemma.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** Model B's `z = 3`, so `L³ ∝ t`, fails `L² = Γ t`.

**Left out.** The Model A Langevin equation. Functional integration over field space is still outside the encoding. Deriving `z = 2` from that PDE is a separate hard gap (a stochastic PDE), and it is not the encoded scalar. The Langevin kinetic coefficient is a different `Γ`.

### BE-17 — torsion–spin inversion

**Statement.** Let `κ = 8πG/c⁴ ≠ 0`. If every component satisfies `T^λ_{μν} = κ S^λ_{μν}`, the squared contractions obey `S·S = T·T / κ²`.

**Library.** Finite sums of reals. Physlib has no torsion. The Einstein–Cartan system is not required for this scalar.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** `κ` in the numerator. That is the inversion run backwards.

**Left out.** The Einstein–Cartan field equation, and any Newtonian limit. `ACTIVE.md` already records that the repository has no derivation of that limit.

### BE-18 — dark-sector Yukawa product

**Statement.** There is no settled dark Lagrangian in the encoding. The AST is the product `m = g · v`.

**Library.** Physlib's Higgs potential is the Standard Model quartic. It has no dark gauge theory and no Yukawa term.

**Difficulty.** The product is empty as a theorem. **Bucket D.**

**Fragment.** The module notes' Standard Model bracket: with `v_dark = v_EW / √2` and `g = y`, `m = g v_dark` is `m = y v_EW / √2`. That rewriting is easy real algebra. **Negative control:** dropping `√2`, so `m = y v_EW`, which misses the notes' top-mass bracket. The fragment is a Standard Model convention. It is not a dark-matter gauge theory.

### BE-20 — vacuum density, Friedmann corollary

**Statement.** `PhysJS.Einstein.vacuum_density` already gives `ρ = c² Λ / (8π G)` for `κ = 8πG/c⁴` and `T_μν = −ρ c² g_μν`. The standalone addition is

```
(8π G / 3) ρ = Λ c² / 3
```

which is the cosmological term of `FirstOrderFriedmann` at the same `Λ`. A vacuum fluid of this density, added to `ρ` with the explicit `Λ` set to zero, reproduces that term.

**Library.** The nested lemma, plus `FirstOrderFriedmann`.

**Difficulty.** Easy. **Bucket A.** Do not reprove the density.

**Negative control.** The Einstein-static density `ρ = Λ c² / (4π G)`, which is Physlib's `einsteinStatic_density`, produces `(2/3) Λ c²`, twice the Friedmann term. Forgetting the `c²` between BE-20's `Λ` and the BE-19 symbol is the same failure.

**Left out.** A catalog `formalRef` on `be-20`. The design note keeps the density nested on `be-13`.

### BE-21 — KSS saturating value

**Statement.** The encoded equality is the saturating value

```
4π k_B (η/s) = ℏ
```

for `k_B ≠ 0`. The catalog formula is that equality.

**Library.** Real algebra.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** `8π`, the Hawking factor already in `PhysJS.HawkingUnruh`, in place of `4π`.

**Left out.** The inequality `η/s ≥ ℏ/(4π k_B)`. The module states that inequality as a conjecture, saturated for an Einstein-gravity dual, and it is not the encoded scalar. Proving it is research-level, and it is false as a universal claim once higher-curvature terms are allowed. This row does not take that claim as the target.

### BE-22 — topological entanglement entropy, toric code

**Statement.** For four anyons of quantum dimension 1, the total quantum dimension is `D = √4 = 2` and the topological term in nats is `γ = ln 2`. The encoded decomposition is `S = α L − γ`, with the `O(L⁻¹)` term dropped.

**Library.** Real algebra and `Real.log`. No topological quantum field theory.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** `γ = log₂ 2 = 1`, the bit convention. The module's evaluator takes `γ` in nats. Also `D = √2`, which is one anyon pair, not the toric code.

**Left out.** The Kitaev–Preskill theorem for a general anyon model, which is research-level, and the catalog's quantum-gravity identification of the boundary `R`, which is not in Kitaev–Preskill or Levin–Wen. The rename review does not change `γ = ln 2`.

### BE-23 — Planckian resistivity

**Statement.** The encoded formula is a one-parameter family

```
ρ(T) = ρ₀ + α_SYK (m* k_B T) / (n_e e² ℏ)
```

**Open question.** What, if anything, fixes `α_SYK`. Legros et al. 2019 report a coefficient of order 1 that depends on the material. Hartnoll 2015 reviews the phenomenology and does not derive a unique `α`. `ACTIVE.md` already lists the Hartnoll check as a judgment to record, not as a derivation.

**Difficulty.** The family is not one equation. **Bucket C.**

**Fragment, after or beside the ruling.** At fixed `α_SYK`, `ρ(T) − ρ₀` is linear in `T`, and the Drude factor supplies the resistivity dimension (the Wave Q `m*` fix). **Negative control:** a `T²` Fermi-liquid term. The strange-metal/black-hole duality is not this fragment.

### BE-25 — integrated information

**Statement.** `Φ_max`, the minimum over partitions, is not encoded. The inner `ii` is a definition. The consciousness claim is not an equation of physics.

**Library.** No IIT in Physlib. QuantumInfo's mutual information is a different functional.

**Difficulty.** There is nothing to prove about consciousness. **Bucket D.**

**Fragment.** With the module's convention `0 · log 0 = 0`,

```
ii = p(s̃|s) log₂( p(s̃|s) / p(s̃) )
```

**Negative control.** The Kullback–Leibler reading the evaluator rejects, or dropping the zero convention so the expression is undefined at `p = 0`. The fragment is a definition in probability. It is not a bridge to consciousness.

### BE-26 — DNA mutation rate

**Statement.** `f(T, pH, EM)` is not a specified function. The entry's own issue is that a bare WKB rate with a proton, a `0.4 eV` barrier, and a `1 Å` width overshoots observed mutation rates by orders of magnitude, and `f` absorbs the difference. The mutation claim has no settled equation.

**Library.** No WKB and no molecular biology in Physlib.

**Difficulty.** **Bucket D.**

**Fragment.** For a constant barrier `V > E` the integral collapses:

```
∫_{x₁}^{x₂} √(2m(V−E)) dx = (x₂ − x₁) √(2m(V−E))
```

**Negative control.** A barrier below `E`, where the integrand is not real, or a linear ramp, which is not that product. A general WKB connection formula is a separate hard analysis gap. It is not a proof of a mutation rate.

### BE-27 — effective temperature

**Statement.** The encoded scalar is the rewriting

```
T_eff = T + Σ_active / k_B
```

and `T_eff = T` if and only if `Σ_active = 0`, for `k_B ≠ 0`.

**Library.** Real algebra.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** The product `T · Σ_active / (k_B T)` with the `1` omitted. The dimensional audit already records that a monomial cannot match this sum.

**Left out.** The Cugliandolo–Kurchan frequency-dependent `T_eff(ω)`, which the reformulation replaced and which is not encoded.

### BE-28 — entropy-production sum

**Statement.** For a finite family,

```
σ = Σ_i J_i X_i
```

and if every product is `≥ 0` then `σ ≥ 0`.

**Library.** Finite sums.

**Difficulty.** Easy. **Bucket A.** This is a property of a definition. Membership records the id as not-a-bridge. The equality is the module's definiendum of `σ`.

**Negative control.** One flipped sign: the sum of the flipped family is not `σ`, and non-negativity fails.

**Left out.** The variational maximum-entropy-production principle, which the module's warning says is not what is encoded.

### BE-30 — first variation of entanglement entropy

**Statement.** For a smooth curve of full-rank density matrices on a finite index set with `Tr ρ(t) = 1`,

```
d/dt S(ρ(t)) = − Tr( ρ̇(t) log ρ(t) )
```

At first order, `δS = δ⟨K⟩` with modular Hamiltonian `K = −log ρ`. The encoded FLM line is this identity, with the holographic reading left out.

**Library.** QuantumInfo gives `Sᵥₙ`, matrix `log`, and the scalar derivative of `Tr(Aˢ)` at `s = 1`. The state-variation lemma is not named. It is ordinary matrix analysis from those ingredients.

**Difficulty.** Medium. **Bucket A.**

**Negative control.** A finite difference `S(ρ') − S(ρ)` equals `⟨K⟩_{ρ'} − ⟨K⟩_ρ` only to first order. A state a finite distance away fails the equality.

**Left out.** The holographic first law that identifies `K` with an area variation. That identification is research-level.

### BE-31 — Benincasa–Dowker coefficients

**Statement.** The encoded scalar, for `d = 4`, is

```
R(p) = (4/√6) ℓ_P⁻² [1 + N₀ − 9 N₁ + 16 N₂ − 8 N₃]
```

The coefficients are a settled result of Benincasa–Dowker 2010. They are not an algebra one may choose.

**Library.** No causal set, no Lorentzian sprinkling, no interval-abundance expansion.

**Difficulty.** Research-level. **Bucket B.** The gap is that continuum-limit expansion.

**Negative control.** The `d = 3` coefficient set, or a flipped sign on `N₁`.

**Fragment that does not fill the gap.** The linear form vanishes at `(N₀,N₁,N₂,N₃) = (−1,0,0,0)`, and `(4/√6)² = 8/3`. That arithmetic is easy and does not justify the coefficients. The rename review does not change them.

### BE-32 — one-element Born overlap

**Statement.** For one group element, with real and imaginary parts `c` and `s`,

```
|⟨ψ_A|U(g)|ψ_B⟩|² = c² + s²
```

and the module rejects `c² + s² > 1`.

**Library.** Real algebra. The group integral is not encoded.

**Difficulty.** Easy. **Bucket A.** Membership records the id as not-a-bridge.

**Negative control.** `c² − s²`.

**Left out.** The Giacomini–Castro-Ruiz–Brukner transformation, and the Haar integral over a non-compact group.

### BE-33 — finite-temperature exponent at a quantum critical point

**Statement.** For `z > 0`, `T > 0`, `T₀ > 0`,

```
ξ(T) = ξ₀ (T/T₀)^{−1/z}
```

At `z = 1`, `ξ T = ξ₀ T₀`.

**Library.** `Real.rpow`, the same bookkeeping as Kibble–Zurek.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** The retired exponent `−ν/z`. The module's old pin `−0.71` fails `−1/z` at `z = 1`.

**Left out.** Hertz–Millis theory, and the universality-class label. The entry already flags that "3D Heisenberg" is the wrong name for itinerant Hertz–Millis. The exponent identity does not choose a class.

### BE-35 — crossing residual of one block

**Statement.** For a real function `g`,

```
g(u,v) − g(v,u) = −( g(v,u) − g(u,v) )
```

and the residual is `0` for every `g` when `u = v`.

**Library.** Real algebra.

**Difficulty.** Easy. **Bucket A.** Membership records the id as not-a-bridge. The diagonal point `u = v = 1/4` vanishes for every `g`, so it is not a control, just as `η(R₀, R₀) = 1/2` was not a FRET control.

**Negative control.** The claim that the residual vanishes at `u = 1/2`, `v = 1/4` for a block that is not symmetric.

**Left out.** The infinite sum over `(Δ, ℓ)`, positivity, and unitarity. That programme is research-level and is not the encoded residual.

### BE-36 — GW170817 speed bound

**Statement.** `|c_GW − c| / c ≤ 10^{−15}` is a measured number. The design note already excludes it from milestone 2b. The TeVeS action is the framing, and the encoded scalar is the ratio.

**Library.** Nothing to derive a measured bound from.

**Difficulty.** **Bucket D.**

**Fragment.** The signed ratio `(c_GW − c)/c` is dimensionless. **Negative control:** treating the catalog's symmetric absolute value as the published one-sided bound. The confrontation already separates those two. A Lean proof that the number is `10^{−15}` would be an assertion of the measurement.

### BE-37 — Shapiro delay as an elementary integral

**Statement.** For `0 < R_near < R_far` and `c ≠ 0`,

```
∫_{R_near}^{R_far} (2 G M / c³) (dr / r) = (2 G M / c³) ln(R_far / R_near)
```

That integral is the encoded formula.

**Library.** Mathlib's integral of `1/x`. No Schwarzschild geodesic.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** The factor `1` in place of `2`, the same half that BE-51 uses `γ = 0` to catch, or `log₁₀`.

**Left out.** The impact-parameter Shapiro formula `(1+γ)(2GM/c³) ln(4 r_e r_r / b²)`, and the Cassini measurement. The module's logarithm of a radius ratio is the whole statement.

### BE-39 — schematic asymptotic-safety polynomials

**Statement.** The displayed `β_g` and `β_λ` have coefficients `A, B, C, D, E, F` that the entry itself calls scheme-dependent and truncation-dependent.

**Open question.** Which truncation (Einstein–Hilbert, `f(R)`, or another) is the claim, and therefore which numbers those coefficients are.

**Difficulty.** There is no unique polynomial. **Bucket C.**

**Fragment, for any coefficients.** `β_g(0,0) = β_λ(0,0) = 0`, the linearization is `β_g ≈ 2g` and `β_λ ≈ −2λ`, and a non-zero constant term fails the Gaussian point. **Negative control:** `β_λ = +2λ`. Existence of a non-Gaussian ultraviolet fixed point stays out of the fragment. It is an open research claim even after a truncation is chosen.

### BE-40 — composite-Higgs potential, scale freedom

**Statement.** With `θ = h/f` and `f ≠ 0`,

```
V(h)/f⁴ = −α sin²θ + β [sin⁴θ − sin²θ cos²θ]
```

depends on `h` only through `θ`. Both terms carry `f⁴`.

**Library.** Real trigonometric identities. Physlib's Higgs potential is the Standard Model quartic, not this function.

**Difficulty.** Easy. **Bucket A.** Membership records the id as not-a-bridge.

**Negative control.** The pre-correction first term `−α f² sin²(h/f)`. Then `V/f⁴` depends on `f`, which is the dimensional inhomogeneity the entry records as corrected.

**Left out.** SILH matching onto a confining theory.

### BE-41 — swampland distance conjecture

**Statement.** `m(φ) = m₀ exp(−α |φ−φ₀| / M_P)` is a conjecture about string effective field theories. The entry says it is not confirmed.

**Library.** `Physlib.StringTheory.Basic` does not contain this conjecture. Mathlib has the exponential.

**Difficulty.** **Bucket D.**

**Fragment.** For `α > 0` and `M_P ≠ 0`, `m(φ₀) = m₀` and `m` decreases as `|φ−φ₀|` grows. **Negative control:** a power-law tower `m ∝ |φ|^{-α}`. The fragment is calculus. It is not the conjecture.

### BE-43 — wormhole area and the Planck area

**Statement.** The AST encodes the equality `S = k_B A_wormhole / (4 ℓ_P²)`, despite the `∼` in `formula_latex`. Under `ℓ_P² = ℏ G / c³` this equals BE-14's SI form on the same area.

**Library.** The same real algebra as BE-14.

**Difficulty.** Easy. **Bucket A.** One lemma with BE-14. A second write-up would be a copy.

**Negative control.** The same wrong Planck area as BE-14.

**Left out.** ER=EPR, the claim that entanglement is a wormhole. That equivalence is a conjecture. The area-law dictionary does not prove it.

### BE-44 — soft hair

**Statement.** `formula_latex` is a BMS charge integral whose vector `Y^z` the entry says is ambiguous: a supertranslation scalar, or a superrotation vector. The AST encodes a different object, `Q² = ∫ (∂_u C)² du`, an `L²` norm of the news.

**Open question.** Which charge is meant, and whether the encoded square is that charge. The adjudication note leaves the id contested for this reason.

**Difficulty.** There is no single integrand. **Bucket C.**

**Fragment.** For a real function `n`, `∫ n(u)² du ≥ 0` on an interval where the integral exists. **Negative control:** the integral of `n` rather than `n²`, which can be negative. The fragment does not mention `Y^z` and does not prove a BMS algebra. That algebra, once the ruling picks a charge, is still a hard gap: null infinity and the news tensor are not in Physlib.

### BE-45 — trans-Planckian censorship, extra term

**Statement.** The canonical conjecture is `N_e < ln(M_P / H_inf)`. The catalog adds `−γ log(r/0.01)`. The entry says that term has no published derivation and that the logarithm's base is unspecified.

**Open question.** Whether the extra term is part of the claim, and in which base. Until that is fixed, the displayed formula is not one inequality.

**Difficulty.** **Bucket C.**

**After a ruling that drops the extra term.** The remainder is still the Bedroya–Vafa conjecture, which would then be bucket D. A logarithm of a mass-to-Hubble ratio is dimensional bookkeeping, not a proof of censorship. **Negative control for the canonical shape:** `N_e < M_P/H_inf` with the logarithm omitted.

### BE-46 — multiverse measure

**Statement.** `P[O] = ∫ dμ[g,φ] W[g,φ] δ(O − O[g,φ])` names the measure `W` that the entry says is the unsolved problem. The AST encodes one proposal, `P(Λ) = A exp(−α/Λ)`, and the module says other measures give other shapes. The id is contested.

**Library.** No measure on a space of geometries.

**Difficulty.** **Bucket D.**

**Fragment.** For `α > 0`, `exp(−α/Λ) → 0` as `Λ → 0⁺`, and `exp(−α/Λ) → 1` as `Λ → ∞`. **Negative control:** `exp(−α Λ)`, which tends to `1` as `Λ → 0⁺`. The fragment distinguishes a shape. It does not choose `W`.

### BE-47 — BBN with a dark sink

**Statement.** The two-body piece `dY/dt + 3 H Y = ⟨σv⟩_SM n_p n_n` is the Kolb–Turner continuity equation. The dark sink `−⟨σv⟩_dark n_χ² ε_transfer` is the extension the entry calls unverified.

**Open question.** Whether `ε_transfer` is a derived coupling or a free parameter, and what its value is.

**Difficulty.** **Bucket C.**

**Fragment.** Deleting the dark term recovers a two-body source plus the dilution `3 H Y`. The coefficient `3` is the settled continuity factor. **Negative control:** a dilution `2 H Y`. Turning that continuity equation into a theorem still wants a reaction network and a Hubble rate; Physlib has Friedmann solutions and no nuclear rates. That gap stays even after the ruling, and it is not this row's blocker.

### BE-48 — GRW rate

**Statement.** `λ_GRW(m) = λ₀ m / m₀` with `λ₀ ≈ 10^{−16} s^{−1}` and `m₀` a nucleon mass. The number `λ₀` is a parameter of the model. CSL uses a different rate. The entry records both.

**Library.** No collapse model.

**Difficulty.** **Bucket D.**

**Fragment.** The linear amplification `λ(m)/λ(m₀) = m/m₀` for `m₀ ≠ 0`. **Negative control:** the CSL form the module names, `γ D₀ n_out`, which is not proportional to mass through `m/m₀` alone. The fragment is the model's definition. It does not derive `10^{−16} s^{−1}`.

### BE-49 — quantum Darwinism decay

**Statement.** `I(S:F_k) = I(S:E) − O(k^{−α})` with a free exponent. The entry says this algebraic form is not derived from Zurek's formalism.

**Library.** QuantumInfo has quantum mutual information. It does not have this decay.

**Difficulty.** **Bucket D.**

**Fragment.** If the deficit is `C k^{−β}` with `β > 0` and `k → ∞`, then `I(S:F_k) → I(S:E)`. **Negative control:** a constant deficit, which does not tend to the plateau. The fragment is a limit. It is not a derivation of the exponent.

### BE-50 — time-symmetric residual

**Statement.** When `A_ret + A_adv ≠ 0`,

```
(A_ret − A_adv) / (A_ret + A_adv) = 0  ↔  A_ret = A_adv
```

and the encoded field is the half-sum. The id is contested. The lemma does not decide the contest.

**Library.** Real algebra. Physlib has retarded potentials in the electromagnetic kinematics and no absorber theory.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** The fully retarded field, `A_adv = 0` with `A_ret ≠ 0`, gives residual `1`, not `0`.

**Left out.** The absorber boundary condition as a theory of radiation reaction. That argument is not the encoded residual.

### BE-52 — perihelion advance

**Statement.** From the orbit equation

```
d²u/dφ² + u = G M / h² + 3 G M u² / c²
```

with `u = 1/r` and `0 ≤ e < 1`, the advance per radial period above the Newtonian `2π` is

```
Δφ = 6π G M / (a (1−e²) c²)
```

**Library.** Physlib has no geodesic and no Binet equation. The Schwarzschild alpha file does not verify the field equations and does not compute a precession. Mathlib can integrate the perturbed oscillator once the orbit equation is a premise; it does not supply that equation.

**Difficulty.** Hard. **Bucket B.** The gap is the Schwarzschild orbit equation.

**Negative control.** The Newtonian orbit, with the `3 G M u²/c²` term removed, gives advance `0`. The factor `2π` in place of `6π` is the closed ellipse, not the GR correction.

**Left out.** The conversion from radians per orbit to arcseconds per century. That conversion is easy and is not the physics. The full numerical geodesic is a different instrument.

### BE-54 — positive-tension Randall–Sundrum correction

**Statement.** `PhysJS.QuantumBounce.dictionary` already proves the `σ → ∞` limit and the unphysical match at `σ = −ρ_c/2`. The standalone addition, for `σ > 0` and `ρ > 0`, is

```
H²_RS − H²_FRW = (8π G / 3) ρ² / (2σ) > 0
```

with `H²_FRW = (8πG/3)ρ + Λ/3` in the module's `[T⁻²]` convention. Separately, that `H²_FRW` matches `FirstOrderFriedmann` at `k = 0` when the module's `Λ` equals Physlib's `Λ c²`.

**Library.** The existing cross-check, plus `FirstOrderFriedmann`.

**Difficulty.** Easy. **Bucket A.** Do not reprove the limit.

**Negative control.** The factor `1 + ρ/σ`, missing the `2`. And calling `σ < 0` a physical brane, which the existing covers line already refuses. A third control is identifying the module's `Λ` with Physlib's `Λ` and dropping `c²`.

**Left out.** A derivation of the brane Friedmann equation from the five-dimensional Einstein equation. The polynomial is the statement.

### BE-55 — integer Hall reciprocal

**Statement.** For `C ∈ ℤ`, `C ≠ 0`, and `e ≠ 0`,

```
σ_xy = C e² / h,    R_H = h / (C e²),    σ_xy R_H = 1
```

and `R_K = h/e²`, so `R_H = R_K / C`.

**Library.** Real algebra. `Physlib.CondensedMatter.Topology` has no theorems.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** `C` replaced by `C+1`, or `e` in place of `e²`.

**Left out.** TKNN: the Chern number of a Bloch bundle equals this `C`. That theorem is research-level. The post-2019 exactness of `R_K` in SI is a metrological convention, not this lemma.

### BE-56 — Casimir pressure

**Statement.** The ideal zero-temperature pressure between perfect conductors is

```
F/A = −π² ℏ c / (240 d⁴)
```

for `d > 0`. The coefficient is the content.

**Library.** Mathlib's Riemann zeta function at negative integers, via Bernoulli numbers, is the special-function ingredient. This triage has not pinned the lemma name. Physlib's electrodynamics has no cavity mode sum. The elementary step that does not need the sum: if the energy per unit area is `E/A = −π² ℏ c / (720 d³)`, then `−∂(E/A)/∂d = −π² ℏ c / (240 d⁴)`, because `720/3 = 240`.

**Difficulty.** Hard. **Bucket B.** The gap is the regularized electromagnetic mode sum. The derivative step is easy once that energy is a premise, and it is not the gap.

**Negative control.** `360` in the denominator, one polarization instead of two, or `720` left in the pressure.

**Left out.** Finite conductivity, roughness, temperature, and the sphere-plate geometry the confrontation uses. The ideal formula is the statement.

### BE-57 — Unruh temperature from the wedge

**Statement.** A uniformly accelerated observer has

```
T = ℏ a / (2π c k_B)
```

because the Minkowski vacuum is a KMS state on the Rindler wedge at that temperature.

**Library.** The algebra of `T_U`, and its match to Hawking temperature at `a = c⁴/(4 G M)`, are `PhysJS.HawkingUnruh.dictionary`. Physlib has Lorentz boosts and no Rindler wedge, no modular Hamiltonian of the wedge, and no Bisognano–Wichmann theorem.

**Difficulty.** Research-level. **Bucket B.** The gap is that wedge theorem. A standalone proof that only repeats `T_U`'s definition adds nothing.

**Negative control.** `4π` in the denominator, which is Hawking's factor and is already the cross-check's failure mode at `c⁴/(2 G M)`, or `a` replaced by coordinate acceleration.

**Left out.** A laboratory detection. The catalog defers the confrontation because the scale is far below what has been measured.

### BE-59 — Josephson frequency

**Statement.** For the pair charge `2e`,

```
f = (2e / h) V,    K_J = 2e / h,    f = K_J V
```

**Library.** Real algebra. No junction in Physlib.

**Difficulty.** Easy. **Bucket A.**

**Negative control.** `e` in place of `2e`, a single electron rather than a Cooper pair.

**Left out.** The tunneling Hamiltonian. The factor `2` is a premise, the pair charge, the same way the Eddington proof takes the two forces as premises.

### BE-60 — Laughlin fraction

**Statement.** For `ν = 1/3`,

```
R_xy = 3 h / e² = 3 R_K
```

and `σ_xy = ν e² / h`. At `ν = 1` the formula is BE-55.

**Library.** The same algebra as BE-55.

**Difficulty.** Easy. **Bucket A.** It should follow the BE-55 lemma, not duplicate it.

**Negative control.** `R_xy = R_K / 3`, the fraction inverted.

**Left out.** The Laughlin wavefunction and the anyon charge `e/3`. Those are research-level. The fraction arithmetic is the statement.

### BE-62 — BCS weak-coupling ratio

**Statement.** In the weak-coupling limit of the BCS gap equation,

```
2 Δ(0) / (k_B T_c) = 2π e^{−γ}
```

where `γ` is the Euler–Mascheroni constant. The module's `≈ 3.528` is a rounding of that exact value (`2π e^{−γ} ≈ 3.52775`).

**Library.** Mathlib has `Real.exp`, `Real.pi`, and the Euler–Mascheroni constant. Neither Mathlib nor Physlib has the BCS gap equation or the integral that produces `e^{−γ}` from it.

**Difficulty.** Hard. **Bucket B.** The gap is that integral. Defining the constant as `2π e^{−γ}` and simplifying it is the module's definition, not a derivation.

**Negative control.** `e^{γ}` in the numerator, or the round value `4`, which sits in the strong-coupling range the confrontation already separates from `3.528`.

**Left out.** Strong-coupling materials. The entry's own caveat is that measured ratios run from a little below `3.5` to about `5`.

### BE-63 — Chandrasekhar prefactor

**Statement.** Keep `ω₃⁰` symbolic. It is defined as `−ξ² θ'` at the first zero of the `n = 3` Lane–Emden function, and the decimal `2.01824` is not part of the theorem. From

```
n = ρ / (μ_e m_u)
p_F = ℏ (3 π² n)^{1/3}
P = (1/4) n p_F c
M = 4π (K / (π G))^{3/2} ω₃⁰
```

with `P = K_ρ ρ^{4/3}` and `K_ρ = K_n / (μ_e m_u)^{4/3}`, `K_n = (ℏ c / 4) (3 π²)^{1/3}`, conclude

```
M = (ω₃⁰ √(3π) / 2) (ℏ c / G)^{3/2} (μ_e m_u)^{−2}
```

The `ρ_c` in the Lane–Emden scale cancels for `n = 3`. The chain was checked by setting `ℏ = c = G = μ_e m_u = 1`: both routes give the same `K`.

**Library.** Real algebra and roots, the same band as the Jeans mass. No Lane–Emden solver, and none is required while `ω₃⁰` stays a parameter.

**Difficulty.** Medium. **Bucket A.**

**Negative control.** `√π / 2` in place of `√(3π) / 2`, or dropping `ω₃⁰`.

**Left out.** The numerical value of `ω₃⁰`, and stellar rotation or magnetic support. The confrontation's super-Chandrasekhar caveat stays outside the lemma.

## Bucket A, easiest first

The first rows are the ones whose negative control is a wrong prefactor. The later rows are real, and several of them are close to a definition; a covers line has to say so, or the lemma only shows that a matcher accepts the formula.

1. **BE-12.** The two writings of the thermal wavelength. The historical missing `√(2π)` fails.
2. **BE-59.** `f = 2eV/h`. The single-electron factor fails.
3. **BE-55.** `σ_xy R_H = 1`. A shifted plateau index fails.
4. **BE-60.** `ν = 1/3` gives `3 R_K`. Do this after BE-55.
5. **BE-21.** The saturating `4π`. The Hawking `8π` fails.
6. **BE-14.** The SI form and the Planck-area form. One lemma.
7. **BE-43.** The same lemma, on a wormhole area. Not a second project.
8. **BE-37.** The integral of `1/r`.
9. **BE-54.** The positive-tension factor `1/2`. The limit is already proved.
10. **BE-17.** The torsion inversion.
11. **BE-27.** The sum `T + Σ/k_B`.
12. **BE-22.** `γ = ln 2` for the toric code.
13. **BE-20.** The Friedmann corollary only. The density is already proved.
14. **BE-15.** `z = 2` against `z = 3`.
15. **BE-33.** `−1/z` against the retired `−ν/z`.
16. **BE-50.** The residual. A pure retarded field fails.
17. **BE-32.** `c² + s²`.
18. **BE-28.** The finite sum. Say in the covers line that this is the definition of `σ`.
19. **BE-40.** `V/f⁴` depends only on `h/f`.
20. **BE-35.** Antisymmetry off the diagonal. The point `u = v` is not a control.
21. **BE-63.** The polytropic prefactor, `ω₃⁰` symbolic. Medium.
22. **BE-30.** The first variation of `Sᵥₙ`. Medium.

## Where this sits relative to milestone 3

Milestone 3 stays the Buckingham monomials: an exponent tuple in `ℚ`, form rather than prefactor, a decoy row as the negative control, keyed by the existing `be-` or `CE-` id under the catalog design note. This triage adds no row to that milestone, does not change its covers line, and does not reorder it.

The bucket-A statements are the same kind of work as milestone 2b: a reduction, a limit, or a derivation-step on an encoded scalar. They can be taken up after the landed 2b rows, beside milestone 3, without becoming part of it. A dimensional-only fragment of a C or D row is the kind of statement milestone 3 already owns for the catalog. It is not given a second plan here.

Ranks 3 and 4 of the atlas table are a different list. This note does not insert catalog rows into that list.

## Summary

| Id | Bucket | Difficulty | Target |
|---|---|---|---|
| BE-12 | A | easy | the two writings of `λ_T` |
| BE-14 | A | easy | SI form equals `k_B A/(4 ℓ_P²)` |
| BE-15 | A | easy | `z = 2` iff `L² ∝ t` |
| BE-17 | A | easy | `S·S = T·T / κ²` |
| BE-18 | D | — | no dark Lagrangian; SM `√2` bracket only |
| BE-20 | A | easy | Friedmann corollary; density already proved |
| BE-21 | A | easy | saturating value `4π`; the inequality stays out |
| BE-22 | A | easy | toric-code `γ = ln 2` |
| BE-23 | C | — | `α_SYK` unfixed (Legros, Hartnoll) |
| BE-25 | D | — | `ii` is a definition; `Φ_max` is not encoded |
| BE-26 | D | — | `f` unspecified; constant-barrier integral only |
| BE-27 | A | easy | `T_eff = T + Σ/k_B` |
| BE-28 | A | easy | finite sum; the definition of `σ` |
| BE-30 | A | medium | `dS/dt = −Tr(ρ̇ log ρ)` |
| BE-31 | B | research-level | BD coefficients; gap is the sprinkling expansion |
| BE-32 | A | easy | `c² + s²` |
| BE-33 | A | easy | exponent `−1/z` |
| BE-35 | A | easy | antisymmetry; `u = v` is not a control |
| BE-36 | D | — | measured `10^{−15}`; excluded from milestone 2b |
| BE-37 | A | easy | `∫ dr/r = ln` |
| BE-39 | C | — | coefficients `A`–`F` are scheme-dependent |
| BE-40 | A | easy | `V/f⁴` depends only on `h/f` |
| BE-41 | D | — | distance conjecture; exponential shape only |
| BE-43 | A | easy | same Planck-area lemma as BE-14 |
| BE-44 | C | — | `Y^z` ambiguous; encoded object is an `L²` norm |
| BE-45 | C | — | extra `γ` term and log base; remainder would be a conjecture |
| BE-46 | D | — | `W` is the unsolved measure; one exponential shape only |
| BE-47 | C | — | `ε_transfer` unverified |
| BE-48 | D | — | `λ₀` is a parameter; linear amplification only |
| BE-49 | D | — | free exponent; the limit of a power only |
| BE-50 | A | easy | residual zero iff `A_ret = A_adv` |
| BE-52 | B | hard | `6π` from the orbit equation; gap is that equation |
| BE-54 | A | easy | positive-tension factor `1/2`; limit already proved |
| BE-55 | A | easy | `σ_xy R_H = 1` |
| BE-56 | B | hard | Casimir `240`; gap is the mode sum |
| BE-57 | B | research-level | Rindler KMS temperature; algebra already proved |
| BE-59 | A | easy | `f = 2eV/h` |
| BE-60 | A | easy | `ν = 1/3` gives `3 R_K` |
| BE-62 | B | hard | `2π e^{−γ}`; gap is the gap-equation integral |
| BE-63 | A | medium | polytropic prefactor; `ω₃⁰` stays symbolic |

**Counts against this checkout.** A 22, B 5, C 5, D 8. Those four numbers are this triage. They are not a count of proofs, and they are not a milestone.

Of the 22 in A, two are medium (BE-30, BE-63) and the rest are easy. Of the 5 in B, two are research-level (BE-31, BE-57) and three are hard (BE-52, BE-56, BE-62). The five C rows are BE-23, BE-39, BE-44, BE-45, BE-47. The eight D rows are BE-18, BE-25, BE-26, BE-36, BE-41, BE-46, BE-48, BE-49.
